# PLMR V48 RC — V47 Drawing + V45.4.3 Production

Runtime: **10.48-r48**.

V48 is the controlled integration of the V47 Giyotin drawing branch and the V45.4.3 Giyotin production package. Extract the ZIP completely and open `GitHub/index.html`.

## Drawing

V47 remains the drawing source of truth. Giyotin 2D/3D/P3DV behavior, closed/open state flow, selected-view motor/label behavior, local-file 3D transport, DXF and drawing PDF owners are retained. Production code does not own or duplicate drawing geometry/state.

## Production

The production package includes:

- Material Master: Systems / Profiles / Accessories / Add New
- 21 Excel-derived material records with real material images
- typo-tolerant search and local `file://` seed fallback
- Giyotin 1+2 / Isıcam / Standard production rules
- separate ERP `Üretim Paketi` tab
- per-position Summary, Cut List and Accessories
- read-only production 3D/2D drawing tabs
- calculated/manual/effective override semantics and zero-row retention
- integer-mm production values
- Save + Ctrl+S
- one-position-per-A4 preview, XLSX, PDF and Print

Future Glass Order / Stock / Optimization / Purchasing functionality is intentionally not implemented here.

## Validation boundary

Production regressions and controlled drawing integration are executed before packaging and again from a clean extraction. This environment cannot create a real Chromium WebGL/WebGL2 context, so P3DV's host/scene integration is tested with real Three.js CPU scene objects and a no-GPU renderer adapter; actual GPU rasterization is not claimed as verified. Live authenticated Supabase/RLS and deployment are also outside this package verification.

See `PLMR Development Protocol/reports/V.48-WORKING-CHECKPOINT.md`.
