import { type JSX, useEffect, useRef, useState } from "react";

import {
  $isAutoLinkNode,
  $isLinkNode,
  type LinkNode,
  TOGGLE_LINK_COMMAND,
} from "@lexical/link";
import { $wrapNodeInElement, mergeRegister } from "@lexical/utils";
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $findMatchingParent,
  $getSelection,
  $insertNodes,
  $isNodeSelection,
  $isRootOrShadowRoot,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  DRAGOVER_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  type LexicalCommand,
  type LexicalEditor,
  type EditorState,
  createCommand,
  defineExtension,
  getDOMSelectionFromTarget,
  isHTMLElement,
} from "lexical";
import { $createLinkNode } from "@lexical/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  $createImageNode,
  $isImageNode,
  ImageNode,
  type ImagePayload,
} from "@/components/editor/nodes/image-node";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store";

export type InsertImagePayload = Readonly<ImagePayload>;
export type InsertFilePayload = Readonly<{
  fileName: string;
  publicId?: string;
  resourceType?: string;
  url: string;
}>;

type UploadedEditorAsset = {
  fileName: string;
  fileType: string;
  mediaType: string;
  publicId: string;
  resourceType: string;
  url: string;
};

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> =
  createCommand("INSERT_IMAGE_COMMAND");
export const INSERT_FILE_COMMAND: LexicalCommand<InsertFilePayload> =
  createCommand("INSERT_FILE_COMMAND");

async function readUploadJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Server returned an invalid upload response" };
  }
}

export async function uploadEditorAsset(file: File): Promise<UploadedEditorAsset> {
  const accessToken = useAuthStore.getState().accessToken;
  if (!accessToken) {
    throw new Error("Session expired. Please log in again.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "notes");

  const res = await fetch("/api/admin/uploads/image", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });
  const json = await readUploadJson(res);

  if (!res.ok) {
    throw new Error(json.error ?? "File upload failed");
  }

  return {
    fileName: json.data?.file_name ?? file.name,
    fileType: json.data?.file_type ?? file.type,
    mediaType: json.data?.media_type ?? "file",
    publicId: json.data?.public_id ?? "",
    resourceType: json.data?.resource_type ?? "raw",
    url: json.data?.url ?? "",
  };
}

export function InsertImageUriDialogBody({
  onClick,
}: {
  onClick: (payload: InsertImagePayload) => void;
}) {
  const [src, setSrc] = useState("");
  const [altText, setAltText] = useState("");

  const isDisabled = src === "";

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="image-url">Image URL</FieldLabel>
        <Input
          id="image-url"
          placeholder="i.e. https://source.unsplash.com/random"
          onChange={(e) => setSrc(e.target.value)}
          value={src}
          data-test-id="image-modal-url-input"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="alt-text">Alt Text</FieldLabel>
        <Input
          id="alt-text"
          placeholder="Random unsplash image"
          onChange={(e) => setAltText(e.target.value)}
          value={altText}
          data-test-id="image-modal-alt-text-input"
        />
      </Field>
      <DialogFooter>
        <Button
          type="submit"
          disabled={isDisabled}
          onClick={() => onClick({ altText, src })}
          data-test-id="image-modal-confirm-btn"
        >
          Confirm
        </Button>
      </DialogFooter>
    </FieldGroup>
  );
}

export function InsertImageUploadedDialogBody({
  onClick,
  onFileClick,
}: {
  onClick: (payload: InsertImagePayload) => void;
  onFileClick: (payload: InsertFilePayload) => void;
}) {
  const [src, setSrc] = useState("");
  const [altText, setAltText] = useState("");
  const [asset, setAsset] = useState<UploadedEditorAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  const isDisabled = uploading || (!src && !asset);

  const loadFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setSrc("");
    setAsset(null);
    try {
      const uploaded = await uploadEditorAsset(file);
      setAsset(uploaded);
      if (uploaded.mediaType === "image") {
        setSrc(uploaded.url);
      }
      if (!altText) {
        setAltText(uploaded.fileName || file.name);
      }
      toast.success("File uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "File upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="image-upload">Image Upload</FieldLabel>
        <Input
          id="image-upload"
          type="file"
          onChange={(e) => void loadFile(e.target.files)}
          accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt"
          data-test-id="image-modal-file-upload"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="alt-text">Alt Text</FieldLabel>
        <Input
          id="alt-text"
          placeholder="Descriptive alternative text"
          onChange={(e) => setAltText(e.target.value)}
          value={altText}
          data-test-id="image-modal-alt-text-input"
        />
      </Field>
      <DialogFooter>
        <Button
          type="submit"
          disabled={isDisabled}
          onClick={() => {
            if (!asset) return;
            if (asset.mediaType === "image") {
              onClick({
                altText,
                publicId: asset.publicId,
                resourceType: asset.resourceType,
                src: asset.url,
              });
              return;
            }
            onFileClick({
              fileName: altText || asset.fileName || "Uploaded file",
              publicId: asset.publicId,
              resourceType: asset.resourceType,
              url: asset.url,
            });
          }}
          data-test-id="image-modal-file-upload-btn"
        >
          {uploading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Confirm
        </Button>
      </DialogFooter>
    </FieldGroup>
  );
}

export function InsertImageDialog({
  activeEditor,
  restoreEditorState,
  onClose,
}: {
  activeEditor: LexicalEditor;
  restoreEditorState?: EditorState;
  onClose: () => void;
}): JSX.Element {
  const hasModifier = useRef(false);

  useEffect(() => {
    hasModifier.current = false;
    const handler = (e: KeyboardEvent) => {
      hasModifier.current = e.altKey;
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
    };
  }, [activeEditor]);

  const onClick = (payload: InsertImagePayload) => {
    if (restoreEditorState) {
      activeEditor.setEditorState(restoreEditorState);
    }
    window.setTimeout(() => {
      activeEditor.focus(() => {
        activeEditor.dispatchCommand(INSERT_IMAGE_COMMAND, payload);
      });
    }, 0);
    onClose();
  };

  const onFileClick = (payload: InsertFilePayload) => {
    if (restoreEditorState) {
      activeEditor.setEditorState(restoreEditorState);
    }
    window.setTimeout(() => {
      activeEditor.focus(() => {
        activeEditor.dispatchCommand(INSERT_FILE_COMMAND, payload);
      });
    }, 0);
    onClose();
  };

  return (
    <Tabs defaultValue="url">
      <TabsList className="w-full">
        <TabsTrigger value="url">URL</TabsTrigger>
        <TabsTrigger value="file">File</TabsTrigger>
      </TabsList>
      <TabsContent value="url">
        <InsertImageUriDialogBody onClick={onClick} />
      </TabsContent>
      <TabsContent value="file">
        <InsertImageUploadedDialogBody onClick={onClick} onFileClick={onFileClick} />
      </TabsContent>
    </Tabs>
  );
}

export const ImagesExtension = defineExtension({
  name: "@shadcn-editor/Images",
  nodes: [ImageNode],
  register: (editor) =>
    mergeRegister(
      editor.registerCommand<InsertImagePayload>(
        INSERT_IMAGE_COMMAND,
        (payload) => {
          const imageNode = $createImageNode(payload);
          $insertNodes([imageNode]);
          if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
            $wrapNodeInElement(imageNode, $createParagraphNode).selectEnd();
          } else {
            imageNode.selectNext();
          }
          toast.success("Image inserted");

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand<InsertFilePayload>(
        INSERT_FILE_COMMAND,
        (payload) => {
          const paragraph = $createParagraphNode();
          const link = $createLinkNode(payload.url, {
            rel: "noopener noreferrer",
            target: "_blank",
            title: payload.publicId
              ? JSON.stringify({
                  publicId: payload.publicId,
                  resourceType: payload.resourceType ?? "raw",
                })
              : undefined,
          });
          link.append($createTextNode(payload.fileName || payload.url));
          paragraph.append(link);
          $insertNodes([paragraph]);
          paragraph.selectEnd();
          toast.success("File inserted");
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand<DragEvent>(
        DRAGSTART_COMMAND,
        (event) => $onDragStart(event),
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand<DragEvent>(
        DRAGOVER_COMMAND,
        (event) => $onDragover(event),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<DragEvent>(
        DROP_COMMAND,
        (event) => $onDrop(event, editor),
        COMMAND_PRIORITY_HIGH,
      ),
    ),
});

const TRANSPARENT_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const img = document.createElement("img");
img.src = TRANSPARENT_IMAGE;

function $onDragStart(event: DragEvent): boolean {
  const node = $getImageNodeInSelection();
  if (!node) {
    return false;
  }
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) {
    return false;
  }
  dataTransfer.setData("text/plain", "_");
  dataTransfer.setDragImage(img, 0, 0);
  dataTransfer.setData(
    "application/x-lexical-drag",
    JSON.stringify({
      data: {
        altText: node.__altText,
        height: node.__height,
        key: node.getKey(),
        maxWidth: node.__maxWidth,
        src: node.__src,
        width: node.__width,
      },
      type: "image",
    }),
  );

  return true;
}

function $onDragover(event: DragEvent): boolean {
  const node = $getImageNodeInSelection();
  if (!node) {
    return false;
  }
  if (!canDropImage(event)) {
    event.preventDefault();
  }
  return false;
}

function $onDrop(event: DragEvent, editor: LexicalEditor): boolean {
  const node = $getImageNodeInSelection();
  if (!node) {
    return false;
  }
  const data = getDragImageData(event);
  if (!data) {
    return false;
  }
  const existingLink = $findMatchingParent(
    node,
    (parent): parent is LinkNode =>
      !$isAutoLinkNode(parent) && $isLinkNode(parent),
  );
  event.preventDefault();
  if (canDropImage(event)) {
    const range = getDragSelection(event);
    node.remove();
    const rangeSelection = $createRangeSelection();
    if (range !== null && range !== undefined) {
      rangeSelection.applyDOMRange(range);
    }
    $setSelection(rangeSelection);
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, data);
    if (existingLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, existingLink.getURL());
    }
  }
  return true;
}

function $getImageNodeInSelection(): ImageNode | null {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) {
    return null;
  }
  const nodes = selection.getNodes();
  const node = nodes[0];
  return $isImageNode(node) ? node : null;
}

function getDragImageData(event: DragEvent): null | InsertImagePayload {
  const dragData = event.dataTransfer?.getData("application/x-lexical-drag");
  if (!dragData) {
    return null;
  }
  const { type, data } = JSON.parse(dragData);
  if (type !== "image") {
    return null;
  }

  return data;
}

declare global {
  interface DragEvent {
    rangeOffset?: number;
    rangeParent?: Node;
  }
}

function canDropImage(event: DragEvent): boolean {
  const target = event.target;
  return !!(
    isHTMLElement(target) &&
    !target.closest("code, span.editor-image") &&
    isHTMLElement(target.parentElement) &&
    target.parentElement.closest("div.ContentEditable__root")
  );
}

function getDragSelection(event: DragEvent): Range | null | undefined {
  let range;
  const domSelection = getDOMSelectionFromTarget(event.target);
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(event.clientX, event.clientY);
  } else if (event.rangeParent && domSelection !== null) {
    domSelection.collapse(event.rangeParent, event.rangeOffset || 0);
    range = domSelection.getRangeAt(0);
  } else {
    throw Error(`Cannot get the selection when dragging`);
  }

  return range;
}
