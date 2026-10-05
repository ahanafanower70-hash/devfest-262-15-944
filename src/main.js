/**
 * main.js - Application Entry Point
 * Loads building.json dataset and mounts App
 */

import { App } from './App.js';

// Fetch default building dataset or use fallback
async function bootstrap() {
  try {
    const response = await fetch('./src/data/building.json');
    if (!response.ok) throw new Error('Network error loading building.json');
    const data = await response.json();
    window.__app = new App(data);
  } catch (err) {
    console.warn('Falling back to embedded building data:', err);
    // Embedded fallback dataset
    const fallbackData = {
      "building": "Main Office Complex",
      "nodes": [
        {"id": "R1", "label": "Room 1", "type": "room", "x": 50, "y": 100},
        {"id": "R2", "label": "Room 2", "type": "room", "x": 50, "y": 300},
        {"id": "C1", "label": "Corridor 1", "type": "junction", "x": 200, "y": 100},
        {"id": "C2", "label": "Corridor 2", "type": "junction", "x": 350, "y": 100},
        {"id": "C3", "label": "Corridor 3", "type": "junction", "x": 200, "y": 300},
        {"id": "C4", "label": "Corridor 4", "type": "junction", "x": 350, "y": 300},
        {"id": "E1", "label": "Exit 1", "type": "exit", "x": 500, "y": 100},
        {"id": "E2", "label": "Exit 2", "type": "exit", "x": 500, "y": 300}
      ],
      "edges": [
        {"id": "e1", "from": "R1", "to": "C1", "cost": 2},
        {"id": "e2", "from": "C1", "to": "C2", "cost": 3},
        {"id": "e3", "from": "C2", "to": "E1", "cost": 2},
        {"id": "e4", "from": "R2", "to": "C3", "cost": 2},
        {"id": "e5", "from": "C1", "to": "C3", "cost": 2},
        {"id": "e6", "from": "C3", "to": "C4", "cost": 3},
        {"id": "e7", "from": "C4", "to": "E2", "cost": 2},
        {"id": "e8", "from": "C2", "to": "C4", "cost": 5}
      ],
      "initial_state": {
        "blocked_nodes": [],
        "blocked_edges": [],
        "closed_exits": []
      }
    };
    window.__app = new App(fallbackData);
  }
}

window.addEventListener('DOMContentLoaded', bootstrap);
