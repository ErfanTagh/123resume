import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Resume & CV Templates",
  description:
    "Browse professional, ATS-friendly resume templates — modern, classic, minimal, creative, and EU-format CV designs. Pick one and customise it in minutes.",
  path: "/templates",
});

const TEMPLATES = [
  { key: "prism", name: "Prism", desc: "Geometric angular header with bold accent shapes.", badge: "New" },
  { key: "slateCopper", name: "Slate & Copper", desc: "Two-column editorial layout — slate sidebar, copper accents.", badge: "Recommended" },
  { key: "modern", name: "Modern", desc: "Clean & contemporary, ATS-friendly.", badge: "ATS" },
  { key: "classic", name: "Classic", desc: "Timeless single-column layout.", badge: "ATS" },
  { key: "starRover", name: "Star Rover", desc: "Modern professional with navy accents.", badge: "ATS" },
  { key: "minimal", name: "Minimal", desc: "Minimalist & elegant.", badge: "ATS" },
  { key: "creative", name: "Creative", desc: "Bold & eye-catching.", badge: "New" },
  { key: "latex", name: "LaTeX", desc: "Academic & technical, EU format.", badge: "EU format" },
];

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-20">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Professional templates for your dream job
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-body">
          ATS-friendly designs you can customise in minutes. Pick a look, fill in your
          details, and download a polished resume.
        </p>
      </div>

      <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => (
          <li
            key={t.key}
            className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="self-start rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
              {t.badge}
            </span>
            <h2 className="mt-3 text-xl font-bold text-ink">{t.name} Template</h2>
            <p className="mt-2 flex-1 text-sm text-body">{t.desc}</p>
            <Link
              href={`/create?template=${t.key}`}
              className="mt-4 inline-block rounded-lg border-2 border-border px-4 py-2 text-center text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
            >
              Use this template
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
