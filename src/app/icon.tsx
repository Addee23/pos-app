import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a4d5c",
          color: "#ffffff",
          borderRadius: 112,
        }}
      >
        <div
          style={{
            fontSize: 88,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1,
          }}
        >
          POS
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 28,
            fontWeight: 600,
            color: "#c9a227",
          }}
        >
          & Lager
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
