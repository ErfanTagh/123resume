import html2pdf from 'html2pdf.js';
import { jsPDF } from 'jspdf';

/**
 * Generate a clean, text-based PDF from a plain-text document (e.g. a cover letter).
 *
 * This writes real, selectable text with jsPDF instead of rasterizing a DOM node
 * via html2canvas. It avoids the blank-page failures that happen when the source
 * element is rendered off-screen, and is immune to unsupported CSS colors (oklch).
 *
 * @param text - The document text (paragraphs separated by blank lines).
 * @param filename - Filename without the .pdf extension.
 */
export const generateTextPdf = (text: string, filename: string = 'document') => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20; // mm
  const usableWidth = pageWidth - margin * 2;
  const lineHeight = 7; // mm per line
  const paragraphGap = lineHeight * 0.5;

  doc.setFont('times', 'normal');
  doc.setFontSize(12);

  let y = margin;
  const rawLines = (text || '').replace(/\r\n/g, '\n').split('\n');

  for (const raw of rawLines) {
    // Blank line → paragraph spacing.
    if (raw.trim() === '') {
      y += paragraphGap;
      continue;
    }
    const wrapped: string[] = doc.splitTextToSize(raw, usableWidth);
    for (const line of wrapped) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
  }

  doc.save(`${filename}.pdf`);
};

/**
 * Generate PDF from HTML element
 * @param element - The HTML element to convert to PDF
 * @param filename - The filename for the PDF (without .pdf extension)
 */
export const generatePDF = async (element: HTMLElement, filename: string = 'resume') => {
  const opt = {
    margin: [10, 10, 10, 10],
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait' 
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  await html2pdf().set(opt).from(element).save();
  return true;
};

