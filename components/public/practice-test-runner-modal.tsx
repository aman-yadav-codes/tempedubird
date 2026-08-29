"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  HelpCircle,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckSquare,
  X,
  Medal,
  Users,
  Eye,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store";

type QuestionItem = {
  id: number;
  question_text: string;
  options: string[];
};

type TestMeta = {
  id: number;
  title: string;
  subject: string;
  duration_minutes: number;
  total_questions: number;
  marks_per_question: number;
  negative_marks: number;
  total_marks: number;
};

type Scorecard = {
  obtained_marks: number;
  total_marks: number;
  percentage: number;
  accuracy: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered: number;
  time_taken_seconds: number;
  rank: number;
  total_participants: number;
};

type QuestionReview = {
  id: number;
  question_text: string;
  options: string[];
  selected_option: number | null;
  correct_option: number;
  is_correct: boolean;
  is_attempted: boolean;
  explanation: string;
};

type LeaderboardEntry = {
  rank: number;
  id: number;
  student_name: string;
  obtained_marks: number;
  total_marks: number;
  percentage: number;
  time_taken_seconds: number;
  correct_answers: number;
  total_questions: number;
  created_at: string;
};

interface PracticeTestRunnerModalProps {
  testId: number | string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTestCompleted?: () => void;
}

export function PracticeTestRunnerModal({
  testId,
  open,
  onOpenChange,
  onTestCompleted,
}: PracticeTestRunnerModalProps) {
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testMeta, setTestMeta] = useState<TestMeta | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Test state
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(60 * 60);
  const [timeTakenSeconds, setTimeTakenSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Result state
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [detailedReview, setDetailedReview] = useState<QuestionReview[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const totalDurationSecondsRef = useRef(60 * 60);

  // 1. Fetch questions on modal open
  useEffect(() => {
    if (open && testId) {
      void initTest();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [open, testId]);

  const initTest = async () => {
    setLoading(true);
    setIsFinished(false);
    setScorecard(null);
    setAnswers({});
    setMarkedForReview({});
    setCurrentIndex(0);

    try {
      const res = await fetch(`/api/public/practice/${testId}/questions`);
      const data = await res.json();
      if (res.ok && data.questions) {
        setTestMeta(data.test);
        setQuestions(data.questions);
        const durationSecs = (data.test?.duration_minutes || 60) * 60;
        totalDurationSecondsRef.current = durationSecs;
        setSecondsRemaining(durationSecs);
        setTimeTakenSeconds(0);
        startTimer(durationSecs);
      } else {
        toast.error(data.error || "Failed to load test questions");
      }
    } catch (err) {
      console.error("Error initializing practice test:", err);
      toast.error("Network error loading test");
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (initialSecs: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    let current = initialSecs;

    timerRef.current = setInterval(() => {
      current -= 1;
      setSecondsRemaining(current);
      setTimeTakenSeconds(totalDurationSecondsRef.current - current);

      if (current <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        toast.info("Time's up! Submitting your practice test...");
        void submitTestAuto();
      }
    }, 1000);
  };

  const submitTestAuto = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    await handleSubmitTest();
  };

  const handleSelectOption = (questionId: number, optionIdx: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  const handleClearResponse = (questionId: number) => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const handleToggleReview = (questionId: number) => {
    setMarkedForReview((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const handleSubmitTest = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);

    try {
      const payload = {
        student_name: user?.full_name || "Enrolled Learner",
        student_email: user?.email || "",
        user_id: user?.id || null,
        answers,
        time_taken_seconds: timeTakenSeconds,
      };

      const res = await fetch(`/api/public/practice/${testId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setScorecard(data.scorecard);
        setDetailedReview(data.detailed_review || []);
        setIsFinished(true);
        toast.success("Test completed and evaluated successfully!");
        void fetchLeaderboard();
        if (onTestCompleted) onTestCompleted();
      } else {
        toast.error(data.error || "Failed to submit test");
      }
    } catch (err) {
      console.error("Error submitting test:", err);
      toast.error("Error submitting test");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(`/api/public/practice/${testId}/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(Math.max(0, totalSecs) / 60);
    const secs = Math.max(0, totalSecs) % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const currentQ = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const answeredCount = Object.keys(answers).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[92vh] flex flex-col p-0 overflow-hidden bg-background border-border shadow-2xl rounded-3xl">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-bold text-muted-foreground">Preparing practice test questions & environment...</p>
          </div>
        ) : !isFinished ? (
          /* ============================================================ */
          /*                       EXAM IN PROGRESS                       */
          /* ============================================================ */
          <div className="flex flex-col h-full overflow-hidden">
            {/* Top Bar */}
            <div className="h-16 px-6 border-b border-border bg-card/80 flex items-center justify-between shrink-0 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm text-foreground truncate">
                    {testMeta?.title || "Online Mock Exam"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {testMeta?.subject} • +4 for Correct / -1 for Wrong
                  </p>
                </div>
              </div>

              {/* Timer & Submit */}
              <div className="flex items-center gap-4 shrink-0">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black shadow-2xs ${
                    secondsRemaining < 300
                      ? "bg-red-500/10 border-red-500/30 text-red-600 animate-pulse"
                      : "bg-muted border-border text-foreground"
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  <span>Time Left: {formatTimer(secondsRemaining)}</span>
                </div>

                <Button
                  onClick={handleSubmitTest}
                  disabled={submitting}
                  size="sm"
                  className="font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-4 h-9 rounded-xl shadow-xs cursor-pointer gap-1.5"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Submit Test ({answeredCount}/{questions.length})
                </Button>
              </div>
            </div>

            {/* Exam Body Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_280px] overflow-hidden">
              {/* Question Main Canvas */}
              <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
                {currentQ && (
                  <>
                    <div className="flex items-center justify-between border-b border-border/70 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                          {currentIndex + 1}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          Question {currentIndex + 1} of {questions.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px] font-extrabold">+4.0 Marks</Badge>
                        <Badge className="bg-red-500/10 text-red-600 text-[10px] font-extrabold">-1.0 Negative</Badge>
                      </div>
                    </div>

                    {/* Question Statement */}
                    <div className="text-sm sm:text-base font-semibold text-foreground leading-relaxed bg-muted/20 p-5 rounded-2xl border border-border/80 shadow-2xs">
                      {currentQ.question_text}
                    </div>

                    {/* Options List */}
                    <div className="space-y-3">
                      {currentQ.options.map((optionText, optIdx) => {
                        const isSelected = answers[currentQ.id] === optIdx;
                        const optionLabels = ["A", "B", "C", "D"];

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleSelectOption(currentQ.id, optIdx)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3.5 cursor-pointer shadow-2xs ${
                              isSelected
                                ? "bg-primary/10 border-primary text-foreground ring-2 ring-primary/30"
                                : "bg-card border-border/80 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span
                              className={`h-7 w-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {optionLabels[optIdx]}
                            </span>
                            <span className="text-xs sm:text-sm font-medium leading-snug">{optionText}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Question Action Controls */}
                    <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleClearResponse(currentQ.id)}
                          className="text-xs font-semibold h-9 rounded-xl text-muted-foreground"
                        >
                          Clear Choice
                        </Button>

                        <Button
                          variant={markedForReview[currentQ.id] ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleToggleReview(currentQ.id)}
                          className={`text-xs font-semibold h-9 rounded-xl gap-1.5 ${
                            markedForReview[currentQ.id]
                              ? "bg-purple-600 text-white hover:bg-purple-700"
                              : "text-purple-600 border-purple-300 dark:border-purple-800"
                          }`}
                        >
                          <Bookmark className="h-3.5 w-3.5" />
                          {markedForReview[currentQ.id] ? "Marked for Review" : "Mark Review"}
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentIndex === 0}
                          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                          className="text-xs font-bold h-9 rounded-xl gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" /> Previous
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => {
                            if (isLastQuestion) {
                              void handleSubmitTest();
                            } else {
                              setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
                            }
                          }}
                          className="text-xs font-bold h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 gap-1"
                        >
                          {isLastQuestion ? "Finish & Submit" : "Next Question"} <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Right Palette */}
              <div className="border-l border-border bg-card/60 p-4 flex flex-col justify-between overflow-y-auto hidden lg:flex">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs text-foreground uppercase tracking-wider">
                      Question Palette
                    </h4>
                    <span className="text-[11px] text-muted-foreground font-bold">
                      {answeredCount}/{questions.length} Answered
                    </span>
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-md bg-emerald-500" /> Answered
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-md bg-purple-500" /> Review
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-md bg-muted border border-border" /> Not Answered
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-md bg-primary text-white" /> Current
                    </div>
                  </div>

                  {/* Question Grid Buttons */}
                  <div className="grid grid-cols-5 gap-2 pt-2">
                    {questions.map((q, idx) => {
                      const isAns = answers[q.id] !== undefined;
                      const isRev = markedForReview[q.id];
                      const isCur = currentIndex === idx;

                      let btnStyle = "bg-card border-border/80 text-foreground hover:border-primary/50";
                      if (isCur) {
                        btnStyle = "bg-primary text-primary-foreground ring-2 ring-primary/40 font-black";
                      } else if (isAns && isRev) {
                        btnStyle = "bg-purple-600 text-white font-bold";
                      } else if (isAns) {
                        btnStyle = "bg-emerald-600 text-white font-bold";
                      } else if (isRev) {
                        btnStyle = "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-400 font-bold";
                      }

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setCurrentIndex(idx)}
                          className={`h-9 w-full rounded-xl text-xs font-bold border transition-all flex items-center justify-center cursor-pointer shadow-2xs ${btnStyle}`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <Button
                    onClick={handleSubmitTest}
                    disabled={submitting}
                    className="w-full font-bold text-xs h-10 rounded-xl bg-primary text-primary-foreground shadow-sm"
                  >
                    Submit Final Test
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /*                 RESULT, SCORECARD & LEADERBOARD              */
          /* ============================================================ */
          <div className="flex flex-col h-full overflow-hidden">
            {/* Scorecard Header */}
            <div className="p-6 border-b border-border bg-gradient-to-r from-primary/10 via-background to-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-extrabold text-xs">
                    Test Completed
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Attempt ID: #{scorecard?.rank || 1}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground">
                  Performance Scorecard & Leaderboard
                </h2>
                <p className="text-xs text-muted-foreground">
                  {testMeta?.title} • Evaluated on {new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  variant="outline"
                  onClick={initTest}
                  className="font-bold text-xs h-10 rounded-xl gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Retake Test
                </Button>

                <Button
                  onClick={() => onOpenChange(false)}
                  className="font-bold text-xs h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                >
                  Done & Close
                </Button>
              </div>
            </div>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-5 bg-muted/20 border-b border-border shrink-0">
              <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs text-center space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Score Marks</span>
                <p className="text-xl font-black text-primary">
                  {scorecard?.obtained_marks} / {scorecard?.total_marks}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs text-center space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Percentage</span>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {scorecard?.percentage}%
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs text-center space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Accuracy Rate</span>
                <p className="text-xl font-black text-blue-600 dark:text-blue-400">
                  {scorecard?.accuracy}%
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs text-center space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Time Taken</span>
                <p className="text-xl font-black text-foreground">
                  {formatTimer(scorecard?.time_taken_seconds || 0)}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-2xs text-center space-y-0.5 col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300">Live Rank</span>
                <p className="text-xl font-black text-amber-600 flex items-center justify-center gap-1">
                  <Trophy className="h-4 w-4" /> #{scorecard?.rank || 1}
                </p>
              </div>
            </div>

            {/* Tabs: Leaderboard vs Solutions */}
            <div className="flex-1 overflow-hidden p-5">
              <Tabs defaultValue="leaderboard" className="h-full flex flex-col">
                <TabsList className="w-full flex items-center justify-start gap-2 p-1 bg-muted/60 rounded-xl border border-border min-h-10 shrink-0">
                  <TabsTrigger value="leaderboard" className="flex-1 text-xs font-bold gap-1.5 py-1.5 cursor-pointer">
                    <Trophy className="h-3.5 w-3.5 text-amber-500" />
                    <span>Live Leaderboard ({leaderboard.length})</span>
                  </TabsTrigger>

                  <TabsTrigger value="solutions" className="flex-1 text-xs font-bold gap-1.5 py-1.5 cursor-pointer">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span>Question Analysis & Solutions ({detailedReview.length})</span>
                  </TabsTrigger>
                </TabsList>

                {/* 1. LEADERBOARD TAB */}
                <TabsContent value="leaderboard" className="flex-1 overflow-y-auto mt-4 space-y-3">
                  {loadingLeaderboard ? (
                    <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" /> Loading live leaderboard...
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="text-center py-12 text-xs text-muted-foreground">
                      No leaderboard scores recorded yet. Be the first to top!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {leaderboard.map((item) => {
                        const isCurrent = item.student_name === (user?.full_name || "Enrolled Learner");
                        const medals = ["🥇", "🥈", "🥉"];
                        const medalBadge = medals[item.rank - 1] || `#${item.rank}`;

                        return (
                          <div
                            key={item.id}
                            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-2xs ${
                              isCurrent
                                ? "bg-primary/10 border-primary ring-2 ring-primary/30"
                                : item.rank === 1
                                ? "bg-amber-500/10 border-amber-500/30"
                                : "bg-card border-border/70"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-base font-black w-8 text-center shrink-0">
                                {medalBadge}
                              </span>

                              <div className="h-8 w-8 rounded-full bg-primary/15 text-primary font-black text-xs flex items-center justify-center shrink-0">
                                {item.student_name ? item.student_name[0].toUpperCase() : "U"}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">
                                    {item.student_name}
                                  </h4>
                                  {isCurrent && (
                                    <Badge className="bg-primary text-primary-foreground text-[9px] py-0 px-1.5 font-bold">
                                      You
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  {item.correct_answers}/{item.total_questions} Correct • {formatTimer(item.time_taken_seconds)}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-black text-sm text-primary block">
                                {item.obtained_marks} / {item.total_marks} Marks
                              </span>
                              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                {item.percentage}% Score
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* 2. SOLUTIONS & QUESTION BREAKDOWN TAB */}
                <TabsContent value="solutions" className="flex-1 overflow-y-auto mt-4 space-y-4">
                  {detailedReview.map((q, idx) => {
                    const optLabels = ["A", "B", "C", "D"];

                    return (
                      <div
                        key={q.id}
                        className={`p-5 rounded-2xl border space-y-3.5 shadow-2xs ${
                          q.is_correct
                            ? "bg-emerald-500/5 border-emerald-500/30"
                            : q.is_attempted
                            ? "bg-red-500/5 border-red-500/30"
                            : "bg-card border-border/80"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-6 w-6 rounded-md bg-muted text-foreground font-black text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <h4 className="font-bold text-xs text-foreground">Question {idx + 1}</h4>
                          </div>

                          <div>
                            {q.is_correct ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-black gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Correct (+4.0)
                              </Badge>
                            ) : q.is_attempted ? (
                              <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px] font-black gap-1">
                                <XCircle className="h-3 w-3" /> Incorrect (-1.0)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] font-bold">
                                Not Attempted (0.0)
                              </Badge>
                            )}
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm font-semibold text-foreground leading-relaxed">
                          {q.question_text}
                        </p>

                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {q.options.map((optText, oIdx) => {
                            const isCorrectOpt = oIdx === q.correct_option;
                            const isSelectedOpt = oIdx === q.selected_option;

                            let optCardStyle = "bg-muted/30 border-border/60 text-muted-foreground";
                            if (isCorrectOpt) {
                              optCardStyle = "bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold";
                            } else if (isSelectedOpt && !q.is_correct) {
                              optCardStyle = "bg-red-500/15 border-red-500 text-red-900 dark:text-red-200 font-bold";
                            }

                            return (
                              <div
                                key={oIdx}
                                className={`p-3 rounded-xl border flex items-center gap-2.5 ${optCardStyle}`}
                              >
                                <span className="h-5 w-5 rounded-lg bg-background/80 font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {optLabels[oIdx]}
                                </span>
                                <span className="leading-snug">{optText}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation */}
                        {q.explanation && (
                          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 text-xs space-y-1">
                            <strong className="text-primary font-bold flex items-center gap-1">
                              <Sparkles className="h-3.5 w-3.5" /> Detailed Faculty Solution & Explanation:
                            </strong>
                            <p className="text-muted-foreground leading-relaxed pl-4">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
