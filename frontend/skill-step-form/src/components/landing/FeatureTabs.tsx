import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FilePenLine, Globe, LayoutGrid, Star, Clock, Edit, Download, Eye, CheckCircle2, FileText, Copy } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { LandingTemplatePreview } from "@/pages/LandingTemplatePreview";
import { HostedProfileTemplate } from "@/components/hosted-profile/HostedProfileTemplate";
import type { PublicProfileSections } from "@/lib/publicProfileSections";
import type { CVFormData } from "@/components/cv-form/types";

type TabKey = "builder" | "portfolio" | "manage";

const TABS: { key: TabKey; icon: typeof FilePenLine; cta: string }[] = [
  { key: "builder", icon: FilePenLine, cta: "/create/start" },
  { key: "portfolio", icon: Globe, cta: "/create/start" },
  { key: "manage", icon: LayoutGrid, cta: "/login" },
];

/** Sample profile used for the live portfolio preview. */
const PORTFOLIO_SAMPLE: CVFormData = {
  template: "prism",
  personalInfo: {
    firstName: "Jenny",
    lastName: "Appleseed",
    professionalTitle: "Product Manager",
    email: "jenny@123resume.de",
    phone: "",
    location: "Berlin, Germany",
    linkedin: "linkedin.com/in/jennyappleseed",
    github: "github.com/jennyappleseed",
    website: "jenny.dev",
    profileImage: "/resume-sample-4-optimized.jpg",
    summary:
      "Product manager with 6+ years turning user insight into products people love. I thrive in collaborative, cross-functional teams at the intersection of business, design, and technology.",
    interests: [],
  },
  workExperience: [],
  education: [],
  projects: [
    { name: "TaskFlow", description: "Task management platform helping teams stay aligned and ship faster.", technologies: [{ technology: "Product Strategy" }], startDate: "2024", endDate: "", link: "" },
    { name: "Wellness Tracker", description: "Mobile app that helps users build healthy habits and track progress.", technologies: [{ technology: "User Research" }], startDate: "2023", endDate: "", link: "" },
    { name: "EcoCart", description: "Sustainable shopping experience with transparent impact tracking.", technologies: [{ technology: "Growth" }], startDate: "2023", endDate: "", link: "" },
  ],
  certificates: [
    { name: "Certified Scrum Product Owner", organization: "Scrum Alliance", issueDate: "2022-05", expirationDate: "", credentialId: "", url: "" },
  ],
  languages: [],
  skills: [
    { skill: "Product Strategy" }, { skill: "User Research" }, { skill: "Roadmapping" }, { skill: "Analytics" }, { skill: "Figma" },
  ],
  sectionOrder: ["summary", "projects", "certificates", "skills"],
};

/** About off → headshot stays prominent in the hero for the preview crop. */
const PORTFOLIO_VISIBILITY: PublicProfileSections = {
  photo: true,
  socials: true,
  about: false,
  projects: true,
  certificates: true,
  contact: true,
};

/** Scales a full-size live component down to fit a fixed-size frame. */
const ScaledViewport = ({ scale, children }: { scale: number; children: ReactNode }) => (
  <div className="absolute inset-0 overflow-hidden bg-white">
    <div
      className="origin-top-left"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        width: `${100 / scale}%`,
        height: `${100 / scale}%`,
      }}
    >
      {children}
    </div>
    {/* Soft fade at the bottom so the cropped preview ends cleanly */}
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
  </div>
);

/** Clean framed container around a live preview (no browser chrome). */
const BrowserFrame = ({ children }: { children: ReactNode }) => (
  <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.35)]">
    {children}
  </div>
);

const FeatureBullets = ({ items }: { items: string[] }) => (
  <ul className="space-y-3">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <span className="text-sm sm:text-base text-muted-foreground">{item}</span>
      </li>
    ))}
  </ul>
);

/** Faithful mini-replica of a resume card from the "My Resumes" page. */
const ManageResumeCard = ({
  template,
  name,
  score,
  rating,
  date,
  breakdown,
}: {
  template: string;
  name: string;
  score: number;
  rating: string;
  date: string;
  breakdown: { completeness: number; clarity: number; formatting: number; impact: number };
}) => {
  const { t } = useLanguage();
  const scoreRows: [string, number][] = [
    [t("pages.resumes.scores.completeness") || "Completeness", breakdown.completeness],
    [t("pages.resumes.scores.clarity") || "Clarity", breakdown.clarity],
    [t("pages.resumes.scores.formatting") || "Formatting", breakdown.formatting],
    [t("pages.resumes.scores.impact") || "Impact", breakdown.impact],
  ];
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <FileText className="h-7 w-7 text-primary" />
        <Badge variant="secondary" className="capitalize">
          {template}
        </Badge>
      </div>

      <div>
        <h4 className="truncate text-sm font-semibold text-card-foreground">{name}</h4>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" /> {date}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <Star className="h-4 w-4 fill-current text-green-600" />
        <span className="text-xl font-bold text-green-600">{score}</span>
        <span className="text-xs text-muted-foreground">/10</span>
        <Badge variant="outline" className="ml-auto text-[10px]">
          {rating}
        </Badge>
      </div>

      <div className="space-y-1">
        {scoreRows.map(([label, value]) => (
          <div key={label} className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}/10</span>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 border-t border-border/60 pt-3">
        <Button variant="outline" size="sm" className="h-7 flex-1 px-0 text-[11px]" tabIndex={-1}>
          <Edit className="mr-1 h-3 w-3" />
          {t("pages.resumes.actions.edit") || "Edit"}
        </Button>
        <Button variant="outline" size="sm" className="h-7 flex-1 px-0 text-[11px]" tabIndex={-1}>
          <Download className="mr-1 h-3 w-3" />
          {t("pages.resumes.actions.pdf") || "PDF"}
        </Button>
        <Button variant="outline" size="sm" className="h-7 flex-1 px-0 text-[11px]" tabIndex={-1}>
          <Eye className="mr-1 h-3 w-3" />
          {t("pages.resumes.actions.view") || "View"}
        </Button>
      </div>

      <Button
        size="sm"
        className="h-8 rounded-full border-0 bg-blue-600 text-[11px] font-semibold text-white hover:bg-blue-700"
        tabIndex={-1}
      >
        <Copy className="mr-1.5 h-3 w-3" />
        {t("pages.resumes.duplicate") || "Duplicate"}
      </Button>
    </div>
  );
};

export const FeatureTabs = () => {
  const { t } = useLanguage();
  const [active, setActive] = useState<TabKey>("builder");

  const renderPreview = (key: TabKey) => {
    switch (key) {
      case "builder":
        return (
          <BrowserFrame>
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-white">
              <LandingTemplatePreview templateName="prism" previewScale={0.52} />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
            </div>
          </BrowserFrame>
        );
      case "portfolio":
        return (
          <BrowserFrame>
            <div className="relative aspect-[5/6] w-full sm:aspect-[4/3]">
              <ScaledViewport scale={0.34}>
                <HostedProfileTemplate data={PORTFOLIO_SAMPLE} theme="blue" visibility={PORTFOLIO_VISIBILITY} />
              </ScaledViewport>
            </div>
          </BrowserFrame>
        );
      case "manage":
        return (
          <BrowserFrame>
            <div className="bg-muted/20 p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <ManageResumeCard
                  template="Prism"
                  name="Product Manager CV"
                  score={8.7}
                  rating={t("pages.resumes.rating.good") || "Good"}
                  date="May 18"
                  breakdown={{ completeness: 9.0, clarity: 8.5, formatting: 9.2, impact: 8.1 }}
                />
                <ManageResumeCard
                  template="Modern"
                  name="Software Engineer"
                  score={8.5}
                  rating={t("pages.resumes.rating.good") || "Good"}
                  date="May 20"
                  breakdown={{ completeness: 8.8, clarity: 8.3, formatting: 8.6, impact: 8.4 }}
                />
              </div>
            </div>
          </BrowserFrame>
        );
    }
  };

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="container mx-auto max-w-6xl">
        <div className="mx-auto mb-8 max-w-3xl text-center sm:mb-12">
          <h2 className="mb-3 text-3xl font-bold leading-tight text-foreground sm:mb-4 sm:text-5xl">
            {t("landing.featureTabs.title")}
          </h2>
          <p className="text-base text-muted-foreground sm:text-lg">
            {t("landing.featureTabs.subtitle")}
          </p>
        </div>

        <Tabs value={active} onValueChange={(v) => setActive(v as TabKey)}>
          {/* Pill tab switcher */}
          <div className="mb-8 flex justify-center sm:mb-12">
            <TabsList className="h-auto flex-wrap gap-1 rounded-full bg-muted p-1.5">
              {TABS.map(({ key, icon: Icon }) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="gap-2 rounded-full px-4 py-2 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow"
                >
                  <Icon className="h-4 w-4" />
                  {t(`landing.featureTabs.${key}.tab`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {TABS.map(({ key, cta }) => (
            <TabsContent key={key} value={key} className="mt-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12">
                {/* Text side */}
                <div className="order-2 lg:order-1">
                  <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                    {t(`landing.featureTabs.${key}.eyebrow`)}
                  </span>
                  <h3 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                    {t(`landing.featureTabs.${key}.heading`)}
                  </h3>
                  <p className="mt-3 text-base text-muted-foreground">
                    {t(`landing.featureTabs.${key}.desc`)}
                  </p>
                  <div className="mt-6">
                    <FeatureBullets
                      items={[
                        t(`landing.featureTabs.${key}.point1`),
                        t(`landing.featureTabs.${key}.point2`),
                        t(`landing.featureTabs.${key}.point3`),
                      ]}
                    />
                  </div>
                  <Link to={cta} className="mt-8 inline-block">
                    <Button size="lg" className="rounded-xl px-7 font-semibold">
                      {t(`landing.featureTabs.${key}.cta`)}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                {/* Preview side */}
                <div className="order-1 lg:order-2">{renderPreview(key)}</div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
};
