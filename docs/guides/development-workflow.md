# Development Workflow

## Set up and run

Use Node.js 22 or newer. Install the lockfile exactly, then start the development server:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open <http://localhost:4173>. The development process watches TypeScript, CSS, and GLSL imports and serves `apps/web-single/dist/` with source maps.

## Choose the smallest validation loop

Run the narrowest relevant check while editing, then run the full check before handoff.

The [root command table](../../AGENTS.md#commands) lists common checks; [package.json](../../package.json) defines the full set. `pnpm check` runs static checks, unit/component tests, both production builds, and the co-op server smoke test. Browser E2E tests and formatting checks run separately.

For one Vitest file, pass it through the script:

```bash
pnpm test -- tests/compiler.test.ts
```

Tests protect software contracts, not the current balance baseline. Read [Testing boundaries](testing-boundaries.md) before asserting production damage, energy, signal stats, wave composition, map coordinates, or report totals.

## Format touched files

Use Prettier with `prettier-plugin-curly`. Code uses tabs displayed at four columns,
semicolons, single quotes, and a preferred line width of 120. The plugin inserts
braces around every control-statement body, including single-line `if`, `else`,
and loop bodies. Markdown and YAML retain two-space indentation.

Pass explicit files or quoted globs to format or check just the files you touch:

```bash
pnpm format packages/game-core/src/modules/barrage.ts
pnpm format:check packages/game-core/src/modules/barrage.ts
```

`pnpm format:check .` audits the repository without writing. Existing files have
not been migrated, so this check is intentionally separate from `pnpm check` and
CI for now. `pnpm format .` explicitly opts into a repository-wide rewrite; do not
use it for routine changes during the migration.

Generated files and locale JSON are excluded. Continue to use
`pnpm format:locales` for locale resources. `.editorconfig` supplies editor defaults;
configure the Prettier editor extension to use the project's local installation.
In VS Code, set `editor.insertSpaces` to `false`, `editor.tabSize` to `4`, and
`editor.detectIndentation` to `false` if local settings override these defaults.

For code ownership, see [System overview](../architecture.md); for user-facing copy, see [Localization](localization.md).

## Before handoff

1. Inspect `git diff` and make sure unrelated user changes are untouched.
2. Run the focused tests that demonstrate the behavior.
3. Run `pnpm check`.
4. For visual work, inspect both WebGL2 and Canvas fallback behavior at narrow and wide viewport sizes.
5. State any check that could not run and why.
