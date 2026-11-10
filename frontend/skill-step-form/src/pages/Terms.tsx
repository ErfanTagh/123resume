import { useLanguage } from "@/contexts/LanguageContext";
import { LegalPage } from "@/components/LegalPage";
import { TERMS } from "@/lib/legalContent";

const Terms = () => {
  const { language } = useLanguage();
  const doc = TERMS[language] ?? TERMS.en;
  return (
    <LegalPage
      doc={doc}
      description={
        language === "de"
          ? "Nutzungsbedingungen von 123Resume: Nutzung des Dienstes, KI-Funktionen, Claude-Connector, Jobvorschläge und Ihre Rechte."
          : "123Resume Terms of Service: using the service, AI features, the Claude connector, Job Suggestions, and your rights."
      }
    />
  );
};

export default Terms;
