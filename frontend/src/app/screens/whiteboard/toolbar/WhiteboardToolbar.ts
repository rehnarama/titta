export interface ToolbarAction {
  label: string;
  onActivate: () => void;
}

const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      position: fixed;
      bottom: 22px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 100;
      pointer-events: auto;
    }

    .toolbar {
      display: flex;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(42, 42, 42, 0.9);
      border: 1px solid #444;
      border-radius: 10px;
    }

    button {
      all: unset;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 14px;
      height: 32px;
      background: #4a90d9;
      border-radius: 6px;
      color: #fff;
      font-family: Arial, sans-serif;
      font-size: 14px;
      cursor: pointer;
      user-select: none;
    }

    button:hover {
      opacity: 0.8;
    }

    button:active {
      opacity: 0.7;
    }
  </style>
  <div class="toolbar"></div>
`;

export class WhiteboardToolbar extends HTMLElement {
  private root: ShadowRoot;
  private bar: HTMLDivElement;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.appendChild(template.content.cloneNode(true));
    this.bar = this.root.querySelector(".toolbar")!;
  }

  setActions(actions: ToolbarAction[]): void {
    this.bar.replaceChildren();

    for (const action of actions) {
      const btn = document.createElement("button");
      btn.textContent = action.label;
      btn.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        action.onActivate();
      });
      this.bar.appendChild(btn);
    }
  }

  dispose(): void {
    this.remove();
  }
}

customElements.define("whiteboard-toolbar", WhiteboardToolbar);
