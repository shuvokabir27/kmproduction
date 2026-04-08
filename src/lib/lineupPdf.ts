import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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

export async function downloadLineupPDF(data: LineupPDFData) {
  const dateStr = format(new Date(data.projectDate), "d MMMM yyyy", { locale: bn });

  // Create a hidden container for rendering
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: 794px; /* A4 width at 96dpi */
    background: white;
    font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', Arial, sans-serif;
    color: #28282d;
  `;

  let metaLine = `তারিখ: ${dateStr}`;
  if (data.location) metaLine += `  |  লোকেশন: ${data.location}`;
  metaLine += `  |  ক্লায়েন্ট: ${data.clientName}`;

  let scenesHTML = "";
  if (data.scenes.length > 0) {
    const rows = data.scenes
      .map(
        (s) => `
      <tr>
        <td style="width:40px;text-align:center;font-weight:bold;padding:10px 6px;border:1px solid #ddd;">${s.scene_number}</td>
        <td style="padding:10px 8px;border:1px solid #ddd;">${s.description || "-"}</td>
        <td style="width:120px;padding:10px 8px;border:1px solid #ddd;">${s.location || "-"}</td>
        <td style="width:120px;padding:10px 8px;border:1px solid #ddd;">${s.characters || "-"}</td>
      </tr>`
      )
      .join("");

    scenesHTML = `
      <div style="margin-top:24px;">
        <h2 style="font-size:17px;font-weight:bold;margin-bottom:10px;color:#1e1e28;">সিন লাইনআপ</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#1e1e28;color:#fff;">
              <th style="width:40px;padding:10px 6px;text-align:center;border:1px solid #1e1e28;">#</th>
              <th style="padding:10px 8px;text-align:left;border:1px solid #1e1e28;">বর্ণনা</th>
              <th style="width:120px;padding:10px 8px;text-align:left;border:1px solid #1e1e28;">লোকেশন</th>
              <th style="width:120px;padding:10px 8px;text-align:left;border:1px solid #1e1e28;">চরিত্র</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  let scriptHTML = "";
  if (data.clientScript) {
    scriptHTML = `
      <div style="margin-top:24px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <div style="width:4px;height:24px;background:#3b82f6;border-radius:2px;"></div>
          <h2 style="font-size:17px;font-weight:bold;color:#1e1e28;">ক্লায়েন্ট স্ক্রিপ্ট</h2>
        </div>
        <div style="background:#fafafc;border:1px solid #ddd;border-radius:6px;padding:14px 16px;font-size:13px;line-height:1.8;white-space:pre-wrap;color:#3c3c46;">
          ${data.clientScript}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div style="background:#1e1e28;padding:28px 30px 18px;text-align:center;">
      <div style="font-size:24px;font-weight:bold;color:#fff;letter-spacing:2px;">SHOOTING LINEUP</div>
      <div style="font-size:18px;font-weight:bold;color:#fff;margin-top:6px;">${data.projectName}</div>
      <div style="font-size:11px;color:#b4b4c8;margin-top:10px;">${metaLine}</div>
    </div>
    <div style="height:3px;background:#3b82f6;"></div>
    <div style="padding:20px 30px 40px;">
      ${scenesHTML}
      ${scriptHTML}
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgWidth = 210; // A4 mm
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`Lineup_${data.projectName.replace(/\s+/g, "_")}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
