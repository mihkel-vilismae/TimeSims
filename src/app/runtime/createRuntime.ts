import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { createContextMenuDom, renderContextMenu, clampMenuToViewport } from '../systems/contextMenuSystem';
import { pickUnitIdAtClient, applySelectionHighlight } from '../systems/selectionSystem';
import { installInputHandlers } from '../systems/inputSystem';

import { createMenuState, openMenu, closeMenu, selectMenuCommand, getVisibleCommandsForSelectedUnit } from '../../timesims/uiPlan/menuState';
import { authorDeploySmokeCommand, authorMoveCommand } from '../../timesims/uiPlan/authoring';import { simulateExecution, simulatePlanning } from '../../timesims/core/simulation';
import { DEFAULT_DT_SEC, DEFAULT_PREPARE_DURATION_SEC } from '../../timesims/config/simConfig';
import { DEFAULT_CONTEXT_MENU_SIZE_PX } from '../../timesims/config/uiConfig';

import type { TimelineMarker, TimelinePlan } from '../../model/commands';
import type { Vec3 } from '../../model/components';
import type { SimWorld } from '../../model/world';

import { createRuntimeState, type RuntimeState } from '../state/runtimeState';
import { createUiState, setMenuState, setPendingCommand, setSelectedUnitId, type UiState } from '../state/uiState';
import { createRuntimeWorld, type RuntimeWorld } from '../entities/runtimeEntities';
import { initOverlayUi, type OverlayUi } from './initOverlayUi';
import { createDebugInspector } from './createDebugInspector';

export type ExecutionFrame = { t: number; units: Record<string, { x: number; z: number }> };

export type AppRuntime = {
  // Three
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;

  // Picking
  raycaster: THREE.Raycaster;
  ndc: THREE.Vector2;

  // DOM
  viewportEl: HTMLDivElement;
  markersEl: HTMLDivElement;
  prepareInput: HTMLInputElement;
  btnRun: HTMLButtonElement;
  btnStop: HTMLButtonElement;

  // UI + runtime state
  ui: UiState;
  rt: RuntimeState;

  // World + plans
  world: RuntimeWorld;
  plans: Record<string, TimelinePlan>;

  // Planning output
  markers: TimelineMarker[];
  dirtyPlan: boolean;

  // Execution playback
  execFrames: ExecutionFrame[];
  execT: number;

  // Mouse
  lastGroundPoint: THREE.Vector3 | null;

  // Cleanup
  disposeInputHandlers: (() => void) | null;

  // UI overlays (debug window, etc.)
  overlayUi: OverlayUi;

  // Timing
  lastFrameMs: number;
};

const emptyPlan = (): TimelinePlan => ({ commands: [] });

function toVec3(p: THREE.Vector3): Vec3 {
  return { x: p.x, y: p.y, z: p.z };
}

function buildSimWorld(world: RuntimeWorld, plans: Record<string, TimelinePlan>): SimWorld {
  return {
    units: world.units.map((u) => ({
      id: u.id,
      pos: { x: u.mesh.position.x, z: u.mesh.position.z },
      visionRadius: u.vision.radius,
      speed: u.moveSpeed?.metersPerSecond ?? 0,
      plan: plans[u.id] ?? emptyPlan(),
    })),
    enemies: world.enemies.map((e) => ({ id: e.id, pos: { x: e.mesh.position.x, z: e.mesh.position.z } })),
    buildings: world.buildings
      .filter((b) => b.blocksLOS)
      .map((b) => ({ pos: { x: b.mesh.position.x, z: b.mesh.position.z }, radius: 3 })),
    smokes: [],
  };
}

export async function createRuntime(): Promise<AppRuntime> {
  const appEl = document.querySelector<HTMLDivElement>('#app');
  if (!appEl) throw new Error('Missing #app');

  appEl.innerHTML = `
    <div class="layout">
      <div class="toolbar">
        <button id="btn-run">Run</button>
        <button id="btn-stop">Stop</button>
        <label class="row">
          <span>Prepare</span>
          <input id="prepareDur" type="number" value="${DEFAULT_PREPARE_DURATION_SEC}" min="0" step="0.1" />
        </label>
        <div id="markers" class="markers"></div>
      </div>
      <div class="viewport" id="viewport"></div>
    </div>
  `;

  const viewportEl = document.querySelector<HTMLDivElement>('#viewport');
  const markersEl = document.querySelector<HTMLDivElement>('#markers');
  const prepareInput = document.querySelector<HTMLInputElement>('#prepareDur');
  const btnRun = document.querySelector<HTMLButtonElement>('#btn-run');
  const btnStop = document.querySelector<HTMLButtonElement>('#btn-stop');
  if (!viewportEl || !markersEl || !prepareInput || !btnRun || !btnStop) throw new Error('Missing toolbar elements');

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  viewportEl.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04070b);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 800);
  camera.position.set(26, 22, 26);
  camera.lookAt(0, 0, 0);

  // Lighting
  const amb = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(amb);
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(20, 40, 10);
  scene.add(dir);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1024, 1024), 0.6, 0.25, 0.85);
  composer.addPass(bloom);

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  const menuDom = createContextMenuDom();
  const menuState = createMenuState();
  const ui = createUiState(menuState);
  const rt = createRuntimeState();

  const overlayUi = initOverlayUi();

  const world = await createRuntimeWorld(scene);
  const plans: Record<string, TimelinePlan> = {};
  for (const u of world.units) plans[u.id] = emptyPlan();

  const runtime: AppRuntime = {
    renderer,
    composer,
    scene,
    camera,
    raycaster,
    ndc,
    viewportEl,
    markersEl,
    prepareInput,
    btnRun,
    btnStop,
    ui,
    rt,
    overlayUi,
    world,
    plans,
    markers: [],
    dirtyPlan: true,
    execFrames: [],
    execT: 0,
    lastGroundPoint: null,
    disposeInputHandlers: null,
    lastFrameMs: performance.now(),
  };

  // Attach inspector used by debug info commands.
  overlayUi.runner.setInspect(createDebugInspector(runtime));

  function updateViewportSize(): void {
    const r = viewportEl.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width));
    const h = Math.max(1, Math.floor(r.height));
    renderer.setSize(w, h);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function menuForSelection(): void {
    const selUnit = runtime.ui.selectedUnitId ? runtime.world.units.find((u) => u.id === runtime.ui.selectedUnitId) : null;
    const unitKind = (selUnit?.kind ?? null) as any;
    const nextMenu = unitKind ? getVisibleCommandsForSelectedUnit(unitKind) : [];
    runtime.ui = setMenuState(runtime.ui, { ...runtime.ui.menu, commands: nextMenu });
  }

  function updateMarkers(markers: TimelineMarker[]): void {
    runtime.markers = markers;
    runtime.markersEl.innerHTML = markers
      .map((m) => `<div class="marker"><span class="t">t=${m.t.toFixed(1)}</span> <span class="k">${m.kind}</span> <span class="m">${m.message}</span></div>`)
      .join('');
  }

  function recomputePlanning(): void {
    const prepareDuration = Number(runtime.prepareInput.value) || DEFAULT_PREPARE_DURATION_SEC;
    const simWorld = buildSimWorld(runtime.world, runtime.plans);
    const planned = simulatePlanning(simWorld, { dt: DEFAULT_DT_SEC, prepareDuration });
    updateMarkers(planned.markers);
    runtime.dirtyPlan = false;
  }

  function buildExecutionFrames(): void {
    const prepareDuration = Number(runtime.prepareInput.value) || DEFAULT_PREPARE_DURATION_SEC;
    const simWorld = buildSimWorld(runtime.world, runtime.plans);
    const executed = simulateExecution(simWorld, { dt: DEFAULT_DT_SEC, prepareDuration });
    runtime.execFrames = executed.frames;
    runtime.execT = 0;
  }

  // Buttons
  btnRun.addEventListener('click', () => {
    runtime.rt = { ...runtime.rt, executionLocked: true, mode: 'executing' };
    buildExecutionFrames();
  });

  btnStop.addEventListener('click', () => {
    runtime.rt = { ...runtime.rt, executionLocked: false, mode: 'planning' };
    runtime.execFrames = [];
    runtime.execT = 0;
    updateMarkers([]);
    runtime.dirtyPlan = true;
  });

  // Input handlers
  runtime.disposeInputHandlers = installInputHandlers({
    rendererDom: renderer.domElement,
    callbacks: {
      onLeftClick: (ev) => {
        if (runtime.ui.menu.open) {
          runtime.ui = setMenuState(runtime.ui, closeMenu(runtime.ui.menu));
          return;
        }

        // If placing a pending command, author it on ground click.
        if (runtime.ui.pendingCommand && runtime.ui.selectedUnitId && runtime.lastGroundPoint) {
          const selUnit = runtime.world.units.find((u) => u.id === runtime.ui.selectedUnitId) ?? null;
          if (selUnit) {
            const startTime = runtime.ui.scrubT;
            const dt = DEFAULT_DT_SEC;

            if (runtime.ui.pendingCommand === 'move') {
              const res = authorMoveCommand({
                plan: runtime.plans[selUnit.id] ?? emptyPlan(),
                unitId: selUnit.id,
                unitKind: selUnit.kind,
                moveSpeed: selUnit.moveSpeed?.metersPerSecond ?? 0,
                startTime,
                fromPos: toVec3(selUnit.mesh.position),
                toPos: toVec3(runtime.lastGroundPoint),
                dt,
              });
              if (res.ok) {
                runtime.plans[selUnit.id] = res.nextPlan;
                runtime.ui = setPendingCommand(runtime.ui, null);
                runtime.dirtyPlan = true;
              }
            } else if (runtime.ui.pendingCommand === 'deploySmoke') {
              const res = authorDeploySmokeCommand({
                plan: runtime.plans[selUnit.id] ?? emptyPlan(),
                unitId: selUnit.id,
                unitKind: selUnit.kind,
                startTime,
                pos: toVec3(runtime.lastGroundPoint),
                dt,
              });
              if (res.ok) {
                runtime.plans[selUnit.id] = res.nextPlan;
                runtime.ui = setPendingCommand(runtime.ui, null);
                runtime.dirtyPlan = true;
              }
            }
          }
        } else {
          const picked = pickUnitIdAtClient({
            clientX: ev.clientX,
            clientY: ev.clientY,
            rendererDom: renderer.domElement,
            camera,
            raycaster,
            ndc,
            world: runtime.world,
          });
          runtime.ui = setSelectedUnitId(runtime.ui, picked);
          applySelectionHighlight({ world: runtime.world, selectedUnitId: runtime.ui.selectedUnitId });
          menuForSelection();
        }
      },

      onRightClick: (ev) => {
        ev.preventDefault();
        if (!runtime.ui.selectedUnitId) return;
        const sel = runtime.ui.selectedUnitId ? runtime.world.units.find((u) => u.id === runtime.ui.selectedUnitId) : null;
        const cmds = sel ? getVisibleCommandsForSelectedUnit(sel.kind) : [];
        const next = openMenu(runtime.ui.menu, ev.clientX, ev.clientY, cmds);
        const clamped = clampMenuToViewport({
          menu: next,
          viewport: { w: window.innerWidth, h: window.innerHeight },
          menuSize: { w: DEFAULT_CONTEXT_MENU_SIZE_PX.w, h: DEFAULT_CONTEXT_MENU_SIZE_PX.h },
        });
        runtime.ui = setMenuState(runtime.ui, clamped);
      },

      onMouseMove: (ev) => {
        // Ground raycast
        const rect = renderer.domElement.getBoundingClientRect();
        ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObject(runtime.world.ground, true);
        runtime.lastGroundPoint = hits.length ? hits[0].point : null;
      },

      onKeyDown: (ev) => {
        if (ev.key === 'Escape') {
          runtime.ui = setMenuState(runtime.ui, closeMenu(runtime.ui.menu));
          runtime.ui = setPendingCommand(runtime.ui, null);
        }
      },

      onWindowPointerDown: () => {
        if (runtime.ui.menu.open) runtime.ui = setMenuState(runtime.ui, closeMenu(runtime.ui.menu));
      },
    },
  });

  // Menu render loop hookup
  function onMenuCommand(cmd: any): void {
    runtime.ui = setMenuState(runtime.ui, closeMenu(runtime.ui.menu));
    runtime.ui = setPendingCommand(runtime.ui, cmd);
  }

  // Store on runtime for step loop: we re-render menu each frame via stepRuntime by calling renderContextMenu.
  (runtime as any)._menuDom = menuDom;
  (runtime as any)._onMenuCommand = onMenuCommand;

  window.addEventListener('resize', updateViewportSize);
  updateViewportSize();
  menuForSelection();

  return runtime;
}
