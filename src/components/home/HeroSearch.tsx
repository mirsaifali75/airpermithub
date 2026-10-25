"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function HeroSearch() {
  const [q, setQ] = useState("");
  const router = useRouter();
  return (
    <form
      role="search"
      className="mt-7 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/95 p-1.5 shadow-lift"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <label htmlFor="hero-search" className="sr-only">Search AirPermitHub</label>
      <Search className="ml-3 h-5 w-5 shrink-0 text-brand-500" aria-hidden="true" />
      <input
        id="hero-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search permits, regulations, equipment, facilities, or keywords..."
        className="h-11 min-w-0 flex-1 bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-slate-500"
      />
      <button type="submit" className="h-11 rounded-xl bg-navy-900 px-5 text-sm font-semibold text-white hover:bg-navy-800">
        Search
      </button>
    </form>
  );
}
