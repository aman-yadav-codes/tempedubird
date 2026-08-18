import { ImageIcon } from "lucide-react";

import { useToolbarContext } from "@/components/editor/context/toolbar-context";
import { InsertImageDialog } from "@/components/editor/extensions/images-extension";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function InsertImage() {
  const { activeEditor, showModal } = useToolbarContext();

  return (
    <DropdownMenuItem
      onClick={() => {
        const restoreEditorState = activeEditor.getEditorState();
        showModal("Insert Image", (onClose) => (
          <InsertImageDialog
            activeEditor={activeEditor}
            restoreEditorState={restoreEditorState}
            onClose={onClose}
          />
        ));
      }}
    >
      <div className="flex items-center gap-1">
        <ImageIcon className="size-4" />
        <span>Image</span>
      </div>
    </DropdownMenuItem>
  );
}
