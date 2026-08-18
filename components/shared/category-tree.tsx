'use client';

import React, {
    useCallback,
    useEffect,
    useRef,
    useState
} from 'react';
import { CategoryTreeNode, Category } from '@/lib/types/category';
import { TreeNode } from './tree-node';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/slices/auth.store';
import { Input } from '@/components/ui/input';
import { getApiErrorMessage, readJsonResponse } from '@/lib/auth/client-permission-errors';

interface CategoryTreeProps {
    onSelectNode?: (node: CategoryTreeNode) => void;
}

interface SearchResultItem {
    id: number;
    name: string;
    type: 'category' | 'board' | 'subject';
    category_id?: number | null;
    board_id?: number | null;
    depth?: number;
    breadcrumb?: string;
    category_path_ids?: number[];
}

type TreeLookup = {
    id: number;
    type: CategoryTreeNode['type'];
    categoryId?: number | null;
    boardId?: number | null;
};

type RawCategoryTreeNode = Category & {
    type?: CategoryTreeNode['type'];
    root_name?: string | null;
    parent_name?: string | null;
    board_name?: string | null;
    has_children?: boolean;
    hasChildren?: boolean;
    categoryId?: number;
    boardId?: number;
    children?: unknown[];
};

const getNodeKey = (
    type: string,
    id: number,
    categoryId?: number | null,
    boardId?: number | null
) =>
    `${type}` +
    `-${id}` +
    `-${categoryId || 0}` +
    `-${boardId || 0}`;

const getTreeNodeKey = (node: CategoryTreeNode) =>
    getNodeKey(
        node.type,
        node.id,
        node.categoryId,
        node.boardId
    );

const isRootCategoryNode = (
    node: CategoryTreeNode
) =>
    node.type === 'category' &&
    node.depth === 1;

const removeExpandedSubtree = (
    expandedIds: Set<string>,
    node: CategoryTreeNode
) => {
    const next = new Set(expandedIds);

    const removeNode = (
        currentNode: CategoryTreeNode
    ) => {
        next.delete(getTreeNodeKey(currentNode));

        currentNode.children.forEach(removeNode);
    };

    removeNode(node);

    return next;
};

const findNodePath = (
    nodes: CategoryTreeNode[],
    targetKey: string,
    currentPath: CategoryTreeNode[] = []
): CategoryTreeNode[] | null => {
    for (const node of nodes) {
        const nextPath = [
            ...currentPath,
            node,
        ];

        if (getTreeNodeKey(node) === targetKey) {
            return nextPath;
        }

        const foundPath = findNodePath(
            node.children,
            targetKey,
            nextPath
        );

        if (foundPath) {
            return foundPath;
        }
    }

    return null;
};

const buildPathBreadcrumb = (
    path: CategoryTreeNode[]
) =>
    path
        .map((node) => node.name)
        .filter(Boolean)
        .join(' -> ');

const getSearchResultNodeKey = (
    item: SearchResultItem
) =>
    getNodeKey(
        item.type,
        item.id,
        item.type === 'category'
            ? undefined
            : item.category_id ?? undefined,
        item.type === 'subject'
            ? item.board_id ?? undefined
            : undefined
    );

const getSearchResultLookup = (
    item: SearchResultItem
): TreeLookup => ({
    id: item.id,
    type: item.type,
    categoryId:
        item.type === 'category'
            ? undefined
            : item.category_id ?? undefined,
    boardId:
        item.type === 'subject'
            ? item.board_id ?? undefined
            : undefined,
});

const getSearchResultKey = (
    item: SearchResultItem
) =>
    getNodeKey(
        item.type,
        item.id,
        item.category_id,
        item.board_id
    );

// CategoryTree.tsx
const convertToTreeNode = (
    category: RawCategoryTreeNode,
): CategoryTreeNode => {
    return {
        ...category,
        type:
            category.type || 'category',

        rootName:
            category.root_name || undefined,

        parentName:
            category.parent_name || undefined,

        boardName:
            category.board_name || undefined,

        children: [],

        hasChildren:
            !!(
                category.has_children ??
                category.hasChildren
            ),

        isLoading: false,
    };
};



export const CategoryTree: React.FC<CategoryTreeProps> = ({
    onSelectNode,
}) => {
    const { accessToken, isInitialized } = useAuthStore();
    const [expandedIds, setExpandedIds] =
        useState<Set<string>>(
            new Set()
        );
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [treeNodes, setTreeNodes] = useState<CategoryTreeNode[]>([]);
    const treeNodesRef = useRef<CategoryTreeNode[]>([]);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] =
        useState<SearchResultItem[]>([]);
    const [activeNodeKey, setActiveNodeKey] =
        useState<string | null>(null);
    const [pendingScrollKey, setPendingScrollKey] =
        useState<string | null>(null);
    const [isExpandingPath, setIsExpandingPath] =
        useState(false);
    const [expandingLabel, setExpandingLabel] =
        useState<string | null>(null);
    const nodeRefs =
        useRef(new Map<string, HTMLDivElement>());
    const didLoadRootRef = useRef(false);
    const loadingIdsRef =
        useRef(new Set<string>());

    const loadedIdsRef =
        useRef(new Set<string>());

    useEffect(() => {
        treeNodesRef.current = treeNodes;
    }, [treeNodes]);

    useEffect(() => {
        if (!pendingScrollKey) {
            return;
        }

        let timeoutId: number | undefined;
        let frameId = 0;
        let attempts = 0;

        const scrollToPendingNode = () => {
            const element =
                nodeRefs.current.get(pendingScrollKey);

            if (!element) {
                return false;
            }

            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest',
            });

            setPendingScrollKey(null);
            return true;
        };

        const tryScroll = () => {
            if (scrollToPendingNode()) {
                return;
            }

            attempts += 1;

            if (attempts < 20) {
                timeoutId = window.setTimeout(() => {
                    frameId =
                        window.requestAnimationFrame(
                            tryScroll
                        );
                }, 50);
            }
        };

        frameId =
            window.requestAnimationFrame(tryScroll);

        return () => {
            window.cancelAnimationFrame(frameId);

            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [expandedIds, pendingScrollKey, treeNodes]);

    const toggleExpanded = (
        node: CategoryTreeNode
    ) => {

        const key = getTreeNodeKey(node);

        setExpandedIds((prev) => {
            if (prev.has(key)) {
                return removeExpandedSubtree(
                    prev,
                    node
                );
            }

            const next = isRootCategoryNode(node)
                ? new Set<string>()
                : new Set(prev);

            next.add(key);

            return next;
        });
    };

    const registerNode = (
        key: string,
        element: HTMLDivElement | null
    ) => {
        if (element) {
            nodeRefs.current.set(key, element);
            return;
        }

        nodeRefs.current.delete(key);
    };

    const handleSelectNode = (
        node: CategoryTreeNode
    ) => {
        const nodeKey = getTreeNodeKey(node);
        const nodePath = findNodePath(
            treeNodesRef.current,
            nodeKey
        );

        setActiveNodeKey(nodeKey);

        onSelectNode?.({
            ...node,
            breadcrumb:
                nodePath
                    ? buildPathBreadcrumb(nodePath)
                    : node.breadcrumb,
        });
    };

    // Helper function to make authenticated requests
    const authFetch = useCallback(async (url: string) => {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        return fetch(url, { headers });
    }, [accessToken]);

    const findNode = (
        nodes: CategoryTreeNode[],
        id: number,
        type?: string,
        categoryId?: number,
        boardId?: number
    ): CategoryTreeNode | null => {

        for (const node of nodes) {

            const matchesId =
                node.id === id;

            const matchesType =
                !type || node.type === type;

            const matchesCategory =
                categoryId === undefined ||
                node.categoryId === categoryId;

            const matchesBoard =
                boardId === undefined ||
                node.boardId === boardId;

            if (
                matchesId &&
                matchesType &&
                matchesCategory &&
                matchesBoard
            ) {
                return node;
            }

            if (node.children.length > 0) {

                const found = findNode(
                    node.children,
                    id,
                    type,
                    categoryId,
                    boardId
                );

                if (found) {
                    return found;
                }
            }
        }

        return null;
    };

    const waitForNode = async (
        lookup: TreeLookup,
        timeoutMs = 2500
    ) => {
        const startedAt = Date.now();

        while (Date.now() - startedAt < timeoutMs) {
            const node = findNode(
                treeNodesRef.current,
                lookup.id,
                lookup.type,
                lookup.categoryId,
                lookup.boardId
            );

            if (node) {
                return node;
            }

            await new Promise((resolve) => {
                window.setTimeout(resolve, 50);
            });
        }

        return null;
    };

    const buildExpandSteps = (
        item: SearchResultItem
    ): TreeLookup[] => {
        const steps: TreeLookup[] = [];

        for (const id of item.category_path_ids || []) {
            steps.push({
                id,
                type: 'category',
            });
        }

        if (item.type === 'category') {
            steps.push({
                id: item.id,
                type: 'category',
            });
        }

        if (item.type === 'board' && item.category_id) {
            steps.push({
                id: item.id,
                type: 'board',
                categoryId: item.category_id,
            });
        }

        if (item.type === 'subject') {
            if (item.board_id && item.category_id) {
                steps.push({
                    id: item.board_id,
                    type: 'board',
                    categoryId: item.category_id,
                });
            }

            steps.push({
                id: item.id,
                type: 'subject',
                categoryId: item.category_id,
                boardId: item.board_id,
            });
        }

        return steps;
    };

    const fetchRootCategories = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await authFetch(
                '/api/admin/categories/tree?parentId=null'
            );

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Unauthorized - Please log in again');
                }
                const json = await readJsonResponse(response);
                throw new Error(
                    response.status === 403
                        ? getApiErrorMessage(json, "You don't have permission to view categories.")
                        : getApiErrorMessage(json, 'Failed to fetch root categories')
                );
            }

            const result = await readJsonResponse(response);
            const categories: RawCategoryTreeNode[] = result.data;

            // Convert to tree nodes
            const nodes = categories.map((cat) => convertToTreeNode(cat));
            setTreeNodes(nodes);

            // Update node ma
        } catch (err) {
            const message = err instanceof Error
                ? err.message
                : 'An error occurred while fetching categories';
            setError(message);
            if (message.includes("don't have permission")) {
                toast.error(message);
            }
        } finally {
            setIsLoading(false);
        }
    }, [authFetch]);

    useEffect(() => {
        const timeout = setTimeout(async () => {

            if (!search.trim()) {
                setSearchResults([]);
                return;
            }

            try {

                const response = await authFetch(
                    `/api/admin/categories/tree/search?search=${encodeURIComponent(search)}`
                );

                const result = await response.json();

                setSearchResults(result.data || []);
            } catch {
                setSearchResults([]);
            } finally {
            }

        }, 400);

        return () => clearTimeout(timeout);

    }, [authFetch, search]);
    // Fetch initial root categories
    useEffect(() => {
        if (!isInitialized || didLoadRootRef.current) {
            return;
        }

        didLoadRootRef.current = true;

        fetchRootCategories();
    }, [fetchRootCategories, isInitialized]);

    const handleExpandNode = async (
        node: CategoryTreeNode
    ) => {
        const nodeKey =
            `${node.type}-${node.id}-${node.categoryId || 0}`;

        if (
            loadingIdsRef.current.has(nodeKey) ||
            loadedIdsRef.current.has(nodeKey)
        ) {
            return;
        }

        loadingIdsRef.current.add(nodeKey);
        try {
            let url = '';

            // CATEGORY
            if (node.type === 'category') {

                // CLASS CHILD -> LOAD BOARDS
                if (
                    node.type === 'category' &&
                    node.depth === 2 &&
                    (
                        node.slug.startsWith('class-') ||
                        node.name.toUpperCase().startsWith('CLASS')
                    )
                ) {
                    url =
                        `/api/admin/categories/tree?type=board&categoryId=${node.id}`;
                }

                // NORMAL CATEGORY CHILDREN
                else {
                    url =
                        `/api/admin/categories/tree?type=category&parentId=${node.id}`;
                }
            }

            // BOARD -> SUBJECTS
            else if (node.type === 'board') {
                url =
                    `/api/admin/categories/tree?type=subject` +
                    `&categoryId=${node.categoryId}` +
                    `&boardId=${node.id}`;
            }

            const response = await authFetch(url);

            if (!response.ok) {
                const json = await readJsonResponse(response);
                throw new Error(
                    response.status === 403
                        ? getApiErrorMessage(json, "You don't have permission to view this category.")
                        : getApiErrorMessage(json, 'Failed to fetch children')
                );
            }

            const result = await readJsonResponse(response);

            const childNodes: CategoryTreeNode[] =
                result.data;

            setTreeNodes((prevNodes) =>
                updateNodeChildren(
                    prevNodes,
                    node.id,
                    childNodes,
                    node.type
                )
            );
            loadedIdsRef.current.add(nodeKey);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch children';
            setError(message);
            if (message.includes("don't have permission")) {
                toast.error(message);
            }
        } finally {
            loadingIdsRef.current.delete(nodeKey);
        }
    };



    const updateNodeChildren = (
        nodes: CategoryTreeNode[],
        parentId: number,
        children: CategoryTreeNode[],
        parentType?: string
    ): CategoryTreeNode[] => {
        return nodes.map((node) => {
            if (
                node.id === parentId &&
                (!parentType || node.type === parentType) &&
                (
                    parentType !== 'board' ||
                    node.categoryId === children[0]?.categoryId
                )
            ) {
                return {
                    ...node,
                    children,
                    hasChildren: children.length > 0 || node.hasChildren,
                };
            }

            if (node.children && node.children.length > 0) {
                return {
                    ...node,
                    children: updateNodeChildren(
                        node.children,
                        parentId,
                        children,
                        parentType
                    ),
                };
            }

            return node;
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                        Loading categories...
                    </span>
                </div>
            </div>
        );
    }

    if (!accessToken) {
        return (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="text-sm">Please log in to view categories</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="text-sm">{error}</p>
            </div>
        );
    }

    if (treeNodes.length === 0) {
        return (
            <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                    No categories available
                </p>
            </div>
        );
    }

    const openTreePath = async (
        item: SearchResultItem
    ) => {
        setIsExpandingPath(true);
        setExpandingLabel(item.name);

        const targetKey =
            getSearchResultNodeKey(item);

        setActiveNodeKey(targetKey);
        setSearch('');
        setSearchResults([]);

        try {
            const expandSteps = buildExpandSteps(item);

            for (let index = 0; index < expandSteps.length; index += 1) {
                const step = expandSteps[index];
                const node = await waitForNode(step);

                if (!node) {
                    break;
                }

                setExpandedIds((prev) => {
                    const next = isRootCategoryNode(node)
                        ? new Set<string>()
                        : new Set(prev);

                    next.add(getTreeNodeKey(node));

                    return next;
                });

                const isLastStep =
                    index === expandSteps.length - 1;

                if (!isLastStep && node.hasChildren) {
                    if (node.children.length === 0) {
                        await handleExpandNode(node);
                    }

                    await waitForNode(expandSteps[index + 1]);
                }
            }

            const lookup = getSearchResultLookup(item);
            const selected = await waitForNode(lookup);

            if (selected) {
                handleSelectNode({
                    ...selected,
                    breadcrumb: item.breadcrumb,
                });
                setPendingScrollKey(targetKey);
            }
        } finally {
            setIsExpandingPath(false);
            setExpandingLabel(null);
        }
    };

    return (
        <div className="rounded-lg bg-card sm:border sm:p-4">
            <div className="space-y-3 min-w-0">

                <div className="relative">
                    <Input
                        className="h-10 text-base"
                        placeholder="Search categories, boards, subjects..."
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                    />

                    {isExpandingPath && (
                        <div className="mt-2 flex items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-destructive" />
                            <span>
                                Expanding tree{expandingLabel ? ` for ${expandingLabel}` : ''}...
                            </span>
                        </div>
                    )}

                    {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-72 overflow-auto rounded-md border bg-background shadow-lg">

                            {searchResults.map((item) => (
                                <button
                                    key={getSearchResultKey(item)}
                                    className="w-full border-b px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-muted"
                                    onClick={() =>
                                        openTreePath(item)
                                    }
                                >
                                    <div className="font-medium">
                                        {item.name}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground truncate">
                                        {item.breadcrumb}
                                    </div>

                                    <div className="text-xs text-muted-foreground">
                                        {item.type} • Level {item.depth}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="min-w-0 space-y-1.5 sm:space-y-1">
                    {treeNodes.map((node) => (
                        <TreeNode
                            key={
                                `${node.type}` +
                                `-${node.id}` +
                                `-${node.categoryId || 0}` +
                                `-${node.boardId || 0}`
                            }
                            node={node}
                            onExpandNode={handleExpandNode}
                            onSelectNode={handleSelectNode}
                            expandedIds={expandedIds}
                            toggleExpanded={toggleExpanded}
                            activeNodeKey={activeNodeKey}
                            registerNode={registerNode}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

