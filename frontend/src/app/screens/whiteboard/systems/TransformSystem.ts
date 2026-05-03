import { EventEmitter, type FederatedPointerEvent } from "pixi.js";
import type { WidgetContainer } from "../widgets/WidgetContainer";
import type { HandleType, ResizeHandle } from "./TransformHandles";
import { WhiteboardCanvas } from "../WhiteboardCanvas";
import { SelectionSystem } from "./SelectionSystem";

interface WidgetSnapshot {
  widget: WidgetContainer;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startRotation: number;
}

interface DragState {
  snapshots: WidgetSnapshot[];
  mode: "move" | "resize" | "rotate";
  startCursorX: number;
  startCursorY: number;
  /** Group AABB at drag start (for resize/rotate reference) */
  groupX: number;
  groupY: number;
  groupWidth: number;
  groupHeight: number;
  resizeHandle?: ResizeHandle;
}

export class TransformSystem extends EventEmitter<{
  transformStart: () => void;
  transformEnd: () => void;
  rotate: (deltaAngle: number) => void;
  translate: (deltaX: number, deltaY: number) => void;
  scale: (scaleX: number, scaleY: number) => void;
}> {
  private drag: DragState | null = null;

  constructor(
    private canvas: WhiteboardCanvas,
    private selectionSystem: SelectionSystem,
  ) {
    super();
  }

  get isDragging() {
    return this.drag !== null;
  }

  startTransform(
    widgets: ReadonlySet<WidgetContainer>,
    handleType: HandleType | "move",
    event: FederatedPointerEvent,
  ) {
    this.emit("transformStart");

    const snapshots: WidgetSnapshot[] = [];
    for (const w of widgets) {
      const d = w.data;
      snapshots.push({
        widget: w,
        startX: d.position.x,
        startY: d.position.y,
        startWidth: d.position.width,
        startHeight: d.position.height,
        startRotation: d.position.rotation,
      });
    }

    const bounds = this.selectionSystem.computeSelectionBounds() ?? {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };

    const startCursor = this.canvas.toWorld(event.globalX, event.globalY);

    this.drag = {
      snapshots,
      mode:
        handleType === "move"
          ? "move"
          : handleType === "rotate"
            ? "rotate"
            : "resize",
      startCursorX: startCursor.x,
      startCursorY: startCursor.y,
      groupX: bounds.x,
      groupY: bounds.y,
      groupWidth: bounds.width,
      groupHeight: bounds.height,
      resizeHandle:
        handleType !== "move" && handleType !== "rotate"
          ? handleType
          : undefined,
    };
  }

  handlePointerMove(event: FederatedPointerEvent) {
    if (!this.drag) return;

    const worldCursor = this.canvas.toWorld(event.globalX, event.globalY);
    const dx = worldCursor.x - this.drag.startCursorX;
    const dy = worldCursor.y - this.drag.startCursorY;

    if (this.drag.mode === "move") {
      this.applyGroupTransform(this.drag, dx, dy);
    } else if (this.drag.mode === "resize") {
      this.applyGroupResize(this.drag, dx, dy);
    } else if (this.drag.mode === "rotate") {
      this.applyGroupRotation(this.drag, worldCursor.x, worldCursor.y);
    }
  }

  private applyGroupTransform(drag: DragState, dx: number, dy: number) {
    for (const snap of drag.snapshots) {
      snap.widget.updateLocalPosition({
        x: snap.startX + dx,
        y: snap.startY + dy,
      });
    }
    this.emit("translate", dx, dy);
  }

  handlePointerUp() {
    if (this.drag) {
      for (const snap of this.drag.snapshots) {
        snap.widget.commitPosition();
      }
      this.drag = null;

      this.emit("transformEnd");
    }
  }

  applyGroupRotation(drag: DragState, cursorX: number, cursorY: number): void {
    const centerX = drag.groupX + drag.groupWidth / 2;
    const centerY = drag.groupY + drag.groupHeight / 2;

    // Current angle from group center to cursor
    const currentAngle =
      Math.atan2(cursorY - centerY, cursorX - centerX) + Math.PI / 2;

    // Initial angle from group center to cursor at drag start
    const startAngle =
      Math.atan2(drag.startCursorY - centerY, drag.startCursorX - centerX) +
      Math.PI / 2;

    const deltaAngle = currentAngle - startAngle;

    const cos = Math.cos(deltaAngle);
    const sin = Math.sin(deltaAngle);

    for (const snap of drag.snapshots) {
      // Rotate widget center around group center
      const widgetCenterX = snap.startX + snap.startWidth / 2;
      const widgetCenterY = snap.startY + snap.startHeight / 2;

      const relX = widgetCenterX - centerX;
      const relY = widgetCenterY - centerY;

      const rotatedX = relX * cos - relY * sin;
      const rotatedY = relX * sin + relY * cos;

      const newCenterX = centerX + rotatedX;
      const newCenterY = centerY + rotatedY;

      snap.widget.updateLocalPosition({
        x: newCenterX - snap.startWidth / 2,
        y: newCenterY - snap.startHeight / 2,
        rotation: snap.startRotation + deltaAngle,
      });
    }

    this.emit("rotate", deltaAngle);
  }

  applyGroupResize(drag: DragState, dx: number, dy: number): void {
    const handle = drag.resizeHandle!;
    const gx = drag.groupX;
    const gy = drag.groupY;
    const gw = drag.groupWidth;
    const gh = drag.groupHeight;

    // Compute new group bounds from handle drag
    let newGX = gx;
    let newGY = gy;
    let newGW = gw;
    let newGH = gh;

    const MIN_GROUP = 20;

    if (handle.includes("right")) {
      newGW = Math.max(MIN_GROUP, gw + dx);
    }
    if (handle.includes("left")) {
      const clampedDx = Math.min(dx, gw - MIN_GROUP);
      newGX = gx + clampedDx;
      newGW = gw - clampedDx;
    }
    if (handle.includes("bottom")) {
      newGH = Math.max(MIN_GROUP, gh + dy);
    }
    if (handle.includes("top")) {
      const clampedDy = Math.min(dy, gh - MIN_GROUP);
      newGY = gy + clampedDy;
      newGH = gh - clampedDy;
    }

    const scaleX = gw > 0 ? newGW / gw : 1;
    const scaleY = gh > 0 ? newGH / gh : 1;

    for (const snap of drag.snapshots) {
      const { minWidth, minHeight } = snap.widget.descriptor;
      const relX = gw > 0 ? (snap.startX - gx) / gw : 0;
      const relY = gh > 0 ? (snap.startY - gy) / gh : 0;

      snap.widget.updateLocalPosition({
        x: newGX + relX * newGW,
        y: newGY + relY * newGH,
        width: Math.max(minWidth, snap.startWidth * scaleX),
        height: Math.max(minHeight, snap.startHeight * scaleY),
      });
    }

    this.emit("scale", scaleX, scaleY);
  }
}
