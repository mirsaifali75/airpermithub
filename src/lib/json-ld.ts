/**
 * Structured data for search engines, as text safe to put inside a <script> tag.
 * JSON.stringify leaves "<" alone, so a value containing "</script>" would end the
 * tag early and let the rest run as HTML. Escaping "<" (and the two line
 * separators some parsers treat as line breaks) keeps it inert. Content is ours
 * today, but records will come from the database once editors can change them.
 */
export function jsonLdText(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
