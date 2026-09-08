# Built-in Module Catalog

Modules belong to five compiler categories. IDs match runtime source files; display names belong to the [locale resources](../packages/web-shared/src/i18n/locales/en.json). This catalog records roles without duplicating display copy or balance values.

## Projectile modules

Projectile modules emit a castable shot and consume all pending modifiers.

| ID            | Role                                                   |
| ------------- | ------------------------------------------------------ |
| `pulse`       | Stable baseline projectile                             |
| `prism-slug`  | Dense high-damage single-target projectile             |
| `needle`      | Fast projectile that can pass through multiple targets |
| `nova`        | Impact projectile with area damage                     |
| `geode-bloom` | Heavy impact projectile with a large crystal blast     |
| `arcbolt`     | Impact projectile that chains damage to nearby signals |
| `razor`       | Wide cutting projectile built for repeated contacts    |
| `void-beam`   | Collisionless fixed-heading carrier for trail modules  |

## Static payload modules

Static payloads are deployed at a trigger position. They cannot be cast as root shots.

| ID               | Role                                                    |
| ---------------- | ------------------------------------------------------- |
| `proximity-mine` | Arms, waits for a nearby signal, and detonates          |
| `rift-barrier`   | Forms four persistent spatial rifts in a hollow diamond |
| `tesla-node`     | Repeatedly shocks nearby targets                        |
| `ember-field`    | Maintains a low-cost burning area                       |
| `toxic-cloud`    | Maintains a corrosive area                              |
| `singularity`    | Pulls signals toward its route-relative center          |

## Modifier modules

Modifiers patch the next emitted projectile.

| ID                | Role                                                                          |
| ----------------- | ----------------------------------------------------------------------------- |
| `overdrive`       | Trades efficiency for stronger projectile properties                          |
| `frost`           | Propagates slowing to affected targets                                        |
| `double-fork`     | Emits two projectiles with a narrow spread                                    |
| `fork`            | Emits multiple projectiles with spread                                        |
| `ricochet`        | Redirects a surviving projectile after impact                                 |
| `ember-coating`   | Propagates a light burning status                                             |
| `toxin`           | Propagates a periodic damage status                                           |
| `searing-sigil`   | Propagates a heavy burning status                                             |
| `starfire-matrix` | Propagates a rapid legendary burning status                                   |
| `colossus`        | Enlarges and strengthens the next projectile                                  |
| `focus-core`      | Converts extra projectiles, repeats, pierce, and chains into one focused shot |
| `condense-core`   | Converts area radius into direct damage                                       |

## Trail modules

| ID               | Role                                                                      |
| ---------------- | ------------------------------------------------------------------------- |
| `resonant-trail` | Publishes damage waves along the carrier path                             |
| `cinder-trail`   | Leaves a broad damaging fire wake that burns crossing signals             |
| `starfire-trail` | Leaves a persistent starfire wake that damages and burns crossing signals |
| `rift-trail`     | Leaves persistent damaging spatial rifts along the carrier path           |

## Logic and trigger modules

Logic modules alter how the next projectile is scheduled, aimed, or wrapped.

| ID                   | Role                                                                   |
| -------------------- | ---------------------------------------------------------------------- |
| `echo`               | Repeats the next shot after a delay                                    |
| `seeker`             | Turns the next projectile toward a live target                         |
| `barrage`            | Repeats the next shot in a rapid sequence                              |
| `economizer`         | Reduces the next cast's compiled energy cost                           |
| `emergency-battery`  | Reduces the next projectile's energy cost by a flat amount             |
| `reclaim-circuit`    | Converts health damage into tower energy                               |
| `impact-trigger`     | Releases payloads after a health-damaging collision                    |
| `timer-trigger`      | Releases payloads when its timer ends or it collides first             |
| `expiration-trigger` | Releases payloads when the carrier reaches its normal end              |
| `terrain-trigger`    | Releases payloads after crossing a route centerline or colliding early |

The [module compiler explanation](internals/module-compiler.md) describes how these categories interact. The [module extension guide](guides/adding-a-module.md) covers implementation work.
