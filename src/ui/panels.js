// panels.js - one place that opens and closes every dialog (event, journal, map, menu...).
// Rules: only one panel is open at a time. If something else asks to open while one is
// showing (say, an ending arrives mid-event), it waits in a queue and opens right after.

import { bus } from "../core/event-bus.js";

const registry = new Map(); // id -> { el, dismissable, onOpen, onClose }
const queue = [];           // [{ id, opts }]
let current = null;
let returnFocus = null;
let stage = null;

export const Panels = {
  init(stageEl) {
    stage = stageEl;
    window.addEventListener("keydown", (e) => {
      if (!current) return;
      const reg = registry.get(current);
      if (e.key === "Escape" && reg.dismissable) {
        e.preventDefault();
        this.close(current);
      }
      if (e.key === "Tab") trapFocus(e, reg.el);
    });
  },

  // Makes the empty <section> for a panel and remembers it. Returns the element to fill.
  create(id, { className = "", label = id, dismissable = true, onOpen, onClose } = {}) {
    const el = document.createElement("section");
    el.className = `panel ${className} hidden`.trim();
    el.id = `panel-${id}`;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", label);
    stage.append(el);
    registry.set(id, { el, dismissable, onOpen, onClose });
    return el;
  },

  // opts.replace: close whatever is open and switch straight to this panel (for menu -> sub-menu)
  open(id, opts = {}) {
    if (!registry.has(id)) return;
    if (current === id) return;

    if (current && opts.replace) {
      this.hideCurrent();
    } else if (current) {
      if (!queue.some((q) => q.id === id)) queue.push({ id, opts });
      return;
    }

    const reg = registry.get(id);
    if (!returnFocus) returnFocus = document.activeElement;
    current = id;
    reg.onOpen?.(opts);
    reg.el.classList.remove("hidden");
    const first = reg.el.querySelector("[data-autofocus]") || reg.el.querySelector("button, input");
    first?.focus();
    bus.emit("panel:open", id);
  },

  hideCurrent() {
    const reg = registry.get(current);
    reg.el.classList.add("hidden");
    const id = current;
    current = null;
    reg.onClose?.();
    bus.emit("panel:close", id);
  },

  close(id) {
    if (!current || (id && id !== current)) return;
    this.hideCurrent();
    const next = queue.shift();
    if (next) {
      this.open(next.id, next.opts);
    } else {
      const f = returnFocus;
      returnFocus = null;
      if (f && document.contains(f) && !f.classList.contains("hidden")) f.focus();
    }
  },

  isOpen() { return current !== null; },
  current() { return current; },
  element(id) { return registry.get(id)?.el; },
};

function trapFocus(e, el) {
  const items = [...el.querySelectorAll("button, input, [tabindex]:not([tabindex='-1'])")]
    .filter((n) => !n.disabled && n.offsetParent !== null);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
