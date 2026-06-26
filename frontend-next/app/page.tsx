import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, organizationJsonLd, faqJsonLd } from "./lib/seo";
import { APP_LINKS } from "./lib/site";
import { JsonLd } from "./components/JsonLd";

export const metadata: Metadata = pageMetadata({
  title: "Free CV & Resume Builder — Create an ATS-Friendly Resume Online",
  description:
    "Build a professional, ATS-friendly resume in minutes. Choose from polished templates, edit live, and download as PDF — free, no sign-up to start.",
  path: "/",
});

const FEATURES = [
  {
    title: "ATS-friendly templates",
    body: "Clean, recruiter-tested layouts that pass applicant tracking systems and still look great to humans.",
  },
  {
    title: "Live preview & PDF export",
    body: "See every change instantly and download a pixel-perfect PDF whenever you're ready.",
  },
  {
    title: "Guided step-by-step form",
    body: "We walk you through each section — personal info, experience, education, and skills — with helpful prompts.",
  },
  {
    title: "Pick your colour & style",
    body: "One-click colour themes and font controls let you match your resume to your industry and taste.",
  },
];

const STEPS = [
  { n: "1", title: "Choose a template", body: "Start from an ATS-ready design that fits your field." },
  { n: "2", title: "Fill in your details", body: "Our guided form makes it quick — no design skills needed." },
  { n: "3", title: "Download & apply", body: "Export a polished PDF and send it to your dream job." },
];

const FAQS = [
  {
    question: "Is 123Resume free to use?",
    answer:
      "Yes. You can build and preview your resume for free, and export a PDF. Premium templates and features may be offered separately.",
  },
  {
    question: "Are the resumes ATS-friendly?",
    answer:
      "All templates use clean, parseable structure so applicant tracking systems can read your experience, skills, and education correctly.",
  },
  {
    question: "Can I edit my resume later?",
    answer:
      "Yes. Create an account to save your resumes and come back to edit, restyle, or export them anytime.",
  },
  {
    question: "Can I build my CV in German?",
    answer:
      "Yes. 123Resume supports English and German, including EU-format CV layouts.",
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={faqJsonLd(FAQS)} />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32">
        {/* Decorative sunset blobs + grid (matches main app) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute left-1/4 top-10 h-72 w-72 rounded-full bg-[hsl(var(--sunset-violet)/0.18)] blur-[100px] sm:h-[500px] sm:w-[500px]" />
          <div className="absolute bottom-10 right-1/4 h-56 w-56 rounded-full bg-[hsl(var(--sunset-orange)/0.16)] blur-[80px] sm:h-96 sm:w-96" />
          <div className="absolute right-1/3 top-1/3 h-64 w-64 rounded-full bg-[hsl(var(--sunset-pink)/0.14)] blur-[90px] sm:h-[420px] sm:w-[420px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_40%,transparent_100%)]" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="space-y-8 text-center sm:space-y-10">
            <div className="inline-flex animate-fade-in items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary sm:px-5 sm:text-sm">
              ✨ AI-Powered Resume Builder →
            </div>

            <h1 className="animate-fade-in text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl md:text-7xl">
              <span className="block text-foreground">Build Your Dream</span>
              <span className="mt-1 block bg-gradient-to-r from-[hsl(var(--sunset-violet))] via-[hsl(var(--sunset-pink))] to-[hsl(var(--sunset-orange))] bg-clip-text text-transparent">
                Resume in Minutes
              </span>
            </h1>

            <p className="mx-auto max-w-3xl animate-fade-in px-4 text-lg leading-relaxed text-muted-foreground sm:text-xl md:text-2xl">
              Create professional, ATS-friendly resumes with AI-powered suggestions.{" "}
              <span className="font-medium text-foreground">
                Stand out and land your dream job.
              </span>
            </p>

            <div className="flex animate-fade-in flex-col items-center justify-center gap-4 pt-2 sm:flex-row sm:gap-5">
              <Link
                href={APP_LINKS.start}
                className="w-full rounded-2xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-dark sm:w-auto sm:px-10 sm:text-lg"
              >
                Start Building Free →
              </Link>
              <Link
                href={APP_LINKS.login}
                className="w-full rounded-2xl border-2 border-border px-8 py-4 text-base font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:bg-accent sm:w-auto sm:px-10 sm:text-lg"
              >
                Log In
              </Link>
            </div>

            <nav className="animate-fade-in border-t border-border/60 pt-8 sm:pt-10" aria-label="Explore 123Resume">
              <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium sm:gap-x-8 sm:text-base">
                {["templates", "pricing", "blog", "about", "contact"].map((slug) => (
                  <li key={slug}>
                    <Link
                      href={`/${slug}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {slug.charAt(0).toUpperCase() + slug.slice(1)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-24">
        <h2 className="text-center text-3xl font-bold text-ink sm:text-4xl">
          Everything you need to land the interview
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-body">
          A resume builder designed for real job seekers — fast, flexible, and free to start.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm text-body">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/40">
        <div className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-24">
          <h2 className="text-center text-3xl font-bold text-ink sm:text-4xl">
            How it works
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand text-lg font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm text-body">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <h2 className="text-center text-3xl font-bold text-ink sm:text-4xl">
          Frequently asked questions
        </h2>
        <dl className="mt-10 space-y-6">
          {FAQS.map((faq) => (
            <div key={faq.question} className="rounded-2xl border border-border p-6">
              <dt className="font-semibold text-ink">{faq.question}</dt>
              <dd className="mt-2 text-sm text-body">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Final CTA */}
      <section className="bg-brand">
        <div className="mx-auto max-w-content px-4 py-16 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to build your resume?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">
            Join thousands of job seekers creating standout, ATS-friendly resumes with 123Resume.
          </p>
          <Link
            href={APP_LINKS.start}
            className="mt-8 inline-block rounded-xl bg-card px-8 py-4 text-base font-semibold text-brand shadow-lg transition-transform hover:scale-105"
          >
            Get started for free
          </Link>
        </div>
      </section>
    </>
  );
}
