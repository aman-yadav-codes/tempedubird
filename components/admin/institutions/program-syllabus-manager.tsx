"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  BookMarked,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Clock,
  CheckCircle2,
  Layers,
  FolderPlus,
  FilePlus2,
  RefreshCw,
  Loader2,
  HelpCircle,
  Search,
  Eye,
  Download,
  BookOpen,
  GraduationCap,
  Filter,
  Check,
  ListPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export interface EditableSyllabusTopic {
  id: string;
  dbId?: number;
  subject_id?: number | string;
  subject_name?: string;
  title: string;
  description?: string;
  node_type: "module" | "unit" | "chapter" | "topic" | "subtopic";
  estimated_hours?: number | null;
  learning_outcomes?: string;
  sort_order: number;
  children?: EditableSyllabusTopic[];
}

interface ProgramSyllabusManagerProps {
  subjectIds: string[];
  subjectOptions: { id: number; value: string; label: string }[];
  categoryName?: string;
  authHeader: Record<string, string>;
  syllabusNodes: EditableSyllabusTopic[];
  onSyllabusNodesChange: (nodes: EditableSyllabusTopic[]) => void;
}

export function ProgramSyllabusManager({
  subjectIds,
  subjectOptions,
  categoryName,
  authHeader,
  syllabusNodes,
  onSyllabusNodesChange,
}: ProgramSyllabusManagerProps) {
  const [loading, setLoading] = useState(false);
  const [templateSource, setTemplateSource] = useState<string | null>(null);
  
  // Default to the first subject in subjectOptions (subject-basis view, no "all" option)
  const initialSubjectId = subjectOptions[0]?.id
    ? String(subjectOptions[0].id)
    : (subjectOptions[0]?.value || "");
  const [filterSubjectId, setFilterSubjectId] = useState<string>(initialSubjectId);

  // Keep filterSubjectId synced with available subjectOptions
  useEffect(() => {
    if (subjectOptions.length > 0) {
      const exists = subjectOptions.some(
        (s) => String(s.id) === String(filterSubjectId) || String(s.value) === String(filterSubjectId)
      );
      if (!exists || filterSubjectId === "all" || !filterSubjectId) {
        setFilterSubjectId(String(subjectOptions[0].id || subjectOptions[0].value));
      }
    }
  }, [subjectOptions, filterSubjectId]);

  const activeSubject = useMemo(() => {
    return (
      subjectOptions.find(
        (s) => String(s.id) === String(filterSubjectId) || String(s.value) === String(filterSubjectId)
      ) || subjectOptions[0] || null
    );
  }, [subjectOptions, filterSubjectId]);

  // Marketplace Modal States
  const [marketplaceModalOpen, setMarketplaceModalOpen] = useState(false);
  const [marketplaceTemplates, setMarketplaceTemplates] = useState<any[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceSearch, setMarketplaceSearch] = useState("");
  const [previewSyllabusId, setPreviewSyllabusId] = useState<number | null>(null);
  const [previewNodes, setPreviewNodes] = useState<EditableSyllabusTopic[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<number[]>([]);
  const [bulkImporting, setBulkImporting] = useState(false);

  // Edit / Add Topic Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<EditableSyllabusTopic | null>(null);
  const [parentModuleId, setParentModuleId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formHours, setFormHours] = useState("");
  const [formType, setFormType] = useState<"unit" | "chapter" | "topic" | "module">("unit");
  const [formSubjectId, setFormSubjectId] = useState<string>("");

  const primarySubjectId = subjectIds.filter((s) => !s.startsWith("category:"))[0] || "";

  const getCleanClassName = useCallback((name?: string) => {
    if (!name) return "";
    const parts = name.split(/→|->|›|>/).map((p) => p.trim()).filter(Boolean);
    return parts[parts.length - 1] || name;
  }, []);

  const mapApiNodeToEditable = (
    n: any,
    subjId: any,
    subjName: string,
    prefix: string,
    level = 0
  ): EditableSyllabusTopic => {
    return {
      id: `${prefix}-${n.id || Math.random().toString(36).slice(2, 7)}-${Date.now()}`,
      dbId: n.id,
      subject_id: subjId,
      subject_name: subjName,
      title: n.title || "Untitled",
      description: n.description || "",
      node_type: n.node_type || (level === 0 ? "unit" : level === 1 ? "chapter" : "topic"),
      estimated_hours: n.estimated_hours != null ? Number(n.estimated_hours) : null,
      learning_outcomes: n.learning_outcomes || "",
      sort_order: n.sort_order ?? level * 10,
      children: (n.children || []).map((child: any) =>
        mapApiNodeToEditable(child, subjId, subjName, prefix, level + 1)
      ),
    };
  };

  // Fetch Marketplace / Admin templates for the selected class & subjects
  const fetchMarketplaceTemplates = useCallback(
    async (searchTerm = "") => {
      setMarketplaceLoading(true);
      try {
        const cleanClass = getCleanClassName(categoryName);
        const query = searchTerm.trim();
        const searchParam = query ? `&search=${encodeURIComponent(query)}` : "";
        const res = await fetch(
          `/api/admin/master-data/syllabi?limit=150${searchParam}`,
          { headers: authHeader }
        );
        let data: any[] = [];
        if (res.ok) {
          const json = await res.json();
          data = json.data || [];
        }

        if (query && data.length > 0) {
          const q = query.toLowerCase();
          data = data.filter((item: any) => {
            const title = (item.title || "").toLowerCase();
            const catName = (item.category_name || "").toLowerCase();
            const subName = (item.subject_name || "").toLowerCase();
            return title.includes(q) || catName.includes(q) || subName.includes(q);
          });
        }

        setMarketplaceTemplates(data);
      } catch (err) {
        console.error("Error fetching marketplace templates:", err);
      } finally {
        setMarketplaceLoading(false);
      }
    },
    [authHeader, categoryName, getCleanClassName]
  );

  // Auto-fetch syllabus configured by platform admin for this program & subject basis
  const autoFetchedRef = useRef(false);

  useEffect(() => {
    if (subjectOptions.length === 0 || autoFetchedRef.current) return;

    const existingSubjectIds = new Set(
      syllabusNodes.map((n) => String(n.subject_id)).filter(Boolean)
    );
    const existingSubjectNames = new Set(
      syllabusNodes.map((n) => (n.subject_name || "").toLowerCase().trim()).filter(Boolean)
    );

    const hasMissing = subjectOptions.some(
      (s) => !existingSubjectIds.has(String(s.id)) && !existingSubjectNames.has(s.label.toLowerCase().trim())
    );

    if (!hasMissing && syllabusNodes.length > 0) return;

    autoFetchedRef.current = true;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(`/api/admin/master-data/syllabi?limit=150`, {
          headers: authHeader,
        });
        if (!res.ok) return;
        const json = await res.json();
        const templates = json.data || [];

        let fetchedNodes: EditableSyllabusTopic[] = [];

        for (const subj of subjectOptions) {
          const subjIdStr = String(subj.id || subj.value);
          const subjNameLower = subj.label.toLowerCase().trim();

          const alreadyHasNodes = syllabusNodes.some((n) => {
            const nSubjId = String(n.subject_id || "");
            const nSubjName = (n.subject_name || "").toLowerCase().trim();
            return nSubjId === subjIdStr || nSubjName === subjNameLower;
          });

          if (alreadyHasNodes) continue;

          // Match by subject_id or subject_name from master syllabi
          const matchedTpl = templates.find((t: any) => {
            const tSubjId = String(t.subject_id || "");
            const tSubjName = (t.subject_name || t.title || "").toLowerCase().trim();
            return tSubjId === subjIdStr || tSubjName === subjNameLower || tSubjName.includes(subjNameLower) || subjNameLower.includes(tSubjName);
          });

          if (matchedTpl) {
            const treeRes = await fetch(`/api/admin/master-data/syllabi/${matchedTpl.id}/tree`, {
              headers: authHeader,
            });
            if (treeRes.ok) {
              const treeJson = await treeRes.json();
              const nodes = treeJson.data || [];
              if (nodes.length > 0) {
                const mapped = nodes.map((n: any) =>
                  mapApiNodeToEditable(n, subj.id || subj.value, subj.label, `tpl-${matchedTpl.id}`, 0)
                );
                fetchedNodes = [...fetchedNodes, ...mapped];
              }
            }
          }
        }

        if (fetchedNodes.length > 0) {
          onSyllabusNodesChange([...syllabusNodes, ...fetchedNodes]);
          setTemplateSource("Platform Master Syllabus");
        }
      } catch (err) {
        console.error("Auto-fetch master syllabus error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [subjectOptions, syllabusNodes, authHeader, onSyllabusNodesChange]);

  const handleOpenMarketplaceModal = () => {
    setMarketplaceModalOpen(true);
    setMarketplaceSearch("");
    setPreviewSyllabusId(null);
    setPreviewNodes([]);
    setSelectedTemplateIds([]);
    fetchMarketplaceTemplates("");
  };

  const handlePreviewSyllabusTree = async (templateId: number) => {
    if (previewSyllabusId === templateId) {
      setPreviewSyllabusId(null);
      setPreviewNodes([]);
      return;
    }
    setPreviewSyllabusId(templateId);
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/admin/master-data/syllabi/${templateId}/tree`, {
        headers: authHeader,
      });
      if (res.ok) {
        const json = await res.json();
        const nodes = json.data || [];
        const mapped = nodes.map((n: any) =>
          mapApiNodeToEditable(n, "", "", `preview-${templateId}`, 0)
        );
        setPreviewNodes(mapped);
      }
    } catch (err) {
      console.error("Failed to preview syllabus:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Helper to fetch nodes for a single template with proper recursive mapping & subject alignment
  const fetchNodesForTemplate = async (template: any): Promise<EditableSyllabusTopic[]> => {
    const tplSubjName = (template.subject_name || template.title || "").toLowerCase();

    // 1. Try matching with available program subject options
    let matchedSubject = subjectOptions.find(
      (s) =>
        String(s.id) === String(template.subject_id) ||
        String(s.value) === String(template.subject_id) ||
        s.label.toLowerCase() === tplSubjName ||
        tplSubjName.includes(s.label.toLowerCase()) ||
        s.label.toLowerCase().includes(tplSubjName)
    );

    // 2. If viewing a specific active subject tab and no distinct match was found, attach to activeSubject
    if (!matchedSubject && activeSubject) {
      matchedSubject = activeSubject;
    }

    const subjId = matchedSubject
      ? (matchedSubject.id || matchedSubject.value)
      : (template.subject_id || activeSubject?.id || activeSubject?.value);
    const subjName = matchedSubject?.label || activeSubject?.label || template.subject_name || template.title;

    try {
      const res = await fetch(`/api/admin/master-data/syllabi/${template.id}/tree`, {
        headers: authHeader,
      });
      if (res.ok) {
        const json = await res.json();
        const nodes = json.data || [];
        if (nodes.length > 0) {
          return nodes.map((n: any) =>
            mapApiNodeToEditable(n, subjId, subjName, `tpl-${template.id}`, 0)
          );
        }
      }
    } catch (err) {
      console.error(`Failed to fetch tree for template ${template.id}:`, err);
    }

    // Fallback module
    return [
      {
        id: `unit-${template.id}-1-${Date.now()}`,
        subject_id: subjId,
        subject_name: subjName,
        title: `Unit 1: Core Curriculum for ${subjName}`,
        description: "Fundamental theoretical principles, standard modules, and definitions.",
        node_type: "unit",
        estimated_hours: 20,
        sort_order: 10,
        children: [
          {
            id: `chap-${template.id}-1-1-${Date.now()}`,
            subject_id: subjId,
            subject_name: subjName,
            title: "Chapter 1.1: Foundations & Methodologies",
            description: "Key concepts and standard analytical models.",
            node_type: "chapter",
            estimated_hours: 10,
            sort_order: 10,
            children: [
              {
                id: `top-${template.id}-1-1-1-${Date.now()}`,
                subject_id: subjId,
                subject_name: subjName,
                title: "Topic 1.1.1: Core Concepts & Principles",
                node_type: "topic",
                estimated_hours: 5,
                sort_order: 10,
              },
            ],
          },
        ],
      },
    ];
  };

  // Import a single subject syllabus template (smart append / update for that subject)
  const handleApplyMarketplaceTemplate = async (template: any) => {
    setLoading(true);
    try {
      const newNodes = await fetchNodesForTemplate(template);
      const targetSubjId = newNodes[0]?.subject_id || template.subject_id || activeSubject?.id || activeSubject?.value;
      const targetSubjName = (newNodes[0]?.subject_name || activeSubject?.label || "").toLowerCase();

      // Filter out existing modules of this specific subject if re-importing, or keep other subjects intact
      const nextNodes = [
        ...syllabusNodes.filter((n) => {
          if (targetSubjId && String(n.subject_id) === String(targetSubjId)) return false;
          if (targetSubjName && n.subject_name && (n.subject_name.toLowerCase() === targetSubjName || targetSubjName.includes(n.subject_name.toLowerCase()))) return false;
          return true;
        }),
        ...newNodes,
      ];

      onSyllabusNodesChange(nextNodes);
      setTemplateSource(`${newNodes[0]?.subject_name || template.subject_name || template.title}`);
      setMarketplaceModalOpen(false);
      toast.success(`Imported syllabus for ${newNodes[0]?.subject_name || template.subject_name || template.title}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import template");
    } finally {
      setLoading(false);
    }
  };

  // Bulk import multiple selected subject templates
  const handleBulkImportSelected = async () => {
    if (selectedTemplateIds.length === 0) return;
    setBulkImporting(true);
    try {
      const templatesToImport = marketplaceTemplates.filter((t) => selectedTemplateIds.includes(t.id));
      let combinedNewNodes: EditableSyllabusTopic[] = [];
      const importedSubjectIds = new Set<string>();
      const importedSubjectNames = new Set<string>();

      for (const tpl of templatesToImport) {
        const nodes = await fetchNodesForTemplate(tpl);
        combinedNewNodes = [...combinedNewNodes, ...nodes];
        if (nodes[0]?.subject_id) importedSubjectIds.add(String(nodes[0].subject_id));
        if (nodes[0]?.subject_name) importedSubjectNames.add(nodes[0].subject_name.toLowerCase());
      }

      // Keep non-overlapping subjects
      const baseNodes = syllabusNodes.filter((n) => {
        if (n.subject_id && importedSubjectIds.has(String(n.subject_id))) return false;
        if (n.subject_name && importedSubjectNames.has(n.subject_name.toLowerCase())) return false;
        return true;
      });

      const finalNodes = [...baseNodes, ...combinedNewNodes];
      onSyllabusNodesChange(finalNodes);
      setMarketplaceModalOpen(false);
      toast.success(`Successfully imported ${templatesToImport.length} subject syllabi (${combinedNewNodes.length} units total)`);
    } catch (err) {
      toast.error("Failed to import selected syllabi");
    } finally {
      setBulkImporting(false);
    }
  };

  // Import all available templates matching this class
  const handleImportAllAvailable = async () => {
    if (marketplaceTemplates.length === 0) return;
    setBulkImporting(true);
    try {
      let combinedNewNodes: EditableSyllabusTopic[] = [];
      for (const tpl of marketplaceTemplates) {
        const nodes = await fetchNodesForTemplate(tpl);
        combinedNewNodes = [...combinedNewNodes, ...nodes];
      }

      onSyllabusNodesChange(combinedNewNodes);
      setMarketplaceModalOpen(false);
      toast.success(`Imported all ${marketplaceTemplates.length} subject syllabi (${combinedNewNodes.length} units)`);
    } catch (err) {
      toast.error("Failed to import all syllabi");
    } finally {
      setBulkImporting(false);
    }
  };

  // Toggle template selection
  const toggleTemplateSelection = (id: number) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select all / Deselect all
  const toggleSelectAll = () => {
    if (selectedTemplateIds.length === marketplaceTemplates.length) {
      setSelectedTemplateIds([]);
    } else {
      setSelectedTemplateIds(marketplaceTemplates.map((t) => t.id));
    }
  };

  // Open Add Unit / Module modal (scoped to active subject)
  const handleOpenAddModule = () => {
    setEditingNode(null);
    setParentModuleId(null);
    setSelectedChapterId("");
    setFormTitle("");
    setFormDescription("");
    setFormHours("");
    setFormType("unit");
    const defaultSubj = activeSubject
      ? String(activeSubject.id || activeSubject.value)
      : (subjectOptions[0] ? String(subjectOptions[0].id || subjectOptions[0].value) : "");
    setFormSubjectId(defaultSubj);
    setEditModalOpen(true);
  };

  // Open Add Chapter modal under a parent Unit
  const handleOpenAddChapter = (unitId: string) => {
    setEditingNode(null);
    setParentModuleId(unitId);
    setSelectedChapterId("");
    setFormTitle("");
    setFormDescription("");
    setFormHours("");
    setFormType("chapter");
    const defaultSubj = activeSubject
      ? String(activeSubject.id || activeSubject.value)
      : (subjectOptions[0] ? String(subjectOptions[0].id || subjectOptions[0].value) : "");
    setFormSubjectId(defaultSubj);
    setEditModalOpen(true);
  };

  // Open Add Topic modal under a Unit & Chapter
  const handleOpenAddTopic = (unitId: string, chapterId?: string) => {
    setEditingNode(null);
    setParentModuleId(unitId);
    setSelectedChapterId(chapterId || "");
    setFormTitle("");
    setFormDescription("");
    setFormHours("");
    setFormType("topic");
    const defaultSubj = activeSubject
      ? String(activeSubject.id || activeSubject.value)
      : (subjectOptions[0] ? String(subjectOptions[0].id || subjectOptions[0].value) : "");
    setFormSubjectId(defaultSubj);
    setEditModalOpen(true);
  };

  const handleOpenEdit = (
    node: EditableSyllabusTopic,
    unitId: string | null = null,
    chapterId: string | null = null
  ) => {
    setEditingNode(node);
    setParentModuleId(unitId);
    setSelectedChapterId(chapterId || "");
    setFormTitle(node.title);
    setFormDescription(node.description || "");
    setFormHours(node.estimated_hours != null ? String(node.estimated_hours) : "");
    const detectedType = node.node_type === "chapter" ? "chapter" : (node.node_type === "topic" || node.node_type === "subtopic" ? "topic" : "unit");
    setFormType(detectedType as any);
    setFormSubjectId(
      node.subject_id
        ? String(node.subject_id)
        : (activeSubject ? String(activeSubject.id) : (subjectOptions[0] ? String(subjectOptions[0].id) : ""))
    );
    setEditModalOpen(true);
  };

  const handleSaveNode = () => {
    if (!formTitle.trim()) {
      toast.error("Title is required");
      return;
    }

    const hours = formHours.trim() ? Number(formHours.trim()) : null;
    const selectedSubjObj = subjectOptions.find(
      (s) => String(s.id) === String(formSubjectId) || String(s.value) === String(formSubjectId)
    ) || activeSubject;
    const subjectIdVal = selectedSubjObj ? selectedSubjObj.id : (formSubjectId ? formSubjectId : undefined);
    const subjectNameVal = selectedSubjObj?.label;

    if (editingNode) {
      // 1. Updating an existing node
      const next = syllabusNodes.map((unit) => {
        // Is editing root unit?
        if (unit.id === editingNode.id) {
          return {
            ...unit,
            subject_id: subjectIdVal,
            subject_name: subjectNameVal,
            title: formTitle.trim(),
            description: formDescription.trim(),
            estimated_hours: hours,
            node_type: formType,
          };
        }

        // Is editing chapter or topic within this unit?
        if (unit.children && unit.children.length > 0) {
          const updatedChildren = unit.children.map((chap) => {
            if (chap.id === editingNode.id) {
              return {
                ...chap,
                title: formTitle.trim(),
                description: formDescription.trim(),
                estimated_hours: hours,
                node_type: formType,
              };
            }

            if (chap.children && chap.children.length > 0) {
              const updatedTopics = chap.children.map((top) => {
                if (top.id === editingNode.id) {
                  return {
                    ...top,
                    title: formTitle.trim(),
                    description: formDescription.trim(),
                    estimated_hours: hours,
                    node_type: formType,
                  };
                }
                return top;
              });
              return { ...chap, children: updatedTopics };
            }

            return chap;
          });

          return { ...unit, children: updatedChildren };
        }

        return unit;
      });

      onSyllabusNodesChange(next);
      toast.success("Saved changes");
    } else {
      // 2. Creating a new node
      if (formType === "unit" || (!parentModuleId && formType !== "chapter" && formType !== "topic")) {
        // Add new Unit (Main level)
        const newUnit: EditableSyllabusTopic = {
          id: `unit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          subject_id: subjectIdVal,
          subject_name: subjectNameVal,
          title: formTitle.trim(),
          description: formDescription.trim(),
          estimated_hours: hours,
          node_type: "unit",
          sort_order: (syllabusNodes.length + 1) * 10,
          children: [],
        };
        onSyllabusNodesChange([...syllabusNodes, newUnit]);
        toast.success("Unit created successfully");
      } else if (formType === "chapter") {
        // Add Chapter to parent Unit
        const targetUnitId = parentModuleId || (displayedNodes[0]?.id);
        if (!targetUnitId) {
          toast.error("Please create a Unit first before adding a Chapter");
          return;
        }

        const newChapter: EditableSyllabusTopic = {
          id: `chap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: formTitle.trim(),
          description: formDescription.trim(),
          estimated_hours: hours,
          node_type: "chapter",
          sort_order: 10,
          children: [],
        };

        const next = syllabusNodes.map((unit) => {
          if (unit.id === targetUnitId) {
            return {
              ...unit,
              children: [...(unit.children || []), newChapter],
            };
          }
          return unit;
        });

        onSyllabusNodesChange(next);
        toast.success("Chapter added to Unit");
      } else {
        // formType === "topic"
        const targetUnitId = parentModuleId || (displayedNodes[0]?.id);
        if (!targetUnitId) {
          toast.error("Please create a Unit and Chapter first before adding a Topic");
          return;
        }

        const newTopic: EditableSyllabusTopic = {
          id: `top-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: formTitle.trim(),
          description: formDescription.trim(),
          estimated_hours: hours,
          node_type: "topic",
          sort_order: 10,
        };

        const next = syllabusNodes.map((unit) => {
          if (unit.id === targetUnitId) {
            const chapters = unit.children || [];
            
            if (selectedChapterId) {
              const updatedChaps = chapters.map((chap) => {
                if (chap.id === selectedChapterId) {
                  return {
                    ...chap,
                    children: [...(chap.children || []), newTopic],
                  };
                }
                return chap;
              });
              return { ...unit, children: updatedChaps };
            } else if (chapters.length > 0 && (chapters[0].node_type === "chapter" || (chapters[0].children && chapters[0].children.length > 0))) {
              const updatedChaps = chapters.map((chap, i) => i === 0 ? { ...chap, children: [...(chap.children || []), newTopic] } : chap);
              return { ...unit, children: updatedChaps };
            } else {
              return { ...unit, children: [...chapters, newTopic] };
            }
          }
          return unit;
        });

        onSyllabusNodesChange(next);
        toast.success("Topic added");
      }
    }

    setEditModalOpen(false);
  };

  const handleDeleteUnit = (unitId: string) => {
    onSyllabusNodesChange(syllabusNodes.filter((m) => m.id !== unitId));
    toast.success("Unit removed");
  };

  const handleDeleteChapter = (unitId: string, chapterId: string) => {
    const next = syllabusNodes.map((unit) => {
      if (unit.id === unitId) {
        return {
          ...unit,
          children: (unit.children || []).filter((ch) => ch.id !== chapterId),
        };
      }
      return unit;
    });
    onSyllabusNodesChange(next);
    toast.success("Chapter removed");
  };

  const handleDeleteTopic = (unitId: string, chapterId: string | null, topicId: string) => {
    const next = syllabusNodes.map((unit) => {
      if (unit.id === unitId) {
        if (chapterId) {
          const updatedChaps = (unit.children || []).map((chap) => {
            if (chap.id === chapterId) {
              return {
                ...chap,
                children: (chap.children || []).filter((t) => t.id !== topicId),
              };
            }
            return chap;
          });
          return { ...unit, children: updatedChaps };
        } else {
          return {
            ...unit,
            children: (unit.children || []).filter((t) => t.id !== topicId),
          };
        }
      }
      return unit;
    });
    onSyllabusNodesChange(next);
    toast.success("Topic removed");
  };

  // Populate Default Starter Structure for the active subject
  const handleLoadDefaultTemplate = () => {
    const subjLabel = activeSubject?.label || categoryName || "Program Curriculum";
    const subjId = activeSubject?.id;
    const starter: EditableSyllabusTopic[] = [
      {
        id: `unit-starter-1-${Date.now()}`,
        subject_id: subjId,
        subject_name: subjLabel,
        title: `Unit 1: Foundations & Core Principles of ${subjLabel}`,
        description: "Introduction, theoretical basics, and foundational terminology.",
        node_type: "unit",
        estimated_hours: 20,
        sort_order: 10,
        children: [
          {
            id: `chap-starter-1-1-${Date.now()}`,
            subject_id: subjId,
            subject_name: subjLabel,
            title: "Chapter 1.1: Core Methodologies & Frameworks",
            description: "Essential fundamental concepts and analytical frameworks.",
            node_type: "chapter",
            estimated_hours: 10,
            sort_order: 10,
            children: [
              {
                id: `top-starter-1-1-1-${Date.now()}`,
                title: "Topic 1.1.1: Overview of Concepts",
                description: "Basic introductory definitions and core formulas.",
                node_type: "topic",
                estimated_hours: 5,
                sort_order: 10,
              },
            ],
          },
        ],
      },
    ];
    
    // Replace or append for this subject
    const nextNodes = [
      ...syllabusNodes.filter(
        (n) => !subjId || (String(n.subject_id) !== String(subjId) && n.subject_name?.toLowerCase() !== subjLabel.toLowerCase())
      ),
      ...starter,
    ];
    onSyllabusNodesChange(nextNodes);
    toast.success(`Loaded starter curriculum for ${subjLabel}`);
  };

  // Filtered displayed nodes strictly based on active subject tab
  const displayedNodes = useMemo(() => {
    if (!activeSubject) return syllabusNodes;
    const activeIdStr = String(activeSubject.id || activeSubject.value || "");
    const activeLabelLower = (activeSubject.label || "").toLowerCase().trim();

    return syllabusNodes.filter((m) => {
      const nodeSubjIdStr = m.subject_id != null ? String(m.subject_id) : "";
      const nodeSubjNameLower = (m.subject_name || "").toLowerCase().trim();

      // Direct ID / value match
      if (activeIdStr && nodeSubjIdStr && (nodeSubjIdStr === activeIdStr || nodeSubjIdStr === String(activeSubject.id) || nodeSubjIdStr === String(activeSubject.value))) {
        return true;
      }

      // Label match (exact or substring/fuzzy match)
      if (activeLabelLower && nodeSubjNameLower) {
        if (nodeSubjNameLower === activeLabelLower) return true;
        if (nodeSubjNameLower.includes(activeLabelLower) || activeLabelLower.includes(nodeSubjNameLower)) return true;
      }

      // If only 1 subject exists in the program and node has no explicit mismatch
      if (subjectOptions.length === 1 && !nodeSubjIdStr) return true;

      return false;
    });
  }, [syllabusNodes, activeSubject, subjectOptions.length]);

  const currentSubjectUnits = useMemo(() => {
    return displayedNodes;
  }, [displayedNodes]);

  const availableChaptersForSelectedUnit = useMemo(() => {
    const targetUnit = currentSubjectUnits.find((u) => u.id === (parentModuleId || currentSubjectUnits[0]?.id));
    return (targetUnit?.children || []).filter((c) => c.node_type === "chapter" || (c.children && c.children.length > 0));
  }, [currentSubjectUnits, parentModuleId]);

  const totalEstimatedHours = displayedNodes.reduce((acc, unit) => {
    let unitHours = unit.estimated_hours || 0;
    let chaptersTotal = 0;
    for (const chap of unit.children || []) {
      const chapHours = chap.estimated_hours || 0;
      const topicsTotal = (chap.children || []).reduce((tAcc, t) => tAcc + (t.estimated_hours || 0), 0);
      chaptersTotal += Math.max(chapHours, topicsTotal);
    }
    return acc + Math.max(unitHours, chaptersTotal);
  }, 0);

  const totalTopicsCount = displayedNodes.reduce((acc, unit) => {
    const chapters = unit.children || [];
    let count = 0;
    for (const chap of chapters) {
      if (chap.children && chap.children.length > 0) {
        count += chap.children.length;
      } else {
        count += 1;
      }
    }
    return acc + count;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Subject-Wise Tabs (No "All Subjects" Option - Pure Subject Basis) */}
      {subjectOptions.length > 0 ? (
        <div className="p-3 rounded-2xl bg-muted/20 border border-border/80 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                Curriculum Subjects:
              </span>
              <Badge variant="secondary" className="text-[10px] font-bold bg-background">
                {subjectOptions.length} {subjectOptions.length === 1 ? "Subject" : "Subjects"}
              </Badge>
              {templateSource && (
                <Badge variant="secondary" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> {templateSource}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            {subjectOptions.map((subj) => {
              const subjIdStr = String(subj.id || subj.value || "");
              const subjNameLower = (subj.label || "").toLowerCase().trim();
              const count = syllabusNodes.filter((n) => {
                const nIdStr = n.subject_id != null ? String(n.subject_id) : "";
                const nNameLower = (n.subject_name || "").toLowerCase().trim();
                if (subjIdStr && nIdStr && (nIdStr === subjIdStr || nIdStr === String(subj.id) || nIdStr === String(subj.value))) return true;
                if (subjNameLower && nNameLower) {
                  return nNameLower === subjNameLower || nNameLower.includes(subjNameLower) || subjNameLower.includes(nNameLower);
                }
                return false;
              }).length;
              const isSelected = String(filterSubjectId) === String(subj.id) || String(filterSubjectId) === String(subj.value);
              return (
                <button
                  key={subj.id || subj.value}
                  type="button"
                  onClick={() => setFilterSubjectId(String(subj.id || subj.value))}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 flex items-center gap-2 text-xs cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>{subj.label}</span>
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? "bg-primary-foreground/25 text-primary-foreground"
                        : "bg-muted text-muted-foreground border border-border/60"
                    }`}
                  >
                    {count} {count === 1 ? "Module" : "Modules"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 shrink-0" />
          <span>Please select subjects in <strong>Step 0 (Basic Information)</strong> to organize the syllabus by subject.</span>
        </div>
      )}

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-card border border-border/70 text-left shadow-2xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Active Subject</span>
          <p className="text-sm font-extrabold text-foreground mt-1 truncate">
            {activeSubject?.label || "General Curriculum"}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border/70 text-left shadow-2xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Modules / Units</span>
          <p className="text-lg font-black text-foreground mt-0.5">{displayedNodes.length}</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border/70 text-left shadow-2xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Topics</span>
          <p className="text-lg font-black text-foreground mt-0.5">{totalTopicsCount}</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border/70 text-left shadow-2xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Estimated Hours</span>
          <p className="text-lg font-black text-primary mt-0.5">{totalEstimatedHours} Hrs</p>
        </div>
      </div>

      {/* Syllabus Nodes List */}
      <div className="space-y-3.5">
        {displayedNodes.length > 0 && (
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                {activeSubject?.label ? `${activeSubject.label} Modules` : "Curriculum Modules"}
              </h4>
              <Badge variant="secondary" className="text-[10px] font-bold">
                {displayedNodes.length} {displayedNodes.length === 1 ? "Module" : "Modules"}
              </Badge>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 border rounded-2xl bg-muted/10 border-dashed">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-semibold text-muted-foreground">Fetching platform master syllabus from database...</p>
          </div>
        ) : displayedNodes.length > 0 ? (
          displayedNodes.map((unit, unitIdx) => (
            <div
              key={unit.id}
              className="border border-border/90 rounded-2xl bg-card overflow-hidden shadow-xs hover:border-primary/40 transition-all space-y-0"
            >
              {/* ─── LEVEL 1: UNIT / MODULE HEADER BAR ─── */}
              <div className="p-3.5 sm:p-4 bg-muted/30 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-extrabold uppercase bg-primary/10 text-primary border-primary/20">
                      Unit {unitIdx + 1}
                    </Badge>
                    {unit.subject_name && (
                      <Badge variant="secondary" className="text-[10px] font-bold bg-violet-500/10 text-violet-600 border border-violet-500/20 flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {unit.subject_name}
                      </Badge>
                    )}
                    <h4 className="font-extrabold text-sm text-foreground">{unit.title}</h4>
                  </div>
                  {unit.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{unit.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {unit.estimated_hours ? (
                    <Badge variant="secondary" className="text-[10px] font-medium bg-background text-muted-foreground mr-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {unit.estimated_hours} hrs
                    </Badge>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(unit, null)}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    title="Edit Unit"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteUnit(unit.id)}
                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                    title="Delete Unit"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* ─── LEVEL 2 & 3: CHAPTERS & TOPICS ─── */}
              <div className="p-3 space-y-2.5">
                {unit.children && unit.children.length > 0 ? (
                  unit.children.map((child, chapIdx) => {
                    const isChapter = child.node_type === "chapter" || (child.children && child.children.length > 0);
                    
                    if (isChapter) {
                      return (
                        <div
                          key={child.id}
                          className="border border-border/70 rounded-xl bg-background overflow-hidden space-y-0"
                        >
                          <div className="p-2.5 bg-muted/20 flex items-center justify-between gap-2 border-b border-border/40">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[9px] font-bold bg-muted text-muted-foreground uppercase">
                                Chap {chapIdx + 1}
                              </Badge>
                              <h5 className="font-bold text-xs text-foreground">{child.title}</h5>
                            </div>
                            <div className="flex items-center gap-1">
                              {child.estimated_hours ? (
                                <span className="text-[10px] text-muted-foreground font-mono mr-1">
                                  {child.estimated_hours}h
                                </span>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenAddTopic(unit.id, child.id)}
                                className="h-6 text-[11px] font-semibold text-primary hover:bg-primary/10 px-1.5"
                              >
                                <Plus className="h-2.5 w-2.5 mr-0.5" /> Topic
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(child, unit.id)}
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                title="Edit Chapter"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteChapter(unit.id, child.id)}
                                className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                title="Delete Chapter"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="p-2 space-y-1.5 bg-muted/5">
                            {child.children && child.children.length > 0 ? (
                              child.children.map((topic, topIdx) => (
                                <div
                                  key={topic.id}
                                  className="p-2 rounded-lg bg-card border border-border/50 hover:border-primary/30 flex items-center justify-between gap-2 group transition-all"
                                >
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-bold text-muted-foreground shrink-0 font-mono">
                                        #{chapIdx + 1}.{topIdx + 1}
                                      </span>
                                      <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                                        {topic.title}
                                      </p>
                                    </div>
                                    {topic.description && (
                                      <p className="text-[11px] text-muted-foreground pl-6">{topic.description}</p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                    {topic.estimated_hours ? (
                                      <span className="text-[10px] text-muted-foreground font-mono mr-1">
                                        {topic.estimated_hours}h
                                      </span>
                                    ) : null}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleOpenEdit(topic, unit.id, child.id)}
                                      className="h-5.5 w-5.5 text-muted-foreground hover:text-foreground"
                                      title="Edit Topic"
                                    >
                                      <Edit2 className="h-2.5 w-2.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteTopic(unit.id, child.id, topic.id)}
                                      className="h-5.5 w-5.5 text-destructive hover:bg-destructive/10"
                                      title="Delete Topic"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="py-2 text-center">
                                <p className="text-[11px] text-muted-foreground">
                                  No topics in this chapter yet.{" "}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddTopic(unit.id, child.id)}
                                    className="text-primary font-bold hover:underline"
                                  >
                                    + Add first topic
                                  </button>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Direct topic under Unit (Level 2 fallback)
                    return (
                      <div
                        key={child.id}
                        className="p-2 rounded-xl bg-background border border-border/60 hover:border-primary/30 flex items-center justify-between gap-2 transition-all"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] font-bold uppercase bg-muted text-muted-foreground">
                              Topic {chapIdx + 1}
                            </Badge>
                            <span className="text-xs font-semibold text-foreground">{child.title}</span>
                          </div>
                          {child.description && (
                            <p className="text-[11px] text-muted-foreground pl-2">{child.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {child.estimated_hours ? (
                            <span className="text-[10px] text-muted-foreground font-mono mr-1">
                              {child.estimated_hours}h
                            </span>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(child, unit.id)}
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            title="Edit Topic"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTopic(unit.id, null, child.id)}
                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                            title="Delete Topic"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-4 text-center border border-dashed rounded-xl bg-muted/10">
                    <p className="text-xs text-muted-foreground">
                      No chapters or topics added under this Unit yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 px-4 text-center space-y-3 border rounded-2xl bg-card border-dashed">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-foreground text-sm">
                No Syllabus Configured for {activeSubject?.label || "this subject"}
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                No master syllabus has been configured by the platform admin for <strong>{activeSubject?.label || "this subject"}</strong> yet.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Marketplace Syllabus Picker Modal (Multiple Subjects Enabled) ─── */}
      <Dialog open={marketplaceModalOpen} onOpenChange={setMarketplaceModalOpen}>
        <DialogContent className="sm:max-w-3xl! max-h-[88vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              <DialogTitle className="text-lg font-bold">
                Marketplace & Admin Syllabus Templates
              </DialogTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Import accredited subject syllabi for <strong>{getCleanClassName(categoryName) || "this class"}</strong>. You can import multiple subject syllabi together into this program.
            </p>
          </DialogHeader>

          {/* Search & Bulk Action Header */}
          <div className="space-y-2.5 py-1">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={marketplaceSearch}
                  onChange={(e) => {
                    setMarketplaceSearch(e.target.value);
                    fetchMarketplaceTemplates(e.target.value);
                  }}
                  placeholder="Search marketplace syllabi by subject, class, or board..."
                  className="pl-9 text-sm"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchMarketplaceTemplates(marketplaceSearch)}
                className="h-10 text-xs font-semibold"
              >
                Search
              </Button>
            </div>

            {marketplaceTemplates.length > 0 && (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/70 flex-wrap">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={
                      selectedTemplateIds.length === marketplaceTemplates.length &&
                      marketplaceTemplates.length > 0
                    }
                    onCheckedChange={toggleSelectAll}
                    id="select-all-templates"
                  />
                  <Label htmlFor="select-all-templates" className="text-xs font-bold cursor-pointer">
                    Select All ({marketplaceTemplates.length} subjects available)
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  {selectedTemplateIds.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleBulkImportSelected}
                      disabled={bulkImporting}
                      className="text-xs font-bold bg-primary text-primary-foreground h-8 gap-1.5"
                    >
                      {bulkImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ListPlus className="h-3.5 w-3.5" />}
                      Import Selected ({selectedTemplateIds.length}) Syllabi
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleImportAllAvailable}
                    disabled={bulkImporting}
                    className="text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 h-8 gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Import All Available ({marketplaceTemplates.length})
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Templates List */}
          <div className="space-y-3 py-2">
            {marketplaceLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Loading marketplace syllabi...</span>
              </div>
            ) : marketplaceTemplates.length > 0 ? (
              marketplaceTemplates.map((tpl) => {
                const isPreviewing = previewSyllabusId === tpl.id;
                const isSelected = selectedTemplateIds.includes(tpl.id);
                const isAlreadyImported = syllabusNodes.some(
                  (n) => String(n.subject_id) === String(tpl.subject_id) || (n.subject_name && n.subject_name.toLowerCase() === (tpl.subject_name || "").toLowerCase())
                );

                return (
                  <div
                    key={tpl.id}
                    className={`p-4 rounded-xl border transition-all space-y-3 ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card/60 hover:bg-muted/20"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleTemplateSelection(tpl.id)}
                          className="mt-1"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-extrabold text-foreground">{tpl.title}</h4>
                            {tpl.subject_name && (
                              <Badge variant="secondary" className="text-[10px] font-bold bg-violet-500/10 text-violet-600 border border-violet-500/20">
                                <GraduationCap className="h-3 w-3 mr-1" />
                                {tpl.subject_name}
                              </Badge>
                            )}
                            {tpl.board_name && (
                              <Badge variant="secondary" className="text-[10px]">
                                {tpl.board_name}
                              </Badge>
                            )}
                            {isAlreadyImported && (
                              <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                <Check className="h-3 w-3 mr-1" /> In Curriculum
                              </Badge>
                            )}
                          </div>
                          {tpl.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreviewSyllabusTree(tpl.id)}
                          className="h-8 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {previewLoading && isPreviewing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <Eye className="h-3.5 w-3.5 mr-1" />
                          )}
                          {isPreviewing ? "Hide Preview" : "Preview"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleApplyMarketplaceTemplate(tpl)}
                          className="h-8 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {isAlreadyImported ? "Re-import Subject" : "Import Subject"}
                        </Button>
                      </div>
                    </div>

                    {/* Expandable Preview Structure */}
                    {isPreviewing && (
                      <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60 space-y-2 mt-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Syllabus Structure Preview:
                        </span>
                        {previewNodes.length > 0 ? (
                          <div className="space-y-1.5">
                            {previewNodes.map((pMod, pIdx) => (
                              <div key={pMod.id} className="text-xs">
                                <span className="font-bold text-foreground">
                                  {pIdx + 1}. {pMod.title}
                                </span>
                                {pMod.children && pMod.children.length > 0 && (
                                  <ul className="pl-4 pt-1 space-y-0.5 text-muted-foreground list-disc list-inside">
                                    {pMod.children.map((pTop) => (
                                      <li key={pTop.id} className="text-[11px]">
                                        {pTop.title} {pTop.estimated_hours ? `(${pTop.estimated_hours}h)` : ""}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            Standard modular structure with core analytical and practical units will be imported.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-10 px-4 text-center space-y-3 border rounded-2xl border-dashed bg-muted/10">
                <BookMarked className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">
                    No marketplace syllabus found for {getCleanClassName(categoryName) || "this class"}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Only templates strictly belonging to this selected class are displayed. You can generate a standard starter curriculum or add modules manually.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    handleLoadDefaultTemplate();
                    setMarketplaceModalOpen(false);
                  }}
                  className="text-xs font-bold bg-primary text-primary-foreground gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate {getCleanClassName(categoryName) || "Class"} Starter Curriculum
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMarketplaceModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add / Edit Modal (Unit / Chapter / Topic Select Enabled) ─── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <BookMarked className="h-4 w-4 text-primary" />
              {editingNode
                ? `Edit ${formType === "unit" ? "Unit" : formType === "chapter" ? "Chapter" : "Topic"}`
                : `Add New ${formType === "unit" ? "Unit" : formType === "chapter" ? "Chapter" : "Topic"}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 1. Item Level / Type Selector at the TOP */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Item Level / Type *</Label>
              <Select
                value={formType}
                onValueChange={(val: any) => {
                  setFormType(val);
                  if (val === "unit") {
                    setParentModuleId(null);
                    setSelectedChapterId("");
                  } else if (val === "chapter") {
                    setSelectedChapterId("");
                    if (!parentModuleId && currentSubjectUnits.length > 0) {
                      setParentModuleId(currentSubjectUnits[0].id);
                    }
                  } else if (val === "topic") {
                    if (!parentModuleId && currentSubjectUnits.length > 0) {
                      setParentModuleId(currentSubjectUnits[0].id);
                      const u = currentSubjectUnits[0];
                      const chaps = (u.children || []).filter(
                        (c) => c.node_type === "chapter" || (c.children && c.children.length > 0)
                      );
                      if (chaps.length > 0) {
                        setSelectedChapterId(chaps[0].id);
                      }
                    }
                  }
                }}
              >
                <SelectTrigger className="text-sm bg-background border-border font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unit">
                    <span className="font-bold flex items-center gap-2">
                      📦 Unit / Module <span className="text-xs font-normal text-muted-foreground">(Main Level)</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="chapter">
                    <span className="font-bold flex items-center gap-2">
                      📖 Chapter <span className="text-xs font-normal text-muted-foreground">(Sub-part of Unit)</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="topic">
                    <span className="font-bold flex items-center gap-2">
                      📝 Topic <span className="text-xs font-normal text-muted-foreground">(Sub-part of Chapter)</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 2. If Unit: Curriculum Subject Selector */}
            {formType === "unit" && (
              <div className="space-y-1.5 animate-in fade-in">
                <Label className="text-xs font-bold">Curriculum Subject *</Label>
                {subjectOptions.length > 0 ? (
                  <Select value={formSubjectId} onValueChange={setFormSubjectId}>
                    <SelectTrigger className="text-sm bg-background border-border">
                      <SelectValue placeholder="Select subject for this unit..." />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectOptions.map((s) => (
                        <SelectItem key={s.id || s.value} value={String(s.id || s.value)}>
                          <span className="flex items-center gap-2">
                            <GraduationCap className="h-3.5 w-3.5 text-primary" />
                            <span>{s.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600">
                    No curriculum subjects selected in Step 1. Unit will be assigned to General Curriculum.
                  </div>
                )}
              </div>
            )}

            {/* 3. If Chapter: Select Parent Unit */}
            {formType === "chapter" && (
              <div className="space-y-1.5 animate-in fade-in">
                <Label className="text-xs font-bold">Select Parent Unit *</Label>
                {currentSubjectUnits.length > 0 ? (
                  <Select
                    value={parentModuleId || currentSubjectUnits[0]?.id || ""}
                    onValueChange={(val) => setParentModuleId(val)}
                  >
                    <SelectTrigger className="text-sm bg-background">
                      <SelectValue placeholder="Select parent unit..." />
                    </SelectTrigger>
                    <SelectContent>
                      {currentSubjectUnits.map((u, i) => (
                        <SelectItem key={u.id} value={u.id}>
                          Unit {i + 1}: {u.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 font-semibold">
                    ⚠️ Please create a Unit first before adding chapters.
                  </div>
                )}
              </div>
            )}

            {/* 4. If Topic: Select Parent Unit AND Parent Chapter */}
            {formType === "topic" && (
              <div className="space-y-3 animate-in fade-in">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Parent Unit *</Label>
                  {currentSubjectUnits.length > 0 ? (
                    <Select
                      value={parentModuleId || currentSubjectUnits[0]?.id || ""}
                      onValueChange={(val) => {
                        setParentModuleId(val);
                        const unitObj = currentSubjectUnits.find((u) => u.id === val);
                        const chaps = (unitObj?.children || []).filter(
                          (c) => c.node_type === "chapter" || (c.children && c.children.length > 0)
                        );
                        setSelectedChapterId(chaps[0]?.id || "");
                      }}
                    >
                      <SelectTrigger className="text-sm bg-background">
                        <SelectValue placeholder="Select unit..." />
                      </SelectTrigger>
                      <SelectContent>
                        {currentSubjectUnits.map((u, i) => (
                          <SelectItem key={u.id} value={u.id}>
                            Unit {i + 1}: {u.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 font-semibold">
                      ⚠️ Please create a Unit first.
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Parent Chapter (Optional)</Label>
                  {availableChaptersForSelectedUnit.length > 0 ? (
                    <Select
                      value={selectedChapterId || availableChaptersForSelectedUnit[0]?.id || ""}
                      onValueChange={(val) => setSelectedChapterId(val)}
                    >
                      <SelectTrigger className="text-sm bg-background">
                        <SelectValue placeholder="Select Chapter..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableChaptersForSelectedUnit.map((c, i) => (
                          <SelectItem key={c.id} value={c.id}>
                            Chapter {i + 1}: {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 rounded-lg bg-muted/40 text-muted-foreground text-xs">
                      No chapter created under this unit yet. Topic will be added directly under the Unit.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. Title input with dynamic placeholder */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">
                {formType === "unit" ? "Unit Title *" : formType === "chapter" ? "Chapter Title *" : "Topic Title *"}
              </Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={
                  formType === "unit"
                    ? "e.g. Unit 1: Foundations & Core Principles"
                    : formType === "chapter"
                    ? "e.g. Chapter 1.1: Introduction to Mechanics"
                    : "e.g. Topic 1.1.1: Newton's Laws & Inertia"
                }
                className="text-sm"
              />
            </div>

            {/* 6. Estimated Hours */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Estimated Hours (Optional)</Label>
              <Input
                type="number"
                min={1}
                value={formHours}
                onChange={(e) => setFormHours(e.target.value)}
                placeholder="e.g. 12"
                className="text-sm"
              />
            </div>

            {/* 7. Description / Objectives */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Description / Learning Objectives</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Summary of topics, key competencies, and practical assignments..."
                rows={3}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveNode}
              className="bg-primary text-primary-foreground font-bold"
            >
              {editingNode ? "Update Item" : "Save Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
