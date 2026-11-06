import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline-light" | "subtle";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-navy-900 text-white tracking-[0.02em] hover:bg-navy-800",
  secondary: "bg-navy-900 text-white hover:bg-navy-800",
  ghost: "text-brand-600 hover:bg-brand-50",
  "outline-light": "border border-gold-200/80 text-white tracking-[0.02em] hover:bg-white/10 hover:border-gold-200",
  subtle: "border border-rule bg-white text-navy-900 hover:border-gold-500 hover:bg-canvas",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-6 text-base",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 whitespace-nowrap";

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

/**
 * Same look as buttonClass, but for labels that come from data and can be long
 * (agency portal and fee-schedule names): the text wraps inside the button
 * instead of running past its edge.
 */
export function wrappingButtonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  const fixedHeight = sizes[size].replace(/\bh-(\d+)\b/, "min-h-$1 py-2");
  return cn(base.replace("whitespace-nowrap", "text-center break-words"), variants[variant], fixedHeight, className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}
