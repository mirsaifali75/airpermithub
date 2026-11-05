import { getConverter } from "@/lib/tools/converters";
import { ToolPreview } from "./ToolPreview";

/** Signed-out preview for /tools/[slug] unit converters. */
export function ConverterPreview({ slug }: { slug: string }) {
  const c = getConverter(slug);
  if (!c) return null;
  return (
    <ToolPreview
      name={`${c.name} converter`}
      image="/previews/converter.webp"
      width={1400}
      height={1161}
      next={`/tools/${c.slug}`}
      points={[
        "Every conversion step shown, with units",
        "Standard conditions and reference values you choose",
        "Formula and reference beside the result",
        "Nothing regulatory prefilled: you enter the values",
      ]}
    />
  );
}
