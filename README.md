# TimeSims Playable Prototype

This project is a starting point for **TimeSims**, a hybrid tower defence and
timeline command game.  It demonstrates a deterministic simulation core with
planning and execution phases, simple 3D assets, and a minimal user
interface.  The goal is to provide a clear foundation for building more
complex gameplay while always keeping the simulation transparent and
predictable.

## Installation and Development

Ensure you have a recent version of Node.js installed.  To install
dependencies and start the development server:

```
npm install
npm run dev
```

Open your browser at the indicated local URL (usually http://localhost:5173)
to view the prototype.

### Running Tests

The project includes a simple test harness implemented in Node.  Run the
tests with:

```
npm test
```

The test runner will load and execute the `.test.ts` files under the
`tests/` folder.  These tests exercise the core deterministic logic (LOS,
perception, planning versus execution parity) without requiring any DOM or
Three.js dependencies.

## Determinism

One of the core design goals of TimeSims is to provide deterministic
outcomes.  The same initial world state and timeline plan should always
produce identical behaviour, regardless of how many times the simulation is
run.  To achieve this, the core logic uses fixed time steps (`dt`) and
computes line‑of‑sight, detection and interruption purely from the current
state.  Both the offline planning pass and the real‑time execution pass
invoke the same functions so there are no discrepancies between prediction
and reality.  When writing tests or adding gameplay features you must
maintain this golden rule.

## Assets

The `src/assets` directory contains a set of simple [glTF 2.0](https://www.khronos.org/gltf/)
models used for units, weapons, projectiles and visual effects.  They are
generated programmatically by the script in `scripts/generate-assets.js`.  Each
asset is built from a single cube primitive scaled and coloured
differently.  The models have no external textures – their materials are
defined inline using PBR base colour factors.  This keeps the assets
self‑contained and avoids any external licence concerns.  The following
table summarises the meshes:

| Asset            | Triangles | Scale (x,y,z)    | Purpose                       |
|------------------|-----------|------------------|-------------------------------|
| **infantry**     | 12        | (0.5, 0.8, 0.5)  | Proxy mesh for infantry units |
| **tank**         | 12        | (1.5, 0.6, 2.0)  | Simple tank hull              |
| **ifv**          | 12        | (1.3, 0.6, 1.6)  | Infantry fighting vehicle     |
| **bunker**       | 12        | (2.0, 1.0, 2.0)  | Stationary cover building     |
| **weapon_small** | 12        | (0.4, 0.4, 0.8)  | Small weapon barrel           |
| **weapon_large** | 12        | (0.6, 0.6, 1.2)  | Large weapon barrel           |
| **projectile**   | 12        | (0.3, 0.3, 0.3)  | Bullet / shell proxy          |
| **muzzle_flash** | 12        | (0.6, 0.1, 0.6)  | Muzzle flash effect quad      |
| **smoke**        | 12        | (1.2, 1.2, 1.2)  | Smoke volume proxy            |

All these meshes consist of 8 vertices and 12 triangles (36 indices).  They
use untextured PBR materials with differing base colours.

You can regenerate the assets at any time by running:

```
node scripts/generate-assets.cjs
```

from the repository root.  See the script for details.

## How to Play

The prototype provides a minimal interface for planning and executing unit
commands on a shared timeline:

1. Select a unit from the drop‑down list.
2. Use the sliders to set the start time and duration for the next command.
3. Click one of the command buttons (Move, Fortify, Reload, Smoke, Refill) to
   add it to the plan.  The plan is displayed as coloured bars.
4. Press **Run** to execute the plan.  Units will move according to your
   commands until an enemy enters their vision and line‑of‑sight.  At that
   precise moment their movement is interrupted, they enter combat and begin
   firing.
5. Use the **Ambush** button (when enough TimeSims credits are available)
   to open a new planning window mid‑engagement.

Buildings and smoke volumes block line‑of‑sight.  The debug overlay shows
each unit’s vision radius (faint disc), fire radius (solid disc) and the
current LOS line to the nearest enemy (green when clear, red when blocked).
Markers below the timeline indicate detection events, LOS transitions and
interruptions.

This is an early prototype – many elements are intentionally simple to
emphasise clarity over complexity.  Feel free to build upon it and extend
the gameplay.