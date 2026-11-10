import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressIndicator } from "./ProgressIndicator";
import { LandingTemplatePreview } from "@/pages/LandingTemplatePreview";
import { PersonalInfoStep } from "./PersonalInfoStep";
import { ExperienceStep } from "./ExperienceStep";
import { EducationStep } from "./EducationStep";
import { SkillsStep } from "./SkillsStep";
import { ReviewStep } from "./ReviewStep";
import { useResumeAiReview } from "./useResumeAiReview";
import { ResumePreviewPane } from "./ResumePreviewPane";
import { ResumeCustomizeSidebar } from "./ResumeCustomizeSidebar";
import { SignupOverlay } from "./SignupOverlay";
import { SaveStatusBadge, type SaveStatus } from "./SaveStatusBadge";
import { cvFormSchema, CVFormData } from "./types";
import { ChevronLeft, ChevronRight, FileCheck, Beaker, CheckCircle2, ArrowRight, MessageSquare, Check, Lock } from "lucide-react";
import { RESUME_COLOR_THEMES, getActiveResumeThemeId } from "@/lib/resumeColorThemes";
import { toast } from "@/hooks/use-toast";
import { getTestProfile, getTestProfileNames } from "@/lib/testData";
import { fireworks } from "@/lib/celebrate";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getResumeScoreWithOptionalAI } from "@/lib/resumeScoreClient";
import { resumeTextChanges, type ResumeTextChange } from "@/lib/resumeTextChanges";
import { stableSerializeCvPayload } from "@/lib/stableSerializeCvPayload";
import { calculateResumeScore, type ResumeScore } from "@/lib/resumeScorer";
import { resumeProseLanguage } from "@/lib/resumeContentLanguage";
import { logResumeScore } from "@/lib/resumeScoreDebug";
import { summarizeResumePayloadForScore } from "@/lib/resumeScorePayloadSummary";
import { feedbackAPI } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TemplateShowcaseBadge } from "@/components/landing/TemplateShowcaseBadge";
import {
  LANDING_TEMPLATE_CATALOG,
  landingTemplateDescKey,
} from "@/lib/landingTemplateCatalog";
import { ensurePublicationsInSectionOrder } from "@/lib/defaultSectionOrder";
import {
  RESUME_ACCENT_DEFAULT,
  RESUME_BODY_GRAY,
  RESUME_TITLE_GRAY,
} from "@/lib/resumeTemplatePalette";

interface CVFormContainerProps {
  initialData?: CVFormData;
  editId?: string;
}

export const CVFormContainer = ({ initialData, editId }: CVFormContainerProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showSignupOverlay, setShowSignupOverlay] = useState(false);
  /** Latest server AI score after step navigation (Next / Previous / progress). Guests: undefined. */
  const [navResumeScore, setNavResumeScore] = useState<ResumeScore | undefined>(undefined);
  const [navResumeScoreLoading, setNavResumeScoreLoading] = useState(false);
  const navResumeScoreRef = useRef<ResumeScore | undefined>(undefined);
  const lastSuccessfulScorePayloadRef = useRef<string | null>(null);
  /** The last resume version the AI scored, kept (unlike the ref above) so the next
   *  re-score can tell the AI what changed since. Reset only when the resume changes. */
  const lastScoredRef = useRef<{ score: number; snapshot: string } | null>(null);
  const scoreRequestIdRef = useRef(0);
  /** Tracks language for AI score refetch (skip first run after mount / login). */
  const previousLanguageRef = useRef<"en" | "de" | null>(null);
  const [templateSelected, setTemplateSelected] = useState(!!initialData?.template);
  // Per-step draft autosave: the id of the resume we keep updating as the user
  // advances. Seeded from editId when editing an existing resume.
  const [, setDraftId] = useState<string | undefined>(editId);
  const draftIdRef = useRef<string | undefined>(editId);
  const creatingDraftRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  navResumeScoreRef.current = navResumeScore;

  useEffect(() => {
    if (!user) {
      lastSuccessfulScorePayloadRef.current = null;
      scoreRequestIdRef.current = 0;
      setNavResumeScore(undefined);
      setNavResumeScoreLoading(false);
    }
  }, [user]);

  useEffect(() => {
    lastSuccessfulScorePayloadRef.current = null;
    lastScoredRef.current = null;
    scoreRequestIdRef.current = 0;
    setNavResumeScore(undefined);
  }, [editId]);

  // Keep the autosave draft id aligned with the resume being edited.
  useEffect(() => {
    draftIdRef.current = editId;
    setDraftId(editId);
    setSaveStatus("idle");
  }, [editId]);

  // Ensure overlay is ALWAYS hidden when navigating between steps - only show when explicitly clicking "Complete CV"
  // Also scroll to top when step changes
  useEffect(() => {
    setShowSignupOverlay(false);
    // Scroll to top of the form container when step changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);


  // Push history state when entering the form (templateSelected becomes true)
  useEffect(() => {
    if (templateSelected && !editId && !initialData) {
      // Push a state when entering the form so we can intercept back button
      window.history.pushState({ formStep: currentStep, templateSelected: true }, '', window.location.pathname);
    }
  }, [templateSelected, editId, initialData, currentStep]);

  // Handle browser back button - intercept and go back to template selection
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If we're in the form (templateSelected is true) and on step 0, go back to template selection
      if (templateSelected && currentStep === 0 && !editId && !initialData) {
        // We can't prevent popstate, but we can update state and push a new state
        setTemplateSelected(false);
        // Push a new state to keep us on the same page and prevent further navigation
        setTimeout(() => {
          window.history.pushState({ templateSelected: false }, '', window.location.pathname);
        }, 0);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentStep, templateSelected, editId, initialData]);

  /** Section heading / accent — same blue as other templates (`linkColor` family). */
  const getTemplateDefaultHeadingColor = (_template: string): string => RESUME_ACCENT_DEFAULT;

  // Get template-specific default for personalInfo section heading color
  // This matches each template's original headingColor default
  const getTemplateDefaultPersonalInfoTitleColor = (template: string): string => {
    return getTemplateDefaultHeadingColor(template);
  };

  // Ensure workExperience and education always have at least one entry
  const getDefaultValues = (): CVFormData => {
    // Get the template from initialData or default to "modern"
    const template = initialData?.template || "modern";
    const templateDefaultHeadingColor = getTemplateDefaultHeadingColor(template);
    const templateDefaultPersonalInfoTitleColor = getTemplateDefaultPersonalInfoTitleColor(template);

    // Default styling values that match template defaults
    // Use template-specific headingColor instead of always blue
    const defaultStyling = {
      titleColor: RESUME_TITLE_GRAY,
      textColor: RESUME_BODY_GRAY,
      headingColor: templateDefaultHeadingColor,
      linkColor: RESUME_ACCENT_DEFAULT,
      fontSize: "medium" as const,
      fontFamily: "Inter",
      titleBold: true,
      headingBold: true,
    };

    const defaults = {
      personalInfo: {
        firstName: "",
        lastName: "",
        professionalTitle: "",
        profileImage: "",
        email: "",
        phone: "",
        location: "",
        linkedin: "",
        github: "",
        website: "",
        summary: "",
        interests: [],
      },
      workExperience: [{
        position: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        description: "",
        responsibilities: [],
        technologies: [],
        competencies: [],
        link: "",
      }],
      education: [{
        degree: "",
        institution: "",
        location: "",
        startDate: "",
        endDate: "",
        field: "",
        keyCourses: [],
        descriptions: [],
        link: "",
      }],
      projects: [],
      certificates: [],
      publications: [],
      languages: [],
      skills: [],
      skillGroups: [{ name: "", skills: [{ skill: "" }] }],
      sectionOrder: ["summary", "workExperience", "education", "projects", "certificates", "publications", "skills", "languages", "interests"],
      template: "modern" as const,
      // IMPORTANT: do NOT pre-populate sectionStyling for personalInfo.
      // If we set personalInfo.titleSize/bodySize here, it will "lock" the summary
      // to that size and prevent the global fontSize from having any effect.
      // Instead, let templates fall back to global styling.fontSize unless the
      // user explicitly customizes per-section sizes.
      styling: {
        ...defaultStyling,
      },
    };

    if (!initialData) {
      return defaults;
    }

    // If initialData exists, use it but ensure workExperience and education have at least one entry
    // Also ensure all array fields are properly initialized to prevent crashes
    // Merge styling to ensure defaults are set if not present
    const dataTemplate = initialData.template || "modern";
    const dataTemplateDefaultHeadingColor = getTemplateDefaultHeadingColor(dataTemplate);

    // Use template-specific headingColor for the data template
    const dataDefaultStyling = {
      ...defaultStyling,
      headingColor: dataTemplateDefaultHeadingColor, // Use template-specific default
    };

    return {
      ...initialData,
      workExperience: initialData.workExperience && initialData.workExperience.length > 0
        ? initialData.workExperience
        : defaults.workExperience,
      education: initialData.education && initialData.education.length > 0
        ? initialData.education.map(edu => ({
            ...edu,
            descriptions: edu.descriptions ?? [],
          }))
        : defaults.education,
      languages: Array.isArray(initialData.languages) ? initialData.languages : defaults.languages,
      skills: Array.isArray(initialData.skills) ? initialData.skills : defaults.skills,
      skillGroups: Array.isArray(initialData.skillGroups) && initialData.skillGroups.length > 0
        ? initialData.skillGroups
        : defaults.skillGroups,
      projects: Array.isArray(initialData.projects) ? initialData.projects : defaults.projects,
      certificates: Array.isArray(initialData.certificates) ? initialData.certificates : defaults.certificates,
      publications: Array.isArray(initialData.publications) ? initialData.publications : defaults.publications,
      sectionOrder: ensurePublicationsInSectionOrder(
        Array.isArray(initialData.sectionOrder) && initialData.sectionOrder.length > 0
          ? initialData.sectionOrder
          : defaults.sectionOrder,
      ),
      styling: {
        ...dataDefaultStyling,
        ...initialData.styling,
        // Ensure headingColor matches template if not explicitly set
        headingColor: initialData.styling?.headingColor || dataTemplateDefaultHeadingColor,
        // personalInfo (name + Professional Summary) intentionally follows the GLOBAL
        // colors/sizes (headingColor / textColor / fontSize). We must NOT inject a
        // personalInfo sectionStyling override here: doing so froze the summary color
        // to a stale snapshot of textColor, so later changes in the Settings tab were
        // ignored. Strip any saved personalInfo override on load so the global wins.
        sectionStyling: (() => {
          const ss = initialData.styling?.sectionStyling;
          if (!ss) return undefined;
          const { personalInfo: _omitPersonalInfo, ...rest } = ss;
          return Object.keys(rest).length > 0 ? rest : undefined;
        })(),
      },
    };
  };

  const defaultValues = getDefaultValues();

  const form = useForm<CVFormData>({
    resolver: zodResolver(cvFormSchema),
    defaultValues,
  });

  // Log after form initialization
  useEffect(() => {
    const initialStyling = form.getValues("styling");
    console.log('[CVFormContainer] Form initialized:', {
      template: defaultValues.template,
      titleColor: initialStyling?.titleColor,
      textColor: initialStyling?.textColor,
    });
  }, [form]);

  // When creating a new resume, prefill personal info from logged-in user
  useEffect(() => {
    if (editId || !user) return;

    form.reset((current) => ({
      ...current,
      personalInfo: {
        ...current.personalInfo,
        firstName: user.first_name || current.personalInfo.firstName,
        lastName: user.last_name || current.personalInfo.lastName,
        email: user.email || current.personalInfo.email,
      },
    }));
  }, [editId, user, form]);

  // Watch form data for live preview
  // Explicitly watch skills to ensure score updates when skills change
  const formData = form.watch();
  const skills = form.watch("skills"); // Explicitly watch skills array
  const currentTemplate = form.watch("template");

  // Force formData to update when skills change by creating a new reference
  const formDataWithSkills = useMemo(() => {
    return { ...formData, skills };
  }, [formData, skills]);

  /**
   * Claude resume score for the current form. Always runs the request when called (no snapshot skip):
   * skipping caused missed loads / no loading state when refs and serialize were slightly out of sync.
   * Call sites: Review step mount (useEffect), Score tab open / explicit request, Re-analyze.
   */
  const fetchAiResumeScoreIfDirty = useCallback((_opts?: { force?: boolean }) => {
    logResumeScore("fetch:called", {
      force: !!_opts?.force,
      userHint: user?.email ?? "(guest)",
    });
    if (!user) {
      logResumeScore("fetch:abort-no-user", {});
      setNavResumeScore(undefined);
      setNavResumeScoreLoading(false);
      lastSuccessfulScorePayloadRef.current = null;
      scoreRequestIdRef.current = 0;
      return;
    }

    let snapshot: string;
    try {
      snapshot = stableSerializeCvPayload(form.getValues());
    } catch (e) {
      snapshot = "";
      logResumeScore("fetch:snapshot-error", {
        err: e instanceof Error ? e.message : String(e),
      });
    }

    const payloadSummary = summarizeResumePayloadForScore(form.getValues());
    logResumeScore("fetch:start-request", {
      snapshotLen: snapshot.length,
      lastSuccessLen: lastSuccessfulScorePayloadRef.current?.length ?? 0,
      hadNavScore: navResumeScoreRef.current !== undefined,
      scoreRequestIdBefore: scoreRequestIdRef.current,
      payloadSummary,
    });

    setNavResumeScoreLoading(true);

    const requestId = ++scoreRequestIdRef.current;
    logResumeScore("fetch:loading-true", { requestId });
    let previous: { score: number; changes: ResumeTextChange[] } | undefined;
    const lastScored = lastScoredRef.current;
    if (lastScored) {
      try {
        previous = {
          score: lastScored.score,
          changes: resumeTextChanges(JSON.parse(lastScored.snapshot), form.getValues()),
        };
      } catch {
        previous = undefined;
      }
    }

    void getResumeScoreWithOptionalAI(form.getValues(), true, {
      // When the server has no API key (503) or the AI errors (502), still show the local heuristic
      // so logged-in users see a score instead of a blank card + error toast.
      fallbackToLocal: true,
      outputLanguage: resumeProseLanguage(form.getValues(), language),
      previous,
    })
      .then((score) => {
        if (requestId !== scoreRequestIdRef.current) {
          logResumeScore("fetch:then-superseded", {
            requestId,
            currentId: scoreRequestIdRef.current,
          });
          return;
        }
        let nowSnap: string;
        try {
          nowSnap = stableSerializeCvPayload(form.getValues());
        } catch {
          setNavResumeScore(score);
          lastSuccessfulScorePayloadRef.current = null;
          logResumeScore("fetch:then-apply-with-nowSnap-error", { requestId });
          return;
        }
        if (nowSnap !== snapshot) {
          // CV changed while the request was in flight — do not apply stale AI output.
          lastSuccessfulScorePayloadRef.current = null;
          let snapshotSummary: Record<string, unknown> | undefined;
          try {
            snapshotSummary = summarizeResumePayloadForScore(
              JSON.parse(snapshot) as CVFormData,
            );
          } catch {
            snapshotSummary = { parseError: true };
          }
          logResumeScore("fetch:then-stale-discard", {
            requestId,
            snapshotLen: snapshot.length,
            nowSnapLen: nowSnap.length,
            snapshotSummary,
            nowSummary: summarizeResumePayloadForScore(form.getValues()),
          });
          return;
        }
        setNavResumeScore(score);
        lastSuccessfulScorePayloadRef.current = snapshot;
        if (score.fromAi && snapshot) {
          lastScoredRef.current = { score: score.overallScore, snapshot };
        }
        logResumeScore("fetch:then-success", {
          requestId,
          overall: score.overallScore,
          fromAi: score.fromAi === true,
          categoryCount: score.categories?.length ?? 0,
        });
      })
      .catch((err: unknown) => {
        if (requestId !== scoreRequestIdRef.current) {
          logResumeScore("fetch:catch-superseded", {
            requestId,
            currentId: scoreRequestIdRef.current,
          });
          return;
        }
        lastSuccessfulScorePayloadRef.current = null;
        setNavResumeScore(undefined);
        if (import.meta.env.DEV) {
          console.warn("[resume-score] AI request failed:", err);
        }
        logResumeScore("fetch:catch-clear-score", {
          requestId,
          err: err instanceof Error ? err.message : String(err),
        });
        toast({
          title: t("common.error") || "Error",
          description:
            t("resume.score.aiFailed") ||
            "Could not load AI score. Check your connection and try Re-analyze, or disable extensions that block API calls.",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (requestId !== scoreRequestIdRef.current) {
          logResumeScore("fetch:finally-superseded", {
            requestId,
            currentId: scoreRequestIdRef.current,
          });
          return;
        }
        setNavResumeScoreLoading(false);
        logResumeScore("fetch:finally-loading-false", { requestId });
      });
  }, [user, form, t, language]);

  useEffect(() => {
    if (!user) previousLanguageRef.current = null;
  }, [user]);

  // New UI language → invalidate cached AI text (refetch when still on Review).
  useEffect(() => {
    if (!user) return;
    const prev = previousLanguageRef.current;
    previousLanguageRef.current = language;
    if (prev === null || prev === language) return;
    logResumeScore("ui:language-changed-invalidate-score", { prev, language });
    lastSuccessfulScorePayloadRef.current = null;
    setNavResumeScore(undefined);
  }, [language, user]);
  useEffect(() => {
    if (initialData?.template) {
      setTemplateSelected(true);
    }
  }, [initialData?.template]);

  // When opening an existing resume, sync API data into the form once it is loaded.
  const initialDataSyncKey = editId && initialData ? editId : null;
  useEffect(() => {
    if (!initialDataSyncKey || !initialData) return;
    form.reset(getDefaultValues());
    logResumeScore("form:reset-from-initialData", {
      editId: initialDataSyncKey,
      payloadSummary: summarizeResumePayloadForScore(getDefaultValues()),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset once per loaded resume id, not every initialData reference
  }, [initialDataSyncKey, form]);

  // Reset styling to defaults when template changes
  // Use useLayoutEffect to ensure styling is set before browser paints
  // Use form.reset() instead of form.setValue() to notify all subscribers
  const prevTemplateRef = useRef<string | undefined>(currentTemplate);
  useLayoutEffect(() => {
    const prevTemplate = prevTemplateRef.current;

    // Only reset styling if template actually changed
    if (currentTemplate && currentTemplate !== prevTemplate) {
      prevTemplateRef.current = currentTemplate;

      // Get template-specific defaults
      const templateDefaultHeadingColor = getTemplateDefaultHeadingColor(currentTemplate);
      const templateDefaultPersonalInfoTitleColor = getTemplateDefaultPersonalInfoTitleColor(currentTemplate);

      // Default styling values that match template defaults
      // Use template-specific headingColor instead of always blue
      const defaultStyling = {
        titleColor: RESUME_TITLE_GRAY,
        textColor: RESUME_BODY_GRAY,
        headingColor: templateDefaultHeadingColor,
        linkColor: RESUME_ACCENT_DEFAULT,
        fontSize: "medium" as const,
        fontFamily: "Inter",
        titleBold: true,
        headingBold: true,
      };

      const currentValues = form.getValues();
      const currentSectionStyling = currentValues.styling?.sectionStyling || {};

      // Remove personalInfo section styling - it will fall back to template defaults
      const { personalInfo: _, ...restSectionStyling } = currentSectionStyling;

      // Only include personalInfo section styling if it exists and is different from template defaults
      // Otherwise, let it fall back to template defaults (headingColor for title, textColor for body)
      const existingPersonalInfo = currentSectionStyling.personalInfo;
      const personalInfoNeedsCustomStyling = existingPersonalInfo && (
        existingPersonalInfo.titleColor !== templateDefaultPersonalInfoTitleColor ||
        existingPersonalInfo.bodyColor !== defaultStyling.textColor ||
        existingPersonalInfo.titleSize !== defaultStyling.fontSize ||
        existingPersonalInfo.bodySize !== defaultStyling.fontSize
      );

      const newStyling = {
        ...defaultStyling,
        sectionStyling: personalInfoNeedsCustomStyling && existingPersonalInfo
          ? {
            ...restSectionStyling,
            personalInfo: existingPersonalInfo,
          }
          : (Object.keys(restSectionStyling).length > 0 ? restSectionStyling : undefined),
      };

      // Use reset with merge to notify all subscribers (including form.watch() subscribers)
      // This ensures SectionStylingControls sees the updated styling immediately
      form.reset({
        ...currentValues,
        styling: newStyling,
      }, { keepDefaultValues: true });

      console.log('[CVFormContainer] Styling reset:', {
        titleColor: newStyling.titleColor,
        textColor: newStyling.textColor,
        personalInfoTitleColor: templateDefaultPersonalInfoTitleColor,
        template: currentTemplate,
      });
    }
  }, [currentTemplate]); // Remove 'form' from deps - it's stable

  const steps = [
    { component: PersonalInfoStep, label: t('resume.steps.personal') },
    { component: ExperienceStep, label: t('resume.steps.experience') },
    { component: EducationStep, label: t('resume.steps.education') },
    { component: SkillsStep, label: t('resume.steps.skills') },
    { component: ReviewStep, label: t('resume.steps.review') },
  ];

  const reviewStepIndex = steps.length - 1;
  /** Review step: the form column closes and the preview becomes the page,
   *  with the automatic AI review (score + Claude suggestions) beside it. */
  const isReviewMode = currentStep === reviewStepIndex;

  /** Claude's review: runs automatically on the Review step — once the score is
   *  known, so the suggestions' points are calibrated to close the exact gap to
   *  10 — and is shown directly ON the resume preview as clickable marks. */
  const aiReview = useResumeAiReview(form, {
    enabled: isReviewMode && !!user && navResumeScore != null,
    currentScore: navResumeScore?.overallScore,
  });
  const { reset: resetAiReview } = aiReview;
  useEffect(() => {
    resetAiReview();
  }, [editId, resetAiReview]);

  // The shown score climbs live as suggestions are accepted: base AI score plus
  // the points accepted since that score was fetched (a fresh AI score already
  // reflects earlier accepts, so the boost restarts there). Accepting every
  // suggestion lands exactly on 10 — the backend calibrates points to the gap.
  const acceptedPointsRef = useRef(0);
  acceptedPointsRef.current = aiReview.acceptedPoints;
  const acceptedPointsAtScoreRef = useRef(0);
  useEffect(() => {
    acceptedPointsAtScoreRef.current = acceptedPointsRef.current;
  }, [navResumeScore]);
  const displayedScore = aiReview.allAccepted
    ? 10
    : navResumeScore != null
      ? Math.min(
          10,
          Math.round(
            (navResumeScore.overallScore +
              aiReview.acceptedPoints -
              acceptedPointsAtScoreRef.current) *
              10,
          ) / 10,
        )
      : undefined;

  // Every suggestion accepted → 10/10: one volley of green fireworks.
  const celebratedRef = useRef(false);
  useEffect(() => {
    if (!aiReview.allAccepted) {
      celebratedRef.current = false;
      return;
    }
    if (celebratedRef.current || !isReviewMode) return;
    celebratedRef.current = true;
    fireworks();
  }, [aiReview.allAccepted, isReviewMode]);

  // Claude score only on the Review step (not on every navigation or preview tab).
  useEffect(() => {
    if (!user || currentStep !== reviewStepIndex) return;
    // When editing, wait until resume is loaded into the form before scoring.
    if (editId && !initialData) return;
    fetchAiResumeScoreIfDirty({ force: true });
  }, [user, currentStep, language, reviewStepIndex, fetchAiResumeScoreIfDirty, editId, initialData]);

  const handleEditStep = (step: number) => {
    setCurrentStep(step);
  };

  const handleStepClick = async (stepIndex: number) => {
    // Allow going back to previous steps without validation
    if (stepIndex <= currentStep) {
      if (stepIndex !== currentStep) {
        setCurrentStep(stepIndex);
      }
      return;
    }

    // For future steps, validate required fields first (firstName, lastName, email)
    if (stepIndex > currentStep) {
      const isValid = await form.trigger("personalInfo");

      if (!isValid) {
        toast({
          title: t("resume.form.completeRequiredFieldsTitle") || "Complete required fields",
          description:
            t("resume.form.completeRequiredFieldsDesc") ||
            "Please enter your first name, last name, and a valid work email before continuing.",
          variant: "destructive",
        });
        return;
      }
    }

    const advancing = stepIndex > currentStep;
    setCurrentStep(stepIndex);
    // Completing the current step by jumping ahead also saves progress.
    if (advancing) {
      void persistDraft();
    }
  };

  // Test data loader (dev only)
  const handleLoadTestProfile = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const profileName = e.target.value;
    if (!profileName) return;

    const profile = getTestProfile(profileName);
    if (profile) {
      // Ensure all array fields are present to prevent crashes
      const normalizedProfile = {
        ...profile,
        languages: Array.isArray(profile.languages) ? profile.languages : [],
        skills: Array.isArray(profile.skills) ? profile.skills : [],
        projects: Array.isArray(profile.projects) ? profile.projects : [],
        certificates: Array.isArray(profile.certificates) ? profile.certificates : [],
        publications: Array.isArray(profile.publications) ? profile.publications : [],
      };
      form.reset(normalizedProfile);
      setCurrentStep(0);
      lastSuccessfulScorePayloadRef.current = null;
      lastScoredRef.current = null;
      scoreRequestIdRef.current = 0;
      setNavResumeScore(undefined);
      resetAiReview();
      toast({
        title: "Test Profile Loaded! 🧪",
        description: `Loaded "${profileName}" profile with test data.`,
      });
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  const handleNext = async () => {
    let isValid = false;

    if (currentStep === 0) {
      isValid = await form.trigger("personalInfo");
    } else {
      isValid = true;
    }

    if (isValid) {
      if (currentStep < steps.length - 1) {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        // Save the just-completed step's data in the background.
        void persistDraft();
      }
    } else if (currentStep === 0) {
      toast({
        title: t("resume.form.completeRequiredFieldsTitle") || "Complete required fields",
        description:
          t("resume.form.completeRequiredFieldsDesc") ||
          "Please enter your first name, last name, and a valid work email before continuing.",
        variant: "destructive",
      });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
    }
  };

  /**
   * Persist the resume "as it is" when a step is completed.
   * - Logged-in users: create the resume on the first save, then update the
   *   same draft on each subsequent step (no duplicate resumes).
   * - Guests: keep progress in localStorage so it survives a refresh.
   * Runs in the background; the SaveStatusBadge reflects progress.
   */
  const persistDraft = useCallback(async () => {
    if (!templateSelected) return;
    const data = form.getValues();
    setSaveStatus("saving");

    try {
      if (!user) {
        try {
          localStorage.setItem("pendingResume", JSON.stringify(data));
        } catch {
          /* ignore quota / serialization issues for the local draft */
        }
        setSaveStatus("saved");
        return;
      }

      const { resumeAPI } = await import("@/lib/api");

      if (draftIdRef.current) {
        await resumeAPI.update(draftIdRef.current, data as any);
      } else {
        // Avoid creating two resumes if steps are completed in quick succession.
        if (creatingDraftRef.current) return;
        creatingDraftRef.current = true;
        try {
          const created = await resumeAPI.create(data as any);
          draftIdRef.current = created.id;
          setDraftId(created.id);
        } finally {
          creatingDraftRef.current = false;
        }
      }

      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, [templateSelected, user, form]);

  const [isSaving, setIsSaving] = useState(false);

  // Feedback dialog state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  const handleSendFeedback = async () => {
    if (!feedbackEmail.trim() || !feedbackMessage.trim()) {
      toast({
        title: t('common.error') || "Error",
        description: t('resume.feedback.validation') || "Please provide your email and a short message.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSendingFeedback(true);
      const context = `Step: ${steps[currentStep]?.label || currentStep}, Template: ${form.watch("template")}`;
      await feedbackAPI.sendFeedback({
        name: feedbackName || undefined,
        email: feedbackEmail.trim(),
        message: feedbackMessage.trim(),
        context,
      });

      setIsFeedbackOpen(false);
      setFeedbackMessage("");

      toast({
        title: t('resume.feedback.thankYouTitle') || "Thank you for your feedback!",
        description: t('resume.feedback.thankYouDesc') || "We have received your message and will review it soon.",
      });
    } catch (error: any) {
      toast({
        title: t('common.error') || "Error",
        description: error?.message || t('resume.feedback.error') || "We could not send your feedback. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const onSubmit = async (data: CVFormData) => {
    setIsSaving(true);

    // Ensure overlay is hidden at start - only show after user clicks "Complete CV"
    setShowSignupOverlay(false);

    try {
      // Persist scores: reuse last AI score if it matches this submit payload; else local heuristic.
      let scoreResult: ResumeScore;
      let serializedSubmit = "";
      try {
        serializedSubmit = stableSerializeCvPayload(data);
      } catch {
        serializedSubmit = "";
      }
      if (
        user &&
        navResumeScore != null &&
        lastSuccessfulScorePayloadRef.current !== null &&
        serializedSubmit !== "" &&
        serializedSubmit === lastSuccessfulScorePayloadRef.current
      ) {
        scoreResult = navResumeScore;
      } else {
        scoreResult = calculateResumeScore(data, resumeProseLanguage(data, language));
      }

      // Map frontend score format to backend format
      // Frontend: categories with names, overallScore 0-100
      // Backend: completeness_score, clarity_score, formatting_score, impact_score, overall_score (all 0-10)
      const getCategoryScore = (name: string): number => {
        const category = scoreResult.categories.find(c => c.name === name);
        if (!category) return 0;
        return category.score; // Already in 0-maxScore format
      };

      const getCategoryMaxScore = (name: string): number => {
        const category = scoreResult.categories.find(c => c.name === name);
        if (!category) return 1; // Avoid division by zero
        return category.maxScore;
      };

      // Map categories to backend format (normalize each to 0-10 scale):
      // Completeness: Content Quality (3 max) + Education & Certifications (0.5 max) + Skills & Proficiency (1 max) = 4.5 max
      const contentQuality = getCategoryScore("Content Quality");
      const contentQualityMax = getCategoryMaxScore("Content Quality");
      const education = getCategoryScore("Education & Certifications");
      const educationMax = getCategoryMaxScore("Education & Certifications");
      const skills = getCategoryScore("Skills & Proficiency");
      const skillsMax = getCategoryMaxScore("Skills & Proficiency");

      // Normalize each to 0-10, then average (weighted by max scores)
      const totalCompletenessMax = contentQualityMax + educationMax + skillsMax;
      let completenessScore = totalCompletenessMax > 0
        ? Math.min(10, Math.round(((contentQuality + education + skills) / totalCompletenessMax) * 10 * 10) / 10)
        : 0;

      // Clarity: Professional Summary only (Structure & Format criterion removed)
      const summary = getCategoryScore("Professional Summary");
      const summaryMax = getCategoryMaxScore("Professional Summary");

      const totalClarityMax = summaryMax;
      const clarityScore = totalClarityMax > 0
        ? Math.min(10, Math.round((summary / totalClarityMax) * 10 * 10) / 10)
        : 0;

      // Formatting: ATS Optimization (0.5 max) -> normalize to 0-10
      const ats = getCategoryScore("ATS Optimization");
      const atsMax = getCategoryMaxScore("ATS Optimization");
      const formattingScore = atsMax > 0
        ? Math.min(10, Math.round((ats / atsMax) * 10 * 10) / 10)
        : 0;

      // Impact: Experience Section (2 max) -> normalize to 0-10
      const experience = getCategoryScore("Experience Section");
      const experienceMax = getCategoryMaxScore("Experience Section");
      const impactScore = experienceMax > 0
        ? Math.min(10, Math.round((experience / experienceMax) * 10 * 10) / 10)
        : 0;

      // Overall: Already in 0-10 format
      const overallScore = scoreResult.overallScore;

      // Add scores to resume data
      const resumeDataWithScores: CVFormData & {
        completenessScore: number;
        clarityScore: number;
        formattingScore: number;
        impactScore: number;
        overallScore: number;
      } = {
        ...data,
        completenessScore,
        clarityScore,
        formattingScore,
        impactScore,
        overallScore,
      };

      // Check if user is authenticated
      if (!user) {
        // User is not authenticated - save to localStorage and show signup overlay
        localStorage.setItem('pendingResume', JSON.stringify(resumeDataWithScores));
        setIsSaving(false);
        // Show full-page signup overlay with blurred resume ONLY when Complete CV is clicked
        setShowSignupOverlay(true);
        return;
      }

      const { resumeAPI } = await import('@/lib/api');

      // LOG: What styling data is being sent when Complete CV is clicked
      console.log('🔵 [FORM SUBMIT] Complete CV button clicked - Styling data being sent:', {
        globalFontSize: data.styling?.fontSize,
        globalFontFamily: data.styling?.fontFamily,
        sectionStyling: data.styling?.sectionStyling,
        personalInfoSectionStyling: data.styling?.sectionStyling?.personalInfo,
        fullStylingObject: JSON.parse(JSON.stringify(data.styling)), // Deep clone to avoid reference issues
      });

      // Reuse the autosaved draft (or the resume being edited) so completing the
      // CV updates the existing record instead of creating a duplicate.
      const existingId = editId ?? draftIdRef.current;

      if (existingId) {
        const updatedResume = await resumeAPI.update(existingId, resumeDataWithScores as any);
        draftIdRef.current = updatedResume.id;

        console.log('🔵 [FORM SUBMIT] Resume updated - Response:', {
          id: updatedResume.id,
          styling: (updatedResume as any).styling,
        });

        toast({
          title: editId ? "CV Updated Successfully!" : "CV Saved Successfully!",
          description: "Opening your resume in a new tab...",
        });

        setTimeout(() => {
          window.open(`/resume/${updatedResume.id}`, '_blank');
          navigate('/resumes');
        }, editId ? 800 : 1000);
      } else {
        const savedResume = await resumeAPI.create(resumeDataWithScores as any);
        draftIdRef.current = savedResume.id;

        console.log('🔵 [FORM SUBMIT] Resume created - Response:', {
          id: savedResume.id,
          styling: (savedResume as any).styling,
        });

        toast({
          title: "CV Saved Successfully!",
          description: "Opening your resume in a new tab...",
        });

        setTimeout(() => {
          window.open(`/resume/${savedResume.id}`, '_blank');
          navigate('/resumes');
        }, 1000);
      }
    } catch (error: any) {
      // Show detailed error message
      const errorMessage = error.message || error.toString() || "Failed to save your CV. Please try again.";

      toast({
        title: "Error Saving CV",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onError = (errors: any) => {
    toast({
      title: "Validation Error",
      description: "Please check all required fields and fix any errors.",
      variant: "destructive",
    });
  };

  return (
    <>
      {showSignupOverlay && (
        <SignupOverlay
          resumeData={form.getValues()}
          onClose={() => setShowSignupOverlay(false)}
        />
      )}
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background py-12 px-4 sm:px-6">
        <div className="max-w-full mx-6 sm:mx-8 lg:mx-12">
          {!templateSelected ? (
            // Template Selection Screen (before starting the form)
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  {t('resume.templateSelection.title')}
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {t('resume.templateSelection.subtitle')}
                </p>
                <p className="mt-4 text-center text-sm">
                  <Link
                    to="/create/start"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {t('resume.templateSelection.recommendationCta')}
                  </Link>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {LANDING_TEMPLATE_CATALOG.map((template) => {
                  const isSelected = form.watch("template") === template.key;
                  return (
                    <div
                      key={template.key}
                      className={`bg-card rounded-2xl border-2 transition-all duration-300 ease-out cursor-pointer hover:shadow-[0_8px_25px_-5px_hsl(var(--primary)/0.35)] flex flex-col h-full motion-reduce:transform-none ${isSelected
                        ? "border-primary shadow-2xl shadow-primary/25 ring-2 ring-primary/25 scale-[1.03] relative z-10"
                        : "border-border hover:border-primary/30 hover:-translate-y-1.5"
                        }`}
                      onClick={() => {
                        form.setValue("template", template.key);
                      }}
                      onDoubleClick={() => {
                        form.setValue("template", template.key);
                        setTemplateSelected(true);
                      }}
                    >
                      <div className="aspect-[3/4] bg-white rounded-t-2xl overflow-hidden border-b border-border shadow-inner relative max-h-[550px] sm:max-h-[650px] lg:max-h-[700px] flex-shrink-0">
                        <div className="absolute inset-0 w-full h-full">
                          <LandingTemplatePreview
                            templateName={template.key}
                            accent={isSelected ? formData.styling?.headingColor : undefined}
                          />
                        </div>

                        {/* Selected → the CTA rises into the middle of the preview.
                            Always mounted so the scrim and button can transition both
                            ways; pointer-events are dropped while hidden. */}
                        <div
                          className={`absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-300 ease-out ${
                            isSelected ? "opacity-100" : "opacity-0 pointer-events-none"
                          }`}
                          aria-hidden={!isSelected}
                        >
                          <Button
                            size="lg"
                            tabIndex={isSelected ? 0 : -1}
                            onClick={(e) => {
                              e.stopPropagation();
                              form.setValue("template", template.key);
                              setTemplateSelected(true);
                            }}
                            style={{ transitionDelay: isSelected ? "90ms" : "0ms" }}
                            className={`relative z-10 bg-primary hover:bg-primary/90 text-sm sm:text-base px-6 sm:px-7 py-5 sm:py-6 rounded-xl font-semibold shadow-2xl shadow-black/25 transition-all duration-300 ease-out hover:scale-105 motion-reduce:transition-none motion-reduce:transform-none ${
                              isSelected
                                ? "opacity-100 scale-100 translate-y-0"
                                : "opacity-0 scale-90 translate-y-3"
                            }`}
                          >
                            {t('resume.templateSelection.continue') || 'Continue with Template'}
                            <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                          </Button>
                        </div>
                      </div>
                      <div className="px-3 pt-4 pb-4 sm:px-4 sm:pt-5 sm:pb-5 flex flex-col gap-2 min-h-[6.5rem] sm:min-h-[7rem] flex-shrink-0">
                        {template.badges.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 flex-shrink-0">
                            {template.badges.map((badgeId) => (
                              <TemplateShowcaseBadge key={badgeId} badgeId={badgeId} />
                            ))}
                          </div>
                        )}
                        <h3 className="font-bold text-base sm:text-lg flex-shrink-0 leading-snug" style={{ color: 'hsl(215 25% 15%)' }}>
                          {t(`landing.${template.nameKey}`)} {t('landing.templateLabel')}
                        </h3>
                        <p className="text-xs sm:text-sm font-medium flex-shrink-0 line-clamp-2 leading-snug text-muted-foreground">
                          {t(`landing.${landingTemplateDescKey(template.nameKey)}`)}
                        </p>
                        {isSelected && (
                          <div className="flex flex-col gap-2 flex-shrink-0 mt-1 pt-3 border-t border-border/70">
                            <div className="flex items-center gap-2 text-primary text-sm font-semibold">
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                              <span>{t('common.selected') || 'Selected'}</span>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1.5">
                                {t('resume.settings.colorTheme') || 'Color theme'}
                              </p>
                              <div
                                className="flex flex-wrap gap-1.5"
                                role="radiogroup"
                                aria-label={t('resume.settings.colorTheme') || 'Color theme'}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {RESUME_COLOR_THEMES.map((theme) => {
                                  const active = getActiveResumeThemeId(formData.styling?.headingColor) === theme.id;
                                  return (
                                    <button
                                      key={theme.id}
                                      type="button"
                                      role="radio"
                                      aria-checked={active}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const cur = form.getValues('styling') || {};
                                        form.setValue('styling', {
                                          ...cur,
                                          headingColor: theme.accent,
                                          linkColor: theme.accent,
                                        });
                                      }}
                                      title={t(`resume.settings.colorThemes.${theme.labelKey}`) || theme.label}
                                      aria-label={t(`resume.settings.colorThemes.${theme.labelKey}`) || theme.label}
                                      className={`relative h-6 w-6 rounded-full shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                        active
                                          ? 'ring-2 ring-offset-1 ring-primary scale-110'
                                          : 'ring-1 ring-border hover:ring-primary/40 hover:scale-110'
                                      }`}
                                      style={{ background: theme.accent }}
                                    >
                                      {active && (
                                        <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow" strokeWidth={3.5} />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Continue lives on the selected card's preview, not below the grid */}
            </div>
          ) : (
            // Main Form Flow
            <>
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  {t('resume.form.title')}
                </h1>
                <p className="text-muted-foreground">
                  {t('resume.form.subtitle')}
                </p>
              </div>

              {/* Review step: a slim action bar on top (score, Claude's progress, nav) —
                  the suggestions themselves live ON the preview as clickable marks. */}
              {isReviewMode && (
                <Card className="relative mb-6 p-4 shadow-elevated animate-in fade-in slide-in-from-top-4 duration-500">
                  <ProgressIndicator
                    currentStep={currentStep}
                    totalSteps={steps.length}
                    stepLabels={steps.map((s) => s.label)}
                    onStepClick={handleStepClick}
                  />
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" onClick={handlePrevious}>
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Previous
                      </Button>
                      <SaveStatusBadge status={saveStatus} />
                    </div>

                    {/* Score and AI review controls live ON the preview. Guests see a
                        locked preview (below) prompting sign-in, so no button here. */}

                    <Button
                      type="button"
                      className="gap-2"
                      disabled={isSaving}
                      onClick={() => form.handleSubmit(onSubmit, onError)()}
                    >
                      {isSaving ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FileCheck className="h-4 w-4" />
                          Complete CV
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              )}

              {/* The form column animates closed (0fr) on the review step, leaving the preview full-width. */}
              <div
                className="grid grid-cols-1 gap-6 lg:[grid-template-columns:var(--editor-cols)] lg:[transition:grid-template-columns_700ms_cubic-bezier(0.4,0,0.2,1),gap_700ms_cubic-bezier(0.4,0,0.2,1)]"
                style={
                  {
                    "--editor-cols": isReviewMode
                      ? "minmax(0,1fr) 0fr"
                      : "minmax(0,5fr) minmax(0,7fr)",
                    ...(isReviewMode ? { gap: "0rem" } : null),
                  } as React.CSSProperties
                }
              >
                {/* Live preview — the whole page on the review step */}
                <div className={isReviewMode ? "min-w-0" : "hidden min-w-0 lg:block"}>
                  {isReviewMode && !user ? (
                    // Guests see the finished resume, but locked: a sign-in prompt
                    // over a blurred preview. The AI review (Claude) never runs for them.
                    <div className="relative overflow-hidden rounded-xl border border-border">
                      <div
                        aria-hidden
                        className="pointer-events-none max-h-[600px] select-none overflow-hidden opacity-80 blur-[3px]"
                      >
                        <ResumePreviewPane data={formDataWithSkills} form={form} />
                      </div>
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent to-background" />
                      <div className="absolute inset-0 flex items-center justify-center p-4">
                        <div className="w-full max-w-sm rounded-2xl border border-border bg-card/95 p-6 text-center shadow-xl backdrop-blur">
                          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Lock className="h-6 w-6" />
                          </div>
                          <h3 className="mb-1.5 text-lg font-semibold">{t("resume.locked.title")}</h3>
                          <p className="mb-4 text-sm text-muted-foreground">{t("resume.locked.subtitle")}</p>
                          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                            <Button type="button" className="sm:min-w-28" onClick={() => navigate("/login")}>
                              {t("navigation.login")}
                            </Button>
                            <Button type="button" variant="outline" className="sm:min-w-28" onClick={() => navigate("/signup")}>
                              {t("navigation.signup")}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                  <ResumePreviewPane
                    data={formDataWithSkills}
                    form={form}
                    review={
                      isReviewMode && user
                        ? {
                            changes: aiReview.changes ?? [],
                            onAction: (index, status) => aiReview.setStatus(index, status),
                            loading: aiReview.loading,
                            fetched: aiReview.changes !== null,
                            failed: aiReview.failed,
                            score: displayedScore,
                            scoreLoading: navResumeScoreLoading,
                            onReanalyzeScore: () => {
                              logResumeScore("ui:reanalyze-click", {});
                              fetchAiResumeScoreIfDirty({ force: true });
                            },
                            pendingCount: aiReview.pendingCount,
                            pendingPoints: aiReview.pendingPoints,
                            allAccepted: aiReview.allAccepted,
                            onAcceptAll: aiReview.acceptAll,
                            onRunAgain: aiReview.fetchImprovements,
                            onUndo: aiReview.canUndo ? aiReview.undoLast : undefined,
                          }
                        : undefined
                    }
                    onTranslated={user ? () => fetchAiResumeScoreIfDirty({ force: true }) : undefined}
                  />
                  )}
                </div>

                {/* Customize tools + form — right on desktop; collapses on review */}
                <div className="min-w-0 overflow-hidden">
                {!isReviewMode && (
                <div className="min-w-0">
                  <ResumeCustomizeSidebar
                    data={formDataWithSkills}
                    serverResumeScore={navResumeScore}
                    serverResumeScoreLoading={navResumeScoreLoading}
                    onRequestAiResumeScore={
                      user
                        ? (o) => {
                            logResumeScore("ui:customize-score-request", { opts: o ?? {} });
                            fetchAiResumeScoreIfDirty(o);
                          }
                        : undefined
                    }
                    onTemplateChange={(template) => form.setValue("template", template)}
                    onSectionOrderChange={(sectionOrder) => form.setValue("sectionOrder", sectionOrder)}
                    onStylingChange={(styling) => form.setValue("styling", styling)}
                    currentStep={currentStep}
                  />
                  <Card className="relative p-8 shadow-elevated">
                    <ProgressIndicator
                      currentStep={currentStep}
                      totalSteps={steps.length}
                      stepLabels={steps.map((s) => s.label)}
                      onStepClick={handleStepClick}
                    />

                    {/* Autosave status — its own right-aligned row below the step indicators. */}
                    <div className="-mt-4 mb-4 flex min-h-[1.75rem] items-center justify-end">
                      <SaveStatusBadge status={saveStatus} />
                    </div>

                    {/* Dev-only Test Data Loader */}
                    {import.meta.env.DEV && (
                      <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Beaker className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <label className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                            Development Mode: Test Data Loader
                          </label>
                        </div>
                        <select
                          onChange={handleLoadTestProfile}
                          className="w-full p-2 border border-amber-300 dark:border-amber-700 rounded-md text-sm bg-white dark:bg-amber-900 text-amber-900 dark:text-amber-100"
                          defaultValue=""
                        >
                          <option value="">Select a test profile...</option>
                          <option value="minimal">Minimal Data (Edge Case)</option>
                          <option value="maximal">Maximal Data (Stress Test)</option>
                          <option value="specialChars">Special Characters (José, 中文)</option>
                          <option value="longText">Long Text Overflow</option>
                          <option value="freshGraduate">Fresh Graduate</option>
                          <option value="seniorProfessional">Senior Professional (10+ years)</option>
                          <option value="withProfileImage">With Profile Image</option>
                          <option value="allOptionalEmpty">All Optional Fields Empty</option>
                          <option value="erfanTaghvaei">Erfan Taghvaei (Real Resume Data)</option>
                          <option value="frontendDeveloper">Frontend Developer (Sample Resume)</option>
                          <option value="marketingResume">Marketing Resume (PDF spacer test — from marketing_resume.json)</option>
                        </select>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                          💡 Instantly fill the form with test data to preview different resume layouts
                        </p>
                      </div>
                    )}

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        // Prevent any automatic form submission - only allow explicit button click
                      }}
                      onKeyDown={(e) => {
                        // Prevent form submission on Enter in inputs; allow newlines in textareas.
                        if (e.key === "Enter") {
                          const target = e.target;
                          if (target instanceof HTMLTextAreaElement) {
                            return;
                          }
                          e.preventDefault();
                        }
                      }}
                    >
                      {/* The Review step renders outside this card (isReviewMode above). */}
                      {currentStep === 0 ? (
                        <PersonalInfoStep form={form} />
                      ) : (
                        <CurrentStepComponent form={form} />
                      )}

                      <div className="flex items-center justify-between mt-8 pt-6 border-t gap-4">
                        <div className="flex items-center gap-2">
                          {currentStep > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handlePrevious}
                            >
                              <ChevronLeft className="mr-2 h-4 w-4" />
                              Previous
                            </Button>
                          )}
                          {currentStep === 0 && <div />}
                        </div>

                        <Button type="button" onClick={handleNext}>
                          Next
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </form>
                  </Card>
                </div>
                )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};