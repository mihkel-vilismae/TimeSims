import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { createMenuState, openMenu, closeMenu, selectMenuCommand, getVisibleCommandsForSelectedUnit } from '../timesims/uiPlan/menuState';
import { authorMoveCommand, authorDeploySmokeCommand } from '../timesims/uiPlan/authoring';
import { planWorld } from '../timesims/planning/planner';
import { createExecutionRuntime, runExecutionTick } from '../timesims/execution/executionRuntime';
import type { TimelineMarker, TimelinePlan } from '../model/components';

import { createRuntimeWorld } from './entities/runtimeEntities';
import { createUiState, setSelectedUnitId, setMenuState, setPendingCommand } from './state/uiState';
import { createRuntimeState } from './state/runtimeState';
import { pickUnitIdAtClient, applySelectionHighlight } from './systems/selectionSystem';
import { createContextMenuDom, renderContextMenu, clampMenuToViewport } from './systems/contextMenuSystem';
import { installInputHandlers } from './systems/inputSystem';

const WORLD_DT = 0.1;

export function startApp(): void {
  const appEl = document.querySelector<HTMLDivElement>('#app');
  if (!appEl) throw new Error('Missing #app');

  appEl.innerHTML = `
    <div class="layout">
      <div class="toolbar">
        <button id="btn-run">Run</button>
        <button id="btn-stop">Stop</button>
        <label class="row">
          <span>Prepare</span>
          <input id="prepareDur" type="number" value="10" min="0" step="0.1" />
        </label>
        <div id="markers" class="markers"></div>
      </div>
      <div class="viewport" id="viewport"></div>
    </div>
  `;

  const viewportEl = document.querySelector<HTMLDivElement>('#viewport');
  if (!viewportEl) throw new Error('Missing #viewport');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d12);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.set(10, 12, 14);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(1, 1);
  viewportEl.appendChild(renderer.domElement);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.5, 0.25, 0.85));

  const raycaster = new THREE.Raycaster();

  const menuDom = createContextMenuDom();
  document.body.appendChild(menuDom.root);

  const menuState0 = createMenuState();
  let ui = createUiState(menuState0);
  let rt = createRuntimeState();

  const markersEl = document.querySelector<HTMLDivElement>('#markers');
  const btnRun = document.querySelector<HTMLButtonElement>('#btn-run');
  const btnStop = document.querySelector<HTMLButtonElement>('#btn-stop');
  const prepareInput = document.querySelector<HTMLInputElement>('#prepareDur');
  if (!markersEl || !btnRun || !btnStop || !prepareInput) throw new Error('Missing UI controls');

  // Runtime scratch (kept in app.ts orchestration, but never fed into simulation core).
  let placing: null | { kind: 'move' | 'deploySmoke'; target: THREE.Vector3; radius?: number } = null;
  let lastGroundPoint: THREE.Vector3 | null = null;
  let exec = createExecutionRuntime({ dt: WORLD_DT });

  const world = createRuntimeWorld(scene);

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
    const selUnit = ui.selectedUnitId ? world.units.find((u) => u.id === ui.selectedUnitId) : null;
    const unitKind = selUnit?.kind ?? null;
    const nextMenu = unitKind ? getVisibleCommandsForSelectedUnit(setMenuState(ui, ui.menu).menu, unitKind) : ui.menu;
    // (Above helper is pure; it returns list only. We still store MenuState separately.)
    ui = setMenuState(ui, ui.menu);
    // Render menu list from unitKind.
    renderContextMenu({
      dom: menuDom,
      isOpen: ui.menu.isOpen,
      pos: ui.menu.pos,
      commands: unitKind ? getVisibleCommandsForSelectedUnit(ui.menu, unitKind) : [],
      onSelect: (cmd) => {
        ui = setMenuState(ui, selectMenuCommand(ui.menu, cmd));
        ui = setPendingCommand(ui, cmd);
        ui = setMenuState(ui, closeMenu(ui.menu));
      },
    });
  }

  function setSelection(id: string | null): void {
    ui = setSelectedUnitId(ui, id);
    applySelectionHighlight(world, id);
    if (ui.menu.isOpen) {
      // Close menu if selection changes.
      ui = setMenuState(ui, closeMenu(ui.menu));
    }
    menuForSelection();
  }

  function getGroundPoint(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    raycaster.setFromCamera({ x, y }, camera);
    const hits = raycaster.intersectObjects([world.ground], false);
    if (hits.length === 0) return null;
    const p = hits[0].point;
    return new THREE.Vector3(p.x, 0, p.z);
  }

  function updateMarkers(list: TimelineMarker[]): void {
    markersEl.innerHTML = list
      .slice(-10)
      .map((m) => `<div class="marker"><b>${m.kind}</b> @ ${m.t.toFixed(1)} — ${m.message}</div>`)
      .join('');
  }

  function closeMenuIfOpen(): void {
    if (!ui.menu.isOpen) return;
    ui = setMenuState(ui, closeMenu(ui.menu));
    renderContextMenu({
      dom: menuDom,
      isOpen: false,
      pos: { x: 0, y: 0 },
      commands: [],
      onSelect: () => void 0,
    });
  }

  function beginPlacement(kind: 'move' | 'deploySmoke'): void {
    placing = { kind, target: new THREE.Vector3() };
  }

  function confirmPlacement(): void {
    if (!placing || !ui.selectedUnitId || !lastGroundPoint) return;
    const unit = world.units.find((u) => u.id === ui.selectedUnitId);
    if (!unit) return;

    const startTime = ui.scrubT;
    const dt = WORLD_DT;
    if (placing.kind === 'move') {
      const res = authorMoveCommand({
        plan: unit.timelinePlan,
        unitId: unit.id,
        unitKind: unit.kind,
        moveSpeed: unit.moveSpeed.mps,
        startTime,
        fromPos: unit.transform.pos,
        toPos: { x: lastGroundPoint.x, y: 0, z: lastGroundPoint.z },
        dt,
      });
      if (res.ok) {
        unit.timelinePlan = res.nextPlan;
      }
    } else {
      const res = authorDeploySmokeCommand({
        plan: unit.timelinePlan,
        unitId: unit.id,
        unitKind: unit.kind,
        startTime,
        duration: 3,
        radius: 2.5,
        center: { x: lastGroundPoint.x, y: 0, z: lastGroundPoint.z },
        dt,
      });
      if (res.ok) {
        unit.timelinePlan = res.nextPlan;
      }
    }

    placing = null;
    ui = setPendingCommand(ui, null);
  }

  // Input wiring
  installInputHandlers({
    rendererDom: renderer.domElement,
    callbacks: {
      onLeftClick: (ev) => {
        if (placing) {
          confirmPlacement();
          return;
        }

        const id = pickUnitIdAtClient({
          clientX: ev.clientX,
          clientY: ev.clientY,
          rendererDom: renderer.domElement,
          camera,
          raycaster,
          world,
        });
        setSelection(id);
      },
      onRightClick: (ev) => {
        ev.preventDefault();
        if (!ui.selectedUnitId) return;
        if (rt.executionLocked) return;
        const pos = clampMenuToViewport({ x: ev.clientX, y: ev.clientY });
        ui = setMenuState(ui, openMenu(ui.menu, pos));
        const unit = world.units.find((u) => u.id === ui.selectedUnitId);
        const cmds = unit ? getVisibleCommandsForSelectedUnit(ui.menu, unit.kind) : [];
        renderContextMenu({
          dom: menuDom,
          isOpen: true,
          pos,
          commands: cmds,
          onSelect: (cmd) => {
            ui = setMenuState(ui, selectMenuCommand(ui.menu, cmd));
            ui = setPendingCommand(ui, cmd);
            ui = setMenuState(ui, closeMenu(ui.menu));
            if (cmd === 'move') beginPlacement('move');
            if (cmd === 'deploySmoke') beginPlacement('deploySmoke');
            menuForSelection();
          },
        });
      },
      onMouseMove: (ev) => {
        const gp = getGroundPoint(ev.clientX, ev.clientY);
        lastGroundPoint = gp;
      },
      onKeyDown: (ev) => {
        if (ev.key === 'Escape') {
          placing = null;
          ui = setPendingCommand(ui, null);
          closeMenuIfOpen();
        }
      },
      onWindowPointerDown: (ev) => {
        if (!ui.menu.isOpen) return;
        if (menuDom.root.contains(ev.target as Node)) return;
        ui = setMenuState(ui, closeMenu(ui.menu));
        menuForSelection();
      },
    },
  });

  btnRun.addEventListener('click', () => {
    rt.executionLocked = true;
    rt.mode = 'executing';

    // Build snapshot + plans
    const prepareDuration = Number(prepareInput.value) || 10;
    const snapshot = world.toSnapshot();
    const plans = world.toPlans();
    const planned = planWorld({ snapshot, plans, dt: WORLD_DT, prepareDuration });
    exec = createExecutionRuntime({ dt: WORLD_DT, prepareDuration, snapshot, plans });
    updateMarkers(planned.markers);
  });

  btnStop.addEventListener('click', () => {
    rt.executionLocked = false;
    rt.mode = 'planning';
    exec = createExecutionRuntime({ dt: WORLD_DT });
    updateMarkers([]);
  });

  function frame(): void {
    requestAnimationFrame(frame);
    updateViewportSize();
    if (rt.mode === 'executing') {
      const step = runExecutionTick(exec);
      if (step.markers.length) updateMarkers(step.markers);
      world.applyExecution(step.world);
    }

    // Placement preview (simple)
    if (placing && lastGroundPoint && ui.selectedUnitId) {
      const unit = world.units.find((u) => u.id === ui.selectedUnitId);
      if (unit) {
        world.setPreview({
          kind: placing.kind,
          from: unit.mesh.position,
          to: lastGroundPoint,
        });
      }
    } else {
      world.clearPreview();
    }

    composer.render();
  }

  window.addEventListener('resize', updateViewportSize);
  updateViewportSize();
  menuForSelection();
  frame();
}
