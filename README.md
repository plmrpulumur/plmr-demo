# PLMR V14.28.6 DEMO FINAL CORRECTIVE

PLMR V14.28.6 is a narrowly scoped corrective release built from the accepted immutable **PLMR V14.28.5** package. It addresses the remaining real-user failure modes of the P3DV preview toolbar for Rolling Roof, Eco-Bioclimatic and Bioclimatic without introducing a parallel state or rendering system.

- **2D / 3D** is now local-first. The existing P3DV presentation engine changes the visible 2D/3D mode immediately from the button click, then best-effort synchronizes the existing host canonical workspace owner. If same-origin parent access or the host message bridge is unavailable, the button no longer becomes a silent no-op.
- **Preview Expand** keeps native Fullscreen API as the target. It tries the existing top-level host fullscreen path when direct parent access is available, can request the same existing host fullscreen owner through the bridge when direct access is unavailable, and can use embedded-document fullscreen as a browser-permitted fallback. A rejected native fullscreen request is no longer silent; the large-preview presentation stays visible and an explicit browser-fullscreen rejection status is shown.
- **Preview Refresh** retains the V14.28.5 corrective behavior: the explicit manual action reapplies current canonical inputs and forces a real viewer renderer rebuild, with a short `Önizleme Yenilendi ✓` acknowledgement.
- The Pergola native 2D Large Preview behavior is retained: the contextual toolbox starts open and pinned, while the user can still unpin and close it.

This corrective adds **no new product feature**. No new geometry engine, canonical state, authoritative product state, product schema, PDF/DXF engine or persistence owner is introduced. Existing host/P3DV owners are reused.

**PLMR V14.28.5 is the immutable corrective source baseline for V14.28.6.**
