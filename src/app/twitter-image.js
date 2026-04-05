import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 600,
};

export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "linear-gradient(90deg, #f8fbff 0%, #d9eff2 40%, #ffd98d 100%)",
          color: "#102033",
          display: "flex",
          fontFamily: "Trebuchet MS, sans-serif",
          gap: 32,
          height: "100%",
          justifyContent: "center",
          padding: "40px 56px",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#102033",
            borderRadius: 28,
            color: "white",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: "28px 32px",
          }}
        >
          <div style={{ fontSize: 22, letterSpacing: 4, textTransform: "uppercase" }}>
            Equip Blog
          </div>
          <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.1 }}>
            Repo scaffold ready
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 520 }}>
          <div style={{ fontSize: 42, fontWeight: 700, lineHeight: 1.05 }}>
            Public, admin, and API surfaces are wired for Release 1.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
