import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resumeAPI, aiAPI, Resume, ResumeData } from '@/lib/api';
import {
  translationLanguageNative,
  type TranslationLanguageCode,
} from '@/lib/translationLanguages';
import type { TranslationCategory } from '@/lib/translationCategories';
import { ResumeTranslateControls } from '@/components/cv-form/ResumeTranslateControls';
import { JobMatchingPanel } from '@/components/resumes/JobMatchingPanel';
import { JobTrackerPanel } from '@/components/resumes/JobTrackerPanel';
import { PortfolioWebsiteTab } from '@/components/resumes/PortfolioWebsiteTab';
import { BusinessCardPanel } from '@/components/resumes/BusinessCardPanel';
import { ResumesTabBar } from '@/components/resumes/ResumesTabBar';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
  X,
  Download,
  Pencil,
  MoreVertical,
  Check,
  Copy,
  Languages,
  Loader2,
} from 'lucide-react';
import { downloadResumePDF } from '@/lib/resumePdfUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Helper function to generate default resume name
const generateDefaultResumeName = (resume: Resume): string => {
  const parts: string[] = [];

  // Only add non-empty strings
  if (resume.personalInfo?.firstName?.trim()) {
    parts.push(resume.personalInfo.firstName.trim());
  }
  if (resume.personalInfo?.lastName?.trim()) {
    parts.push(resume.personalInfo.lastName.trim());
  }
  if (resume.personalInfo?.professionalTitle?.trim()) {
    parts.push(resume.personalInfo.professionalTitle.trim());
  }

  // Return joined parts or fallback
  return parts.length > 0 ? parts.join('-') : 'Untitled Resume';
};

const RESUMES_TABS = ['resumes', 'job-matching', 'job-tracker', 'portfolio', 'business-card'] as const;
type ResumesTab = (typeof RESUMES_TABS)[number];

/** Framed tints per action — full literal class strings so Tailwind keeps them. */
const ROW_ACTION_TONES = {
  primary: 'bg-primary/10 text-primary ring-primary/20 hover:bg-primary/20',
  sky: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 hover:bg-sky-500/20 dark:text-sky-400',
  violet: 'bg-violet-500/10 text-violet-600 ring-violet-500/20 hover:bg-violet-500/20 dark:text-violet-400',
  neutral: 'bg-muted text-muted-foreground ring-border hover:bg-muted/70 hover:text-foreground',
} as const;

const ROW_ACTION_FRAME =
  'flex h-8 w-8 flex-none items-center justify-center rounded-lg ring-1 ring-inset transition-colors sm:h-9 sm:w-9 disabled:pointer-events-none disabled:opacity-60';

/** One icon action on a resume row — tinted frame, label shown as a tooltip. */
const RowAction = ({
  label,
  onClick,
  disabled,
  tone,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone: keyof typeof ROW_ACTION_TONES;
  children: React.ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`${ROW_ACTION_FRAME} ${ROW_ACTION_TONES[tone]}`}
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

export default function Resumes() {
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: ResumesTab = RESUMES_TABS.includes(tabParam as ResumesTab)
    ? (tabParam as ResumesTab)
    : 'resumes';

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [editingResumeId, setEditingResumeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const renameFromMenuRef = useRef(false);
  const [translatingResumeId, setTranslatingResumeId] = useState<string | null>(null);
  const [translateDialogResume, setTranslateDialogResume] = useState<Resume | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const loadResumes = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      // Always fetch fresh data - no caching
      const data = await resumeAPI.getAll();
      // Ensure we have an array and set it
      if (Array.isArray(data)) {
        setResumes(data);
      } else {
        setResumes([]);
      }
    } catch (err: any) {
      setError(err.message || t('pages.resumes.errors.loadFailed') || 'Failed to load resumes');
      setResumes([]); // Clear resumes on error
    } finally {
      setIsLoading(false);
    }
  }, [t]); // Include t for translation

  useEffect(() => {
    if (!user) {
      // No user, don't load resumes
      setIsLoading(false);
      setResumes([]);
      return;
    }

    // Load resumes immediately when user is available
    // Always fetch fresh data, especially important for mobile browsers
    loadResumes();

    // Listen for resume saved event (from AuthContext after login)
    const handleResumeSaved = () => {
      loadResumes();
    };

    window.addEventListener('resumeSaved', handleResumeSaved);

    // Also listen for visibility change to refresh when user returns to tab
    // This helps ensure mobile browsers show fresh data
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Refresh data when tab becomes visible (helps with mobile browser caching)
        loadResumes();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('resumeSaved', handleResumeSaved);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, loadResumes]); // Reload when user changes (e.g., after login)

  const handleDelete = async (id: string) => {
    try {
      await resumeAPI.delete(id);
      setResumes(resumes.filter((r) => r.id !== id));
      toast({
        title: t('pages.resumes.toast.deleted.title') || 'Resume Deleted',
        description: t('pages.resumes.toast.deleted.description') || 'Your resume has been successfully deleted.',
      });
    } catch (err: any) {
      toast({
        title: t('pages.resumes.toast.error.title') || 'Error',
        description: err.message || t('pages.resumes.toast.error.deleteFailed') || 'Failed to delete resume',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) {
      return t('pages.resumes.date.noDate') || 'No date';
    }

    try {
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return t('pages.resumes.date.invalid') || 'Invalid date';
      }

      // Format as DD/MM/YYYY (e.g., 10/12/2026)
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear());
      return `${day}/${month}/${year}`;
    } catch (error) {
      return t('pages.resumes.date.invalid') || 'Invalid date';
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 9) return "text-green-600";
    if (rating >= 7) return "text-yellow-600";
    return "text-red-600";
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 9) return t('pages.resumes.rating.excellent') || "Excellent";
    if (rating >= 7) return t('pages.resumes.rating.good') || "Good";
    return t('pages.resumes.rating.needsWork') || "Needs Work";
  };

  const handleDownloadPDF = async (resume: Resume) => {
    setIsDownloading(true);
    try {
      // Fetch the full resume data
      const fullResume = await resumeAPI.getById(resume.id);
      await downloadResumePDF(fullResume);
      toast({
        title: t('pages.resumes.toast.downloaded.title') || 'PDF Downloaded',
        description: t('pages.resumes.toast.downloaded.description') || 'Your resume has been downloaded successfully.',
      });
    } catch (err: any) {
      toast({
        title: t('pages.resumes.toast.error.title') || 'Error',
        description: err.message || t('pages.resumes.toast.error.pdfFailed') || 'Failed to generate PDF',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle resume name update
  const handleNameUpdate = async (resumeId: string, newName: string) => {
    try {
      // Get the full resume data
      const fullResume = await resumeAPI.getById(resumeId);

      // Update only the name field
      const updateData: ResumeData = {
        name: newName.trim() || undefined, // Remove name if empty
        personalInfo: fullResume.personalInfo,
        workExperience: fullResume.workExperience,
        education: fullResume.education,
        projects: fullResume.projects,
        certificates: fullResume.certificates,
        publications: fullResume.publications,
        languages: fullResume.languages,
        skills: fullResume.skills,
        skillGroups: fullResume.skillGroups,
        template: fullResume.template,
        sectionOrder: fullResume.sectionOrder,
        completenessScore: fullResume.completenessScore,
        clarityScore: fullResume.clarityScore,
        formattingScore: fullResume.formattingScore,
        impactScore: fullResume.impactScore,
        overallScore: fullResume.overallScore,
      };

      // Update on backend - the response contains the updated resume
      const updatedResume = await resumeAPI.update(resumeId, updateData);

      // Update local state directly with the response - no need to fetch again!
      setResumes(prevResumes =>
        prevResumes.map(resume =>
          resume.id === resumeId
            ? { ...resume, name: updatedResume.name }
            : resume
        )
      );

      toast({
        title: t('pages.resumes.toast.updated.title') || 'Resume Updated',
        description: t('pages.resumes.toast.updated.description') || 'Resume name has been updated.',
      });

      setEditingResumeId(null);
      setEditingName('');
    } catch (err: any) {
      toast({
        title: t('pages.resumes.toast.error.title') || 'Error',
        description: err.message || t('pages.resumes.toast.error.updateFailed') || 'Failed to update resume name',
        variant: 'destructive',
      });
    }
  };

  // Start editing resume name
  const startEditing = (resume: Resume) => {
    const currentName = resume.name || generateDefaultResumeName(resume);
    setEditingResumeId(resume.id);
    setEditingName(currentName);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingResumeId(null);
    setEditingName('');
  };

  const handleDuplicate = async (resume: Resume) => {
    try {
      // Get the full resume data
      const fullResume = await resumeAPI.getById(resume.id);
      
      // Create a copy without the id and with a modified name
      const originalName = fullResume.name || generateDefaultResumeName(fullResume);
      const duplicateData: ResumeData = {
        name: `${originalName} (Copy)`,
        personalInfo: fullResume.personalInfo,
        workExperience: fullResume.workExperience,
        education: fullResume.education,
        projects: fullResume.projects,
        certificates: fullResume.certificates,
        publications: fullResume.publications,
        languages: fullResume.languages,
        skills: fullResume.skills,
        skillGroups: fullResume.skillGroups,
        template: fullResume.template,
        sectionOrder: fullResume.sectionOrder,
        styling: fullResume.styling,
        completenessScore: fullResume.completenessScore,
        clarityScore: fullResume.clarityScore,
        formattingScore: fullResume.formattingScore,
        impactScore: fullResume.impactScore,
        overallScore: fullResume.overallScore,
      };

      // Create the duplicate
      const duplicatedResume = await resumeAPI.create(duplicateData);
      
      // Reload resumes to show the new duplicate
      await loadResumes();
      
      toast({
        title: t('pages.resumes.toast.duplicated.title') || 'Resume Duplicated',
        description: t('pages.resumes.toast.duplicated.description') || 'Your resume has been duplicated successfully.',
      });
    } catch (err: any) {
      toast({
        title: t('pages.resumes.toast.error.title') || 'Error',
        description: err.message || t('pages.resumes.toast.error.duplicateFailed') || 'Failed to duplicate resume',
        variant: 'destructive',
      });
    }
  };

  const handleTranslate = async (
    resume: Resume,
    targetLang: TranslationLanguageCode,
    categories: TranslationCategory[],
  ) => {
    if (translatingResumeId) return; // one at a time
    setTranslatingResumeId(resume.id);
    try {
      // Get the full resume data, then translate the selected parts into targetLang.
      const fullResume = await resumeAPI.getById(resume.id);
      const { targetLanguage, resume: translated } = await aiAPI.translateResume(
        fullResume as unknown as Record<string, unknown>,
        { targetLanguage: targetLang, categories },
      );

      // Save as a NEW resume — the original is left untouched. Tag it with its
      // content language so templates render section headings in it (set here,
      // not only server-side, so it works regardless of backend state).
      const langLabel = translationLanguageNative(targetLanguage);
      const originalName = fullResume.name || generateDefaultResumeName(fullResume);
      const translatedData: ResumeData = {
        ...translated,
        name: `Translated (${langLabel}): ${originalName}`,
        styling: { ...(translated.styling || {}), resumeLanguage: targetLanguage },
      };

      await resumeAPI.create(translatedData);
      await loadResumes();
      setTranslateDialogResume(null);

      toast({
        title: t('pages.resumes.toast.translated.title') || 'Resume Translated',
        description: (
          t('pages.resumes.toast.translated.description') ||
          'A translated copy ({lang}) was created and added to your list.'
        ).replace('{lang}', langLabel),
      });
    } catch (err: any) {
      toast({
        title: t('pages.resumes.toast.error.title') || 'Error',
        description:
          err.message ||
          t('pages.resumes.toast.error.translateFailed') ||
          'Failed to translate resume',
        variant: 'destructive',
      });
    } finally {
      setTranslatingResumeId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2">{t('pages.resumes.title') || 'My Resumes'}</h1>
          <p className="text-sm sm:text-base text-muted-foreground/80">{t('pages.resumes.subtitle') || 'View and manage your created CVs'}</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(v) => setSearchParams({ tab: v })}
          className="space-y-6"
        >
          <ResumesTabBar
            tabs={[
              {
                id: 'resumes',
                label: t('pages.resumes.tabs.resumes') || 'My Resumes',
              },
              {
                id: 'job-matching',
                label: t('pages.resumes.tabs.jobMatching') || 'Job matching & cover letter',
              },
              {
                id: 'job-tracker',
                label: t('pages.resumes.tabs.jobTracker') || 'Job tracker',
              },
              {
                id: 'portfolio',
                label: t('pages.resumes.tabs.portfolio') || 'Portfolio Website',
              },
              {
                id: 'business-card',
                label: t('pages.resumes.tabs.businessCard') || 'Business card',
              },
            ]}
          />

          <TabsContent
            value="resumes"
            className="mt-0 focus-visible:outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
          >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
              <p className="text-muted-foreground text-sm sm:text-base">{t('pages.resumes.loading') || 'Loading resumes...'}</p>
            </div>
          </div>
        ) : resumes.length === 0 ? (
          <Card className="text-center py-8 sm:py-12">
            <CardContent>
              <FileText className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-primary/60 mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">{t('pages.resumes.empty.title') || 'No resumes yet'}</h3>
              <p className="text-sm sm:text-base text-muted-foreground/80 mb-4 px-4">
                {t('pages.resumes.empty.description') || 'Create your first CV to get started'}
              </p>
              <Button onClick={() => navigate('/create/start')} className="text-sm sm:text-base">
                <Plus className="mr-2 h-4 w-4" />
                {t('pages.resumes.empty.createButton') || 'Create Your First CV'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
          <div className="flex justify-end mb-4 sm:mb-6">
            <Button onClick={() => navigate('/create/start')} size="lg" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {t('pages.resumes.createNew') || 'Create New CV'}
            </Button>
          </div>
          <div className="flex flex-col gap-3 sm:gap-3.5">
            {resumes.map((resume) => {
              // Get quality scores from API (already converted to camelCase by API)
              // Backend returns scores in 0-10 format
              const completenessScore = Math.round((resume.completenessScore || 0) * 10) / 10;
              const clarityScore = Math.round((resume.clarityScore || 0) * 10) / 10;
              const formattingScore = Math.round((resume.formattingScore || 0) * 10) / 10;
              const impactScore = Math.round((resume.impactScore || 0) * 10) / 10;
              const overallScore = resume.overallScore || 0;

              // Use overall_score from backend if available, otherwise calculate average
              // Backend returns scores in 0-10 format
              const displayScore = overallScore > 0
                ? Math.round(overallScore * 10) / 10
                : Math.round(((completenessScore + clarityScore + formattingScore + impactScore) / 4) * 10) / 10;

              const template = resume.template || 'modern';
              // The row's own bottom edge is the scale — a real, measured score fills
              // it directly, no separate widget or legend needed.
              const scorePct = Math.max(0, Math.min(100, (displayScore / 10) * 100));
              const barColorClass =
                displayScore >= 9 ? 'bg-green-500' : displayScore >= 7 ? 'bg-yellow-500' : 'bg-red-500';
              const scoreBreakdownTitle = `${t('pages.resumes.scores.completeness') || 'Completeness'} ${completenessScore}/10 · ${t('pages.resumes.scores.clarity') || 'Clarity'} ${clarityScore}/10 · ${t('pages.resumes.scores.formatting') || 'Formatting'} ${formattingScore}/10 · ${t('pages.resumes.scores.impact') || 'Impact'} ${impactScore}/10`;
              const isEditingThis = editingResumeId === resume.id;

              return (
                <div
                  key={resume.id}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card p-3 pb-4 shadow-sm transition-shadow hover:shadow-md sm:gap-4 sm:p-4"
                >
                  {/* Cover — identifies the item, doesn't dominate it */}
                  <div className="hidden h-11 w-11 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex sm:h-12 sm:w-12">
                    <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>

                  {/* Identity — gets a width floor so it's the last thing to give up space */}
                  <div className="min-w-[130px] flex-1 sm:min-w-[200px]">
                    {isEditingThis ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleNameUpdate(resume.id, editingName);
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                          className="h-8 flex-1 py-1 text-sm font-semibold sm:text-base"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNameUpdate(resume.id, editingName);
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEditing();
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Link
                        to={`/resume/${resume.id}`}
                        className="block truncate text-sm font-semibold text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline sm:text-base"
                      >
                        {resume.name || generateDefaultResumeName(resume)}
                      </Link>
                    )}
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="capitalize">{template}</span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        {formatDate((resume as any).updatedAt || (resume as any).updated_at)}
                      </span>
                    </div>
                  </div>

                  {/* Score — the one comparable field, aligned in its own column across every row */}
                  <div
                    className="hidden w-16 flex-none flex-col items-end sm:flex sm:w-20"
                    title={scoreBreakdownTitle}
                  >
                    <span className={`text-lg font-bold tabular-nums sm:text-xl ${getRatingColor(displayScore)}`}>
                      {displayScore}
                      <span className="text-xs font-normal text-muted-foreground">/10</span>
                    </span>
                    <Badge variant="outline" className="mt-0.5 px-1.5 py-0 text-[10px] leading-4">
                      {getRatingBadge(displayScore)}
                    </Badge>
                  </div>

                  {/* Actions — icon buttons in tinted frames, labelled by tooltip. Rename
                      and Delete are rarer and riskier, so they sit behind the menu. */}
                  <div className="flex flex-none items-center gap-1 sm:gap-1.5">
                    <RowAction
                      tone="primary"
                      label={t('pages.resumes.actions.downloadPDF') || 'Download PDF'}
                      onClick={() => handleDownloadPDF(resume)}
                    >
                      <Download className="h-4 w-4" />
                    </RowAction>
                    <RowAction
                      tone="sky"
                      label={t('pages.resumes.duplicate') || 'Duplicate'}
                      onClick={() => handleDuplicate(resume)}
                    >
                      <Copy className="h-4 w-4" />
                    </RowAction>
                    <RowAction
                      tone="violet"
                      label={
                        translatingResumeId === resume.id
                          ? t('pages.resumes.actions.translating') || 'Translating…'
                          : t('pages.resumes.actions.translate') || 'Translate'
                      }
                      onClick={() => setTranslateDialogResume(resume)}
                      disabled={translatingResumeId === resume.id}
                    >
                      {translatingResumeId === resume.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Languages className="h-4 w-4" />
                      )}
                    </RowAction>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className={`${ROW_ACTION_FRAME} ${ROW_ACTION_TONES.neutral}`}
                          aria-label={t('pages.resumes.menu') || 'Resume options'}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                        onCloseAutoFocus={(e) => {
                          // The menu returns focus to its trigger on close, which would
                          // steal it from the rename input that has just mounted.
                          if (renameFromMenuRef.current) {
                            e.preventDefault();
                            renameFromMenuRef.current = false;
                          }
                        }}
                      >
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            renameFromMenuRef.current = true;
                            startEditing(resume);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>{t('pages.resumes.actions.rename') || 'Rename'}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(resume.id);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>{t('pages.resumes.delete') || 'Delete'}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Edge meter — real, measured overall score; the row is the scale */}
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-muted" aria-hidden="true">
                    <span className={`block h-full ${barColorClass}`} style={{ width: `${scorePct}%` }} />
                  </span>
                </div>
              );
            })}
          </div>
          </>
        )}
          </TabsContent>

          <TabsContent
            value="job-matching"
            className="mt-0 focus-visible:outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
          >
            <JobMatchingPanel resumes={resumes} isLoadingResumes={isLoading} />
          </TabsContent>

          <TabsContent
            value="job-tracker"
            className="mt-0 focus-visible:outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
          >
            <JobTrackerPanel resumes={resumes} />
          </TabsContent>

          <TabsContent
            value="portfolio"
            className="mt-0 focus-visible:outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
          >
            <PortfolioWebsiteTab
              resumes={resumes}
              isLoading={isLoading}
              onResumesChange={setResumes}
            />
          </TabsContent>

          <TabsContent
            value="business-card"
            className="mt-0 focus-visible:outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
          >
            <BusinessCardPanel resumes={resumes} isLoadingResumes={isLoading} />
          </TabsContent>
        </Tabs>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('pages.resumes.deleteDialog.title') || 'Delete Resume?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('pages.resumes.deleteDialog.description') || 'This action cannot be undone. This will permanently delete your resume.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('pages.resumes.deleteDialog.cancel') || 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && handleDelete(deleteId)}
                className="bg-destructive hover:bg-destructive/90"
              >
                {t('pages.resumes.deleteDialog.delete') || 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isDownloading} onOpenChange={() => { }}>
          <DialogContent className="sm:max-w-md [&>button]:hidden">
            <DialogHeader>
              <DialogTitle className="text-center">{t('pages.resumes.downloading.title') || 'Generating PDF'}</DialogTitle>
              <DialogDescription className="text-center">
                {t('pages.resumes.downloading.description') || 'Please wait while we generate your resume PDF...'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center py-6">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!translateDialogResume}
          onOpenChange={(open) => {
            // Don't let the user dismiss mid-translation.
            if (!open && !translatingResumeId) setTranslateDialogResume(null);
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('resume.translate.title') || 'Translate my resume'}</DialogTitle>
              <DialogDescription>
                {t('pages.resumes.translateDialog.description') ||
                  'Pick a language and choose what to translate. A new translated copy is added to your list — the original is kept.'}
              </DialogDescription>
            </DialogHeader>
            {translateDialogResume ? (
              <ResumeTranslateControls
                loading={translatingResumeId === translateDialogResume.id}
                defaultTarget={language === 'en' ? 'de' : 'en'}
                onTranslate={(target, categories) =>
                  handleTranslate(translateDialogResume, target, categories)
                }
              />
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

