import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface ExtractedRow {
  gram: string;
  count: number;
  serialFrom: number;
  serialTo: number;
  series: string;
  purity: string;
  brand: string;
}

export interface ExtractedData {
  rows: ExtractedRow[];
  manufacturer: string | null;
  origin: string | null;
  invoiceNo: string | null;
  certNo: string | null;
  refDate: string | null;
}

export async function ocrImage(imagePath: string): Promise<ExtractedData> {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing in .env");

  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString("base64");

  const ext = imagePath.split(".").pop()?.toLowerCase();
  const mimeType =
    ext === "png" ? "image/png" :
    ext === "gif" ? "image/gif" :
    ext === "webp" ? "image/webp" :
    "image/jpeg";

  const prompt = `This is a Kuwait Ministry of Commerce & Industry gold certificate.

Extract ALL table rows. The table may be in Arabic (right-to-left) or English (left-to-right) format.

Column meanings regardless of language or order:
- Gram weight: may appear as "1GRAM", "1 GRAM", "1GM", "1GRM", "1GRMS", "1 GMS", "2.5GRAMS", "31.1 GRAMS", "31.10 GRAM", "ONZ", "1 OZ", "1ONZ", "KILO", "1KG", "250GMS", "500GMS" etc
- serialFrom: the LOWER serial number (من column in Arabic, FROM or first BAR NO in English)
- serialTo: the HIGHER serial number (إلى column in Arabic, TO or second BAR NO in English)
- series: AA or AC (سلسلة column in Arabic, SERIES or FORM column in English)
- count: quantity/pieces (عدد or QTY PCS column)
- purity: usually 999.9 or 9999 (العيار or ASSAY column)
- brand: usually VALCAMBI (الماركة or BRAND column)

Normalize gram labels to standard form:
"1GM" / "1GRM" / "1GRMS" / "1 GMS" / "1GRAM" / "1 GRAM" → "1GRAM"
"2.5GMS" / "2.5GRMS" / "2.5 GRAMS" → "2.5GRAMS"
"5GMS" / "5GRMS" / "5 GMS" → "5GRAMS"
"10GMS" / "10GRMS" → "10GRAMS"
"20GMS" / "20 GMS" → "20GRAMS"
"31.1 GRAMS" / "31.10 GRAM" / "31.1GRAMS" → "31.1GRAMS"
"50GMS" / "50 GMS" → "50GRAMS"
"100GMS" / "100 GMS" / "100GRMS" → "100GRAMS"
"250GMS" / "250 GMS" → "250GRAMS"
"500GMS" / "500 GMS" → "500GRAMS"
"ONZ" / "1 OZ" / "1ONZ" / "1OZ" → "ONZ"
"KILO" / "1KG" / "1 KG" → "1KG"

IMPORTANT: Skip the total row (الإجمالي / TOTAL / TOTAL PCS). Only return data rows.

Return ONLY valid JSON, no explanation, no markdown backticks:
{
  "manufacturer": "VALCAMBI",
  "origin": "Switzerland",
  "invoiceNo": "STX KWI 978B",
  "certNo": "24634407",
  "refDate": "03/04/2025",
  "rows": [
    {
      "gram": "1GRAM",
      "count": 350,
      "serialFrom": 645701,
      "serialTo": 646050,
      "series": "AA",
      "purity": "999.9",
      "brand": "VALCAMBI"
    }
  ]
}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: prompt },
        ],
      },
    ],
  });

  const text = response.text ?? "";

  console.log("========== GEMINI RAW RESPONSE ==========");
  console.log(text);
  console.log("=========================================");

  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);

  return {
    manufacturer: parsed.manufacturer ?? null,
    origin: parsed.origin ?? null,
    invoiceNo: parsed.invoiceNo ?? null,
    certNo: parsed.certNo ?? null,
    refDate: parsed.refDate ?? null,
    rows: (parsed.rows ?? []).map((r: any) => ({
      gram: String(r.gram ?? "").toUpperCase(),
      count: Number(r.count ?? 0),
      serialFrom: Number(r.serialFrom ?? 0),
      serialTo: Number(r.serialTo ?? 0),
      series: String(r.series ?? "AA").toUpperCase(),
      purity: String(r.purity ?? "999.9"),
      brand: String(r.brand ?? "VALCAMBI").toUpperCase(),
    })),
  };
}