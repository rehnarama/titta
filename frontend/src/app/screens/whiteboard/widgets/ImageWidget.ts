import { Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import type { WidgetData } from "../WhiteboardData";
import { Widget, type WidgetDescriptor } from "./WidgetTypes";
import { registerWidget } from "./WidgetRegistry";

interface ImageProps {
  src: string;
}

export class ImageWidget extends Widget<ImageProps> {
  createContent(data: WidgetData<ImageProps>): Container {
    const container = new Container();

    const bg = new Graphics();
    bg.label = "bg";
    drawImageBg(bg, data.position.width, data.position.height);
    container.addChild(bg);

    const sprite = new Sprite();
    sprite.label = "image";
    container.addChild(sprite);

    const props = data.props;
    if (props.src) {
      loadImage(sprite, props.src, data.position.width, data.position.height);
    } else {
      drawPlaceholder(bg, data.position.width, data.position.height);
    }

    return container;
  }

  updateContent(content: Container, data: WidgetData<ImageProps>): void {
    const bg = content.getChildByLabel("bg") as Graphics;
    const props = data.props;
    if (bg) {
      drawImageBg(bg, data.position.width, data.position.height);
      if (!props.src) {
        drawPlaceholder(bg, data.position.width, data.position.height);
      }
    }

    const sprite = content.getChildByLabel("image") as Sprite;
    if (sprite && props.src) {
      loadImage(sprite, props.src, data.position.width, data.position.height);
    }
  }
}

function drawImageBg(g: Graphics, w: number, h: number): void {
  g.clear();
  g.roundRect(0, 0, w, h, 4);
  g.fill(0xf5f5f5);
  g.stroke({ color: 0xdddddd, width: 1 });
}

function drawPlaceholder(g: Graphics, w: number, h: number): void {
  const iconSize = Math.min(w, h) * 0.3;
  const cx = w / 2;
  const cy = h / 2;

  // Simple mountain/image icon
  g.rect(cx - iconSize / 2, cy - iconSize / 2, iconSize, iconSize);
  g.stroke({ color: 0xcccccc, width: 2 });

  g.moveTo(cx - iconSize / 3, cy + iconSize / 4);
  g.lineTo(cx, cy - iconSize / 6);
  g.lineTo(cx + iconSize / 3, cy + iconSize / 4);
  g.stroke({ color: 0xcccccc, width: 2 });
}

async function loadImage(
  sprite: Sprite,
  src: string,
  maxW: number,
  maxH: number,
): Promise<void> {
  try {
    const texture = await Assets.load<Texture>(src);
    sprite.texture = texture;
    const scale = Math.min(maxW / texture.width, maxH / texture.height);
    sprite.scale.set(scale);
    sprite.position.set(
      (maxW - texture.width * scale) / 2,
      (maxH - texture.height * scale) / 2,
    );
  } catch {
    console.warn(`Failed to load image: ${src}`);
  }
}

export const imageDescriptor: WidgetDescriptor<ImageProps> = {
  type: "image",
  displayName: "Image",
  canResize: true,
  canRotate: true,
  minWidth: 50,
  minHeight: 50,
  defaultWidth: 300,
  defaultHeight: 200,
  defaultProps: { src: "" },
  create: () => new ImageWidget(),
};

export function registerImageWidget(): void {
  registerWidget(imageDescriptor);
}

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule) {
      registerWidget(newModule.imageDescriptor);
    }
  });
}
