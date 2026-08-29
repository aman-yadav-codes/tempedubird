"use client";

import React, { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  FileText,
  Layers,
  Sparkles,
  Award,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type SyllabusTopic = {
  id?: number;
  title: string;
  node_type?: string;
  estimated_hours?: number;
  learning_outcomes?: string;
};

export type SubjectSyllabusItem = {
  id?: number;
  name: string;
  code?: string | null;
  description?: string | null;
  syllabi?: {
    id?: number;
    title: string;
    description?: string;
    nodes_count?: number;
    topics?: SyllabusTopic[];
  }[];
};

export function CourseSubjectSyllabusSection({
  subjects,
  category,
  programTitle,
}: {
  subjects: (string | SubjectSyllabusItem)[];
  category?: string;
  programTitle?: string;
}) {
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({ 0: true });

  const toggleExpand = (index: number) => {
    setExpandedIndices((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const expandAll = () => {
    const all: Record<number, boolean> = {};
    subjects.forEach((_, idx) => (all[idx] = true));
    setExpandedIndices(all);
  };

  const collapseAll = () => {
    setExpandedIndices({});
  };

  // Standardize subjects into structured items
  const structuredSubjects = subjects.map((sub, idx) => {
    if (typeof sub === "object" && sub !== null && "name" in sub) {
      const dbSyllabus = sub.syllabi?.[0];
      const dbTopics = dbSyllabus?.topics && dbSyllabus.topics.length > 0 ? dbSyllabus.topics : null;

      return {
        id: sub.id || idx + 1,
        name: sub.name,
        code: sub.code || `SUB-0${idx + 1}`,
        description: sub.description || dbSyllabus?.description || null,
        syllabusTitle: dbSyllabus?.title || `${sub.name} Comprehensive Syllabus`,
        lessonsCount: dbTopics ? dbTopics.length : [18, 22, 16, 14, 20, 12][idx % 6] || 15,
        estimatedHours: [36, 44, 32, 28, 40, 24][idx % 6] || 30,
        topics: dbTopics || generateDefaultTopics(sub.name),
      };
    }

    const subName = String(sub || `Subject Unit ${idx + 1}`);
    return {
      id: idx + 1,
      name: subName,
      code: `SUB-0${idx + 1}`,
      description: `Core theoretical fundamentals, applied problem-solving, and laboratory exercises for ${subName}.`,
      syllabusTitle: `${subName} Master Curriculum`,
      lessonsCount: [18, 22, 16, 14, 20, 12][idx % 6] || 15,
      estimatedHours: [36, 44, 32, 28, 40, 24][idx % 6] || 30,
      topics: generateDefaultTopics(subName),
    };
  });

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <span>What You&apos;ll Learn</span>
            <Sparkles className="h-5 w-5 text-amber-500" />
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Subject-wise accredited syllabus modules, practical lab topics, and learning objectives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={expandAll}
            className="text-xs font-semibold h-8 rounded-lg"
          >
            Expand All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={collapseAll}
            className="text-xs font-semibold h-8 rounded-lg"
          >
            Collapse All
          </Button>
        </div>
      </div>

      <div className="space-y-3.5">
        {structuredSubjects.map((subject, index) => {
          const isExpanded = Boolean(expandedIndices[index]);

          return (
            <div
              key={subject.id}
              className="rounded-2xl border border-border/80 bg-card overflow-hidden transition-all shadow-xs hover:border-primary/40"
            >
              {/* Subject Header Accordion Trigger */}
              <button
                type="button"
                onClick={() => toggleExpand(index)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-black text-sm text-primary border border-primary/20">
                    {index + 1}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-base sm:text-lg text-foreground truncate">
                        {subject.name}
                      </h3>
                      {subject.code && (
                        <Badge variant="outline" className="text-[10px] font-mono font-bold bg-muted/60 text-muted-foreground">
                          {subject.code}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {subject.syllabusTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex flex-col items-end text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">{subject.lessonsCount} Lessons</span>
                    <span className="text-[11px]">{subject.estimatedHours} Hours Total</span>
                  </div>

                  <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </button>

              {/* Expandable Syllabus Detail Content */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t border-border/60 bg-muted/10 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  {subject.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed pt-2">
                      {subject.description}
                    </p>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      <span>Curriculum Units & Topics</span>
                    </h4>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {subject.topics.map((topic, tIdx) => (
                        <div
                          key={topic.id || tIdx}
                          className="p-3 rounded-xl border border-border/70 bg-card flex items-start gap-2.5 shadow-2xs"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground leading-snug">
                              Unit {tIdx + 1}: {topic.title}
                            </p>
                            {topic.learning_outcomes && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                                {topic.learning_outcomes}
                              </p>
                            )}
                            {topic.estimated_hours ? (
                              <span className="text-[10px] text-primary/90 font-medium inline-block mt-1">
                                ⏱ {topic.estimated_hours} Hours Allocated
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function generateDefaultTopics(subjectName: string): SyllabusTopic[] {
  const lower = subjectName.toLowerCase();

  if (lower.includes("math") || lower.includes("calculus") || lower.includes("algebra")) {
    return [
      { title: "Foundations & Number Systems", learning_outcomes: "Set theory, complex numbers, sequence & series.", estimated_hours: 8 },
      { title: "Differential & Integral Calculus", learning_outcomes: "Limits, continuity, derivatives, and definite integration.", estimated_hours: 10 },
      { title: "Vectors, Matrices & Linear Algebra", learning_outcomes: "Matrix transformations, eigenvalues, vector spaces.", estimated_hours: 8 },
      { title: "Applied Probability & Statistics", learning_outcomes: "Probability distributions, hypothesis testing, regression analysis.", estimated_hours: 8 },
    ];
  }

  if (lower.includes("data") || lower.includes("structure") || lower.includes("algorithm")) {
    return [
      { title: "Abstract Data Types, Arrays & Linked Lists", learning_outcomes: "Memory layouts, pointer structures, singly and doubly linked lists.", estimated_hours: 8 },
      { title: "Stacks, Queues & Recursion Analysis", learning_outcomes: "Stack evaluation, queue scheduling, recursive depth tracking.", estimated_hours: 8 },
      { title: "Binary Trees, Heaps & Graph Traversals", learning_outcomes: "BST, AVL balance, BFS, DFS, Dijkstra shortest path.", estimated_hours: 10 },
      { title: "Sorting, Searching & Asymptotic Complexity", learning_outcomes: "Big-O analysis, divide and conquer, dynamic programming.", estimated_hours: 8 },
    ];
  }

  if (lower.includes("database") || lower.includes("sql") || lower.includes("dbms")) {
    return [
      { title: "Relational Modeling & ER Architecture", learning_outcomes: "Entity-relationship diagrams, normalization (1NF to BCNF).", estimated_hours: 8 },
      { title: "Advanced SQL Queries & Indexing", learning_outcomes: "Complex joins, window functions, B-Tree index optimization.", estimated_hours: 10 },
      { title: "ACID Transactions & Concurrency Control", learning_outcomes: "Locking protocols, two-phase commit, isolation levels.", estimated_hours: 8 },
      { title: "NoSQL Architectures & Distributed Data", learning_outcomes: "Document stores, key-value caches, sharding strategies.", estimated_hours: 8 },
    ];
  }

  if (lower.includes("web") || lower.includes("javascript") || lower.includes("software")) {
    return [
      { title: "Frontend Architecture & Modern JavaScript", learning_outcomes: "ES6+, DOM rendering, modern reactive frameworks.", estimated_hours: 10 },
      { title: "REST APIs & Backend Microservices", learning_outcomes: "Server routing, middleware authentication, JWT tokens.", estimated_hours: 10 },
      { title: "Database Integration & State Management", learning_outcomes: "ORM models, global state cache, asynchronous workflows.", estimated_hours: 8 },
      { title: "Testing, CI/CD Deployment & Cloud Hosting", learning_outcomes: "Unit testing, Docker containers, production release pipelines.", estimated_hours: 8 },
    ];
  }

  return [
    { title: "Core Fundamentals & Theoretical Concepts", learning_outcomes: `Key foundational principles and terminology of ${subjectName}.`, estimated_hours: 8 },
    { title: "Applied Problem Solving & Methodology", learning_outcomes: "Hands-on problem analysis, case studies, and practical exercises.", estimated_hours: 8 },
    { title: "Advanced Topics & Industry Standards", learning_outcomes: "Modern best practices, real-world applications, and research trends.", estimated_hours: 8 },
    { title: "Project Work, Case Studies & Final Assessment", learning_outcomes: "Comprehensive review, capstone assignment, and practical validation.", estimated_hours: 8 },
  ];
}
