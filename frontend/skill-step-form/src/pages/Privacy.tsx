import { useLanguage } from "@/contexts/LanguageContext";
import { LegalPage } from "@/components/LegalPage";
import { PRIVACY } from "@/lib/legalContent";

const Privacy = () => {
  const { language } = useLanguage();
  const doc = PRIVACY[language] ?? PRIVACY.en;
  return (
    <LegalPage
      doc={doc}
      description={
        language === "de"
          ? "Datenschutzerklärung von 123Resume: welche Daten wir verarbeiten, KI-Verarbeitung, Dienstleister und Ihre Rechte nach der DSGVO."
          : "123Resume Privacy Policy: what data we process, AI processing, service providers, and your rights under the GDPR."
      }
    />
  );
};

export default Privacy;
