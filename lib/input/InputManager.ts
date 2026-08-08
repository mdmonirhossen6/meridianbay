const KEYS: Record<string, string> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  Space: "jump",
  ShiftLeft: "run",
  ShiftRight: "run",
  KeyE: "enter",
  KeyF: "enter",
  KeyC: "camera",
  KeyH: "headlights",
  KeyB: "horn",
  KeyJ: "radio",
  KeyR: "reset",
  Tab: "minimap",
  KeyP: "pause",
  KeyN: "mute",
  Escape: "pause",
  KeyM: "minimap",
};

const PRECEDENT = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "Tab",
]);

type ActionHandler = (action: string, pressed: boolean) => void;

class InputManager {
  private actions = new Set<string>();
  private edgeQueue = new Set<string>();
  private handledActions = new Set<string>();
  private handler: ActionHandler | null = null;
  private bound = false;

  constructor() {
    if ((globalThis as any).__MB_INPUT__) return;
    (globalThis as any).__MB_INPUT__ = true;

    if (typeof window === "undefined") return;

    const onDown = (e: KeyboardEvent) => {
      const action = KEYS[e.code];
      if (!action) return;
      if (PRECEDENT.has(e.code)) e.preventDefault();
      const isNew = !this.actions.has(action);
      this.actions.add(action);
      if (isNew) {
        this.edgeQueue.add(action);
        this.handler?.(action, true);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const action = KEYS[e.code];
      this.actions.delete(action);
      this.handledActions.delete(action);
      this.handler?.(action, false);
    };
    const clearAll = () => {
      this.actions.clear();
      this.edgeQueue.clear();
    };
    window.addEventListener("keydown", onDown, { capture: true });
    window.addEventListener("keyup", onUp, { capture: true });
    window.addEventListener("blur", clearAll);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clearAll();
    });
  }

  setHandler(fn: ActionHandler | null) {
    this.handler = fn;
  }

  is(action: string): boolean {
    return this.actions.has(action);
  }

  justPressed(action: string): boolean {
    if (this.actions.has(action) && !this.handledActions.has(action)) {
      this.handledActions.add(action);
      return true;
    }
    return false;
  }

  peekPressed(action: string): boolean {
    return this.edgeQueue.has(action);
  }

  clearEdges() {
    this.edgeQueue.clear();
  }

  axis(pos: string, neg: string): number {
    return (this.actions.has(pos) ? 1 : 0) - (this.actions.has(neg) ? 1 : 0);
  }
}

export const input = new InputManager();
export function isKey(action: string): boolean {
  return input.is(action);
}