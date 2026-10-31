import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name}: ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share image for every page that doesn't set its own. */
export default async function OpengraphImage() {
  const logo = `data:image/png;base64,${(await readFile(join(process.cwd(), "src/assets/brand/airpermithub-mark-og.png"))).toString("base64")}`;
  const tools = ["Permit Finder", "Emission Calculators", "Regulations", "51 State Hubs", "Compliance Calendar"];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-start", gap: 30, padding: 64, background: "linear-gradient(135deg, #071A2B 0%, #0B2942 60%, #0F3A5E 100%)", color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex" }}>
          <div style={{ display: "flex", padding: 10, borderRadius: 20, background: "#fff" }}>
            {/* The logo, unchanged (resized ahead of time for a clean edge), on a white tile */}
            <img src={logo} width={173} height={161} alt="" />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5 }}>{site.headline}</div>
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
