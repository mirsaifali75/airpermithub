import Image from "next/image";
import logo from "@/assets/brand/airpermithub-logo.png";
import { cn } from "@/lib/cn";

/**
 * The official AirPermitHub logo, shown exactly as supplied (no redraw,
 * recolor, or crop). The artwork has a navy wordmark and navy eagle, so on
 * dark backgrounds it sits on a white tile rather than being altered.
 * Source files: public/brand (original PNG, transparent PNG, SVG wrapper).
 */
export function Logo({
  tone = "dark",
  className,
  priority,
}: {
  /** "dark" = placed on a dark background (white tile behind the logo). */
  tone?: "dark" | "light";
  /** Height (and, on dark backgrounds, tile padding) classes, such as "h-12 p-1". Width follows the artwork's proportions. */
  className?: string;
  priority?: boolean;
}) {
  const img = (
    <Image
      src={logo}
      alt="AirPermitHub: Nationwide Air Permitting Excellence"
      priority={priority}
      sizes="(min-width: 1024px) 240px, 180px"
      className={tone === "light" ? cn("w-auto", className) : "h-full w-auto"}
    />
  );
  if (tone === "light") return img;
  return <span className={cn("inline-flex rounded-xl bg-white shadow-sm ring-1 ring-black/5", className)}>{img}</span>;
}
