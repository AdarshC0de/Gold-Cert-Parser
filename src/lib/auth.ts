import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        fingerprint: { label: "Fingerprint", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { sessions: true },
        });

        if (!user) return null;

        // Check if account is active
        if (!user.isActive) {
          throw new Error("ACCOUNT_INACTIVE");
        }

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        const fingerprint = credentials.fingerprint || "unknown";

        // Check if this fingerprint already has a session for this user
        const existingSession = user.sessions.find(
          (s) => s.fingerprint === fingerprint
        );

        if (!existingSession) {
          // New device — check device limit
          if (user.sessions.length >= user.maxDevices) {
            throw new Error("DEVICE_LIMIT_REACHED");
          }

          // Register new session
          await prisma.userSession.create({
            data: { userId: user.id, fingerprint },
          });
        } else {
          // Known device — update lastSeen
          await prisma.userSession.update({
            where: { id: existingSession.id },
            data: { lastSeen: new Date() },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.mustChangePassword = (user as any).mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
  },
};

export function getSession() {
  return getServerSession(authOptions);
}
