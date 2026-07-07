import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Plus,
  Trash2,
  Eye,
  AlertCircle,
  Clock,
  Star,
  Edit,
  X,
  Download,
  Pencil,
  Check,
  MoreVertical,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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

              return (
                <Card key={resume.id} className="hover:shadow-lg transition-shadow relative group flex flex-col">
                  {/* Burger menu - top right corner */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-muted text-muted-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-muted/80 transition-all touch-manipulation"
                        title={t('pages.resumes.menu') || 'Resume options'}
                        aria-label={t('pages.resumes.menu') || 'Resume options'}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(resume.id);
                        }}
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>{t('pages.resumes.delete') || 'Delete'}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary mb-2 flex-shrink-0" />
                      <Badge variant="secondary" className="capitalize text-xs sm:text-sm">
                        {template}
                      </Badge>
                    </div>
                    <CardTitle className={`text-lg sm:text-xl break-words ${editingResumeId === resume.id ? 'pr-0' : 'pr-6'}`}>
                      {editingResumeId === resume.id ? (
                        <div className="flex items-center gap-1 -mx-4 px-4">
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
                            className="flex-1 text-lg sm:text-xl font-semibold h-auto py-1"
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
                        <div
                          className="flex items-center gap-2 group cursor-pointer hover:text-primary transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(resume);
                          }}
                          title={t('pages.resumes.editName') || 'Click to edit resume name'}
                        >
                          <span>{resume.name || generateDefaultResumeName(resume)}</span>
                          <Pencil className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </div>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      {formatDate((resume as any).updatedAt || (resume as any).updated_at)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Star className={`h-4 w-4 sm:h-5 sm:w-5 fill-current ${getRatingColor(displayScore)} flex-shrink-0`} />
                        <span className={`text-xl sm:text-2xl font-bold ${getRatingColor(displayScore)}`}>
                          {displayScore}
                        </span>
                        <span className="text-sm sm:text-base text-muted-foreground">/10</span>
                      </div>
                      <Badge variant="outline" className="text-xs sm:text-sm">{getRatingBadge(displayScore)}</Badge>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('pages.resumes.scores.completeness') || 'Completeness'}</span>
                        <span className="font-medium">{completenessScore}/10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('pages.resumes.scores.clarity') || 'Clarity'}</span>
                        <span className="font-medium">{clarityScore}/10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('pages.resumes.scores.formatting') || 'Formatting'}</span>
                        <span className="font-medium">{formattingScore}/10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('pages.resumes.scores.impact') || 'Impact'}</span>
                        <span className="font-medium">{impactScore}/10</span>
                      </div>
                    </div>

                    <div className="mt-auto space-y-3 border-t border-border/60 pt-3">
                      <div className="flex flex-row gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          size="sm"
                          onClick={() => navigate(`/create?edit=${resume.id}`)}
                          title={t('pages.resumes.actions.edit') || 'Edit resume'}
                        >
                          <Edit className="h-3 w-3 mr-1 sm:mr-1.5" />
                          <span className="text-xs sm:text-sm">{t('pages.resumes.actions.edit') || 'Edit'}</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          size="sm"
                          onClick={() => handleDownloadPDF(resume)}
                          title={t('pages.resumes.actions.downloadPDF') || 'Download PDF'}
                        >
                          <Download className="h-3 w-3 mr-1 sm:mr-1.5" />
                          <span className="text-xs sm:text-sm">{t('pages.resumes.actions.pdf') || 'PDF'}</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          size="sm"
                          onClick={() => navigate(`/resume/${resume.id}`)}
                        >
                          <Eye className="h-3 w-3 mr-1 sm:mr-1.5" />
                          <span className="text-xs sm:text-sm">{t('pages.resumes.actions.view') || 'View'}</span>
                        </Button>
                      </div>

                      <div className="flex w-full items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="h-9 rounded-full border-0 bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(resume);
                          }}
                          title={t('pages.resumes.duplicate') || 'Duplicate'}
                        >
                          <Copy className="mr-2 h-4 w-4 shrink-0 opacity-95" />
                          {t('pages.resumes.duplicate') || 'Duplicate'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-9 rounded-full px-6 text-sm font-semibold"
                          disabled={translatingResumeId === resume.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setTranslateDialogResume(resume);
                          }}
                          title={t('pages.resumes.actions.translate') || 'Translate'}
                        >
                          {translatingResumeId === resume.id ? (
                            <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
                          ) : (
                            <Languages className="mr-2 h-4 w-4 shrink-0 opacity-95" />
                          )}
                          {translatingResumeId === resume.id
                            ? t('pages.resumes.actions.translating') || 'Translating…'
                            : t('pages.resumes.actions.translate') || 'Translate'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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

