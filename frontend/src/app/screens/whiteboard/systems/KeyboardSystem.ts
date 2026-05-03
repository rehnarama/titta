import { EventEmitter } from "pixi.js";

interface KeyboardEvents {
  Delete: () => void;
  PasteImage: (file: File) => void;
}

export class KeyboardSystem extends EventEmitter<KeyboardEvents> {
  private handleKeyDown = (e: KeyboardEvent): void => {
    // Ignore when the user is typing in an input or textarea (e.g. PostIt edit)
    const tag = (document.activeElement as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      this.emit("Delete");
    }
  };

  private handlePaste = (e: ClipboardEvent) => {
    const files = e.clipboardData?.files;
    if (files) {
      for (const file of files) {
        this.emit("PasteImage", file);
      }
    }
  };

  constructor() {
    super();
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("paste", this.handlePaste);
  }

  dispose(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("paste", this.handlePaste);
    this.removeAllListeners();
  }
}
