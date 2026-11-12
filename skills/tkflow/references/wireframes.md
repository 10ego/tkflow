# Generate the editable wireframe blueprint

The host's model authors the content; the helper saves an Excalidraw scene. No
separate model service, SVG-to-image substitution, or placeholder-only output.

1. Inspect the original sketch's scene AND exported PNG. Read Blueprint, Decisions,
   and Status. Identify the screens/states/navigation needed for supported behavior.
   Do not invent product requirements to fill visual space. For a blank sketch with
   no product input, report blocked rather than fabricate a design.
2. `begin` ensures both drawings exist, preserving existing files. Read
   `read --note Wireframes.excalidraw` for the SHA256 revision. Capture the existing
   drawing with `capture --note Wireframes.excalidraw` and inspect PNG plus JSON.
   On refinement, use that complete scene as the base and merge user edits. Preserve
   all existing element IDs, files, metadata, and unrelated content. Do not regenerate
   the whole drawing from memory. Save editor/drawing changes before capturing.
3. Write model-authored JSON to a temporary file: `{ "elements": [...] }` for a new
   drawing, or the merged full captured scene on refinement. Use editable rectangles,
   text and arrows for screens, controls and transitions. Label screens/states and
   annotate relevant controls with B-IDs and links to the Markdown behavior heading.
   Every element needs a unique id and finite x/y/width/height; text needs text.
   The helper supplies ordinary Excalidraw defaults for concise new elements:

   ```json
   {"elements":[
     {"id":"screen-main","type":"rectangle","x":0,"y":0,"width":360,"height":640},
     {"id":"screen-title","type":"text","x":20,"y":20,"width":300,"height":25,
      "text":"B-001 — Main screen",
      "link":"[[Projects/PROJECT/Blueprint#B-001 — First useful outcome]]"}
   ]}
   ```

   This is a format example, not a sufficient generated wireframe. Create meaningful
   project-specific screens and states. Include empty/loading/error/recovery states
   when required by the spec. Distinguish provisional visual choices from stated ones.
4. Save with `wireframe --from /absolute/scene.json --expect SHA256 --open`.
   The helper updates only the derived drawing, using the same guarded live CLI
   revision check as note writes. On conflict, reread/capture and merge; do not simply
   get a fresh token and overwrite the user's work. Never write the source Sketch.
5. Capture the saved wireframe again and inspect its PNG to check labels, clipping,
   states and navigation. Repair layout if needed. Update Blueprint's wireframe map
   with element IDs, B-IDs, A-IDs, and the final capture's source SHA256. Link back to
   Wireframes. Keep rules, contracts, and screen/state descriptions in Markdown so
   the three-note fresh-agent audit remains self-contained.
6. In refinement, compare the current drawing hash with the recorded reviewed hash.
   Reconcile visual and text edits; record reasons/decisions and acceptance changes.
   Log unresolved mismatches and block only affected slices. Markdown governs precise
   rules, but never silently discard a visual edit because of that precedence.

The helper does not perform a transactional update across drawing and Markdown.
If one save fails, report the partial state in Status and reconcile before building.
