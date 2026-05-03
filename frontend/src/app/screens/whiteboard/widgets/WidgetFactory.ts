import {
  createWidgetData,
  getWidgetPath,
  WhiteboardData,
  WidgetData,
} from "../WhiteboardData";
import { getWidgetDescriptor } from "./WidgetRegistry";
import { WidgetContainer } from "./WidgetContainer";
import { DocHandle } from "@automerge/automerge-repo";

/** Create a widget from an existing WidgetData record (e.g. loaded from storage). */
export function createWidgetFromData(
  docHandle: DocHandle<WhiteboardData>,
  data: Parameters<typeof WidgetContainer.prototype.updateData>[0] &
    ReturnType<typeof createWidgetData>,
): WidgetContainer {
  const descriptor = getWidgetDescriptor(data.type);
  const widget = descriptor.create(docHandle, getWidgetPath(data.id));
  return new WidgetContainer(docHandle, data.id, widget);
}

/** Create a brand-new widget of the given type at the specified position. */
export function createWidgetDataOfType(
  type: string,
  x: number,
  y: number,
  overrides: Partial<WidgetData> = {},
): WidgetData {
  const descriptor = getWidgetDescriptor(type);
  const data = createWidgetData(type, {
    position: {
      x,
      y,
      width: descriptor.defaultWidth,
      height: descriptor.defaultHeight,
    },
    props: { ...descriptor.defaultProps, ...(overrides.props ?? {}) },
    ...overrides,
  });

  return data;
  // const widget = descriptor.create(data);
  // return new WidgetContainer(data, widget);
}
