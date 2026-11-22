/** CSS font-family stack used by the poster captions (heading style, or body style for small lines). */
export function posterFontStack(family: string | undefined, body = false): string {
  const clean = (family || "").replace(/['"]/g, "").trim();
  const serif = /serif|times|cormorant|baskerville|lora|merriweather|playfair/i.test(clean);
  if (body) {
    return serif
      ? `"${clean}", 'Times New Roman', Times, serif`
      : (clean ? `"${clean}", "IBM Plex Mono", monospace` : '"IBM Plex Mono", monospace');
  }
  return clean
    ? `"${clean}", ${serif ? "'Times New Roman', Times, serif" : '"Space Grotesk", sans-serif'}`
    : '"Space Grotesk", sans-serif';
}
