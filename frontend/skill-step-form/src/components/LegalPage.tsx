import { Fragment } from "react";
import { SEO } from "@/components/SEO";
import type { LegalDoc } from "@/lib/legalContent";

const EMAIL = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

/** Render text, turning any email address into a mailto link. */
function withEmailLinks(text: string) {
  return text.split(EMAIL).map((part, i) =>
    EMAIL.test(part) ? (
      <a key={i} href={`mailto:${part}`} className="text-primary hover:underline">
        {part}
      </a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

type LegalPageProps = {
  doc: LegalDoc;
  /** Meta description for search engines. */
  description: string;
};

export const LegalPage = ({ doc, description }: LegalPageProps) => {
  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${doc.title} - 123Resume`} description={description} />
      <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-24 max-w-4xl">
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-8">{doc.title}</h1>
        <div className="prose prose-slate max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm text-muted-foreground/80">{doc.lastUpdated}</p>
          {doc.intro && <p className="leading-relaxed">{withEmailLinks(doc.intro)}</p>}

          {doc.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-2xl font-semibold text-foreground mb-4">{section.title}</h2>
              {section.blocks.map((block, i) =>
                "list" in block ? (
                  <Fragment key={i}>
                    {block.lead && <p className="leading-relaxed mb-3">{block.lead}</p>}
                    <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                      {block.list.map((item, j) => (
                        <li key={j}>{withEmailLinks(item)}</li>
                      ))}
                    </ul>
                  </Fragment>
                ) : (
                  <p key={i} className="leading-relaxed mb-3">
                    {withEmailLinks(block.p)}
                  </p>
                ),
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
