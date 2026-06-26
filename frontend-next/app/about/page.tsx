import type { Metadata } from "next";
import { pageMetadata } from "../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description:
    "123Resume helps job seekers build professional, ATS-friendly resumes quickly and for free. Learn about our mission and the team behind the builder.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
        About 123Resume
      </h1>
      <div className="mt-6 space-y-5 text-body">
        <p>
          123Resume is a free, easy-to-use CV and resume builder designed to help job
          seekers present their experience in the best possible light. We believe a great
          resume shouldn't require design skills or expensive software.
        </p>
        <p>
          Our templates are built to be ATS-friendly, so applicant tracking systems can
          read your details correctly while recruiters see a clean, professional document.
          You can edit everything live, choose your colour theme, and export a polished PDF
          in minutes.
        </p>
        <p>
          Whether you're applying for your first role or making a senior career move,
          123Resume gives you the tools to build a resume that gets noticed — in English or
          German, including EU-format CVs.
        </p>
      </div>
    </div>
  );
}
