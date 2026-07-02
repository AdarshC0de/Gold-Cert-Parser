import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});


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

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY missing");
  }



  let imageBuffer: Buffer;



  // If Cloudinary URL
  if (imagePath.startsWith("http")) {

    const response = await fetch(imagePath);

    const arrayBuffer = await response.arrayBuffer();

    imageBuffer = Buffer.from(arrayBuffer);


  } 
  // If local file
  else {

    imageBuffer = fs.readFileSync(imagePath);

  }



  const base64 = imageBuffer.toString("base64");



  const ext = imagePath.split(".").pop()?.toLowerCase();


  const mimeType =
    ext === "png" ? "image/png" :
    ext === "gif" ? "image/gif" :
    ext === "webp" ? "image/webp" :
    "image/jpeg";



  const prompt = `YOUR SAME PROMPT HERE`;



  const response = await ai.models.generateContent({

    model: "gemini-2.5-flash",

    contents: [

      {
        role:"user",

        parts:[

          {
            inlineData:{
              mimeType,
              data:base64
            }
          },

          {
            text:prompt
          }

        ]

      }

    ]

  });



  const text = response.text ?? "";


  const clean = text
    .replace(/```json|```/g,"")
    .trim();


  const parsed = JSON.parse(clean);



  return {

    manufacturer: parsed.manufacturer ?? null,

    origin: parsed.origin ?? null,

    invoiceNo: parsed.invoiceNo ?? null,

    certNo: parsed.certNo ?? null,

    refDate: parsed.refDate ?? null,


    rows:(parsed.rows ?? []).map((r:any)=>({

      gram:String(r.gram ?? "").toUpperCase(),

      count:Number(r.count ?? 0),

      serialFrom:Number(r.serialFrom ?? 0),

      serialTo:Number(r.serialTo ?? 0),

      series:String(r.series ?? "AA").toUpperCase(),

      purity:String(r.purity ?? "999.9"),

      brand:String(r.brand ?? "VALCAMBI").toUpperCase(),

    }))

  };

}