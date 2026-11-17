import { VerifyNotice } from "@/components/ui/Notices";
import { policyDate } from "@/lib/site";

/** Marks a policy as a plain-language draft that counsel has not yet reviewed. */
export function PolicyDraftNotice() {
  return (
    <VerifyNotice>
      <strong className="font-semibold">Draft dated {policyDate}, pending attorney review.</strong> It describes how the site actually works today in plain language. It will be revised after review and whenever the site changes, and the date above will change with it.
    </VerifyNotice>
  );
}
