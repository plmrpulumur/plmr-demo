import type { Backend } from "./handler";
import type { MaterialImage } from "../03_DEVELOPMENT_SOURCE/domain/productMaster";
import {sameDocument} from '../03_DEVELOPMENT_SOURCE/domain/documentIdentity';
import type { PermissionId } from "../03_DEVELOPMENT_SOURCE/domain/authorization";
export const CATALOG_KEYS = [
  "plmr.productMaster.profiles.v11",
  "plmr.productMaster.accessories.v11",
  "plmr.productMaster.glass.v11",
];
export const isMaterialCatalog = (key: string) => CATALOG_KEYS.includes(key);
export type Can = (permission: PermissionId) => Promise<boolean>;
export async function visibleMaterials(value: unknown, can: Can) {
  if (!Array.isArray(value)) throw Error("CATALOG_ARRAY_REQUIRED");
  const cost = await can("product.cost.view"),
    price = cost || (await can("commercial.price.view"));
  return value.map((row) => {
    const out = { ...row };
    if (!cost) delete out.cost;
    if (!price) {
      delete out.sellingPrice;
      delete out.legacySellingPrice;
    }
    return out;
  });
}
export async function validateMaterials(
  db: Backend,
  cid: string,
  key: string,
  previous: unknown,
  next: unknown,
  can: Can,
) {
  if (!isMaterialCatalog(key) || !Array.isArray(next) || next.length > 50000)
    throw Error("INVALID_CATALOG");
  const old = Array.isArray(previous) ? previous : [],
    id = key.includes("profiles")
      ? "profileId"
      : key.includes("accessories")
        ? "accessoryId"
        : "glassId",
    codes = new Set<string>(),
    ids = new Set<string>();
  const cost = await can("product.cost.view"),
    price = cost || (await can("commercial.price.view"));
  const result = [];
  for (const input of next) {
    const row = { ...input },
      before = old.find((r) => r[id] === row[id]);
    if (!row[id] || typeof row[id] !== "string" || ids.has(row[id]))
      throw Error("DUPLICATE_MATERIAL_ID");
    ids.add(row[id]);
    const code = String(row.code || "")
      .trim()
      .toLocaleUpperCase("tr-TR");
    if (!code || codes.has(code)) throw Error("DUPLICATE_MATERIAL_CODE");
    codes.add(code);
    row.code = code;
    if (
      !row.descriptionTr ||
      !row.unit ||
      !["active", "inactive"].includes(row.status) ||
      !["TRY", "USD", "EUR", "GBP"].includes(row.costCurrency)
    )
      throw Error("INVALID_MATERIAL");
    for (const field of [
      "cost",
      "sellingPrice",
      "legacySellingPrice",
      "unitWeight",
      "standardLength",
      "totalThickness",
    ])
      if (
        row[field] != null &&
        (typeof row[field] !== "number" ||
          !Number.isFinite(row[field]) ||
          row[field] < 0)
      )
        throw Error("INVALID_MATERIAL_NUMBER");
    if (
      before?.status !== row.status &&
      before &&
      !(await can("product.deactivate"))
    )
      throw Error("CATALOG_STATUS_DENIED");
    for (const field of ["cost", "sellingPrice", "legacySellingPrice"])
      if (!(field === "cost" ? cost : price)) {
        if (row[field] != null && row[field] !== before?.[field])
          throw Error("CATALOG_PRICE_DENIED");
        if (before && Object.prototype.hasOwnProperty.call(before, field))
          row[field] = before[field];
        else delete row[field];
      }
    const unchanged =
      before &&
      Object.keys({ ...before, ...row }).every(
        (k) => JSON.stringify(before[k]) === JSON.stringify(row[k]),
      );
    if (!unchanged && !(await can(before ? "product.edit" : "product.create")))
      throw Error("CATALOG_WRITE_DENIED");
    if (row.image?.storage) {
      const ref = row.image.storage,
        media = await db.get(cid + ":catalog.media", String(ref.id));
      if (
        ref.companyId !== cid ||
        !media.value ||
        !sameDocument((media.value as any).storage,ref)
      )
        throw Error("CATALOG_IMAGE_DENIED");
    } else if (
      row.image &&
      JSON.stringify(row.image) !== JSON.stringify(before?.image)
    )
      throw Error("CATALOG_STORAGE_IMAGE_REQUIRED");
    result.push(row);
  }
  // Catalog imports and stale client lists never silently delete omitted records.
  for (const row of old)
    if (!ids.has(row[id])) {
      if (codes.has(String(row.code).toLocaleUpperCase("tr-TR")))
        throw Error("MATERIAL_ID_CHANGED");
      result.push(row);
    }
  return result;
}
/** Immutable objects have no user delete/update route: frozen packages retain references. */
export async function catalogAction(
  db: Backend,
  input: Record<string, unknown>,
  cid: string,
  can: Can,
) {
  if (input.action === "catalog_commit") {
    const key = String(input.key);
    if (!isMaterialCatalog(key)) throw Error("INVALID_CATALOG");
    const prior = await db.get(cid, key);
    if (prior.version !== input.expectedVersion)
      throw Error("Katalog başka bir oturumda değişti. Yeniden açıp yükleyin.");
    const rows = await validateMaterials(
        db,
        cid,
        key,
        prior.value ? JSON.parse(String(prior.value)) : [],
        input.rows,
        can,
      ),
      saved = await db.cas(cid, key, JSON.stringify(rows), prior.version);
    return {
      value: JSON.stringify(await visibleMaterials(rows, can)),
      version: saved.version,
    };
  }
  if (input.action === "catalog_media_upload") {
    if (!(await can("product.edit")) && !(await can("product.create")))
      throw Error("CATALOG_UPLOAD_DENIED");
    if (!db.uploadCatalogMedia) throw Error("CATALOG_STORAGE_NOT_INSTALLED");
    const image = await db.uploadCatalogMedia(cid, input);
    await db.cas(cid + ":catalog.media", image.storage.id, image, 0);
    return image;
  }
  if (input.action === "catalog_media_url") {
    if (!(await can("product.view")) && !(await can("operations.view")))
      throw Error("CATALOG_READ_DENIED");
    const id = String(input.id || "");
    if (!/^[a-f0-9-]{36}$/.test(id)) throw Error("INVALID_MEDIA_ID");
    const row = await db.get(cid + ":catalog.media", id);
    if (!row.value) return { url: null, missing: true };
    if (!db.catalogMediaUrl) throw Error("CATALOG_STORAGE_NOT_INSTALLED");
    const path = (row.value as MaterialImage).storage?.path;
    if (!path || !path.startsWith(cid + "/")) throw Error("INVALID_MEDIA_PATH");
    const url = await db.catalogMediaUrl(path);
    return url ? { url } : { url: null, missing: true };
  }
  throw Error("INVALID_CATALOG_ACTION");
}
