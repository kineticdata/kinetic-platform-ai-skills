// Domain types for the Kinetic Platform Core API v1.
//
// Mirrors what `concepts/api-basics` and the per-resource skills document.
// Conservative typing — most "extras" are kept optional because the API
// returns properties only when explicitly requested via `?include=...`.

export type CoreState = 'Draft' | 'Submitted' | 'Closed';

export interface KineticError {
  error?: string;            // Most common — top-level string
  errorKey?: string;         // Programmatic key (e.g. 'uniqueness_violation')
  statusCode?: number;
  correlationId?: string;
}

// --- Submissions -----------------------------------------------------------

export interface Submission {
  id: string;
  handle: string;
  coreState: CoreState;
  currentPage?: string;
  displayedPage?: { index: number; name: string; type: string };
  label?: string;
  origin?: string | null;
  parent?: string | null;
  sessionToken?: string | null;
  type?: string;

  // With include=values
  values?: Record<string, string | string[] | null>;

  // With include=details
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  submittedAt?: string;
  submittedBy?: string;
  closedAt?: string;
  closedBy?: string;

  // With include=form / include=form.fields
  form?: Form;

  // With include=activities[.details]
  activities?: SubmissionActivity[];

  // With include=children / descendants / parent / origin
  children?: Submission[];
  descendants?: Submission[];
  parentSubmission?: Submission;
  originSubmission?: Submission;

  // With include=authorization
  authorization?: { Access?: boolean; Modification?: boolean; Support?: boolean };
}

export interface SubmissionActivity {
  type: string;
  label: string;
  description?: string;
  data?: unknown;
  createdAt?: string;
  createdBy?: string;
}

// --- Forms -----------------------------------------------------------------

export interface Form {
  name: string;
  slug: string;
  status: 'Active' | 'Inactive' | 'Delete';
  type?: string;
  anonymous?: boolean;
  description?: string | null;
  submissionLabelExpression?: string | null;

  // With include=fields
  pages?: FormPage[];
  fields?: FormField[];

  // With include=indexDefinitions
  indexDefinitions?: FormIndex[];

  // With include=attributes / attributesMap
  attributes?: Array<{ name: string; values: string[] }>;
  attributesMap?: Record<string, string[]>;

  // With include=categorizations
  categorizations?: Array<{ category: { slug: string; name?: string } }>;

  // With include=details
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface FormPage {
  name: string;
  type: 'page' | 'confirmation';
  renderType?: 'submittable' | 'review' | 'display';
  events?: FormEvent[];
  elements?: FormElement[];
}

export type FormElement = FormField | FormSection | FormButton | FormContent;

export interface FormField {
  type: 'field';
  name: string;
  key?: string;
  renderType: string;
  dataType: 'string' | 'file' | string;
  label?: string;
  required?: boolean;
  enabled?: boolean;
  visible?: boolean;
  defaultValue?: string | null;
  defaultDataSource?: 'none' | 'custom' | 'integration';
  choices?: Array<{ label: string; value: string }>;
  choicesDataSource?: 'custom' | 'integration';
  choicesRunIf?: string | null;
  choicesResourceName?: string | null;
  constraints?: Array<{ message: string; expression: string }>;
  events?: FormEvent[];
  rows?: number;
  renderAttributes?: Record<string, string>;
  helpText?: string | null;
  omitWhenHidden?: boolean | null;
  pattern?: null | { regex: string; message: string };
}

export interface FormSection {
  type: 'section';
  name: string;
  title?: string;
  visible?: boolean;
  omitWhenHidden?: boolean | null;
  renderAttributes?: Record<string, string>;
  elements: FormElement[];
}

export interface FormButton {
  type: 'button';
  renderType: string;
  name: string;
  label?: string;
  visible?: boolean;
  enabled?: boolean;
  renderAttributes?: Record<string, string>;
}

export interface FormContent {
  type: 'content';
  name: string;
  renderType?: string;
  value?: string;
  visible?: boolean;
}

export interface FormEvent {
  name?: string;
  type: 'Load' | 'Submit' | 'Change' | 'Click';
  action: string;          // expression string OR JSON for some action types
  // … project-specific extension
}

export interface FormIndex {
  name: string;
  parts: string[];
  unique: boolean;
  status?: 'New' | 'Building' | 'Built';
}

// --- Kapp / Space ----------------------------------------------------------

export interface Kapp {
  slug: string;
  name: string;
  description?: string | null;
  formTypes?: Array<{ name: string; allowsAnonymous: boolean; status: 'Active' | 'Inactive' }>;
  indexDefinitions?: FormIndex[];
  categories?: Category[];
  attributesMap?: Record<string, string[]>;
  securityPolicies?: Array<{ name: string; endpoint: string }>;
  loginPage?: string | null;
  displayType?: string;
  displayValue?: string;
  forms?: Form[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface Space {
  name: string;
  slug?: string;
  attributesMap?: Record<string, string[]>;
  kapps?: Kapp[];
  oauthSigningKey?: string;
  // include=details
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  slug: string;
  name: string;
  attributesMap?: Record<string, string[]>;
}

// --- Users / Teams ---------------------------------------------------------

export interface User {
  username: string;
  displayName?: string | null;
  email?: string;
  spaceAdmin?: boolean;
  enabled?: boolean;
  allowedIps?: string | null;
  attributesMap?: Record<string, string[]>;
  profileAttributesMap?: Record<string, string[]>;
  memberships?: Array<{ team: { name: string; slug: string } }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Team {
  name: string;
  slug: string;
  description?: string;
  attributesMap?: Record<string, string[]>;
  memberships?: Array<{ user: { username: string } }>;
}

// --- KQL helper types ------------------------------------------------------

export type KqlValue = string | number | boolean | null;

export interface KqlSearchParams {
  q?: string;
  limit?: number;
  pageToken?: string;
  orderBy?: string;
  direction?: 'ASC' | 'DESC';
  include?: string;
  coreState?: CoreState;
}
