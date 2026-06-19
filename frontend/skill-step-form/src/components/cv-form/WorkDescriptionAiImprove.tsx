import { AiImproveTextarea, type AiImproveTextareaProps } from "@/components/cv-form/AiImproveTextarea";

type WorkDescriptionAiImproveProps = Omit<AiImproveTextareaProps, "fieldType"> & {
  position: string;
  company: string;
};

/** Work experience role summary — wraps shared AI improve textarea. */
export const WorkDescriptionAiImprove = ({
  position,
  company,
  ...props
}: WorkDescriptionAiImproveProps) => (
  <AiImproveTextarea
    fieldType="work_description"
    position={position}
    company={company}
    {...props}
  />
);
