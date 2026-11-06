"use client";

import { useEffect, useRef, useState } from "react";
import { onStored, readStored, writeStored } from "@/lib/storage/browser";

export const field = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none";
export const labelCls = "mb-1 block text-xs font-semibold text-slate-700";

/**
 * State saved under `key`: in this browser, and in the account when signed
 * in (see AccountSync). Loads after mount so server and client render the
 * same first frame, saves on every change, and reloads when the account's
 * copy arrives. Nothing is written until the state changes, so opening a
 * tool in a new browser never replaces the account's work with a blank form.
 */
export function useStoredState<T>(key: string, initial: T) {
  const first = useRef(initial);
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);
  useEffect(() => {
    const stored = readStored<T | undefined>(key, undefined);
    if (stored !== undefined) setValue(stored);
    loaded.current = true;
    return onStored((k) => { if (k === key) setValue(readStored(key, first.current)); });
  }, [key]);
  useEffect(() => {
    if (!loaded.current || value === first.current) return;
    writeStored(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}

/** Saves text as a file. CSV gets a byte-order mark so Excel reads it as UTF-8 (§, –, µ, O₂). */
export function downloadText(name: string, text: string, type = "text/csv") {
  const csv = type === "text/csv";
  const url = URL.createObjectURL(new Blob([csv ? "\uFEFF" : "", text], { type: csv ? "text/csv;charset=utf-8" : `${type};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { csvFileName, toCsv } from "@/lib/csv";

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
