import Image from "next/image";
import logo from "@/assets/brand/airpermithub-mark.png";
import { cn } from "@/lib/cn";

/**
 * The AirPermitHub logo (eagle mark with wordmark), shown exactly as supplied
 * (no redraw or recolor). The asset is the original with only its empty white
 * margin trimmed. On dark backgrounds it sits on a white tile.
 * Source: public/brand/airpermithub-mark.png. The detailed eagle-and-map logo
 * (public/brand/airpermithub-logo.png) is shown large on the home page.
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
      alt="AirPermitHub"
      priority={priority}
      sizes="220px"
      className={tone === "light" ? cn("w-auto", className) : "h-full w-auto object-contain"}
    />
  );
  if (tone === "light") return img;
  return <span className={cn("inline-flex rounded-xl bg-white shadow-sm ring-1 ring-black/5", className)}>{img}</span>;
}
