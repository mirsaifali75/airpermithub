import { aphTemplates, getTemplate, templateCsv } from "@/lib/data/templates";

export const dynamic = "force-static";

export function generateStaticParams() {
  return aphTemplates.map((t) => ({ slug: t.slug }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const t = getTemplate((await params).slug);
  if (!t) return new Response("Not found", { status: 404 });
  return new Response(templateCsv(t), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="airpermithub-${t.slug}.csv"`,
    },
  });
}
