import { ModernTemplate } from "./templates/ModernTemplate";
import { ClassicTemplate } from "./templates/ClassicTemplate";
import { MinimalTemplate } from "./templates/MinimalTemplate";
import { CreativeTemplate } from "./templates/CreativeTemplate";
import { LatexTemplate } from "./templates/LatexTemplate";
import { StarRoverTemplate } from "./templates/StarRoverTemplate";
import { SlateCopperTemplate } from "./templates/SlateCopperTemplate";
import type { CVFormData } from "./types";

export function renderResumeTemplate(data: CVFormData) {
  switch (data.template) {
    case "classic":
      return <ClassicTemplate data={data} />;
    case "minimal":
      return <MinimalTemplate data={data} />;
    case "creative":
      return <CreativeTemplate data={data} />;
    case "latex":
      return <LatexTemplate data={data} />;
    case "starRover":
      return <StarRoverTemplate data={data} />;
    case "slateCopper":
      return <SlateCopperTemplate data={data} />;
    case "modern":
    default:
      return <ModernTemplate data={data} />;
  }
}

export const RESUME_PREVIEW_INLINE_STYLES = `
  .resume-content-wrapper {
    position: relative;
  }
  .resume-content-wrapper::-webkit-scrollbar {
    display: none;
  }
  .page-break-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: repeating-linear-gradient(
      to right,
      #9ca3af 0px,
      #9ca3af 8px,
      transparent 8px,
      transparent 16px
    );
    pointer-events: none;
    z-index: 999;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  .page-number-indicator {
    position: absolute !important;
    right: 8px !important;
    font-size: 12px !important;
    color: #374151 !important;
    font-weight: 700 !important;
    pointer-events: none;
    z-index: 50 !important;
    background: rgba(255, 255, 255, 0.98) !important;
    padding: 6px 10px !important;
    border-radius: 6px !important;
    border: 2px solid rgba(59, 130, 246, 0.3) !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15) !important;
    font-family: system-ui, -apple-system, sans-serif !important;
  }
  .resume-page-container {
    padding-top: 32px !important;
    padding-bottom: 32px !important;
  }
`;
