'use client';

import React, { useState } from 'react';
import {
  ChevronRight,
  Loader2,
  Folder,
  FolderOpen
} from 'lucide-react';

import { CategoryTreeNode } from '@/lib/types/category';
import { cn } from '@/lib/utils';

interface TreeNodeProps {
  node: CategoryTreeNode;

  onExpandNode: (
    node: CategoryTreeNode
  ) => Promise<void>;

  level?: number;

  onSelectNode?: (
    node: CategoryTreeNode
  ) => void;

  expandedIds: Set<string>;

  toggleExpanded: (
    node: CategoryTreeNode
  ) => void;

  activeNodeKey?: string | null;

  registerNode?: (
    key: string,
    element: HTMLDivElement | null
  ) => void;
}

export const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  onExpandNode,
  level = 0,
  onSelectNode,
  expandedIds,
  toggleExpanded,
  activeNodeKey,
  registerNode,
}) => {

  const [isLoading, setIsLoading] =
    useState(false);

  const hasChildren =
    node.hasChildren ||
    node.children.length > 0;

  const isExpanded =
    expandedIds.has(
      `${node.type}` +
      `-${node.id}` +
      `-${node.categoryId || 0}` +
      `-${node.boardId || 0}`
    );

  const nodeKey =
    `${node.type}` +
    `-${node.id}` +
    `-${node.categoryId || 0}` +
    `-${node.boardId || 0}`;

  const isActive =
    activeNodeKey === nodeKey;

  const indent =
    `clamp(${level * 7 + 4}px, ` +
    `${level * 2.25 + 1.5}vw, ` +
    `${level * 16 + 8}px)`;

  const handleToggle = async () => {

    if (
      !isExpanded &&
      hasChildren &&
      node.children.length === 0
    ) {
      setIsLoading(true);

      try {
        await onExpandNode(node);
      } finally {
        setIsLoading(false);
      }
    }

    toggleExpanded(node);
  };

  return (
    <div>

      <div
        ref={(element) =>
          registerNode?.(nodeKey, element)
        }
        data-tree-node-key={nodeKey}
        className={cn(
          "grid grid-cols-[1.5rem_1.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md py-2.5 pr-2 hover:bg-destructive/10 hover:text-destructive cursor-pointer transition-colors sm:flex sm:gap-2 sm:py-2 sm:px-2",
          isActive &&
          "bg-destructive/15 text-destructive ring-1 ring-destructive/30"
        )}
        style={{
          paddingLeft: indent
        }}
      >

        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted sm:h-5 sm:w-5"
            disabled={isLoading}
          >

            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronRight
                className={`h-4 w-4 transition-transform ${isExpanded
                  ? 'rotate-90'
                  : ''
                  }`}
              />
            )}

          </button>
        ) : (
          <div className="h-6 w-6 sm:h-5 sm:w-5" />
        )}

        <div className="flex h-6 w-6 items-center justify-center sm:h-5 sm:w-5">

          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-destructive" />
          ) : (
            <Folder className="h-4 w-4 text-destructive" />
          )}

        </div>

        <div
          className="min-w-0 text-sm font-medium leading-snug text-foreground transition-colors wrap-break-word hover:text-destructive sm:flex-1 sm:leading-normal"
          onClick={() =>
            onSelectNode?.(node)
          }
        >
          {node.name}
        </div>

        <div className="shrink-0 rounded bg-muted px-1.5 py-1 text-[11px] leading-none text-muted-foreground sm:px-2 sm:text-xs">
          <span className="sm:hidden">
            L{node.depth}
          </span>
          <span className="hidden sm:inline">
            Level {node.depth}
          </span>
        </div>

      </div>

      {isExpanded && hasChildren && (
        <div className="ml-4 border-l border-border/60 pl-3">

          {node.children.map((child) => (
            <TreeNode
              key={
                `${child.type}` +
                `-${child.id}` +
                `-${child.categoryId || 0}` +
                `-${child.boardId || 0}`
              }
              node={child}
              onExpandNode={onExpandNode}
              level={level + 1}
              onSelectNode={onSelectNode}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              activeNodeKey={activeNodeKey}
              registerNode={registerNode}
            />
          ))}

        </div>
      )}

    </div>
  );
};
