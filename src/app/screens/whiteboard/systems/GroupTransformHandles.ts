import { Container, Graphics, type FederatedPointerEvent } from "pixi.js";
import type { HandleType, ResizeHandle } from "./TransformHandles";
import { SelectionSystem } from "./SelectionSystem";
import { WhiteboardCanvas } from "../WhiteboardCanvas";
import { TransformSystem } from "./TransformSystem";

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

export interface GroupBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Draws a bounding box with resize/rotate handles around a group of widgets.
 * Lives in world-space, only visible when multiple widgets are selected.
 */
export class GroupTransformHandles extends Container {
  private readonly border = new Graphics();
  private readonly rotationLine = new Graphics();
  private readonly handleGraphics = new Map<HandleType, Graphics>();
  private _bounds: GroupBounds | null = null;

  onHandlePointerDown?: (
    handleType: HandleType,
    event: FederatedPointerEvent,
  ) => void;

  constructor(
    private canvas: WhiteboardCanvas,
    private selectionSystem: SelectionSystem,
    private transformSystem: TransformSystem,
  ) {
    super();
    this.visible = false;

    this.addChild(this.border);

    for (const type of RESIZE_HANDLES) {
      const g = this.createHandle(type);
      this.handleGraphics.set(type, g);
      this.addChild(g);
    }
    this.selectionSystem.on("selection-changed", () => {
      this.resetRotation();
      this.update();
    });

    // Rotation handle
    this.addChild(this.rotationLine);
    const rotHandle = this.createHandle("rotate");
    rotHandle.cursor = "grab";
    this.handleGraphics.set("rotate", rotHandle);
    this.addChild(rotHandle);

    this.canvas.canvasEvents.on("zoom-changed", () => {
      this.updateForZoom();
    });

    this.transformSystem.on("rotate", (deltaAngle) => {
      if (this.selectionSystem.selected.size === 1) {
        const [widget] = this.selectionSystem.selected;
        this.rotation = widget.rotation;
      } else {
        this.rotation = deltaAngle;
      }
    });
    this.transformSystem.on("translate", () => {
      this.update();
    });
    this.transformSystem.on("scale", () => {
      this.update();
    });
    this.transformSystem.on("transformEnd", () => {
      this.resetRotation();
    });
  }

  resetRotation(): void {
    if (this.selectionSystem.selected.size === 1) {
      const [widget] = this.selectionSystem.selected;
      this.rotation = widget.rotation;
    } else {
      this.rotation = 0;
    }
    this.update();
  }

  get bounds_(): GroupBounds | null {
    return this._bounds;
  }

  update(): void {
    if (this.selectionSystem.selected.size === 1) {
      const [widget] = this.selectionSystem.selected;
      this._bounds = widget.data.position;
    } else {
      this._bounds = this.selectionSystem.computeSelectionBounds();
    }
    if (!this._bounds) {
      this.visible = false;
      return;
    }
    this.visible = true;
    this.draw();
  }

  updateForZoom(): void {
    if (this.visible) {
      this.draw();
    }
  }

  private createHandle(type: HandleType): Graphics {
    const g = new Graphics();
    g.eventMode = "static";
    if (type !== "rotate") {
      g.cursor = cursorForHandle(type as ResizeHandle);
    }
    g.on("pointerdown", (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this.onHandlePointerDown?.(type, e);
    });
    return g;
  }

  private draw(): void {
    if (!this._bounds) return;
    const { x, y, width: w, height: h } = this._bounds;
    const s = HANDLE_SIZE / this.canvas.zoom;
    const bw = BORDER_WIDTH / this.canvas.zoom;

    // Position the container at the group origin
    this.pivot.x = w / 2;
    this.pivot.y = h / 2;
    this.position.set(x + w / 2, y + h / 2);

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

    for (const [type, [hx, hy]] of Object.entries(positions) as [
      ResizeHandle,
      [number, number],
    ][]) {
      const g = this.handleGraphics.get(type)!;
      g.clear();
      g.rect(-s / 2, -s / 2, s, s);
      g.fill(HANDLE_FILL);
      g.stroke({ color: HANDLE_COLOR, width: bw });
      g.position.set(hx, hy);
    }

    // Rotation handle + line from top center
    const offset = ROTATION_HANDLE_OFFSET / this.canvas.zoom;
    const r = s / 2 + 2 / this.canvas.zoom;

    this.rotationLine.clear();
    this.rotationLine.moveTo(w / 2, 0);
    this.rotationLine.lineTo(w / 2, -offset);
    this.rotationLine.stroke({ color: HANDLE_COLOR, width: bw });

    const rotHandle = this.handleGraphics.get("rotate")!;
    rotHandle.clear();
    rotHandle.circle(0, 0, r);
    rotHandle.fill(HANDLE_FILL);
    rotHandle.stroke({ color: HANDLE_COLOR, width: bw });
    rotHandle.position.set(w / 2, -offset);
  }
}

function cursorForHandle(type: ResizeHandle): string {
  return type === "top-left" || type === "bottom-right"
    ? "nwse-resize"
    : "nesw-resize";
}
