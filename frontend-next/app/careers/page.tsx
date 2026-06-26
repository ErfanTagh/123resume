import type { Metadata } from "next";
import { pageMetadata } from "../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Careers",
  description:
    "Join the 123Resume team. We're a small team building the future of resume creation — and always open to hearing from talented people.",
  path: "/careers",
});

export default function CareersPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
        Join our team
      </h1>
      <p className="mt-4 text-lg text-body">
        Help us build the future of resume creation.
      </p>

      <div className="mt-12 flex flex-col items-center">
        <div className="grid h-24 w-24 place-items-center rounded-full bg-brand-light">
          <svg
            className="h-12 w-12 text-brand"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </div>
        <h2 className="mt-6 text-2xl font-bold text-ink sm:text-3xl">
          No open positions yet!
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-body">
          We're a small team just getting started, but we're always open to hearing from
          talented people who share our passion for helping job seekers succeed. Check back
          soon, or feel free to reach out!
        </p>
        <a
          href="mailto:contact@123resume.de?subject=General Application"
          className="mt-8 inline-block rounded-lg bg-brand px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          Send us your resume
        </a>
      </div>
    </div>
  );
}
