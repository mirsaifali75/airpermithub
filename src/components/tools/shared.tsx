"use client";

import { useEffect, useRef, useState } from "react";

export const field = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none";
export const labelCls = "mb-1 block text-xs font-semibold text-slate-700";

/**
 * State kept in this browser (localStorage) under `key`. Loads after mount so
 * server and client render the same first frame; saves on every change.
 */
export function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {}
    loaded.current = true;
  }, [key]);
  useEffect(() => {
    if (!loaded.current) return;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

export function downloadText(name: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (title: string, rows: unknown[][]) =>
  [`AirPermitHub Template: ${title} (not an agency form)`, ...rows.map((r) => r.map(csvCell).join(","))].join("\r\n");

/** Number input that keeps what the user typed (including blanks) and reports a number or null. */
export function NumberField({
  id, value, onChange, className, placeholder, ariaLabel,
}: {
  id?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(value === null ? "" : String(value));
    }
  }, [value]);
  return (
    <input
      id={id}
      inputMode="decimal"
      type="text"
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={className ?? field}
      value={text}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        const s = t.replace(/,/g, "").trim();
        const n = s === "" ? null : Number(s);
        const next = n === null || Number.isFinite(n) ? n : null;
        last.current = next;
        onChange(next);
      }}
    />
  );
}
