'use client';

import React, { useState } from 'react';
import { CategoryTree } from '@/components/shared/category-tree';
import { CategoryTreeNode } from '@/lib/types/category';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';

const buildBreadcrumb = (
    node: CategoryTreeNode
) => {
    const breadcrumbParts: string[] = [];

    if (node.depth === 1) {
        breadcrumbParts.push(node.name);
    } else if (node.depth === 2) {
        breadcrumbParts.push(
            node.parentName || '',
            node.name
        );
    } else if (node.type === 'board') {
        breadcrumbParts.push(
            node.rootName || '',
            node.parentName || '',
            node.name
        );
    } else if (node.type === 'subject') {
        breadcrumbParts.push(
            node.rootName || '',
            node.parentName || '',
            node.boardName || '',
            node.name
        );
    }

    return breadcrumbParts
        .filter(Boolean)
        .join(' -> ');
};

const SelectedNodeDetails = ({
    selectedNode,
}: {
    selectedNode: CategoryTreeNode | null;
}) => {
    if (!selectedNode) {
        return (
            <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                    No category selected
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <label className="text-sm font-medium text-muted-foreground">
                    Name
                </label>
                <p className="text-base font-semibold">
                    {selectedNode.name}
                </p>
            </div>

            <div>
                <label className="text-sm font-medium text-muted-foreground">
                    Type
                </label>
                <p className="text-sm text-muted-foreground capitalize">
                    {selectedNode.type}
                </p>
            </div>

            {selectedNode.slug && (
                <div>
                    <label className="text-sm font-medium text-muted-foreground">
                        Slug
                    </label>
                    <p className="text-sm text-muted-foreground break-all">
                        {selectedNode.slug}
                    </p>
                </div>
            )}

            <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                    Breadcrumb
                </div>

                <div className="text-xs wrap-break-word text-foreground">
                    {selectedNode.breadcrumb || '-'}
                </div>
            </div>

            <div>
                <label className="text-sm font-medium text-muted-foreground">
                    Hierarchy Level
                </label>
                <Badge variant="outline" className="mt-2">
                    Level {selectedNode.depth}
                </Badge>
            </div>

            <div>
                <label className="text-sm font-medium text-muted-foreground">
                    Status
                </label>
                <div className="mt-2">
                    {selectedNode.is_active ? (
                        <Badge variant="default">Active</Badge>
                    ) : (
                        <Badge variant="secondary">
                            Inactive
                        </Badge>
                    )}
                </div>
            </div>

            <div>
                <label className="text-sm font-medium text-muted-foreground">
                    ID
                </label>
                <p className="text-sm text-muted-foreground">
                    {selectedNode.id}
                </p>
            </div>

            {selectedNode.parent_id != null && (
                <div>
                    <label className="text-sm font-medium text-muted-foreground">
                        Parent
                    </label>
                    <p className="text-sm text-muted-foreground">
                        {selectedNode.parentName
                            ? `${selectedNode.parentName} (ID: ${selectedNode.parent_id})`
                            : `ID: ${selectedNode.parent_id}`}
                    </p>
                </div>
            )}

            {(selectedNode.categoryId || selectedNode.boardId) && (
                <div className="grid gap-2 sm:grid-cols-2">
                    {selectedNode.categoryId && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Category ID
                            </label>
                            <p className="text-sm text-muted-foreground">
                                {selectedNode.categoryId}
                            </p>
                        </div>
                    )}

                    {selectedNode.boardId && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Board ID
                            </label>
                            <p className="text-sm text-muted-foreground">
                                {selectedNode.boardId}
                            </p>
                        </div>
                    )}
                </div>
            )}

            <div>
                <label className="text-sm font-medium text-muted-foreground">
                    Created At
                </label>
                <p className="text-sm text-muted-foreground">
                    {new Date(
                        selectedNode.created_at
                    ).toLocaleDateString()}
                </p>
            </div>
        </div>
    );
};

const TreePage = () => {
    const [selectedNode, setSelectedNode] =
        useState<CategoryTreeNode | null>(null);
    const [isDetailsSheetOpen, setIsDetailsSheetOpen] =
        useState(false);

    const handleSelectNode = (
        node: CategoryTreeNode
    ) => {
        setSelectedNode({
            ...node,
            breadcrumb:
                node.breadcrumb || buildBreadcrumb(node),
        });
        setIsDetailsSheetOpen(true);
    };

    return (
        <div className="space-y-5 w-full max-w-full sm:space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Category Tree
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                    Manage and browse the category hierarchy
                </p>
            </div>

            <Card className="gap-4 py-4 sm:gap-6 sm:py-6">
                <CardHeader className="px-4 sm:px-6">
                    <CardTitle>Categories</CardTitle>
                    <CardDescription className="leading-relaxed">
                        Click on a category to expand and view its children
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                    <CategoryTree
                        onSelectNode={handleSelectNode}
                    />
                </CardContent>
            </Card>

            <Sheet
                open={isDetailsSheetOpen}
                onOpenChange={setIsDetailsSheetOpen}
            >
                <SheetContent
                    side="right"
                    className="overflow-y-auto p-0 data-[side=right]:w-[min(100vw,28rem)] data-[side=right]:sm:max-w-md"
                >
                    <SheetHeader className="pr-12">
                        <SheetTitle>Details</SheetTitle>
                        <SheetDescription>
                            Selected category information
                        </SheetDescription>
                    </SheetHeader>

                    <div className="px-4 pb-4">
                        <SelectedNodeDetails
                            selectedNode={selectedNode}
                        />
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default TreePage;
