"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  CircleAlert,
  List,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  DocumentFileUpload,
  type UploadedDocumentFile,
} from "@/components/shared/document-file-upload";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  ExamQuestionType,
  ExamQuestion,
  ExamRow,
} from "@/lib/types/exam";

type EditorQuestion = ExamQuestion & {
  client_id: string;
  open: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string | null;
  template: ExamRow;
  onSaved: () => void;
};

function newQuestion(clientId: string): EditorQuestion {
  return {
    client_id: clientId,
    question_text: "",
    question_type: "true_false",
    marks: 1,
    display_order: 1,
    options: [
      { text: "True", is_correct: true },
      { text: "False", is_correct: false },
    ],
    files: [],
    open: true,
  };
}

function toUploadFiles(
  files: ExamQuestion["files"]
): UploadedDocumentFile[] {
  return files.map((file) => ({
    url: file.url,
    publicId: file.publicId ?? "",
    resourceType: file.resourceType ?? "image",
    fileType: file.fileType ?? "image/*",
    name: file.name,
    size: file.size,
  }));
}

function readJson(res: Response) {
  return res.text().then((text) => {
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { error: "Server returned an invalid response" };
    }
  });
}

export function ExamQuestionEditor({
  open,
  onOpenChange,
  accessToken,
  template,
  onSaved,
}: Props) {
  const counter = useRef(0);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const questionRefs = useRef(new Map<string, HTMLDivElement>());
  const nextId = () => `question-${Date.now()}-${++counter.current}`;
  const [questions, setQuestions] = useState<EditorQuestion[]>([
    newQuestion("initial"),
  ]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [pendingScrollQuestionId, setPendingScrollQuestionId] = useState<
    string | null
  >(null);

  function scrollInsideEditor(target: HTMLElement | null) {
    const container = scrollAreaRef.current;
    if (!container || !target) return;
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    container.scrollTo({
      top: container.scrollTop + targetRect.top - containerRect.top - 16,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      setErrors([]);
      if ((template.questions?.length ?? 0) > 0) {
        setQuestions(
          (template.questions ?? []).map((question, index) => ({
            ...question,
            question_type:
              template.instant_result && question.question_type === "subjective"
                ? "true_false"
                : question.question_type,
            options:
              template.instant_result && question.question_type === "subjective"
                ? [
                    { text: "True", is_correct: true },
                    { text: "False", is_correct: false },
                  ]
                : question.options,
            client_id: question.client_id ?? `existing-${question.id ?? index}`,
            marks: Number(question.marks),
            files: toUploadFiles(question.files),
            open: index === 0,
          }))
        );
      } else {
        setQuestions([newQuestion(`question-${Date.now()}-${++counter.current}`)]);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [open, template]);

  useEffect(() => {
    if (!pendingScrollQuestionId) return;
    const frame = window.requestAnimationFrame(() => {
      scrollInsideEditor(
        questionRefs.current.get(pendingScrollQuestionId) ?? null
      );
      setPendingScrollQuestionId(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingScrollQuestionId, questions]);

  const questionMarks = useMemo(
    () =>
      Number(
        questions
          .reduce((sum, question) => sum + (Number(question.marks) || 0), 0)
          .toFixed(2)
      ),
    [questions]
  );
  const expectedMarks = Number(template.total_marks) || 0;
  const marksMatch = expectedMarks > 0 && expectedMarks === questionMarks;

  function updateQuestion(
    id: string,
    updater: (question: EditorQuestion) => EditorQuestion
  ) {
    setQuestions((current) =>
      current.map((question) =>
        question.client_id === id ? updater(question) : question
      )
    );
  }

  function changeQuestionType(id: string, questionType: ExamQuestionType) {
    updateQuestion(id, (question) => ({
      ...question,
      question_type: questionType,
      options:
        questionType === "true_false"
          ? [
              { text: "True", is_correct: true },
              { text: "False", is_correct: false },
            ]
          : questionType === "objective"
            ? [
                { text: "", is_correct: true },
                { text: "", is_correct: false },
                { text: "", is_correct: false },
              ]
            : [],
    }));
  }

  function validate() {
    const nextErrors: string[] = [];
    let firstInvalidQuestionId: string | null = null;
    if (!marksMatch) {
      nextErrors.push(
        `Total marks (${expectedMarks.toFixed(2)}) must equal all question marks (${questionMarks.toFixed(2)}).`
      );
    }
    if (questions.length === 0) nextErrors.push("Add at least one question.");

    questions.forEach((question, index) => {
      let questionInvalid = false;
      if (!question.question_text.trim()) {
        nextErrors.push(`Question ${index + 1}: question text is required.`);
        questionInvalid = true;
      }
      if (!Number.isFinite(Number(question.marks)) || Number(question.marks) <= 0) {
        nextErrors.push(`Question ${index + 1}: marks must be greater than zero.`);
        questionInvalid = true;
      }
      if (question.files.length > 5) {
        nextErrors.push(`Question ${index + 1}: only 5 images are allowed.`);
        questionInvalid = true;
      }
      if (question.question_type === "objective") {
        if (question.options.length < 2) {
          nextErrors.push(`Question ${index + 1}: add at least two options.`);
          questionInvalid = true;
        }
        if (question.options.some((option) => !option.text.trim())) {
          nextErrors.push(`Question ${index + 1}: all options are required.`);
          questionInvalid = true;
        }
        if (question.options.filter((option) => option.is_correct).length !== 1) {
          nextErrors.push(
            `Question ${index + 1}: select exactly one correct answer.`
          );
          questionInvalid = true;
        }
      }
      if (
        question.question_type === "true_false" &&
        question.options.filter((option) => option.is_correct).length !== 1
      ) {
        nextErrors.push(`Question ${index + 1}: select True or False.`);
        questionInvalid = true;
      }
      if (template.instant_result && question.question_type === "subjective") {
        nextErrors.push(
          `Question ${index + 1}: subjective questions require a result date instead of instant result.`
        );
        questionInvalid = true;
      }
      if (questionInvalid && !firstInvalidQuestionId) {
        firstInvalidQuestionId = question.client_id;
      }
    });
    setErrors(nextErrors);
    if (nextErrors.length > 0) {
      if (firstInvalidQuestionId) {
        setQuestions((current) =>
          current.map((question) =>
            question.client_id === firstInvalidQuestionId
              ? { ...question, open: true }
              : question
          )
        );
        setPendingScrollQuestionId(firstInvalidQuestionId);
      } else {
        window.requestAnimationFrame(() =>
          scrollInsideEditor(errorSummaryRef.current)
        );
      }
    }
    return nextErrors.length === 0;
  }

  function addQuestion() {
    const clientId = nextId();
    setQuestions((current) => [
      ...current.map((question) => ({ ...question, open: false })),
      {
        ...newQuestion(clientId),
        display_order: current.length + 1,
      },
    ]);
    setPendingScrollQuestionId(clientId);
  }

  async function generateWithAi() {
    if (!accessToken || generatingAi) return;
    setGeneratingAi(true);
    try {
      const res = await fetch(
        `/api/admin/master-data/exams/${template.id}/questions/generate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );
      const json = await readJson(res);
      if (!res.ok) {
        if (
          json.code === "AI_PROVIDER_NOT_CONFIGURED" ||
          /api key/i.test(json.error ?? "")
        ) {
          toast.error("Configure API key first");
          window.setTimeout(() => {
            window.location.href = json.redirectTo ?? "/admin/ai-settings";
          }, 450);
          return;
        }
        throw new Error(json.error ?? "Failed to generate questions");
      }
      const generated = (json.data ?? []) as ExamQuestion[];
      if (generated.length === 0) throw new Error("AI did not return questions");
      setQuestions(
        generated.map((question, index) => ({
          ...question,
          client_id: question.client_id ?? `ai-${Date.now()}-${index}`,
          marks: Number(question.marks),
          files: toUploadFiles(question.files ?? []),
          open: index === 0,
        }))
      );
      setErrors([]);
      toast.success("AI questions generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate questions");
    } finally {
      setGeneratingAi(false);
    }
  }

  async function save() {
    if (!accessToken || !validate()) return;
    setSaving(true);
    try {
      const payload = {
        questions: questions.map((question, index) => ({
          question_text: question.question_text.trim(),
          question_type: question.question_type,
          marks: Number(question.marks),
          display_order: index + 1,
          correct_answer:
            question.question_type === "true_false"
              ? question.options.find((option) => option.is_correct)?.text
              : undefined,
          options:
            question.question_type === "objective"
              ? question.options
              : undefined,
          files: question.files.map((file) => ({
            url: file.url,
            name: file.name,
          })),
          explanation: question.explanation?.trim() || undefined,
        })),
      };
      const res = await fetch(
        `/api/admin/master-data/exams/${template.id}/questions`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to save exam");
      toast.success("Exam questions saved");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save exam");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[92dvh] w-[96vw] max-w-[1180px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1180px]"
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-5 text-left">
          <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <List className="size-5 shrink-0 text-primary" />
                <span className="truncate">Questions for {template.title}</span>
              </DialogTitle>
              <DialogDescription className="mt-1">
                Add questions totaling exactly {expectedMarks.toFixed(2)} marks.
              </DialogDescription>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {template.ai_question_format?.enabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateWithAi}
                  disabled={generatingAi || saving}
                >
                  {generatingAi ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Generate via AI
                </Button>
              )}
              <Badge variant="outline">
                Questions: {questions.length}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  marksMatch
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
                )}
              >
                Marks: {questionMarks.toFixed(2)} / {expectedMarks.toFixed(2)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div
          ref={scrollAreaRef}
          className="min-h-0 flex-1 overflow-y-auto [overflow-anchor:none]"
        >
          <section className="border-b bg-muted/20 px-6 py-4">
            <p className={cn(
              "text-sm font-medium",
              marksMatch ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
            )}>
              Questions total: {questionMarks.toFixed(2)} / {expectedMarks.toFixed(2)}
            </p>
          </section>

          {errors.length > 0 && (
            <div
              ref={errorSummaryRef}
              className="mx-6 mt-5 scroll-mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
            >
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <CircleAlert className="size-4" />
                Fix these fields before saving
              </div>
              <ul className="space-y-1">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4 px-6 py-5">
            {questions.map((question, questionIndex) => (
              <div
                key={question.client_id}
                ref={(node) => {
                  if (node) questionRefs.current.set(question.client_id, node);
                  else questionRefs.current.delete(question.client_id);
                }}
                className="scroll-mt-4"
              >
                <Collapsible
                  open={question.open}
                  onOpenChange={(openState) =>
                    updateQuestion(question.client_id, (current) => ({
                      ...current,
                      open: openState,
                    }))
                  }
                  className="overflow-hidden rounded-md border bg-card"
                >
                  <div
                    className={cn(
                      "flex items-center",
                      question.open && "border-b"
                    )}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
                      >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                        {questionIndex + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {question.question_text || `Question ${questionIndex + 1}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {Number(question.marks || 0).toFixed(2)} marks
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-4 text-muted-foreground transition-transform",
                          question.open && "rotate-180"
                        )}
                      />
                      </button>
                    </CollapsibleTrigger>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mr-2 text-muted-foreground hover:text-destructive"
                      disabled={questions.length === 1}
                      onClick={() =>
                        setQuestions((current) =>
                          current.filter(
                            (item) => item.client_id !== question.client_id
                          )
                        )
                      }
                    >
                      <X className="size-4" />
                      Remove
                    </Button>
                  </div>

                  <CollapsibleContent>
                    <div className="space-y-5 p-5">
                    <div className="space-y-2">
                      <Label>Question Text *</Label>
                      <Textarea
                        value={question.question_text}
                        onChange={(event) =>
                          updateQuestion(question.client_id, (current) => ({
                            ...current,
                            question_text: event.target.value,
                          }))
                        }
                        placeholder="Enter your question here..."
                        className="min-h-24"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <List className="size-4 text-muted-foreground" />
                          Question Type
                        </Label>
                        <Select
                          value={question.question_type}
                          onValueChange={(value) =>
                            changeQuestionType(
                              question.client_id,
                              value as ExamQuestionType
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true_false">True / False</SelectItem>
                            <SelectItem value="objective">Objective</SelectItem>
                            {!template.instant_result && (
                              <SelectItem value="subjective">Subjective</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Star className="size-4 text-muted-foreground" />
                          Marks
                        </Label>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={question.marks}
                          onChange={(event) =>
                            updateQuestion(question.client_id, (current) => ({
                              ...current,
                              marks: Number(event.target.value),
                            }))
                          }
                        />
                      </div>
                    </div>

                    {question.question_type !== "subjective" && (
                      <div className="relative space-y-3 overflow-hidden rounded-md border bg-muted/20 p-4 pl-5">
                        <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
                        <Label>Select Correct Answer *</Label>
                        {question.options.map((option, optionIndex) => (
                          <div
                            key={`${question.client_id}-${optionIndex}`}
                            className="flex items-center gap-2 rounded-md border bg-background p-2"
                          >
                            <input
                              type="radio"
                              name={`answer-${question.client_id}`}
                              checked={option.is_correct}
                              onChange={() =>
                                updateQuestion(question.client_id, (current) => ({
                                  ...current,
                                  options: current.options.map((item, index) => ({
                                    ...item,
                                    is_correct: index === optionIndex,
                                  })),
                                }))
                              }
                              className="size-4 accent-primary"
                            />
                            <Input
                              value={option.text}
                              placeholder={`Option ${optionIndex + 1}`}
                              disabled={question.question_type === "true_false"}
                              onChange={(event) =>
                                updateQuestion(question.client_id, (current) => ({
                                  ...current,
                                  options: current.options.map((item, index) =>
                                    index === optionIndex
                                      ? { ...item, text: event.target.value }
                                      : item
                                  ),
                                }))
                              }
                              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                            />
                            {question.question_type === "objective" && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={question.options.length <= 2}
                                onClick={() =>
                                  updateQuestion(question.client_id, (current) => ({
                                    ...current,
                                    options: current.options.filter(
                                      (_, index) => index !== optionIndex
                                    ),
                                  }))
                                }
                              >
                                <X className="size-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {question.question_type === "objective" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateQuestion(question.client_id, (current) => ({
                                ...current,
                                options: [
                                  ...current.options,
                                  {
                                    text: "",
                                    is_correct: false,
                                  },
                                ],
                              }))
                            }
                          >
                            <Plus className="size-4" />
                            Add Option
                          </Button>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Question Images (Optional, max 5)</Label>
                      <DocumentFileUpload
                        accessToken={accessToken}
                        files={toUploadFiles(question.files)}
                        onFilesChange={(files) =>
                          updateQuestion(question.client_id, (current) => ({
                            ...current,
                            files,
                          }))
                        }
                        maxFiles={5}
                      />
                    </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="h-12 w-full border-dashed"
              onClick={addQuestion}
            >
              <Plus className="size-4" />
              Add Question
            </Button>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving || generatingAi}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving || generatingAi}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Questions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



