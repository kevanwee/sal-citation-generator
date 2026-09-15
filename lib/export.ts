import { escapeHtml } from "./citationEngine";
import type { CitationOutput } from "./types";
export function exportText(outputs: CitationOutput[], start: number): string {
  return outputs.map((o, i) => `${start + i}. ${o.text}`).join("\n");
}
export function exportHtml(
  outputs: CitationOutput[],
  start: number,
  title: string,
): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><h1>${escapeHtml(title)}</h1><ol start="${start}" style="font-family:Georgia,serif;line-height:1.7">${outputs.map((o) => `<li>${o.html}</li>`).join("")}</ol></body></html>`;
}
export async function copyCitations(
  outputs: CitationOutput[],
  start: number,
  numbered = true,
): Promise<"rich" | "plain"> {
  const text = numbered
    ? exportText(outputs, start)
    : outputs.map((o) => o.text).join("\n");
  const html = numbered
    ? `<ol start="${start}">${outputs.map((o) => `<li>${o.html}</li>`).join("")}</ol>`
    : outputs.map((o) => o.html).join("<br>");
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
      return "rich";
    } catch {
      /* Try plain text when rich clipboard is unavailable. */
    }
  }
  await navigator.clipboard.writeText(text);
  return "plain";
}
export function downloadFile(contents: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
