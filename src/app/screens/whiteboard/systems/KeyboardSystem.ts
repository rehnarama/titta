import { EventEmitter } from "pixi.js";

type KeyboardAction = "delete";

export class KeyboardSystem extends EventEmitter<{
  action: [KeyboardAction];
}> {
  private handleKeyDown = (e: KeyboardEvent): void => {
    // Ignore when the user is typing in an input or textarea (e.g. PostIt edit)
    const tag = (document.activeElement as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      this.emit("action", "delete");
    }
  };

  constructor() {
    super();
    window.addEventListener("keydown", this.handleKeyDown);
  }

  dispose(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    this.removeAllListeners();
  }
}
