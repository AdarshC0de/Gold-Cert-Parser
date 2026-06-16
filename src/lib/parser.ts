export interface ParsedRow {
  rowOrder: number;
  gram: string;
  gramValue: number | null;
  count: number;
  serialFrom: number;
  serialTo: number;
  series: string;
  purity: string;
  brand: string;
}

export interface ParsedHeader {
  manufacturer: string | null;
  origin: string | null;
  invoiceNo: string | null;
  certNo: string | null;
  refDate: string | null;
}

function gramLabelToValue(label: string): number | null {
  const match = label.match(/^([\d.]+)\s*GRAMS?$/i);
  if (match) return parseFloat(match[1]);
  return null;
}

export function parseRows(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];

  const clean = text
    .replace(/\r/g, "")
    .replace(/IGRAM/g, "1GRAM")
    .replace(/IOGRAMS/g, "10GRAMS")
    .replace(/IOOGRAMS/g, "100GRAMS");

  const lines = clean
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Gram labels
  const grams = lines.filter((l) =>
    /^(1GRAM|2\.5GRAMS|5GRAMS|10GRAMS|20GRAMS|50GRAMS|100GRAMS|ONZ)$/i.test(l)
  );

  // Counts: 3-4 digit numbers BUT exclude the grand total
  // The total is the largest number and appears after all individual counts
  const allCounts = lines.filter((l) => /^\d{3,4}$/.test(l)).map(Number);
  // Remove the last entry if it looks like a total (sum of others)
  const countSum = allCounts.slice(0, -1).reduce((a, b) => a + b, 0);
  const counts =
    allCounts[allCounts.length - 1] === countSum
      ? allCounts.slice(0, -1)
      : allCounts.slice(0, grams.length);

  // Serial numbers: 5-6 digit numbers
  const serials = lines.filter((l) => /^\d{5,6}$/.test(l));

  // Series: AA or AC lines
  // OCR often misses some — we collect all and map by index
  // User MUST verify on review screen (especially for AC rows)
  const seriesList = lines.filter((l) => /^(AA|AC)$/i.test(l));

  // Serials: first half = high (إلى), second half = low (من)
  const half = Math.floor(serials.length / 2);
  const serialHigh = serials.slice(0, half);
  const serialLow = serials.slice(half);

  for (let i = 0; i < grams.length; i++) {
    const gramLabel = grams[i].toUpperCase();

    rows.push({
      rowOrder: i + 1,
      gram: gramLabel,
      gramValue: gramLabel === "ONZ" ? null : gramLabelToValue(gramLabel),
      count: Number(counts[i] ?? 0),
      serialFrom: Number(serialLow[i] ?? 0),
      serialTo: Number(serialHigh[i] ?? 0),
      // Default AA — user MUST check series column in review table
      // OCR frequently misses series values for some rows
      series: (seriesList[i] ?? "AA").toUpperCase(),
      purity: "999.9",
      brand: "VALCAMBI",
    });
  }

  return rows;
}

export function parseHeader(ocrText: string): ParsedHeader {
  const normalized = ocrText.replace(/\s+/g, " ");

  const manufacturerMatch = normalized.match(
    /\b(VALCAMBI|PAMP|ARGOR[- ]?HERAEUS|HERAEUS)\b/i
  );
  const invoiceMatch = normalized.match(/(?:Invoice|INV|STX)\s*[:\-]?\s*([A-Z0-9 ]+)/i);
  const certMatch = normalized.match(/\b(\d{6,})\b/);
  const dateMatch = normalized.match(
    /\d{1,2}\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s*\d{4}/i
  );
  const originMatch = normalized.match(/Switzerland/i);

  return {
    manufacturer: manufacturerMatch ? manufacturerMatch[1].toUpperCase() : null,
    origin: originMatch ? "Switzerland" : null,
    invoiceNo: invoiceMatch ? invoiceMatch[1].trim() : null,
    certNo: certMatch ? certMatch[1] : null,
    refDate: dateMatch ? dateMatch[0] : null,
  };
}

export function buildRows(
  rawRows: { gram: string; count: number; serialFrom: number; serialTo: number; series: string; purity: string; brand: string }[]
): ParsedRow[] {
  return rawRows.map((r, i) => ({
    rowOrder: i + 1,
    gram: r.gram,
    gramValue: r.gram === "ONZ" || r.gram === "1KG" ? null : gramLabelToValue(r.gram),
    count: r.count,
    serialFrom: r.serialFrom,
    serialTo: r.serialTo,
    series: r.series,
    purity: r.purity,
    brand: r.brand,
  }));
}