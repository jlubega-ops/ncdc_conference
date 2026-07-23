import PDFDocument from "pdfkit";
import { LIKERT_LABELS } from "@/lib/feedback/questions";

/**
 * @param {any} report
 * @returns {Promise<Buffer>}
 */
export function renderFeedbackReportPdf(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    /** @type {Buffer[]} */
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).fillColor("#008e51").text("Conference feedback report");
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor("#313233").text(report.conference.title);
    doc.moveDown();

    doc.fontSize(11).fillColor("#313233");
    doc.text(`Total submissions: ${report.overview.totalSubmissions}`);
    doc.text(`Unique respondents: ${report.overview.uniqueRespondents}`);
    doc.text(`Confirmed attendees: ${report.overview.confirmedAttendees}`);
    doc.text(`Not yet responded: ${report.overview.pendingRespondents}`);
    doc.text(`Overall average: ${report.overview.overallAvg} / 5`);
    doc.moveDown();

    doc.fontSize(13).fillColor("#008e51").text("Rating distribution");
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#313233");
    for (const row of report.overview.byRating) {
      doc.text(`${row.value} — ${row.label}: ${row.count}`);
    }
    doc.moveDown();

    doc.fontSize(13).fillColor("#008e51").text("By day");
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#313233");
    for (const day of report.days) {
      doc.text(
        `Day ${day.dayIndex} (${day.date}): ${day.uniqueRespondents} respondents, avg ${day.avgRating}`,
      );
    }
    doc.moveDown();

    doc.fontSize(13).fillColor("#008e51").text("Questions");
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#313233");
    for (const q of report.questions) {
      doc.text(`${q.label} — avg ${q.avg} (${q.responses} responses)`);
      for (const d of q.distribution) {
        if (d.count > 0) {
          doc.text(`   ${LIKERT_LABELS[d.value]}: ${d.count}`);
        }
      }
    }
    doc.moveDown();

    if (report.speakers.length) {
      doc.fontSize(13).fillColor("#008e51").text("Speaker performance");
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor("#313233");
      for (const s of report.speakers) {
        doc.text(`${s.name}: avg ${s.avg} (${s.responses} ratings)`);
      }
      doc.moveDown();
    }

    doc.fontSize(13).fillColor("#008e51").text("Who has / has not given feedback");
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor("#313233");
    for (const p of report.participation) {
      doc.text(
        `${p.hasAnyFeedback ? "[x]" : "[ ]"} ${p.name} <${p.email}> — ${p.daysSubmitted}/${p.daysTotal} days`,
      );
    }

    doc.end();
  });
}
