/**
 * RouteSummary Component
 * Route status badge, failure banners, metrics grid, breadcrumbs, turn-by-turn guidance
 */

import { TRANSLATIONS } from '../utils/i18n.js';

export class RouteSummary {
  constructor(options) {
    this.options = options;
  }

  update(route, buildingData, startNodeId, currentLang = 'en') {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    const statusBadge = document.getElementById('routeStatusBadge');
    const statusDot = document.getElementById('routeStatusDot');
    const statusText = document.getElementById('routeStatusText');
    const evalBanner = document.getElementById('evaluationResultBanner');
    const evalIndicator = document.getElementById('evalStatusIndicator');
    const evalText = document.getElementById('evalResultText');
    const alertBox = document.getElementById('statusAlertBox');

    alertBox.classList.add('hidden');
    alertBox.innerHTML = '';

    if (route.status === 'BLOCKED_START') {
      if (statusBadge) statusBadge.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold shadow-sm bg-rose-500/20 text-rose-400 border border-rose-500/50 flex-shrink-0';
      if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-rose-500 animate-ping';
      if (statusText) statusText.textContent = t.status_start_blocked;

      if (evalBanner && evalIndicator && evalText) {
        evalBanner.className = 'p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 mb-3 shadow-lg transition-all duration-200';
        evalIndicator.className = 'px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30';
        evalIndicator.textContent = 'BLOCKED';
        evalText.className = 'font-mono text-sm sm:text-base font-black text-rose-300 break-all tracking-wide';
        evalText.textContent = t.status_start_blocked;
      }

      alertBox.className = 'p-3 rounded-xl border border-rose-500/40 bg-rose-950/40 text-rose-300 text-xs flex items-center gap-2 mb-3';
      alertBox.innerHTML = `
        <svg class="w-4 h-4 text-rose-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div>
          <strong>${t.status_start_blocked}</strong>: Selected start location <code>${startNodeId}</code> is currently blocked by a hazard.
        </div>
      `;
      alertBox.classList.remove('hidden');

      document.getElementById('metricCost').textContent = '—';
      document.getElementById('metricExit').textContent = '—';
      document.getElementById('metricSteps').textContent = '—';
    } else if (route.status === 'NO_ROUTE') {
      if (statusBadge) statusBadge.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold shadow-sm bg-amber-500/20 text-amber-400 border border-amber-500/50 flex-shrink-0';
      if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-ping';
      if (statusText) statusText.textContent = t.status_no_route;

      if (evalBanner && evalIndicator && evalText) {
        evalBanner.className = 'p-3 rounded-xl bg-amber-950/40 border border-amber-500/50 mb-3 shadow-lg transition-all duration-200';
        evalIndicator.className = 'px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30';
        evalIndicator.textContent = 'UNREACHABLE';
        evalText.className = 'font-mono text-sm sm:text-base font-black text-amber-300 break-all tracking-wide';
        evalText.textContent = t.status_no_route;
      }

      alertBox.className = 'p-3 rounded-xl border border-amber-500/40 bg-amber-950/40 text-amber-300 text-xs flex items-center gap-2 mb-3';
      alertBox.innerHTML = `
        <svg class="w-4 h-4 text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div>
          <strong>${t.status_no_route}</strong>: All exit pathways are blocked or unreachable from ${startNodeId}.
        </div>
      `;
      alertBox.classList.remove('hidden');

      document.getElementById('metricCost').textContent = '—';
      document.getElementById('metricExit').textContent = '—';
      document.getElementById('metricSteps').textContent = '—';
    } else {
      if (statusBadge) statusBadge.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold shadow-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex-shrink-0';
      if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
      if (statusText) statusText.textContent = t.status_optimal;

      if (evalBanner && evalIndicator && evalText) {
        evalBanner.className = 'p-3 rounded-xl bg-slate-900/90 border border-emerald-500/40 mb-3 shadow-lg transition-all duration-200';
        evalIndicator.className = 'px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        evalIndicator.textContent = 'OPTIMAL';
        evalText.className = 'font-mono text-sm sm:text-base font-black text-emerald-300 break-all tracking-wide';
        evalText.textContent = `${route.path.join(' - ')}; cost ${route.cost}`;
      }

      document.getElementById('metricCost').textContent = route.cost;
      document.getElementById('metricExit').textContent = route.exit;
      document.getElementById('metricSteps').textContent = Math.max(0, route.path.length - 1);
    }

    // Breadcrumbs
    const bcContainer = document.getElementById('pathBreadcrumbs');
    bcContainer.innerHTML = '';

    if (route.status === 'SUCCESS' && route.path.length > 0) {
      document.getElementById('pathLengthBadge').textContent = `${route.path.length} nodes`;
      route.path.forEach((nodeId, idx) => {
        const badge = document.createElement('span');
        badge.className = 'px-2 py-0.5 rounded-md font-bold cursor-pointer transition flex items-center gap-1 ' +
          (idx === 0 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
           idx === route.path.length - 1 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
           'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500');
        badge.textContent = nodeId;
        badge.title = `Click to set ${nodeId} as start`;
        badge.onclick = () => this.options.onSelectStart(nodeId);
        bcContainer.appendChild(badge);

        if (idx < route.path.length - 1) {
          const arrow = document.createElement('span');
          arrow.className = 'text-slate-600 font-bold';
          arrow.innerHTML = '&rarr;';
          bcContainer.appendChild(arrow);
        }
      });
    } else {
      document.getElementById('pathLengthBadge').textContent = '0 nodes';
      const emptyMsg = document.createElement('span');
      emptyMsg.className = 'text-slate-500 italic text-[11px]';
      emptyMsg.textContent = route.status === 'BLOCKED_START' ? t.status_start_blocked : t.status_no_route;
      bcContainer.appendChild(emptyMsg);
    }

    // Turn by Turn
    this.renderTurnByTurn(route, buildingData);

    // Alternative Route
    const altCard = document.getElementById('altRouteContainer');
    if (route.alternative) {
      altCard.classList.remove('hidden');
      document.getElementById('altRouteCost').textContent = `${t.metric_cost}: ${route.alternative.cost}`;
      document.getElementById('altRoutePath').innerHTML = route.alternative.path.join(' &rarr; ');
    } else {
      altCard.classList.add('hidden');
    }
  }

  renderTurnByTurn(route, buildingData) {
    const container = document.getElementById('turnByTurnList');
    container.innerHTML = '';
    const nodeMap = new Map(buildingData.nodes.map(n => [n.id, n]));

    if (!route || route.status !== 'SUCCESS' || route.path.length < 2) {
      container.innerHTML = '<p class="text-slate-500 italic text-[11px]">No active route instructions to display.</p>';
      return;
    }

    const path = route.path;
    for (let i = 0; i < path.length - 1; i++) {
      const u = nodeMap.get(path[i]);
      const v = nodeMap.get(path[i + 1]);
      if (!u || !v) continue;

      const edge = buildingData.edges.find(e => 
        (e.from === u.id && e.to === v.id) || (e.from === v.id && e.to === u.id)
      );
      const cost = edge ? edge.cost : 1;

      const div = document.createElement('div');
      div.className = 'step-direction-item text-[11px] py-1 px-2 rounded-lg border border-transparent transition-all flex items-center justify-between';
      div.innerHTML = `
        <div>
          <span class="font-bold text-slate-200">Step ${i + 1}:</span> 
          <span>${u.label} (${u.id}) &rarr; ${v.label} (${v.id})</span>
        </div>
        <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Cost: ${cost}</span>
      `;
      container.appendChild(div);
    }
  }
}
