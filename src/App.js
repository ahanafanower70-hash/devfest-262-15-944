/**
 * App.js - Application Orchestrator
 * Coordinates State, Routing, Hazard Management, Simulator, and UI Components
 */

import { TRANSLATIONS } from './utils/i18n.js';
import { validateBuildingJson } from './utils/jsonValidator.js';
import { computeOptimalRoute } from './utils/dijkstra.js';
import { MapCanvas } from './components/MapCanvas.js';
import { LanguageToggle } from './components/LanguageToggle.js';
import { Controls } from './components/Controls.js';
import { HazardPanel } from './components/HazardPanel.js';
import { RouteSummary } from './components/RouteSummary.js';

export class App {
  constructor(defaultData) {
    this.state = {
      language: localStorage.getItem('smart_escape_lang') || 'en',
      highContrast: false,
      interactionMode: 'start', // 'start' | 'hazard'
      activeHazardTab: 'all',
      hazardSearchQuery: '',

      buildingData: JSON.parse(JSON.stringify(defaultData)),
      fileInitialState: JSON.parse(JSON.stringify(defaultData.initial_state)),

      blockedNodes: new Set(defaultData.initial_state.blocked_nodes || []),
      blockedEdges: new Set(defaultData.initial_state.blocked_edges || []),
      closedExits: new Set(defaultData.initial_state.closed_exits || []),

      startNodeId: 'R1',
      calculatedRoute: null,
      alternativeRoute: null,

      simulating: false,
      simStepIndex: 0,
      simTimer: null,
      simSpeed: 1.75
    };

    this.init();
  }

  init() {
    this.mapCanvas = new MapCanvas('mapSvg', {
      onSelectStart: (id) => this.setStartNode(id),
      onToggleNode: (id) => this.toggleNodeHazard(id),
      onToggleEdge: (id) => this.toggleEdgeHazard(id)
    });

    this.controls = new Controls({});
    this.hazardPanel = new HazardPanel('hazardListContainer', {
      onToggleNode: (id) => this.toggleNodeHazard(id),
      onToggleEdge: (id) => this.toggleEdgeHazard(id)
    });

    this.routeSummary = new RouteSummary({
      onSelectStart: (id) => this.setStartNode(id)
    });

    const langToggleContainer = document.getElementById('langToggleContainer');
    if (langToggleContainer) {
      this.languageToggle = new LanguageToggle(langToggleContainer, (lang) => {
        this.setLanguage(lang);
      }, this.state.language);
    }

    this.setupEvents();
    this.setLanguage(this.state.language);
    this.recalculate();

    setTimeout(() => {
      this.mapCanvas.fitToScreen(this.state.buildingData.nodes);
    }, 120);

    window.addEventListener('resize', () => {
      this.mapCanvas.fitToScreen(this.state.buildingData.nodes);
    });
  }

  recalculate() {
    const route = computeOptimalRoute(
      this.state.buildingData.nodes,
      this.state.buildingData.edges,
      this.state.blockedNodes,
      this.state.blockedEdges,
      this.state.closedExits,
      this.state.startNodeId
    );

    this.state.calculatedRoute = route;
    this.state.alternativeRoute = route.alternative || null;

    this.updateUI();
    this.mapCanvas.render(
      this.state.buildingData,
      this.state.blockedNodes,
      this.state.blockedEdges,
      this.state.closedExits,
      this.state.startNodeId,
      this.state.calculatedRoute,
      this.state.alternativeRoute,
      this.state.interactionMode
    );
  }

  setStartNode(nodeId) {
    const node = this.state.buildingData.nodes.find(n => n.id === nodeId);
    if (!node || node.type === 'exit') return;
    this.state.startNodeId = nodeId;
    this.recalculate();
  }

  toggleNodeHazard(nodeId) {
    const node = this.state.buildingData.nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.type === 'exit') {
      if (this.state.closedExits.has(nodeId)) {
        this.state.closedExits.delete(nodeId);
      } else {
        this.state.closedExits.add(nodeId);
      }
    } else {
      if (this.state.blockedNodes.has(nodeId)) {
        this.state.blockedNodes.delete(nodeId);
      } else {
        this.state.blockedNodes.add(nodeId);
      }
    }
    this.recalculate();
  }

  toggleEdgeHazard(edgeId) {
    if (this.state.blockedEdges.has(edgeId)) {
      this.state.blockedEdges.delete(edgeId);
    } else {
      this.state.blockedEdges.add(edgeId);
    }
    this.recalculate();
  }

  resetHazardsToInitial() {
    this.state.blockedNodes = new Set(this.state.fileInitialState.blocked_nodes || []);
    this.state.blockedEdges = new Set(this.state.fileInitialState.blocked_edges || []);
    this.state.closedExits = new Set(this.state.fileInitialState.closed_exits || []);
    this.recalculate();
  }

  clearAllHazards() {
    this.state.blockedNodes.clear();
    this.state.blockedEdges.clear();
    this.state.closedExits.clear();
    this.recalculate();
  }

  setLanguage(lang) {
    this.state.language = lang;
    localStorage.setItem('smart_escape_lang', lang);
    document.documentElement.lang = lang;

    const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        el.textContent = t[key];
      }
    });

    if (this.languageToggle) {
      this.languageToggle.setLanguage(lang);
    }

    this.updateUI();
  }

  updateUI() {
    // Header counts
    const nodeCount = document.getElementById('statNodeCount');
    if (nodeCount) nodeCount.textContent = this.state.buildingData.nodes.length;

    const edgeCount = document.getElementById('statEdgeCount');
    if (edgeCount) edgeCount.textContent = this.state.buildingData.edges.length;

    const totalHazards = this.state.blockedNodes.size + this.state.blockedEdges.size + this.state.closedExits.size;
    const hazardCount = document.getElementById('statHazardCount');
    if (hazardCount) hazardCount.textContent = totalHazards;

    const startBadge = document.getElementById('activeStartBadge');
    if (startBadge) startBadge.textContent = this.state.startNodeId;

    const bldgTag = document.getElementById('buildingNameTag');
    if (bldgTag) bldgTag.textContent = this.state.buildingData.building || 'Building';

    // Route Summary Card
    this.routeSummary.update(
      this.state.calculatedRoute,
      this.state.buildingData,
      this.state.startNodeId,
      this.state.language
    );

    // Controls Dropdown
    this.controls.updateStartOptions(
      this.state.buildingData.nodes,
      this.state.blockedNodes,
      this.state.startNodeId
    );

    // Hazard Panel List
    this.hazardPanel.render(
      this.state.buildingData,
      this.state.blockedNodes,
      this.state.blockedEdges,
      this.state.closedExits,
      this.state.activeHazardTab,
      this.state.hazardSearchQuery
    );
  }

  setupEvents() {
    // High contrast toggle
    const btnHc = document.getElementById('btnHighContrast');
    if (btnHc) {
      btnHc.onclick = () => {
        this.state.highContrast = !this.state.highContrast;
        document.body.classList.toggle('high-contrast', this.state.highContrast);
        this.mapCanvas.render(
          this.state.buildingData,
          this.state.blockedNodes,
          this.state.blockedEdges,
          this.state.closedExits,
          this.state.startNodeId,
          this.state.calculatedRoute,
          this.state.alternativeRoute,
          this.state.interactionMode
        );
      };
    }

    // Reset hazards button
    const btnReset = document.getElementById('btnResetHazards');
    if (btnReset) btnReset.onclick = () => this.resetHazardsToInitial();

    const btnRestore = document.getElementById('btnRestoreInitial');
    if (btnRestore) btnRestore.onclick = () => this.resetHazardsToInitial();

    const btnClearAll = document.getElementById('btnClearAllHazards');
    if (btnClearAll) btnClearAll.onclick = () => this.clearAllHazards();

    // Interaction Modes
    const modeStart = document.getElementById('modeSelectStart');
    const modeHazard = document.getElementById('modeToggleHazard');

    if (modeStart && modeHazard) {
      modeStart.onclick = () => {
        this.state.interactionMode = 'start';
        modeStart.className = 'px-2.5 py-1 rounded-md text-xs font-medium transition bg-brand-600 text-white shadow-sm flex items-center gap-1';
        modeHazard.className = 'px-2.5 py-1 rounded-md text-xs font-medium transition text-slate-300 hover:text-white flex items-center gap-1';
      };

      modeHazard.onclick = () => {
        this.state.interactionMode = 'hazard';
        modeHazard.className = 'px-2.5 py-1 rounded-md text-xs font-medium transition bg-rose-600 text-white shadow-sm flex items-center gap-1';
        modeStart.className = 'px-2.5 py-1 rounded-md text-xs font-medium transition text-slate-300 hover:text-white flex items-center gap-1';
      };
    }

    // Start Node Select
    const startSelect = document.getElementById('startNodeSelect');
    if (startSelect) {
      startSelect.onchange = (e) => this.setStartNode(e.target.value);
    }

    // Zoom Buttons
    const btnZoomIn = document.getElementById('btnZoomIn');
    if (btnZoomIn) {
      btnZoomIn.onclick = () => {
        this.mapCanvas.zoom = Math.min(this.mapCanvas.zoom * 1.25, 4.0);
        this.mapCanvas.applyTransform();
      };
    }
    const btnZoomOut = document.getElementById('btnZoomOut');
    if (btnZoomOut) {
      btnZoomOut.onclick = () => {
        this.mapCanvas.zoom = Math.max(this.mapCanvas.zoom * 0.8, 0.4);
        this.mapCanvas.applyTransform();
      };
    }
    const btnZoomReset = document.getElementById('btnZoomReset');
    if (btnZoomReset) {
      btnZoomReset.onclick = () => this.mapCanvas.fitToScreen(this.state.buildingData.nodes);
    }

    // Hazard Tabs
    const tabs = [
      { id: 'tabHazardAll', val: 'all' },
      { id: 'tabHazardNodes', val: 'nodes' },
      { id: 'tabHazardEdges', val: 'corridors' },
      { id: 'tabHazardExits', val: 'exits' }
    ];
    tabs.forEach(tab => {
      const el = document.getElementById(tab.id);
      if (!el) return;
      el.onclick = () => {
        this.state.activeHazardTab = tab.val;
        tabs.forEach(t => {
          const btn = document.getElementById(t.id);
          if (btn) {
            btn.className = (t.val === tab.val) ?
              'flex-1 py-1 rounded-lg font-medium transition bg-slate-800 text-white shadow-sm' :
              'flex-1 py-1 rounded-lg font-medium transition text-slate-400 hover:text-slate-200';
          }
        });
        this.hazardPanel.render(
          this.state.buildingData,
          this.state.blockedNodes,
          this.state.blockedEdges,
          this.state.closedExits,
          this.state.activeHazardTab,
          this.state.hazardSearchQuery
        );
      };
    });

    // Hazard Search
    const searchInput = document.getElementById('hazardSearchInput');
    if (searchInput) {
      searchInput.oninput = (e) => {
        this.state.hazardSearchQuery = e.target.value;
        this.hazardPanel.render(
          this.state.buildingData,
          this.state.blockedNodes,
          this.state.blockedEdges,
          this.state.closedExits,
          this.state.activeHazardTab,
          this.state.hazardSearchQuery
        );
      };
    }

    // Simulation controls
    const btnPlaySim = document.getElementById('btnPlaySim');
    if (btnPlaySim) {
      btnPlaySim.onclick = () => {
        if (this.state.simulating) {
          this.pauseSimulation();
        } else {
          this.startSimulation();
        }
      };
    }

    const btnResetSim = document.getElementById('btnResetSim');
    if (btnResetSim) {
      btnResetSim.onclick = () => this.stopSimulation();
    }

    const speedSelect = document.getElementById('simSpeedSelect');
    if (speedSelect) {
      speedSelect.onchange = (e) => {
        this.state.simSpeed = parseFloat(e.target.value) || 1.75;
      };
    }

    // File Upload Input
    const fileInput = document.getElementById('fileUploadInput');
    if (fileInput) {
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const json = JSON.parse(event.target.result);
            const validation = validateBuildingJson(json, this.state.language);
            if (!validation.valid) {
              this.showAlert(`Validation Failed: ${validation.errors.join(' ')}`, 'error');
              return;
            }

            this.state.buildingData = json;
            this.state.fileInitialState = JSON.parse(JSON.stringify(json.initial_state));
            this.state.blockedNodes = new Set(json.initial_state.blocked_nodes || []);
            this.state.blockedEdges = new Set(json.initial_state.blocked_edges || []);
            this.state.closedExits = new Set(json.initial_state.closed_exits || []);

            const firstValidStart = json.nodes.find(n => n.type !== 'exit' && !this.state.blockedNodes.has(n.id));
            this.state.startNodeId = firstValidStart ? firstValidStart.id : json.nodes[0].id;

            this.showAlert(TRANSLATIONS[this.state.language].alert_json_success, 'success');
            this.recalculate();
            this.mapCanvas.fitToScreen(this.state.buildingData.nodes);
          } catch (err) {
            this.showAlert(`${TRANSLATIONS[this.state.language].alert_invalid_json}: ${err.message}`, 'error');
          }
        };
        reader.readAsText(file);
      };
    }
  }

  startSimulation() {
    if (!this.state.calculatedRoute || this.state.calculatedRoute.status !== 'SUCCESS') return;
    const path = this.state.calculatedRoute.path;
    if (!path || path.length < 2) return;

    this.state.simulating = true;
    this.state.simStepIndex = 0;
    this.updateSimButtonState();

    const nodeMap = new Map(this.state.buildingData.nodes.map(n => [n.id, n]));

    const tick = () => {
      if (!this.state.simulating) return;

      if (this.state.simStepIndex >= path.length) {
        this.stopSimulation();
        return;
      }

      const currentId = path[this.state.simStepIndex];
      const node = nodeMap.get(currentId);
      if (node) {
        this.mapCanvas.renderEvacuee(node.x, node.y);
      }

      this.state.simStepIndex++;
      const interval = Math.max(250, Math.floor(1000 / this.state.simSpeed));
      this.state.simTimer = setTimeout(tick, interval);
    };

    tick();
  }

  pauseSimulation() {
    this.state.simulating = false;
    if (this.state.simTimer) clearTimeout(this.state.simTimer);
    this.updateSimButtonState();
  }

  stopSimulation() {
    this.state.simulating = false;
    if (this.state.simTimer) clearTimeout(this.state.simTimer);
    this.state.simStepIndex = 0;
    if (this.mapCanvas.simLayer) this.mapCanvas.simLayer.innerHTML = '';
    this.updateSimButtonState();
  }

  updateSimButtonState() {
    const btn = document.getElementById('btnPlaySim');
    const text = document.getElementById('simPlayText');
    const t = TRANSLATIONS[this.state.language] || TRANSLATIONS.en;
    if (!btn || !text) return;

    if (this.state.simulating) {
      text.textContent = t.sim_pause;
      btn.classList.replace('bg-emerald-600', 'bg-amber-600');
    } else {
      text.textContent = t.sim_play;
      btn.classList.replace('bg-amber-600', 'bg-emerald-600');
    }
  }

  showAlert(message, type = 'error') {
    const container = document.getElementById('alertContainer');
    if (!container) return;
    const alert = document.createElement('div');
    const isErr = (type === 'error');

    alert.className = `p-3 rounded-xl border text-xs flex items-center justify-between transition-all duration-300 ${
      isErr ? 'bg-rose-950/80 border-rose-700 text-rose-200' : 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
    }`;

    alert.innerHTML = `
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 flex-shrink-0 ${isErr ? 'text-rose-400' : 'text-emerald-400'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${isErr ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' :
                    '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'}
        </svg>
        <span>${message}</span>
      </div>
      <button class="text-slate-400 hover:text-white p-1">&times;</button>
    `;

    alert.querySelector('button').onclick = () => alert.remove();
    container.appendChild(alert);

    setTimeout(() => {
      if (alert.parentNode) alert.remove();
    }, 7000);
  }
}
