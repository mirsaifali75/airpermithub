import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/ProsePage";
import { VerifyNotice } from "@/components/ui/Notices";

export const metadata: Metadata = { title: "Terms of Use", alternates: { canonical: "/terms" } };

export default function Page() {
  return (
    <ProsePage title="Terms of Use">
      <VerifyNotice>Placeholder. The Terms of Use must be drafted and reviewed by qualified counsel before launch.</VerifyNotice>
    </ProsePage>
  );
}
