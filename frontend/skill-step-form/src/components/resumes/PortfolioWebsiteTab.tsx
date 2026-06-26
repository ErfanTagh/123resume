import { useEffect, useMemo, useState } from "react";
import { resumeAPI, type Resume } from "@/lib/api";
import {
  mergePublicProfileSections,
  PUBLIC_PROFILE_SECTION_KEYS,
  type PublicProfileSectionKey,
} from "@/lib/publicProfileSections";
import {
  HOSTED_PROFILE_THEME_COLORS,
  mergePublicProfileTheme,
  PUBLIC_PROFILE_THEME_IDS,
  type PublicProfileThemeId,
} from "@/lib/publicProfileTheme";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, Globe, Link2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

type PortfolioWebsiteTabProps = {
  resumes: Resume[];
  isLoading: boolean;
  onResumesChange: (updater: (prev: Resume[]) => Resume[]) => void;
};

const resumeLabel = (resume: Resume): string => {
  if (resume.name?.trim()) return resume.name.trim();
  const parts: string[] = [];
  if (resume.personalInfo?.firstName?.trim()) parts.push(resume.personalInfo.firstName.trim());
  if (resume.personalInfo?.lastName?.trim()) parts.push(resume.personalInfo.lastName.trim());
  return parts.length > 0 ? parts.join(" ") : "Untitled Resume";
};

export function PortfolioWebsiteTab({
  resumes,
  isLoading,
  onResumesChange,
}: PortfolioWebsiteTabProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const activeResume = useMemo(
    () => resumes.find((r) => r.publicProfileEnabled),
    [resumes],
  );

  useEffect(() => {
    if (resumes.length === 0) {
      setSelectedId("");
      return;
    }
    if (activeResume && (!selectedId || !resumes.some((r) => r.id === selectedId))) {
      setSelectedId(activeResume.id);
      return;
    }
    if (!selectedId && resumes[0]) {
      setSelectedId(resumes[0].id);
    }
  }, [resumes, activeResume, selectedId]);

  const selected = resumes.find((r) => r.id === selectedId);
  const publicProfileUrl = (id: string) => `${window.location.origin}/p/${id}`;

  const applyResumePatch = (id: string, patch: Partial<Resume>) => {
    onResumesChange((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const disableAllOthers = async (keepId: string) => {
    const others = resumes.filter((r) => r.publicProfileEnabled && r.id !== keepId);
    for (const r of others) {
      await resumeAPI.setPublicProfile(r.id, false);
    }
    if (others.length > 0) {
      onResumesChange((prev) =>
        prev.map((r) =>
          r.id !== keepId && r.publicProfileEnabled
            ? { ...r, publicProfileEnabled: false }
            : r,
        ),
      );
    }
  };

  const handlePublish = async (enabled: boolean) => {
    if (!selected) return;
    setBusy(true);
    try {
      if (enabled) {
        await disableAllOthers(selected.id);
      }
      const merged = mergePublicProfileSections(selected.publicProfileSections);
      const result = await resumeAPI.setPublicProfile(
        selected.id,
        enabled,
        enabled ? merged : undefined,
        enabled ? mergePublicProfileTheme(selected.publicProfileTheme) : undefined,
      );
      onResumesChange((prev) =>
        prev.map((r) => {
          if (r.id === selected.id) {
            return {
              ...r,
              publicProfileEnabled: result.publicProfileEnabled,
              publicProfileSections: mergePublicProfileSections(result.publicProfileSections),
              publicProfileTheme: mergePublicProfileTheme(result.publicProfileTheme),
            };
          }
          if (enabled) {
            return { ...r, publicProfileEnabled: false };
          }
          return r;
        }),
      );
      toast({
        title: enabled
          ? t("pages.resumes.publicProfile.toastOn") || "Portfolio published"
          : t("pages.resumes.publicProfile.toastOff") || "Portfolio disabled",
        description: enabled
          ? t("pages.resumes.portfolio.publishedDesc") || "Your portfolio link is ready to share."
          : t("pages.resumes.publicProfile.toastOffDesc") || "Your public URL no longer works.",
      });
    } catch (err: unknown) {
      toast({
        title: t("common.error") || "Error",
        description:
          err instanceof Error
            ? err.message
            : t("pages.resumes.publicProfile.toggleFailed") || "Could not update portfolio",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSectionChange = async (key: PublicProfileSectionKey, on: boolean) => {
    if (!selected?.publicProfileEnabled) return;
    const next = { ...mergePublicProfileSections(selected.publicProfileSections), [key]: on };
    setBusy(true);
    try {
      const result = await resumeAPI.setPublicProfile(
        selected.id,
        true,
        next,
        mergePublicProfileTheme(selected.publicProfileTheme),
      );
      applyResumePatch(selected.id, {
        publicProfileSections: mergePublicProfileSections(result.publicProfileSections),
        publicProfileTheme: mergePublicProfileTheme(result.publicProfileTheme),
      });
    } catch (err: unknown) {
      toast({
        title: t("common.error") || "Error",
        description: err instanceof Error ? err.message : t("pages.resumes.publicProfile.toggleFailed"),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleThemeChange = async (nextTheme: PublicProfileThemeId) => {
    if (!selected?.publicProfileEnabled) return;
    if (mergePublicProfileTheme(selected.publicProfileTheme) === nextTheme) return;
    setBusy(true);
    try {
      const result = await resumeAPI.setPublicProfile(
        selected.id,
        true,
        mergePublicProfileSections(selected.publicProfileSections),
        nextTheme,
      );
      applyResumePatch(selected.id, {
        publicProfileSections: mergePublicProfileSections(result.publicProfileSections),
        publicProfileTheme: mergePublicProfileTheme(result.publicProfileTheme),
      });
    } catch (err: unknown) {
      toast({
        title: t("common.error") || "Error",
        description: err instanceof Error ? err.message : t("pages.resumes.publicProfile.toggleFailed"),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (id: string) => {
    const url = publicProfileUrl(id);
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: t("pages.resumes.publicProfile.linkCopied") || "Link copied",
        description: url,
      });
    } catch {
      toast({
        title: t("common.error") || "Error",
        description: t("pages.resumes.publicProfile.copyFailed") || "Could not copy",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (resumes.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-10 text-center text-muted-foreground text-sm">
          {t("pages.resumes.portfolio.noResumes") || "Create a resume first to publish a portfolio website."}
        </CardContent>
      </Card>
    );
  }

  const isPublished = !!selected?.publicProfileEnabled;
  const publishedId = activeResume?.id;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {t("pages.resumes.portfolio.title") || "Portfolio website"}
          </CardTitle>
          <CardDescription>
            {t("pages.resumes.portfolio.subtitle") ||
              "Select a resume and publish your hosted portfolio link."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="font-medium">
              {t("pages.resumes.portfolio.selectResume") || "Resume for portfolio"}
            </Label>
            <Select value={selectedId} onValueChange={setSelectedId} disabled={busy}>
              <SelectTrigger>
                <SelectValue placeholder={t("pages.resumes.portfolio.selectPlaceholder") || "Choose a resume"} />
              </SelectTrigger>
              <SelectContent>
                {resumes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {resumeLabel(r)}
                    {r.publicProfileEnabled ? ` (${t("pages.resumes.portfolio.live") || "Live"})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {publishedId && publishedId !== selectedId && (
              <p className="text-xs text-amber-600 dark:text-amber-500 flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {t("pages.resumes.portfolio.switchWarning") ||
                  "Publishing this resume will turn off the portfolio for your other resume."}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  isPublished ? "bg-emerald-500" : "bg-muted-foreground/40"
                }`}
              />
              <div>
                <p className="font-semibold text-sm text-foreground">
                  {t("pages.resumes.portfolio.publishLabel") || "Publish portfolio"}
                </p>
                <p className="text-xs font-medium mt-0.5 text-muted-foreground">
                  {isPublished
                    ? t("pages.resumes.portfolio.statusOn") || "Your portfolio is live."
                    : t("pages.resumes.portfolio.statusOff") || "Portfolio is off for this resume."}
                </p>
              </div>
            </div>
            <Switch
              checked={isPublished}
              disabled={busy || !selected}
              onCheckedChange={handlePublish}
              aria-label={t("pages.resumes.portfolio.publishLabel") || "Publish portfolio"}
            />
          </div>

          {isPublished && selected && (
            <>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  {t("pages.resumes.portfolio.live") || "Live"}
                </div>
                <p className="text-sm break-all font-mono text-foreground">
                  {publicProfileUrl(selected.id)}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="button" className="flex-1" onClick={() => copyLink(selected.id)} disabled={busy}>
                    <Link2 className="h-3.5 w-3.5 mr-1.5" />
                    {t("pages.resumes.publicProfile.copyLink") || "Copy link"}
                  </Button>
                  <Button type="button" variant="outline" className="flex-1" asChild disabled={busy}>
                    <a href={publicProfileUrl(selected.id)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      {t("pages.resumes.publicProfile.open") || "Open"}
                    </a>
                  </Button>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-medium text-foreground">
                  {t("pages.resumes.publicProfile.sectionsTitle") || "Show on public page"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  {PUBLIC_PROFILE_SECTION_KEYS.map((sectionKey) => {
                    const sections = mergePublicProfileSections(selected.publicProfileSections);
                    const sectionLabel =
                      t(`pages.resumes.publicProfile.sections.${sectionKey}`) || sectionKey;
                    return (
                      <div key={sectionKey} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                        <Label htmlFor={`portfolio-${selected.id}-${sectionKey}`} className="text-xs font-normal">
                          {sectionLabel}
                        </Label>
                        <Switch
                          id={`portfolio-${selected.id}-${sectionKey}`}
                          checked={sections[sectionKey]}
                          disabled={busy}
                          onCheckedChange={(checked) => handleSectionChange(sectionKey, checked)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-medium text-foreground">
                  {t("pages.resumes.publicProfile.themeTitle") || "Color scheme"}
                </p>
                <div className="flex flex-wrap gap-2.5" role="radiogroup">
                  {PUBLIC_PROFILE_THEME_IDS.map((tid) => {
                    const active = mergePublicProfileTheme(selected.publicProfileTheme) === tid;
                    const c = HOSTED_PROFILE_THEME_COLORS[tid];
                    return (
                      <button
                        key={tid}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={busy}
                        onClick={() => handleThemeChange(tid)}
                        className={`h-9 w-9 rounded-full shrink-0 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          active ? "ring-2 ring-offset-2 ring-primary" : "ring-1 ring-border hover:ring-primary/40"
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${c.accent} 50%, ${c.secondary} 50%)`,
                        }}
                        title={t(`pages.resumes.publicProfile.themes.${tid}`) || tid}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
