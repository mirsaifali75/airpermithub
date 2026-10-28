import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name}: ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share image for every page that doesn't set its own. */
export default function OpengraphImage() {
  const tools = ["Permit Finder", "Emission Calculators", "Regulations", "51 State Hubs", "Compliance Calendar"];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #071A2B 0%, #0B2942 60%, #0F3A5E 100%)", color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="76" height="76" viewBox="0 0 48 48">
            <rect width="48" height="48" rx="11" fill="#0B2942" />
            <g transform="translate(4.8 4.8) scale(0.8)">
              <path d="M4 45 L20.5 6 H27 L11.5 45 Z" fill="#fff" />
              <path d="M27 6 L44 45 H36.5 L24 15.5 Z" fill="#00B8FF" />
              <path d="M2 31.5 C 12 24, 24 30.5, 41 21" stroke="#147DFF" strokeWidth="3.4" strokeLinecap="round" fill="none" />
              <path d="M31 9 C 31.5 3.5, 37 1, 46 1.5 C 45.5 8.5, 40 12.5, 31 9 Z" fill="#16834B" />
            </g>
          </svg>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800 }}>
            <span>Air</span><span style={{ color: "#00B8FF" }}>Permit</span><span>Hub</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5 }}>{site.headline}</div>
          <div style={{ fontSize: 30, color: "#B8C7D9", maxWidth: 940, lineHeight: 1.35 }}>{site.description}</div>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {tools.map((t) => (
            <div key={t} style={{ display: "flex", padding: "10px 20px", borderRadius: 999, background: "rgba(20,125,255,0.18)", border: "1px solid rgba(0,184,255,0.45)", fontSize: 24, color: "#E6F4FF" }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
