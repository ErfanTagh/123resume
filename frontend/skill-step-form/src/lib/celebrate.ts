/**
 * Confetti burst for accepting an AI suggestion.
 *
 *   celebrate(event.currentTarget)          // small burst from the button
 *   celebrate(event.currentTarget, "big")   // "Accept all"
 *
 * No dependency: one throwaway canvas over the page, removed when the last
 * piece has faded. Skipped entirely for users who prefer reduced motion.
 */

type Intensity = "small" | "big";

// Our sunset palette (index.css --sunset-* and --primary) plus a warm gold.
const COLORS = [
  "hsl(268 72% 60%)",
  "hsl(338 88% 60%)",
  "hsl(22 94% 58%)",
  "hsl(344 84% 55%)",
  "hsl(45 96% 58%)",
];

const SETTINGS: Record<Intensity, { count: number; speed: number; spread: number }> = {
  small: { count: 46, speed: 9, spread: 70 },
  big: { count: 130, speed: 13, spread: 100 },
};

const GRAVITY = 0.32;
const DRAG = 0.985;
const LIFETIME_MS = 1500;

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  // Rectangles flutter by squashing on one axis; circles don't.
  shape: "rect" | "circle";
  flutter: number;
};

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function celebrate(from?: Element | null, intensity: Intensity = "small"): void {
  if (typeof window === "undefined" || prefersReducedMotion()) return;

  const rect = from?.getBoundingClientRect();
  const originX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const originY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "9999",
  });
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const { count, speed, spread } = SETTINGS[intensity];
  const pieces: Piece[] = Array.from({ length: count }, () => {
    // Fire upward in a cone of `spread` degrees.
    const angle = ((-90 + (Math.random() - 0.5) * spread) * Math.PI) / 180;
    const velocity = speed * (0.55 + Math.random() * 0.6);
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      size: 5 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.4,
      shape: Math.random() < 0.7 ? "rect" : "circle",
      flutter: Math.random() * Math.PI * 2,
    };
  });

  const start = performance.now();
  const frame = (now: number) => {
    const elapsed = now - start;
    // Everything fades over the last third of the lifetime.
    const alpha = Math.max(0, Math.min(1, (LIFETIME_MS - elapsed) / (LIFETIME_MS / 3)));
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.globalAlpha = alpha;

    for (const p of pieces) {
      p.vx *= DRAG;
      p.vy = p.vy * DRAG + GRAVITY;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      p.flutter += 0.15;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.scale(1, Math.abs(Math.cos(p.flutter)) * 0.8 + 0.2);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (elapsed < LIFETIME_MS) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
