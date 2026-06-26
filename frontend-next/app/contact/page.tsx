import type { Metadata } from "next";
import { pageMetadata } from "../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Get in touch with the 123Resume team. Questions, feedback, or support — we're happy to help you build a better resume.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
        Contact us
      </h1>
      <p className="mt-4 text-lg text-body">
        Have a question or feedback? We'd love to hear from you.
      </p>
      <p className="mt-6 text-body">
        Email us at{" "}
        <a
          href="mailto:support@123resume.de"
          className="font-semibold text-brand hover:underline"
        >
          support@123resume.de
        </a>{" "}
        and we'll get back to you as soon as we can.
      </p>
    </div>
  );
}
