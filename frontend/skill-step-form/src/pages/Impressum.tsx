import { useLanguage } from "@/contexts/LanguageContext";
import { LegalPage } from "@/components/LegalPage";
import { IMPRESSUM } from "@/lib/legalContent";

const Impressum = () => {
  const { language } = useLanguage();
  const doc = IMPRESSUM[language] ?? IMPRESSUM.en;
  return (
    <LegalPage
      doc={doc}
      description={
        language === "de"
          ? "Impressum von 123Resume: Angaben gemäß § 5 DDG, Betreiber und Kontakt."
          : "123Resume legal notice (Impressum): operator details and contact under § 5 DDG."
      }
    />
  );
};

export default Impressum;
