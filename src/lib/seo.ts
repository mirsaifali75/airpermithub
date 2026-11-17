import type { Metadata } from "next";
import { site } from "@/lib/site";

/** Longest meta description we publish; Google cuts snippets at roughly this length. */
export const DESCRIPTION_MAX = 158;

/** Shorten text to `max` characters at a word boundary, adding an ellipsis only when it was cut. */
export function clip(text: string, max = DESCRIPTION_MAX): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–-]+$/, "")}…`;
}

function plainTitle(title: Metadata["title"]): string | undefined {
  if (!title) return undefined;
  if (typeof title === "string") return title;
  if ("absolute" in title && title.absolute) return title.absolute;
  if ("default" in title && title.default) return title.default;
  return undefined;
}

/**
 * Give a page its own share card. Without this every page inherits the home page's
 * og:title and og:url, so a shared state or rule page previews as the home page.
 * Fills og/twitter title, description and URL from the page's own title, description
 * and canonical, keeps anything the page set itself, and trims long descriptions.
 */
/** The site-wide share image (src/app/opengraph-image.tsx). A page that sets its own og fields loses the inherited one, so it is added back here. */
const shareImage = { url: "/opengraph-image", width: 1200, height: 630, alt: `${site.name}: ${site.tagline}` };

export function withSocial(meta: Metadata): Metadata {
  const title = plainTitle(meta.title);
  const description = typeof meta.description === "string" ? clip(meta.description) : undefined;
  const canonical = meta.alternates?.canonical;
  const path = typeof canonical === "string" ? canonical : canonical instanceof URL ? canonical.pathname : undefined;
  const ogTitle = title && !title.includes(site.name) ? `${title} | ${site.name}` : title;
  return {
    ...meta,
    ...(description ? { description } : {}),
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: "en_US",
      ...(ogTitle ? { title: ogTitle } : {}),
      ...(description ? { description } : {}),
      ...(path ? { url: path } : {}),
      images: [shareImage],
      ...meta.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      ...(ogTitle ? { title: ogTitle } : {}),
      ...(description ? { description } : {}),
      images: [shareImage.url],
      ...meta.twitter,
    },
  };
}
