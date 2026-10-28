import { social } from "@/lib/site";
import { cn } from "@/lib/cn";

const glyph: Record<(typeof social)[number]["name"], React.ReactNode> = {
  LinkedIn: <span className="font-display text-[0.95rem] font-extrabold tracking-tight">in</span>,
  YouTube: (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" /><path d="M10 9l5 3-5 3z" fill="#071A2B" /></svg>
  ),
  X: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path d="M4 4l16 16M20 4L4 20" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
  ),
  Facebook: <span className="font-display text-lg leading-none font-extrabold">f</span>,
};

export function SocialIcons({ className }: { className?: string }) {
  return (
    <ul className={cn("flex items-center gap-2", className)} aria-label="Social media">
      {social.map(({ name, href }) => (
        <li key={name}>
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" aria-label={name} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/8 text-white/80 transition-colors hover:bg-brand-500 hover:text-white">
              {glyph[name]}
            </a>
          ) : (
            <span title={`${name}: coming soon`} aria-label={`${name} (coming soon)`} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/45">
              {glyph[name]}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
