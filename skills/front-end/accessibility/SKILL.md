---
name: accessibility
description: "Use when making a Kinetic React portal accessible — ARIA patterns for pagination, status messages, form errors, route changes, modals, toasts, and theme contrast checks. Covers focus management on navigation, skip-to-content links, screen-reader announcements for async state, and the load-bearing roles/aria-attributes for the components the library's recipes produce."
---

# Front-End Accessibility

This skill covers the specific accessibility patterns that Kinetic React portals tend to get wrong by default, with paste-ready snippets. It is NOT a general WCAG primer — for that, read MDN's ARIA pages and the WAI-ARIA Authoring Practices. It IS a checklist of the patterns that show up in Kinetic portals (CoreForm renders, paginated request lists, confirmation modals, toast notifications, theme switching) and the ARIA that makes them usable with assistive tech.

---

## Top-Level Page Structure

Every page needs landmark regions so a screen-reader user can skip to content.

```jsx
<>
  <a href="#main" className="sr-only focus:not-sr-only">Skip to main content</a>
  <header id="app-header" role="banner">{/* nav */}</header>
  <main id="main" tabIndex={-1}>{/* page */}</main>
  <footer id="app-footer" role="contentinfo">{/* small print */}</footer>
</>
```

The `tabIndex={-1}` on `<main>` lets you programmatically focus it on route change (next section). The `sr-only`/`focus:not-sr-only` pattern (Tailwind) hides the skip link visually until it gets focus.

---

## Route Change Announcements

A SPA doesn't announce navigations the way a server-rendered page does. Two things to add to your route handler:

1. **Move focus to `<main>`** so the screen-reader user lands at the page top.
2. **Announce the new page title** via a live region.

```jsx
// In App.jsx or a top-level route effect
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

function RouteAnnouncer() {
  const { pathname } = useLocation();
  const announceRef = useRef(null);

  useEffect(() => {
    document.getElementById('main')?.focus();
    if (announceRef.current) {
      announceRef.current.textContent = `Navigated to ${document.title}`;
    }
  }, [pathname]);

  return (
    <div
      ref={announceRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}
```

Set `document.title` on each route (`useEffect(() => { document.title = 'Requests · Acme Portal'; }, []);`) so the announcement carries meaningful text.

---

## Loading and Error States

The loading and error components in the bootstrap skill render as plain `<p>` and `<div>`. Upgrade them:

```jsx
export const Loading = () => (
  <div role="status" aria-live="polite">
    <span className="sr-only">Loading content. Please wait.</span>
    <Spinner aria-hidden="true" />
  </div>
);

export const ErrorView = ({ error }) => (
  <div role="alert">
    <strong>Error:</strong> {String(error?.message ?? error)}
  </div>
);
```

- `role="status"` + `aria-live="polite"` for loading — screen readers announce when content arrives, but don't interrupt.
- `role="alert"` for errors — screen readers interrupt immediately. Reserve for actual errors; don't use it for informational messages.
- `aria-hidden="true"` on decorative icons / spinners so screen readers don't say "graphic" before announcing the actual text.
- The visible spinner is decorative; the visually-hidden text is what the screen reader announces.

---

## Pagination Controls

The pagination components in `recipes/build-paginated-list` and `recipes/build-service-portal` lack ARIA. Fix:

```jsx
<nav aria-label="Pagination">
  <button
    onClick={onPrev}
    disabled={!onPrev || loading}
    aria-label={`Go to page ${pageNumber - 1}`}
  >
    Previous
  </button>
  <span aria-current="page" aria-label={`Page ${pageNumber} of unknown`}>
    Page {pageNumber}
  </span>
  <button
    onClick={onNext}
    disabled={!onNext || loading}
    aria-label={`Go to page ${pageNumber + 1}`}
  >
    Next
  </button>
</nav>
```

`aria-current="page"` on the page indicator. `aria-label` on Prev/Next gives screen readers context — without it, multiple "Next" buttons on a page are indistinguishable.

> The Core API does not return a total count, so you can't say "Page 3 of 17." The pattern above is honest about that — it announces "Page 3" without a denominator.

### Announce page changes

After clicking Next or Prev, announce the new page:

```jsx
const [announce, setAnnounce] = useState('');

const handleNext = () => {
  onNext();
  setAnnounce(`Now showing page ${pageNumber + 1}`);
};

return (
  <>
    {/* pagination buttons */}
    <div role="status" aria-live="polite" className="sr-only">{announce}</div>
  </>
);
```

---

## Form Error Display

If you render validation errors above the form (rather than next to each field), they need to be reachable:

```jsx
<form aria-describedby={errors.length ? 'form-errors' : undefined}>
  {errors.length > 0 && (
    <ul id="form-errors" role="alert" tabIndex={-1} ref={errorRef}>
      {errors.map((e, i) => (
        <li key={i}><a href={`#field-${e.fieldKey}`}>{e.message}</a></li>
      ))}
    </ul>
  )}
  {/* fields */}
</form>
```

When errors appear, focus the error summary (`errorRef.current?.focus()`) so the user lands on the issues. Each error item links to the offending field by ID.

For per-field errors:

```jsx
<label htmlFor="field-summary">Summary</label>
<input
  id="field-summary"
  aria-invalid={!!error}
  aria-describedby={error ? 'field-summary-error' : undefined}
/>
{error && <p id="field-summary-error" role="alert">{error}</p>}
```

`aria-invalid` and `aria-describedby` are the load-bearing pair — without them, screen readers don't link the error message to the field.

---

## Confirmation Modals

The bootstrap ConfirmationModal needs a focus trap and an escape route:

```jsx
import { useEffect, useRef } from 'react';

export function ConfirmationModal({ open, title, body, onAccept, onCancel }) {
  const dialogRef = useRef(null);
  const lastFocused = useRef(null);

  useEffect(() => {
    if (open) {
      lastFocused.current = document.activeElement;
      // Focus the first focusable element in the dialog
      dialogRef.current?.querySelector('button')?.focus();
      // Trap focus inside the dialog (browser handles this for <dialog> with showModal())
    } else if (lastFocused.current) {
      lastFocused.current.focus?.();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-body"
      ref={dialogRef}
      onKeyDown={(e) => e.key === 'Escape' && onCancel?.()}
    >
      <h2 id="confirm-title">{title}</h2>
      <p id="confirm-body">{body}</p>
      <button onClick={onCancel}>Cancel</button>
      <button onClick={onAccept}>Confirm</button>
    </div>
  );
}
```

Better: use the browser's native `<dialog>` element with `dialog.showModal()` — it gets focus trapping, ESC handling, and modal semantics for free. The Ark UI primitives that momentum-portal uses also handle this if you'd rather have a library.

**On close, return focus to the trigger** (`lastFocused.current.focus()`) — otherwise focus lands on `<body>` and the keyboard user is lost.

---

## Toasts

Toasts are notifications, not interruptions. They get `role="status"` and `aria-live="polite"`:

```jsx
function Toast({ type, title, description }) {
  return (
    <div role={type === 'error' ? 'alert' : 'status'} aria-live={type === 'error' ? 'assertive' : 'polite'}>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
    </div>
  );
}
```

`role="alert"` + `aria-live="assertive"` only for errors that the user must address immediately. Success / info toasts should be polite.

**Auto-dismiss is hostile to screen-reader users** — the toast may unmount before it's fully announced. Either don't auto-dismiss, or give screen-reader users an alternative: a notification center page where messages persist.

---

## CoreForm Accessibility

CoreForm renders forms server-side via the platform bundle; the markup it produces is not always ideal but is mostly accessible (labels, required indicators, error association). What you control as the portal author:

- **Wrap the form in a region with a heading.** `<section aria-labelledby="form-title"><h1 id="form-title">{form.name}</h1><CoreForm ... /></section>`. Without it, the page lacks a screen-reader landmark for the form content.
- **Announce successful submission.** After `completed` fires, render a `role="status"` confirmation: `<div role="status">Your request was submitted. Reference: {submission.handle}</div>`.
- **Don't block submit during render.** The pattern of disabling the submit button while the form is loading prevents screen-reader users from knowing the form even exists. Use `aria-busy="true"` on the form container instead.

---

## Theme Contrast

The theme system in `front-end/state` allows users (or admins) to pick arbitrary primary/secondary colors. There is no built-in contrast check. **Validate contrast against text colors before saving:**

```js
function relativeLuminance(hex) {
  const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)]
    .map((c) => parseInt(c, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA, hexB) {
  const [l1, l2] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Use:
contrastRatio('#0066cc', '#ffffff'); // 4.65 — passes WCAG AA for normal text (≥4.5)
```

Reject theme submissions that don't meet WCAG AA (4.5:1 for normal text, 3:1 for large text) — or warn the user. Don't silently let an admin paint the portal in unreadable colors.

---

## Keyboard Testing Checklist

Quick manual pass before shipping:

- [ ] Tab through every interactive element in document order. No skips, no traps.
- [ ] Skip-to-content link appears on first Tab.
- [ ] Focus indicator is visible everywhere (`:focus-visible` styles set).
- [ ] Escape closes modals and returns focus to the trigger.
- [ ] Enter / Space activates buttons; Space toggles checkboxes.
- [ ] Arrow keys move within radio groups, comboboxes, and tab panels.
- [ ] After a route change, focus lands on `<main>` (or a heading) — not on `<body>`.
- [ ] Toasts and errors are announced (test with VoiceOver / NVDA / Narrator).
- [ ] Form submission errors move focus to the error summary.

---

## Automated Testing

Use `@axe-core/react` in dev and `vitest-axe` in tests:

```js
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('home page has no axe violations', async () => {
  const { container } = render(<Home />);
  expect(await axe(container)).toHaveNoViolations();
});
```

Axe catches the common errors (missing labels, low contrast in test fixtures, missing `lang` attribute) but does NOT catch focus management, keyboard navigation, or live-region announcements — those still need manual testing. Treat axe as a baseline, not a full audit.

---

## What CoreForm-Generated Markup Lacks

When you render `<CoreForm>`, the platform produces field markup that mostly works with screen readers but has known gaps:

- **Field groups (sections) aren't always `<fieldset>` + `<legend>`.** Screen readers may not group related fields. Workaround: use form-engine `section` titles which render as headings, and rely on those for grouping context.
- **Required indicators may be visual-only.** A red asterisk without `aria-required="true"` on the input is invisible to assistive tech. Audit your forms with a screen reader.
- **Custom widgets need their own ARIA.** When you register a widget via `bundle.widgets.X`, the widget container's accessibility is on you — CoreForm doesn't enforce anything.

If you find a specific CoreForm accessibility gap, file it with the platform team — these are platform-layer fixes, not portal-layer.

---

## Related Skills

- `front-end/bootstrap` — Loading/Error/ConfirmationModal stubs that this skill upgrades.
- `front-end/state` — toast and theme actions that need contrast checks.
- `front-end/forms` — CoreForm specifics, including what to override accessibility-wise.
- `front-end/testing` — automated a11y testing patterns (axe integration).
