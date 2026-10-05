import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs("screenshots", exist_ok=True)

def draw_simulation_screenshot(filename, title_sub, is_c2_blocked=False):
    # Image dimensions
    w, h = 1280, 720
    img = Image.new("RGB", (w, h), "#090d16")
    draw = ImageDraw.Draw(img)

    # Fonts
    try:
        font_title = ImageFont.truetype("arial.ttf", 24)
        font_subtitle = ImageFont.truetype("arial.ttf", 14)
        font_node_id = ImageFont.truetype("arialbd.ttf", 14)
        font_node_label = ImageFont.truetype("arial.ttf", 12)
        font_badge = ImageFont.truetype("arialbd.ttf", 11)
        font_metric_val = ImageFont.truetype("arialbd.ttf", 22)
        font_metric_lbl = ImageFont.truetype("arial.ttf", 10)
    except:
        font_title = font_subtitle = font_node_id = font_node_label = font_badge = font_metric_val = font_metric_lbl = ImageFont.load_default()

    # Draw Top Header
    draw.rectangle([0, 0, w, 60], fill="#0f172a", outline="#1e293b", width=1)
    
    # Logo & Title
    draw.rounded_rectangle([20, 12, 56, 48], radius=8, fill="#2563eb")
    draw.text((70, 14), "Smart Escape", fill="#ffffff", font=font_title)
    draw.text((70, 40), "Interactive Evacuation Route Simulator • AI DevFest Mock Test", fill="#94a3b8", font=font_subtitle)

    # Header controls badges
    draw.rounded_rectangle([750, 16, 850, 44], radius=6, fill="#1e293b", outline="#334155")
    draw.text((765, 24), "Nodes: 8", fill="#38bdf8", font=font_badge)

    draw.rounded_rectangle([860, 16, 970, 44], radius=6, fill="#1e293b", outline="#334155")
    draw.text((875, 24), "Corridors: 8", fill="#818cf8", font=font_badge)

    draw.rounded_rectangle([980, 16, 1100, 44], radius=6, fill="#1e293b", outline="#334155")
    draw.text((995, 24), f"Hazards: {'1' if is_c2_blocked else '0'}", fill="#f87171" if is_c2_blocked else "#34d399", font=font_badge)

    draw.rounded_rectangle([1110, 16, 1250, 44], radius=6, fill="#2563eb")
    draw.text((1125, 24), "Lang: EN | বাংলা", fill="#ffffff", font=font_badge)

    # Left: Map Area Canvas (20, 80) to (880, 690)
    map_x1, map_y1, map_x2, map_y2 = 20, 80, 880, 690
    draw.rounded_rectangle([map_x1, map_y1, map_x2, map_y2], radius=16, fill="#0f172a", outline="#1e293b", width=2)

    # Grid background dots
    for gx in range(map_x1 + 30, map_x2 - 20, 35):
        for gy in range(map_y1 + 30, map_y2 - 20, 35):
            draw.ellipse([gx-1, gy-1, gx+1, gy+1], fill="#1e293b")

    # Map Controls Toolbar Overlay
    draw.rounded_rectangle([map_x1 + 16, map_y1 + 16, map_x1 + 340, map_y1 + 54], radius=10, fill="#1e293b", outline="#334155")
    draw.rounded_rectangle([map_x1 + 24, map_y1 + 22, map_x1 + 140, map_y1 + 48], radius=6, fill="#2563eb")
    draw.text((map_x1 + 36, map_y1 + 28), "Set Start Mode", fill="#ffffff", font=font_badge)
    draw.text((map_x1 + 155, map_y1 + 28), "Toggle Hazard", fill="#94a3b8", font=font_badge)
    draw.text((map_x1 + 255, map_y1 + 28), "Start: R1", fill="#38bdf8", font=font_badge)

    # Nodes display data (scaled for screenshot)
    scale_x = 1.35
    scale_y = 1.2
    offset_x = map_x1 + 100
    offset_y = map_y1 + 120

    raw_nodes = [
        {"id": "R1", "label": "Room 1", "type": "room", "x": 50, "y": 100},
        {"id": "R2", "label": "Room 2", "type": "room", "x": 50, "y": 300},
        {"id": "C1", "label": "Corridor 1", "type": "junction", "x": 200, "y": 100},
        {"id": "C2", "label": "Corridor 2", "type": "junction", "x": 350, "y": 100},
        {"id": "C3", "label": "Corridor 3", "type": "junction", "x": 200, "y": 300},
        {"id": "C4", "label": "Corridor 4", "type": "junction", "x": 350, "y": 300},
        {"id": "E1", "label": "Exit 1", "type": "exit", "x": 500, "y": 100},
        {"id": "E2", "label": "Exit 2", "type": "exit", "x": 500, "y": 300}
    ]

    nodes_pos = {}
    for n in raw_nodes:
        nodes_pos[n["id"]] = (
            int(offset_x + n["x"] * scale_x),
            int(offset_y + n["y"] * scale_y)
        )

    edges = [
        ("R1", "C1", 2),
        ("C1", "C2", 3),
        ("C2", "E1", 2),
        ("R2", "C3", 2),
        ("C1", "C3", 2),
        ("C3", "C4", 3),
        ("C4", "E2", 2),
        ("C2", "C4", 5)
    ]

    # Active path
    if is_c2_blocked:
        active_path = ["R1", "C1", "C3", "C4", "E2"]
        active_cost = 9
        target_exit = "E2"
        status_label = "REROUTING (C2 BLOCKED)"
        active_edges_set = {("R1", "C1"), ("C1", "C3"), ("C3", "C4"), ("C4", "E2"),
                            ("C1", "R1"), ("C3", "C1"), ("C4", "C3"), ("E2", "C4")}
    else:
        active_path = ["R1", "C1", "C2", "E1"]
        active_cost = 7
        target_exit = "E1"
        status_label = "BASELINE ROUTE"
        active_edges_set = {("R1", "C1"), ("C1", "C2"), ("C2", "E1"),
                            ("C1", "R1"), ("C2", "C1"), ("E1", "C2")}

    # Draw Edges
    for u_id, v_id, cost in edges:
        ux, uy = nodes_pos[u_id]
        vx, vy = nodes_pos[v_id]

        is_edge_active = (u_id, v_id) in active_edges_set
        is_edge_blocked = is_c2_blocked and ("C2" in (u_id, v_id))

        if is_edge_active:
            # Active glowing line
            draw.line([ux, uy, vx, vy], fill="#059669", width=10)
            draw.line([ux, uy, vx, vy], fill="#10b981", width=4)
        elif is_edge_blocked:
            # Blocked red dashed line
            draw.line([ux, uy, vx, vy], fill="#ef4444", width=3)
        else:
            # Normal edge
            draw.line([ux, uy, vx, vy], fill="#334155", width=3)

        # Midpoint Cost Badge
        mx, my = (ux + vx) // 2, (uy + vy) // 2
        bg_col = "#7f1d1d" if is_edge_blocked else ("#065f46" if is_edge_active else "#0f172a")
        bdr_col = "#ef4444" if is_edge_blocked else ("#10b981" if is_edge_active else "#475569")
        txt_col = "#fca5a5" if is_edge_blocked else ("#6ee7b7" if is_edge_active else "#cbd5e1")

        draw.rounded_rectangle([mx - 14, my - 10, mx + 14, my + 10], radius=5, fill=bg_col, outline=bdr_col, width=1)
        draw.text((mx - 4, my - 6), str(cost), fill=txt_col, font=font_badge)

    # Draw Nodes
    for n in raw_nodes:
        nid = n["id"]
        nx, ny = nodes_pos[nid]
        ntype = n["type"]

        is_start = (nid == "R1")
        is_blocked = is_c2_blocked and (nid == "C2")
        is_in_path = nid in active_path

        # Node color
        if is_blocked:
            fill_col = "#7f1d1d"
            ring_col = "#ef4444"
        elif is_start:
            fill_col = "#0284c7"
            ring_col = "#38bdf8"
        elif is_in_path:
            fill_col = "#059669"
            ring_col = "#10b981"
        else:
            if ntype == "room": fill_col, ring_col = "#1e3a8a", "#3b82f6"
            elif ntype == "junction": fill_col, ring_col = "#4c1d95", "#8b5cf6"
            else: fill_col, ring_col = "#064e3b", "#10b981"

        # Outer ring
        r = 24 if is_start else 20
        if is_start:
            draw.ellipse([nx - 32, ny - 32, nx + 32, ny + 32], outline="#0284c7", width=2)
        draw.ellipse([nx - r, ny - r, nx + r, ny + r], fill="#0b1329", outline=ring_col, width=3)
        draw.ellipse([nx - 14, ny - 14, nx + 14, ny + 14], fill=fill_col)

        # ID text
        draw.text((nx - 8, ny - 7), nid, fill="#ffffff", font=font_node_id)

        # Node label below
        lbl_col = "#f87171" if is_blocked else "#94a3b8"
        draw.text((nx - 20, ny + 26), n["label"], fill=lbl_col, font=font_node_label)

        # START Badge
        if is_start:
            draw.rounded_rectangle([nx - 20, ny - 38, nx + 20, ny - 24], radius=4, fill="#0284c7")
            draw.text((nx - 16, ny - 36), "START", fill="#ffffff", font=font_badge)

        # BLOCKED Cross
        if is_blocked:
            draw.ellipse([nx + 10, ny - 22, nx + 26, ny - 6], fill="#ef4444")
            draw.text((nx + 14, ny - 20), "X", fill="#ffffff", font=font_badge)

    # Right Sidebar: Status & Info (900, 80) to (1260, 690)
    side_x1, side_y1, side_x2, side_y2 = 900, 80, 1260, 690
    draw.rounded_rectangle([side_x1, side_y1, side_x2, side_y2], radius=16, fill="#0f172a", outline="#1e293b", width=2)

    # Card Header
    draw.text((side_x1 + 20, side_y1 + 20), "ROUTE CALCULATION STATUS", fill="#94a3b8", font=font_badge)
    status_bg = "#064e3b" if not is_c2_blocked else "#451a03"
    status_bdr = "#10b981" if not is_c2_blocked else "#f59e0b"
    status_txt = "#34d399" if not is_c2_blocked else "#fbbf24"
    draw.rounded_rectangle([side_x1 + 20, side_y1 + 42, side_x2 - 20, side_y1 + 80], radius=8, fill=status_bg, outline=status_bdr)
    draw.text((side_x1 + 35, side_y1 + 52), f"OPTIMAL ROUTE: {status_label}", fill=status_txt, font=font_badge)

    # Metrics Grid
    # Total Cost
    draw.rounded_rectangle([side_x1 + 20, side_y1 + 95, side_x1 + 125, side_y1 + 165], radius=10, fill="#1e293b")
    draw.text((side_x1 + 32, side_y1 + 105), "TOTAL COST", fill="#94a3b8", font=font_metric_lbl)
    draw.text((side_x1 + 55, side_y1 + 125), str(active_cost), fill="#34d399", font=font_metric_val)

    # Target Exit
    draw.rounded_rectangle([side_x1 + 135, side_y1 + 95, side_x1 + 240, side_y1 + 165], radius=10, fill="#1e293b")
    draw.text((side_x1 + 145, side_y1 + 105), "TARGET EXIT", fill="#94a3b8", font=font_metric_lbl)
    draw.text((side_x1 + 170, side_y1 + 125), target_exit, fill="#38bdf8", font=font_metric_val)

    # Steps
    draw.rounded_rectangle([side_x1 + 250, side_y1 + 95, side_x2 - 20, side_y1 + 165], radius=10, fill="#1e293b")
    draw.text((side_x1 + 265, side_y1 + 105), "CORRIDORS", fill="#94a3b8", font=font_metric_lbl)
    draw.text((side_x1 + 285, side_y1 + 125), str(len(active_path)-1), fill="#a78bfa", font=font_metric_val)

    # Path Sequence Box
    draw.text((side_x1 + 20, side_y1 + 180), "CALCULATED PATH SEQUENCE:", fill="#94a3b8", font=font_badge)
    draw.rounded_rectangle([side_x1 + 20, side_y1 + 200, side_x2 - 20, side_y1 + 245], radius=8, fill="#1e293b", outline="#334155")
    path_str = " -> ".join(active_path)
    draw.text((side_x1 + 30, side_y1 + 215), path_str, fill="#38bdf8", font=font_node_id)

    # Step-by-Step Directions
    draw.text((side_x1 + 20, side_y1 + 265), "TURN-BY-TURN EVACUATION GUIDANCE", fill="#94a3b8", font=font_badge)
    cur_y = side_y1 + 290
    for i in range(len(active_path) - 1):
        u_p = active_path[i]
        v_p = active_path[i+1]
        draw.rounded_rectangle([side_x1 + 20, cur_y, side_x2 - 20, cur_y + 36], radius=6, fill="#182234", outline="#253349")
        draw.text((side_x1 + 30, cur_y + 10), f"Step {i+1}: Move from {u_p} to {v_p}", fill="#e2e8f0", font=font_badge)
        cur_y += 44

    # Save image
    img.save(filename)
    print(f"Saved: {filename}")

draw_simulation_screenshot("screenshots/baseline_route.png", "Baseline Route", is_c2_blocked=False)
draw_simulation_screenshot("screenshots/reroute_c2_blocked.png", "Rerouting after C2 Blocked", is_c2_blocked=True)
print("Screenshot generation completed successfully!")
