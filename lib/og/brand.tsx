// Brand pieces for ImageResponse (Satori): inline styles and explicit flexbox only.

export const OG_COLORS = {
  brand: "#cc4a0a",
  brandDeep: "#7c2d12",
  ink: "#171717",
  muted: "#737373",
  border: "#e5e5e5",
  surface: "#fafafa",
} as const;

export function OgLogoMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill={OG_COLORS.brand} />
      <path d="M8.5 14.2 16 7.8l7.5 6.4V23.5a1.5 1.5 0 0 1-1.5 1.5H10a1.5 1.5 0 0 1-1.5-1.5z" fill="#fff" />
      <path d="M10.2 12.7C7.6 13 5.5 15.6 5.6 19.4c0 1.6 1.9 2.1 2.8.8l2.6-3.9z" fill={OG_COLORS.brandDeep} />
      <path d="M21.8 12.7c2.6.3 4.7 2.9 4.6 6.7 0 1.6-1.9 2.1-2.8.8l-2.6-3.9z" fill={OG_COLORS.brandDeep} />
      <circle cx="13.3" cy="17" r="1.2" fill="#1c1917" />
      <circle cx="18.7" cy="17" r="1.2" fill="#1c1917" />
      <path d="M14.5 20h3c.45 0 .67.54.35.85l-1.5 1.4a.5.5 0 0 1-.7 0l-1.5-1.4c-.32-.31-.1-.85.35-.85z" fill="#1c1917" />
    </svg>
  );
}

export function OgWordmark({ size }: { size: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.4, fontSize: size * 0.72, fontWeight: 700 }}>
      <OgLogoMark size={size} />
      <div style={{ display: "flex", color: OG_COLORS.ink }}>
        accommodation<span style={{ color: OG_COLORS.brand }}>Dog</span>
      </div>
    </div>
  );
}
