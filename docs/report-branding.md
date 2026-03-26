# Kinetic Report Branding Guide

Visual standards for PDF reports and HTML documentation generated for the Kinetic Platform.

---

## PDF Reports (PDFKit)

### Style Module
All PDF reports use the shared style module at `reports/report-style.mjs`. Import it:
```javascript
import { createReport } from './report-style.mjs';
const { doc, style } = createReport('Report Title', 'output.pdf');
```

### Color Palette

| Name | Hex | Usage |
|---|---|---|
| Blue | `#0078d4` | Primary accent, heading underlines, callout bars, links |
| Dark | `#1a1a2e` | Cover page background, headings, stat box borders |
| Green | `#16a34a` | Success indicators, positive callouts, v2/new items |
| Red | `#dc2626` | Error/alert indicators, v1/old items, critical callouts |
| Orange | `#e67e22` | Warning callouts, caution indicators |
| Purple | `#7c3aed` | Feature highlights, secondary accent |
| Gray | `#666666` | Muted text, labels, stat box captions |
| Text | `#333333` | Body text |
| Code BG | `#1e1e2e` | Code block background (dark theme) |
| Code Text | `#cdd6f4` | Code block text (Catppuccin-inspired) |
| Table Header | `#2c3e50` | Table header row background |
| Light BG | `#f5f6f8` | Alternating table row background |

### Page Layout

| Property | Value |
|---|---|
| Page size | Letter (612 x 792 pt) |
| Margins | 56pt all sides |
| Content width | 500pt |
| Font (headings) | Helvetica-Bold |
| Font (body) | Helvetica |
| Font (code) | Courier |

### Cover Page Pattern
- Full-page dark background (`#1a1a2e`)
- Blue accent line at y=290 (5pt tall, full width)
- Title: 32pt white Helvetica-Bold at y=150
- Subtitle: 14pt blue Helvetica at y=260
- Detail lines: 11pt light gray starting at y=320
- Big stat or highlight: centered below detail lines

### Component Reference

| Component | Description |
|---|---|
| `style.cover({title, subtitle, lines})` | Dark cover page |
| `style.heading(text)` | 18pt bold + blue underline, auto-paginates |
| `style.subheading(text)` | 13pt bold, auto-paginates |
| `style.body(text)` | 10pt paragraph with line gap |
| `style.bullet(text)` | Indented bullet point |
| `style.codeBlock(text)` | Dark code block, monospace |
| `style.tableRow(cols, widths, opts)` | Single table row (header/bg options) |
| `style.table(headers, widths, rows)` | Complete table (header + data rows) |
| `style.callout(text, color)` | Left-bar callout box |
| `style.statBoxes([{label, value, color}])` | Row of stat boxes |
| `style.barRow(label, value, max, color)` | Horizontal bar chart row |
| `style.sectionBreak()` | Page break if <25% remaining |
| `style.gap(n)` | Small vertical space |
| `style.finalize()` | Close PDF, returns promise |

### Footer
Automatic page numbers on every page except cover. Format: `{Title} — {page}`, centered, 8pt gray.

### PDFKit Gotchas
- **Footer blank pages**: `doc.text()` in `pageAdded` must save/restore `doc.y` AND temporarily zero `page.margins.bottom`
- **Text overflow**: Always pass `{ width: W }` to text calls after positioned elements (tables, stat boxes)
- **PATCH not supported**: Java `HttpURLConnection` doesn't support PATCH — use `X-HTTP-Method-Override`

---

## HTML Documentation

### Template Source
The handler documentation pages in `handlers/integration_docs/` use the template established in `handlers/docs/o365-mail-send.html`.

### HTML Color Palette
Same hex values as PDF reports, plus per-integration brand colors:

| Integration | Brand Color |
|---|---|
| Microsoft 365 | `#0078d4` |
| Google Workspace | `#4285f4` |
| HubSpot | `#ff7a59` |
| Jira | `#0052cc` |
| GitHub | `#24292f` |
| Redis | `#dc382d` |
| LDAP | `#0d6efd` |
| SQL | `#336791` |

### HTML Page Structure
```
Sidebar (240px fixed left)
├── Brand header
├── "This Handler" section links
├── Handler catalog links
└── "Back to Catalog" link

Main content (900px max, 48px padding)
├── Overview card (handler metadata table)
├── Prerequisites
├── Connection Properties table
├── Parameters table (required/optional badges)
├── Results table (with example XML)
├── Authentication flow diagram
├── Tabbed examples (Basic / ERB / Full Tree)
├── Error handling section
├── Suggested routines (card grid)
├── Testing section
├── Troubleshooting
└── Handler files (directory tree)
```

### CSS Components
- **Cards**: White background, 1px border `#e1e4e8`, 8px border-radius
- **Tables**: 14px font, header bg `#f9fafb`, row hover on `#f5f6f8`
- **Code blocks**: Dark theme (`#1e1e2e` bg), Catppuccin colors, 8px radius
- **Callouts**: Colored left border, 14px padding, 4 variants (info/warning/danger/success)
- **Tabs**: Horizontal pills with blue active underline
- **Routine cards**: 2-column grid, hover border color change, difficulty badges

### CSS Variables
```css
:root {
  --brand: #0078d4;      /* override per integration */
  --brand-dark: #005a9e;
  --brand-light: #deecf9;
  --bg: #f9fafb;
  --card: #ffffff;
  --border: #e1e4e8;
  --text: #24292f;
  --text-muted: #57606a;
  --code-bg: #f6f8fa;
}
```

---

## Usage Examples

### Quick PDF Report
```javascript
import { createReport } from './report-style.mjs';

const { style } = createReport('Quarterly Review', 'quarterly-review.pdf');

style.cover({
  title: 'Quarterly Review\nQ1 2026',
  subtitle: 'Platform Performance & Metrics',
  lines: ['March 25, 2026', 'John Sundberg', 'Kinetic Platform Engineering']
});

style.heading('Executive Summary');
style.body('Platform processed 12,847 submissions this quarter...');

style.statBoxes([
  { label: 'Submissions', value: '12,847', color: '#0078d4' },
  { label: 'Avg Response', value: '1.2s', color: '#16a34a' },
  { label: 'Error Rate', value: '0.03%', color: '#16a34a' },
]);

style.heading('Performance by Kapp');
style.table(
  ['Kapp', 'Submissions', 'Avg Time'],
  [250, 125, 125],
  [
    ['Service Portal', '8,234', '1.1s'],
    ['Queue', '3,102', '0.8s'],
    ['Admin', '1,511', '2.3s'],
  ]
);

style.callout('All SLA targets met. Zero P1 incidents this quarter.', '#16a34a');

await style.finalize();
```
