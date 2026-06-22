# Build Scripts

## `build-indexes.mjs` — Generate index files from `skills.yaml`

`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `README.md`, and `.cursor/rules/*.mdc` are partially generated from the canonical manifest at `../skills.yaml`. The generator replaces content between marker comments:

- For `*.md` index tables: between `<!-- BEGIN GENERATED:skills -->` and `<!-- END GENERATED:skills -->`.
- For Cursor rule files: between `<!-- BEGIN GENERATED:imports -->` and `<!-- END GENERATED:imports -->`.

Content outside the markers is preserved verbatim — write hand-authored prose freely above or below the generated section.

### Usage

```bash
node scripts/build-indexes.mjs            # regenerate index sections in place
node scripts/build-indexes.mjs --check    # exit non-zero if regeneration would change anything (CI use)
```

### Workflow

1. Edit `skills.yaml` when adding/renaming/removing a skill.
2. Run `node scripts/build-indexes.mjs`.
3. Commit the manifest change AND the regenerated files together.

### CI integration

Add to your CI pipeline:

```bash
node scripts/build-indexes.mjs --check
```

This fails the build if anyone edited an index file by hand instead of editing `skills.yaml`. Pairs with the existing `tests/verify.sh` for full library health gating.

### Marker installation

If a target file doesn't yet have the marker pair, the generator prints a "Markers missing" message and skips that file. To enable generation:

1. Open the target file.
2. Locate the section you want generated.
3. Wrap it with the appropriate begin/end markers (see top of this README).
4. Re-run the generator.

This staged approach lets you opt files in one at a time rather than committing to full generation across all targets in one PR.

### Manifest schema

See the top of `skills.yaml` for the schema. Key invariants the generator assumes:

- `name` matches the SKILL.md frontmatter `name:` field exactly.
- `path` is relative to the repo root.
- `description` starts with a verb suitable for "Read when you need to…" or, for commands, "Run when you need to…".
- `tags` controls Cursor rule inclusion (`platform`, `front-end`, `api`, `command`).

Validation (folder-name matching, frontmatter checks, broken-cross-reference detection) is intentionally out of scope for this script. Add a separate `scripts/lint-skills.mjs` if you want stricter CI gating.
