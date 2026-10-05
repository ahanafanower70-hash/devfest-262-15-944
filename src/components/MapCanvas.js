/**
 * MapCanvas Component
 * Interactive SVG Map rendering, zooming, panning, node markers, badges, route animations
 */

export class MapCanvas {
  constructor(svgId, options) {
    this.svg = document.getElementById(svgId);
    this.viewport = document.getElementById('viewportGroup');
    this.nodesLayer = document.getElementById('nodesLayer');
    this.edgesLayer = document.getElementById('edgesLayer');
    this.edgeBadgesLayer = document.getElementById('edgeBadgesLayer');
    this.routeHighlightLayer = document.getElementById('routeHighlightLayer');
    this.simLayer = document.getElementById('simulationLayer');
    this.popover = document.getElementById('nodePopover');
    this.options = options;

    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this.isPanning = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.initPanZoom();
  }

  initPanZoom() {
    const container = document.getElementById('svgContainer');
    if (!container) return;

    container.addEventListener('mousedown', (e) => {
      if (e.target.closest('.map-node') || e.target.closest('.map-edge-group') || e.target.closest('#nodePopover')) {
        return;
      }
      this.isPanning = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.hidePopover();
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.panX += dx;
      this.panY += dy;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.applyTransform();
    });

    window.addEventListener('mouseup', () => {
      this.isPanning = false;
    });

    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const newZoom = Math.min(Math.max(this.zoom * zoomFactor, 0.4), 4.0);

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
      this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
      this.zoom = newZoom;
      this.applyTransform();
    }, { passive: false });
  }

  applyTransform() {
    if (this.viewport) {
      this.viewport.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
    }
  }

  fitToScreen(nodes) {
    if (!nodes || nodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const container = document.getElementById('svgContainer');
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    const padding = 100;

    const graphWidth = (maxX - minX) || 100;
    const graphHeight = (maxY - minY) || 100;

    const scaleX = (width - padding * 2) / graphWidth;
    const scaleY = (height - padding * 2) / graphHeight;
    this.zoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.6), 2.2);

    this.panX = (width - graphWidth * this.zoom) / 2 - minX * this.zoom;
    this.panY = (height - graphHeight * this.zoom) / 2 - minY * this.zoom;

    this.applyTransform();
  }

  render(buildingData, blockedNodes, blockedEdges, closedExits, startNodeId, calculatedRoute, alternativeRoute, interactionMode) {
    const nodes = buildingData.nodes;
    const edges = buildingData.edges;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    this.edgesLayer.innerHTML = '';
    this.routeHighlightLayer.innerHTML = '';
    this.edgeBadgesLayer.innerHTML = '';
    this.nodesLayer.innerHTML = '';

    // Render Edges
    edges.forEach(edge => {
      const u = nodeMap.get(edge.from);
      const v = nodeMap.get(edge.to);
      if (!u || !v) return;

      const isBlocked = blockedEdges.has(edge.id) ||
                        blockedNodes.has(edge.from) ||
                        blockedNodes.has(edge.to) ||
                        closedExits.has(edge.from) ||
                        closedExits.has(edge.to);

      const isDirectlyBlocked = blockedEdges.has(edge.id);

      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('class', 'map-edge-group');

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', u.x);
      line.setAttribute('y1', u.y);
      line.setAttribute('x2', v.x);
      line.setAttribute('y2', v.y);
      line.setAttribute('class', 'map-edge-line transition-all duration-200');
      line.setAttribute('stroke-linecap', 'round');

      if (isBlocked) {
        line.setAttribute('stroke', '#ef4444');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-dasharray', '6, 4');
        line.setAttribute('opacity', '0.75');
      } else {
        line.setAttribute('stroke', '#475569');
        line.setAttribute('stroke-width', '3.5');
        line.setAttribute('opacity', '0.85');
      }

      group.appendChild(line);

      group.addEventListener('click', (e) => {
        e.stopPropagation();
        this.options.onToggleEdge(edge.id);
      });

      this.edgesLayer.appendChild(group);

      // Midpoint Cost Badge
      const midX = (u.x + v.x) / 2;
      const midY = (u.y + v.y) / 2;

      const badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      badgeG.setAttribute('class', 'cursor-pointer select-none transition-transform');
      badgeG.setAttribute('transform', `translate(${midX}, ${midY})`);

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '-14');
      rect.setAttribute('y', '-10');
      rect.setAttribute('width', '28');
      rect.setAttribute('height', '20');
      rect.setAttribute('rx', '6');
      rect.setAttribute('class', 'cost-badge-rect transition-all duration-200');
      rect.setAttribute('fill', isDirectlyBlocked ? '#7f1d1d' : '#0f172a');
      rect.setAttribute('stroke', isDirectlyBlocked ? '#ef4444' : '#334155');
      rect.setAttribute('stroke-width', '1.5');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '0');
      text.setAttribute('y', '3.5');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', isDirectlyBlocked ? '#fca5a5' : '#cbd5e1');
      text.setAttribute('font-size', '10');
      text.setAttribute('font-weight', '700');
      text.setAttribute('font-family', 'monospace');
      text.textContent = edge.cost;

      badgeG.appendChild(rect);
      badgeG.appendChild(text);

      badgeG.addEventListener('click', (e) => {
        e.stopPropagation();
        this.options.onToggleEdge(edge.id);
      });

      this.edgeBadgesLayer.appendChild(badgeG);
    });

    // Route Highlights
    this.renderRouteHighlights(nodeMap, calculatedRoute, alternativeRoute);

    // Nodes
    nodes.forEach(node => {
      this.renderNode(node, blockedNodes, closedExits, startNodeId, calculatedRoute, interactionMode);
    });
  }

  renderRouteHighlights(nodeMap, calculatedRoute, alternativeRoute) {
    if (alternativeRoute && alternativeRoute.path && alternativeRoute.path.length > 1) {
      const altPath = alternativeRoute.path;
      for (let i = 0; i < altPath.length - 1; i++) {
        const u = nodeMap.get(altPath[i]);
        const v = nodeMap.get(altPath[i + 1]);
        if (u && v) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', u.x);
          line.setAttribute('y1', u.y);
          line.setAttribute('x2', v.x);
          line.setAttribute('y2', v.y);
          line.setAttribute('stroke', '#3b82f6');
          line.setAttribute('stroke-width', '4');
          line.setAttribute('stroke-dasharray', '8, 6');
          line.setAttribute('opacity', '0.65');
          line.setAttribute('class', 'route-pulse-glow-alt');
          this.routeHighlightLayer.appendChild(line);
        }
      }
    }

    if (calculatedRoute && calculatedRoute.status === 'SUCCESS' && calculatedRoute.path.length > 1) {
      const path = calculatedRoute.path;
      for (let i = 0; i < path.length - 1; i++) {
        const u = nodeMap.get(path[i]);
        const v = nodeMap.get(path[i + 1]);
        if (u && v) {
          const glow = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          glow.setAttribute('x1', u.x);
          glow.setAttribute('y1', u.y);
          glow.setAttribute('x2', v.x);
          glow.setAttribute('y2', v.y);
          glow.setAttribute('stroke', '#10b981');
          glow.setAttribute('stroke-width', '8');
          glow.setAttribute('opacity', '0.35');
          glow.setAttribute('stroke-linecap', 'round');
          glow.setAttribute('filter', 'url(#glowGreen)');
          this.routeHighlightLayer.appendChild(glow);

          const animLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          animLine.setAttribute('x1', u.x);
          animLine.setAttribute('y1', u.y);
          animLine.setAttribute('x2', v.x);
          animLine.setAttribute('y2', v.y);
          animLine.setAttribute('stroke', '#34d399');
          animLine.setAttribute('stroke-width', '4.5');
          animLine.setAttribute('stroke-linecap', 'round');
          animLine.setAttribute('class', 'route-active-dash');
          animLine.setAttribute('marker-end', 'url(#routeArrow)');
          this.routeHighlightLayer.appendChild(animLine);
        }
      }
    }
  }

  renderNode(node, blockedNodes, closedExits, startNodeId, calculatedRoute, interactionMode) {
    const isStart = (node.id === startNodeId);
    const isBlocked = blockedNodes.has(node.id);
    const isClosed = (node.type === 'exit' && closedExits.has(node.id));
    const isInRoute = calculatedRoute && calculatedRoute.path && calculatedRoute.path.includes(node.id);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'map-node');
    g.setAttribute('transform', `translate(${node.x}, ${node.y})`);

    if (isStart) {
      const ping = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ping.setAttribute('r', '24');
      ping.setAttribute('fill', isBlocked ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.4)');
      ping.setAttribute('class', 'beacon-pulse');
      g.appendChild(ping);
    }

    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('r', isStart ? '23' : '20');
    ring.setAttribute('fill', '#0f172a');
    ring.setAttribute('stroke-width', isStart ? '3.5' : (isInRoute ? '3' : '2'));

    let nodeColor = '#3b82f6';
    if (node.type === 'junction') nodeColor = '#8b5cf6';
    if (node.type === 'exit') nodeColor = '#10b981';

    if (isBlocked || isClosed) {
      ring.setAttribute('stroke', '#ef4444');
      ring.setAttribute('fill', '#450a0a');
    } else if (isStart) {
      ring.setAttribute('stroke', '#38bdf8');
      ring.setAttribute('filter', 'url(#glowGold)');
    } else if (isInRoute) {
      ring.setAttribute('stroke', '#10b981');
      ring.setAttribute('filter', 'url(#glowGreen)');
    } else {
      ring.setAttribute('stroke', nodeColor);
    }
    g.appendChild(ring);

    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    inner.setAttribute('r', '15');
    inner.setAttribute('fill', (isBlocked || isClosed) ? '#7f1d1d' : nodeColor);
    inner.setAttribute('opacity', (isBlocked || isClosed) ? '0.8' : '0.9');
    g.appendChild(inner);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('y', '4');
    text.setAttribute('fill', '#ffffff');
    text.setAttribute('font-size', '11');
    text.setAttribute('font-weight', '800');
    text.setAttribute('font-family', 'monospace');
    text.textContent = node.id;
    g.appendChild(text);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('y', '34');
    label.setAttribute('fill', (isBlocked || isClosed) ? '#f87171' : '#94a3b8');
    label.setAttribute('font-size', '11');
    label.setAttribute('font-weight', '600');
    label.setAttribute('class', 'pointer-events-none drop-shadow');
    label.textContent = node.label;
    g.appendChild(label);

    if (isBlocked) {
      const crossG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      crossG.setAttribute('transform', 'translate(12, -14)');
      const crossBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      crossBg.setAttribute('r', '8');
      crossBg.setAttribute('fill', '#ef4444');
      crossG.appendChild(crossBg);

      const crossText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      crossText.setAttribute('text-anchor', 'middle');
      crossText.setAttribute('y', '3');
      crossText.setAttribute('fill', '#ffffff');
      crossText.setAttribute('font-size', '10');
      crossText.setAttribute('font-weight', 'bold');
      crossText.textContent = '✕';
      crossG.appendChild(crossText);
      g.appendChild(crossG);
    } else if (isClosed) {
      const lockG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      lockG.setAttribute('transform', 'translate(12, -14)');
      const lockBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      lockBg.setAttribute('r', '8');
      lockBg.setAttribute('fill', '#dc2626');
      lockG.appendChild(lockBg);

      const lockText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lockText.setAttribute('text-anchor', 'middle');
      lockText.setAttribute('y', '3');
      lockText.setAttribute('fill', '#ffffff');
      lockText.setAttribute('font-size', '9');
      lockText.textContent = '🔒';
      lockG.appendChild(lockText);
      g.appendChild(lockG);
    } else if (isStart) {
      const startBadge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      startBadge.setAttribute('transform', 'translate(0, -25)');
      const sRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      sRect.setAttribute('x', '-18');
      sRect.setAttribute('y', '-8');
      sRect.setAttribute('width', '36');
      sRect.setAttribute('height', '14');
      sRect.setAttribute('rx', '4');
      sRect.setAttribute('fill', '#0284c7');
      sRect.setAttribute('stroke', '#38bdf8');
      sRect.setAttribute('stroke-width', '1');
      startBadge.appendChild(sRect);

      const sText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      sText.setAttribute('text-anchor', 'middle');
      sText.setAttribute('y', '2');
      sText.setAttribute('fill', '#ffffff');
      sText.setAttribute('font-size', '8');
      sText.setAttribute('font-weight', 'bold');
      sText.textContent = 'START';
      startBadge.appendChild(sText);
      g.appendChild(startBadge);
    }

    g.addEventListener('click', (e) => {
      e.stopPropagation();
      if (interactionMode === 'hazard') {
        this.options.onToggleNode(node.id);
      } else {
        if (node.type === 'exit') {
          this.options.onToggleNode(node.id);
        } else {
          this.options.onSelectStart(node.id);
        }
      }
    });

    g.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showPopover(node, e.clientX, e.clientY, blockedNodes, closedExits);
    });

    this.nodesLayer.appendChild(g);
  }

  showPopover(node, clientX, clientY, blockedNodes, closedExits) {
    const containerRect = document.getElementById('svgContainer').getBoundingClientRect();
    const x = clientX - containerRect.left + 10;
    const y = clientY - containerRect.top + 10;

    document.getElementById('popoverTitle').textContent = `${node.id} (${node.label})`;
    document.getElementById('popoverType').textContent = node.type.toUpperCase();
    document.getElementById('popoverLabel').textContent = `Coords: (${node.x}, ${node.y})`;

    const btnStart = document.getElementById('popoverBtnSetStart');
    const btnHazard = document.getElementById('popoverBtnToggleHazard');

    if (node.type === 'exit') {
      btnStart.classList.add('hidden');
      btnHazard.textContent = closedExits.has(node.id) ? 'Open Exit' : 'Close Exit';
    } else {
      btnStart.classList.remove('hidden');
      btnHazard.textContent = blockedNodes.has(node.id) ? 'Unblock Node' : 'Block Node';
    }

    btnStart.onclick = () => {
      this.options.onSelectStart(node.id);
      this.hidePopover();
    };

    btnHazard.onclick = () => {
      this.options.onToggleNode(node.id);
      this.hidePopover();
    };

    this.popover.style.left = `${Math.min(x, containerRect.width - 200)}px`;
    this.popover.style.top = `${Math.min(y, containerRect.height - 130)}px`;
    this.popover.classList.remove('hidden');
  }

  hidePopover() {
    if (this.popover) this.popover.classList.add('hidden');
  }

  renderEvacuee(x, y) {
    this.simLayer.innerHTML = '';
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'evacuee-marker');

    const pulse = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    pulse.setAttribute('cx', x);
    pulse.setAttribute('cy', y);
    pulse.setAttribute('r', '14');
    pulse.setAttribute('fill', 'rgba(245, 158, 11, 0.4)');
    pulse.setAttribute('class', 'animate-ping');
    g.appendChild(pulse);

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', x);
    dot.setAttribute('cy', y);
    dot.setAttribute('r', '8');
    dot.setAttribute('fill', '#f59e0b');
    dot.setAttribute('stroke', '#ffffff');
    dot.setAttribute('stroke-width', '2');
    g.appendChild(dot);

    this.simLayer.appendChild(g);
  }
}
