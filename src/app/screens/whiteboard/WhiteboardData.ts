import { Prop } from "@automerge/automerge-repo";
import { DeepPartial } from "../../utils/DeepPartial";
import merge from "lodash-es/merge";

/** Serializable state for a single widget. Designed for Automerge compatibility. */
export interface WidgetData<TProps = Record<string, unknown>> {
  readonly id: string;
  type: string;
  props: TProps;
  position: WidgetPosition;
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

/** Camera state for the whiteboard viewport. */
export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

/** Full whiteboard document — future Automerge document shape. */
export interface WhiteboardData {
  widgets: Record<string, WidgetData>;
  camera: CameraState;
}

let nextZIndex = 1;

/** Creates a new WidgetData with a unique ID and defaults. */
export function createWidgetData(
  type: string,
  overrides: DeepPartial<Omit<WidgetData, "id" | "type">> = {},
): WidgetData {
  return merge(
    {
      id: crypto.randomUUID(),
      type,
      position: {
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        rotation: 0,
        zIndex: nextZIndex++,
      },
      props: {},
    },
    overrides,
  );
}

export function createWhiteboardData(): WhiteboardData {
  return {
    widgets: {},
    camera: { x: 0, y: 0, zoom: 1 },
  };
}

export function getWidgetPath(widgetId: string): Prop[] {
  return ["widgets", widgetId];
}
