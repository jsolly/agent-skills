---
name: drawio
description: Use when the user says `/drawio`, asks for a draw.io diagram, or wants an editable native `.drawio` XML file with optional PNG/SVG/PDF export. NOT for Mermaid-only diagrams, data-heavy charts, or editing an existing diagram without its source XML.
---

# Draw.io

Write native `mxfile` XML directly (no Mermaid/CSV server conversion). One concrete diagram file.

## Export / embed (load-bearing)

macOS desktop CLI — **`-e` is required** for any export claimed editable in draw.io:

```text
/Applications/draw.io.app/Contents/MacOS/draw.io -x -f <png|svg|pdf> -e -b 10 -o <name>.drawio.<ext> <name>.drawio
```

- Name exports with the **double extension** (`name.drawio.png` / `.drawio.svg` / `.drawio.pdf`). That signals embedded diagram source.
- **jpg** (and any format that cannot embed source) is never the editable deliverable — keep `.drawio` as source of truth; do not claim the raster is editable.
- If the CLI is missing or embed fails: keep the native `.drawio` and say so. Do not pretend export succeeded.
- Delete the intermediate `.drawio` only when an embed-capable export was requested **and** that export succeeded.

## XML that silently breaks files

- No `<!-- comments -->` in the diagram XML.
- Escape attribute specials: `&amp;` `&lt;` `&gt;` `&quot;`.
- Every edge needs a child `<mxGeometry relative="1" as="geometry" />` (self-closing edges do not render).
- Never treat Mermaid-only or a non-embedded export as a native/editable draw.io file; do not edit an existing diagram without its source XML.
