"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { SerializedEditorState } from "lexical";
import { BlockViewerProvider } from "./block-viewer-provider";
import { cn } from "@/lib/utils";

// Lazily load the actual Lexical editor component to prevent SSR "document is not defined" issues
const EditorX = dynamic(
  () => import("./editor-x").then((mod) => mod.Editor),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[450px] flex items-center justify-center border rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
          <p className="text-xs text-zinc-400">Loading editor canvas...</p>
        </div>
      </div>
    ),
  }
);

interface RichTextEditorProps {
  /**
   * The default/initial serialized editor state (JSON).
   */
  defaultValue?: SerializedEditorState;
  /**
   * Callback triggered when the editor contents change.
   * Receives the new serialized Lexical editor state (JSON).
   */
  onChange?: (serializedState: SerializedEditorState) => void;
  /**
   * Placeholder text shown when the canvas is empty.
   */
  placeholder?: string;
  /**
   * Maximum characters allowed.
   */
  maxLength?: number;
  /**
   * Hide the read-only toggle and keep the editor writable.
   */
  alwaysEditable?: boolean;
  /**
   * Additional className applied to the outer wrapper container.
   */
  className?: string;
}

/**
 * Reusable Rich Text Editor Component.
 * Automatically wraps the Lexical editor with block/plugin context and handles SSR safety.
 */
export function RichTextEditor({
  defaultValue,
  onChange,
  placeholder,
  maxLength,
  alwaysEditable = false,
  className,
}: RichTextEditorProps) {
  return (
    <BlockViewerProvider
      footerOverrides={alwaysEditable ? { treeView: false, viewOnly: false } : undefined}
    >
      <div className={cn("flex h-full min-h-0 w-full min-w-0 max-w-full overflow-hidden", className)}>
        <EditorX
          editorSerializedState={defaultValue}
          onSerializedChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          alwaysEditable={alwaysEditable}
        />
      </div>
    </BlockViewerProvider>
  );
}

export default RichTextEditor;
