# CI API Reference Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CI pipeline that auto-generates API reference markdown from OpenAPI specs and detects when hand-curated skills need updating due to API changes.

**Architecture:** A Node.js script reads OpenAPI spec JSON files and generates markdown reference docs under `skills/api/`. A GitHub Actions workflow runs on spec changes, commits updated reference files, and opens issues when curated skills may be affected. A cross-reference checker scans curated skills for API endpoint/field mentions and flags stale references.

**Tech Stack:** Node.js, GitHub Actions, Markdown

**Design Spec:** `docs/superpowers/specs/2026-04-07-ai-knowledge-distribution-design.md`

**Note:** This plan executes in the `kinetic-platform-ai-skills` repository.

---

## File Structure

### Files to Create

```
scripts/
├── generate-api-reference.js    # Reads OAS specs, generates markdown
├── check-stale-references.js    # Cross-references curated skills against spec
└── README.md                    # Script documentation

oas/                              # OpenAPI specs (copied/symlinked)
├── core.json
├── integrator.json
└── task.json

skills/api/
├── core/                         # Auto-generated reference
│   ├── spaces.md
│   ├── kapps.md
│   ├── forms.md
│   ├── submissions.md
│   ├── users.md
│   ├── teams.md
│   ├── webhooks.md
│   ├── webapis.md
│   ├── security.md
│   ├── categories.md
│   └── attributes.md
├── integrator/
│   ├── connections.md
│   └── operations.md
├── task/
│   ├── runs.md
│   ├── trees.md
│   └── nodes.md
├── authentication/SKILL.md       # Hand-written (already created in Plan 1)
└── using-the-api/SKILL.md        # Hand-written (already created in Plan 1)

.github/workflows/
└── update-api-reference.yml      # CI workflow
```

---

### Task 1: Copy OpenAPI Specs into the Skills Repo

**Files:**
- Create: `oas/core.json`, `oas/integrator.json`, `oas/task.json`

- [ ] **Step 1: Create the oas directory and copy specs**

```bash
mkdir -p oas
cp /Users/jamesdavies/dev/mcps/kinetic-platform-mgnt-mcp/oas/core.json oas/core.json
cp /Users/jamesdavies/dev/mcps/kinetic-platform-mgnt-mcp/oas/integrator.json oas/integrator.json
```

- [ ] **Step 2: Add a placeholder for Task API spec**

Create `oas/task.json`:
```json
{
  "openapi": "3.0.2",
  "info": {
    "title": "Kinetic Task REST API",
    "version": "2.0.0",
    "description": "Placeholder — replace with actual Task API spec when available"
  },
  "paths": {}
}
```

- [ ] **Step 3: Update .gitignore to NOT ignore oas/ directory**

Verify that `.gitignore` does not exclude the `oas/` directory. If it does, add an exception:
```
!oas/
```

- [ ] **Step 4: Commit**

```bash
git add oas/
git commit -m "chore: add OpenAPI specs for API reference generation"
```

---

### Task 2: Write the API Reference Generator Script

**Files:**
- Create: `scripts/generate-api-reference.js`

- [ ] **Step 1: Write the generator script**

Create `scripts/generate-api-reference.js`:

```javascript
#!/usr/bin/env node

/**
 * Generates markdown API reference files from OpenAPI specs.
 *
 * Usage: node scripts/generate-api-reference.js
 *
 * Reads specs from oas/ and writes markdown to skills/api/<service>/.
 * Generated files have a header marking them as auto-generated.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OAS_DIR = join(ROOT, 'oas');
const OUTPUT_DIR = join(ROOT, 'skills', 'api');

/** Domain-to-path-keyword mapping — same as MCP server's spec-parser.ts */
const DOMAIN_KEYWORDS = {
  spaces: ['space', 'activity'],
  kapps: ['kapps'],
  forms: ['forms', 'fields', 'indexDefinitions'],
  submissions: ['submissions'],
  users: ['users'],
  teams: ['teams'],
  webhooks: ['webhooks'],
  webapis: ['webApis'],
  security: ['securityPolicies', 'securityPolicyDefinitions'],
  categories: ['categories'],
  attributes: ['attributeDefinitions'],
  // Integrator-specific
  connections: ['connections'],
  operations: ['operations'],
  // Task-specific
  runs: ['runs'],
  trees: ['trees', 'routines'],
  nodes: ['nodes'],
  handlers: ['handlers'],
  engines: ['engines'],
};

/** Map services to the domains they contain */
const SERVICE_DOMAINS = {
  core: ['spaces', 'kapps', 'forms', 'submissions', 'users', 'teams', 'webhooks', 'webapis', 'security', 'categories', 'attributes'],
  integrator: ['connections', 'operations'],
  task: ['runs', 'trees', 'nodes', 'handlers', 'engines'],
};

function loadSpec(service) {
  const specPath = join(OAS_DIR, `${service}.json`);
  if (!existsSync(specPath)) {
    console.warn(`Warning: ${specPath} not found, skipping ${service}`);
    return null;
  }
  return JSON.parse(readFileSync(specPath, 'utf-8'));
}

function slicePaths(spec, domain) {
  const keywords = DOMAIN_KEYWORDS[domain] || [domain];
  const matched = {};

  for (const [path, methods] of Object.entries(spec.paths || {})) {
    const segments = path.toLowerCase().split('/');
    if (keywords.some(kw => segments.some(seg => seg.includes(kw.toLowerCase())))) {
      matched[path] = methods;
    }
  }

  return matched;
}

function resolveRef(spec, ref) {
  if (!ref || !ref.startsWith('#/')) return null;
  const parts = ref.replace('#/', '').split('/');
  let current = spec;
  for (const part of parts) {
    current = current?.[part];
  }
  return current;
}

function getParameters(spec, op, pathItem) {
  const params = [];
  // Path-level parameters
  if (pathItem.parameters) {
    for (const p of pathItem.parameters) {
      const resolved = p.$ref ? resolveRef(spec, p.$ref) : p;
      if (resolved) params.push(resolved);
    }
  }
  // Operation-level parameters
  if (op.parameters) {
    for (const p of op.parameters) {
      const resolved = p.$ref ? resolveRef(spec, p.$ref) : p;
      if (resolved) params.push(resolved);
    }
  }
  return params;
}

function formatOperation(spec, method, path, op, pathItem) {
  const lines = [];
  const httpMethod = method.toUpperCase();
  const summary = op.summary || op.description || '';
  const opId = op.operationId || '';

  lines.push(`### \`${httpMethod} ${path}\``);
  if (opId) lines.push(`**Operation:** \`${opId}\``);
  if (summary) lines.push(`${summary}`);
  lines.push('');

  // Parameters
  const params = getParameters(spec, op, pathItem);
  if (params.length > 0) {
    lines.push('| Parameter | Location | Required | Description |');
    lines.push('|-----------|----------|----------|-------------|');
    for (const p of params) {
      const req = p.required ? 'Yes' : 'No';
      const desc = p.description || '';
      const type = p.schema?.type ? ` (${p.schema.type})` : '';
      lines.push(`| \`${p.name}\`${type} | ${p.in} | ${req} | ${desc} |`);
    }
    lines.push('');
  }

  // Request body
  if (op.requestBody) {
    const body = op.requestBody.$ref ? resolveRef(spec, op.requestBody.$ref) : op.requestBody;
    if (body) {
      const desc = body.description || 'JSON body';
      const required = body.required ? ' (required)' : '';
      lines.push(`**Request body${required}:** ${desc}`);
      lines.push('');
    }
  }

  // Response
  if (op.responses) {
    const successCodes = Object.keys(op.responses).filter(c => c.startsWith('2'));
    if (successCodes.length > 0) {
      lines.push(`**Response:** ${successCodes.join(', ')}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function generateDomainDoc(spec, service, domain, paths) {
  const lines = [];

  lines.push('<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->');
  lines.push(`<!-- Source: oas/${service}.json -->`);
  lines.push(`<!-- Regenerate: node scripts/generate-api-reference.js -->`);
  lines.push('');
  lines.push(`# ${capitalize(domain)} API Reference`);
  lines.push('');
  lines.push(`Source: ${spec.info.title} v${spec.info.version}`);
  lines.push('');

  const sortedPaths = Object.entries(paths).sort(([a], [b]) => a.localeCompare(b));

  for (const [path, pathItem] of sortedPaths) {
    const httpMethods = ['get', 'post', 'put', 'patch', 'delete'];
    for (const method of httpMethods) {
      if (pathItem[method]) {
        lines.push(formatOperation(spec, method, path, pathItem[method], pathItem));
        lines.push('---');
        lines.push('');
      }
    }
  }

  if (sortedPaths.length === 0) {
    lines.push('*No endpoints found for this domain. The spec may not include these paths yet.*');
  }

  return lines.join('\n');
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// --- Main ---

let totalFiles = 0;

for (const [service, domains] of Object.entries(SERVICE_DOMAINS)) {
  const spec = loadSpec(service);
  if (!spec) continue;

  const serviceDir = join(OUTPUT_DIR, service);
  mkdirSync(serviceDir, { recursive: true });

  for (const domain of domains) {
    const paths = slicePaths(spec, domain);
    const doc = generateDomainDoc(spec, service, domain, paths);
    const outPath = join(serviceDir, `${domain}.md`);

    writeFileSync(outPath, doc, 'utf-8');
    const pathCount = Object.keys(paths).length;
    console.log(`  ${service}/${domain}.md — ${pathCount} paths`);
    totalFiles++;
  }
}

console.log(`\nGenerated ${totalFiles} API reference files.`);
```

**Note:** There is a deliberate backtick issue in the template literal for the HTML comment on line with `Source: oas/${service}.json`. Fix the closing quote — it should be a backtick:

```javascript
  lines.push(`<!-- Source: oas/${service}.json -->`);
```

- [ ] **Step 2: Make the script executable and test it**

```bash
chmod +x scripts/generate-api-reference.js
node scripts/generate-api-reference.js
```

Expected output: Lists generated files with path counts. Creates markdown files under `skills/api/core/`, `skills/api/integrator/`, and `skills/api/task/`.

- [ ] **Step 3: Verify generated files**

```bash
find skills/api -name "*.md" -not -path "*/SKILL.md" | sort
```

Expected: Files for each domain under the service directories.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-api-reference.js skills/api/
git commit -m "feat: add API reference generator and initial generated docs"
```

---

### Task 3: Write the Stale Reference Checker

**Files:**
- Create: `scripts/check-stale-references.js`

- [ ] **Step 1: Write the checker script**

Create `scripts/check-stale-references.js`:

```javascript
#!/usr/bin/env node

/**
 * Checks curated skills for references to API endpoints that may have
 * changed in the OpenAPI specs.
 *
 * Usage: node scripts/check-stale-references.js
 *
 * Scans skills/concepts/ and skills/recipes/ for API path patterns and
 * verifies they still exist in the current OpenAPI specs.
 *
 * Exit code 0: no stale references found
 * Exit code 1: stale references found (prints details)
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OAS_DIR = join(ROOT, 'oas');
const SKILLS_DIRS = [
  join(ROOT, 'skills', 'concepts'),
  join(ROOT, 'skills', 'recipes'),
  join(ROOT, 'skills', 'front-end'),
];

// Load all paths from all specs
function loadAllPaths() {
  const allPaths = new Set();
  for (const file of readdirSync(OAS_DIR)) {
    if (!file.endsWith('.json')) continue;
    try {
      const spec = JSON.parse(readFileSync(join(OAS_DIR, file), 'utf-8'));
      for (const path of Object.keys(spec.paths || {})) {
        allPaths.add(path);
      }
    } catch {
      // Skip malformed specs
    }
  }
  return allPaths;
}

// Recursively find all .md files in a directory
function findMarkdownFiles(dir) {
  const files = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        files.push(...findMarkdownFiles(full));
      } else if (entry.endsWith('.md')) {
        files.push(full);
      }
    }
  } catch {
    // Directory may not exist yet
  }
  return files;
}

// Extract API path references from markdown content
function extractApiPaths(content) {
  const paths = [];

  // Match patterns like: GET /app/api/v1/kapps, POST /kapps/{kappSlug}/forms
  // Also match paths in code blocks and inline code
  const patterns = [
    /(?:GET|POST|PUT|PATCH|DELETE)\s+(\/[\w/{}\-]+)/g,
    /`(\/app\/[\w/{}\-./]+)`/g,
    /"(\/app\/[\w/{}\-./]+)"/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      let path = match[1];
      // Normalize: strip base URL prefixes
      path = path
        .replace(/^\/app\/api\/v1/, '')
        .replace(/^\/app\/components\/task\/app\/api\/v2/, '')
        .replace(/^\/app\/components\/integrator\/app\/api\/v1/, '');

      if (path && path !== '/') {
        paths.push(path);
      }
    }
  }

  return paths;
}

// --- Main ---

const allSpecPaths = loadAllPaths();
const issues = [];

for (const dir of SKILLS_DIRS) {
  for (const file of findMarkdownFiles(dir)) {
    const content = readFileSync(file, 'utf-8');
    const referencedPaths = extractApiPaths(content);

    for (const refPath of referencedPaths) {
      // Check if this path (or a pattern match) exists in any spec
      // Allow for path parameter variations: /kapps/{kappSlug} matches /kapps/{slug}
      const normalized = refPath.replace(/\{[^}]+\}/g, '{param}');
      const specMatch = [...allSpecPaths].some(specPath => {
        const specNormalized = specPath.replace(/\{[^}]+\}/g, '{param}');
        return specNormalized === normalized || specNormalized.startsWith(normalized);
      });

      if (!specMatch && referencedPaths.length > 0) {
        // Only flag if the path looks like an API path (has at least 2 segments)
        if (refPath.split('/').filter(Boolean).length >= 2) {
          issues.push({
            file: file.replace(ROOT + '/', ''),
            path: refPath,
          });
        }
      }
    }
  }
}

if (issues.length > 0) {
  console.log(`Found ${issues.length} potentially stale API reference(s):\n`);
  for (const issue of issues) {
    console.log(`  ${issue.file}: ${issue.path}`);
  }
  console.log('\nThese API paths were referenced in skills but not found in the current OpenAPI specs.');
  console.log('Review and update the affected skills if the API has changed.');
  process.exit(1);
} else {
  console.log('No stale API references found. All referenced paths exist in the OpenAPI specs.');
  process.exit(0);
}
```

- [ ] **Step 2: Test the checker**

```bash
chmod +x scripts/check-stale-references.js
node scripts/check-stale-references.js
```

Expected: Either reports stale references or confirms all references are valid.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-stale-references.js
git commit -m "feat: add stale API reference checker for curated skills"
```

---

### Task 4: Write the GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/update-api-reference.yml`

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/update-api-reference.yml`:

```yaml
name: Update API Reference

on:
  push:
    paths:
      - 'oas/**'
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: write
  issues: write

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Generate API reference
        run: node scripts/generate-api-reference.js

      - name: Check for changes
        id: changes
        run: |
          git diff --quiet skills/api/ && echo "changed=false" >> $GITHUB_OUTPUT || echo "changed=true" >> $GITHUB_OUTPUT

      - name: Commit updated reference
        if: steps.changes.outputs.changed == 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add skills/api/
          git commit -m "docs: auto-update API reference from OpenAPI spec changes"
          git push

      - name: Check for stale references
        if: steps.changes.outputs.changed == 'true'
        id: stale
        continue-on-error: true
        run: |
          node scripts/check-stale-references.js 2>&1 | tee /tmp/stale-output.txt
          echo "exit_code=$?" >> $GITHUB_OUTPUT

      - name: Create issue for stale references
        if: steps.stale.outputs.exit_code == '1'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const output = fs.readFileSync('/tmp/stale-output.txt', 'utf-8');

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '⚠️ API spec change detected — review curated skills',
              body: `The OpenAPI specs in \`oas/\` were updated and the API reference has been auto-regenerated.\n\nThe stale reference checker found potential issues in curated skills:\n\n\`\`\`\n${output}\n\`\`\`\n\nPlease review the listed skills and update any stale API references.\n\n---\n*This issue was auto-created by the API reference pipeline.*`,
              labels: ['api-reference', 'maintenance'],
            });
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/update-api-reference.yml
git commit -m "ci: add GitHub Actions workflow for API reference auto-generation"
```

---

### Task 5: Add Scripts Documentation

**Files:**
- Create: `scripts/README.md`

- [ ] **Step 1: Write the scripts README**

Create `scripts/README.md`:

```markdown
# Scripts

## generate-api-reference.js

Generates markdown API reference files from OpenAPI specs.

**Input:** `oas/*.json` (OpenAPI 3.x spec files)
**Output:** `skills/api/<service>/<domain>.md`

```bash
node scripts/generate-api-reference.js
```

Generated files are marked with `<!-- AUTO-GENERATED -->` headers. Do not edit them manually — they will be overwritten on the next run.

## check-stale-references.js

Scans hand-curated skills (`skills/concepts/`, `skills/recipes/`, `skills/front-end/`) for API path references and checks them against the current OpenAPI specs.

```bash
node scripts/check-stale-references.js
```

Exit codes:
- `0` — no stale references found
- `1` — stale references found (details printed to stdout)

## CI Integration

The GitHub Actions workflow at `.github/workflows/update-api-reference.yml` runs automatically when files in `oas/` change on the main branch. It:

1. Regenerates API reference files
2. Commits changes if any
3. Runs the stale reference checker
4. Opens a GitHub issue if curated skills may need updating
```

- [ ] **Step 2: Commit**

```bash
git add scripts/README.md
git commit -m "docs: add scripts documentation"
```

---

### Task 6: Update CLAUDE.md with API Reference Section

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add auto-generated API reference entries to the skill index**

In the "API Reference" section of `CLAUDE.md`, add entries for the auto-generated reference files below the hand-written skills:

Add after the existing API Reference table:

```markdown
#### Auto-Generated API Reference

These files are auto-generated from OpenAPI specs. Do not edit manually.

| Reference | Path | Covers |
|-----------|------|--------|
| Core: Spaces | `skills/api/core/spaces.md` | Space-level endpoints |
| Core: Kapps | `skills/api/core/kapps.md` | Kapp CRUD and configuration |
| Core: Forms | `skills/api/core/forms.md` | Form, field, and index endpoints |
| Core: Submissions | `skills/api/core/submissions.md` | Submission CRUD and search |
| Core: Users | `skills/api/core/users.md` | User management endpoints |
| Core: Teams | `skills/api/core/teams.md` | Team management endpoints |
| Integrator: Connections | `skills/api/integrator/connections.md` | Connection CRUD |
| Integrator: Operations | `skills/api/integrator/operations.md` | Operation CRUD and execution |
| Task: Runs | `skills/api/task/runs.md` | Workflow run endpoints |
| Task: Trees | `skills/api/task/trees.md` | Workflow tree/routine endpoints |
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add auto-generated API reference entries to skill index"
```

---

### Task 7: Validate the Full Pipeline

**Files:** None (verification only)

- [ ] **Step 1: Run the generator**

```bash
node scripts/generate-api-reference.js
```

Expected: Prints file list with path counts, no errors.

- [ ] **Step 2: Run the stale reference checker**

```bash
node scripts/check-stale-references.js
```

Expected: Either clean or reports known stale references to review.

- [ ] **Step 3: Verify generated files have the auto-generated header**

```bash
head -3 skills/api/core/forms.md
```

Expected: First line contains `<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->`

- [ ] **Step 4: Verify the full skills directory structure**

```bash
find skills/ -name "*.md" | sort
```

Expected: 25+ files — concepts, recipes, front-end, api (hand-written + auto-generated).
