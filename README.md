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

The `public/assets/models` directory contains a set of simple [glTF 2.0](https://www.khronos.org/gltf/)
models used for units, weapons, projectiles and visual effects.  They are
generated programmatically by the script in `scripts/generate-assets.cjs`.  Each
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
npm run generate-assets
```

from the repository root.  See the script for details.

## How to Play

The prototype provides a minimal interface for planning and executing unit
commands on a shared timeline.  After installing and starting the dev
server, open the app in a browser and you will see a top‑down 3D view and
a planning panel.  The basic flow is:

1. **Select a unit** from the drop‑down menu in the control panel.  Three
   units are available by default: an infantry squad, a tank and an IFV.
2. **Set the start time and duration** for the next command using the
   numeric fields.  Start times and durations are measured in seconds on
   the global timeline.  The default prepare phase lasts 10 seconds, after
   which the enemy begins approaching.
3. **Choose a command** by clicking one of the command buttons:
   - **Move**: Specify a direction vector `(dx, dz)` and duration; the
     unit will travel in that direction at its speed until the command
     completes or it is interrupted.
   - **Fortify**: The unit stops and takes cover for the specified
     duration.
   - **Reload**: Reloads the unit’s special weapon (placeholder).
   - **Smoke**: Deploys a circular smoke cloud at the unit’s position.
     While active it blocks line‑of‑sight for all units and enemies.
   - **Refill**: Simulates refuelling or rearming at a supply point.  If
     the refill overlaps the first two seconds of the enemy incoming phase
     a warning will be generated.
4. **Repeat**: Add as many commands as you like to the selected unit.  The
   list of commands for that unit is shown in the panel.  Commands are
   sorted by start time.  Switch to other units using the drop‑down and
   build their plans.
5. **Run** the simulation by clicking **Run Simulation**.  The offline
   planner will run deterministically using the same logic as the real‑time
   execution.  Units will follow their Move commands, stop when they
   fortify, and deploy smoke or refill at the appointed times.  If an
   enemy enters a unit’s vision and clear line‑of‑sight while that unit
   is moving, the movement is interrupted precisely at that timestamp.  An
   interrupt marker is emitted and the unit enters a combat state.
6. **Observe** the playback.  During the run, the unit models move in
   real time, the credit meter begins filling once the enemy incoming
   phase starts, and markers appear along the timeline for detection
   events, LOS transitions and interruptions.  The event log on the right
   shows a textual summary as each marker is reached.

### Line‑of‑Sight and Occlusion

Buildings and smoke volumes block line‑of‑sight.  In the 3D view you will
see faint discs around each unit representing their vision radius and
semi‑transparent red discs representing their weapon range.  When the line
segment from a unit to an enemy intersects a building or a smoke volume
(while that smoke is active), the enemy cannot be detected or targeted.
The LOS state transitions are recorded as markers on the timeline.

### TimeSims Credits and Ambushes

At the start of each turn there is a **prepare phase** (default 10
seconds) where no enemies attack.  Once the enemy incoming phase
begins, a **TimeSims credit meter** fills up based on how long you
survive without leaking enemies or taking damage.  In this prototype the
credit meter is displayed below the timeline.  When it reaches full the
UI would normally enable an *Ambush* button, allowing you to pause the
action and plan additional commands.  The current prototype calculates
credits but does not yet implement the ambush phase – this is left as an
exercise for future development.

This is an early prototype.  Many systems are simplified for clarity;
for example, enemies do not yet move dynamically, and units fire
placeholder projectiles.  Nevertheless, it demonstrates the key
principles: deterministic simulation, clear planning and feedback, and
the interaction between vision, occlusion and timing.