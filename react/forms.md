# Forms and Widgets (CoreForm / KineticForm)

## KineticForm — Standard Wrapper

`KineticForm` wraps `CoreForm` to standardize form behavior across the portal. Use it for all standard request flows instead of raw `CoreForm`.

```jsx
// portal/src/components/kinetic-form/KineticForm.jsx
import { memo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CoreForm } from '@kineticdata/react';
import { valuesFromQueryParams } from '../../helpers/index.js';
import { toastSuccess } from '../../helpers/toasts.js';

export const KineticForm = memo(
  ({ kappSlug, formSlug, submissionId, values, components = {}, ...props }) => {
    const [searchParams] = useSearchParams();
    const paramFieldValues = valuesFromQueryParams(searchParams);
    const navigate = useNavigate();

    const handleCreated = useCallback(
      response => {
        // Redirect to route with submission id if submission is not submitted or
        // there is a confirmation page to render.
        if (
          response.submission.coreState !== 'Submitted' ||
          response.submission?.displayedPage?.type === 'confirmation'
        ) {
          navigate(response.submission.id, { state: { persistToasts: true } });
        }
        if (response.submission.coreState === 'Draft') {
          toastSuccess({ title: 'Saved successfully.' });
        }
      },
      [navigate],
    );

    const handleUpdated = useCallback(response => {
      if (response.submission.coreState === 'Draft') {
        toastSuccess({ title: 'Saved successfully.' });
      }
    }, []);

    return (
      <CoreForm
        submission={submissionId}
        kapp={kappSlug}
        form={formSlug}
        values={values || paramFieldValues}
        components={{ Pending, ReviewPaginationControl, ...components }}
        created={handleCreated}
        updated={handleUpdated}
        {...props}
      />
    );
  },
);
```

**Key behaviors:**
- Merges URL query params (`values[Field Name]=...`) into form field values via `valuesFromQueryParams`
- On `created`: navigates to `submissionId` route (with `persistToasts: true`) unless submitted without confirmation; shows toast for Draft saves
- On `updated`: shows toast for Draft saves
- Injects `Pending` (loading spinner) and `ReviewPaginationControl` (page nav) as default components
- Caller can override or extend components via the `components` prop

---

## generateFormLayout — Layout Factory

`generateFormLayout` produces a `Layout` component to pass to `CoreForm` via `components={{ Layout }}`. It wraps the form in a standard heading/icon/back-button shell.

```jsx
// portal/src/components/forms/FormLayout.jsx
export const generateFormLayout = ({
  actionComponent: Action,
  headingComponent: Heading,
  backTo,
} = {}) => {
  const FormLayout = ({ form, submission, content, reviewPaginationControl }) => {
    const spaceAdmin = useSelector(state => state.app.profile?.spaceAdmin);
    const location = useLocation();
    const backPath = location.state?.backPath;
    const icon = getAttributeValue(form, 'Icon', 'forms');

    return (
      <div className="gutter">
        <div className="max-w-screen-lg mx-auto pt-1 pb-6">
          <PageHeading
            title={form?.name}
            before={<div className="icon-box-lg"><Icon name={form ? icon : 'blank'} /></div>}
            after={
              form && spaceAdmin && (
                <a href={`/app/console#/kapps/${form.kapp?.slug}/forms/edit/${form.slug}/general`}
                   target="_blank" rel="noreferrer">
                  <Icon name="settings-share" size={20} />
                </a>
              )
            }
          >
            <span className="ml-auto">
              {Action && <Action form={form} submission={submission} backTo={backTo || backPath} />}
            </span>
          </PageHeading>
          {form && Heading && (
            <div className="mb-6">
              <Heading form={form} submission={submission} backTo={backTo || backPath} />
            </div>
          )}
          <div className="rounded-box md:border md:p-8 flex-c-st gap-6">
            {content}
            {reviewPaginationControl}
          </div>
        </div>
      </div>
    );
  };
  return FormLayout;
};
```

**Usage:**
```jsx
const Layout = generateFormLayout({
  actionComponent: DeleteDraftButton,
  backTo: '/requests',
});

<KineticForm
  kappSlug={kappSlug}
  formSlug={formSlug}
  components={{ Layout }}
/>
```

**Options:**
- `actionComponent` — rendered in the top-right of the heading; receives `{ form, submission, backTo }`
- `headingComponent` — rendered below the heading row; receives same props
- `backTo` — overrides the back button path (falls back to `location.state?.backPath`)

---

## CoreForm — Direct Usage

Use raw `CoreForm` when you need full control (datastore admin, review mode, public forms):

```jsx
// Datastore admin — full CRUD handlers
<CoreForm
  kapp={kappSlug}
  form={formSlug}
  submission={submissionId}
  created={({ submission }) => { setSubmissionId(submission.id); reload(); }}
  updated={reload}
  completed={reload}
  components={{ Layout: TableComponent }}
/>

// Review mode — when submission is not a Draft
<CoreForm
  kapp={kappSlug}
  form={formSlug}
  submission={submissionId}
  review={submission.coreState !== 'Draft'}
  components={{ Layout }}
/>

// Public (unauthenticated) form — e.g. account creation
<CoreForm
  kapp={kappSlug}
  form="create-account"
  public={true}
  created={handleCreated}
  components={{ Layout }}
/>
```

**CoreForm prop reference:**
| Prop | Description |
|------|-------------|
| `kapp` | kapp slug |
| `form` | form slug (for new submissions) |
| `submission` | submission ID (to load existing) |
| `values` | `{ 'Field Name': value }` map to pre-populate fields |
| `public` | `true` to load without authentication |
| `review` | `true` to render in read-only review mode |
| `created` | Callback after submission created; receives `{ submission }` |
| `updated` | Callback after submission updated; receives `{ submission }` |
| `completed` | Callback after submission submitted |
| `components` | Object overriding `{ Layout, Pending, ReviewPaginationControl }` |

---

## globals.jsx — Form Environment Setup

`globals.jsx` is async-imported in `index.jsx` and passed to `KineticLib` via the `globals` prop. It sets up the global environment for embedded Kinetic forms before any form renders.

```jsx
// portal/src/components/kinetic-form/globals.jsx
import jquery from 'jquery';
import moment from 'moment';
import { format } from 'date-fns';
import { utc } from '@date-fns/utc';

// Required for Kinetic forms that use jQuery AJAX
jquery.ajaxSetup({ xhrFields: { withCredentials: true } });
window.$ = jquery;
window.jQuery = jquery;
window.moment = moment;

// Register custom widgets
import './widgets/widgets.js';

// Register custom date/datetime/time pickers
window.bundle = window.bundle || {};
window.bundle.config = window.bundle.config || {};
window.bundle.config.fields = {
  date:     { render: renderDateTimePickers },
  datetime: { render: renderDateTimePickers },
  time:     { render: renderDateTimePickers },
};
```

**Date/datetime picker pattern:**

The `renderDateTimePickers` function replaces the Kinetic form's raw text input with a native `<input type="date|datetime-local|time">` picker while keeping the hidden original input as the source of truth (using ISO format for `datetime`):

- Hides the original input; clones it as a visible picker
- Converts between display format (`yyyy-MM-dd'T'HH:mm`) and stored ISO format (`yyyy-MM-dd'T'HH:mm:ssxxx`) for `datetime` fields
- Delays change events during keyboard input (fires on `blur` instead)
- Syncs picker → field on `change`; field → picker on `field.on('change')` (for API-driven updates)
- Extends `field.enable`/`field.disable` to also affect the picker element

---

## Widget System

Widgets are standalone React apps rendered inside Kinetic forms. They run in their own React root with no connection to the portal app.

### `registerWidget` — Widget Factory

```js
// portal/src/components/kinetic-form/widgets/index.js
export const registerWidget = (Widget, { container, Component, props, id }) => {
  // Returns existing instance if container already has a widget
  let key = container.getAttribute('data-widget-key');
  if (key) return Widget?.instances?.[id || key];

  key = generateKey();
  container.setAttribute('data-widget-key', key);

  // One-time MutationObserver setup: cleans up unmounted widgets
  if (!registry.init) {
    const observer = new MutationObserver(() =>
      Object.values(registry).filter(fn => typeof fn === 'function').forEach(fn => fn())
    );
    observer.observe(document.body, { childList: true, subtree: true });
    registry.init = true;
  }

  return new Promise(resolve => {
    const root = createRoot(container);
    root.render(
      <HashRouter>
        <Component
          {...props}
          ref={el => { /* mounts/unmounts API, stores in Widget.instances */ }}
          destroy={() => callIfFn(state.api.destroy)}
        />
      </HashRouter>
    );
  });
};
```

**`WidgetAPI` class component** — wrap widget content in this to expose an API object via `ref`:

```jsx
export class WidgetAPI extends React.Component {
  constructor(props) {
    super(props);
    this.api = props.api;  // Mutable object that becomes the widget's public API
  }
  render() { return this.props.children; }
}
```

**Validation helpers:**
```js
validateContainer(container, widgetName)  // checks instanceof HTMLElement
validateField(field, type, widgetName)    // checks field.constructor.name === 'Field'
validateForm(form, widgetName)            // checks form.constructor.name === 'Form'
```

### Registered Widgets

Widgets are registered into `bundle.widgets` in `widgets/widgets.js`, each with an `instances` map and `get(id)` accessor:

| Widget | Description |
|--------|-------------|
| `Markdown` | Rich text markdown editor/viewer |
| `Search` | Type-ahead search field |
| `Signature` | Signature capture field |
| `Subform` | Embedded sub-form renderer |
| `Table` | Tabular data display |

**Usage from Kinetic form JS:**
```js
// In a form's event or custom JS
bundle.widgets.Search.render({ container, field, kappSlug, formSlug });
const instance = bundle.widgets.Search.get(widgetId);
instance.destroy();
```
