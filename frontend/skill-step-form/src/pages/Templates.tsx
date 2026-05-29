import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { TemplateShowcase } from "@/components/landing/TemplateShowcase";
import { useLanguage } from "@/contexts/LanguageContext";
import { SEO } from "@/components/SEO";

const Templates = () => {
  const { t } = useLanguage();

  return (
    <>
      <SEO
        title="Professional CV Templates | 123Resume"
        description="Choose from 6 professional CV templates: Modern, Classic, Creative, Minimal, LaTeX, and Star Rover. All templates are ATS-friendly and customizable."
        keywords="CV templates, resume templates, professional templates, ATS templates, modern CV, classic resume"
        url="https://123resume.de/templates"
      />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-4 max-w-6xl text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            {t("pages.templates.title")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("pages.templates.subtitle")}
          </p>
        </div>

        <TemplateShowcase hideHeader showViewAll={false} />

        <div className="container mx-auto px-4 sm:px-6 pb-16 sm:pb-24 max-w-6xl text-center">
          <Link to="/create/start">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              {t("pages.about.startBuilding")}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
};

export default Templates;
