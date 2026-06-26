/**
 * Business-card SVG renderer. Four accent-driven templates on a 1050x600 viewBox
 * (3.5x2in @ 300dpi). Pure rendering — no state, no data fetching.
 */
export type CardTemplateId = "classic" | "banner" | "minimal" | "dark";
export type SocialKind = "linkedin" | "github" | "twitter";

export const CARD_TEMPLATES: { id: CardTemplateId; label: string }[] = [
  { id: "classic", label: "Classic" },
  { id: "banner", label: "Banner" },
  { id: "minimal", label: "Minimal" },
  { id: "dark", label: "Dark" },
];

export const ACCENT_PRESETS = [
  "#ed2c5f",
  "#2563eb",
  "#7c3aed",
  "#0d9488",
  "#f59e0b",
  "#334155",
];

type QrMatrix = { size: number; get: (r: number, c: number) => boolean };

export type CardRenderProps = {
  template: CardTemplateId;
  accent: string;
  name: string;
  title?: string;
  contacts: string[];
  socials: { kind: SocialKind; text: string }[];
  qr: QrMatrix | null;
  qrCaption: string;
  brand?: string;
  /** Optional headshot (data URL recommended) shown as a circular avatar. */
  photo?: string;
};

const FONT = "Poppins, ui-sans-serif, system-ui, sans-serif";
const SLATE = "#1f2937";
const MUTED = "#6b7280";

const BRAND_PATHS: Record<SocialKind, string> = {
  linkedin:
    "M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.8 0 0 .78 0 1.74v20.51C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.74C24 .78 23.2 0 22.22 0z",
  github:
    "M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.08-.73.08-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.6-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0024 12.5C24 5.87 18.63.5 12 .5z",
  twitter:
    "M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.64 7.58H.48l8.6-9.83L0 1.15h7.59l5.24 6.93zM17.61 20.64h2.04L6.49 3.24H4.3z",
};

function BrandGlyph({ kind, x, y, size, color }: { kind: SocialKind; x: number; y: number; size: number; color: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${size / 24})`}>
      <path d={BRAND_PATHS[kind]} fill={color} />
    </g>
  );
}

/** Circular headshot with a thin ring. `id` must be unique within the SVG. */
function Avatar({ photo, cx, cy, r, ring, id }: { photo: string; cx: number; cy: number; r: number; ring: string; id: string }) {
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r + 5} fill={ring} />
      <image
        href={photo}
        x={cx - r}
        y={cy - r}
        width={r * 2}
        height={r * 2}
        clipPath={`url(#${id})`}
        preserveAspectRatio="xMidYMid slice"
      />
    </g>
  );
}

function qrRects(qr: QrMatrix, x: number, y: number, size: number, color = "#111827") {
  const cell = size / qr.size;
  const out: JSX.Element[] = [];
  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (qr.get(r, c)) {
        out.push(
          <rect key={`${r}-${c}`} x={x + c * cell} y={y + r * cell} width={cell + 0.6} height={cell + 0.6} fill={color} />,
        );
      }
    }
  }
  return out;
}

function InfoLines({
  x,
  startY,
  step,
  textColor,
  accent,
  contacts,
  socials,
  glyphColor,
}: {
  x: number;
  startY: number;
  step: number;
  textColor: string;
  accent: string;
  contacts: string[];
  socials: { kind: SocialKind; text: string }[];
  glyphColor: string;
}) {
  const els: JSX.Element[] = [];
  let y = startY;
  contacts.forEach((line, i) => {
    els.push(
      <g key={`c${i}`}>
        <circle cx={x + 7} cy={y - 8} r={5} fill={accent} />
        <text x={x + 28} y={y} fontFamily={FONT} fontSize="24" fill={textColor}>{line}</text>
      </g>,
    );
    y += step;
  });
  socials.forEach((s, i) => {
    els.push(
      <g key={`s${i}`}>
        <BrandGlyph kind={s.kind} x={x - 2} y={y - 21} size={24} color={glyphColor} />
        <text x={x + 30} y={y} fontFamily={FONT} fontSize="24" fill={textColor}>{s.text}</text>
      </g>,
    );
    y += step;
  });
  return <>{els}</>;
}

function QrBlock({ qr, x, y, size, caption, captionColor, dark }: { qr: QrMatrix | null; x: number; y: number; size: number; caption: string; captionColor: string; dark?: boolean }) {
  if (!qr) {
    return <rect x={x} y={y} width={size} height={size} rx={8} fill={dark ? "#2a2c36" : "#f3f4f6"} stroke={dark ? "#3a3d49" : "#e5e7eb"} />;
  }
  return (
    <>
      {qrRects(qr, x, y, size)}
      <text x={x + size / 2} y={y + size + 34} textAnchor="middle" fontFamily={FONT} fontSize="20" fontWeight="500" fill={captionColor}>{caption}</text>
    </>
  );
}

export function renderBusinessCard(p: CardRenderProps): JSX.Element {
  const { template, accent, name, title, contacts, socials, qr, qrCaption, brand, photo } = p;
  const displayName = name || "Your Name";
  const hasPhoto = !!photo && photo.trim().length > 0;

  if (template === "banner") {
    // Headshot sits at the top-right of the colored banner.
    return (
      <>
        <rect x="0" y="0" width="1050" height="600" fill="#ffffff" />
        <rect x="0" y="0" width="1050" height="200" fill={accent} />
        <text x="70" y="112" fontFamily={FONT} fontSize="54" fontWeight="700" fill="#ffffff">{displayName}</text>
        {title ? <text x="72" y="160" fontFamily={FONT} fontSize="26" fontWeight="500" fill="#ffffff" opacity="0.92">{title}</text> : null}
        {hasPhoto ? <Avatar photo={photo!} cx={946} cy={100} r={64} ring="#ffffff" id="bc-av-banner" /> : null}
        <InfoLines x={72} startY={288} step={46} textColor="#374151" accent={accent} glyphColor={accent} contacts={contacts} socials={socials} />
        <text x="70" y="566" fontFamily={FONT} fontSize="18" fontWeight="500" fill={MUTED}>{brand}</text>
        <QrBlock qr={qr} x={772} y={270} size={210} caption={qrCaption} captionColor={MUTED} />
      </>
    );
  }

  // For the remaining templates a circular headshot sits top-left and the
  // name/title shift right to sit beside it.
  const headX = hasPhoto ? 252 : 70;
  const nameY = hasPhoto ? 120 : 150;

  if (template === "minimal") {
    const titleY = hasPhoto ? 182 : 214;
    return (
      <>
        <rect x="0" y="0" width="1050" height="600" fill="#ffffff" />
        {hasPhoto ? <Avatar photo={photo!} cx={134} cy={138} r={78} ring="#eef0f4" id="bc-av-min" /> : null}
        <text x={headX} y={nameY} fontFamily={FONT} fontSize="56" fontWeight="700" fill={SLATE}>{displayName}</text>
        <rect x={headX + 2} y={hasPhoto ? 138 : 168} width="84" height="5" rx="2.5" fill={accent} />
        {title ? <text x={headX + 2} y={titleY} fontFamily={FONT} fontSize="24" fontWeight="400" fill={MUTED}>{title}</text> : null}
        <InfoLines x={72} startY={286} step={44} textColor="#4b5563" accent={accent} glyphColor={accent} contacts={contacts} socials={socials} />
        <text x="70" y="566" fontFamily={FONT} fontSize="18" fontWeight="500" fill={MUTED}>{brand}</text>
        <QrBlock qr={qr} x={788} y={160} size={200} caption={qrCaption} captionColor={MUTED} />
      </>
    );
  }

  if (template === "dark") {
    const tileX = 716, tileY = 150, tile = 276, qs = 232;
    const titleY = hasPhoto ? 166 : 196;
    return (
      <>
        <rect x="0" y="0" width="1050" height="600" fill="#15161c" />
        <rect x="0" y="0" width="16" height="600" fill={accent} />
        {hasPhoto ? <Avatar photo={photo!} cx={140} cy={138} r={78} ring="#2a2c36" id="bc-av-dark" /> : null}
        <text x={headX} y={nameY} fontFamily={FONT} fontSize="58" fontWeight="700" fill="#ffffff">{displayName}</text>
        {title ? <text x={headX + 2} y={titleY} fontFamily={FONT} fontSize="26" fontWeight="500" fill={accent}>{title}</text> : null}
        <line x1="72" y1="232" x2="600" y2="232" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="2" />
        <InfoLines x={72} startY={292} step={48} textColor="#e5e7eb" accent={accent} glyphColor={accent} contacts={contacts} socials={socials} />
        <text x="70" y="566" fontFamily={FONT} fontSize="18" fontWeight="500" fill="#9ca3af">{brand}</text>
        <rect x={tileX} y={tileY} width={tile} height={tile} rx="18" fill="#ffffff" />
        <QrBlock qr={qr} x={tileX + (tile - qs) / 2} y={tileY + (tile - qs) / 2} size={qs} caption={qrCaption} captionColor="#9ca3af" dark />
      </>
    );
  }

  // classic (default)
  const classicTitleY = hasPhoto ? 166 : 196;
  return (
    <>
      <rect x="0" y="0" width="1050" height="600" fill="#ffffff" />
      <rect x="0" y="0" width="16" height="600" fill={accent} />
      {hasPhoto ? <Avatar photo={photo!} cx={140} cy={138} r={78} ring="#eef0f4" id="bc-av-classic" /> : null}
      <text x={headX} y={nameY} fontFamily={FONT} fontSize="58" fontWeight="700" fill={SLATE}>{displayName}</text>
      {title ? <text x={headX + 2} y={classicTitleY} fontFamily={FONT} fontSize="26" fontWeight="500" fill={accent}>{title}</text> : null}
      <line x1="72" y1="232" x2="600" y2="232" stroke="#ececf0" strokeWidth="2" />
      <InfoLines x={72} startY={292} step={48} textColor="#374151" accent={accent} glyphColor={accent} contacts={contacts} socials={socials} />
      <text x="70" y="566" fontFamily={FONT} fontSize="18" fontWeight="500" fill={MUTED}>{brand}</text>
      <QrBlock qr={qr} x={742} y={150} size={240} caption={qrCaption} captionColor={MUTED} />
    </>
  );
}
