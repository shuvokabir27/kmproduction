import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

interface ArtistBillItem {
  artist_name: string;
  remuneration: number;
  paid_amount: number;
}

interface ProjectBillData {
  projectName: string;
  projectDate: string;
  clientName: string;
  productionBudget: number;
  productionPaid: number;
  artists: ArtistBillItem[];
}

interface AllProjectsBillData {
  clientName: string;
  company?: string;
  projects: ProjectBillData[];
}

function buildRowHTML(label: string, amount: string, paid: string, due: string, bold = false, statusHtml = "") {
  const fw = bold ? "font-weight:bold;" : "";
  const bg = bold ? "background:#f0f4ff;" : "";
  const paidNum = parseFloat(paid.replace(/[^\d.-]/g, "")) || 0;
  const amountNum = parseFloat(amount.replace(/[^\d.-]/g, "")) || 0;
  const autoStatus = statusHtml || (amountNum > 0 && paidNum >= amountNum
    ? '<span style="color:#16a34a;font-weight:bold;">Paid</span>'
    : paidNum > 0
      ? `<span style="color:#d97706;font-weight:bold;">Partially Paid</span>`
      : '<span style="color:#dc2626;">Unpaid</span>');
  return `<tr style="${bg}">
    <td style="padding:8px 10px;border:1px solid #ddd;${fw}">${label}</td>
    <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;${fw}">${amount}</td>
    <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;color:#16a34a;${fw}">${paid}</td>
    <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;color:#d97706;${fw}">${due}</td>
    <td style="padding:8px 10px;border:1px solid #ddd;text-align:center;${fw}">${autoStatus}</td>
  </tr>`;
}

function fmt(n: number) {
  return "৳" + n.toLocaleString("bn-BD");
}

function buildSingleProjectHTML(data: ProjectBillData): string {
  const dateStr = format(new Date(data.projectDate), "d MMMM yyyy", { locale: bn });
  const totalArtistBill = data.artists.reduce((s, a) => s + a.remuneration, 0);
  const totalArtistPaid = data.artists.reduce((s, a) => s + a.paid_amount, 0);
  const grandBill = data.productionBudget + totalArtistBill;
  const grandPaid = data.productionPaid + totalArtistPaid;
  const grandDue = grandBill - grandPaid;

  let artistRows = "";
  data.artists.forEach((a) => {
    const due = a.remuneration - a.paid_amount;
    artistRows += buildRowHTML(
      a.artist_name,
      fmt(a.remuneration),
      fmt(a.paid_amount),
      fmt(Math.max(0, due))
    );
  });

  return `
    <div style="background:#1e1e28;padding:24px 30px 16px;text-align:center;">
      <div style="font-size:11px;color:#b4b4c8;letter-spacing:3px;text-transform:uppercase;">Kuakata Multimedia</div>
      <div style="font-size:22px;font-weight:bold;color:#fff;margin-top:6px;">প্রজেক্ট বিল</div>
      <div style="font-size:16px;color:#e0e0f0;margin-top:4px;">${data.projectName}</div>
      <div style="font-size:11px;color:#b4b4c8;margin-top:8px;">তারিখ: ${dateStr}  |  প্রজেক্ট ডিরেক্টর: ${data.clientName}</div>
    </div>
    <div style="height:3px;background:#3b82f6;"></div>
    <div style="padding:20px 30px 30px;">
      
      ${data.artists.length > 0 ? `
      <h3 style="font-size:15px;font-weight:bold;margin-bottom:10px;color:#1e1e28;">আর্টিস্ট বিল</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px;">
        <thead>
          <tr style="background:#1e1e28;color:#fff;">
            <th style="padding:8px 10px;text-align:left;border:1px solid #1e1e28;">আর্টিস্ট</th>
            <th style="padding:8px 10px;text-align:right;border:1px solid #1e1e28;">পারিশ্রমিক</th>
            <th style="padding:8px 10px;text-align:right;border:1px solid #1e1e28;">পেইড</th>
            <th style="padding:8px 10px;text-align:right;border:1px solid #1e1e28;">বাকি</th>
            <th style="padding:8px 10px;text-align:center;border:1px solid #1e1e28;">স্ট্যাটাস</th>
          </tr>
        </thead>
        <tbody>
          ${artistRows}
          ${buildRowHTML("মোট আর্টিস্ট বিল", fmt(totalArtistBill), fmt(totalArtistPaid), fmt(Math.max(0, totalArtistBill - totalArtistPaid)), true)}
        </tbody>
      </table>
      ` : ""}
      
      <h3 style="font-size:15px;font-weight:bold;margin-bottom:10px;color:#1e1e28;">প্রোডাকশন বিল</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px;">
        <thead>
          <tr style="background:#1e1e28;color:#fff;">
            <th style="padding:8px 10px;text-align:left;border:1px solid #1e1e28;">বিবরণ</th>
            <th style="padding:8px 10px;text-align:right;border:1px solid #1e1e28;">বিল</th>
            <th style="padding:8px 10px;text-align:right;border:1px solid #1e1e28;">পেইড</th>
            <th style="padding:8px 10px;text-align:right;border:1px solid #1e1e28;">বাকি</th>
            <th style="padding:8px 10px;text-align:center;border:1px solid #1e1e28;">স্ট্যাটাস</th>
          </tr>
        </thead>
        <tbody>
          ${(() => {
            const prodDue = data.productionBudget - data.productionPaid;
            const status = data.productionPaid >= data.productionBudget && data.productionBudget > 0
              ? '<span style="color:#16a34a;font-weight:bold;">Paid</span>'
              : data.productionPaid > 0
                ? '<span style="color:#d97706;font-weight:bold;">Partially Paid</span>'
                : '<span style="color:#dc2626;">Unpaid</span>';
            return `<tr style="background:#f0f4ff;font-weight:bold;">
              <td style="padding:8px 10px;border:1px solid #ddd;">প্রোডাকশন খরচ</td>
              <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;">${fmt(data.productionBudget)}</td>
              <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;color:#16a34a;">${fmt(data.productionPaid)}</td>
              <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;color:#d97706;">${fmt(Math.max(0, prodDue))}</td>
              <td style="padding:8px 10px;border:1px solid #ddd;text-align:center;">${status}</td>
            </tr>`;
          })()}
        </tbody>
      </table>
      
      <div style="background:#1e1e28;border-radius:8px;padding:16px 20px;margin-top:10px;">
        <table style="width:100%;font-size:14px;color:#fff;">
          <tr>
            <td style="padding:4px 0;">সর্বমোট বিল</td>
            <td style="text-align:right;font-weight:bold;">${fmt(grandBill)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#4ade80;">সর্বমোট পেইড</td>
            <td style="text-align:right;font-weight:bold;color:#4ade80;">${fmt(grandPaid)}</td>
          </tr>
          <tr style="border-top:1px solid rgba(255,255,255,0.2);">
            <td style="padding:8px 0 4px;color:#fbbf24;font-weight:bold;">সর্বমোট বাকি</td>
            <td style="text-align:right;font-weight:bold;color:#fbbf24;font-size:18px;">${fmt(Math.max(0, grandDue))}</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-top:24px;font-size:9px;color:#999;">
        এটি একটি কম্পিউটার জেনারেটেড বিল  •  ${format(new Date(), "d MMM yyyy, h:mm a", { locale: bn })}
      </div>
    </div>
  `;
}

async function renderToPDF(html: string, fileName: string) {
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: 794px;
    background: white;
    font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', Arial, sans-serif;
    color: #28282d;
  `;
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgWidth = 210;
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

    pdf.save(fileName);
  } finally {
    document.body.removeChild(container);
  }
}

export async function downloadProjectBillPDF(data: ProjectBillData) {
  const html = buildSingleProjectHTML(data);
  await renderToPDF(html, `Bill_${data.projectName.replace(/\s+/g, "_")}.pdf`);
}

export async function downloadAllProjectsBillPDF(data: AllProjectsBillData) {
  const dateStr = format(new Date(), "d MMMM yyyy", { locale: bn });

  // Aggregate per-artist across all projects
  const artistMap: Record<string, { projects: number; totalBill: number; totalPaid: number }> = {};
  let totalProductionBill = 0;
  let totalProductionPaid = 0;

  data.projects.forEach((p) => {
    totalProductionBill += p.productionBudget;
    totalProductionPaid += p.productionPaid;
    p.artists.forEach((a) => {
      const key = a.artist_name.toLowerCase();
      if (!artistMap[key]) {
        artistMap[key] = { projects: 0, totalBill: 0, totalPaid: 0 };
      }
      artistMap[key].projects += 1;
      artistMap[key].totalBill += a.remuneration;
      artistMap[key].totalPaid += a.paid_amount;
    });
  });

  const artistList = Object.entries(artistMap).map(([key, val]) => {
    const originalName = data.projects
      .flatMap((p) => p.artists)
      .find((a) => a.artist_name.toLowerCase() === key)?.artist_name || key;
    return { name: originalName, ...val };
  });

  const totalArtistBill = artistList.reduce((s, a) => s + a.totalBill, 0);
  const totalArtistPaid = artistList.reduce((s, a) => s + a.totalPaid, 0);
  const grandBill = totalProductionBill + totalArtistBill;
  const grandPaid = totalProductionPaid + totalArtistPaid;
  const grandDue = grandBill - grandPaid;

  // Artist rows
  let artistRows = "";
  artistList.forEach((a) => {
    const due = a.totalBill - a.totalPaid;
    const status = a.totalBill > 0 && a.totalPaid >= a.totalBill
      ? '<span style="color:#16a34a;font-weight:bold;">Paid</span>'
      : a.totalPaid > 0
        ? '<span style="color:#d97706;font-weight:bold;">Partially Paid</span>'
        : '<span style="color:#dc2626;">Unpaid</span>';
    artistRows += `<tr>
      <td style="padding:8px 10px;border:1px solid #ddd;">${a.name}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;text-align:center;">${a.projects}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;">${fmt(a.totalBill)}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;color:#16a34a;">${fmt(a.totalPaid)}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;color:#d97706;">${fmt(Math.max(0, due))}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;text-align:center;">${status}</td>
    </tr>`;
  });

  // Project-wise production rows
  let productionRows = "";
  data.projects.forEach((p) => {
    const pDate = format(new Date(p.projectDate), "d MMM yy", { locale: bn });
    const due = p.productionBudget - p.productionPaid;
    const status = p.productionBudget > 0 && p.productionPaid >= p.productionBudget
      ? '<span style="color:#16a34a;font-weight:bold;">Paid</span>'
      : p.productionPaid > 0
        ? '<span style="color:#d97706;font-weight:bold;">Partially Paid</span>'
        : '<span style="color:#dc2626;">Unpaid</span>';
    productionRows += `<tr>
      <td style="padding:8px 10px;border:1px solid #ddd;">${p.projectName}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;text-align:center;">${pDate}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;">${fmt(p.productionBudget)}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;color:#16a34a;">${fmt(p.productionPaid)}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;color:#d97706;">${fmt(Math.max(0, due))}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;text-align:center;">${status}</td>
    </tr>`;
  });

  const html = `
    <div style="background:#1e1e28;padding:24px 30px 16px;text-align:center;">
      <div style="font-size:11px;color:#b4b4c8;letter-spacing:3px;text-transform:uppercase;">Kuakata Multimedia</div>
      <div style="font-size:22px;font-weight:bold;color:#fff;margin-top:6px;">সকল প্রজেক্ট বিল</div>
      <div style="font-size:13px;color:#e0e0f0;margin-top:4px;">প্রজেক্ট ডিরেক্টর: ${data.clientName}${data.company ? ` (${data.company})` : ""}</div>
      <div style="font-size:11px;color:#b4b4c8;margin-top:6px;">মোট ${data.projects.length} টি প্রজেক্ট  •  তারিখ: ${dateStr}</div>
    </div>
    <div style="height:3px;background:#3b82f6;"></div>
    <div style="padding:20px 30px 30px;">
      
      ${artistList.length > 0 ? `
      <h3 style="font-size:15px;font-weight:bold;margin-bottom:10px;color:#1e1e28;">আর্টিস্ট বিল সামারি</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px;">
        <thead>
          <tr style="background:#1e1e28;color:#fff;">
            <th style="padding:8px 10px;text-align:left;border:1px solid #1e1e28;">আর্টিস্ট</th>
            <th style="padding:8px 10px;text-align:center;border:1px solid #1e1e28;">প্রজেক্ট</th>
            <th style="padding:8px 10px;text-align:right;border:1px solid #1e1e28;">মোট বিল</th>
            <th style="padding:8px 10px;text-align:right;border:1px solid #1e1e28;">পেইড</th>
            <th style="padding:8px 10px;text-align:right;border:1px solid #1e1e28;">বাকি</th>
            <th style="padding:8px 10px;text-align:center;border:1px solid #1e1e28;">স্ট্যাটাস</th>
          </tr>
        </thead>
        <tbody>
          ${artistRows}
          <tr style="background:#f0f4ff;font-weight:bold;">
            <td style="padding:8px 10px;border:1px solid #ddd;" colspan="2">মোট আর্টিস্ট বিল</td>
            <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;">${fmt(totalArtistBill)}</td>
            <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;color:#16a34a;">${fmt(totalArtistPaid)}</td>
            <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;color:#d97706;">${fmt(Math.max(0, totalArtistBill - totalArtistPaid))}</td>
            <td style="padding:8px 10px;border:1px solid #ddd;"></td>
          </tr>
        </tbody>
      </table>
      ` : ""}

      <h3 style="font-size:15px;font-weight:bold;margin-bottom:10px;color:#1e1e28;">প্রোডাকশন বিল</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px;">
        <thead>
          <tr style="background:#1e1e28;color:#fff;">
            <th style="padding:8px 10px;text-align:left;border:1px solid #1e1e28;">প্রজেক্ট</th>
            <th style="padding:8px 10px;text-align:center;border:1px solid #1e1e28;">তারিখ</th>
            <th style="padding:8px 10px;text-align:right;border:1px solid #1e1e28;">বিল</th>
            <th style="padding:8px 10px;text-align:right;border:1px solid #1e1e28;">পেইড</th>
            <th style="padding:8px 10px;text-align:right;border:1px solid #1e1e28;">বাকি</th>
            <th style="padding:8px 10px;text-align:center;border:1px solid #1e1e28;">স্ট্যাটাস</th>
          </tr>
        </thead>
        <tbody>
          ${productionRows}
          <tr style="background:#f0f4ff;font-weight:bold;">
            <td style="padding:8px 10px;border:1px solid #ddd;" colspan="2">মোট প্রোডাকশন বিল</td>
            <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;">${fmt(totalProductionBill)}</td>
            <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;color:#16a34a;">${fmt(totalProductionPaid)}</td>
            <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;color:#d97706;">${fmt(Math.max(0, totalProductionBill - totalProductionPaid))}</td>
            <td style="padding:8px 10px;border:1px solid #ddd;"></td>
          </tr>
        </tbody>
      </table>

      <div style="background:#1e1e28;border-radius:8px;padding:16px 20px;margin-top:10px;">
        <table style="width:100%;font-size:14px;color:#fff;">
          <tr>
            <td style="padding:4px 0;">সর্বমোট বিল</td>
            <td style="text-align:right;font-weight:bold;">${fmt(grandBill)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#4ade80;">সর্বমোট পেইড</td>
            <td style="text-align:right;font-weight:bold;color:#4ade80;">${fmt(grandPaid)}</td>
          </tr>
          <tr style="border-top:1px solid rgba(255,255,255,0.2);">
            <td style="padding:8px 0 4px;color:#fbbf24;font-weight:bold;">সর্বমোট বাকি</td>
            <td style="text-align:right;font-weight:bold;color:#fbbf24;font-size:18px;">${fmt(Math.max(0, grandDue))}</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-top:24px;font-size:9px;color:#999;">
        এটি একটি কম্পিউটার জেনারেটেড বিল  •  ${format(new Date(), "d MMM yyyy, h:mm a", { locale: bn })}
      </div>
    </div>
  `;

  await renderToPDF(html, `All_Bills_${data.clientName.replace(/\s+/g, "_")}.pdf`);
}
