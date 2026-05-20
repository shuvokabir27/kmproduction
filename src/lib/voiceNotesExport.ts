import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";

interface ClipForExport {
  sequence_number: number;
  transcript?: string | null;
  duration_seconds?: number | null;
}

const toBn = (n: number) =>
  n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[parseInt(d)]);

export async function exportVoiceNotesPdf(title: string, clips: ClipForExport[]) {
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: 794px; padding: 60px 50px; box-sizing: border-box;
    background: #ffffff; color: #111111;
    font-family: 'Tiro Bangla','Hind Siliguri','Noto Sans Bengali',serif;
    font-size: 16px; line-height: 1.8;
  `;

  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  container.innerHTML = `
    <h1 style="font-size:28px;font-weight:700;text-align:center;margin:0 0 8px;color:#0f172a;">${safe(title)}</h1>
    <p style="text-align:center;color:#64748b;margin:0 0 32px;font-size:13px;">
      ভয়েস নোট ট্রান্সক্রিপশন · ${new Date().toLocaleDateString("bn-BD")}
    </p>
    ${clips
      .map(
        (c) => `
      <div style="margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid #e5e7eb;">
        <div style="font-weight:600;color:#0e7490;margin-bottom:6px;font-size:15px;">
          দৃশ্য ${safe(toBn(c.sequence_number))}
        </div>
        <div style="white-space:pre-wrap;color:#111827;">
          ${c.transcript ? safe(c.transcript) : '<span style="color:#9ca3af;font-style:italic;">কোনো টেক্সট নেই</span>'}
        </div>
      </div>`
      )
      .join("")}
  `;

  document.body.appendChild(container);
  try {
    // Wait for fonts
    if ((document as any).fonts?.ready) await (document as any).fonts.ready;

    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    if (imgH <= pageH) {
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, imgW, imgH);
    } else {
      // Slice across pages
      const pxPerMm = canvas.width / pageW;
      const pageHeightPx = pageH * pxPerMm;
      let y = 0;
      while (y < canvas.height) {
        const sliceH = Math.min(pageHeightPx, canvas.height - y);
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = sliceH;
        const ctx = slice.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        const imgData = slice.toDataURL("image/jpeg", 0.95);
        const hMm = (sliceH / canvas.width) * pageW;
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pageW, hMm);
        y += sliceH;
      }
    }

    const blob = pdf.output("blob");
    saveAs(blob, `${title}-voice-notes.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

export async function exportVoiceNotesDocx(title: string, clips: ClipForExport[]) {
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: title, bold: true, size: 36 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `ভয়েস নোট ট্রান্সক্রিপশন · ${new Date().toLocaleDateString("bn-BD")}`,
          color: "64748B",
          size: 20,
        }),
      ],
    }),
    new Paragraph({ children: [new TextRun("")] }),
  ];

  clips.forEach((c) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `দৃশ্য ${toBn(c.sequence_number)}`,
            bold: true,
            color: "0E7490",
            size: 26,
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );
    const text = c.transcript || "কোনো টেক্সট নেই";
    text.split("\n").forEach((line) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 24 })],
        })
      );
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title}-voice-notes.docx`);
}
