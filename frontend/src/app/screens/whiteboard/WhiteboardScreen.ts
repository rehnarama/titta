import { Container, type FederatedPointerEvent, type Ticker } from "pixi.js";

import { WhiteboardCanvas } from "./WhiteboardCanvas";
import { SelectionSystem } from "./systems/SelectionSystem";
import { TransformSystem } from "./systems/TransformSystem";
import {
  createWidgetDataOfType,
  createWidgetFromData,
} from "./widgets/WidgetFactory";
import { WhiteboardToolbar } from "./toolbar/WhiteboardToolbar";
import { KeyboardSystem } from "./systems/KeyboardSystem";
import {
  getRegisteredDescriptors,
  onTypeRegistered,
} from "./widgets/WidgetRegistry";
import { registerPostItWidget } from "./widgets/PostItWidget";
import { registerImageWidget } from "./widgets/ImageWidget";
import { GroupTransformHandles } from "./systems/GroupTransformHandles";
import type { WidgetContainer } from "./widgets/WidgetContainer";
import {
  AutomergeUrl,
  DocHandle,
  DocHandleChangePayload,
  isValidAutomergeUrl,
} from "@automerge/automerge-repo";
import { repo } from "../../repo";
import {
  createWhiteboardData,
  WhiteboardData,
  WidgetData,
} from "./WhiteboardData";
import { engine } from "../../getEngine";

// Register widget types on module load
registerPostItWidget();
registerImageWidget();

export class WhiteboardScreen extends Container {
  private canvas: WhiteboardCanvas;
  private toolbar: WhiteboardToolbar;
  private selectionSystem: SelectionSystem;
  private transformSystem: TransformSystem;
  private keyboard: KeyboardSystem;
  private groupHandles: GroupTransformHandles;
  private widgets: Record<string, WidgetContainer> = {};
  private unsubRegistry?: () => void;
  private _width = 0;
  private _height = 0;

  private docHandle!: DocHandle<WhiteboardData>;

  constructor() {
    super();

    // Infinite canvas with pan/zoom
    this.canvas = new WhiteboardCanvas(engine());
    this.addChild(this.canvas);

    this.selectionSystem = new SelectionSystem(this.canvas);
    this.transformSystem = new TransformSystem(
      this.canvas,
      this.selectionSystem,
    );

    // Group transform handles overlay (lives in world-space)
    this.groupHandles = new GroupTransformHandles(
      this.canvas,
      this.selectionSystem,
      this.transformSystem,
    );
    this.groupHandles.zIndex = 1000;
    this.groupHandles.onHandlePointerDown = (handleType, event) => {
      this.transformSystem.startTransform(
        this.selectionSystem.selected,
        handleType,
        event,
      );
    };
    this.canvas.worldContainer.addChild(this.groupHandles);

    // Floating toolbar (DOM-based web component)
    this.toolbar = new WhiteboardToolbar();
    document.body.appendChild(this.toolbar);

    // Deselect when clicking on the canvas background
    this.canvas.canvasEvents.on("deselect-all", () => {
      if (!this.transformSystem.isDragging) {
        this.selectionSystem.deselectAll();
      }
    });

    // Global pointer events for the transform system
    this.eventMode = "static";
    this.on("globalpointermove", (e: FederatedPointerEvent) => {
      this.transformSystem.handlePointerMove(e);
    });
    this.on("pointerup", () => this.transformSystem.handlePointerUp());
    this.on("pointerupoutside", () => this.transformSystem.handlePointerUp());

    this.setupToolbar();

    // Keyboard actions
    this.keyboard = new KeyboardSystem();
    this.keyboard.on("Delete", () => {
      if (this.selectionSystem.count > 0) {
        this.removeSelectedWidgets();
      }
    });

    // HMR: rebuild widget visuals when their type is re-registered
    this.unsubRegistry = onTypeRegistered((type) => {
      for (const widget of Object.values(this.widgets)) {
        if (widget.data.type === type) {
          widget.rebuildContent();
        }
      }
    });
  }

  // ── AppScreen lifecycle ─────────────────────────────────────

  async prepare(): Promise<void> {
    const url = new URL(location.href);
    const automergeUrl = url.searchParams.get("url");
    if (isValidAutomergeUrl(automergeUrl)) {
      this.docHandle = await this.loadDocument(automergeUrl);
    } else {
      this.docHandle = this.createDocument();

      url.searchParams.set("url", this.docHandle.url);
      window.history.pushState({}, "", url);
    }

    for (const widget of Object.values(this.docHandle.doc().widgets)) {
      this.registerWidget(widget);
    }

    this.docHandle.on("change", this.handleOnChange);
  }

  handleOnChange = (payload: DocHandleChangePayload<WhiteboardData>) => {
    for (const patch of payload.patches) {
      if (patch.path[0] === "widgets") {
        if (
          patch.path.length === 2 &&
          typeof patch.path[1] === "string" &&
          patch.action === "del"
        ) {
          this.removeWidget(patch.path[1]);
        } else if (
          patch.path.length === 2 &&
          typeof patch.path[1] === "string" &&
          patch.action === "put"
        ) {
          const widgetData = payload.doc.widgets[patch.path[1]];
          this.registerWidget(widgetData);
        } else if (typeof patch.path[1] === "string") {
          const widgetId = patch.path[1];
          this.widgets[widgetId].rerender();
        }
      }
    }
  };

  createDocument(): DocHandle<WhiteboardData> {
    return repo.create<WhiteboardData>(createWhiteboardData());
  }

  async loadDocument(url: AutomergeUrl): Promise<DocHandle<WhiteboardData>> {
    return await repo.find<WhiteboardData>(url);
  }

  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;
    this.canvas.resize(width, height);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(_time: Ticker): void {
    /* reserved for future animations / physics */
  }

  async show(): Promise<void> {
    this.alpha = 1;
  }

  async hide(): Promise<void> {
    this.alpha = 0;
    this.toolbar.dispose();
    this.keyboard.dispose();
    this.unsubRegistry?.();
  }

  // ── Toolbar ─────────────────────────────────────────────────

  private setupToolbar(): void {
    const descriptors = getRegisteredDescriptors();
    this.toolbar.setActions(
      descriptors.map((d) => ({
        label: `+ ${d.displayName}`,
        onActivate: () => {
          this.createWidget(d.type);
        },
      })),
    );
  }

  // ── Widget management ───────────────────────────────────────
  private createWidget(type: string): void {
    const center = this.canvas.toWorld(this._width / 2, this._height / 2);

    const widgetData = createWidgetDataOfType(type, center.x, center.y);

    this.docHandle.change((doc) => {
      doc.widgets[widgetData.id] = widgetData;
    });
  }

  private registerWidget(data: WidgetData): WidgetContainer {
    const widget = createWidgetFromData(this.docHandle, data);

    widget.transformEvents.on(
      "transform-start",
      ({ widget: w, handleType, event }) => {
        const isModifier = event.ctrlKey || event.shiftKey || event.metaKey;

        if (isModifier) {
          this.selectionSystem.toggle(w);
        } else if (!this.selectionSystem.isSelected(w)) {
          this.selectionSystem.select(w);
        }

        // Only start transform if the widget is (still) selected
        if (this.selectionSystem.isSelected(w)) {
          this.transformSystem.startTransform(
            this.selectionSystem.selected,
            handleType,
            event,
          );
        }
      },
    );

    widget.transformEvents.on("transform-updated", () => {
      // if (this.selectionSystem.selected.has(widget)) {
      //   this.groupHandles.update();
      // }
    });

    this.canvas.worldContainer.addChild(widget);
    this.widgets[widget.data.id] = widget;

    return widget;
  }

  private removeSelectedWidgets(): void {
    const toRemove = Array.from(this.selectionSystem.selected).map(
      (widget) => widget.data.id,
    );
    this.selectionSystem.deselectAll();

    this.docHandle.change((doc) => {
      for (const id of toRemove) {
        delete doc.widgets[id];
      }
    });
  }

  private removeWidget(id: string): void {
    const widget = this.widgets[id];
    delete this.widgets[id];
    this.canvas.worldContainer.removeChild(widget);
    widget.destroy({ children: true });
  }
}
