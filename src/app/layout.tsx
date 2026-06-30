import "./globals.css";
import Providers from "./providers";
import NavBar from "./nav-bar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shada Finder — Find. Verify. Trust.",
  description: "Verify gold certificates instantly with Shada Finder.",
  icons: { icon: "/logo.jpeg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50">
        <Providers>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
