# Giyotin Production V1 — V45.1 contract through V45.4 presentation

This directory is the production-branch contract for **Giyotin + 1+2 panel + Isıcam + Standart** only.

It is intentionally **not wired into the drawing engines in V45.1**. The canonical project/drawing state remains owned by the existing standalone project model. Production consumes a derived projection and stores only production linkage, calculated package data and user overrides; it must not become a second editable copy of physical drawing state.

## Scope lock

- productType: `GUILLOTINE`
- panelCount: `1+2`
- glassThickness: `INSULATED GLASS`
- type: `STANDARD`
- LED production logic: **not part of this contract**
- other Giyotin variants: **unsupported / not inferred**

## Value-state contract

Every calculable production value can retain:

- `calculatedValue`
- `manualValue`
- `effectiveValue`
- `status`

Statuses:

- `NORMAL`
- `ZERO_RESULT` — red presentation, row remains present
- `MANUAL_OVERRIDE` — light blue presentation
- `MANUAL_REQUIRED` — orange presentation until a required manual value is supplied

## Source corrections locked in V45.1

Across Poz 1–Poz 4 reference forms:

- `H21 = H20` (replaces source `=J10-155`)
- `I19:I23 = H5*2`, represented explicitly per row instead of relying on Excel shared-formula storage

These corrections are represented in `productionContract.js` and regression-tested. V45.1 does not yet implement the full runtime calculation engine; that belongs to V45.3.

## Material master

`materialMaster.seed.json` normalizes the 21 source rows from `Giyotin Malzeme Listesi` without inventing missing English descriptions or Category 3 values. `organizationId` is intentionally null in the template seed and must be assigned during tenant/company import.

The 21 workbook-local images are extracted as real application assets under:

`GitHub/assets/production/guillotine/materials/`

`materialImageMap.json` preserves the source media mapping and SHA-256 hashes.

## V45.3 runtime calculation engine

`productionEngine.js` implements only the verified **Giyotin + 1+2 + Isıcam + Standart** workbook recipe.

Key rules:

- Production data is derived from canonical project/poz state through `productionContract.projectToProductionSource(...)`; no second drawing state is created.
- Every recipe line has a stable `ruleId`, material-master link (`materialId` + `materialCode`), source row/cell trace, calculated/manual/effective values and status.
- Zero-result rows remain in output.
- `H21 = H20` is applied before downstream rules, including AKS0005 Kıl Fitil.
- `I19:I23 = H5*2` remain explicit rule quantities.
- Workbook `ROUNDDOWN((F5-349)/3,0.1)` is implemented as integer truncation, verified against the workbook's cached sample outputs.
- The workbook note for AKS0007 is honored: project `remoteQuantity` is emitted only on the first supported position; later supported positions keep the row with quantity `0`.
- No technical suitability limits are invented. Supported positions return suitability `UNKNOWN` with `SUITABILITY_RULES_NOT_DEFINED` until real rules are supplied.
- Unsupported Giyotin variants are reported as `RECIPE_NOT_SUPPORTED`; they are not silently generalized.
- V45.3 adds no optimization, stock, purchasing or glass-supplier engine.


## V45.4 production presentation and outputs

`productionExport.js` and the standalone production UI implement the presentation/output layer without changing drawing ownership.

- Required production tabs: Özet, Kesim Listesi, Cam Sipariş, Stok (Planlanan), Optimizasyon, Satın Alma, Kurallar.
- Cut values support production-only overrides while keeping calculated values intact.
- Status colors are shared by application, XLSX, PDF and print: ZERO_RESULT red, MANUAL_OVERRIDE light blue, MANUAL_REQUIRED orange.
- Every supported position produces one A4 production-form page. XLSX position sheets keep the source-compatible A1:I36 range and A4 portrait fit-to-page configuration.
- Material images come from the 21 verified workbook assets; runtime does not depend on Excel Rich Data.
- Real suitability rules are still not invented: supported positions remain UNKNOWN until those rules are supplied.
- V45.5 downstream engines are not executed by V45.4.
