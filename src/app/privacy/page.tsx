import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/ProsePage";
import { VerifyNotice } from "@/components/ui/Notices";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function Page() {
  return (
    <ProsePage title="Privacy Policy">
      <VerifyNotice>Placeholder. The Privacy Policy must be drafted and reviewed by qualified counsel before launch.</VerifyNotice>
    </ProsePage>
  );
}
