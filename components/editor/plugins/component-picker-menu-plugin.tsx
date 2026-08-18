import {
  type JSX,
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useBasicTypeaheadTriggerMatch } from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { LexicalTypeaheadMenuPlugin } from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { TextNode } from "lexical";

import { useEditorModal } from "@/components/editor/editor-hooks/use-modal";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

import { ComponentPickerOption } from "./picker/component-picker-option";

// const LexicalTypeaheadMenuPlugin = lazy(
//   () =>
//     import("@lexical/react/LexicalTypeaheadMenuPlugin").then(
//       (mod) => mod.LexicalTypeaheadMenuPlugin<ComponentPickerOption>
//     ),
// )

function ComponentPickerMenu({
  options,
  selectedIndex,
  selectOptionAndCleanUp,
  setHighlightedIndex,
  style,
}: {
  options: Array<ComponentPickerOption>;
  selectedIndex: number | null;
  selectOptionAndCleanUp: (option: ComponentPickerOption) => void;
  setHighlightedIndex: (index: number) => void;
  style?: CSSProperties;
}) {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (
      hoveredIndex === null &&
      selectedIndex !== null &&
      itemRefs.current[selectedIndex]
    ) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "auto",
      });
    }
  }, [hoveredIndex, selectedIndex]);

  return (
    <div
      className="editor-context-menu fixed h-min min-w-56 rounded-md border bg-popover text-popover-foreground shadow-lg"
      style={style}
      onWheel={(event) => event.stopPropagation()}
    >
      <Command
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex(
              selectedIndex !== null
                ? (selectedIndex - 1 + options.length) % options.length
                : options.length - 1,
            );
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex(
              selectedIndex !== null ? (selectedIndex + 1) % options.length : 0,
            );
          }
        }}
      >
        <CommandList className="max-h-72 w-56 overflow-y-auto">
          <CommandGroup>
            {options.map((option, index) => (
              <CommandItem
                key={option.key}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                value={option.title}
                onPointerEnter={() => {
                  setHoveredIndex(index);
                  setHighlightedIndex(index);
                }}
                onPointerLeave={() => setHoveredIndex(null)}
                onSelect={() => {
                  selectOptionAndCleanUp(option);
                }}
                className={cn(
                  "editor-command-menu-item flex items-center gap-2 border-l-2 border-transparent transition-colors",
                  hoveredIndex === index || selectedIndex === index
                    ? "is-active border-red-400 bg-red-500/25 text-white"
                    : "",
                )}
                style={
                  hoveredIndex === index || selectedIndex === index
                    ? {
                        backgroundColor: "rgb(239 68 68 / 0.35)",
                        borderLeftColor: "rgb(248 113 113)",
                        color: "#fff",
                        cursor: "pointer",
                      }
                    : { cursor: "pointer" }
                }
              >
                {option.icon}
                {option.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}

export function ComponentPickerMenuPlugin({
  baseOptions = [],
  dynamicOptionsFn,
}: {
  baseOptions?: Array<ComponentPickerOption>;
  dynamicOptionsFn?: ({
    queryString,
  }: {
    queryString: string;
  }) => Array<ComponentPickerOption>;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [modal, showModal] = useEditorModal();
  const [queryString, setQueryString] = useState<string | null>(null);

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch("/", {
    minLength: 0,
  });

  const options = useMemo(() => {
    if (!queryString) {
      return baseOptions;
    }

    const regex = new RegExp(queryString, "i");

    return [
      ...(dynamicOptionsFn?.({ queryString }) || []),
      ...baseOptions.filter(
        (option) =>
          regex.test(option.title) ||
          option.keywords.some((keyword) => regex.test(keyword)),
      ),
    ];
  }, [baseOptions, dynamicOptionsFn, queryString]);

  const onSelectOption = useCallback(
    (
      selectedOption: ComponentPickerOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
      matchingString: string,
    ) => {
      editor.update(() => {
        nodeToRemove?.remove();
        selectedOption.onSelect(matchingString, editor, showModal);
        closeMenu();
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor],
  );

  return (
    <>
      {modal}
      <LexicalTypeaheadMenuPlugin
        onQueryChange={setQueryString}
        onSelectOption={onSelectOption}
        triggerFn={checkForTriggerMatch}
        options={options}
        menuRenderFn={(
          anchorElementRef,
          { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
        ) => {
          const anchorElement = anchorElementRef.current;
          const rect = anchorElement?.getBoundingClientRect();

          return anchorElementRef.current && options.length
            ? createPortal(
                <ComponentPickerMenu
                  options={options}
                  selectedIndex={selectedIndex}
                  selectOptionAndCleanUp={selectOptionAndCleanUp}
                  setHighlightedIndex={setHighlightedIndex}
                  style={rect ? { left: rect.left, top: rect.bottom + 6 } : undefined}
                />,
                document.body,
              )
            : null;
        }}
      />
    </>
  );
}
