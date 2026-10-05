/**
 * HazardPanel Component
 * Lists and manages hazards (rooms, corridors, exits) with filter tabs and search
 */

export class HazardPanel {
  constructor(containerId, options) {
    this.container = document.getElementById(containerId);
    this.options = options;
  }

  render(buildingData, blockedNodes, blockedEdges, closedExits, activeTab = 'all', searchQuery = '') {
    if (!this.container) return;
    this.container.innerHTML = '';

    const query = searchQuery.toLowerCase();

    // 1. Rooms & Junctions
    if (activeTab === 'all' || activeTab === 'nodes') {
      buildingData.nodes.filter(n => n.type !== 'exit').forEach(node => {
        if (query && !node.id.toLowerCase().includes(query) && !node.label.toLowerCase().includes(query)) return;
        const isBlocked = blockedNodes.has(node.id);
        this.container.appendChild(this.createRow(
          node.id,
          `${node.label} (${node.type})`,
          isBlocked ? 'Blocked' : 'Clear',
          isBlocked,
          () => this.options.onToggleNode(node.id)
        ));
      });
    }

    // 2. Corridors (Edges)
    if (activeTab === 'all' || activeTab === 'corridors') {
      buildingData.edges.forEach(edge => {
        const label = `${edge.from} ↔ ${edge.to} [Cost: ${edge.cost}]`;
        if (query && !edge.id.toLowerCase().includes(query) && !label.toLowerCase().includes(query)) return;
        const isBlocked = blockedEdges.has(edge.id);
        this.container.appendChild(this.createRow(
          edge.id,
          label,
          isBlocked ? 'Blocked' : 'Clear',
          isBlocked,
          () => this.options.onToggleEdge(edge.id)
        ));
      });
    }

    // 3. Exits
    if (activeTab === 'all' || activeTab === 'exits') {
      buildingData.nodes.filter(n => n.type === 'exit').forEach(node => {
        if (query && !node.id.toLowerCase().includes(query) && !node.label.toLowerCase().includes(query)) return;
        const isClosed = closedExits.has(node.id);
        this.container.appendChild(this.createRow(
          node.id,
          `${node.label} (Exit)`,
          isClosed ? 'Closed' : 'Open',
          isClosed,
          () => this.options.onToggleNode(node.id)
        ));
      });
    }

    if (this.container.children.length === 0) {
      this.container.innerHTML = '<p class="text-slate-500 italic text-xs text-center py-4">No matching hazard items found.</p>';
    }
  }

  createRow(id, label, statusText, isHazardous, onToggle) {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs hover:border-slate-700 transition';
    
    row.innerHTML = `
      <div class="flex items-center gap-2 truncate pr-2">
        <span class="w-2 h-2 rounded-full flex-shrink-0 ${isHazardous ? 'bg-rose-500' : 'bg-emerald-500'}"></span>
        <span class="font-mono font-bold text-slate-200">${id}</span>
        <span class="text-slate-400 truncate text-[11px]">${label}</span>
      </div>
      <button class="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex-shrink-0 ${
        isHazardous ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40 hover:bg-rose-600/50' : 
                      'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
      }">
        ${statusText}
      </button>
    `;

    row.querySelector('button').addEventListener('click', onToggle);
    return row;
  }
}
