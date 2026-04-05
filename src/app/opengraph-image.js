import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background:
            "linear-gradient(135deg, #0d2a3f 0%, #005f73 50%, #f4c542 100%)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Trebuchet MS, sans-serif",
          height: "100%",
          justifyContent: "space-between",
          padding: "56px 64px",
          width: "100%",
        }}
      >
        <div style={{ fontSize: 24, letterSpacing: 6, textTransform: "uppercase" }}>
          Equip Blog
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>
            Source-grounded medical equipment publishing
          </div>
          <div style={{ fontSize: 28, maxWidth: 900, opacity: 0.9 }}>
            Locale-ready public routes, editorial workflows, and reliable equipment reference pages.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
