import type { ReactNode } from "react";
import { PageHeader } from "./PageHeader";

export function ProsePage({ title, eyebrow, description, children }: { title: string; eyebrow?: string; description?: string; children: ReactNode }) {
  return (
    <>
      <PageHeader crumbs={[{ label: title }]} eyebrow={eyebrow} title={title} description={description} />
      <div className="container-page py-12">
        <div className="mx-auto max-w-3xl space-y-5 rounded-2xl border border-line bg-white p-6 text-slate-700 shadow-card sm:p-10 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </div>
      </div>
    </>
  );
}
