import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="bg-navy-900 px-4 pt-36 pb-24 text-center text-white">
      <p className="text-sm font-bold tracking-[0.2em] text-cyan-400">404</p>
      <h1 className="mt-3 text-4xl font-extrabold">Page not found</h1>
      <p className="mx-auto mt-3 max-w-md text-white/70">The page may have moved. Try search, or start with the Permit Finder.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className={buttonClass("primary")}>Home</Link>
        <Link href="/permit-finder" className={buttonClass("outline-light")}>Permit Finder</Link>
      </div>
    </div>
  );
}
