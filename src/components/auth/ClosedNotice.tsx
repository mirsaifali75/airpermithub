/** Shown on the account pages until accounts open on this deployment. */
export function ClosedNotice() {
  return (
    <p role="note" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <span className="font-semibold">Accounts are coming soon.</span> Sign-in isn&apos;t available yet, and nothing you enter on this page is sent or stored. Every tool works without an account for now.
    </p>
  );
}
