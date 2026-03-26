---
name: kinetic-report
description: Generate a branded PDF report using the Kinetic report style module
argument-hint: "<topic> [output-path]"
user-invocable: true
---

# Generate a Kinetic PDF Report

The user wants to generate a professional PDF report. All reports MUST use the shared style module for consistent branding.

## Step 1: Read Branding References

Before generating any report, read:
- `docs/report-branding.md` — visual standards, color palette, component reference
- `reports/report-style.mjs` — the shared style module (import this, don't duplicate its code)

## Step 2: Plan the Report

Based on the user's request, determine:
- **Title** — short, descriptive
- **Subtitle** — context line (date range, server, scope)
- **Cover detail lines** — date, author, server, key stats
- **Sections** — what data to present, in what order
- **Data source** — what API calls, file reads, or computations are needed

## Step 3: Gather Data

If the report needs live data (benchmarks, server stats, API responses):
1. Run the data collection first
2. Save results to a JSON file
3. Reference the JSON in the report generator

## Step 4: Generate the Report

Create a generator script at `reports/generate-{topic}.mjs` that:

```javascript
import { createReport } from './report-style.mjs';

const { doc, style, colors } = createReport('Report Title', 'reports/output.pdf', {
  author: 'John Sundberg',
  subject: 'Brief description'
});

// Cover page
style.cover({
  title: 'Report Title\nSecond Line',
  subtitle: 'Subtitle here',
  lines: ['Date', 'Author', 'Source']
});

// Content sections using style API
style.heading('Section');
style.body('Paragraph text.');
style.table(['Col1', 'Col2'], [250, 250], [['a', 'b']]);
style.callout('Key insight here.', colors.green);

await style.finalize();
```

## Style API Reference

| Method | Usage |
|---|---|
| `style.cover({title, subtitle, lines})` | Dark cover page |
| `style.heading(text)` | 18pt bold + blue underline |
| `style.subheading(text)` | 13pt bold |
| `style.body(text)` | 10pt paragraph |
| `style.bullet(text)` | Indented bullet point |
| `style.codeBlock(text)` | Dark code block |
| `style.table(headers, widths, rows)` | Full table |
| `style.tableRow(cols, widths, {header, bg})` | Single row |
| `style.callout(text, color)` | Left-bar callout |
| `style.statBoxes([{label, value, color}])` | Stat box row |
| `style.barRow(label, value, max, color)` | Bar chart row |
| `style.sectionBreak()` | Conditional page break |
| `style.gap(n)` | Vertical space |
| `style.finalize()` | Close PDF (returns promise) |

## Critical Rules

- **ALWAYS import from `reports/report-style.mjs`** — never define heading/body/table/callout functions inline
- **ALWAYS use `style.cover()` for the first page** — consistent dark cover with blue accent
- **ALWAYS call `style.finalize()`** at the end — or the PDF won't flush to disk
- **Output to `reports/` directory** — all generated PDFs go here
- **Generator scripts go in `reports/`** — named `generate-{topic}.mjs`
- **Open the PDF after generation** — `open reports/{filename}.pdf`
- For custom PDFKit operations, access `doc` directly but call `resetX()` equivalent (`doc.x = 56`) after positioned text
