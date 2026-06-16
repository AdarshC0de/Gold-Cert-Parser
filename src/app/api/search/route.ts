
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/*
  Example:

  /api/search?gram=10&serial=728601&series=AA
*/

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const gram =
      req.nextUrl.searchParams.get("gram");

    const serialStr =
      req.nextUrl.searchParams.get("serial");

    const series =
      req.nextUrl.searchParams.get("series");

    if (!gram || !serialStr || !series) {
      return NextResponse.json(
        {
          error:
            "gram, serial and series are required",
        },
        {
          status: 400,
        }
      );
    }

    const serial = Number(serialStr);

    if (isNaN(serial)) {
      return NextResponse.json(
        {
          error: "Invalid serial number",
        },
        {
          status: 400,
        }
      );
    }

    const isAdmin =
      (session.user as any).role === "ADMIN";

    const userId =
      (session.user as any).id;

    const gramNumber = Number(gram);

    const rows =
      await prisma.documentRow.findMany({
        where: {
          gramValue: isNaN(gramNumber)
            ? undefined
            : gramNumber,

          series: series.toUpperCase(),

          serialFrom: {
            lte: serial,
          },

          serialTo: {
            gte: serial,
          },

          ...(isAdmin
            ? {}
            : {
                document: {
                  userId,
                },
              }),
        },

        include: {
          document: true,
        },
      });

    return NextResponse.json({
      success: true,

      results: rows.map((row) => ({
        matchedRow: row,

        document: {
          id: row.document.id,

          fileUrl:
            row.document.fileUrl,

          manufacturer:
            row.document.manufacturer,

          invoiceNo:
            row.document.invoiceNo,

          certNo:
            row.document.certNo,
        },
      })),
    });
  } catch (error) {
    console.error("SEARCH ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      {
        status: 500,
      }
    );
  }
}