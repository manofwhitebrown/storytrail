// event-bus.js - modules talk by announcing events instead of calling each other.
//   bus.on("tokens", (info) => ...)      listen
//   bus.emit("tokens", { n: 1 })         announce
// One broken listener never stops the others.

const listeners = new Map();

export const bus = {
  on(name, fn) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(fn);
    return () => this.off(name, fn);
  },
  off(name, fn) {
    listeners.get(name)?.delete(fn);
  },
  emit(name, data) {
    for (const fn of [...(listeners.get(name) || [])]) {
      try { fn(data); } catch (err) { console.error(`[bus] "${name}" listener failed`, err); }
    }
  },
};
