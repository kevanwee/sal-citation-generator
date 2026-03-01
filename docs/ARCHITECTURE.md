# Architecture

```mermaid
flowchart TB
    subgraph Browser
        UI[index.html]
        Style[style.css]
        Controller[main.js]
        Engine[citationEngine.js]
        Storage[(localStorage)]
        Sortable[SortableJS CDN]
    end

    UI --> Controller
    Style --> UI
    Controller --> Engine
    Controller --> Storage
    Controller --> Sortable

    subgraph Verification
        Tests[tests/citationEngine.test.js]
        Node[node --test]
    end

    Tests --> Engine
    Node --> Tests
```

## Data flow summary

1. User submits URL/text in UI.
2. `main.js` creates/updates citation items.
3. `citationEngine.js` computes formatted outputs and short-form references.
4. `main.js` renders numbered citation cards and stores state in `localStorage`.
5. Drag-and-drop reorder triggers recomputation and rerender.
