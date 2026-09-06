# UI Style

> Document type: **Guide** — use this page to extend Prism Bastion's bright geometric interface without flattening it into a generic card-based application.

Prism Bastion should feel like a playable abstract control surface: white paper, near-black construction lines, vivid color fields, and compact geometric signals. Its closest compositional reference is Mondrian rather than a dashboard template. Rectangles are not containers added around content after the fact; their shared edges describe how the player understands and operates the system.

This guide documents the project's existing visual grammar. General advice about choosing an art direction, typography, motion, or copy belongs outside this project guide.

## The visual thesis

Build each screen as one large composition of unequal rectangles. Use saturated color to establish focus and identity, pale tints to group related work, and dark lines to make the structure legible. Add circles, diamonds, polygons, or orbital marks as signals inside that rectangular frame.

The intended tension is:

- **bright, not soft:** color fields are clean and high-chroma;
- **geometric, not sterile:** asymmetry and unequal divisions create rhythm;
- **flat, not weightless:** shared borders give every region physical presence;
- **technical, not terminal-like:** monospace is reserved for values, IDs, and symbols;
- **playful, not decorative:** color and shape communicate category, state, or subject.

Avoid glass panels, blurred backdrops, soft gray card stacks, gradients used as atmosphere, pill-shaped controls, and interchangeable SaaS dashboard layouts. They erase the planar construction that makes the interface recognizable.

## Project palette and line system

The foundation tokens in [`foundation.css`](../../packages/web-shared/src/styles/foundation.css) establish the stable palette:

| Role             | Token      | Value     | Typical use                                                   |
| ---------------- | ---------- | --------- | ------------------------------------------------------------- |
| Construction ink | `--ink`    | `#252134` | Shared borders, primary text, active neutral controls         |
| Violet           | `--purple` | `#6558e8` | Primary action, program flow, selected global state           |
| Coral            | `--coral`  | `#ff637a` | interruption, close/exit emphasis, high-energy control fields |
| Mint             | `--mint`   | `#13b88e` | module library, available resources, constructive state       |
| Yellow           | `--yellow` | `#ffd447` | navigation blocks, headers, identifiers, utility emphasis     |
| Ground           | —          | `#efedf3` | page outside the composed surface                             |
| Paper            | —          | `#ffffff` | readable content cells and control faces                      |

Treat these as a small construction kit, not a requirement to place every color on every screen. A screen normally needs ink, paper, one structural color, and one contextual accent. The Arc Workshop uses yellow for its header, violet for the program area, and mint for the library; the Signal Compendium replaces most fixed accenting with the selected signal's `--signal-accent`.

Use the contextual accent in two strengths:

- a saturated strip, icon, progress fill, or selected edge for direct identification;
- a pale `color-mix(..., #fff)` field for the region that belongs to that identity.

Do not put long text directly on a saturated field unless the contrast is explicit. Do not assign colors merely to make adjacent rectangles different; adjacent roles should first be separated by the ink grid.

The default structural boundary is a `2px solid` ink line. Use `1px` only for subordinate subdivisions inside an already bounded unit, such as cells in the Compendium stat matrix. A boundary should be drawn by one owner. Two neighboring children should not each add a full border and accidentally create a four-pixel seam.

Keep divider weight consistent within the same grid or visual hierarchy. All peer boundaries must use the same thickness; do not mix `1px` and `2px` lines between equivalent regions. If a subordinate grid uses `1px` lines, the transition to it must be structurally clear, while the surrounding primary divisions remain `2px`.

## Viewport and stable frame sizes

Every page is a viewport-bound application surface. `html`, `body`, and `#app` must never scroll, including mobile and short landscape viewports. Keep page shells within `100dvh`; use `min-height: 0` and `minmax(0, 1fr)` throughout flexible layout chains. Remove content-driven page minimum heights and mobile overrides that restore document scrolling.

Headers, navigation, and primary actions remain in their allocated regions. Long lists, configuration panels, records, and other content own bounded internal scrolling with contained overscroll. Do not solve overflow by clipping controls or making the entire page frame an internal scroll container. The home page has no scrolling modules at all: fit mode controls, difficulty or Creative values, and level selection inside their allocated cells. Use the level carousel for paging, compact secondary copy, and reduce decorative regions on small screens.

A frame's dimensions are determined by viewport and layout role, not by the selected mode, tab, content length, loading state, or error message. Reserve the same region for alternative content: Standard difficulty and Creative calibration share the same home-page allocation. Keep modal outer dimensions stable across categories. Responsive resizing is appropriate when the viewport changes; ordinary selection changes must not move neighboring frames. Reduce decorative regions before reducing usable control space on short screens.

## Page keyboard navigation

The home page and archive pages own one default horizontal selection. Left/right arrows select levels on the home page, records in the Thought Index and Signal Compendium, and top-level categories in the Defense Archive. This works immediately after entering or returning to a page, including when focus falls back to the document body. Selection and focus move together; a home carousel only moves when the selected level is outside its visible range.

Use `usePageArrowNavigation` for this default. Covered or inert pages must ignore navigation, and modal dialogs and editable controls retain their own keys. Secondary vertical lists use up/down arrows when focused. Thought Index step controls use PageUp/PageDown by default; unmodified left/right arrows are reserved for browsing its records.

## Divide rectangles by responsibility

Start from the screen's operating model, then convert it into rectangles:

1. Name the primary object being manipulated or inspected.
2. Separate navigation, persistent context, main work, and supporting detail.
3. Give persistent context a fixed or bounded rail; give the main work `minmax(0, 1fr)`.
4. Split the main work again only where the interaction model changes.
5. Let related cells share edges and background fields instead of floating independently.
6. At narrow widths, change the reading order; do not proportionally shrink the desktop diagram.

Good asymmetry comes from information weight. A narrow index beside a large specimen is useful. A random narrow card beside three equal cards is decoration.

Prefer dividing one parent rectangle directly over nesting multiple bordered boxes. Sibling regions should share the parent's grid and meet at single owned divider lines. Add a nested bordered rectangle only when it represents a genuinely independent interaction or data object; spacing, background tint, typography, or a shared divider should handle ordinary grouping. Before adding a wrapper, check whether the parent can express the same hierarchy with `grid-template-*`, named areas, or a pseudo-element divider.

### Arc Workshop

[`Workshop.tsx`](../../packages/web-shared/src/ui/Workshop.tsx) and [`Workshop.css`](../../packages/web-shared/src/ui/Workshop.css) organize one tower-programming task into a planar instrument:

```text
┌──────────────────────── yellow identity / close strip ───────────────────────┐
├──────────── 360px tower rail ───────┬──────── flexible program workspace ─────┤
│ tower identity │ energy             │ violet sequence header                  │
├─────────────────────────────────────┼─────────────────────────────────────────┤
│ 2 × 2 tower statistics              │ ordered slot strip                       │
├──────────────────────┬──────────────┼─────────────────────────────────────────┤
│ targeting control    │ upgrade      │ compiled program / trigger trace         │
├──────────────────────┴──────────────┼─────────────────────────────────────────┤
│ selected module inspector           │ mint library header / category filters   │
│                                     ├─────────────────────────────────────────┤
│                                     │ scrollable module matrix                 │
└─────────────────────────────────────┴─────────────────────────────────────────┘
```

The outer split is not a generic sidebar. The left rail answers “what tower and module am I looking at?” while the right side answers “what program am I building?” Within the right side, the program is bounded and stable; the library receives the remaining height and owns scrolling.

Preserve these practices when extending the Workshop:

- add tower-level controls to the left rail, not as cards floating over the module library;
- add sequence-level feedback to the violet program region;
- add discovery and filtering controls to the mint library region;
- keep the slot row as one continuous strip whose cells share two-pixel seams;
- use module colors inside symbols, leading strips, selection tints, and kind filters rather than recoloring the whole workshop;
- keep the main split explicit with one vertical ink boundary.

At `620px` and below, the Workshop becomes a vertical document: tower context, program, then library. Slots become three columns and filters become a three-column control grid. This preserves the task sequence instead of compressing the 360-pixel rail into unusable fragments.

### Signal Compendium

[`SignalArchive.tsx`](../../apps/web-single/src/SignalArchive.tsx) and [`SignalArchive.css`](../../apps/web-single/src/SignalArchive.css) use a different rectangular hierarchy because the task is inspection rather than construction:

```text
┌─ back ─┬──────────── title ────────────┬─ language ─┬─ signal seal ─┐
├──────────── 270px signal index ────────┼──────── selected record ───┤
│ repeated signal rows                    │ specimen stage │ data sheet │
│ selected row gains an accent edge      │ crosshair/grid │ title      │
│                                        │ orbit + subject│ 2 × 2 stats │
│                                        │                │ 2 analyses │
│                                        │                │ sightings   │
└────────────────────────────────────────┴────────────────┴────────────┘
```

Here the selected signal accent travels across the composition: index marker, specimen grid, orbit, seal, stat fills, and analysis tint. That repetition makes separate rectangles feel like one record without surrounding them in another decorative card.

The specimen stage is the screen's one expressive exception. Crosshairs, a square grid, circular orbits, and the animated signal create a geometric “observation instrument” inside an otherwise rigid frame. Keep surrounding data panels quieter so this signature remains legible.

The desktop record gives the specimen and data unequal flexible columns. At `760px`, the index becomes a horizontal strip and the record stacks; at `480px`, the stat matrix becomes one column. The identity travels through accent and borders even though the geometry changes.

## Shape grammar

Use shapes consistently with their scale and job:

- **Rectangles** own layout, actions, meters, tags, and selected edges.
- **Squares and diamonds** carry module/signal symbols, compact status, and signal identity.
- **Polygons** connect UI presentation to battlefield entities.
- **Circles and orbits** indicate range, observation, energy, or motion; they should sit inside a rectangular region rather than replace the page structure.

Internal controls and cards normally use `border-radius: 0`. A modest radius may soften only the outer page shell, as in the Level Select and Signal Compendium. This makes the entire interface read as one object while keeping its internal construction crisp.

Prefer flat state changes: replace a background, add an inset accent bar, reverse foreground/background, or change a border style. Soft drop shadows imply floating layers and are usually wrong here. A small hard offset shadow is acceptable for a deliberately tactile object, such as the Compendium specimen toggle, because it behaves like a physical switch rather than ambient elevation.

## Selection blocks and settings categories

Use the home page's level options as the reference for selection blocks. The style is **flat geometric segmentation** within the larger Mondrian-inspired composition: square cells, shared ink dividers, paper backgrounds, pale accent tints, and a solid accent strip at the bottom. Selection changes the surface's color and edge, without suggesting height above the page.

Source references:

- [`LevelSelect.css`](../../apps/web-single/src/LevelSelect.css): `.level-grid` and `.level-card` establish the home-page pattern, with a contextual tint and an `8px` bottom selection strip.
- [`SettingsPanel.css`](../../packages/web-shared/src/ui/SettingsPanel.css): `.settings-categories` adapts it to four equal icon cells with a violet tint and a `5px` bottom selection strip.

Preserve these decisions when adding or revising selection blocks:

- Divide the available parent width evenly among peer options. Use a continuous, gap-free row with one owner for each divider; do not cluster small floating buttons in a corner.
- Keep cell corners square and faces flat. Do not add blurred shadows, hard offset shadows, bevels, or hover elevation to selection blocks or settings categories. The tactile-switch exception elsewhere in this guide does not apply to these controls.
- Show the selected option with a pale contextual background and a saturated bottom strip. An `inset 0 -5px 0` or `inset 0 -8px 0` CSS shadow is a way to draw that flat strip, not a depth effect.
- Use a restrained tint for hover. Keep selection geometry stable so interaction does not move the surrounding layout.
- Use simple geometric line icons for settings categories: sliders for general options, a keyboard for bindings, and an archive box for storage. Center them in equal cells, using consistent size and stroke weight. Provide localized accessible names and hover titles without adding visible category captions.
- Left/right navigation in settings selects and focuses the category together. The tint and bottom strip are its visible indicator; do not add an extra rectangular focus outline around the selected category. Keep `aria-selected`, roving tab focus, and keyboard operation intact. This exception is limited to these category tabs, not a reason to remove focus indicators from ordinary buttons or inputs.
- Keep the settings title, close control, and category row outside the scrolling content region. Draw complete section boundaries, including the bottom of the automatic-pause region.

Settings interaction and copy follow the same restrained approach:

- Left/right arrows switch settings categories; up/down arrows scroll their content. During key recording, arrows can instead be captured as bindings.
- Put reserved-key and navigation instructions at the beginning of the key-binding panel, before the binding list. Esc cancels recording or closes settings, Tab moves focus, and Enter activates a control; these keys cannot be rebound.
- Do not use function keys for defaults. Draft details default to `V`; users may explicitly assign a function key themselves.
- Save preference changes implicitly. Do not show routine “saved” or “default bindings restored” messages or repeat an automatic-save explanation. Keep actionable conflict and unsupported-key feedback.
- Keep storage copy compact: omit the redundant description of deleting every browser record, while preserving the explicit destructive-action confirmation.

## Type and density within the grid

The existing system sans face carries headings and prose. Use tight, heavy display headings for screen identity, regular compact text for explanation, and `--font-mono` only for IDs, measurements, counts, short codes, and symbolic readouts.

Do not use Unicode emoji in the interface, including symbols that can render as emoji through system font fallback or variation selectors. When an icon is needed, use SVG instead of a Unicode character glyph. Reuse shared SVG components such as `UiIcon` so shape, weight, and alignment remain consistent across platforms. This applies to controls, status indicators, and decorative icons; ordinary text, punctuation, and mathematical notation remain text. Decorative SVGs must be hidden from assistive technology, and icon-only controls must have a localized accessible label.

On desktop and tablet layouts, primary text must be at least `14px`; decorative or supporting text must be at least `13px`. At mobile breakpoints, the minimums become `12px` for primary text and `11px` for decorative or supporting text. These are hard lower bounds, not target sizes: controls, values, body copy, and other text needed to operate or understand the interface should normally remain larger. Placeholder ornament, non-text geometry, and text rendered as part of an imported image are not substitutes for readable interface labels.

Keep labels close to the edge or value they explain. A rectangular UI becomes noisy when every cell repeats a heading, subtitle, border, icon, and badge. In a dense region, choose the smallest combination that still communicates role:

- a colored leading strip plus heading for a section;
- symbol plus name plus one compact value for a module card;
- label/value/bar for a stat cell;
- name plus selected edge for an index row.

Text truncation is acceptable for compact indexes and cards when the full content is available in the selected detail region. Use `min-width: 0`, `text-overflow: ellipsis`, and stable row heights rather than allowing one translated label to break the whole grid.

## Encode state without adding containers

Use the existing geometry to show interaction state:

- selection: contextual tint plus a thick inset edge;
- active global mode: filled ink or semantic color with reversed text;
- hover: a lighter contextual tint, not lift and blur;
- unavailable inventory: dashed border, desaturation, and reduced opacity;
- progress: a small rectangular fill inside a bounded track;
- destructive or interrupting action: coral fill on hover or active state;
- keyboard focus: the shared high-contrast white/violet outline from `foundation.css`, with the selected-category exception described above.

Do not add a badge, tooltip, border, and background change for the same state. One strong signal plus one accessible semantic attribute (`aria-current`, `aria-pressed`, `aria-selected`, or `disabled`) is normally enough.

## Implementation pattern

Declare page ink, paper, and contextual accent at the component root. Pass object identity through a CSS custom property rather than generating per-entity class names:

```tsx
<article style={{ '--subject-accent': signal.color } as CSSProperties}>...</article>
```

```css
.record {
  --record-ink: #252134;
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr);
  border: 2px solid var(--record-ink);
  background: #fff;
}

.record-index {
  border-right: 2px solid var(--record-ink);
}

.record-detail {
  min-width: 0;
  background: color-mix(in srgb, var(--subject-accent) 12%, #fff);
}
```

Use CSS Grid for the large composition and for repeated equal cells. Use Flexbox inside a cell when content flows on one axis. Add `min-width: 0` and `min-height: 0` at flexible grid boundaries; otherwise long translations or scroll regions can force the composition wider or taller than intended.

Keep each component's structural styles in its same-named stylesheet. Shared primitives such as `Tag` should expose a small semantic palette, while page styles decide placement and surrounding geometry.

## Review checklist

- Does every major rectangle correspond to navigation, context, work, or detail?
- Are related regions direct divisions of one parent instead of nested bordered boxes?
- Can one border own each shared boundary without doubled seams?
- Do peer divider lines use one consistent thickness?
- Is the main work area flexible while rails and controls remain usable?
- Does saturated color identify a role or state rather than fill empty space?
- Is there one dominant expressive device, with quieter supporting panels?
- Are internal cards square and flat, with any outer radius limited to the shell?
- Do selection, disabled, hover, and focus states remain distinct without extra badges?
- Does the mobile layout become a sensible reading sequence rather than a miniature desktop grid?
- Are localized labels allowed to truncate or wrap without moving structural boundaries unpredictably?
- Does primary/supporting text stay at or above `14px`/`13px`, or `12px`/`11px` on mobile?
- Do interface icons use SVG rather than Unicode emoji or character glyphs?
- Does the result still read clearly in the Canvas/WebGL-free UI layer and with reduced motion?

The [rendering performance guide](rendering-performance.md) covers Canvas and effects. This page applies only to DOM interface composition and its visual language.
