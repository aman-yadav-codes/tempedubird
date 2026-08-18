"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  Position,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type OnConnect,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowRight, Braces, Loader2, RotateCcw, Save, Square, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TemplateResizableHandle,
  TemplateResizablePanel,
  TemplateResizablePanelGroup,
} from "@/components/card-templates/template-resizable";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  DocumentSourceField,
  DocumentTemplateFieldMapping,
} from "@/lib/card-templates/field-mapping";
import type { DocumentTemplateField, DocumentTemplateRow } from "@/lib/types/document-template";

type FieldMappingPayload = {
  sourceFields: DocumentSourceField[];
  templateFields: DocumentTemplateField[];
  mappings: DocumentTemplateFieldMapping[];
};

type DraftMapping = {
  template_field_name: string;
  source_field_key: string;
  transform: string;
};

type CardTemplateFieldMapperProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: DocumentTemplateRow | null;
  accessToken: string | null;
};

const NODE_HEIGHT = 72;
const NODE_START_Y = 96;
const STUDENT_SOURCE_X = 120;
const TARGET_X = 480;
const INSTITUTION_SOURCE_X = 840;

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Server returned an invalid response" };
  }
}

type MapperNodeData = {
  label: string;
  side?: "left" | "right";
};

function SourceNode({ data, selected }: NodeProps) {
  const nodeData = data as MapperNodeData;
  const sourcePosition = nodeData.side === "right" ? Position.Left : Position.Right;
  return (
    <div
      className={cn(
        "relative flex min-w-[190px] items-center justify-between gap-3 rounded-md border bg-card px-4 py-3 text-card-foreground shadow-sm transition",
        selected ? "border-primary shadow-primary/25" : "border-border"
      )}
    >
      <div className="min-w-0">
        <p className="truncate font-mono text-sm font-semibold text-foreground">{nodeData.label}</p>
      </div>
      <Handle
        type="source"
        position={sourcePosition}
        className="!size-3 !border-2 !border-primary !bg-background"
      />
    </div>
  );
}

function TargetNode({ data, selected }: NodeProps) {
  const nodeData = data as MapperNodeData;
  return (
    <div
      className={cn(
        "relative flex min-w-[190px] items-center gap-3 rounded-md border bg-card px-4 py-3 text-card-foreground shadow-sm transition",
        selected ? "border-muted-foreground shadow-muted-foreground/20" : "border-border"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!size-3 !border-2 !border-muted-foreground !bg-background"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className="!size-3 !border-2 !border-muted-foreground !bg-background"
      />
      <div className="min-w-0">
        <p className="truncate font-mono text-sm font-medium text-muted-foreground">{nodeData.label}</p>
      </div>
    </div>
  );
}

const nodeTypes = {
  sourceField: SourceNode,
  targetField: TargetNode,
};

function makeEdgeProps(): Partial<Edge> {
  return {
    type: "default",
    style: { stroke: "#ef4444", strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#ef4444",
      width: 14,
      height: 14,
    },
  };
}

function edgeToDraft(edge: Edge): DraftMapping {
  return {
    source_field_key: edge.source.replace("source-", ""),
    template_field_name: edge.target.replace("target-", ""),
    transform: "text",
  };
}

function makeNodes(sourceFields: DocumentSourceField[], templateFields: DocumentTemplateField[]) {
  const studentFields = sourceFields.filter((field) => !field.key.startsWith("institution."));
  const institutionFields = sourceFields.filter((field) => field.key.startsWith("institution."));
  const studentSourceNodes: Node[] = studentFields.map((field, index) => ({
    id: `source-${field.key}`,
    type: "sourceField",
    position: { x: STUDENT_SOURCE_X, y: NODE_START_Y + index * NODE_HEIGHT },
    draggable: false,
    data: {
      label: field.key,
      side: "left",
    },
  }));
  const institutionSourceNodes: Node[] = institutionFields.map((field, index) => ({
    id: `source-${field.key}`,
    type: "sourceField",
    position: { x: INSTITUTION_SOURCE_X, y: NODE_START_Y + index * NODE_HEIGHT },
    draggable: false,
    data: {
      label: field.key,
      side: "right",
    },
  }));
  const targetNodes: Node[] = templateFields.map((field, index) => ({
    id: `target-${field.field_name}`,
    type: "targetField",
    position: { x: TARGET_X, y: NODE_START_Y + index * NODE_HEIGHT },
    draggable: false,
    data: {
      label: field.field_name,
    },
  }));
  return [...studentSourceNodes, ...institutionSourceNodes, ...targetNodes];
}

function FieldMapperCanvas({
  sourceFields,
  templateFields,
  mappings,
  onChange,
}: {
  sourceFields: DocumentSourceField[];
  templateFields: DocumentTemplateField[];
  mappings: DraftMapping[];
  onChange: (mappings: DraftMapping[]) => void;
}) {
  const initialNodes = useMemo(
    () => makeNodes(sourceFields, templateFields),
    [sourceFields, templateFields]
  );
  const initialEdges = useMemo<Edge[]>(
    () =>
      mappings.map((mapping) => ({
        id: `edge-${mapping.source_field_key}-${mapping.template_field_name}`,
        source: `source-${mapping.source_field_key}`,
        target: `target-${mapping.template_field_name}`,
        targetHandle: mapping.source_field_key.startsWith("institution.") ? "right" : "left",
        ...makeEdgeProps(),
      })),
    [mappings]
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);
  void setNodes;

  useEffect(() => {
    const timeout = window.setTimeout(
      () => onChange(edges.map(edgeToDraft)),
      0
    );
    return () => window.clearTimeout(timeout);
  }, [edges, onChange]);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source?.startsWith("source-") || !connection.target?.startsWith("target-")) {
        return;
      }
      setEdges((currentEdges) => {
        const withoutTarget = currentEdges.filter((edge) => edge.target !== connection.target);
        return addEdge(
          {
            ...connection,
            id: `edge-${connection.source}-${connection.target}`,
            ...makeEdgeProps(),
          },
          withoutTarget
        );
      });
    },
    [setEdges]
  );

  const canvasHeight = Math.max(
    720,
    Math.max(
      sourceFields.filter((field) => !field.key.startsWith("institution.")).length,
      sourceFields.filter((field) => field.key.startsWith("institution.")).length,
      templateFields.length
    ) * NODE_HEIGHT + NODE_START_Y * 2
  );

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-background text-foreground">
      <div className="absolute left-7 right-7 top-5 z-20 grid grid-cols-3 text-xs font-semibold uppercase tracking-wide">
        <span className="flex items-center gap-2 text-primary">
          <span className="size-2 rounded-full bg-primary" />
          Student/User fields
        </span>
        <span className="flex items-center justify-center gap-2 text-foreground">
          <span className="size-2 rounded-full bg-foreground" />
          Destination fields
        </span>
        <span className="flex items-center justify-end gap-2 text-primary">
          <span className="size-2 rounded-full bg-primary" />
          Institution fields
        </span>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setFlowInstance}
        connectionRadius={30}
        deleteKeyCode="Backspace"
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.35}
        maxZoom={1.4}
        proOptions={{ hideAttribution: true }}
        style={{ height: "100%", minHeight: canvasHeight, background: "var(--background)" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--border)" />
      </ReactFlow>
      <div className="absolute bottom-4 right-4 z-50 flex flex-col gap-1">
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-md border bg-card text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
          onClick={() => flowInstance?.zoomIn({ duration: 160 })}
        >
          +
        </button>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-md border bg-card text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
          onClick={() => flowInstance?.zoomOut({ duration: 160 })}
        >
          -
        </button>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-md border bg-card text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
          onClick={() => flowInstance?.fitView({ duration: 220, padding: 0.25 })}
        >
          <Square className="size-3" />
        </button>
      </div>
    </div>
  );
}

export function CardTemplateFieldMapper({
  open,
  onOpenChange,
  template,
  accessToken,
}: CardTemplateFieldMapperProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payload, setPayload] = useState<FieldMappingPayload | null>(null);
  const [draft, setDraft] = useState<Record<string, DraftMapping>>({});
  const [canvasKey, setCanvasKey] = useState(0);

  const sourceByKey = useMemo(
    () => new Map((payload?.sourceFields ?? []).map((field) => [field.key, field])),
    [payload?.sourceFields]
  );
  const mappedRows = useMemo(
    () =>
      (payload?.templateFields ?? [])
        .map((field) => {
          const mapping = draft[field.field_name];
          if (!mapping?.source_field_key) return null;
          return {
            templateField: field,
            sourceField: sourceByKey.get(mapping.source_field_key),
          };
        })
        .filter(Boolean),
    [draft, payload?.templateFields, sourceByKey]
  );

  const loadMappings = useCallback(
    async () => {
      if (!open || !template || !accessToken) return;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/master-data/card-templates/${template.id}/field-mappings`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const json = await readJson(res);
        if (!res.ok) throw new Error(json.error ?? "Failed to load field mappings");
        const data = json.data as FieldMappingPayload;
        setPayload(data);
        const nextDraft = Object.fromEntries(
          data.templateFields.map((field) => {
            const existing = data.mappings.find(
              (mapping) => mapping.template_field_name === field.field_name
            );
            return [
              field.field_name,
              {
                template_field_name: field.field_name,
                source_field_key: existing?.source_field_key ?? "",
                transform: existing?.transform ?? "text",
              },
            ];
          })
        );
        setDraft(nextDraft);
        setCanvasKey((current) => current + 1);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load field mappings");
      } finally {
        setLoading(false);
      }
    },
    [accessToken, open, template]
  );

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => void loadMappings(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadMappings, open]);

  const handleCanvasChange = useCallback(
    (mappings: DraftMapping[]) => {
      setDraft((current) => {
        const nextDraft = Object.fromEntries(
          (payload?.templateFields ?? []).map((field) => {
            const mapping = mappings.find(
              (item) => item.template_field_name === field.field_name
            );
            return [
              field.field_name,
              {
                template_field_name: field.field_name,
                source_field_key: mapping?.source_field_key ?? "",
                transform: mapping?.transform ?? "text",
              },
            ];
          })
        );
        const currentSignature = Object.values(current)
          .filter((mapping) => mapping.source_field_key)
          .map((mapping) => `${mapping.template_field_name}:${mapping.source_field_key}`)
          .sort()
          .join("|");
        const nextSignature = Object.values(nextDraft)
          .filter((mapping) => mapping.source_field_key)
          .map((mapping) => `${mapping.template_field_name}:${mapping.source_field_key}`)
          .sort()
          .join("|");
        return currentSignature === nextSignature ? current : nextDraft;
      });
    },
    [payload?.templateFields]
  );

  async function saveMappings() {
    if (!template || !accessToken) return;
    setSaving(true);
    try {
      const mappings = Object.values(draft)
        .filter((mapping) => mapping.source_field_key)
        .map((mapping) => ({ ...mapping, fallback_value: null }));
      const res = await fetch(
        `/api/admin/master-data/card-templates/${template.id}/field-mappings`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mappings }),
        }
      );
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to save field mappings");
      toast.success(`${json.saved ?? mappings.length} field mapping(s) saved`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save field mappings");
    } finally {
      setSaving(false);
    }
  }

  function resetMappings() {
    const emptyDraft = Object.fromEntries(
      (payload?.templateFields ?? []).map((field) => [
        field.field_name,
        {
          template_field_name: field.field_name,
          source_field_key: "",
          transform: "text",
        },
      ])
    );
    setDraft(emptyDraft);
    setCanvasKey((current) => current + 1);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[90dvh] max-h-[900px] w-[94vw] max-w-[1400px] flex-col gap-0 overflow-hidden rounded-lg border p-0 sm:max-w-[1400px] sm:p-0"
        showCloseButton={false}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="flex h-14 shrink-0 flex-row items-center justify-between border-b bg-background px-5 text-foreground">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <Braces className="size-4 text-primary" />
                Map Template Fields
              </DialogTitle>
              <DialogDescription className="sr-only">
                Connect EduBird student fields to placeholders detected in {template?.name ?? "this template"}.
              </DialogDescription>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetMappings}
              disabled={loading || saving || !payload || mappedRows.length === 0}
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={saveMappings} disabled={loading || saving || !payload}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save Mapping
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="icon" disabled={saving}>
                <X className="size-4" />
                <span className="sr-only">Close field mapper</span>
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading field mapper...
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-hidden">
            <TemplateResizablePanelGroup
              id="card-template-field-mapper"
              direction="horizontal"
              className="h-full w-full min-h-0"
            >
              <TemplateResizablePanel
                id="card-template-field-mapper-settings"
                defaultSize="30%"
                minSize="260px"
                maxSize="42%"
                className="min-h-0 min-w-0"
              >
                <aside className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto p-5 md:p-7">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Drag field connections
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Drag from red EduBird field handles to white template placeholder handles.
                    </p>
                  </div>

                  <div className="rounded-md border p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Mapping summary
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          This is what will be saved for generation.
                        </p>
                      </div>
                      <Badge variant="outline">{mappedRows.length} mapped</Badge>
                    </div>
                    <div className="rounded-md border bg-background/40">
                      {mappedRows.map((row) => row && (
                        <div
                          key={row.templateField.field_name}
                          className="border-b px-4 py-3 last:border-b-0"
                        >
                          <p className="font-mono text-xs text-primary">
                            {`{{${row.templateField.field_name}}}`}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <ArrowRight className="size-3 text-muted-foreground" />
                            <span className={cn("font-medium", !row.sourceField && "text-destructive")}>
                              {row.sourceField?.label ?? "Unknown field"}
                            </span>
                          </div>
                        </div>
                      ))}
                      {mappedRows.length === 0 && (
                        <p className="p-5 text-center text-sm text-muted-foreground">
                          No fields mapped yet.
                        </p>
                      )}
                    </div>
                  </div>
                </aside>
              </TemplateResizablePanel>

              <TemplateResizableHandle id="card-template-field-mapper-separator" />

              <TemplateResizablePanel
                id="card-template-field-mapper-canvas"
                defaultSize="70%"
                minSize="520px"
                className="min-h-0 min-w-0"
              >
                <main className="h-full min-h-0 bg-muted/20">
                  <FieldMapperCanvas
                    key={canvasKey}
                    sourceFields={payload?.sourceFields ?? []}
                    templateFields={payload?.templateFields ?? []}
                    mappings={Object.values(draft).filter((mapping) => mapping.source_field_key)}
                    onChange={handleCanvasChange}
                  />
                </main>
              </TemplateResizablePanel>
            </TemplateResizablePanelGroup>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
