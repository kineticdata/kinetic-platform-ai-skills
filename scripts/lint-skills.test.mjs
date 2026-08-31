import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkMcpReferences } from './lint-skills.mjs';

test('flags a tool name that does not exist on the server', () => {
  const findings = checkMcpReferences('a.md', 'MCP note.\nCall `discover_space` first.');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, 'mcp-tool-unknown');
  assert.match(findings[0].message, /discover_space/);
});

test('accepts a real tool name', () => {
  assert.deepEqual(checkMcpReferences('a.md', 'MCP note.\nCall `get_context` first.'), []);
});

test('flags a hardcoded mcp__ prefix', () => {
  const findings = checkMcpReferences('a.md', 'Use `mcp__kinetic__get_form`.');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, 'mcp-prefix-hardcoded');
});

test('ignores prose that merely mentions MCP', () => {
  assert.deepEqual(checkMcpReferences('a.md', 'An MCP server wraps these endpoints.'), []);
});

test('ignores Ruby SDK method names', () => {
  const content = 'MCP note.\nUse `space_sdk.add_user` and `task_sdk.import_trees`.';
  assert.deepEqual(checkMcpReferences('a.md', content), []);
});

test('ignores tool-like names in files that never mention MCP', () => {
  assert.deepEqual(checkMcpReferences('a.md', 'Call `add_access_key` on the SDK.'), []);
});
