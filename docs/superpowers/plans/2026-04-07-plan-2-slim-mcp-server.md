# Slim MCP Server — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new Kinetic Platform MCP server with ~12 high-level tools that replaces the existing 559-tool management MCP. Uses `get_api_spec` + `execute_api` pattern so AI constructs API calls from OpenAPI spec knowledge instead of selecting from hundreds of tools.

**Architecture:** TypeScript MCP server using `@modelcontextprotocol/sdk`. Reuses the existing auth patterns (Basic Auth, OAuth 2.0, self-signed certs) from the current mgmt MCP. Serves OpenAPI spec slices via `get_api_spec` and executes arbitrary API calls via `execute_api`. Discovery tools provide platform-aware context. Validation tools catch common mistakes before deployment.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, `zod`, `express` (for HTTP transport), Node.js 18+

**Design Spec:** `docs/superpowers/specs/2026-04-07-ai-knowledge-distribution-design.md`

**Note:** This server lives in a NEW repository (`kinetic-platform-mcp`), replacing `kinetic-platform-mgnt-mcp`. Reference the existing mgmt MCP code at `/Users/jamesdavies/dev/mcps/kinetic-platform-mgnt-mcp` for auth patterns.

---

## File Structure

All paths below are relative to the new `kinetic-platform-mcp` repository root.

### Files to Create

```
kinetic-platform-mcp/
├── package.json
├── tsconfig.json
├── .gitignore
├── README.md
├── oas/
│   ├── core.json                    # Copied from existing mgmt MCP
│   └── integrator.json              # Copied from existing mgmt MCP
│   └── task.json                    # Obtain from platform team
├── src/
│   ├── index.ts                     # Entry point — transport setup (stdio/HTTP)
│   ├── server.ts                    # MCP server setup, session management, tool registration
│   ├── client/
│   │   └── kinetic-client.ts        # HTTP client with Basic Auth and OAuth 2.0 support
│   ├── tools/
│   │   ├── connect.ts               # connect tool
│   │   ├── discover.ts              # discover_space, discover_kapp, discover_form tools
│   │   ├── api-spec.ts              # get_api_spec tool
│   │   ├── execute.ts               # execute_api tool
│   │   ├── search.ts                # search_submissions, get_submission tools
│   │   └── validate.ts              # validate_form, validate_workflow tools
│   └── util/
│       ├── spec-parser.ts           # OpenAPI spec slicing and formatting
│       └── types.ts                 # Shared TypeScript types
└── tests/
    ├── tools/
    │   ├── connect.test.ts
    │   ├── discover.test.ts
    │   ├── api-spec.test.ts
    │   ├── execute.test.ts
    │   ├── search.test.ts
    │   └── validate.test.ts
    └── util/
        └── spec-parser.test.ts
```

---

### Task 1: Initialize the Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `README.md`

- [ ] **Step 1: Create the repository and initialize**

```bash
mkdir kinetic-platform-mcp && cd kinetic-platform-mcp
git init
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "@kineticdata/platform-mcp",
  "version": "1.0.0",
  "description": "Kinetic Platform MCP server — slim gateway with discovery, API spec serving, and generic API execution",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "kinetic-platform-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js",
    "start:stdio": "node dist/index.js --stdio",
    "start:http": "node dist/index.js --http",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.26.0",
    "express": "^4.19.2",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  },
  "engines": {
    "node": ">=18"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "resolveJsonModule": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
*.tgz
.env
```

- [ ] **Step 5: Install dependencies**

```bash
npm install
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: initialize kinetic-platform-mcp project"
```

---

### Task 2: Copy OpenAPI Specs

**Files:**
- Create: `oas/core.json`, `oas/integrator.json`

- [ ] **Step 1: Copy specs from existing mgmt MCP**

```bash
mkdir -p oas
cp /Users/jamesdavies/dev/mcps/kinetic-platform-mgnt-mcp/oas/core.json oas/core.json
cp /Users/jamesdavies/dev/mcps/kinetic-platform-mgnt-mcp/oas/integrator.json oas/integrator.json
```

- [ ] **Step 2: Add a placeholder for the Task API spec**

Create `oas/task.json` with a minimal placeholder:

```json
{
  "openapi": "3.0.2",
  "info": {
    "title": "Kinetic Task REST API",
    "version": "2.0.0",
    "description": "Placeholder — replace with actual Task API spec"
  },
  "paths": {}
}
```

- [ ] **Step 3: Commit**

```bash
git add oas/
git commit -m "chore: add OpenAPI specs for Core, Integrator, and Task APIs"
```

---

### Task 3: Build the HTTP Client

**Files:**
- Create: `src/client/kinetic-client.ts`
- Test: `tests/tools/connect.test.ts` (tested via connect tool in Task 5)

- [ ] **Step 1: Write the shared types**

Create `src/util/types.ts`:

```typescript
export type KineticApi = 'core' | 'integrator' | 'task';

export interface KineticConfig {
  serverUrl: string;
  username: string;
  password: string;
  agentSlug?: string;
}

/**
 * Session stores config and a map of API surface → client instance.
 * The client type is `any` here to avoid circular imports — the server module
 * manages the actual KineticApiClient instances.
 */
export interface KineticSession {
  config: KineticConfig;
  clients: Map<KineticApi, unknown>;
  oauthToken?: { token: string; expiresAt: number };
}

export type SessionId = string;
```

- [ ] **Step 2: Write the HTTP client**

Create `src/client/kinetic-client.ts`:

```typescript
import type { KineticApi } from '../util/types.js';

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  body?: unknown;
}

export class KineticApiClient {
  private baseUrl: string;
  private authHeader: string;

  private constructor(baseUrl: string, authHeader: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.authHeader = authHeader;
  }

  static withBasicAuth(baseUrl: string, username: string, password: string): KineticApiClient {
    const header = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    return new KineticApiClient(baseUrl, header);
  }

  static withBearerToken(baseUrl: string, token: string): KineticApiClient {
    return new KineticApiClient(baseUrl, `Bearer ${token}`);
  }

  async request(method: string, path: string, options?: RequestOptions): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (options?.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const hasBody = options?.body !== undefined && method !== 'GET' && method !== 'HEAD';

    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...(options?.headers ?? {}),
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      const message = typeof data === 'object' && data !== null && 'error' in data
        ? JSON.stringify((data as { error: unknown }).error)
        : text;
      throw new Error(`HTTP ${response.status}: ${message}`);
    }

    return data;
  }
}

export async function obtainOAuthToken(
  serverUrl: string,
  username: string,
  password: string,
): Promise<{ token: string; expiresAt: number }> {
  const authUrl = `${serverUrl.replace(/\/+$/, '')}/app/oauth/authorize?grant_type=implicit&response_type=token&client_id=system`;
  const basicAuth = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

  const response = await fetch(authUrl, {
    method: 'GET',
    headers: { Authorization: basicAuth },
    redirect: 'manual',
  });

  const location = response.headers.get('location');
  if (!location) {
    throw new Error('OAuth: no redirect location in response');
  }

  const fragment = location.split('#')[1];
  if (!fragment) {
    throw new Error('OAuth: no fragment in redirect URL');
  }

  const params = new URLSearchParams(fragment);
  const token = params.get('access_token');
  if (!token) {
    throw new Error('OAuth: no access_token in response');
  }

  const expiresIn = parseInt(params.get('expires_in') ?? '43200', 10);
  const expiresAt = Date.now() + (expiresIn - 30) * 1000;

  return { token, expiresAt };
}

/** Path prefixes for each API surface, relative to the space base URL */
const API_PATHS: Record<KineticApi, string> = {
  core: '/app/api/v1',
  task: '/app/components/task/app/api/v2',
  integrator: '/app/components/integrator/app/api/v1',
};

export function getApiBasePath(api: KineticApi): string {
  return API_PATHS[api];
}
```

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "feat: add HTTP client with Basic Auth and OAuth 2.0 support"
```

---

### Task 4: Build the OpenAPI Spec Parser

**Files:**
- Create: `src/util/spec-parser.ts`
- Test: `tests/util/spec-parser.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/util/spec-parser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { sliceSpecByDomain, formatSpecSlice } from '../src/util/spec-parser.js';

const sampleSpec = {
  openapi: '3.0.2',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/kapps/{kappSlug}/forms': {
      get: { operationId: 'getForms', summary: 'List forms in a kapp' },
      post: { operationId: 'createForm', summary: 'Create a new form' },
    },
    '/kapps/{kappSlug}/forms/{formSlug}': {
      get: { operationId: 'getForm', summary: 'Get a form by slug' },
      put: { operationId: 'updateForm', summary: 'Update a form' },
      delete: { operationId: 'deleteForm', summary: 'Delete a form' },
    },
    '/kapps/{kappSlug}/forms/{formSlug}/fields': {
      get: { operationId: 'getFormFields', summary: 'List fields on a form' },
      post: { operationId: 'createField', summary: 'Add a field to a form' },
    },
    '/submissions/{submissionId}': {
      get: { operationId: 'getSubmission', summary: 'Get a submission' },
      patch: { operationId: 'updateSubmission', summary: 'Update a submission' },
    },
    '/users': {
      get: { operationId: 'getUsers', summary: 'List users' },
    },
  },
};

describe('sliceSpecByDomain', () => {
  it('returns form-related paths for "forms" domain', () => {
    const slice = sliceSpecByDomain(sampleSpec, 'forms');
    expect(Object.keys(slice.paths)).toContain('/kapps/{kappSlug}/forms');
    expect(Object.keys(slice.paths)).toContain('/kapps/{kappSlug}/forms/{formSlug}');
    expect(Object.keys(slice.paths)).toContain('/kapps/{kappSlug}/forms/{formSlug}/fields');
    expect(Object.keys(slice.paths)).not.toContain('/users');
  });

  it('returns submission-related paths for "submissions" domain', () => {
    const slice = sliceSpecByDomain(sampleSpec, 'submissions');
    expect(Object.keys(slice.paths)).toContain('/submissions/{submissionId}');
    expect(Object.keys(slice.paths)).not.toContain('/users');
  });

  it('returns empty paths for unknown domain', () => {
    const slice = sliceSpecByDomain(sampleSpec, 'widgets');
    expect(Object.keys(slice.paths)).toHaveLength(0);
  });
});

describe('formatSpecSlice', () => {
  it('produces readable markdown', () => {
    const slice = sliceSpecByDomain(sampleSpec, 'forms');
    const md = formatSpecSlice(slice, 'forms');
    expect(md).toContain('## forms');
    expect(md).toContain('GET');
    expect(md).toContain('POST');
    expect(md).toContain('/kapps/{kappSlug}/forms');
    expect(md).toContain('List forms in a kapp');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/util/spec-parser.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the spec parser**

Create `src/util/spec-parser.ts`:

```typescript
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface OasSpec {
  openapi: string;
  info: { title: string; version: string; description?: string };
  paths: Record<string, Record<string, OasOperation>>;
  components?: unknown;
}

export interface OasOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: Array<{
    name: string;
    in: string;
    required?: boolean;
    description?: string;
    schema?: { type?: string };
  }>;
  requestBody?: {
    description?: string;
    content?: Record<string, { schema?: unknown }>;
  };
  responses?: Record<string, unknown>;
}

/** Domain-to-path-keyword mapping */
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  forms: ['forms', 'fields', 'indexDefinitions'],
  submissions: ['submissions'],
  kapps: ['kapps'],
  spaces: ['space', 'activity'],
  users: ['users'],
  teams: ['teams'],
  workflows: ['trees', 'runs', 'nodes', 'routines', 'handlers', 'engines'],
  webhooks: ['webhooks'],
  webapis: ['webApis'],
  security: ['securityPolicies', 'securityPolicyDefinitions'],
  connections: ['connections'],
  operations: ['operations'],
  categories: ['categories'],
  attributes: ['attributeDefinitions'],
  bridges: ['bridgedResources', 'bridges'],
};

/**
 * Slice an OpenAPI spec to include only paths matching a domain keyword.
 */
export function sliceSpecByDomain(spec: OasSpec, domain: string): OasSpec {
  const keywords = DOMAIN_KEYWORDS[domain.toLowerCase()] ?? [domain.toLowerCase()];

  const matchedPaths: Record<string, Record<string, OasOperation>> = {};

  for (const [path, methods] of Object.entries(spec.paths)) {
    const pathSegments = path.toLowerCase().split('/');
    if (keywords.some(kw => pathSegments.some(seg => seg.includes(kw.toLowerCase())))) {
      matchedPaths[path] = methods;
    }
  }

  return {
    openapi: spec.openapi,
    info: spec.info,
    paths: matchedPaths,
  };
}

/**
 * Format a spec slice as readable markdown for AI consumption.
 */
export function formatSpecSlice(slice: OasSpec, domain: string): string {
  const lines: string[] = [];

  lines.push(`## ${domain}`);
  lines.push('');
  lines.push(`Source: ${slice.info.title} v${slice.info.version}`);
  lines.push('');

  for (const [path, methods] of Object.entries(slice.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (method === 'parameters') continue; // Skip shared params
      const httpMethod = method.toUpperCase();
      const summary = op.summary ?? op.description ?? '';
      const opId = op.operationId ? ` (${op.operationId})` : '';

      lines.push(`### ${httpMethod} ${path}${opId}`);
      if (summary) lines.push(`${summary}`);
      lines.push('');

      // Parameters
      if (op.parameters && op.parameters.length > 0) {
        lines.push('**Parameters:**');
        for (const param of op.parameters) {
          const req = param.required ? ' (required)' : '';
          const desc = param.description ? ` — ${param.description}` : '';
          lines.push(`- \`${param.name}\` (${param.in})${req}${desc}`);
        }
        lines.push('');
      }

      // Request body
      if (op.requestBody) {
        lines.push('**Request body:** ' + (op.requestBody.description ?? 'JSON'));
        lines.push('');
      }
    }
  }

  if (Object.keys(slice.paths).length === 0) {
    lines.push(`No endpoints found matching domain "${domain}".`);
    lines.push('');
    lines.push('Available domains: ' + Object.keys(DOMAIN_KEYWORDS).join(', '));
  }

  return lines.join('\n');
}

const specs: Map<string, OasSpec> = new Map();

/**
 * Load an OpenAPI spec from the oas/ directory. Caches on first load.
 */
export function loadSpec(service: string): OasSpec {
  if (specs.has(service)) return specs.get(service)!;

  const specPath = join(__dirname, '..', '..', 'oas', `${service}.json`);
  const raw = readFileSync(specPath, 'utf-8');
  const spec = JSON.parse(raw) as OasSpec;
  specs.set(service, spec);
  return spec;
}

/**
 * List available domains for a given service spec.
 */
export function listDomains(): string[] {
  return Object.keys(DOMAIN_KEYWORDS);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/util/spec-parser.test.ts
```

Expected: PASS — all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/util/spec-parser.ts tests/util/spec-parser.test.ts
git commit -m "feat: add OpenAPI spec parser with domain slicing and markdown formatting"
```

---

### Task 5: Build the Connect Tool

**Files:**
- Create: `src/tools/connect.ts`
- Test: `tests/tools/connect.test.ts`

- [ ] **Step 1: Write the connect tool**

Create `src/tools/connect.ts`:

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { KineticApiClient } from '../client/kinetic-client.js';
import type { KineticSession, SessionId } from '../util/types.js';

export function registerConnectTool(
  server: McpServer,
  sessions: Map<SessionId, KineticSession>,
) {
  server.tool(
    'connect',
    'Connect to a Kinetic Platform space. Required before using discovery or execute_api tools. Credentials can also be set via KINETIC_SERVER_URL, KINETIC_USERNAME, KINETIC_PASSWORD environment variables.',
    {
      serverUrl: z.string().describe('Base URL of the Kinetic Platform (e.g., "https://myspace.kinops.io")'),
      username: z.string().describe('Kinetic Platform username'),
      password: z.string().describe('Kinetic Platform password'),
      agentSlug: z.string().optional().describe('Agent slug for Task API (defaults to "system")'),
    },
    async ({ serverUrl, username, password, agentSlug }, extra) => {
      const sessionId: SessionId = (extra as { sessionId?: string })?.sessionId ?? 'stdio';

      const session: KineticSession = {
        config: {
          serverUrl: serverUrl.replace(/\/+$/, ''),
          username,
          password,
          agentSlug: agentSlug ?? 'system',
        },
        clients: new Map(),
      };

      // Validate credentials by calling /me
      const client = KineticApiClient.withBasicAuth(
        `${session.config.serverUrl}/app/api/v1`,
        username,
        password,
      );
      const me = await client.request('GET', '/me') as Record<string, unknown>;

      session.clients.set('core', client);
      sessions.set(sessionId, session);

      return {
        content: [{
          type: 'text' as const,
          text: `Connected to ${serverUrl}\nAuthenticated as: ${me.username} (${me.displayName})`,
        }],
      };
    },
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/connect.ts
git commit -m "feat: add connect tool for platform authentication"
```

---

### Task 6: Build the Discovery Tools

**Files:**
- Create: `src/tools/discover.ts`

- [ ] **Step 1: Write the discovery tools**

Create `src/tools/discover.ts`:

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { KineticSession, SessionId } from '../util/types.js';
import { getClient } from '../server.js';

export function registerDiscoverTools(
  server: McpServer,
  sessions: Map<SessionId, KineticSession>,
  getClientFn: typeof getClient,
) {
  server.tool(
    'discover_space',
    'Get an overview of the Kinetic Platform space — lists kapps, teams, and space attributes. Use this first to understand what exists on the platform.',
    {},
    async (_params, extra) => {
      const sessionId: SessionId = (extra as { sessionId?: string })?.sessionId ?? 'stdio';
      const client = await getClientFn(sessions, sessionId, 'core');

      const [space, kapps, teams] = await Promise.all([
        client.request('GET', '/space', { query: { include: 'attributes' } }),
        client.request('GET', '/kapps', { query: { include: 'attributes' } }),
        client.request('GET', '/teams'),
      ]);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ space, kapps, teams }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'discover_kapp',
    'Deep-dive into a specific kapp — lists its forms, workflows, categories, and security policies.',
    {
      kappSlug: z.string().describe('The kapp slug to inspect'),
    },
    async ({ kappSlug }, extra) => {
      const sessionId: SessionId = (extra as { sessionId?: string })?.sessionId ?? 'stdio';
      const client = await getClientFn(sessions, sessionId, 'core');

      const [kapp, forms, categories] = await Promise.all([
        client.request('GET', `/kapps/${kappSlug}`, { query: { include: 'attributes' } }),
        client.request('GET', `/kapps/${kappSlug}/forms`, { query: { include: 'attributes,fields' } }),
        client.request('GET', `/kapps/${kappSlug}/categories`).catch(() => ({ categories: [] })),
      ]);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ kapp, forms, categories }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'discover_form',
    'Get the full definition of a form — fields, index definitions, events, and attributes.',
    {
      kappSlug: z.string().describe('The kapp slug containing the form'),
      formSlug: z.string().describe('The form slug to inspect'),
    },
    async ({ kappSlug, formSlug }, extra) => {
      const sessionId: SessionId = (extra as { sessionId?: string })?.sessionId ?? 'stdio';
      const client = await getClientFn(sessions, sessionId, 'core');

      const form = await client.request('GET', `/kapps/${kappSlug}/forms/${formSlug}`, {
        query: { include: 'attributes,fields,indexDefinitions,events' },
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(form, null, 2),
        }],
      };
    },
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/discover.ts
git commit -m "feat: add discovery tools for space, kapp, and form inspection"
```

---

### Task 7: Build the get_api_spec Tool

**Files:**
- Create: `src/tools/api-spec.ts`

- [ ] **Step 1: Write the api-spec tool**

Create `src/tools/api-spec.ts`:

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadSpec, sliceSpecByDomain, formatSpecSlice, listDomains } from '../util/spec-parser.js';

/** Map domains to their relevant skills for conceptual guidance */
const SKILL_POINTERS: Record<string, string> = {
  forms: 'skills/concepts/form-engine/SKILL.md',
  submissions: 'skills/concepts/api-basics/SKILL.md',
  kapps: 'skills/concepts/api-basics/SKILL.md',
  spaces: 'skills/concepts/api-basics/SKILL.md',
  users: 'skills/concepts/users-teams-security/SKILL.md',
  teams: 'skills/concepts/users-teams-security/SKILL.md',
  workflows: 'skills/concepts/workflow-engine/SKILL.md',
  webhooks: 'skills/concepts/webapis-and-webhooks/SKILL.md',
  webapis: 'skills/concepts/webapis-and-webhooks/SKILL.md',
  security: 'skills/concepts/users-teams-security/SKILL.md',
  connections: 'skills/concepts/integrations/SKILL.md',
  operations: 'skills/concepts/integrations/SKILL.md',
  categories: 'skills/concepts/api-basics/SKILL.md',
  attributes: 'skills/concepts/api-basics/SKILL.md',
  bridges: 'skills/concepts/integrations/SKILL.md',
};

export function registerApiSpecTool(server: McpServer) {
  server.tool(
    'get_api_spec',
    'Return a formatted slice of the Kinetic Platform OpenAPI spec for a given domain (e.g., "forms", "submissions", "workflows"). Shows endpoints, methods, parameters, and response shapes. Use this to understand the exact API calls needed before using execute_api.',
    {
      domain: z.string().describe(
        `The domain to retrieve. Available: ${listDomains().join(', ')}`,
      ),
      service: z
        .enum(['core', 'integrator', 'task'])
        .default('core')
        .describe('Which API service to query (default: core)'),
    },
    async ({ domain, service }) => {
      const spec = loadSpec(service);
      const slice = sliceSpecByDomain(spec, domain);
      const markdown = formatSpecSlice(slice, domain);

      const skillPointer = SKILL_POINTERS[domain.toLowerCase()];
      const guidance = skillPointer
        ? `\n\n---\n**For conceptual guidance on when and why to use these endpoints, read:** \`${skillPointer}\``
        : '';

      return {
        content: [{
          type: 'text' as const,
          text: markdown + guidance,
        }],
      };
    },
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/api-spec.ts
git commit -m "feat: add get_api_spec tool for serving OpenAPI spec slices"
```

---

### Task 8: Build the execute_api Tool

**Files:**
- Create: `src/tools/execute.ts`

- [ ] **Step 1: Write the execute_api tool**

Create `src/tools/execute.ts`:

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { KineticSession, SessionId, KineticApi } from '../util/types.js';
import { getApiBasePath } from '../client/kinetic-client.js';
import { getClient } from '../server.js';

export function registerExecuteTool(
  server: McpServer,
  sessions: Map<SessionId, KineticSession>,
  getClientFn: typeof getClient,
) {
  server.tool(
    'execute_api',
    'Execute an arbitrary Kinetic Platform API call. The MCP server handles authentication, base URL, and error formatting. Provide the HTTP method, path (relative to the API base), and optional body/query params. Use get_api_spec first to understand available endpoints.',
    {
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).describe('HTTP method'),
      path: z.string().describe(
        'API path relative to the service base URL. Examples: "/kapps", "/kapps/services/forms", "/submissions/{id}"',
      ),
      service: z
        .enum(['core', 'integrator', 'task'])
        .default('core')
        .describe('Which API service to call (default: core)'),
      body: z
        .record(z.unknown())
        .optional()
        .describe('JSON request body for POST/PUT/PATCH requests'),
      query: z
        .record(z.string())
        .optional()
        .describe('Query parameters (e.g., { "include": "values,details", "q": "status=Open" })'),
    },
    async ({ method, path, service, body, query }, extra) => {
      const sessionId: SessionId = (extra as { sessionId?: string })?.sessionId ?? 'stdio';
      const client = await getClientFn(sessions, sessionId, service as KineticApi);

      const result = await client.request(method, path, { body, query });

      return {
        content: [{
          type: 'text' as const,
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        }],
      };
    },
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/execute.ts
git commit -m "feat: add execute_api tool for generic API execution"
```

---

### Task 9: Build the Search Tools

**Files:**
- Create: `src/tools/search.ts`

- [ ] **Step 1: Write the search tools**

Create `src/tools/search.ts`:

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { KineticSession, SessionId } from '../util/types.js';
import { getClient } from '../server.js';

export function registerSearchTools(
  server: McpServer,
  sessions: Map<SessionId, KineticSession>,
  getClientFn: typeof getClient,
) {
  server.tool(
    'search_submissions',
    'Search for submissions using KQL (Kinetic Query Language). Requires index definitions on the target form. Returns paginated results.',
    {
      kappSlug: z.string().describe('The kapp containing the form'),
      formSlug: z.string().describe('The form to search'),
      query: z.string().optional().describe('KQL query string (e.g., \'values[Status]="Open"\')'),
      index: z.string().optional().describe('Index to use (e.g., "values[Status]")'),
      include: z
        .string()
        .default('details,values')
        .describe('Fields to include in response (default: "details,values")'),
      limit: z.number().default(25).describe('Results per page (default: 25)'),
      pageToken: z.string().optional().describe('Page token for next page of results'),
    },
    async ({ kappSlug, formSlug, query, index, include, limit, pageToken }, extra) => {
      const sessionId: SessionId = (extra as { sessionId?: string })?.sessionId ?? 'stdio';
      const client = await getClientFn(sessions, sessionId, 'core');

      const params: Record<string, string> = { include, limit: String(limit) };
      if (query) params.q = query;
      if (index) params.index = index;
      if (pageToken) params.pageToken = pageToken;

      const result = await client.request(
        'GET',
        `/kapps/${kappSlug}/forms/${formSlug}/submissions`,
        { query: params },
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    },
  );

  server.tool(
    'get_submission',
    'Get a single submission by ID, including its values and details.',
    {
      submissionId: z.string().describe('The submission ID'),
      include: z
        .string()
        .default('details,values,activities')
        .describe('Fields to include (default: "details,values,activities")'),
    },
    async ({ submissionId, include }, extra) => {
      const sessionId: SessionId = (extra as { sessionId?: string })?.sessionId ?? 'stdio';
      const client = await getClientFn(sessions, sessionId, 'core');

      const result = await client.request('GET', `/submissions/${submissionId}`, {
        query: { include },
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    },
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/search.ts
git commit -m "feat: add search_submissions and get_submission tools"
```

---

### Task 10: Build the Validation Tools

**Files:**
- Create: `src/tools/validate.ts`

- [ ] **Step 1: Write the validation tools**

Create `src/tools/validate.ts`:

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { KineticSession, SessionId } from '../util/types.js';
import { getClient } from '../server.js';

interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
}

export function registerValidateTools(
  server: McpServer,
  sessions: Map<SessionId, KineticSession>,
  getClientFn: typeof getClient,
) {
  server.tool(
    'validate_form',
    'Validate a form definition for common mistakes — missing index definitions, fields without proper types, and configuration issues. Reads the form from the platform and checks against best practices.',
    {
      kappSlug: z.string().describe('The kapp containing the form'),
      formSlug: z.string().describe('The form to validate'),
    },
    async ({ kappSlug, formSlug }, extra) => {
      const sessionId: SessionId = (extra as { sessionId?: string })?.sessionId ?? 'stdio';
      const client = await getClientFn(sessions, sessionId, 'core');

      const result = await client.request(
        'GET',
        `/kapps/${kappSlug}/forms/${formSlug}`,
        { query: { include: 'attributes,fields,indexDefinitions' } },
      ) as { form: { fields: Array<{ name: string; dataType: string; renderType: string }>; indexDefinitions?: Array<{ parts: Array<{ name: string }> }> } };

      const issues: ValidationIssue[] = [];
      const form = result.form;

      // Check for forms with no index definitions
      if (!form.indexDefinitions || form.indexDefinitions.length === 0) {
        issues.push({
          severity: 'warning',
          message: 'Form has no index definitions. KQL queries will not work without at least one index. See concepts/kql-and-indexing skill.',
        });
      }

      // Check for Status field without an index
      const hasStatusField = form.fields?.some(f => f.name === 'Status');
      const hasStatusIndex = form.indexDefinitions?.some(idx =>
        idx.parts.some(p => p.name === 'values[Status]'),
      );
      if (hasStatusField && !hasStatusIndex) {
        issues.push({
          severity: 'warning',
          message: 'Form has a "Status" field but no index on values[Status]. Add an index to enable status-based filtering.',
        });
      }

      // Check for fields with no dataType
      for (const field of form.fields ?? []) {
        if (!field.dataType) {
          issues.push({
            severity: 'error',
            message: `Field "${field.name}" has no dataType. This will cause runtime errors.`,
          });
        }
      }

      const summary = issues.length === 0
        ? 'No issues found. Form looks good.'
        : `Found ${issues.length} issue(s):\n\n${issues.map(i => `[${i.severity.toUpperCase()}] ${i.message}`).join('\n')}`;

      return {
        content: [{
          type: 'text' as const,
          text: summary,
        }],
      };
    },
  );

  server.tool(
    'validate_workflow',
    'Validate a workflow tree definition for structural issues — checks tree title format, node references, and common configuration mistakes.',
    {
      treeXml: z.string().optional().describe('Workflow tree XML to validate (provide either XML or a source/tree name to fetch from platform)'),
      source: z.string().optional().describe('Source name to fetch the tree from the Task API'),
      treeName: z.string().optional().describe('Tree name to fetch from the Task API'),
    },
    async ({ treeXml, source, treeName }, extra) => {
      const issues: ValidationIssue[] = [];

      let xml = treeXml;

      // If no XML provided, try to fetch from platform
      if (!xml && source && treeName) {
        const sessionId: SessionId = (extra as { sessionId?: string })?.sessionId ?? 'stdio';
        const client = await getClientFn(sessions, sessionId, 'task');
        try {
          const result = await client.request(
            'GET',
            `/trees/${encodeURIComponent(`${source} :: ${treeName}`)}`,
          ) as { tree: { treeXml: string } };
          xml = result.tree.treeXml;
        } catch (e) {
          return {
            content: [{
              type: 'text' as const,
              text: `Could not fetch tree: ${e instanceof Error ? e.message : String(e)}`,
            }],
          };
        }
      }

      if (!xml) {
        return {
          content: [{
            type: 'text' as const,
            text: 'Provide either treeXml or both source and treeName to validate a workflow.',
          }],
        };
      }

      // Check tree title format
      const nameMatch = xml.match(/name="([^"]+)"/);
      if (nameMatch) {
        const title = nameMatch[1];
        if (!title.includes(' :: ')) {
          issues.push({
            severity: 'error',
            message: `Tree title "${title}" does not follow required format: "SourceName :: SourceGroup :: EventName"`,
          });
        }
      }

      // Check for task nodes
      const taskCount = (xml.match(/<task /g) || []).length;
      if (taskCount === 0) {
        issues.push({
          severity: 'error',
          message: 'Workflow has no task nodes. At least one task node is required.',
        });
      }

      // Check for definitionId on tasks
      const tasksWithoutDef = (xml.match(/<task [^>]*(?!definitionId)[^>]*>/g) || [])
        .filter(t => !t.includes('definitionId'));
      if (tasksWithoutDef.length > 0) {
        issues.push({
          severity: 'error',
          message: `${tasksWithoutDef.length} task node(s) missing definitionId attribute. Every task must reference a handler.`,
        });
      }

      const summary = issues.length === 0
        ? 'No structural issues found. Workflow looks valid.'
        : `Found ${issues.length} issue(s):\n\n${issues.map(i => `[${i.severity.toUpperCase()}] ${i.message}`).join('\n')}`;

      return {
        content: [{
          type: 'text' as const,
          text: summary,
        }],
      };
    },
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/validate.ts
git commit -m "feat: add validate_form and validate_workflow tools"
```

---

### Task 11: Build the Server and Entry Point

**Files:**
- Create: `src/server.ts`, `src/index.ts`

- [ ] **Step 1: Write the server module**

Create `src/server.ts`:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { KineticApiClient, obtainOAuthToken, getApiBasePath } from './client/kinetic-client.js';
import type { KineticSession, KineticApi, SessionId } from './util/types.js';
import { registerConnectTool } from './tools/connect.js';
import { registerDiscoverTools } from './tools/discover.js';
import { registerApiSpecTool } from './tools/api-spec.js';
import { registerExecuteTool } from './tools/execute.js';
import { registerSearchTools } from './tools/search.js';
import { registerValidateTools } from './tools/validate.js';

export const sessions = new Map<SessionId, KineticSession>();

/**
 * Get or create an API client for the given session and API surface.
 * Handles env-based auto-connection and OAuth token lifecycle.
 */
export async function getClient(
  sessionMap: Map<SessionId, KineticSession>,
  sessionId: SessionId,
  api: KineticApi,
): Promise<KineticApiClient> {
  let session = sessionMap.get(sessionId);

  // Auto-connect from environment if no session exists
  if (!session) {
    const serverUrl = process.env.KINETIC_SERVER_URL;
    const username = process.env.KINETIC_USERNAME;
    const password = process.env.KINETIC_PASSWORD;

    if (!serverUrl || !username || !password) {
      throw new Error(
        'Not connected to a Kinetic Platform instance. Use the "connect" tool or set KINETIC_SERVER_URL, KINETIC_USERNAME, and KINETIC_PASSWORD environment variables.',
      );
    }

    session = {
      config: {
        serverUrl: serverUrl.replace(/\/+$/, ''),
        username,
        password,
        agentSlug: process.env.KINETIC_AGENT_SLUG ?? 'system',
      },
      clients: new Map(),
    };
    sessionMap.set(sessionId, session);
  }

  // Check for existing client
  const existing = session.clients.get(api);
  if (existing) {
    // Check OAuth token expiry for integrator API
    if (api === 'integrator' && session.oauthToken && Date.now() >= session.oauthToken.expiresAt) {
      session.clients.delete(api);
    } else {
      return existing;
    }
  }

  // Create new client
  const { serverUrl, username, password } = session.config;
  let client: KineticApiClient;

  if (api === 'integrator') {
    const { token, expiresAt } = await obtainOAuthToken(serverUrl, username, password);
    session.oauthToken = { token, expiresAt };
    client = KineticApiClient.withBearerToken(`${serverUrl}${getApiBasePath(api)}`, token);
  } else {
    client = KineticApiClient.withBasicAuth(`${serverUrl}${getApiBasePath(api)}`, username, password);
  }

  session.clients.set(api, client);
  return client;
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'kinetic-platform',
    version: '1.0.0',
  });

  // Register all tools
  registerConnectTool(server, sessions);
  registerDiscoverTools(server, sessions, getClient);
  registerApiSpecTool(server);
  registerExecuteTool(server, sessions, getClient);
  registerSearchTools(server, sessions, getClient);
  registerValidateTools(server, sessions, getClient);

  return server;
}
```

- [ ] **Step 2: Write the entry point**

Create `src/index.ts`:

```typescript
#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';
import { createServer } from './server.js';

// Self-signed certificate support
if (
  process.env.KINETIC_ALLOW_SELF_SIGNED === 'true' ||
  process.env.KINETIC_ALLOW_SELF_SIGNED === '1'
) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const args = new Set(process.argv.slice(2));
const runStdio = args.has('--stdio') || args.has('--both') || args.size === 0;
const runHttp = args.has('--http') || args.has('--both');

async function startStdio() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Kinetic Platform MCP server running on stdio');
}

async function startHttp() {
  const httpUser = process.env.MCP_HTTP_USER;
  const httpPass = process.env.MCP_HTTP_PASS;
  const host = process.env.MCP_HTTP_HOST ?? '127.0.0.1';
  const port = parseInt(process.env.MCP_HTTP_PORT ?? '3000', 10);

  const app = express();

  // Basic auth middleware if credentials are set
  if (httpUser && httpPass) {
    app.use((req, res, next) => {
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="MCP"');
        res.status(401).send('Authentication required');
        return;
      }
      const decoded = Buffer.from(auth.slice('Basic '.length), 'base64').toString('utf8');
      const [user, pass] = decoded.split(':');
      if (user !== httpUser || pass !== httpPass) {
        res.status(401).send('Invalid credentials');
        return;
      }
      next();
    });
  }

  // SSE endpoint for MCP
  const server = createServer();
  // HTTP transport setup depends on MCP SDK version
  // For @modelcontextprotocol/sdk >= 1.26.0, use StreamableHTTPServerTransport
  const { StreamableHTTPServerTransport } = await import(
    '@modelcontextprotocol/sdk/server/streamableHttp.js'
  );

  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport('/mcp', res);
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });

  app.listen(port, host, () => {
    console.error(`Kinetic Platform MCP server running on http://${host}:${port}/mcp`);
  });
}

if (runStdio) startStdio().catch(console.error);
if (runHttp) startHttp().catch(console.error);
```

- [ ] **Step 3: Build the project**

```bash
npm run build
```

Expected: Compiles without errors to `dist/`.

- [ ] **Step 4: Commit**

```bash
git add src/server.ts src/index.ts
git commit -m "feat: add server entry point with stdio and HTTP transport support"
```

---

### Task 12: Write the README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

Create `README.md`:

```markdown
# Kinetic Platform MCP Server

A slim Model Context Protocol (MCP) server for the Kinetic Platform. Provides AI tools with authenticated access to discover, inspect, and modify platform objects.

## Tools (12)

| Tool | Description |
|------|-------------|
| `connect` | Authenticate to a Kinetic Platform instance |
| `discover_space` | Overview of the space — kapps, teams, attributes |
| `discover_kapp` | Deep-dive into a kapp — forms, workflows, categories |
| `discover_form` | Full form definition — fields, indexes, events |
| `get_api_spec` | Formatted OpenAPI spec slice for a domain (forms, workflows, etc.) |
| `execute_api` | Generic API execution — any method, path, body |
| `search_submissions` | KQL-based submission search |
| `get_submission` | Single submission by ID |
| `validate_form` | Check form for common mistakes |
| `validate_workflow` | Check workflow XML for structural issues |
| `list_templates` | *(Future)* List available app templates |
| `scaffold_from_template` | *(Future)* Create app from template |

## Quick Start

### With Claude Code

Add to `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "kinetic-platform": {
      "command": "node",
      "args": ["/path/to/kinetic-platform-mcp/dist/index.js"],
      "env": {
        "KINETIC_SERVER_URL": "https://myspace.kinops.io",
        "KINETIC_USERNAME": "your-username",
        "KINETIC_PASSWORD": "your-password"
      }
    }
  }
}
```

### With Cursor

Add to Cursor settings (MCP section) with the same configuration.

### Global Install

```bash
npm install -g @kineticdata/platform-mcp
kinetic-platform-mcp --stdio
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `KINETIC_SERVER_URL` | Yes* | Platform base URL (e.g., `https://myspace.kinops.io`) |
| `KINETIC_USERNAME` | Yes* | Platform username |
| `KINETIC_PASSWORD` | Yes* | Platform password |
| `KINETIC_AGENT_SLUG` | No | Agent slug for Task API (default: `system`) |
| `KINETIC_ALLOW_SELF_SIGNED` | No | Set to `true` for self-signed SSL certs |
| `MCP_HTTP_USER` | No | HTTP transport Basic Auth username |
| `MCP_HTTP_PASS` | No | HTTP transport Basic Auth password |
| `MCP_HTTP_HOST` | No | HTTP bind host (default: `127.0.0.1`) |
| `MCP_HTTP_PORT` | No | HTTP bind port (default: `3000`) |

*Can be set via environment or at runtime using the `connect` tool.

## Transport Modes

```bash
# Stdio (default, used by Claude Code / Cursor)
kinetic-platform-mcp
kinetic-platform-mcp --stdio

# HTTP (for remote or shared access)
kinetic-platform-mcp --http

# Both
kinetic-platform-mcp --both
```

## Pair with Skills Library

This MCP server is designed to work alongside the [kinetic-platform-ai-skills](https://github.com/kineticdata/kinetic-platform-ai-skills) library. The skills library teaches AI *how* to build on Kinetic; this server gives AI *eyes and hands* on the platform.

- **Skills only:** AI understands Kinetic concepts, writes code from knowledge
- **Skills + MCP:** AI also discovers what exists, creates/modifies platform objects, validates configurations
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup, tools reference, and usage guide"
```

---

### Task 13: Test the Build End-to-End

**Files:** None (verification only)

- [ ] **Step 1: Clean build**

```bash
rm -rf dist && npm run build
```

Expected: Compiles without errors.

- [ ] **Step 2: Verify the binary is executable**

```bash
node dist/index.js --help 2>&1 || echo "Server started (no --help flag, this is expected)"
```

- [ ] **Step 3: Run the test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 4: Verify tool count**

```bash
grep -c 'server.tool(' src/tools/*.ts
```

Expected: 10 tool registrations across all files (connect, discover_space, discover_kapp, discover_form, get_api_spec, execute_api, search_submissions, get_submission, validate_form, validate_workflow).
