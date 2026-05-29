import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CVFormContainer } from "@/components/cv-form/CVFormContainer";
import { CreatePageContactFAB } from "@/components/CreatePageContactFAB";
import type { CVFormData } from "@/components/cv-form/types";
import { resumeAPI, type Resume } from "@/lib/api";
import { resumeToCvFormData } from "@/lib/resumeToCvFormData";
import { SEO } from "@/components/SEO";
import { RESUME_ACCENT_BLUE, RESUME_BODY_GRAY, RESUME_TITLE_GRAY } from "@/lib/resumeTemplatePalette";

const DEFAULT_SECTION_ORDER = [
  "summary",
  "workExperience",
  "education",
  "projects",
  "certificates",
  "skills",
  "languages",
  "interests",
];

const createEmptyCVFormData = (): CVFormData => ({
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
    interests: [{ interest: "" }],
  },
  workExperience: [
    {
      position: "",
      company: "",
      location: "",
      startDate: "",
      endDate: "",
      description: "",
      technologies: [],
      competencies: [],
    },
  ],
  education: [
    {
      degree: "",
      institution: "",
      location: "",
      startDate: "",
      endDate: "",
      field: "",
      keyCourses: [],
      descriptions: [],
    },
  ],
  projects: [],
  certificates: [],
  languages: [{ language: "", proficiency: "" }],
  skills: [{ skill: "" }],
  sectionOrder: DEFAULT_SECTION_ORDER,
  template: "modern",
  styling: {
    titleColor: RESUME_TITLE_GRAY,
    textColor: RESUME_BODY_GRAY,
    headingColor: RESUME_ACCENT_BLUE,
    linkColor: RESUME_ACCENT_BLUE,
    fontSize: "medium",
    fontFamily: "Inter",
    titleBold: true,
    headingBold: true,
  },
});

const mapResumeToCVFormData = (resume: Resume): CVFormData => {
  const base = createEmptyCVFormData();
  const mapped = resumeToCvFormData(resume);

  return {
    ...base,
    ...mapped,
    workExperience:
      mapped.workExperience && mapped.workExperience.length > 0
        ? mapped.workExperience
        : base.workExperience,
    education:
      mapped.education && mapped.education.length > 0
        ? mapped.education
        : base.education,
    projects:
      mapped.projects && mapped.projects.length > 0
        ? mapped.projects
        : base.projects,
    certificates:
      mapped.certificates && mapped.certificates.length > 0
        ? mapped.certificates
        : base.certificates,
    languages:
      mapped.languages && mapped.languages.length > 0
        ? mapped.languages
        : base.languages,
    skills:
      mapped.skills && mapped.skills.length > 0 ? mapped.skills : base.skills,
    sectionOrder:
      mapped.sectionOrder && mapped.sectionOrder.length > 0
        ? mapped.sectionOrder
        : base.sectionOrder,
    template: mapped.template || base.template,
    styling: mapped.styling || base.styling,
  };
};

const CreateResume = () => {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit") || undefined;
  const templateParam = searchParams.get("template") || undefined;

  const [initialData, setInitialData] = useState<CVFormData | undefined>(
    undefined,
  );
  const [isLoading, setIsLoading] = useState<boolean>(!!editId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) {
      // Creating a new resume - clear any stale pending resume data to ensure fresh template selection
      // Only restore pendingResume if explicitly needed (e.g., after signup flow)
      // For now, always start fresh to show the new template selection UI
      localStorage.removeItem('pendingResume');
      
      // If template param is provided, set initialData with that template
      if (templateParam) {
        const validTemplates = ['modern', 'classic', 'creative', 'minimal', 'latex', 'starRover'];
        const template = validTemplates.includes(templateParam) ? templateParam : 'modern';
        const dataWithTemplate = createEmptyCVFormData();
        dataWithTemplate.template = template as CVFormData['template'];
        setInitialData(dataWithTemplate);
      } else {
        setInitialData(undefined);
      }
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const resume = await resumeAPI.getById(editId);
        if (!isMounted) return;
        const mapped = mapResumeToCVFormData(resume);
        setInitialData(mapped);
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || "Failed to load resume data.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [editId, templateParam]);

  if (editId && isLoading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground text-sm">
            Loading your resume...
          </p>
        </div>
        <CreatePageContactFAB />
      </>
    );
  }

  if (editId && error) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <div className="max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="mb-2 text-lg font-semibold">Unable to load resume</h2>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <p className="text-xs text-muted-foreground">
              You can try again from the{" "}
              <a href="/resumes" className="underline">
                My Resumes
              </a>{" "}
              page.
            </p>
          </div>
        </div>
        <CreatePageContactFAB />
      </>
    );
  }

  return (
    <>
      <SEO
        title="Create Resume - 123Resume"
        description="Build your professional resume with our easy-to-use form. Multiple templates available."
        noindex={true}
      />
      <CVFormContainer initialData={initialData} editId={editId} />
      <CreatePageContactFAB />
    </>
  );
};

export default CreateResume;

