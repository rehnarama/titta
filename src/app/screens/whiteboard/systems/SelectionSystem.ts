import { Bounds, EventEmitter } from "pixi.js";
import type { WidgetContainer } from "../widgets/WidgetContainer";
import { WhiteboardCanvas } from "../WhiteboardCanvas";

export class SelectionSystem extends EventEmitter<"selection-changed"> {
  private selectedWidgets = new Set<WidgetContainer>();

  public constructor(private canvas: WhiteboardCanvas) {
    super();
  }

  clearAll(): void {
    this.selectedWidgets.clear();
  }

  get selected() {
    return this.selectedWidgets;
  }

  get count() {
    return this.selectedWidgets.size;
  }

  select(widget: WidgetContainer) {
    if (this.selectedWidgets.size === 1 && this.selectedWidgets.has(widget)) {
      return;
    }
    this.clearAll();
    this.selectedWidgets.add(widget);
    this.emit("selection-changed");
  }

  toggle(widget: WidgetContainer) {
    if (this.selectedWidgets.has(widget)) {
      this.selectedWidgets.delete(widget);
    } else {
      this.selectedWidgets.add(widget);
    }
    this.emit("selection-changed");
  }

  deselectAll() {
    if (this.selectedWidgets.size === 0) return;
    this.clearAll();
    this.emit("selection-changed");
  }

  isSelected(widget: WidgetContainer) {
    return this.selectedWidgets.has(widget);
  }

  computeSelectionBounds(): Bounds | null {
    if (this.selectedWidgets.size === 0) {
      return null;
    }

    const bounds = new Bounds();
    const tempBounds = new Bounds();
    for (const w of this.selectedWidgets) {
      w.getBounds(undefined, tempBounds);
      const min = this.canvas.toWorld(tempBounds.minX, tempBounds.minY);
      const max = this.canvas.toWorld(tempBounds.maxX, tempBounds.maxY);
      bounds.addBounds(new Bounds(min.x, min.y, max.x, max.y));
    }

    return bounds;
  }
}
