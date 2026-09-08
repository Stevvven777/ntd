# Testing Boundaries

Tests protect software contracts. They do not approve or preserve balance decisions.

Prism Bastion keeps authored balance data in configuration: signal health and speed, module energy and rarity, tower stat ranges, level geometry, wave composition, reward quantities, and similar tuning. Designers must be able to change those values without rewriting unrelated tests.

## What tests should protect

Write tests for behavior whose accidental change would be a software defect:

- Compiler semantics such as left-to-right modifiers, wraparound, payload capture, diagnostics, and recursive energy accounting.
- Runtime rules such as shield overflow, armor caps, aura application, splitting, targeting, trigger release, and status propagation.
- Structural validity such as unique IDs, valid references, non-empty routes, reachable roots, finite coordinates, positive scales, and aligned locale keys.
- Public boundaries such as immutable snapshots, command validation, serialization shape, accessibility behavior, and rendering fallback selection.
- Previously broken behavior when the test can identify the regression without freezing unrelated content.

Algorithm tests may use exact numbers when those numbers are declared inside the test as fixtures. For example, a compiler test can register a ten-damage projectile and a two-times modifier, then expect twenty damage. The assertion describes the algorithm, not a production module's current tuning.

## What tests should leave flexible

Do not copy current production values into assertions merely to detect that they changed. In particular, avoid golden assertions for:

- Signal health, speed, radius, reward, damage, or trait magnitudes.
- Module damage, energy cost, rarity, duration, range, or multiplier values.
- Tower base stats, upgrade ranges, and draft quantities.
- Level coordinates, pad counts, wave counts, signal totals, compositions, or introduction order.
- Balance-report totals, simulated tower averages, or other outputs whose purpose is to inform tuning.

These values may deserve schema or sanity checks. An energy cost can be required to be finite and non-negative; a wave can be required to reference registered signals; a route can be required to reach its root. Those checks reject invalid data while allowing valid retuning.

## Derive integration expectations from configuration

When a test proves that configured behavior reaches the runtime, read the expectation from the same configuration rather than repeating its current number.

```ts
const cap = getSignalCapability(signalRegistry.require('anvil'), 'damage-cap')?.damageCap;
dealDamage(signal, cap * 10);
expect(signal.hp).toBe(signal.maxHp - cap);
```

This test fails if armor stops enforcing its cap. It keeps passing if a designer changes the cap from one valid value to another.

Prefer relational assertions for transformations:

```ts
const base = registry.compile(['nova']).shots[0];
const condensed = registry.compile(['condense-core', 'nova']).shots[0];

expect(condensed.splash).toBe(0);
expect(condensed.damage).toBeGreaterThan(base.damage);
```

The relation is the module's contract. The resulting damage is tuning.

## Derive UI expectations from locale resources

Localized copy is authored content too. Import the locale JSON used by the screen when matching accessible names, labels, placeholders, or displayed text in component and browser tests. Use the exact key the component renders, even when several keys currently have the same wording. For interpolated English strings, `tests/helpers/translate.ts` uses the application's i18next dependency and locale resource. For partial regular-expression matches, `tests/helpers/text.ts` escapes the resource text so punctuation remains literal.

Playwright defaults to English explicitly; language-switching assertions should read the target locale. Do not repeat translations as English literals, Unicode escapes, or hardcoded pinyin search queries. Search-algorithm tests can own small text fixtures; integration tests should derive their search input from resources or supply a test-owned translation fixture.

Keep test-owned inputs (such as player names), protocol values, and formatting assertions independent of translation resources. Tests should detect broken behavior while allowing valid copy edits.

`pnpm lint` enforces `test-locale/no-hardcoded-copy` in `tests/`, `e2e/`, and `e2e-coop/`. It is a heuristic, not proof of correct resource use, and cannot choose between keys with identical wording. A test-owned input that coincides with production copy may use a narrow, explained exception:

```ts
// eslint-disable-next-line test-locale/no-hardcoded-copy -- This label is a test-owned component prop.
expect(button.textContent).toBe('Test fixture label');
```

## When an exact value is a contract

An exact numeric assertion is appropriate when at least one of these is true:

1. The value is an input defined by the test itself.
2. The value is part of an external protocol or persisted-data format.
3. The value is a mathematical result of the algorithm under test.
4. The value is a deliberate safety, accessibility, or interoperability bound.

If the only justification is “that is what `config.ts` says today,” do not assert the number. Read it from configuration, assert a useful invariant, or omit the test.

Similarly, an exact content sequence is a contract only when the product explicitly promises that sequence. A test should not make a particular signal's first appearance or a level's current wave order permanent by accident.

## Reports are evidence, not gates

`pnpm balance:report` and other analysis outputs help humans compare tuning. Test the report generator for determinism, finite results, complete configured coverage, and internally consistent totals. Do not turn today's report rows into snapshots or pass/fail thresholds unless the team has explicitly adopted a stable non-balance constraint.

If a tuning change produces surprising results, review the report as design evidence. Do not make the unit suite enforce the previous baseline.
