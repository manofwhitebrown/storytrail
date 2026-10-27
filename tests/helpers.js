// Shared by the tests: a HUD that does nothing (the real one needs the whole page), and a clean game state.
import { vi } from "vitest";

export const hudMock = () => ({
  HUD: { toast: vi.fn(), popup: vi.fn(), updateCounters: vi.fn(), reveal: vi.fn(), init: vi.fn(), hideHint: vi.fn(), setPhase: vi.fn(), setUnread: vi.fn() },
});
