import json

data = json.load(open("building.json"))

def run_dijkstra(nodes, edges, blocked_nodes, blocked_edges, closed_exits, start_node_id):
    # Check if start node is blocked
    if start_node_id in blocked_nodes:
        return {"status": "BLOCKED_START"}
    
    # Build adjacency
    # Exclude blocked nodes and closed exits (even as intermediate steps)
    blocked_node_set = set(blocked_nodes)
    closed_exit_set = set(closed_exits)
    blocked_edge_set = set(blocked_edges)

    # Note: open exits can be reached, but can they be crossed as intermediate steps?
    # Spec: "Exclude blocked nodes and their incident edges, blocked edges, and closed exits (including as intermediate nodes)."
    # Also: "A closed exit cannot be used as a destination."
    
    adj = {n["id"]: [] for n in nodes}
    for e in edges:
        if e["id"] in blocked_edge_set:
            continue
        u, v, cost = e["from"], e["to"], e["cost"]
        if u in blocked_node_set or v in blocked_node_set:
            continue
        if u in closed_exit_set or v in closed_exit_set:
            continue
        adj[u].append((v, cost, e["id"]))
        adj[v].append((u, cost, e["id"]))
        
    # Dijkstra with tie-breaking
    # Best distance and best path
    dist = {}
    best_path = {}
    
    dist[start_node_id] = 0
    best_path[start_node_id] = [start_node_id]
    
    import heapq
    # heap item: (cost, path, u)
    pq = [(0, [start_node_id], start_node_id)]
    
    while pq:
        d, path, u = heapq.heappop(pq)
        
        # If this is not strictly the best path recorded, skip
        if d > dist.get(u, float('inf')):
            continue
        if d == dist.get(u, float('inf')) and path > best_path.get(u, []):
            continue
            
        for v, cost, edge_id in adj[u]:
            new_d = d + cost
            new_path = path + [v]
            
            if v not in dist or new_d < dist[v] or (new_d == dist[v] and new_path < best_path[v]):
                dist[v] = new_d
                best_path[v] = new_path
                heapq.heappush(pq, (new_d, new_path, v))
                
    # Find reachable open exits
    open_exits = [n["id"] for n in nodes if n["type"] == "exit" and n["id"] not in closed_exit_set]
    reachable_exits = [eid for eid in open_exits if eid in dist]
    
    if not reachable_exits:
        return {"status": "NO_ROUTE"}
        
    # Tie-breaking across exits:
    # 1. min cost
    # 2. lexicographically smallest exit ID
    # 3. lexicographically smallest node sequence
    reachable_exits.sort(key=lambda eid: (dist[eid], eid, best_path[eid]))
    
    chosen_exit = reachable_exits[0]
    return {
        "status": "SUCCESS",
        "exit": chosen_exit,
        "cost": dist[chosen_exit],
        "path": best_path[chosen_exit]
    }

# Test 1: Baseline (Select R1)
res1 = run_dijkstra(data["nodes"], data["edges"], [], [], [], "R1")
print("Test 1 (Baseline):", res1)
assert res1["path"] == ["R1", "C1", "C2", "E1"] and res1["cost"] == 7

# Test 2: Blocked junction (Select R1, block C2)
res2 = run_dijkstra(data["nodes"], data["edges"], ["C2"], [], [], "R1")
print("Test 2 (Blocked C2):", res2)
assert res2["path"] == ["R1", "C1", "C3", "C4", "E2"] and res2["cost"] == 11

# Test 3: Exits closed (Select R1, close E1 and E2)
res3 = run_dijkstra(data["nodes"], data["edges"], [], [], ["E1", "E2"], "R1")
print("Test 3 (Exits closed):", res3)
assert res3["status"] == "NO_ROUTE"

# Test 4: Different start (Select R2)
res4 = run_dijkstra(data["nodes"], data["edges"], [], [], [], "R2")
print("Test 4 (Start R2):", res4)
assert res4["path"] == ["R2", "C3", "C4", "E2"] and res4["cost"] == 7

# Test 5: Blocked start (Select R1, then block R1)
res5 = run_dijkstra(data["nodes"], data["edges"], ["R1"], [], [], "R1")
print("Test 5 (Blocked R1):", res5)
assert res5["status"] == "BLOCKED_START"

print("ALL 5 COMPETITION TEST CASES PASSED PERFECTLY!")
