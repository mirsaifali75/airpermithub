import { jsonLdText } from "@/lib/json-ld";

/** Structured data for search engines, escaped so no value can break out of the tag. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(data) }} />;
}
