import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { type Resume } from "@/lib/api";
import { normalizeExternalUrl } from "@/lib/contactLinkUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Printer, Download, AlertCircle, Info, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ACCENT_PRESETS,
  CARD_TEMPLATES,
  renderBusinessCard,
  type CardTemplateId,
} from "@/components/resumes/businessCardRender";

type BusinessCardPanelProps = {
  resumes: Resume[];
  isLoadingResumes: boolean;
};

type FieldKey = "email" | "phone" | "location" | "website" | "linkedin" | "github";

const resumeLabel = (r: Resume): string => {
  if (r.name?.trim()) return r.name.trim();
  const parts = [r.personalInfo?.firstName, r.personalInfo?.lastName].filter(Boolean);
  return parts.length ? parts.join(" ") : "Untitled Resume";
};

const sanitizeFilename = (v: string): string =>
  v.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "Business-Card";

const cleanUrl = (u: string): string =>
  u.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");

export function BusinessCardPanel({ resumes, isLoadingResumes }: BusinessCardPanelProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const svgRef = useRef<SVGSVGElement>(null);

  const [selectedId, setSelectedId] = useState<string>("");
  const [template, setTemplate] = useState<CardTemplateId>("classic");
  const [accent, setAccent] = useState<string>(ACCENT_PRESETS[0]);
  const [twitter, setTwitter] = useState<string>("");
  const [fields, setFields] = useState<Record<FieldKey, boolean>>({
    email: true,
    phone: true,
    location: true,
    website: false,
    linkedin: true,
    github: true,
  });

  const effectiveId = selectedId || (resumes[0]?.id ?? "");
  const selected = resumes.find((r) => r.id === effectiveId);
  const pi = selected?.personalInfo;

  useEffect(() => {
    if (resumes.length && !resumes.some((r) => r.id === selectedId)) {
      setSelectedId(resumes[0].id);
    }
  }, [resumes, selectedId]);

  // QR target: published portfolio, else website field, else portfolio URL.
  const origin = typeof window !== "undefined" ? window.location.origin : "https://123resume.de";
  const websiteUrl = pi?.website?.trim() ? normalizeExternalUrl(pi.website) : "";
  const qrUrl = selected?.publicProfileEnabled
    ? `${origin}/p/${selected.id}`
    : websiteUrl || (selected ? `${origin}/p/${selected.id}` : "");
  const noLiveTarget = !selected?.publicProfileEnabled && !websiteUrl;

  const qr = useMemo(() => {
    if (!qrUrl) return null;
    try {
      const q = QRCode.create(qrUrl, { errorCorrectionLevel: "M" });
      return { size: q.modules.size, get: (r: number, c: number) => !!q.modules.get(r, c) };
    } catch {
      return null;
    }
  }, [qrUrl]);

  const fullName = [pi?.firstName, pi?.lastName].filter(Boolean).join(" ").trim();
  const title = pi?.professionalTitle?.trim();

  // Which field toggles to show (only those with data)
  const availableFields: { key: FieldKey; label: string; value: string }[] = [
    { key: "email", label: t("pages.resumes.businessCard.fields.email") || "Email", value: pi?.email?.trim() || "" },
    { key: "phone", label: t("pages.resumes.businessCard.fields.phone") || "Phone", value: pi?.phone?.trim() || "" },
    { key: "location", label: t("pages.resumes.businessCard.fields.location") || "City / location", value: pi?.location?.trim() || "" },
    { key: "website", label: t("pages.resumes.businessCard.fields.website") || "Website", value: pi?.website?.trim() || "" },
    { key: "linkedin", label: "LinkedIn", value: pi?.linkedin?.trim() || "" },
    { key: "github", label: "GitHub", value: pi?.github?.trim() || "" },
  ].filter((f) => f.value);

  const contacts: string[] = [];
  if (fields.email && pi?.email?.trim()) contacts.push(pi.email.trim());
  if (fields.phone && pi?.phone?.trim()) contacts.push(pi.phone.trim());
  if (fields.location && pi?.location?.trim()) contacts.push(pi.location.trim());
  if (fields.website && pi?.website?.trim()) contacts.push(cleanUrl(pi.website));

  const socials: { kind: "linkedin" | "github" | "twitter"; text: string }[] = [];
  if (fields.linkedin && pi?.linkedin?.trim()) socials.push({ kind: "linkedin", text: cleanUrl(pi.linkedin) });
  if (fields.github && pi?.github?.trim()) socials.push({ kind: "github", text: cleanUrl(pi.github) });
  if (twitter.trim()) {
    const h = twitter.trim().replace(/^@/, "");
    socials.push({ kind: "twitter", text: `@${h}` });
  }

  const cardSvg = renderBusinessCard({
    template,
    accent,
    name: fullName,
    title,
    contacts,
    socials,
    qr,
    qrCaption: t("pages.resumes.businessCard.scanCaption") || "Scan to view portfolio",
    brand: "123resume.de",
  });

  const svgMarkup = () => (svgRef.current ? new XMLSerializer().serializeToString(svgRef.current) : "");

  const handlePrint = () => {
    if (!svgRef.current) return;
    const win = window.open("", "_blank", "width=920,height=560");
    if (!win) {
      toast({
        title: t("common.error") || "Error",
        description: t("pages.resumes.businessCard.popupBlocked") || "Allow pop-ups to print the card.",
        variant: "destructive",
      });
      return;
    }
    win.document.write(
      `<!DOCTYPE html><html><head><title>${sanitizeFilename(fullName || "Business Card")}</title>` +
        `<style>@page{size:3.5in 2in;margin:0}html,body{margin:0;padding:0}svg{width:3.5in;height:2in;display:block}</style>` +
        `</head><body>${svgMarkup()}</body></html>`,
    );
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const handleDownloadPng = () => {
    if (!svgRef.current) return;
    const svg64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgMarkup())));
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = 1050 * scale;
      canvas.height = 600 * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${sanitizeFilename(fullName || "Business-Card")}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast({
          title: t("pages.resumes.businessCard.downloaded") || "Card downloaded",
          description: `${sanitizeFilename(fullName || "Business-Card")}.png`,
        });
      }, "image/png");
    };
    img.src = svg64;
  };

  if (isLoadingResumes) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (resumes.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-10 text-center text-muted-foreground text-sm">
          {t("pages.resumes.businessCard.noResumes") || "Create a resume first to generate a business card."}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {t("pages.resumes.businessCard.title") || "Business card"}
          </CardTitle>
          <CardDescription>
            {t("pages.resumes.businessCard.subtitle") ||
              "Generate a print-ready business card with a QR code that opens your portfolio."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
            {/* Controls */}
            <div className="space-y-6 order-2 lg:order-1">
              <div className="space-y-2">
                <Label className="font-medium">{t("pages.resumes.businessCard.selectResume") || "Resume"}</Label>
                <Select value={effectiveId} onValueChange={setSelectedId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("pages.resumes.businessCard.selectPlaceholder") || "Choose a resume"} />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{resumeLabel(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fields */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">{t("pages.resumes.businessCard.showOnCard") || "Show on card"}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                  {availableFields.map((f) => (
                    <div key={f.key} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                      <Label htmlFor={`bc-${f.key}`} className="text-xs font-normal truncate">{f.label}</Label>
                      <Switch
                        id={`bc-${f.key}`}
                        checked={fields[f.key]}
                        onCheckedChange={(v) => setFields((s) => ({ ...s, [f.key]: v }))}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bc-twitter" className="text-xs font-normal text-muted-foreground">
                    {t("pages.resumes.businessCard.fields.twitter") || "Twitter / X handle"}
                  </Label>
                  <Input id="bc-twitter" placeholder="@username" value={twitter} onChange={(e) => setTwitter(e.target.value)} />
                </div>
              </div>

              {/* Template */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{t("pages.resumes.businessCard.templateLabel") || "Template"}</p>
                <div className="grid grid-cols-2 gap-2">
                  {CARD_TEMPLATES.map((tpl) => {
                    const active = template === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setTemplate(tpl.id)}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                          active ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted/50 text-foreground"
                        }`}
                      >
                        {t(`pages.resumes.businessCard.templates.${tpl.id}`) || tpl.label}
                        {active ? <Check className="h-4 w-4" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent color */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{t("pages.resumes.businessCard.accentLabel") || "Accent color"}</p>
                <div className="flex flex-wrap items-center gap-2.5">
                  {ACCENT_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={c}
                      onClick={() => setAccent(c)}
                      className={`h-8 w-8 rounded-full transition-shadow ${
                        accent.toLowerCase() === c.toLowerCase() ? "ring-2 ring-offset-2 ring-primary" : "ring-1 ring-border hover:ring-primary/40"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <label className="relative h-8 w-8 cursor-pointer rounded-full ring-1 ring-border overflow-hidden" title={t("pages.resumes.businessCard.customColor") || "Custom color"}>
                    <span className="absolute inset-0" style={{ background: "conic-gradient(red, orange, yellow, lime, cyan, blue, magenta, red)" }} />
                    <input
                      type="color"
                      value={accent}
                      onChange={(e) => setAccent(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {selected?.publicProfileEnabled
                  ? t("pages.resumes.businessCard.qrPortfolio") || "The QR code opens your published portfolio."
                  : websiteUrl
                    ? t("pages.resumes.businessCard.qrWebsite") || "No portfolio is published — the QR code opens your website link instead."
                    : t("pages.resumes.businessCard.qrFallback") || "Publish a portfolio or add a website so the QR code has somewhere to point."}
              </p>
            </div>

            {/* Preview + actions */}
            <div className="space-y-4 order-1 lg:order-2">
              <div className="rounded-xl border border-border bg-muted/30 p-4 sm:p-6">
                <div className="mx-auto w-full max-w-[520px] overflow-hidden rounded-lg shadow-lg">
                  <svg
                    ref={svgRef}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 1050 600"
                    className="block w-full h-auto"
                    role="img"
                    aria-label={t("pages.resumes.businessCard.title") || "Business card"}
                  >
                    {cardSvg}
                  </svg>
                </div>
              </div>

              {noLiveTarget && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {t("pages.resumes.businessCard.noTargetWarning") ||
                      "Tip: publish your portfolio in the Portfolio Website tab so the QR code links to a live page."}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" className="flex-1" onClick={handlePrint} disabled={!selected}>
                  <Printer className="mr-2 h-4 w-4" />
                  {t("pages.resumes.businessCard.print") || "Print card"}
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={handleDownloadPng} disabled={!selected}>
                  <Download className="mr-2 h-4 w-4" />
                  {t("pages.resumes.businessCard.downloadPng") || "Download PNG"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
