import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  NodeContextMenuOption,
  NodeContextMenuSeparator,
} from "@lexical/react/LexicalNodeContextMenuPlugin";
import {
  $createNodeSelection,
  $getSelection,
  $getNearestNodeFromDOMNode,
  $getRoot,
  $isDecoratorNode,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $setSelection,
  COPY_COMMAND,
  CUT_COMMAND,
  type LexicalNode,
  PASTE_COMMAND,
} from "lexical";

import {
  Clipboard,
  ClipboardType,
  Copy,
  Link2Off,
  Scissors,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { $isImageNode } from "@/components/editor/nodes/image-node";
import { useAuthStore } from "@/store";

type ContextMenuItem =
  | NodeContextMenuOption
  | NodeContextMenuSeparator;

type ContextMenuState = {
  x: number;
  y: number;
  items: ContextMenuItem[];
} | null;

function isMenuOption(item: ContextMenuItem): item is NodeContextMenuOption {
  return item.type === "item";
}

async function srcToPngBlob(src: string): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";

  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Unable to load image for copy."));
  });

  image.src = src;
  await loaded;

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to prepare image for copy.");
  }

  context.drawImage(image, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Unable to convert image for copy."));
      }
    }, "image/png");
  });
}

async function copyImageToClipboard(src: string) {
  try {
    if ("ClipboardItem" in window && navigator.clipboard.write) {
      const blob = await srcToPngBlob(src);
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);
      return;
    }
  } catch {
    // Fall back to copying the source URL/data when bitmap copying is blocked.
  }

  await navigator.clipboard.writeText(src);
}

type CloudinaryAsset = {
  publicId: string;
  resourceType: string;
};

function parseCloudinaryTitle(value: unknown): CloudinaryAsset | null {
  if (typeof value !== "string" || !value.trim().startsWith("{")) return null;
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed?.publicId !== "string") return null;
    return {
      publicId: parsed.publicId,
      resourceType: typeof parsed.resourceType === "string" ? parsed.resourceType : "raw",
    };
  } catch {
    return null;
  }
}

function cloudinaryAssetFromUrl(value: unknown): CloudinaryAsset | null {
  if (typeof value !== "string" || !value.includes("res.cloudinary.com")) return null;
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const uploadIndex = parts.findIndex((part) => part === "upload");
    const resourceType = parts[0] || "image";
    if (uploadIndex < 0) return null;
    const publicParts = parts.slice(uploadIndex + 1).filter((part) => !/^v\d+$/.test(part));
    const publicId = publicParts.join("/").replace(/\.[^.]+$/, "");
    return publicId ? { publicId, resourceType } : null;
  } catch {
    return null;
  }
}

function collectCloudinaryAssets(node: LexicalNode, found = new Map<string, CloudinaryAsset>()) {
  let asset: CloudinaryAsset | null = null;

  if ($isImageNode(node)) {
    const publicId = node.getPublicId();
    asset = publicId
      ? { publicId, resourceType: node.getResourceType() || "image" }
      : cloudinaryAssetFromUrl(node.getSrc());
  } else if ($isLinkNode(node)) {
    const linkNode = node as unknown as {
      getTitle?: () => string | null;
      getURL?: () => string;
      __title?: string | null;
      __url?: string;
    };
    asset =
      parseCloudinaryTitle(linkNode.getTitle?.() ?? linkNode.__title) ??
      cloudinaryAssetFromUrl(linkNode.getURL?.() ?? linkNode.__url);
  }

  if (asset?.publicId) {
    found.set(`${asset.resourceType}:${asset.publicId}`, asset);
  }

  if ($isElementNode(node)) {
    node.getChildren().forEach((child) => collectCloudinaryAssets(child, found));
  }

  return found;
}

async function deleteCloudinaryAssets(assets: CloudinaryAsset[]) {
  if (!assets.length) return;
  const accessToken = useAuthStore.getState().accessToken;
  if (!accessToken) return;

  const results = await Promise.allSettled(
    assets.map((asset) =>
      fetch("/api/admin/uploads/documents/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publicId: asset.publicId,
          resourceType: asset.resourceType,
        }),
      }),
    ),
  );
  const failed = results.some((result) => result.status === "rejected");
  if (failed) {
    toast.error("Removed from note, but Cloudinary cleanup failed");
  } else {
    toast.success("Deleted from note and Cloudinary");
  }
}

export function ContextMenuPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [menu, setMenu] = useState<ContextMenuState>(null);

  const items = useMemo(() => {
    return [
      new NodeContextMenuOption(`Remove Link`, {
        $onSelect: () => {
          editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        },
        $showOn: (node: LexicalNode) => $isLinkNode(node.getParent()),
        disabled: false,
        icon: <Link2Off className="size-4" />,
      }),
      new NodeContextMenuSeparator({
        $showOn: (node: LexicalNode) => $isLinkNode(node.getParent()),
      }),
      new NodeContextMenuOption(`Cut`, {
        $onSelect: () => {
          editor.dispatchCommand(CUT_COMMAND, null);
        },
        disabled: false,
        icon: <Scissors className="size-4" />,
      }),
      new NodeContextMenuOption(`Copy`, {
        $onSelect: () => {
          const selection = $getSelection();
          if ($isNodeSelection(selection)) {
            const imageNode = selection.getNodes().find($isImageNode);
            if (imageNode) {
              void copyImageToClipboard(imageNode.getSrc());
              return;
            }
          }

          editor.dispatchCommand(COPY_COMMAND, null);
        },
        disabled: false,
        icon: <Copy className="size-4" />,
      }),
      new NodeContextMenuOption(`Paste`, {
        $onSelect: () => {
          navigator.clipboard.read().then(async function () {
            const data = new DataTransfer();

            const readClipboardItems = await navigator.clipboard.read();
            const item = readClipboardItems[0];

            const permission = await navigator.permissions.query({
              // @ts-expect-error These types are incorrect.
              name: "clipboard-read",
            });
            if (permission.state === "denied") {
              alert("Not allowed to paste from clipboard.");
              return;
            }

            for (const type of item.types) {
              const dataString = await (await item.getType(type)).text();
              data.setData(type, dataString);
            }

            const event = new ClipboardEvent("paste", {
              clipboardData: data,
            });

            editor.dispatchCommand(PASTE_COMMAND, event);
          });
        },
        disabled: false,
        icon: <Clipboard className="size-4" />,
      }),
      new NodeContextMenuOption(`Paste as Plain Text`, {
        $onSelect: () => {
          navigator.clipboard.read().then(async function () {
            const permission = await navigator.permissions.query({
              // @ts-expect-error These types are incorrect.
              name: "clipboard-read",
            });

            if (permission.state === "denied") {
              alert("Not allowed to paste from clipboard.");
              return;
            }

            const data = new DataTransfer();
            const clipboardText = await navigator.clipboard.readText();
            data.setData("text/plain", clipboardText);

            const event = new ClipboardEvent("paste", {
              clipboardData: data,
            });
            editor.dispatchCommand(PASTE_COMMAND, event);
          });
        },
        disabled: false,
        icon: <ClipboardType className="size-4" />,
      }),
      new NodeContextMenuSeparator(),
      new NodeContextMenuOption(`Delete Node`, {
        $onSelect: () => {
          const selection = $getSelection();
          const assets = new Map<string, CloudinaryAsset>();
          if ($isRangeSelection(selection)) {
            const currentNode = selection.anchor.getNode();
            const ancestorNodeWithRootAsParent = currentNode
              .getParents()
              .at(-2);

            if (ancestorNodeWithRootAsParent) {
              collectCloudinaryAssets(ancestorNodeWithRootAsParent, assets);
              ancestorNodeWithRootAsParent.remove();
            }
          } else if ($isNodeSelection(selection)) {
            const selectedNodes = selection.getNodes();
            selectedNodes.forEach((node) => {
              if ($isDecoratorNode(node)) {
                collectCloudinaryAssets(node, assets);
                node.remove();
              }
            });
          }
          void deleteCloudinaryAssets(Array.from(assets.values()));
        },
        disabled: false,
        icon: <Trash2 className="size-4" />,
      }),
    ];
  }, [editor]);

  useEffect(() => {
    return editor.registerRootListener((rootElement) => {
      if (!rootElement) return;

      const handleContextMenu = (event: MouseEvent) => {
        event.preventDefault();

        let visibleItems: ContextMenuItem[] = [];
        let clickedImageKey: string | null = null;

        editor.read(() => {
          const target = event.target;
          const node =
            target instanceof Node
              ? $getNearestNodeFromDOMNode(target)
              : $getRoot();

          if ($isImageNode(node)) {
            clickedImageKey = node.getKey();
          }

          visibleItems = items.filter((item) =>
            item.$showOn ? item.$showOn(node ?? $getRoot()) : true,
          );
        });

        setMenu({
          x: event.clientX,
          y: event.clientY,
          items: visibleItems,
        });

        if (clickedImageKey) {
          editor.update(() => {
            const selection = $createNodeSelection();
            selection.add(clickedImageKey);
            $setSelection(selection);
          });
        }
      };

      rootElement.addEventListener("contextmenu", handleContextMenu);

      return () => {
        rootElement.removeEventListener("contextmenu", handleContextMenu);
      };
    });
  }, [editor, items]);

  useEffect(() => {
    if (!menu) return;

    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("keydown", close);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);

    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  return (
    <>
      {menu
        ? createPortal(
            <div
              role="menu"
              className="editor-context-menu fixed min-w-44 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg outline-none"
              style={{ left: menu.x, top: menu.y }}
              onContextMenu={(event) => event.preventDefault()}
              onMouseDown={(event) => event.stopPropagation()}
            >
              {menu.items.map((item, index) =>
                isMenuOption(item) ? (
                  <button
                    key={`${item.key}-${index}`}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm border-l-2 border-transparent px-2 py-1.5 text-left text-sm outline-hidden transition-colors hover:border-red-400 hover:bg-red-500/25 hover:text-white focus:border-red-400 focus:bg-red-500/25 focus:text-white disabled:pointer-events-none disabled:opacity-50"
                    onClick={(event) => {
                      event.stopPropagation();
                      editor.update(() => item.$onSelect());
                      setMenu(null);
                    }}
                  >
                    {item.icon}
                    {item.title}
                  </button>
                ) : (
                  <div key={`${item.key}-${index}`} className="-mx-1 my-1 h-px bg-border" />
                ),
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
