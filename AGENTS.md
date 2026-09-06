# AGENTS.md

Prism Bastion is a geometric tower-defense game built around modular programming. Load projectiles, modifiers, logic, trails, and triggers into tower slots; the compiler reads them from left to right and turns their order into an attack program. The same modules can produce radically different results when rearranged.

### Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start esbuild watch mode and the local development server |
| `pnpm build` | Produce minified static assets |
| `pnpm lint` | Run ESLint |
| `pnpm format <files...>` | Format selected files with Prettier and insert control-statement braces |
| `pnpm format:check <files...>` | Check selected files without writing |
| `pnpm typecheck` | Run strict TypeScript checking |
| `pnpm test` | Run Vitest unit and component tests |
| `pnpm test:e2e` | Run Playwright browser smoke tests |
| `pnpm check` | Run lint, type checking, tests, and production builds |
| `pnpm format:locales` | Complete and format locale files using the English key order |
| `pnpm balance:report` | Generate a balance report from current configuration |
| `pnpm perf:report` | Run the spatial-index performance report |

### Architecture

```text
packages/
├── game-core/  Deterministic combat, signals, and module runtime
├── coop/       Co-op protocol, planning, and authoritative simulation
└── web-shared/ Browser rendering, shared UI, effects, and i18n
apps/
├── web-single/ Single-player application and persistence
├── web-coop/   Full site and lazy-loaded co-op feature
└── coop-server/ Node WebSocket server and worker
```

The combat engine runs at a fixed 120 Hz and publishes immutable snapshots to React. Modules interact through a restricted combat API for target queries, damage, status effects, and retargeting, keeping them independent from waves, economy, and UI code.

Technical documentation:

- [Documentation map](docs/README.md)
- [System overview](docs/architecture.md)
- [Built-in module catalog](docs/modules.md)
- [Contributor guides](docs/guides/README.md)
- [Implementation explanations](docs/internals/README.md)

Project skills:

- [Skill index](docs/skills/README.md)
- [Thought Index authoring](docs/skills/thought-index-authoring/SKILL.md) — use when designing, reviewing, or implementing a module demonstration

### UI design

For UI changes, follow [UI style](docs/guides/ui-style.md), especially its selection-block and settings-category rules. Use flat, square, shared-edge option cells with a pale selection tint and a solid bottom accent strip. Peer settings categories fill their row equally. Do not add elevation or offset shadows, or an extra focus rectangle when arrow keys select a settings category. Keep settings headers and category navigation outside the scrolling content region. Preference changes save silently; put reserved-key instructions before the binding list and avoid function keys in defaults.

All pages must fit the viewport without document or whole-page scrolling. Use bounded internal scroll regions and keep headers and primary actions visible. The home page is stricter: none of its modules may scroll; fit controls through responsive layout and use carousel paging for levels. Frame dimensions must remain stable across mode, tab, and content changes; only viewport-responsive layout should resize them.

### Internationalization

All user-facing text is resolved through the shared i18next instance, including React components, tutorial copy, engine toasts, and Canvas labels. English is the fallback language; the initial locale follows a saved preference or the browser language.

Translation resources live in `packages/web-shared/src/i18n/locales/` as flat JSON objects. Every English key maps directly to a string; other locales map each key to a translated string or `null`, which falls back to English. Add new keys to `en.json`, then run `pnpm format:locales` to complete every locale and apply the English key order with canonical formatting. Do not embed user-facing copy in components or game logic. `pnpm check:locales` verifies that the resources remain flat, aligned, formatted, and self-described. Outside documentation and locale files, source and test files intentionally contain no CJK characters.

## Commit messages

Use the Conventional Commits style used by this repository:

```text
<type>: <short, lowercase summary>
```

Preferred types are `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, and `chore`. Keep the type lowercase, write the summary in the imperative mood, describe one focused change, and omit a trailing period.

Examples:

- `feat: remember level selection`
- `fix: correct triune-delta display settings`
- `perf: update signal spatial index incrementally`

Use a scope only when it materially improves clarity. Keep unrelated changes in separate commits.
