(function (root) {
  'use strict';

  const REVISION_SCHEMA = 'plmr-immutable-revision-v1';
  const PROJECT_SCHEMA_V1 = 'PULUMUR_PROJECT@1';
  const PROJECT_SCHEMA_V2 = 'PULUMUR_PROJECT@2';
  const DEFAULT_MAX_COMPLETED = 64;

  function isPlainObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function deepFreeze(value, seen) {
    if (!value || typeof value !== 'object') return value;
    const visited = seen || new Set();
    if (visited.has(value)) return value;
    visited.add(value);
    Object.keys(value).forEach(key => deepFreeze(value[key], visited));
    return Object.freeze(value);
  }

  function canonicalize(value, stack) {
    const active = stack || new Set();
    if (value === null) return 'null';
    if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || Object.is(value, -0)) throw new Error('CANONICAL_JSON_NUMBER_INVALID');
      return JSON.stringify(value);
    }
    if (typeof value !== 'object') throw new Error(`CANONICAL_JSON_TYPE_INVALID:${typeof value}`);
    if (active.has(value)) throw new Error('CANONICAL_JSON_CYCLE');
    active.add(value);
    try {
      if (Array.isArray(value)) return `[${value.map(item => canonicalize(item, active)).join(',')}]`;
      if (!isPlainObject(value)) throw new Error('CANONICAL_JSON_OBJECT_INVALID');
      const fields = Object.keys(value).sort().map(key => {
        const item = value[key];
        if (item === undefined || typeof item === 'function' || typeof item === 'symbol' || typeof item === 'bigint') {
          throw new Error(`CANONICAL_JSON_FIELD_INVALID:${key}`);
        }
        return `${JSON.stringify(key)}:${canonicalize(item, active)}`;
      });
      return `{${fields.join(',')}}`;
    } finally {
      active.delete(value);
    }
  }

  function utf8Bytes(text) {
    const value = String(text == null ? '' : text);
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value);
    if (typeof Buffer !== 'undefined') return Uint8Array.from(Buffer.from(value, 'utf8'));
    const encoded = unescape(encodeURIComponent(value));
    return Uint8Array.from(encoded, character => character.charCodeAt(0));
  }

  async function sha256Hex(text) {
    const bytes = utf8Bytes(text);
    if (typeof require === 'function') {
      try {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');
      } catch (_) {}
    }
    const cryptoApi = root.crypto || (typeof globalThis !== 'undefined' && globalThis.crypto);
    if (!cryptoApi || !cryptoApi.subtle) throw new Error('SHA256_UNAVAILABLE');
    const digest = await cryptoApi.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function checksum(value) {
    const canonical = canonicalize(value);
    return `sha256:${await sha256Hex(canonical)}:${utf8Bytes(canonical).byteLength}`;
  }

  async function verifyChecksum(value, expected) {
    const actual = await checksum(value);
    if (String(expected || '') !== actual) throw new Error('REVISION_CHECKSUM_INVALID');
    return true;
  }

  function legacyChecksumForModel(model) {
    const json = JSON.stringify(model);
    let hash = 2166136261;
    for (let index = 0; index < json.length; index += 1) {
      hash ^= json.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}:${json.length}`;
  }

  class SchemaRegistry {
    constructor() {
      this.schemas = new Map();
      this.migrations = new Map();
    }

    registerSchema(id, descriptor) {
      const key = String(id || '').trim();
      if (!key) throw new Error('SCHEMA_ID_REQUIRED');
      if (this.schemas.has(key)) throw new Error(`SCHEMA_ALREADY_REGISTERED:${key}`);
      const source = descriptor || {};
      this.schemas.set(key, Object.freeze({
        id: key,
        validate: typeof source.validate === 'function' ? source.validate : () => true,
        description: String(source.description || '')
      }));
      return this;
    }

    registerMigration(from, to, migrate) {
      const source = String(from || '').trim();
      const target = String(to || '').trim();
      if (!this.schemas.has(source) || !this.schemas.has(target)) throw new Error('MIGRATION_SCHEMA_UNKNOWN');
      if (typeof migrate !== 'function') throw new Error('MIGRATION_HANDLER_REQUIRED');
      const key = `${source}->${target}`;
      if (this.migrations.has(key)) throw new Error(`MIGRATION_ALREADY_REGISTERED:${key}`);
      this.migrations.set(key, Object.freeze({ from: source, to: target, migrate }));
      return this;
    }

    validate(id, value) {
      const schema = this.schemas.get(String(id || ''));
      if (!schema) throw new Error(`SCHEMA_NOT_REGISTERED:${id}`);
      const result = schema.validate(value);
      if (result === false) throw new Error(`SCHEMA_VALIDATION_FAILED:${schema.id}`);
      return true;
    }

    migrationPath(from, to) {
      const source = String(from || '');
      const target = String(to || '');
      if (source === target) return [];
      const queue = [[source, []]];
      const visited = new Set([source]);
      while (queue.length) {
        const [current, path] = queue.shift();
        for (const migration of this.migrations.values()) {
          if (migration.from !== current || visited.has(migration.to)) continue;
          const nextPath = path.concat(migration);
          if (migration.to === target) return nextPath;
          visited.add(migration.to);
          queue.push([migration.to, nextPath]);
        }
      }
      throw new Error(`MIGRATION_PATH_MISSING:${source}->${target}`);
    }

    migrate(value, from, to, context) {
      const source = String(from || '');
      const target = String(to || '');
      this.validate(source, value);
      let current = clone(value);
      for (const step of this.migrationPath(source, target)) {
        current = step.migrate(clone(current), Object.freeze({ ...(context || {}), from: step.from, to: step.to }));
        this.validate(step.to, current);
      }
      return current;
    }
  }

  function projectEnvelopeSchemaId(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.format !== 'PULUMUR_PROJECT') return '';
    const version = Number(raw.schemaVersion);
    if (version === 1) return PROJECT_SCHEMA_V1;
    if (version === 2) return PROJECT_SCHEMA_V2;
    return '';
  }

  function validateProjectEnvelope(version, raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('PROJECT_FILE_NOT_OBJECT');
    if (raw.format !== 'PULUMUR_PROJECT') throw new Error('PROJECT_FORMAT_INVALID');
    if (Number(raw.schemaVersion) !== version) throw new Error(`PROJECT_SCHEMA_UNSUPPORTED:${raw.schemaVersion}`);
    if (!raw.projectModel || typeof raw.projectModel !== 'object' || Array.isArray(raw.projectModel)) throw new Error('PROJECT_MODEL_MISSING');
    if (raw.checksum && String(raw.checksum) !== legacyChecksumForModel(raw.projectModel)) throw new Error('PROJECT_CHECKSUM_INVALID');
    return true;
  }

  function createDefaultRegistry() {
    return new SchemaRegistry()
      .registerSchema(PROJECT_SCHEMA_V1, {
        description: 'Legacy PLMR project envelope schema v1',
        validate: raw => validateProjectEnvelope(1, raw)
      })
      .registerSchema(PROJECT_SCHEMA_V2, {
        description: 'Canonical PLMR project envelope schema v2',
        validate: raw => validateProjectEnvelope(2, raw)
      })
      .registerMigration(PROJECT_SCHEMA_V1, PROJECT_SCHEMA_V2, raw => {
        const projectModel = clone(raw.projectModel);
        const createdAt = String(raw.createdAt || (projectModel.metadata && projectModel.metadata.createdAt) || '');
        const updatedAt = String(raw.updatedAt || (projectModel.metadata && projectModel.metadata.updatedAt) || createdAt);
        return {
          format: 'PULUMUR_PROJECT',
          schemaVersion: 2,
          appVersion: String(raw.appVersion || ''),
          createdAt,
          updatedAt,
          checksum: legacyChecksumForModel(projectModel),
          projectModel
        };
      });
  }

  const projectRegistry = createDefaultRegistry();

  function migrateProjectEnvelope(raw, targetVersion) {
    const input = typeof raw === 'string' ? JSON.parse(raw) : clone(raw);
    const sourceId = projectEnvelopeSchemaId(input);
    if (!sourceId) {
      if (input && input.format === 'PULUMUR_PROJECT') throw new Error(`PROJECT_SCHEMA_UNSUPPORTED:${input.schemaVersion}`);
      throw new Error('PROJECT_FORMAT_INVALID');
    }
    const targetId = Number(targetVersion || 2) === 2 ? PROJECT_SCHEMA_V2 : `PULUMUR_PROJECT@${Number(targetVersion)}`;
    return projectRegistry.migrate(input, sourceId, targetId, { reason: 'project-import' });
  }

  async function createRevisionIntent(input) {
    const source = input || {};
    const projectId = String(source.projectId || '').trim();
    if (!projectId) throw new Error('REVISION_PROJECT_ID_REQUIRED');
    const expectedServerVersion = Number(source.expectedServerVersion);
    const currentRevision = Number(source.currentRevision);
    const expectedStreamVersion = Number(source.expectedStreamVersion == null ? 0 : source.expectedStreamVersion);
    if (!Number.isInteger(expectedServerVersion) || expectedServerVersion < 0) throw new Error('REVISION_SERVER_VERSION_INVALID');
    if (!Number.isInteger(currentRevision) || currentRevision < 0) throw new Error('REVISION_NUMBER_INVALID');
    if (!Number.isInteger(expectedStreamVersion) || expectedStreamVersion < 0) throw new Error('REVISION_STREAM_VERSION_INVALID');
    const operation = String(source.operation || 'SAVE').trim().toUpperCase();
    const targetRevision = Number(source.targetRevision == null ? currentRevision : source.targetRevision);
    if (!Number.isInteger(targetRevision) || targetRevision < 1) throw new Error('REVISION_TARGET_INVALID');
    const payload = clone(source.payload);
    if (!payload || typeof payload !== 'object') throw new Error('REVISION_PAYLOAD_REQUIRED');
    const payloadChecksum = await checksum(payload);
    const identity = {
      schema: REVISION_SCHEMA,
      projectId,
      operation,
      expectedServerVersion,
      expectedStreamVersion,
      currentRevision,
      targetRevision,
      payloadChecksum
    };
    const generatedKey = `plmr-idem-v1:${(await sha256Hex(canonicalize(identity))).slice(0, 48)}`;
    const idempotencyKey = generatedKey;
    return deepFreeze({
      ...identity,
      idempotencyKey,
      schemaId: String(source.schemaId || `PULUMUR_PROJECT@${Number(source.schemaVersion) || 2}`),
      payload
    });
  }

  async function verifyRevisionIntent(intent) {
    if (!intent || intent.schema !== REVISION_SCHEMA) throw new Error('REVISION_SCHEMA_INVALID');
    await verifyChecksum(intent.payload, intent.payloadChecksum);
    const rebuilt = await createRevisionIntent({
      projectId: intent.projectId,
      operation: intent.operation,
      expectedServerVersion: intent.expectedServerVersion,
      expectedStreamVersion: intent.expectedStreamVersion,
      currentRevision: intent.currentRevision,
      targetRevision: intent.targetRevision,
      schemaId: intent.schemaId,
      payload: intent.payload
    });
    if (rebuilt.idempotencyKey !== intent.idempotencyKey) throw new Error('REVISION_IDEMPOTENCY_KEY_INVALID');
    return true;
  }

  class RevisionLedger {
    constructor(entries) {
      this._streams = new Map();
      for (const entry of entries || []) {
        const projectId = String(entry && entry.projectId || '');
        if (!projectId) throw new Error('REVISION_PROJECT_ID_REQUIRED');
        const stream = this._streams.get(projectId) || [];
        stream.push(deepFreeze(clone(entry)));
        this._streams.set(projectId, stream);
      }
    }

    async append(intent) {
      await verifyRevisionIntent(intent);
      const stream = this._streams.get(intent.projectId) || [];
      const duplicate = stream.find(entry => entry.idempotencyKey === intent.idempotencyKey);
      if (duplicate) return Object.freeze({ status: 'DUPLICATE', entry: duplicate });
      if (stream.length !== intent.expectedStreamVersion) throw new Error('REVISION_CONCURRENCY_CONFLICT');
      if (stream.some(entry => entry.targetRevision === intent.targetRevision)) throw new Error('REVISION_NUMBER_CONFLICT');
      const entry = deepFreeze({
        ...clone(intent),
        streamVersion: stream.length + 1,
        committedServerVersion: intent.expectedServerVersion + 1
      });
      const next = stream.concat(entry);
      this._streams.set(intent.projectId, next);
      return Object.freeze({ status: 'APPENDED', entry });
    }

    entries(projectId) {
      return (this._streams.get(String(projectId || '')) || []).slice();
    }
  }

  class IdempotentWriteCoordinator {
    constructor(options) {
      this.pending = new Map();
      this.completed = new Map();
      this.maxCompleted = Math.max(1, Number(options && options.maxCompleted) || DEFAULT_MAX_COMPLETED);
    }

    async run(intentOrInput, writer) {
      if (typeof writer !== 'function') throw new Error('REVISION_WRITER_REQUIRED');
      const intent = intentOrInput && intentOrInput.schema === REVISION_SCHEMA
        ? intentOrInput
        : await createRevisionIntent(intentOrInput);
      await verifyRevisionIntent(intent);
      if (this.completed.has(intent.idempotencyKey)) return this.completed.get(intent.idempotencyKey).result;
      if (this.pending.has(intent.idempotencyKey)) return this.pending.get(intent.idempotencyKey);
      const task = Promise.resolve().then(() => writer(intent)).then(result => {
        this.completed.set(intent.idempotencyKey, { intent, result });
        while (this.completed.size > this.maxCompleted) this.completed.delete(this.completed.keys().next().value);
        return result;
      }).finally(() => {
        this.pending.delete(intent.idempotencyKey);
      });
      this.pending.set(intent.idempotencyKey, task);
      return task;
    }

    clear() {
      this.pending.clear();
      this.completed.clear();
    }
  }

  const api = Object.freeze({
    REVISION_SCHEMA,
    PROJECT_SCHEMA_V1,
    PROJECT_SCHEMA_V2,
    SchemaRegistry,
    RevisionLedger,
    IdempotentWriteCoordinator,
    clone,
    deepFreeze,
    canonicalize,
    checksum,
    verifyChecksum,
    legacyChecksumForModel,
    createDefaultRegistry,
    projectRegistry,
    projectEnvelopeSchemaId,
    migrateProjectEnvelope,
    createRevisionIntent,
    verifyRevisionIntent,
    createLedger: entries => new RevisionLedger(entries),
    createWriteCoordinator: options => new IdempotentWriteCoordinator(options)
  });

  root.PulumurRevisionCore = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
