/**
 * Kinetic Report Style Module
 *
 * Shared PDFKit styling for all Kinetic reports.
 * Matches the Space Activity Report visual language:
 *   - Kinetic orange (#F36C24) as primary accent
 *   - Gray-filled stat boxes with large numbers
 *   - Orange headings with orange underlines
 *   - Dark cover page with orange accent stripe
 *
 * Usage:
 *   import { createReport } from './report-style.mjs';
 *   const { doc, style } = createReport('My Report', 'output.pdf');
 *   style.cover({ title: 'Title', subtitle: 'Sub', lines: [...] });
 *   style.heading('Section');
 *   style.body('Text');
 *   await style.finalize();
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';

// ── Brand Colors ──
export const colors = {
  orange:     '#F36C24',   // primary accent — headings, underlines, bars, cover
  dark:       '#1a1a2e',   // cover background, subheadings
  gray:       '#666666',   // body text
  lightBg:    '#f8f8fa',   // stat box fill, alternating table rows
  tableHeader:'#2e2e3e',   // table header background
  white:      '#ffffff',
  green:      '#16a34a',
  red:        '#dc2626',
  blue:       '#0078d4',
  purple:     '#7c3aed',
  muted:      '#999999',   // cover subtitle
  subtle:     '#777777',   // cover detail
  dim:        '#555555',   // cover metadata
};

// ── Layout Constants ──
export const layout = {
  pageWidth:    612,
  pageHeight:   792,
  margin:       60,
  contentWidth: 492,   // 612 - 60 - 60
  bottom:       722,   // 792 - 70
};

/**
 * Create a styled report.
 */
export function createReport(title, outputPath, opts = {}) {
  const { author = 'John Sundberg', subject = '' } = opts;
  const LM = layout.margin;
  const W = layout.contentWidth;
  const PW = layout.pageWidth;
  const PH = layout.pageHeight;
  const BOT = layout.bottom;

  const doc = new PDFDocument({
    size: 'letter',
    margins: { top: LM, bottom: LM, left: LM, right: LM },
    bufferPages: true,
    info: { Title: title, Author: author, Subject: subject, CreationDate: new Date() }
  });

  const out = fs.createWriteStream(outputPath);
  doc.pipe(out);

  let pageNum = 0;
  let lastTableHeader = null;

  // ── Internal ──
  function resetX() { doc.x = LM; }
  function ensureSpace(needed) {
    if (doc.y + needed > BOT) { doc.addPage(); doc.y = LM; }
  }

  const style = {

    /** Dark cover — orange accent stripe, large white title, orange subtitle. */
    cover({ title: coverTitle, subtitle, lines = [] } = {}) {
      doc.rect(0, 0, PW, PH).fill(colors.dark);
      doc.rect(0, 340, PW, 6).fill(colors.orange);

      const titleLines = (coverTitle || title).split('\n');
      let y = 160;
      doc.fontSize(42).fillColor(colors.white).font('Helvetica-Bold');
      titleLines.forEach((line, i) => {
        doc.text(line, LM, y, { width: W });
        y += i === 0 ? 50 : 46;
      });

      if (subtitle) {
        doc.fontSize(36).fillColor(colors.orange).font('Helvetica-Bold')
          .text(subtitle, LM, y, { width: W });
      }

      let ly = 370;
      if (lines.length > 0) {
        doc.fontSize(14).fillColor(colors.muted).font('Helvetica')
          .text(lines[0], LM, ly, { width: W });
        ly += 26;

        const descLines = lines.slice(1).filter(l => l.length > 40);
        const metaLines = lines.slice(1).filter(l => l.length <= 40);

        if (descLines.length > 0) {
          doc.fontSize(12).fillColor(colors.subtle)
            .text(descLines.join('\n'), LM, ly, { width: W });
          ly += descLines.length * 18 + 20;
        }

        doc.fontSize(11).fillColor(colors.dim);
        metaLines.forEach(line => {
          doc.text(line, LM, ly, { width: W });
          ly += 18;
        });
      }

      pageNum = 1;
      doc.addPage();
      doc.y = LM;
    },

    /** Level 1 heading — 22pt orange bold + orange underline. */
    heading(text) {
      const h = doc.fontSize(22).font('Helvetica-Bold').heightOfString(text, { width: W });
      ensureSpace(h + 40);
      doc.y += 14;
      const startY = doc.y;
      doc.fontSize(22).fillColor(colors.orange).font('Helvetica-Bold')
        .text(text, LM, startY, { width: W, height: h + 2 });
      doc.x = LM;
      doc.y = startY + h + 4;
      doc.moveTo(LM, doc.y).lineTo(PW - LM, doc.y).strokeColor(colors.orange).lineWidth(2).stroke();
      doc.y += 6;
      doc.font('Helvetica').fontSize(10).fillColor(colors.gray);
    },

    /** Level 2 heading — 16pt dark bold. */
    subheading(text) {
      const h = doc.fontSize(16).font('Helvetica-Bold').heightOfString(text, { width: W });
      ensureSpace(h + 24);
      doc.y += 8;
      const startY = doc.y;
      doc.fontSize(16).fillColor(colors.dark).font('Helvetica-Bold')
        .text(text, LM, startY, { width: W, height: h + 2 });
      doc.x = LM;
      doc.y = startY + h + 4;
      doc.font('Helvetica').fontSize(10).fillColor(colors.gray);
    },

    /** Level 3 heading — 13pt dark bold. */
    subheading3(text) {
      const h = doc.fontSize(13).font('Helvetica-Bold').heightOfString(text, { width: W });
      ensureSpace(h + 16);
      doc.y += 6;
      const startY = doc.y;
      doc.fontSize(13).fillColor(colors.dark).font('Helvetica-Bold')
        .text(text, LM, startY, { width: W, height: h + 2 });
      doc.x = LM;
      doc.y = startY + h + 4;
      doc.font('Helvetica').fontSize(10).fillColor(colors.gray);
    },

    /** Body paragraph — 10pt gray. */
    body(text) {
      const h = doc.fontSize(10).font('Helvetica').heightOfString(text, { width: W, lineGap: 3 });
      ensureSpace(h + 10);
      doc.fontSize(10).fillColor(colors.gray).font('Helvetica')
        .text(text, LM, doc.y, { width: W, lineGap: 3, height: h + 2 });
      doc.x = LM;
      doc.y += 6;
    },

    /** Bullet point. */
    bullet(text, indent = 0) {
      const x = LM + 10 + indent * 15;
      const w = PW - x - LM;
      const full = '\u2022  ' + text;
      const h = doc.fontSize(10).font('Helvetica').heightOfString(full, { width: w, lineGap: 2 });
      ensureSpace(h + 6);
      const startY = doc.y;
      doc.fontSize(10).fillColor(colors.gray).font('Helvetica')
        .text(full, x, startY, { width: w, lineGap: 2, height: h + 2 });
      doc.x = LM;
      doc.y = startY + h + 3;
    },

    /** Single KPI box — gray rounded rect with large number + label. */
    kpi(label, value, x, y, width = 120) {
      doc.save();
      doc.roundedRect(x, y, width, 60, 6).fill(colors.lightBg);
      doc.fontSize(22).fillColor(colors.dark).font('Helvetica-Bold')
        .text(String(value), x, y + 10, { width, align: 'center', lineBreak: false });
      doc.fontSize(8).fillColor(colors.gray).font('Helvetica')
        .text(label, x, y + 38, { width, align: 'center', lineBreak: false });
      doc.restore();
    },

    /** Row of stat boxes — auto-positioned, centered. */
    statBoxes(boxes, opts = {}) {
      const { boxWidth = 105, gap = 10 } = opts;
      const perRow = Math.min(boxes.length, Math.floor((W + gap) / (boxWidth + gap)));
      const totalW = perRow * boxWidth + (perRow - 1) * gap;
      const startX = LM + (W - totalW) / 2;

      ensureSpace(70 * Math.ceil(boxes.length / perRow) + 20);
      let row = 0;
      const baseY = doc.y + 10;

      boxes.forEach((b, i) => {
        const col = i % perRow;
        if (i > 0 && col === 0) row++;
        const x = startX + col * (boxWidth + gap);
        const y = baseY + row * 70;
        style.kpi(b.label, b.value, x, y, boxWidth);
      });

      doc.x = LM;
      doc.y = baseY + (row + 1) * 70 + 10;
    },

    /** Table row — auto-wraps text, repeats header on page break. */
    tableRow(cols, widths, opts = {}) {
      const { header, bg } = opts;
      if (header) lastTableHeader = { cols, widths };

      const fontSize = header ? 8 : 9;
      let rowH = 0;
      cols.forEach((col, i) => {
        const h = doc.fontSize(fontSize).font('Helvetica').heightOfString(String(col), { width: widths[i] - 8 });
        if (h > rowH) rowH = h;
      });
      rowH = Math.max(rowH + 6, header ? 18 : 16);

      if (doc.y + rowH > BOT) {
        doc.addPage();
        doc.y = LM;
        if (!header && lastTableHeader) {
          style.tableRow(lastTableHeader.cols, lastTableHeader.widths, { header: true });
        }
      }

      const y = doc.y;
      const totalWidth = widths.reduce((a, b) => a + b, 0);

      if (header) {
        doc.rect(LM, y - 2, totalWidth, rowH).fill(colors.tableHeader);
        doc.fontSize(8).fillColor(colors.white).font('Helvetica-Bold');
      } else {
        if (bg) doc.rect(LM, y - 2, totalWidth, rowH).fill(colors.lightBg);
        doc.fontSize(9).fillColor(colors.gray).font('Helvetica');
      }

      let x = LM;
      cols.forEach((col, i) => {
        doc.text(String(col), x + 4, y + 2, { width: widths[i] - 8, height: rowH - 4, lineBreak: true });
        x += widths[i];
      });
      doc.x = LM;
      doc.y = y + rowH + 2;
    },

    /** Full table: header + data rows. */
    table(headers, widths, rows) {
      style.tableRow(headers, widths, { header: true });
      rows.forEach((row, i) => style.tableRow(row, widths, { bg: i % 2 === 0 }));
    },

    /** Dark code block. */
    codeBlock(text) {
      const lines = text.split('\n');
      const h = lines.length * 13 + 16;
      ensureSpace(h + 8);
      resetX();
      const y = doc.y;
      doc.rect(LM, y, W, h).fill('#1e1e2e');
      doc.fontSize(8.5).fillColor('#cdd6f4').font('Courier');
      lines.forEach((line, i) => {
        doc.text(line, LM + 12, y + 8 + i * 13, { width: W - 24, lineBreak: false });
      });
      doc.x = LM;
      doc.y = y + h + 8;
      doc.fillColor(colors.gray).font('Helvetica');
    },

    /** Left-bar callout. Color defaults to orange. */
    callout(text, color = colors.orange) {
      const textH = doc.fontSize(10).font('Helvetica').heightOfString(text, { width: W - 24, lineGap: 3 });
      const boxH = textH + 16;
      ensureSpace(boxH + 8);
      resetX();
      const y = doc.y;
      doc.rect(LM, y, 4, boxH).fill(color);
      doc.fontSize(10).fillColor(colors.gray).font('Helvetica')
        .text(text, LM + 16, y + 8, { width: W - 28, lineGap: 3 });
      doc.x = LM;
      doc.y = y + boxH + 8;
    },

    /** Orange bar with label and value. */
    barRow(label, value, maxValue, opts = {}) {
      const { color = colors.orange, barWidth = 200, suffix = '' } = opts;
      const h = 24;
      ensureSpace(h + 4);
      const y = doc.y;
      doc.fontSize(10).fillColor(colors.gray).font('Helvetica')
        .text(label, LM + 4, y + 5, { width: 180, lineBreak: false });
      const bw = Math.max(Math.min(value / maxValue * barWidth, barWidth), 2);
      doc.rect(LM + 200, y + 4, bw, 16).fill(color);
      if (bw > 40) {
        doc.fontSize(9).fillColor(colors.white).font('Helvetica-Bold')
          .text(String(value) + suffix, LM + 204, y + 7, { width: bw - 8, lineBreak: false });
      } else {
        doc.fontSize(9).fillColor(colors.gray).font('Helvetica')
          .text(String(value) + suffix, LM + 200 + bw + 6, y + 7, { width: 80, lineBreak: false });
      }
      doc.x = LM;
      doc.y = y + h;
    },

    /** Conditional page break. */
    sectionBreak() {
      if (doc.y > PH * 0.75) { doc.addPage(); doc.y = LM; }
    },

    /** Small gap. */
    gap(n = 0.5) { doc.moveDown(n); },

    /** Finalize — add page footers to all pages, close PDF. */
    finalize() {
      const range = doc.bufferedPageRange();
      for (let i = 1; i < range.count; i++) {
        doc.switchToPage(i);
        doc.save();
        doc.fontSize(9).fillColor('#bbbbbb').font('Helvetica')
          .text(`Page ${i}`, LM, PH - 45, { width: W, align: 'center', lineBreak: false });
        doc.restore();
      }

      doc.end();
      return new Promise(resolve => {
        out.on('finish', () => {
          console.log(`PDF: ${outputPath}`);
          resolve(outputPath);
        });
      });
    }
  };

  return { doc, style, colors, layout };
}
