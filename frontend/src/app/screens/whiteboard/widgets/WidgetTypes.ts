import type { Container } from "pixi.js";
import type { WhiteboardData, WidgetData } from "../WhiteboardData";
import type { WidgetContainer } from "./WidgetContainer";
import type { DocHandle, Prop } from "@automerge/automerge-repo";

/** Static metadata + factory for a widget type. Stored in the registry. */
export interface WidgetDescriptor<TProps = Record<string, unknown>> {
  readonly type: string;
  readonly displayName: string;
  readonly canResize: boolean;
  readonly canRotate: boolean;
  readonly minWidth: number;
  readonly minHeight: number;
  readonly defaultWidth: number;
  readonly defaultHeight: number;
  readonly defaultProps: TProps;
  /** Create a new Widget instance for a given data record. */
  create(
    docHandle: DocHandle<WhiteboardData>,
    widgetPath: Prop[],
  ): Widget<TProps>;
}

/** Per-instance widget behaviour. One instance per widget on the canvas. */
export abstract class Widget<TProps = Record<string, unknown>> {
  /** Create the visual content for this widget. */
  abstract createContent(data: WidgetData<TProps>): Container;

  /** Update existing content when data changes (avoids re-creation). */
  abstract updateContent(content: Container, data: WidgetData<TProps>): void;

  /** Handler for double-click interactions. Override in subclasses. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDoubleClick(_widget: WidgetContainer): void {}
}
