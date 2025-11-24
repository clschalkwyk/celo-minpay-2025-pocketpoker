 TouchGraph MCP Quick Guide for Coding Agents

  - What it is: A Go scanner + Neo4j graph, surfaced via an MCP server. It answers:
      - neighbors(filePath) → who this file imports and who imports it.
      - subgraph(filePath, depth, maxNodes) → dependency blast radius.
      - git-changed(baseRef, repoRoot) → files changed since a ref, useful seeds for blast radius.
      - health → basic graph counts.
  - Server: Running on http://localhost:32134 against Neo4j (bolt://localhost:7687, neo4j/password). Endpoints:
      - GET /health
      - POST /neighbors body { "filePath": "frontend/src/lib/api.ts" }
      - POST /subgraph body { "filePath": "frontend/src/lib/api.ts", "depth": 2, "maxNodes": 250 }
      - POST /git-changed body { "baseRef": "origin/main", "repoRoot": "/Users/raven/Desktop/pocketpoker_celo" }
  - Typical flows:
      1. Blast radius of a file: call /subgraph with depth 2–3; inspect edges (has from,to,kind) and nodes (path/layer/lang).
      2. Impact of a change set: call /git-changed to get files since origin/main, then call /subgraph on each to see affected areas.
      3. Find callers/callees: call /neighbors to see inbound/outbound edges for a file before editing.
  - Scanner flags (when refreshing Neo4j):
      - --max-files, --max-file-bytes to cap scans.
      - --record-missing to log unresolved imports in JSON export.
      - --config-debug to print include/ignore/layer and tsconfig alias info.

  ———

  ### OpenAI (Code Interpreter / tools) JSON snippets (MCP-like HTTP calls)

  Neighbors

  {
    "method": "POST",
    "url": "http://localhost:32134/neighbors",
    "headers": { "Content-Type": "application/json" },
    "body": { "filePath": "frontend/src/lib/api.ts" }
  }

  Subgraph (blast radius)

  {
    "method": "POST",
    "url": "http://localhost:32134/subgraph",
    "headers": { "Content-Type": "application/json" },
    "body": { "filePath": "frontend/src/lib/api.ts", "depth": 2, "maxNodes": 250 }
  }

  Git changed files (since origin/main)

  {
    "method": "POST",
    "url": "http://localhost:32134/git-changed",
    "headers": { "Content-Type": "application/json" },
    "body": { "baseRef": "origin/main", "repoRoot": "/Users/raven/Desktop/pocketpoker_celo" }
  }

  ———

  ### Gemini CLI curl-equivalents

  Neighbors

  curl -s -X POST http://localhost:32134/neighbors \
    -H 'Content-Type: application/json' \
    -d '{"filePath":"frontend/src/lib/api.ts"}'

  Subgraph

  curl -s -X POST http://localhost:32134/subgraph \
    -H 'Content-Type: application/json' \
    -d '{"filePath":"frontend/src/lib/api.ts","depth":2,"maxNodes":250}'

  Git changed

  curl -s -X POST http://localhost:32134/git-changed \
    -H 'Content-Type: application/json' \
    -d '{"baseRef":"origin/main","repoRoot":"/Users/raven/Desktop/pocketpoker_celo"}'

  Health

  curl -s http://localhost:32134/health

  ———

  Use case recipes

  - Assess blast radius before editing: git-changed → for each file, subgraph(depth=2); inspect inbound/outbound edges to see impacted screens/services/contracts.
  - Find where a type/API is used: neighbors(filePath); importedBy shows callers/importers.
  - Validate graph freshness: health should report expected file/import counts after a scan; if low, re-run scanner.

