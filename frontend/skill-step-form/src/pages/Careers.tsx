import { useRef, useState } from "react";
import { PenLine, Video, Megaphone, Sparkles, FileText, Users, Clock, Award, Send, Loader2, Coins } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { feedbackAPI } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Lang = "en" | "de";

const ROLE_ICONS = {
  blogger: PenLine,
  video: Video,
  social: Megaphone,
} as const;

type RoleKey = keyof typeof ROLE_ICONS | "other";

const CONTENT: Record<Lang, {
  title: string;
  subtitle: string;
  volunteerNote: string;
  rolesHeading: string;
  roles: { key: Exclude<RoleKey, "other">; title: string; desc: string; points: string[] }[];
  applyCta: string;
  perksHeading: string;
  perks: { icon: typeof FileText; title: string; desc: string }[];
  revenueShareBadge: string;
  revenueShareTitle: string;
  revenueShareDesc: string;
  formHeading: string;
  formSubtitle: string;
  roleLabel: string;
  rolePlaceholder: string;
  otherRole: string;
  nameLabel: string;
  emailLabel: string;
  linksLabel: string;
  linksPlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successDesc: string;
  errorTitle: string;
  errorDesc: string;
  validationDesc: string;
}> = {
  en: {
    title: "Join the 123Resume team — volunteer roles",
    subtitle: "We're looking for creative volunteers to help more people land their dream job. Help us grow, build a real portfolio, and grow with us.",
    volunteerNote: "These are unpaid volunteer roles — flexible, remote, and at your own pace.",
    rolesHeading: "Open volunteer roles",
    roles: [
      {
        key: "blogger",
        title: "Content Writer & Blogger",
        desc: "Write helpful, SEO-friendly articles for our blog — career tips, resume advice, and job-search guides that bring in new users.",
        points: [
          "Research and write blog posts on careers and resumes",
          "Help shape our content calendar",
          "Grow organic traffic and reach",
        ],
      },
      {
        key: "video",
        title: "Video Creator — YouTube & TikTok",
        desc: "Create short- and long-form video content that shows people how to build great resumes and grows our audience.",
        points: [
          "Produce TikTok / YouTube Shorts and longer videos",
          "Turn resume tips into engaging content",
          "Help us reach a wider audience",
        ],
      },
      {
        key: "social",
        title: "Social Media & Growth Marketer",
        desc: "Plan and publish content across social platforms, engage with our community, and help drive user growth.",
        points: [
          "Manage posting across LinkedIn, Instagram & more",
          "Engage with users and build community",
          "Test ideas to grow our user base",
        ],
      },
    ],
    applyCta: "Apply for this role",
    perksHeading: "What you get out of it",
    perks: [
      { icon: FileText, title: "Real resume experience", desc: "Verifiable work experience you can proudly put on your own resume or CV." },
      { icon: Award, title: "A public portfolio", desc: "Published articles and videos under your name to show future employers." },
      { icon: Users, title: "Grow with us", desc: "As 123Resume grows, active contributors get the chance to join the core team." },
      { icon: Clock, title: "Flexible & remote", desc: "Work from anywhere, at your own pace, around your schedule." },
    ],
    revenueShareBadge: "Get paid as we grow",
    revenueShareTitle: "Rewarded once we have paying users",
    revenueShareDesc: "We're launching Pro mode soon — a subscription-based plan designed to generate recurring, largely passive revenue. Once we start earning from paying users, volunteers who help bring users to the platform will be paid for their contribution. When 123Resume grows, you grow with it.",
    formHeading: "Apply now",
    formSubtitle: "Fill in your details and we'll get back to you. Your application goes straight to our team.",
    roleLabel: "Role you're applying for",
    rolePlaceholder: "Select a role",
    otherRole: "Other / not sure yet",
    nameLabel: "Full name",
    emailLabel: "Email",
    linksLabel: "Portfolio or social links (optional)",
    linksPlaceholder: "Links to your blog, YouTube, TikTok, LinkedIn, etc.",
    messageLabel: "A short message (optional)",
    messagePlaceholder: "Tell us a bit about yourself and why you'd like to help.",
    submit: "Send application",
    submitting: "Sending…",
    successTitle: "Application sent!",
    successDesc: "Thanks for applying — we'll be in touch soon.",
    errorTitle: "Something went wrong",
    errorDesc: "Your application couldn't be sent. Please try again later.",
    validationDesc: "Please enter your name and a valid email.",
  },
  de: {
    title: "Werde Teil des 123Resume-Teams — ehrenamtliche Rollen",
    subtitle: "Wir suchen kreative Freiwillige, die mehr Menschen zum Traumjob verhelfen. Hilf uns beim Wachsen, baue ein echtes Portfolio auf und wachse mit uns.",
    volunteerNote: "Dies sind unbezahlte, ehrenamtliche Rollen — flexibel, remote und in deinem eigenen Tempo.",
    rolesHeading: "Offene ehrenamtliche Rollen",
    roles: [
      {
        key: "blogger",
        title: "Content-Autor & Blogger",
        desc: "Schreibe hilfreiche, SEO-freundliche Artikel für unseren Blog — Karrieretipps, Lebenslauf-Ratgeber und Bewerbungs-Guides, die neue Nutzer bringen.",
        points: [
          "Blogartikel zu Karriere & Lebenslauf recherchieren und schreiben",
          "Unseren Content-Kalender mitgestalten",
          "Organische Reichweite und Traffic steigern",
        ],
      },
      {
        key: "video",
        title: "Video-Creator — YouTube & TikTok",
        desc: "Erstelle kurze und längere Videoinhalte, die zeigen, wie man starke Lebensläufe erstellt, und vergrößere unsere Reichweite.",
        points: [
          "TikToks / YouTube Shorts und längere Videos produzieren",
          "Lebenslauf-Tipps in ansprechende Inhalte verwandeln",
          "Uns helfen, ein größeres Publikum zu erreichen",
        ],
      },
      {
        key: "social",
        title: "Social-Media- & Growth-Marketer",
        desc: "Plane und veröffentliche Inhalte auf Social-Media-Plattformen, interagiere mit unserer Community und treibe das Nutzerwachstum voran.",
        points: [
          "Posting über LinkedIn, Instagram & mehr steuern",
          "Mit Nutzern interagieren und Community aufbauen",
          "Ideen testen, um unsere Nutzerbasis zu vergrößern",
        ],
      },
    ],
    applyCta: "Für diese Rolle bewerben",
    perksHeading: "Das bekommst du dafür",
    perks: [
      { icon: FileText, title: "Echte Berufserfahrung", desc: "Nachweisbare Erfahrung, die du stolz in deinen eigenen Lebenslauf schreiben kannst." },
      { icon: Award, title: "Ein öffentliches Portfolio", desc: "Veröffentlichte Artikel und Videos unter deinem Namen für künftige Arbeitgeber." },
      { icon: Users, title: "Wachse mit uns", desc: "Wenn 123Resume wächst, bekommen aktive Mitwirkende die Chance, Teil des Kernteams zu werden." },
      { icon: Clock, title: "Flexibel & remote", desc: "Arbeite von überall, in deinem Tempo, passend zu deinem Zeitplan." },
    ],
    revenueShareBadge: "Bezahlung beim Wachstum",
    revenueShareTitle: "Vergütung, sobald wir zahlende Nutzer haben",
    revenueShareDesc: "In Kürze starten wir den Pro-Modus — ein abo-basiertes Modell, das wiederkehrende, weitgehend passive Einnahmen generiert. Sobald wir mit zahlenden Nutzern Einnahmen erzielen, werden Freiwillige, die Nutzer auf die Plattform bringen, für ihren Beitrag vergütet. Wenn 123Resume wächst, wächst du mit.",
    formHeading: "Jetzt bewerben",
    formSubtitle: "Trage deine Daten ein und wir melden uns bei dir. Deine Bewerbung geht direkt an unser Team.",
    roleLabel: "Rolle, für die du dich bewirbst",
    rolePlaceholder: "Rolle auswählen",
    otherRole: "Andere / noch unsicher",
    nameLabel: "Vollständiger Name",
    emailLabel: "E-Mail",
    linksLabel: "Portfolio- oder Social-Links (optional)",
    linksPlaceholder: "Links zu deinem Blog, YouTube, TikTok, LinkedIn usw.",
    messageLabel: "Eine kurze Nachricht (optional)",
    messagePlaceholder: "Erzähl uns kurz von dir und warum du mithelfen möchtest.",
    submit: "Bewerbung senden",
    submitting: "Wird gesendet…",
    successTitle: "Bewerbung gesendet!",
    successDesc: "Danke für deine Bewerbung — wir melden uns bald.",
    errorTitle: "Etwas ist schiefgelaufen",
    errorDesc: "Deine Bewerbung konnte nicht gesendet werden. Bitte versuche es später erneut.",
    validationDesc: "Bitte gib deinen Namen und eine gültige E-Mail-Adresse ein.",
  },
};

const Careers = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const c = CONTENT[language === "de" ? "de" : "en"];
  const formRef = useRef<HTMLDivElement>(null);

  const [role, setRole] = useState<RoleKey | "">("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [links, setLinks] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const roleLabelFor = (key: RoleKey | ""): string => {
    if (key === "other" || key === "") return c.otherRole;
    return c.roles.find((r) => r.key === key)?.title ?? c.otherRole;
  };

  const applyForRole = (key: RoleKey) => {
    setRole(key);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !isValidEmail(email.trim())) {
      toast({ title: c.errorTitle, description: c.validationDesc, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const roleLabel = roleLabelFor(role);
      const composed = [
        `Role: ${roleLabel}`,
        links.trim() ? `Portfolio / links: ${links.trim()}` : null,
        "",
        message.trim() || "(no message provided)",
      ]
        .filter((l) => l !== null)
        .join("\n");

      await feedbackAPI.sendFeedback({
        name: name.trim(),
        email: email.trim(),
        message: composed,
        context: `Careers volunteer application — ${roleLabel}`,
      });

      toast({ title: c.successTitle, description: c.successDesc });
      setName("");
      setEmail("");
      setLinks("");
      setMessage("");
      setRole("");
    } catch (err: any) {
      toast({
        title: c.errorTitle,
        description: err?.message || c.errorDesc,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-24 max-w-5xl">
        {/* Hero */}
        <div className="text-center mb-14">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">{c.title}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{c.subtitle}</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            {c.volunteerNote}
          </p>
        </div>

        {/* Roles */}
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">{c.rolesHeading}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {c.roles.map((r) => {
            const Icon = ROLE_ICONS[r.key];
            return (
              <Card key={r.key} className="flex flex-col">
                <CardHeader>
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{r.title}</CardTitle>
                  <CardDescription>{r.desc}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex flex-col gap-4">
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {r.points.map((p, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Button type="button" variant="outline" className="w-full" onClick={() => applyForRole(r.key)}>
                    {c.applyCta}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Perks */}
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">{c.perksHeading}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16">
          {c.perks.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="flex gap-4 rounded-lg border border-border bg-card p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{p.title}</h3>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Revenue share highlight */}
        <div className="mb-16 rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Coins className="h-7 w-7 text-primary" />
            </div>
            <div>
              <span className="inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
                {c.revenueShareBadge}
              </span>
              <h3 className="mt-2 text-xl sm:text-2xl font-bold text-foreground">{c.revenueShareTitle}</h3>
              <p className="mt-1 text-muted-foreground">{c.revenueShareDesc}</p>
            </div>
          </div>
        </div>

        {/* Apply form */}
        <div ref={formRef} className="scroll-mt-8">
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">{c.formHeading}</CardTitle>
              <CardDescription>{c.formSubtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{c.roleLabel}</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as RoleKey)}>
                    <SelectTrigger>
                      <SelectValue placeholder={c.rolePlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {c.roles.map((r) => (
                        <SelectItem key={r.key} value={r.key}>
                          {r.title}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">{c.otherRole}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="careers-name">{c.nameLabel}</Label>
                    <Input id="careers-name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="careers-email">{c.emailLabel}</Label>
                    <Input id="careers-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="careers-links">{c.linksLabel}</Label>
                  <Input id="careers-links" value={links} onChange={(e) => setLinks(e.target.value)} placeholder={c.linksPlaceholder} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="careers-message">{c.messageLabel}</Label>
                  <Textarea id="careers-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={c.messagePlaceholder} rows={4} />
                </div>

                <Button type="submit" className="w-full gap-2" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? c.submitting : c.submit}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Careers;
