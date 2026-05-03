import { Container, Graphics, type FederatedPointerEvent } from "pixi.js";

export type ResizeHandle =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";
export type HandleType = ResizeHandle | "rotate";

const HANDLE_SIZE = 10;
const HANDLE_COLOR = 0x4a90d9;
const HANDLE_FILL = 0xffffff;
const ROTATION_HANDLE_OFFSET = 30;
const BORDER_WIDTH = 1.5;

const RESIZE_HANDLES: ResizeHandle[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

export class TransformHandles extends Container {
  private readonly border = new Graphics();
  private readonly rotationLine = new Graphics();
  private readonly handles = new Map<HandleType, Graphics>();
  private _widgetWidth: number;
  private _widgetHeight: number;
  private _canRotate: boolean;
  private _zoom = 1;

  onHandlePointerDown?: (
    handleType: HandleType,
    event: FederatedPointerEvent,
  ) => void;

  constructor(widgetWidth: number, widgetHeight: number, canRotate: boolean) {
    super();
    this._widgetWidth = widgetWidth;
    this._widgetHeight = widgetHeight;
    this._canRotate = canRotate;

    this.addChild(this.border);

    for (const type of RESIZE_HANDLES) {
      const handle = this.createResizeHandle(type);
      this.handles.set(type, handle);
      this.addChild(handle);
    }

    if (canRotate) {
      this.addChild(this.rotationLine);
      const handle = this.createRotationHandle();
      this.handles.set("rotate", handle);
      this.addChild(handle);
    }

    this.draw();
  }

  updateSize(width: number, height: number): void {
    this._widgetWidth = width;
    this._widgetHeight = height;
    this.draw();
  }

  updateForZoom(zoom: number): void {
    this._zoom = zoom;
    this.draw();
  }

  private createResizeHandle(type: ResizeHandle): Graphics {
    const g = new Graphics();
    g.eventMode = "static";
    g.cursor = cursorForHandle(type);
    g.on("pointerdown", (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this.onHandlePointerDown?.(type, e);
    });
    return g;
  }

  private createRotationHandle(): Graphics {
    const g = new Graphics();
    g.eventMode = "static";
    g.cursor = "grab";
    g.on("pointerdown", (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this.onHandlePointerDown?.("rotate", e);
    });
    return g;
  }

  private draw(): void {
    const w = this._widgetWidth;
    const h = this._widgetHeight;
    const s = HANDLE_SIZE / this._zoom;
    const bw = BORDER_WIDTH / this._zoom;

    // Selection border
    this.border.clear();
    this.border.rect(0, 0, w, h);
    this.border.stroke({ color: HANDLE_COLOR, width: bw });

    // Corner handles
    const positions: Record<ResizeHandle, [number, number]> = {
      "top-left": [0, 0],
      "top-right": [w, 0],
      "bottom-left": [0, h],
      "bottom-right": [w, h],
    };

    for (const [type, [x, y]] of Object.entries(positions) as [
      ResizeHandle,
      [number, number],
    ][]) {
      const g = this.handles.get(type)!;
      g.clear();
      g.rect(-s / 2, -s / 2, s, s);
      g.fill(HANDLE_FILL);
      g.stroke({ color: HANDLE_COLOR, width: bw });
      g.position.set(x, y);
    }

    // Rotation handle + line from top center
    if (this._canRotate) {
      const offset = ROTATION_HANDLE_OFFSET / this._zoom;
      const r = s / 2 + 2 / this._zoom;

      this.rotationLine.clear();
      this.rotationLine.moveTo(w / 2, 0);
      this.rotationLine.lineTo(w / 2, -offset);
      this.rotationLine.stroke({ color: HANDLE_COLOR, width: bw });

      const rotHandle = this.handles.get("rotate")!;
      rotHandle.clear();
      rotHandle.circle(0, 0, r);
      rotHandle.fill(HANDLE_FILL);
      rotHandle.stroke({ color: HANDLE_COLOR, width: bw });
      rotHandle.position.set(w / 2, -offset);
    }
  }
}

function cursorForHandle(type: ResizeHandle): string {
  return type === "top-left" || type === "bottom-right"
    ? "nwse-resize"
    : "nesw-resize";
}
