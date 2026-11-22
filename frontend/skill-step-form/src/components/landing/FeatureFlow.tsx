import { useEffect, useRef, type ComponentType } from "react";
import {
  Upload,
  Send,
  Gauge,
  Wand2,
  Plug,
  Briefcase,
  LayoutTemplate,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * "How it works" flow: Add details → 5 AI steps → Apply.
 * Connection lines + travelling pulses are drawn on a <canvas>; the cards are
 * DOM elements layered on top. Canvas anchors are derived from the live canvas
 * size so they stay pinned to the card ports at any width.
 * Desktop only (lg+); a plain stacked list is shown on small screens.
 */

// ---- Shared layout constants (stage pixel space; must match the card CSS) ----
const STAGE_H = 600;
const SIDE = 50; // step cards inset from the stage edges
const STEP_W = 250;
const FEAT_W = 200;
const CARD_YS = [120, 210, 300, 390, 480]; // vertical centres of the 5 middle cards

// Pink pulse/line colour (matches --primary ≈ hsl(344 84% 55%))
const LINE = "rgba(237, 44, 95, 0.22)";
const PULSE = "rgb(237, 44, 95)";
const LOOP_MS = 3400; // two 1.7s phases: fan out, then converge

type Pt = { x: number; y: number };
const qPoint = (p0: Pt, p1: Pt, p2: Pt, t: number): Pt => ({
  x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x,
  y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y,
});
const ctrl = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: a.y });
const smooth = (p: number) => p * p * (3 - 2 * p);

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function FlowCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = false;

    const anchors = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      const leftPort: Pt = { x: SIDE + STEP_W, y: H / 2 }; // step-1 right edge
      const rightPort: Pt = { x: W - SIDE - STEP_W, y: H / 2 }; // step-3 left edge
      const featLeftX = W / 2 - FEAT_W / 2;
      const featRightX = W / 2 + FEAT_W / 2;
      const leftCurves = CARD_YS.map((y) => {
        const b: Pt = { x: featLeftX, y };
        // Control at the card's y: the curve leaves the card horizontally and
        // bends at the centre port, mirroring the right-side curves.
        return [leftPort, { x: (leftPort.x + b.x) / 2, y: b.y }, b] as [Pt, Pt, Pt];
      });
      const rightCurves = CARD_YS.map((y) => {
        const a: Pt = { x: featRightX, y };
        return [a, ctrl(a, rightPort), rightPort] as [Pt, Pt, Pt];
      });
      return { leftPort, rightPort, leftCurves, rightCurves };
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawCurve = ([p0, p1, p2]: [Pt, Pt, Pt]) => {
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    const drawGlow = (p: Pt, r: number) => {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, PULSE);
      g.addColorStop(1, "rgba(237, 44, 95, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawStatic = () => {
      const { leftCurves, rightCurves } = anchors();
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      [...leftCurves, ...rightCurves].forEach(drawCurve);
    };

    const frame = (now: number) => {
      const { leftCurves, rightCurves } = anchors();
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      [...leftCurves, ...rightCurves].forEach(drawCurve);

      const t = (now % LOOP_MS) / LOOP_MS;
      const phase = t < 0.5 ? 0 : 1;
      const p = smooth((t % 0.5) / 0.5);
      const curves = phase === 0 ? leftCurves : rightCurves;
      for (const c of curves) drawGlow(qPoint(c[0], c[1], c[2], p), 6);

      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    resize();
    window.addEventListener("resize", resize);

    if (prefersReduced()) {
      drawStatic();
      return () => window.removeEventListener("resize", resize);
    }

    // Only animate while on screen.
    const io = new IntersectionObserver(
      (entries) => (entries.some((e) => e.isIntersecting) ? start() : stop()),
      { threshold: 0.05 },
    );
    io.observe(canvas);

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}

// ---- Content ----
type Item = { title: string; sub: string };
type Content = {
  badge: string;
  title: string;
  subtitle: string;
  layer: string;
  step1: Item;
  step3: Item;
  features: Item[];
};

const CONTENT: Record<string, Content> = {
  en: {
    badge: "How it works",
    title: "From blank page to hired — in one flow",
    subtitle:
      "Add your details once. 123Resume runs them through five AI steps and hands you something recruiters act on.",
    layer: "123resume engine",
    step1: { title: "Add your details", sub: "Import a resume or fill the guided form" },
    step3: { title: "Apply with confidence", sub: "Export a polished PDF and land interviews" },
    features: [
      { title: "ATS check", sub: "Scores your resume for recruiter software" },
      { title: "AI rewrites", sub: "Turns weak lines into measurable wins" },
      { title: "Claude connector", sub: "Edit your resume by chatting with Claude" },
      { title: "Job suggestions", sub: "Free openings matched to your resume" },
      { title: "Templates", sub: "8 ATS-ready designs, one click" },
    ],
  },
  de: {
    badge: "So funktioniert's",
    title: "Vom leeren Blatt zum Gespräch — in einem Fluss",
    subtitle:
      "Einmal Daten eingeben. 123Resume schickt sie durch fünf KI-Schritte und liefert etwas, das Recruiter überzeugt.",
    layer: "123resume Engine",
    step1: { title: "Daten hinzufügen", sub: "Lebenslauf importieren oder Formular ausfüllen" },
    step3: { title: "Selbstbewusst bewerben", sub: "Poliertes PDF exportieren und Interviews gewinnen" },
    features: [
      { title: "ATS-Check", sub: "Prüft deinen Lebenslauf für Bewerbersoftware" },
      { title: "KI-Texte", sub: "Macht schwache Zeilen zu messbaren Erfolgen" },
      { title: "Claude-Connector", sub: "Bearbeite deinen Lebenslauf im Chat mit Claude" },
      { title: "Jobvorschläge", sub: "Kostenlose Stellen passend zu deinem Lebenslauf" },
      { title: "Vorlagen", sub: "8 ATS-sichere Designs, ein Klick" },
    ],
  },
};

const FEATURE_ICONS: ComponentType<{ className?: string }>[] = [
  Gauge,
  Wand2,
  Plug,
  Briefcase,
  LayoutTemplate,
];
const FEATURE_GRADS = [
  "from-[hsl(var(--sunset-violet))] to-[hsl(var(--sunset-pink))]",
  "from-[hsl(var(--sunset-pink))] to-[hsl(var(--sunset-orange))]",
  "from-[hsl(var(--sunset-violet))] to-[hsl(var(--sunset-orange))]",
  "from-[hsl(var(--sunset-orange))] to-[hsl(var(--sunset-pink))]",
  "from-[hsl(var(--sunset-pink))] to-[hsl(var(--sunset-violet))]",
];

function IconRing({
  icon: Icon,
  grad,
  size = "md",
}: {
  icon: ComponentType<{ className?: string }>;
  grad: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-8 w-8 rounded-lg" : "h-11 w-11 rounded-xl";
  const inner = size === "sm" ? "rounded-[6px]" : "rounded-[10px]";
  const ic = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div className={`bg-gradient-to-br ${grad} ${box} flex-none p-[2px]`}>
      <div className={`flex h-full w-full items-center justify-center bg-card ${inner}`}>
        <Icon className={`${ic} text-foreground`} />
      </div>
    </div>
  );
}

function PortDot({ className }: { className: string }) {
  return (
    <span
      className={`absolute h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary/50 ring-4 ring-primary/10 ${className}`}
      aria-hidden
    />
  );
}

export const FeatureFlow = () => {
  const { language } = useLanguage();
  const c = CONTENT[language] || CONTENT.en;

  return (
    <section className="relative overflow-hidden bg-[hsl(240_6%_96%)] py-16 dark:bg-[hsl(240_6%_12%)] sm:py-20" aria-labelledby="landing-flow-heading">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {c.badge}
          </div>
          <h2
            id="landing-flow-heading"
            className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl"
          >
            {c.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {c.subtitle}
          </p>
        </div>

        {/* Desktop stage */}
        <div className="relative mx-auto hidden h-[600px] lg:block" style={{ height: STAGE_H }}>
          <FlowCanvas />

          {/* AI engine pill */}
          <div className="absolute left-1/2 top-[14px] z-10 -translate-x-1/2 lm-fade">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              {c.layer}
            </div>
          </div>

          {/* Step 1 */}
          <div
            className="absolute left-[50px] top-1/2 w-[250px] -translate-y-1/2 lm-fade"
            style={{ animationDelay: "0.05s" }}
          >
            <div className="group relative rounded-2xl border border-border bg-card/90 p-5 shadow-sm backdrop-blur-sm transition-colors duration-300 hover:border-primary/40">
              <div className="absolute -left-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-background text-sm font-bold text-primary">
                01
              </div>
              <PortDot className="right-0 top-1/2" />
              <div className="mb-2 flex items-center gap-3">
                <IconRing icon={Upload} grad="from-[hsl(var(--sunset-violet))] to-[hsl(var(--sunset-pink))]" />
                <h3 className="font-bold text-foreground">{c.step1.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{c.step1.sub}</p>
            </div>
          </div>

          {/* 5 feature cards */}
          {c.features.map((f, i) => {
            const Icon = FEATURE_ICONS[i];
            return (
              <div
                key={f.title}
                className="absolute left-1/2 w-[200px] lm-fade"
                style={{ top: CARD_YS[i], transform: "translate(-50%, -50%)", animationDelay: `${0.15 + i * 0.08}s` }}
              >
                <div className="group relative flex items-center gap-2.5 rounded-xl border border-border bg-card/95 p-2.5 shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-md">
                  <PortDot className="left-0 top-1/2" />
                  <PortDot className="right-0 top-1/2" />
                  <IconRing icon={Icon} grad={FEATURE_GRADS[i]} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{f.title}</p>
                    <p className="line-clamp-2 text-xs leading-tight text-muted-foreground">{f.sub}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Step 3 */}
          <div
            className="absolute right-[50px] top-1/2 w-[250px] -translate-y-1/2 lm-fade"
            style={{ animationDelay: "0.6s" }}
          >
            <div className="group relative rounded-2xl border border-border bg-card/90 p-5 shadow-sm backdrop-blur-sm transition-colors duration-300 hover:border-primary/40">
              <div className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-background text-sm font-bold text-primary">
                03
              </div>
              <PortDot className="left-0 top-1/2" />
              <div className="mb-2 flex items-center gap-3">
                <IconRing icon={Send} grad="from-[hsl(var(--sunset-pink))] to-[hsl(var(--sunset-orange))]" />
                <h3 className="font-bold text-foreground">{c.step3.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{c.step3.sub}</p>
            </div>
          </div>
        </div>

        {/* Mobile fallback: simple stacked list */}
        <ol className="mx-auto max-w-md space-y-3 lg:hidden">
          <FlowRow n="01" icon={Upload} grad="from-[hsl(var(--sunset-violet))] to-[hsl(var(--sunset-pink))]" item={c.step1} />
          <li className="flex items-center gap-2 pl-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {c.layer}
          </li>
          {c.features.map((f, i) => (
            <FlowRow key={f.title} icon={FEATURE_ICONS[i]} grad={FEATURE_GRADS[i]} item={f} compact />
          ))}
          <FlowRow n="03" icon={Send} grad="from-[hsl(var(--sunset-pink))] to-[hsl(var(--sunset-orange))]" item={c.step3} />
        </ol>
      </div>
    </section>
  );
};

function FlowRow({
  n,
  icon,
  grad,
  item,
  compact,
}: {
  n?: string;
  icon: ComponentType<{ className?: string }>;
  grad: string;
  item: Item;
  compact?: boolean;
}) {
  return (
    <li className={`flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm ${compact ? "ml-4" : ""}`}>
      <IconRing icon={icon} grad={grad} size={compact ? "sm" : "md"} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-semibold text-foreground">
          {n && <span className="text-xs font-bold text-primary">{n}</span>}
          {item.title}
        </p>
        <p className="text-sm text-muted-foreground">{item.sub}</p>
      </div>
    </li>
  );
}

export default FeatureFlow;
