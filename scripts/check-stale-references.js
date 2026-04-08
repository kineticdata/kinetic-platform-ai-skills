#!/usr/bin/env node

/**
 * Checks curated skills for API path references that may have changed.
 * Exit 0: no stale references. Exit 1: stale references found.
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

function loadAllPaths() {
  const allPaths = new Set();
  for (const file of readdirSync(OAS_DIR)) {
    if (!file.endsWith('.json')) continue;
    try {
      const spec = JSON.parse(readFileSync(join(OAS_DIR, file), 'utf-8'));
      for (const path of Object.keys(spec.paths || {})) {
        allPaths.add(path);
      }
    } catch { /* skip */ }
  }
  return allPaths;
}

function findMarkdownFiles(dir) {
  const files = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) files.push(...findMarkdownFiles(full));
      else if (entry.endsWith('.md')) files.push(full);
    }
  } catch { /* dir may not exist */ }
  return files;
}

function extractApiPaths(content) {
  const paths = [];
  const patterns = [
    /(?:GET|POST|PUT|PATCH|DELETE)\s+(\/[\w/{}\-]+)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      let path = match[1];
      path = path
        .replace(/^\/app\/api\/v1/, '')
        .replace(/^\/app\/components\/task\/app\/api\/v2/, '')
        .replace(/^\/app\/components\/integrator\/app\/api\/v1/, '');
      if (path && path !== '/') paths.push(path);
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
      const normalized = refPath.replace(/\{[^}]+\}/g, '{param}');
      const specMatch = [...allSpecPaths].some(specPath => {
        const specNormalized = specPath.replace(/\{[^}]+\}/g, '{param}');
        return specNormalized === normalized || specNormalized.startsWith(normalized);
      });
      if (!specMatch && refPath.split('/').filter(Boolean).length >= 2) {
        issues.push({ file: file.replace(ROOT + '/', ''), path: refPath });
      }
    }
  }
}

if (issues.length > 0) {
  console.log(`Found ${issues.length} potentially stale API reference(s):\n`);
  for (const issue of issues) {
    console.log(`  ${issue.file}: ${issue.path}`);
  }
  process.exit(1);
} else {
  console.log('No stale API references found.');
  process.exit(0);
}
