/**
 * JSON Schema Validator for building.json
 * Implements strict AI DevFest requirements (Section 3.1)
 */

import { TRANSLATIONS } from './i18n.js';

export function validateBuildingJson(data, currentLang = 'en') {
  const errors = [];
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['JSON root must be an object.'] };
  }

  // 1. building name
  if (typeof data.building !== 'string' || data.building.trim() === '') {
    errors.push(t.err_building_required);
  }

  // 2. nodes array (2 to 60 objects)
  if (!Array.isArray(data.nodes) || data.nodes.length < 2 || data.nodes.length > 60) {
    errors.push(t.err_nodes_count);
  } else {
    const nodeIds = new Set();
    let hasRoomOrJunction = false;
    let hasExit = false;

    data.nodes.forEach((node, idx) => {
      if (!node || typeof node !== 'object') {
        errors.push(`Node at index ${idx} is not an object.`);
        return;
      }
      if (typeof node.id !== 'string' || node.id.trim() === '') {
        errors.push(`Node at index ${idx} has missing or empty id.`);
      } else if (nodeIds.has(node.id)) {
        errors.push(t.err_node_duplicate_id + node.id);
      } else {
        nodeIds.add(node.id);
      }

      if (typeof node.label !== 'string' || node.label.trim() === '') {
        errors.push(`Node '${node.id || idx}' has missing or empty label.`);
      }

      if (!['room', 'junction', 'exit'].includes(node.type)) {
        errors.push(t.err_node_invalid_type + `${node.id} (${node.type})`);
      } else {
        if (node.type === 'room' || node.type === 'junction') hasRoomOrJunction = true;
        if (node.type === 'exit') hasExit = true;
      }

      if (typeof node.x !== 'number' || typeof node.y !== 'number' || isNaN(node.x) || isNaN(node.y)) {
        errors.push(t.err_node_invalid_coords + node.id);
      }
    });

    if (!hasRoomOrJunction) errors.push(t.err_node_room_or_junction);
    if (!hasExit) errors.push(t.err_node_exit_required);
  }

  // 3. edges array (1 to 150 objects)
  if (!Array.isArray(data.edges) || data.edges.length < 1 || data.edges.length > 150) {
    errors.push(t.err_edges_count);
  } else if (Array.isArray(data.nodes)) {
    const nodeMap = new Map(data.nodes.map(n => [n.id, n]));
    const edgeIds = new Set();
    const connectedPairs = new Set();

    data.edges.forEach((edge, idx) => {
      if (!edge || typeof edge !== 'object') {
        errors.push(`Edge at index ${idx} is not an object.`);
        return;
      }
      if (typeof edge.id !== 'string' || edge.id.trim() === '') {
        errors.push(`Edge at index ${idx} has missing or empty id.`);
      } else if (edgeIds.has(edge.id)) {
        errors.push(t.err_edge_duplicate_id + edge.id);
      } else {
        edgeIds.add(edge.id);
      }

      if (!nodeMap.has(edge.from)) {
        errors.push(t.err_edge_unknown_node + `${edge.id} -> from: '${edge.from}'`);
      }
      if (!nodeMap.has(edge.to)) {
        errors.push(t.err_edge_unknown_node + `${edge.id} -> to: '${edge.to}'`);
      }

      if (edge.from && edge.to && edge.from === edge.to) {
        errors.push(t.err_edge_self_loop + `${edge.id} (${edge.from})`);
      }

      // Undirected repeated pair check
      if (edge.from && edge.to && edge.from !== edge.to) {
        const pairKey = edge.from < edge.to ? `${edge.from}--${edge.to}` : `${edge.to}--${edge.from}`;
        if (connectedPairs.has(pairKey)) {
          errors.push(t.err_edge_duplicate_pair + `(${edge.from}, ${edge.to})`);
        } else {
          connectedPairs.add(pairKey);
        }
      }

      if (typeof edge.cost !== 'number' || !Number.isInteger(edge.cost) || edge.cost <= 0) {
        errors.push(t.err_edge_cost_invalid + `${edge.id} (cost: ${edge.cost})`);
      }
    });
  }

  // 4. initial_state validation
  if (!data.initial_state || typeof data.initial_state !== 'object' ||
      !Array.isArray(data.initial_state.blocked_nodes) ||
      !Array.isArray(data.initial_state.blocked_edges) ||
      !Array.isArray(data.initial_state.closed_exits)) {
    errors.push(t.err_initial_state_invalid);
  } else if (Array.isArray(data.nodes) && Array.isArray(data.edges)) {
    const nodeMap = new Map(data.nodes.map(n => [n.id, n]));
    const edgeMap = new Map(data.edges.map(e => [e.id, e]));

    data.initial_state.blocked_nodes.forEach(id => {
      if (!nodeMap.has(id)) {
        errors.push(t.err_initial_state_unknown + `blocked_nodes: '${id}'`);
      } else if (nodeMap.get(id).type === 'exit') {
        errors.push(t.err_initial_state_type + `exit '${id}' cannot be in blocked_nodes`);
      }
    });

    data.initial_state.blocked_edges.forEach(id => {
      if (!edgeMap.has(id)) {
        errors.push(t.err_initial_state_unknown + `blocked_edges: '${id}'`);
      }
    });

    data.initial_state.closed_exits.forEach(id => {
      if (!nodeMap.has(id)) {
        errors.push(t.err_initial_state_unknown + `closed_exits: '${id}'`);
      } else if (nodeMap.get(id).type !== 'exit') {
        errors.push(t.err_initial_state_type + `node '${id}' is not an exit and cannot be in closed_exits`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
