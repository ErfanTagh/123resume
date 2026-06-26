import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "../lib/seo";
import { APP_LINKS } from "../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "Start building your resume for free. See 123Resume pricing — free plan with PDF export, plus premium options for advanced templates and features.",
  path: "/pricing",
});

const PLANS = [
  {
    name: "Free",
    price: "€0",
    cadence: "forever",
    features: ["Guided resume builder", "ATS-friendly templates", "Live preview", "PDF export"],
    cta: "Start for free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "€",
    cadence: "see app for current pricing",
    features: ["Everything in Free", "Premium templates", "AI resume scoring & tailoring", "Cover letters & hosted profile"],
    cta: "Build my resume",
    highlight: true,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-20">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-body">
          Build and preview your resume for free. Upgrade only if you want premium
          templates and AI features.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl border p-8 ${
              plan.highlight ? "border-brand shadow-lg" : "border-border shadow-sm"
            }`}
          >
            <h2 className="text-lg font-semibold text-ink">{plan.name}</h2>
            <p className="mt-2">
              <span className="text-4xl font-extrabold text-ink">{plan.price}</span>{" "}
              <span className="text-sm text-body">{plan.cadence}</span>
            </p>
            <ul className="mt-6 space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-body">
                  <span className="mt-1 text-brand">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href={APP_LINKS.start}
              className={`mt-8 block rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors ${
                plan.highlight
                  ? "bg-brand text-white hover:bg-brand-dark"
                  : "border-2 border-border text-ink hover:border-brand hover:text-brand"
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
