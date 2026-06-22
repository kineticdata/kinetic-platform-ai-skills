// Hand-authored type declarations for @kineticdata/react.
//
// The library ships as plain JS. This file declares the subset of exports the
// reference TypeScript portal uses, with the response shapes documented in
// `skills/concepts/api-basics` and the per-resource skills.
//
// Extend as you call additional exports. Keep the response shapes synchronized
// with `src/types/kinetic.ts` — the helpers below reuse those types.

declare module '@kineticdata/react' {
  import type { ReactNode } from 'react';
  import type {
    Submission, Form, Kapp, Space, User, Team, Category,
    KineticError,
  } from './kinetic';

  // --- Wrapper component & globals ------------------------------------------

  export interface KineticLibProps {
    children: ReactNode | ((ctx: KineticLibContext) => ReactNode);
    render?: (ctx: KineticLibContext) => ReactNode;
    locale?: string;
  }
  export interface KineticLibContext {
    initialized: boolean;
    loggedIn: boolean;
    loginProps: LoginProps;
    timedOut?: boolean;
    serverError?: KineticError | null;
  }
  export interface LoginProps {
    onLogin?: (creds: { username: string; password: string }) => Promise<void>;
    onLogout?: () => Promise<void>;
    // Additional fields the SDK passes; cast to any for project-specific extension
    [key: string]: unknown;
  }
  export const KineticLib: (props: KineticLibProps) => JSX.Element;

  export const bundle: {
    apiLocation(): string;
    spaceLocation(): string;
    widgets?: Record<string, unknown>;
  };

  export function getCsrfToken(): string;

  // --- CoreForm -------------------------------------------------------------

  export interface CoreFormProps {
    kapp: string;
    form: string;
    submission?: string;
    values?: Record<string, string | string[] | null>;
    review?: boolean;
    public?: boolean;
    created?: (response: { submission: Submission }) => void;
    updated?: (response: { submission: Submission }) => void;
    completed?: (response: { submission: Submission }) => void;
    error?: (err: KineticError) => void;
    components?: Record<string, unknown>;
  }
  export const CoreForm: (props: CoreFormProps) => JSX.Element;

  // --- Fetch helpers --------------------------------------------------------
  // Return `{ <resource>, error? }` shape — fetch functions do NOT reject on HTTP errors;
  // they resolve with `error: <KineticError>`.

  export interface FetchSubmissionParams {
    id: string;
    include?: string;
    [key: string]: unknown;
  }
  export function fetchSubmission(p: FetchSubmissionParams): Promise<{
    submission?: Submission;
    error?: KineticError;
  }>;

  export interface FetchSubmissionsParams {
    kappSlug: string;
    formSlug?: string;
    q?: string;
    limit?: number;
    pageToken?: string;
    orderBy?: string;
    direction?: 'ASC' | 'DESC';
    include?: string;
    coreState?: 'Draft' | 'Submitted' | 'Closed';
    [key: string]: unknown;
  }
  export function fetchSubmissions(p: FetchSubmissionsParams): Promise<{
    submissions?: Submission[];
    nextPageToken?: string | null;
    error?: KineticError;
  }>;
  export const searchSubmissions: typeof fetchSubmissions;

  export interface CreateSubmissionParams {
    kappSlug: string;
    formSlug: string;
    values: Record<string, string | string[] | null>;
    completed?: boolean;
    coreState?: 'Draft' | 'Submitted' | 'Closed';
    public?: boolean;
    include?: string;
  }
  export function createSubmission(p: CreateSubmissionParams): Promise<{
    submission?: Submission;
    error?: KineticError;
  }>;

  export interface UpdateSubmissionParams {
    id: string;
    values?: Record<string, string | string[] | null>;
    include?: string;
    // coreState is NOT honored on update — only CoreForm transitions it.
  }
  export function updateSubmission(p: UpdateSubmissionParams): Promise<{
    submission?: Submission;
    error?: KineticError;
  }>;

  export function deleteSubmission(p: { id: string }): Promise<{
    submission?: Submission;
    error?: KineticError;
  }>;

  export function saveSubmissionMultipart(p: {
    kappSlug: string;
    formSlug: string;
    submissionId?: string;
    values: Record<string, string | string[] | null>;
    files: Record<string, File | File[]>;
    coreState?: 'Draft' | 'Submitted' | 'Closed';
  }): Promise<{ submission?: Submission; error?: KineticError }>;

  export function fetchSpace(p?: {
    include?: string;
    public?: boolean;
  }): Promise<{ space?: Space; error?: KineticError }>;

  export function updateSpace(p: {
    space: Partial<Space>;
  }): Promise<{ space?: Space; error?: KineticError }>;

  export function fetchProfile(p?: { include?: string }): Promise<{
    profile?: User;
    error?: KineticError;
  }>;

  export function updateProfile(p: { profile: Partial<User> }): Promise<{
    profile?: User;
    error?: KineticError;
  }>;

  export function fetchKapp(p: { kappSlug: string; include?: string }): Promise<{
    kapp?: Kapp;
    error?: KineticError;
  }>;

  export function updateKapp(p: {
    kappSlug: string;
    kapp: Partial<Kapp>;
  }): Promise<{ kapp?: Kapp; error?: KineticError }>;

  export function fetchForms(p: { kappSlug: string; include?: string }): Promise<{
    forms?: Form[];
    error?: KineticError;
  }>;

  export function fetchForm(p: {
    kappSlug: string;
    formSlug: string;
    include?: string;
  }): Promise<{ form?: Form; error?: KineticError }>;

  export function fetchCategories(p: {
    kappSlug: string;
    include?: string;
  }): Promise<{ categories?: Category[]; error?: KineticError }>;

  export function fetchUsers(p?: {
    q?: string;
    limit?: number;
    pageToken?: string;
    include?: string;
  }): Promise<{
    users?: User[];
    nextPageToken?: string | null;
    error?: KineticError;
  }>;

  export function fetchTeams(p?: {
    q?: string;
    include?: string;
  }): Promise<{ teams?: Team[]; error?: KineticError }>;

  // --- KQL builder ----------------------------------------------------------

  export interface KqlQueryBuilder {
    equals(field: string, valueRef: string): KqlQueryBuilder;
    in(field: string, valueRef: string): KqlQueryBuilder;
    or(): KqlQueryBuilder;
    end(): (params: Record<string, unknown>) => string;
  }
  export function defineKqlQuery(): KqlQueryBuilder;
}
