import { DRAG_DROP_PASTE } from "@lexical/rich-text";
import { COMMAND_PRIORITY_LOW, defineExtension } from "lexical";
import { toast } from "sonner";

import {
  INSERT_FILE_COMMAND,
  INSERT_IMAGE_COMMAND,
  uploadEditorAsset,
} from "@/components/editor/extensions/images-extension";

const ACCEPTABLE_FILE_TYPES = [
  "image/",
  "video/",
  "image/heic",
  "image/heif",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/plain",
];

function isSupportedFile(file: File) {
  return ACCEPTABLE_FILE_TYPES.some((type) =>
    type.endsWith("/") ? file.type.startsWith(type) : file.type === type,
  );
}

export const DragDropPasteExtension = defineExtension({
  name: "@shadcn-editor/DragDropPaste",
  register: (editor) =>
    editor.registerCommand(
      DRAG_DROP_PASTE,
      (files) => {
        (async () => {
          for (const file of files) {
            if (!isSupportedFile(file)) continue;
            try {
              const uploaded = await uploadEditorAsset(file);
              if (uploaded.mediaType === "image") {
                editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
                  altText: uploaded.fileName || file.name,
                  publicId: uploaded.publicId,
                  resourceType: uploaded.resourceType,
                  src: uploaded.url,
                });
                continue;
              }
              editor.dispatchCommand(INSERT_FILE_COMMAND, {
                fileName: uploaded.fileName || file.name,
                publicId: uploaded.publicId,
                resourceType: uploaded.resourceType,
                url: uploaded.url,
              });
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "File upload failed");
            }
          }
        })();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    ),
});
