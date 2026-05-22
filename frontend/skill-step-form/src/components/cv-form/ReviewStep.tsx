import { useMemo, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { CVFormData } from "./types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, MapPin, Linkedin, Github, Globe, Calendar, Edit } from "lucide-react";
import { SectionOrderManager } from "./SectionOrderManager";
import { CVRating } from "./CVRating";
import type { ResumeScore } from "@/lib/resumeScorer";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatProficiency } from "@/lib/languageProficiency";
import { hasWebLink, normalizeExternalUrl } from "@/lib/contactLinkUtils";
import { ProjectLinkedTitle } from "@/components/cv-form/ProjectLinkedTitle";
import { withResumeSectionsSortedForDisplay } from "@/lib/resumeDisplaySort";
import { logResumeScore } from "@/lib/resumeScoreDebug";

interface ReviewStepProps {
  form: UseFormReturn<CVFormData>;
  onEditStep: (step: number) => void;
  resumeScoreFromNav?: ResumeScore;
  resumeScoreLoadingFromNav?: boolean;
  /** Logged-in: force a new DeepSeek run (Re-analyze). */
  onReanalyzeAiScore?: () => void;
  reanalyzeAiScoreLoading?: boolean;
}

export const ReviewStep = ({
  form,
  onEditStep,
  resumeScoreFromNav,
  resumeScoreLoadingFromNav,
  onReanalyzeAiScore,
  reanalyzeAiScoreLoading,
}: ReviewStepProps) => {
  const { t } = useLanguage();
  const data = form.watch();
  const displayData = useMemo(() => withResumeSectionsSortedForDisplay(data), [data]);

  useEffect(() => {
    logResumeScore("ui:review-step-props", {
      hasScoreFromNav: resumeScoreFromNav != null,
      loadingFromNav: !!resumeScoreLoadingFromNav,
      hasReanalyzeHandler: typeof onReanalyzeAiScore === "function",
      reanalyzeLoading: !!reanalyzeAiScoreLoading,
    });
  }, [
    resumeScoreFromNav,
    resumeScoreLoadingFromNav,
    onReanalyzeAiScore,
    reanalyzeAiScoreLoading,
  ]);

  const handleSectionReorder = (newOrder: string[]) => {
    form.setValue("sectionOrder", newOrder);
  };

  const SectionHeader = ({ title, onEdit }: { title: string; onEdit: () => void }) => (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      <Button variant="outline" size="sm" onClick={onEdit}>
        <Edit className="h-4 w-4 mr-2" />
        Edit
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Review Your CV</h2>
        <p className="text-muted-foreground">
          {t("resume.steps.reviewStepLead")}
        </p>
      </div>

      {/* CV Score/Rating */}
      <CVRating
        onAnalyze={onReanalyzeAiScore}
        isAnalyzing={reanalyzeAiScoreLoading}
        rating={resumeScoreFromNav}
        ratingLoading={resumeScoreLoadingFromNav}
      />

      {/* Section Order Manager */}
      <SectionOrderManager
        sectionOrder={data.sectionOrder || ["summary", "workExperience", "education", "projects", "certificates", "skills", "languages", "interests"]}
        onReorder={handleSectionReorder}
      />

      <Card className="p-6 space-y-6">
        {/* Personal Information */}
        <div>
          <SectionHeader title="Personal Information" onEdit={() => onEditStep(0)} />
          <div className="space-y-3">
            <div>
              <p className="text-lg font-semibold text-foreground">
                {data.personalInfo.firstName} {data.personalInfo.lastName}
              </p>
              {data.personalInfo.professionalTitle && (
                <p className="text-sm text-muted-foreground">{data.personalInfo.professionalTitle}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {data.personalInfo.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{data.personalInfo.email}</span>
                </div>
              )}
              {data.personalInfo.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{data.personalInfo.phone}</span>
                </div>
              )}
              {data.personalInfo.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{data.personalInfo.location}</span>
                </div>
              )}
              {data.personalInfo.linkedin && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Linkedin className="h-4 w-4 flex-shrink-0" />
                  <a
                    href={normalizeExternalUrl(data.personalInfo.linkedin)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-primary underline"
                  >
                    {t('resume.contactLinkShort.linkedin')}
                  </a>
                </div>
              )}
              {data.personalInfo.github && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Github className="h-4 w-4 flex-shrink-0" />
                  <a
                    href={normalizeExternalUrl(data.personalInfo.github)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-primary underline"
                  >
                    {t('resume.contactLinkShort.github')}
                  </a>
                </div>
              )}
              {data.personalInfo.website && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4 flex-shrink-0" />
                  <a
                    href={normalizeExternalUrl(data.personalInfo.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-primary underline"
                  >
                    {t('resume.contactLinkShort.website')}
                  </a>
                </div>
              )}
            </div>

            {data.personalInfo.summary && (
              <div className="mt-3">
                <p className="text-sm font-medium text-foreground">Professional Summary</p>
                <p className="text-sm text-muted-foreground mt-1">{data.personalInfo.summary}</p>
              </div>
            )}

            {data.personalInfo.interests && data.personalInfo.interests.length > 0 && data.personalInfo.interests.some(i => i.interest) && (
              <div className="mt-3">
                <p className="text-sm font-medium text-foreground">Interests & Hobbies</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {data.personalInfo.interests.map(i => i.interest).filter(Boolean).join(", ")}
                </p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Work Experience */}
        {displayData.workExperience.some(exp => exp.position || exp.company) && (
          <>
            <div>
              <SectionHeader title="Work Experience" onEdit={() => onEditStep(1)} />
              <div className="space-y-4">
                {displayData.workExperience.map((exp, index) => (
                  (exp.position || exp.company) && (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-foreground">{exp.position || "Position"}</p>
                          <p className="text-sm text-muted-foreground">
                            <ProjectLinkedTitle
                              name={exp.company || "Company"}
                              link={exp.link}
                              className="text-primary underline"
                              inheritColor={false}
                            />
                          </p>
                          {exp.location && <p className="text-xs text-muted-foreground">{exp.location}</p>}
                        </div>
                        {(exp.startDate || exp.endDate) && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{exp.startDate} - {exp.endDate || "Present"}</span>
                          </div>
                        )}
                      </div>
                      {exp.description && (
                        <p className="text-sm text-muted-foreground">{exp.description}</p>
                      )}
                    </div>
                  )
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Education */}
        {displayData.education.some(edu => edu.degree || edu.institution) && (
          <>
            <div>
              <SectionHeader title="Education" onEdit={() => onEditStep(2)} />
              <div className="space-y-4">
                {displayData.education.map((edu, index) => (
                  (edu.degree || edu.institution) && (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-foreground">{edu.degree || "Degree"}</p>
                          <p className="text-sm text-muted-foreground">
                            <ProjectLinkedTitle
                              name={edu.institution || "Institution"}
                              link={edu.link}
                              className="text-primary underline"
                              inheritColor={false}
                            />
                          </p>
                          {edu.field && <p className="text-sm text-muted-foreground italic">{edu.field}</p>}
                          {edu.location && <p className="text-xs text-muted-foreground">{edu.location}</p>}
                        </div>
                        {(edu.startDate || edu.endDate) && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{edu.startDate} - {edu.endDate || "Present"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Projects */}
        {displayData.projects.some(proj => proj.name) && (
          <>
            <div>
              <SectionHeader title="Projects" onEdit={() => onEditStep(1)} />
              <div className="space-y-4">
                {displayData.projects.map((proj, index) => (
                  proj.name && (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-foreground">
                          <ProjectLinkedTitle
                            name={proj.name}
                            link={proj.link}
                            className="text-primary underline"
                            inheritColor={false}
                          />
                        </p>
                        {(proj.startDate || proj.endDate) && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{proj.startDate} - {proj.endDate || "Present"}</span>
                          </div>
                        )}
                      </div>
                      {proj.description && (
                        <p className="text-sm text-muted-foreground">{proj.description}</p>
                      )}
                      {proj.technologies && proj.technologies.length > 0 && proj.technologies.some(t => t.technology) && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Technologies:</span> {proj.technologies.map(t => t.technology).filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  )
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Certificates */}
        {displayData.certificates.some(cert => cert.name) && (
          <>
            <div>
              <SectionHeader title="Certificates" onEdit={() => onEditStep(2)} />
              <div className="space-y-3">
                {displayData.certificates.map((cert, index) => (
                  cert.name && (
                    <div key={index} className="space-y-1">
                      <p className="font-semibold text-foreground">
                        {hasWebLink(cert.url) ? (
                          <a
                            href={normalizeExternalUrl(cert.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline"
                          >
                            {cert.name}
                          </a>
                        ) : (
                          cert.name
                        )}
                      </p>
                      {cert.organization && (
                        <p className="text-sm text-muted-foreground">{cert.organization}</p>
                      )}
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {cert.issueDate && <span>Issued: {cert.issueDate}</span>}
                        {cert.expirationDate && <span>Expires: {cert.expirationDate}</span>}
                      </div>
                      {cert.credentialId && (
                        <p className="text-xs text-muted-foreground">ID: {cert.credentialId}</p>
                      )}
                    </div>
                  )
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Languages */}
        {data.languages.some(lang => lang.language) && (
          <>
            <div>
              <SectionHeader title="Languages" onEdit={() => onEditStep(3)} />
              <div className="flex flex-wrap gap-3 text-sm">
                {data.languages.map((lang, index) => (
                  lang.language && (
                    <div key={index}>
                      <span className="font-medium text-foreground">{lang.language}</span>
                      {lang.proficiency && (
                        <span className="text-muted-foreground">
                          {" "}
                          - {formatProficiency(t, lang.proficiency)}
                        </span>
                      )}
                    </div>
                  )
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Skills */}
        {data.skills.some(s => s.skill) && (
          <div>
            <SectionHeader title="Skills" onEdit={() => onEditStep(3)} />
            <div className="flex flex-wrap gap-2">
              {data.skills.map((s, index) => (
                s.skill && (
                  <span key={index} className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                    {s.skill}
                  </span>
                )
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

