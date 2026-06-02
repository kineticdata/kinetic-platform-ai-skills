#!/usr/bin/env node

/**
 * Generates markdown API reference files from OpenAPI specs.
 * Input: oas/*.json
 * Output: skills/api/<service>/<domain>.md
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OAS_DIR = join(ROOT, 'oas');
const OUTPUT_DIR = join(ROOT, 'skills', 'api');

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
  connections: ['connections'],
  operations: ['operations'],
  runs: ['runs'],
  trees: ['trees', 'routines'],
  nodes: ['nodes'],
  handlers: ['handlers'],
  engines: ['engines'],
};

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

// Assign a path to its MOST SPECIFIC domain — the rightmost path segment that
// matches a domain keyword — so each endpoint is documented in exactly one file.
// Without this, every `/kapps/{kappSlug}/forms/{formSlug}/submissions` path would
// land in kapps.md AND forms.md AND submissions.md (the old behaviour, which made
// kapps.md ~1400 lines of duplicated content).
function domainForPath(service, path) {
  const domains = SERVICE_DOMAINS[service] || [];
  const segments = path.toLowerCase().split('/');
  let best = null, bestIdx = -1;
  for (const domain of domains) {
    const keywords = DOMAIN_KEYWORDS[domain] || [domain];
    for (let i = segments.length - 1; i >= 0; i--) {
      if (keywords.some(kw => segments[i].includes(kw.toLowerCase()))) {
        if (i > bestIdx) { bestIdx = i; best = domain; }
        break;
      }
    }
  }
  return best;
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
  if (pathItem.parameters) {
    for (const p of pathItem.parameters) {
      const resolved = p.$ref ? resolveRef(spec, p.$ref) : p;
      if (resolved) params.push(resolved);
    }
  }
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
  if (summary) lines.push(summary);
  lines.push('');

  const params = getParameters(spec, op, pathItem);
  if (params.length > 0) {
    lines.push('| Parameter | Location | Required | Description |');
    lines.push('|-----------|----------|----------|-------------|');
    for (const p of params) {
      const req = p.required ? 'Yes' : 'No';
      const desc = cellDesc(p.description);
      const type = p.schema?.type ? ` (${p.schema.type})` : '';
      lines.push(`| \`${p.name}\`${type} | ${p.in} | ${req} | ${desc} |`);
    }
    lines.push('');
  }

  if (op.requestBody) {
    const body = op.requestBody.$ref ? resolveRef(spec, op.requestBody.$ref) : op.requestBody;
    if (body) {
      const desc = body.description || 'JSON body';
      const required = body.required ? ' (required)' : '';
      lines.push(`**Request body${required}:** ${desc}`);
      lines.push('');
    }
  }

  if (op.responses) {
    const codes = Object.keys(op.responses).filter(c => c.startsWith('2'));
    if (codes.length > 0) {
      lines.push(`**Success response:** ${codes.join(', ')}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Collapse whitespace, escape table-breaking pipes, and cap length so a multi-
// paragraph OpenAPI description doesn't become a multi-thousand-char single cell.
function cellDesc(desc) {
  const oneLine = (desc || '').replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();
  return oneLine.length > 200 ? oneLine.slice(0, 197) + '…' : oneLine;
}

function generateDomainDoc(spec, service, domain, paths) {
  const lines = [];
  lines.push(`<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->`);
  lines.push(`<!-- Source: oas/${service}.json -->`);
  lines.push(`<!-- Regenerate: node scripts/generate-api-reference.mjs -->`);
  lines.push('');
  lines.push(`# ${capitalize(domain)} API Reference`);
  lines.push('');
  lines.push(`Source: ${spec.info.title} v${spec.info.version}`);
  lines.push('');
  lines.push('> Generated from the OpenAPI spec — endpoints + parameters only. For base URLs, authentication, pagination, `include` conventions, and worked examples see `concepts/api-basics`, `api/authentication`, and `api/using-the-api`.');
  lines.push('');

  const sortedPaths = Object.entries(paths).sort(([a], [b]) => a.localeCompare(b));
  for (const [path, pathItem] of sortedPaths) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      if (pathItem[method]) {
        lines.push(formatOperation(spec, method, path, pathItem[method], pathItem));
        lines.push('---');
        lines.push('');
      }
    }
  }

  if (sortedPaths.length === 0) {
    lines.push('*No endpoints found for this domain.*');
  }

  return lines.join('\n');
}

// --- Main ---
let totalFiles = 0;
for (const [service, domains] of Object.entries(SERVICE_DOMAINS)) {
  const spec = loadSpec(service);
  if (!spec) continue;

  const serviceDir = join(OUTPUT_DIR, service);
  mkdirSync(serviceDir, { recursive: true });

  // Group each path under exactly one (most-specific) domain.
  const byDomain = {};
  for (const [path, methods] of Object.entries(spec.paths || {})) {
    const domain = domainForPath(service, path);
    if (!domain) continue;
    if (!byDomain[domain]) byDomain[domain] = {};
    byDomain[domain][path] = methods;
  }

  for (const domain of domains) {
    const paths = byDomain[domain] || {};
    const pathCount = Object.keys(paths).length;
    if (pathCount === 0) {
      // Skip empty domains — don't emit a "No endpoints found" stub file.
      console.log(`  ${service}/${domain}.md — 0 paths (skipped)`);
      continue;
    }
    const doc = generateDomainDoc(spec, service, domain, paths);
    const outPath = join(serviceDir, `${domain}.md`);
    writeFileSync(outPath, doc, 'utf-8');
    console.log(`  ${service}/${domain}.md — ${pathCount} paths`);
    totalFiles++;
  }
}
console.log(`\nGenerated ${totalFiles} API reference files.`);
