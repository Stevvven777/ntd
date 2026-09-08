# Cross-Cutting Combat Mechanics

## Target-effect propagation

Modules never receive `GameEngine`. Their runtime hooks use `ModuleCombatApi` for target queries, damage, slows, statuses, retargeting, and route displacement.

`dealDamage()` does more than subtract health. After the shared damage path returns actual health damage, it can refund energy to the source tower and publishes that target through the `damage` channel. `affectTarget()` publishes a target through a named channel without requiring damage; static areas use the `static` channel for this purpose.

A modifier subscribes through `targetEffect`. Frost listens to both channels, while Corrosive Spore listens only to health damage. The carrier knows which targets it affected, and the modifier knows what to apply, but neither side contains the other module's ID. This is why splash, chain attacks, trail waves, and static areas can propagate modifiers without pairwise branches in the engine.

Slow and status helpers return whether the signal newly entered the state. A module can play entry feedback once while later applications refresh strength or duration.

## Shield, armor, and health ordering

All module damage enters one engine path. Shield absorption happens first. Any overflow is then limited by optional health armor before it reduces hit points and produces death rewards or splitting. Discrete hits use `damageCap`; continuous effects use `continuousDamageCapPerSecond` multiplied by measured exposure time, so changing their settlement frequency cannot change armor balance.

An active shield participates in collision as a regular polygon rather than a circular approximation. The collision system considers both the shield boundary and signal body and selects the earliest contact along the projectile's movement segment.

If the shield absorbs the full hit, the projectile expires before `onHit`, health-damage target effects, energy refunds, or impact-trigger release. Only damage that reaches health continues through those behaviors. Shield hit, break, and restore feedback is driven separately from the numeric shield state.

## Persistent spatial index

Range, splash, trigger, and projectile-segment queries share a persistent `SignalSpatialIndex`. Spawn, death, splitting, reset, and movement must keep it synchronized with live signals. Query results may use reusable buffers; callers must not retain them across queries.

Tower targeting supports health, tower distance, density, and core distance. Cross-branch ordering uses [remaining physical route distance](route-graphs.md#shared-ordering-across-branches). See [Rendering performance](../guides/rendering-performance.md) for hot-path implementation practices.

## Configured signal mechanics

Each file under `packages/game-core/src/signals/` composes typed capabilities. The engine dispatches by capability kind rather than signal ID:

- `pulse-movement` supplies a periodic speed multiplier while preserving the configured speed as its cycle average;
- `shield` supplies absorption, regeneration, cooldown, polygon, and visual parameters;
- `damage-cap` caps discrete health damage after shield overflow and declares a rate cap for continuous damage;
- `split-on-death` queues a visible rift, then creates one child variant on the parent's fixed route;
- `tower-suppression-aura` changes tower cooldown and energy regeneration inside a radius.

Overlapping auras do not multiply. A tower uses the strongest cooldown penalty and strongest regeneration penalty among living sources. Split parents leave the targetable set immediately, but their pending rift counts as alive for wave completion until children have spawned.

Overlapping spatial rifts likewise settle one continuous-damage stream per signal. The strongest covering rift owns that tick's damage, target modifiers, hit effect, and energy refund; weaker overlaps retain their visual geometry but do not add another damage stream.
