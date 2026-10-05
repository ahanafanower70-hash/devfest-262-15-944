/**
 * Controls Component
 * Start location picker, mode switchers, reset hazard buttons, import/export controls
 */

export class Controls {
  constructor(options) {
    this.options = options;
  }

  updateStartOptions(nodes, blockedNodes, currentStartId) {
    const select = document.getElementById('startNodeSelect');
    if (!select) return;

    select.innerHTML = '';
    nodes.forEach(node => {
      if (node.type === 'exit') return;
      const isBlocked = blockedNodes.has(node.id);
      const opt = document.createElement('option');
      opt.value = node.id;
      opt.textContent = `${node.id} - ${node.label} (${node.type.toUpperCase()})${isBlocked ? ' [BLOCKED]' : ''}`;
      if (node.id === currentStartId) opt.selected = true;
      select.appendChild(opt);
    });
  }
}
