(function (root) {
  'use strict';

  const handlers = new Map();
  const listeners = new Set();
  let commandSequence = 0;

  function normalizeName(name) {
    const normalized = String(name || '').trim();
    if (!normalized) throw new Error('Komut adı ve handler gerekli.');
    return normalized;
  }

  function register(name, handler) {
    const normalized = normalizeName(name);
    if (typeof handler !== 'function') throw new Error('Komut adı ve handler gerekli.');
    // V13.41 ve öncesindeki register davranışı aynı adı yeniden kaydetmeye izin veriyordu.
    // Bu davranış, geç yüklenen UI modülleri ve test fixture'ları için korunur.
    handlers.set(normalized, handler);
    return function unregisterRegisteredCommand() {
      if (handlers.get(normalized) === handler) handlers.delete(normalized);
    };
  }

  function unregister(name) {
    return handlers.delete(String(name || '').trim());
  }

  function safeError(error) {
    return Object.freeze({
      name: String(error && error.name || 'Error'),
      message: String(error && error.message || error || 'Bilinmeyen komut hatası')
    });
  }

  function publish(type, command, executionId, startedAt, context, extra) {
    const now = Date.now();
    const event = Object.freeze({
      schema: 'plmr-command-event-v1',
      type,
      command,
      executionId,
      source: String(context && context.source || 'unknown'),
      startedAt,
      completedAt: type === 'command:started' ? null : now,
      durationMs: type === 'command:started' ? null : Math.max(0, now - startedAt),
      ...(extra || {})
    });
    listeners.forEach(listener => {
      try { listener(event); }
      catch (error) {
        if (root.console && typeof root.console.error === 'function') root.console.error('PLMR_COMMAND_LISTENER_ERROR', error);
      }
    });
    return event;
  }

  function execute(name, payload, context) {
    const normalized = normalizeName(name);
    const handler = handlers.get(normalized);
    if (!handler) throw new Error(`Kayıtlı olmayan proje komutu: ${normalized}`);

    const executionId = `CMD-${String(++commandSequence).padStart(6, '0')}`;
    const startedAt = Date.now();
    const safeContext = context && typeof context === 'object' ? context : {};
    publish('command:started', normalized, executionId, startedAt, safeContext);

    try {
      const result = handler(payload, safeContext);
      if (result && typeof result.then === 'function') {
        return Promise.resolve(result).then(value => {
          publish('command:succeeded', normalized, executionId, startedAt, safeContext);
          return value;
        }, error => {
          publish('command:failed', normalized, executionId, startedAt, safeContext, { error: safeError(error) });
          throw error;
        });
      }
      publish('command:succeeded', normalized, executionId, startedAt, safeContext);
      return result;
    } catch (error) {
      publish('command:failed', normalized, executionId, startedAt, safeContext, { error: safeError(error) });
      throw error;
    }
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') throw new Error('Komut olay dinleyicisi bir fonksiyon olmalıdır.');
    listeners.add(listener);
    return function unsubscribeCommandEvents() { listeners.delete(listener); };
  }

  function has(name) { return handlers.has(String(name || '').trim()); }
  function list() { return Array.from(handlers.keys()); }
  function clear() { handlers.clear(); }

  const api = Object.freeze({ register, unregister, execute, subscribe, has, list, clear });
  root.PulumurProjectCommandService = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
