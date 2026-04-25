import {
  Application,
  Container,
  EventEmitter,
  Point,
  type FederatedPointerEvent,
} from "pixi.js";
import { GridBackground } from "./background/GridBackground";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const WHEEL_ZOOM_SPEED = 0.001;
const PINCH_ZOOM_SPEED = 0.01;

const RIGHT_CLICK = 2;
const MIDDLE_CLICK = 4;

export class WhiteboardCanvas extends Container {
  public canvasEvents = new EventEmitter<{
    "deselect-all": () => void;
    "position-changed": (position: Point) => void;
    "zoom-changed": (zoom: number) => void;
  }>();
  readonly worldContainer = new Container();
  private readonly bg = new GridBackground();
  private isPanning = false;
  private lastPanX = 0;
  private lastPanY = 0;
  private _zoom = 1;

  constructor(private app: Application) {
    super();

    // Background fills the viewport and catches pointer events for panning
    this.addChild(this.bg);

    // World container holds all widgets and transforms with pan/zoom
    this.worldContainer.sortableChildren = true;
    this.addChild(this.worldContainer);

    // Pan
    this.bg.on("pointerdown", this.onPanStart, this);
    this.bg.on("globalpointermove", this.onPanMove, this);
    this.bg.on("pointerup", this.onPanEnd, this);
    this.bg.on("pointerupoutside", this.onPanEnd, this);
    this.bg.on("click", () => {
      this.canvasEvents.emit("deselect-all");
    });

    // Zoom (on the whole canvas so it works even over widgets)
    this.eventMode = "static";

    this.app.renderer.events.domElement.addEventListener(
      "wheel",
      this.onWheel,
      {
        passive: false,
      },
    );

    this.app.renderer.events.domElement.addEventListener(
      "contextmenu",
      this.disableContextMenu,
      { passive: false },
    );
  }

  private disableContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  get zoom(): number {
    return this._zoom;
  }

  /** Convert screen-space coordinates to world-space. */
  toWorld(point: Point): Point;
  toWorld(screenX: number, screenY: number): Point;
  toWorld(pointOrX: number | Point, screenY?: number): Point {
    let x;
    let y;
    if (typeof pointOrX === "number") {
      x = pointOrX;
      y = screenY!;
    } else {
      x = pointOrX.x;
      y = pointOrX.y;
    }
    return new Point(
      (x - this.worldContainer.x) / this._zoom,
      (y - this.worldContainer.y) / this._zoom,
    );
  }

  /** Convert world-space coordinates to screen-space. */
  toScreen(point: Point): Point;
  toScreen(worldX: number, worldY: number): Point;
  toScreen(pointOrX: number | Point, worldY?: number): Point {
    let x;
    let y;
    if (typeof pointOrX === "number") {
      x = pointOrX;
      y = worldY!;
    } else {
      x = pointOrX.x;
      y = pointOrX.y;
    }

    return new Point(
      x * this._zoom + this.worldContainer.x,
      y * this._zoom + this.worldContainer.y,
    );
  }

  resize(width: number, height: number): void {
    this.bg.resizeGrid(width, height);
    this.syncGrid();
  }

  private syncGrid(): void {
    this.bg.syncGrid(this._zoom, this.worldContainer.x, this.worldContainer.y);
  }

  // ── Pan ────────────────────────────────────────────────────

  private onPanStart(e: FederatedPointerEvent): void {
    if (e.buttons & RIGHT_CLICK || e.buttons & MIDDLE_CLICK) {
      this.isPanning = true;
      this.lastPanX = e.globalX;
      this.lastPanY = e.globalY;
      this.bg.cursor = "grabbing";
    }
  }

  private onPanMove(e: FederatedPointerEvent): void {
    if (!this.isPanning) return;
    this.worldContainer.x += e.globalX - this.lastPanX;
    this.worldContainer.y += e.globalY - this.lastPanY;
    this.canvasEvents.emit("position-changed", this.worldContainer.position);
    this.lastPanX = e.globalX;
    this.lastPanY = e.globalY;
    this.syncGrid();
  }

  private onPanEnd(): void {
    this.isPanning = false;
    this.bg.cursor = "default";
  }

  // ── Zoom ───────────────────────────────────────────────────

  onWheel = (e: WheelEvent): void => {
    e.preventDefault();

    // TODO: Make it DRY
    if (e.ctrlKey) {
      /**
       * CASE 1: PINCH-TO-ZOOM (Touchpad)
       * Browsers map pinch gestures to wheel + ctrlKey
       */
      const point = new Point();
      this.app.renderer.events.mapPositionToPoint(point, e.clientX, e.clientY);
      const worldPoint = this.toWorld(point);

      const delta = -e.deltaY * PINCH_ZOOM_SPEED;
      const newZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, this._zoom * (1 + delta)),
      );
      this._zoom = newZoom;
      this.worldContainer.scale.set(this._zoom);

      // Keep the point under the cursor fixed
      this.worldContainer.x = point.x - worldPoint.x * this._zoom;
      this.worldContainer.y = point.y - worldPoint.y * this._zoom;
      this.canvasEvents.emit("zoom-changed", this._zoom);
    } else if (Math.abs(e.deltaX) > 0 || !this.isMouseWheel(e)) {
      /**
       * CASE 2: TWO-FINGER SCROLL (Touchpad)
       * If there is horizontal movement (deltaX) or it's a fine-grained scroll
       */
      this.worldContainer.x -= e.deltaX;
      this.worldContainer.y -= e.deltaY;
      this.canvasEvents.emit("position-changed", this.worldContainer.position);
    } else {
      /**
       * CASE 3: SCROLL WHEEL (mouse)
       */
      // Zoom toward cursor position
      const point = new Point();
      this.app.renderer.events.mapPositionToPoint(point, e.clientX, e.clientY);
      const worldPoint = this.toWorld(point);

      const delta = -e.deltaY * WHEEL_ZOOM_SPEED;
      const newZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, this._zoom * (1 + delta)),
      );
      this._zoom = newZoom;
      this.worldContainer.scale.set(this._zoom);

      // Keep the point under the cursor fixed
      this.worldContainer.x = point.x - worldPoint.x * this._zoom;
      this.worldContainer.y = point.y - worldPoint.y * this._zoom;
      this.canvasEvents.emit("zoom-changed", this._zoom);
    }

    this.syncGrid();
  };

  private isMouseWheel = (e: WheelEvent): boolean => {
    return Math.abs(e.deltaY) % 1 === 0 && Math.abs(e.deltaY) >= 100;
  };
}
