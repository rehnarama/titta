import { Container, EventEmitter, type FederatedPointerEvent } from "pixi.js";
import {
  getWidgetPath,
  WidgetPosition,
  type WhiteboardData,
  type WidgetData,
} from "../WhiteboardData";
import { getWidgetDescriptor } from "./WidgetRegistry";
import type { Widget, WidgetDescriptor } from "./WidgetTypes";
import { type HandleType } from "../systems/TransformHandles";
import { DocHandle } from "@automerge/automerge-repo";
import merge from "lodash-es/merge";

const DOUBLE_CLICK_MS = 350;
const LEFT_CLICK = 1;

export interface TransformEvent {
  widget: WidgetContainer;
  handleType: HandleType | "move";
  event: FederatedPointerEvent;
}

export class WidgetContainer extends Container {
  private _typeName: string;
  readonly transformEvents = new EventEmitter<{
    "transform-start": [TransformEvent];
    "transform-updated": void;
    "double-click": [WidgetContainer];
  }>();

  private _widget: Widget;
  private _localPosition: WidgetPosition | null = null;
  private content: Container;
  private lastPointerDownTime = 0;

  constructor(
    public docHandle: DocHandle<WhiteboardData>,
    private widgetId: string,
    widget: Widget,
  ) {
    super();
    const data = this.data;

    this._typeName = data.type;
    this._widget = widget;

    // Visual content from the widget instance
    this.content = this._widget.createContent(data);
    this.addChild(this.content);

    // Interaction: select + move on pointerdown
    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointerdown", (e: FederatedPointerEvent) => {
      if (!(e.buttons & LEFT_CLICK)) {
        return;
      }

      e.stopPropagation();

      // Double-click detection
      const now = Date.now();
      if (now - this.lastPointerDownTime < DOUBLE_CLICK_MS) {
        this.transformEvents.emit("double-click", this);
        this._widget.onDoubleClick(this);
      }
      this.lastPointerDownTime = now;

      this.transformEvents.emit("transform-start", {
        widget: this,
        handleType: "move",
        event: e,
      });
    });

    this.applyTransform();
  }

  get data(): WidgetData {
    const doc = this.docHandle.doc();
    return doc.widgets[this.widgetId];
  }

  /** Fetches the descriptor from the registry (stays fresh after HMR). */
  get descriptor(): WidgetDescriptor {
    return getWidgetDescriptor(this._typeName);
  }

  /** Rebuild visual content, creating a fresh widget instance from the descriptor (for HMR). */
  rebuildContent(): void {
    this.removeChild(this.content);
    this.content.destroy({ children: true });

    this._widget = this.descriptor.create(
      this.docHandle,
      getWidgetPath(this.widgetId),
    );
    this.content = this._widget.createContent(this.data);
    this.addChildAt(this.content, 0);
  }

  updateData(patch: Partial<WidgetData>): void {
    this.docHandle.change((doc) => {
      merge(doc.widgets[this.widgetId], patch);
    });

    this.rerender();
  }

  updateLocalPosition(patchPosition: Partial<WidgetPosition>): void {
    const currentPosition = this._localPosition ?? this.data.position;

    this._localPosition = Object.assign(currentPosition, patchPosition);
    this.rerender();
  }

  commitPosition(): void {
    if (this._localPosition) {
      this.updateData({
        position: this._localPosition,
      });
      this._localPosition = null;
    }
  }

  rerender(): void {
    this.applyTransform();
    this._widget.updateContent(this.content, this.data);
  }

  /** Sync Pixi transform from data model. Uses center pivot for correct rotation. */
  private applyTransform(): void {
    const widgetPosition = this._localPosition ?? this.data.position;

    this.pivot.set(widgetPosition.width / 2, widgetPosition.height / 2);
    this.position.set(
      widgetPosition.x + widgetPosition.width / 2,
      widgetPosition.y + widgetPosition.height / 2,
    );
    this.rotation = widgetPosition.rotation;
    this.zIndex = widgetPosition.zIndex;

    this.transformEvents.emit("transform-updated");
  }
}
