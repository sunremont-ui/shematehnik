# FreeCAD Integration

## Status

Curated boundary page for FreeCAD/CAD interoperability.

Current UCP web behavior is CAD export, not full FreeCAD integration:

- 3D Editor renders the board and components with three.js.
- Part Editor uses the UCP CSG mesh path.
- Exports include binary STL and STEP AP214-style triangulated shell output.

## Current Limits

- UCP web does not embed FreeCAD.
- UCP web does not currently use OpenCASCADE in-browser.
- STEP output is a practical CAD interchange artifact, not a full parametric FreeCAD document.
- FreeCAD import of parametric bodies remains future work.

## Related Files

- `platform_app/web/src/three/` -- board/part mesh and exporters.
- `platform_app/wiki/modules/web_frontend.md` -- current 3D/Part Editor summary.
- `platform_app/wiki/modules/threed.md` -- legacy/desktop 3D notes.

## Future Directions

- Keep STL/STEP exporters deterministic and tested.
- Add real FreeCAD fixture files only when import/export behavior is implemented.
- Document the boundary between mesh export and parametric CAD exchange before claiming FreeCAD project compatibility.
