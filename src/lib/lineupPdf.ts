import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

interface Scene {
  scene_number: number;
  description: string | null;
  location: string | null;
  characters: string | null;
}

interface LineupPDFData {
  projectName: string;
  clientName: string;
  projectDate: string;
  location: string | null;
  scenes: Scene[];
  clientScript: string | null;
}

export function downloadLineupPDF(data: LineupPDFData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;

  // Title area with background
  doc.setFillColor(30, 30, 40);
  doc.rect(0, 0, pageW, 55, "F");

  // Accent line
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 55, pageW, 2, "F");

  // Title text
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("SHOOTING LINEUP", pageW / 2, 22, { align: "center" });

  doc.setFontSize(16);
  doc.text(data.projectName, pageW / 2, 34, { align: "center" });

  // Meta info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(180, 180, 200);

  const dateStr = format(new Date(data.projectDate), "d MMMM yyyy", { locale: bn });
  let metaLine = `Date: ${dateStr}`;
  if (data.location) metaLine += `  |  Location: ${data.location}`;
  metaLine += `  |  Client: ${data.clientName}`;
  doc.text(metaLine, pageW / 2, 47, { align: "center" });

  let yPos = 65;

  // Scenes table
  if (data.scenes.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 50);
    doc.setFontSize(13);
    doc.text("Scene Lineup", margin, yPos);
    yPos += 8;

    const tableData = data.scenes.map((s) => [
      String(s.scene_number),
      s.description || "-",
      s.location || "-",
      s.characters || "-",
    ]);

    (doc as any).autoTable({
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [["#", "Description", "Location", "Characters"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [30, 30, 40],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
        halign: "left",
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [40, 40, 50],
        lineColor: [220, 220, 230],
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      columnStyles: {
        0: { cellWidth: 12, halign: "center", fontStyle: "bold" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
      },
      styles: {
        cellPadding: 4,
        lineWidth: 0.3,
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;
  }

  // Client Script
  if (data.clientScript) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // Section header
    doc.setFillColor(59, 130, 246);
    doc.rect(margin, yPos, 3, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 50);
    doc.setFontSize(13);
    doc.text("Client Script", margin + 6, yPos + 6);
    yPos += 14;

    // Script box
    doc.setDrawColor(220, 220, 230);
    doc.setFillColor(250, 250, 252);

    const lines = doc.splitTextToSize(data.clientScript, contentW - 12);
    const boxH = Math.min(lines.length * 5 + 10, 200);

    doc.roundedRect(margin, yPos, contentW, boxH, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 70);
    doc.text(lines, margin + 6, yPos + 7);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pH = doc.internal.pageSize.getHeight();
    doc.setFillColor(245, 245, 248);
    doc.rect(0, pH - 12, pageW, 12, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 160);
    doc.text(`Page ${i} of ${pageCount}`, pageW / 2, pH - 4, { align: "center" });
    doc.text(data.projectName, margin, pH - 4);
    doc.text(format(new Date(), "dd/MM/yyyy"), pageW - margin, pH - 4, { align: "right" });
  }

  doc.save(`Lineup_${data.projectName.replace(/\s+/g, "_")}.pdf`);
}
