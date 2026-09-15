import { load } from "cheerio";
import { parseElitigationUrl } from "./citationEngine";
export function extractCaseName(html: string, neutral: string): string | null {
  const $ = load(html);
  const expected = parseElitigationUrl(neutral);
  const actual = parseElitigationUrl($("title").text().trim());
  if (
    !expected ||
    !actual ||
    JSON.stringify(expected) !== JSON.stringify(actual)
  )
    return null;
  const names = $(".HN-CaseName")
    .toArray()
    .map((el) => {
      const header = $(el).clone();
      header.find("br").replaceWith(" ");
      return header.text().replace(/\s+/g, " ").trim();
    });
  return (
    names.find(
      (name) =>
        name.length > 2 && name.length < 1000 && !parseElitigationUrl(name),
    ) || null
  );
}
