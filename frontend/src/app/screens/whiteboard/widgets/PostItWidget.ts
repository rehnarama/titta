import {
  Container,
  DOMContainer,
  Graphics,
  Text,
  type TextStyleOptions,
} from "pixi.js";
import type { WhiteboardData, WidgetData } from "../WhiteboardData";
import { Widget, type WidgetDescriptor } from "./WidgetTypes";
import { registerWidget } from "./WidgetRegistry";
import type { WidgetContainer } from "./WidgetContainer";
import { DropShadowFilter } from "pixi-filters";
import { DocHandle, Prop, updateText } from "@automerge/automerge-repo";

const POST_IT_COLORS: Record<string, number> = {
  yellow: 0xffeb3b,
  pink: 0xf48fb1,
  blue: 0x81d4fa,
  green: 0xa5d6a7,
  orange: 0xffcc80,
};

const DEFAULT_COLOR = "yellow";

const TEXT_STYLE: TextStyleOptions = {
  fontFamily: "Arial",
  fontSize: 16,
  fill: 0x333333,
  wordWrap: true,
};

interface PostItProps {
  text: string;
  color: string;
}

export class PostItWidget extends Widget<PostItProps> {
  private activeEditor: DOMContainer | null = null;

  public constructor(
    private docHandle: DocHandle<WhiteboardData>,
    private widgetPath: Prop[],
  ) {
    super();
  }

  createContent(data: WidgetData<PostItProps>): Container {
    const container = new Container();
    const props = data.props;

    const bg = new Graphics();
    bg.filters = [
      new DropShadowFilter({
        blur: 2,
        alpha: 0.2,
      }),
    ];
    bg.label = "bg";
    this.drawBg(bg, data.position.width, data.position.height, props.color);
    container.addChild(bg);

    const text = new Text({
      text: props.text || "Double-click to edit",
      style: { ...TEXT_STYLE, wordWrapWidth: data.position.width - 20 },
    });
    text.label = "text";
    text.alpha = props.text ? 1 : 0.4;
    text.position.set(10, 10);
    container.addChild(text);

    return container;
  }

  updateContent(content: Container, data: WidgetData<PostItProps>): void {
    const props = data.props;

    const bg = content.getChildByLabel("bg") as Graphics;
    if (bg) {
      this.drawBg(bg, data.position.width, data.position.height, props.color);
    }

    const text = content.getChildByLabel("text") as Text;
    if (text) {
      text.text = props.text || "Double-click to edit";
      text.alpha = props.text ? 1 : 0.4;
      text.style.wordWrapWidth = data.position.width - 20;
    }

    if (this.activeEditor) {
      const activeTextArea = this.activeEditor.element as HTMLTextAreaElement;
      activeTextArea.value = props.text;
    }
  }

  onDoubleClick(widget: WidgetContainer): void {
    if (this.activeEditor) return;

    const data = widget.data;

    // Hide the Pixi text while editing
    const pixiText = widget.getChildByLabel("text", true) as Text;
    if (pixiText) pixiText.visible = false;

    const textarea = document.createElement("textarea");
    textarea.value = (data.props.text as string) ?? "";
    Object.assign(textarea.style, {
      width: `${data.position.width}px`,
      height: `${data.position.height}px`,
      fontSize: "16px",
      fontFamily: "Arial",
      padding: "10px",
      border: "none",
      background: "transparent",
      color: "#333333",
      resize: "none",
      outline: "none",
      boxSizing: "border-box",
      overflow: "hidden",
      lineHeight: "normal",
    });

    const domContainer = new DOMContainer({ element: textarea });
    domContainer.label = "text-editor";

    widget.addChild(domContainer);
    this.activeEditor = domContainer;
    requestAnimationFrame(() => {
      textarea.focus();
    });

    textarea.addEventListener("input", () => {
      this.docHandle.change((doc) => {
        updateText(doc, [...this.widgetPath, "props", "text"], textarea.value);
      });
    });

    const close = () => {
      if (pixiText) pixiText.visible = true;
      domContainer.destroy();
      this.activeEditor = null;
    };

    textarea.addEventListener("blur", close);
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Escape") textarea.blur();
    });
  }

  drawBg(g: Graphics, w: number, h: number, color: string): void {
    const fillColor = POST_IT_COLORS[color] ?? POST_IT_COLORS[DEFAULT_COLOR];
    const borderRadius = 4;
    g.clear();
    g.roundRect(0, 0, w, h, borderRadius);
    g.fill(fillColor);
  }
}

export const postItDescriptor: WidgetDescriptor<PostItProps> = {
  type: "post-it",
  displayName: "Post-it",
  canResize: true,
  canRotate: true,
  minWidth: 100,
  minHeight: 80,
  defaultWidth: 200,
  defaultHeight: 200,
  defaultProps: { text: "", color: DEFAULT_COLOR },
  create: (handle, path) => new PostItWidget(handle, path),
};

export function registerPostItWidget(): void {
  registerWidget(postItDescriptor);
}

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule) {
      registerWidget(newModule.postItDescriptor);
    }
  });
}
