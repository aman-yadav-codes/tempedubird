import type { JSX } from "react";
import * as React from "react";

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  LexicalUpdateJSON,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";

const ImageComponent = React.lazy(() => import("../editor-ui/image-component"));

export interface ImagePayload {
  altText: string;
  height?: number;
  key?: NodeKey;
  maxWidth?: number;
  publicId?: string;
  resourceType?: string;
  src: string;
  width?: number;
}

function isGoogleDocCheckboxImg(img: HTMLImageElement): boolean {
  return (
    img.parentElement != null &&
    img.parentElement.tagName === "LI" &&
    img.previousSibling === null &&
    img.getAttribute("aria-roledescription") === "checkbox"
  );
}

function $convertImageElement(domNode: Node): null | DOMConversionOutput {
  const img = domNode as HTMLImageElement;
  const src = img.getAttribute("src");
  if (!src || src.startsWith("file:///") || isGoogleDocCheckboxImg(img)) {
    return null;
  }
  const { alt: altText, width, height } = img;
  const node = $createImageNode({ altText, height, src, width });
  return { node };
}

export type SerializedImageNode = Spread<
  {
    altText: string;
    height?: number;
    maxWidth: number;
    publicId?: string;
    resourceType?: string;
    src: string;
    width?: number;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __width: "inherit" | number;
  __height: "inherit" | number;
  __maxWidth: number;
  __publicId: string;
  __resourceType: string;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__maxWidth,
      node.__width,
      node.__height,
      node.__publicId,
      node.__resourceType,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, width, maxWidth, publicId, resourceType, src } = serializedNode;
    return $createImageNode({
      altText,
      height: height && height > 0 ? height : undefined,
      maxWidth,
      publicId,
      resourceType,
      src,
      width: width && width > 0 ? width : undefined,
    }).updateFromJSON(serializedNode);
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedImageNode>): this {
    const node = super.updateFromJSON(serializedNode);

    return node;
  }

  exportDOM(): DOMExportOutput {
    const imgElement = document.createElement("img");
    imgElement.setAttribute("src", this.__src);
    imgElement.setAttribute("alt", this.__altText);
    imgElement.setAttribute("width", this.__width.toString());
    imgElement.setAttribute("height", this.__height.toString());

    return { element: imgElement };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: $convertImageElement,
        priority: 0,
      }),
    };
  }

  constructor(
    src: string,
    altText: string,
    maxWidth: number,
    width?: "inherit" | number,
    height?: "inherit" | number,
    publicId?: string,
    resourceType?: string,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__maxWidth = maxWidth;
    this.__width = width || "inherit";
    this.__height = height || "inherit";
    this.__publicId = publicId || "";
    this.__resourceType = resourceType || "image";
  }

  exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      altText: this.getAltText(),
      height: this.__height === "inherit" ? undefined : this.__height,
      maxWidth: this.__maxWidth,
      publicId: this.__publicId || undefined,
      resourceType: this.__resourceType || undefined,
      src: this.getSrc(),
      width: this.__width === "inherit" ? undefined : this.__width,
    };
  }

  setWidthAndHeight(
    width: "inherit" | number,
    height: "inherit" | number,
  ): this {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
    return writable;
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement("span");
    const theme = config.theme;
    const className = theme.image;
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM(): false {
    return false;
  }

  getSrc(): string {
    return this.getLatest().__src;
  }

  getAltText(): string {
    return this.getLatest().__altText;
  }

  getPublicId(): string {
    return this.getLatest().__publicId;
  }

  getResourceType(): string {
    return this.getLatest().__resourceType;
  }

  decorate(): JSX.Element {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        width={this.__width}
        height={this.__height}
        maxWidth={this.__maxWidth}
        nodeKey={this.getKey()}
      />
    );
  }
}

export function $createImageNode({
  altText,
  height,
  maxWidth = 500,
  publicId,
  resourceType,
  src,
  width,
  key,
}: ImagePayload): ImageNode {
  return $applyNodeReplacement(
    new ImageNode(src, altText, maxWidth, width, height, publicId, resourceType, key),
  );
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}
