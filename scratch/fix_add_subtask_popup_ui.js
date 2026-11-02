const fs = require("fs");
const path = require("path");

const pagePath = path.join(__dirname, "../app/admin/operations/tasks/page.tsx");
let code = fs.readFileSync(pagePath, "utf-8");

// 1. Make the dialog wide and spacious:
const oldDialogContent = `<DialogContent className="w-[96vw] max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border rounded-2xl bg-background">`;
const newDialogContent = `<DialogContent className="w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border rounded-2xl bg-background">`;

if (code.includes(oldDialogContent)) {
  code = code.replace(oldDialogContent, newDialogContent);
  console.log("Updated DialogContent width classes");
} else {
  console.warn("oldDialogContent not found");
}

// 2. Improve the Single Subtask inputs:
// Replace the cramped timing, urgency and points section with a clean, spacious 2-row layout
const oldRow3Daily = `                            {/* Row 3: Daily Task Timing, Duration, Urgency & Performance Points */}
                            {newSubIsDailyRecurring ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 p-3 rounded-xl border bg-muted/10">
                                <div className="lg:col-span-3 sm:col-span-1 space-y-1 min-w-0">
                                  <Label className="text-xs font-semibold">Duration (Required)</Label>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={newSubDurationHours}
                                        onChange={(e) => setNewSubDurationHours(e.target.value)}
                                        className="text-xs h-9 font-mono bg-background pr-6"
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground pointer-events-none">
                                        h
                                      </span>
                                    </div>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        min="0"
                                        max="59"
                                        placeholder="0"
                                        value={newSubDurationMinutes}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === "" || (Number(val) >= 0 && Number(val) <= 59)) {
                                            setNewSubDurationMinutes(val);
                                          }
                                        }}
                                        className="text-xs h-9 font-mono bg-background pr-6"
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground pointer-events-none">
                                        m
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="lg:col-span-3 sm:col-span-1 space-y-1 min-w-0">
                                  <Label className="text-xs font-semibold flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Exact Daily Time</span>
                                  </Label>
                                  <Input
                                    type="time"
                                    value={newSubDailyTime}
                                    onChange={(e) => setNewSubDailyTime(e.target.value)}
                                    className="text-xs h-9 bg-background font-mono"
                                  />
                                </div>

                                <div className="lg:col-span-3 sm:col-span-1 space-y-1 min-w-0">
                                  <Label className="text-xs font-semibold">Urgency Level</Label>
                                  <select
                                    value={newSubUrgency}
                                    onChange={(e) => setNewSubUrgency(e.target.value as any)}
                                    className="w-full h-9 text-xs bg-background rounded-md border border-input px-3 font-medium outline-none focus:ring-1 focus:ring-ring cursor-pointer text-foreground"
                                  >
                                    {SUBTASK_URGENCIES.map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {u.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="lg:col-span-3 sm:col-span-1 space-y-1 min-w-0">
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <Label className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5 truncate">
                                      <Sparkles className="w-2.5 h-2.5 shrink-0" />
                                      +Reward PTS
                                    </Label>
                                    <Label className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-0.5 truncate">
                                      <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                      -Penalty PTS
                                    </Label>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        value={newSubPoints}
                                        onChange={(e) => setNewSubPoints(e.target.value)}
                                        disabled={isStaffViewer}
                                        placeholder="20"
                                        className={\`text-xs h-9 font-mono bg-background pr-7 \${isStaffViewer ? "cursor-not-allowed opacity-80 bg-muted/40" : ""}\`}
                                      />
                                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-600 pointer-events-none">
                                        +PTS
                                      </span>
                                    </div>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        value={newSubPenaltyPoints}
                                        onChange={(e) => setNewSubPenaltyPoints(e.target.value)}
                                        disabled={isStaffViewer}
                                        placeholder="10"
                                        className={\`text-xs h-9 font-mono bg-background text-rose-600 pr-7 \${isStaffViewer ? "cursor-not-allowed opacity-80 bg-muted/40" : ""}\`}
                                      />
                                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-rose-600 pointer-events-none">
                                        -PTS
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-3 p-3 rounded-xl border bg-muted/10">
                                <div className="lg:col-span-3 md:col-span-1 sm:col-span-1 space-y-1 min-w-0">
                                  <Label className="text-xs font-semibold">Duration of Task</Label>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={newSubDurationHours}
                                        onChange={(e) => setNewSubDurationHours(e.target.value)}
                                        className="text-xs h-9 font-mono bg-background pr-6"
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground pointer-events-none">
                                        h
                                      </span>
                                    </div>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        min="0"
                                        max="59"
                                        placeholder="0"
                                        value={newSubDurationMinutes}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === "" || (Number(val) >= 0 && Number(val) <= 59)) {
                                            setNewSubDurationMinutes(val);
                                          }
                                        }}
                                        className="text-xs h-9 font-mono bg-background pr-6"
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground pointer-events-none">
                                        m
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="lg:col-span-2 md:col-span-1 sm:col-span-1 space-y-1 min-w-0">
                                  <Label className="text-xs font-semibold">Deadline Date</Label>
                                  <Input
                                    type="date"
                                    value={newSubDeadlineDate}
                                    onChange={(e) => setNewSubDeadlineDate(e.target.value)}
                                    className="text-xs h-9 bg-background"
                                  />
                                </div>

                                <div className="lg:col-span-2 md:col-span-1 sm:col-span-1 space-y-1 min-w-0">
                                  <Label className="text-xs font-semibold">Deadline Time</Label>
                                  <Input
                                    type="time"
                                    value={newSubDeadlineNumber}
                                    onChange={(e) => setNewSubDeadlineNumber(e.target.value)}
                                    className="text-xs h-9 bg-background"
                                  />
                                </div>

                                <div className="lg:col-span-2 md:col-span-1 sm:col-span-1 space-y-1 min-w-0">
                                  <Label className="text-xs font-semibold">Urgency Level</Label>
                                  <select
                                    value={newSubUrgency}
                                    onChange={(e) => setNewSubUrgency(e.target.value as any)}
                                    className="w-full h-9 text-xs bg-background rounded-md border border-input px-3 font-medium outline-none focus:ring-1 focus:ring-ring cursor-pointer text-foreground"
                                  >
                                    {SUBTASK_URGENCIES.map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {u.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="lg:col-span-3 md:col-span-2 sm:col-span-1 space-y-1 min-w-0">
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <Label className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5 truncate">
                                      <Sparkles className="w-2.5 h-2.5 shrink-0" />
                                      +Reward PTS
                                    </Label>
                                    <Label className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-0.5 truncate">
                                      <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                      -Penalty PTS
                                    </Label>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        value={newSubPoints}
                                        onChange={(e) => setNewSubPoints(e.target.value)}
                                        disabled={isStaffViewer}
                                        placeholder="20"
                                        className={\`text-xs h-9 font-mono bg-background pr-7 \${isStaffViewer ? "cursor-not-allowed opacity-80 bg-muted/40" : ""}\`}
                                      />
                                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-600 pointer-events-none">
                                        +PTS
                                      </span>
                                    </div>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        value={newSubPenaltyPoints}
                                        onChange={(e) => setNewSubPenaltyPoints(e.target.value)}
                                        disabled={isStaffViewer}
                                        placeholder="10"
                                        className={\`text-xs h-9 font-mono bg-background text-rose-600 pr-7 \${isStaffViewer ? "cursor-not-allowed opacity-80 bg-muted/40" : ""}\`}
                                      />
                                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-rose-600 pointer-events-none">
                                        -PTS
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}`;

const newRow3Daily = `                            {/* Row 3: Spacious, non-overlapping scheduling & priority grid */}
                            {newSubIsDailyRecurring ? (
                              <div className="p-3.5 rounded-xl border bg-muted/10 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                  {/* Duration Required */}
                                  <div className="space-y-1 min-w-0">
                                    <Label className="text-xs font-semibold">Duration Required</Label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      <div className="relative">
                                        <Input
                                          type="number"
                                          min="0"
                                          placeholder="1"
                                          value={newSubDurationHours}
                                          onChange={(e) => setNewSubDurationHours(e.target.value)}
                                          className="text-xs h-9 font-mono bg-background pr-6"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground pointer-events-none">
                                          h
                                        </span>
                                      </div>
                                      <div className="relative">
                                        <Input
                                          type="number"
                                          min="0"
                                          max="59"
                                          placeholder="0"
                                          value={newSubDurationMinutes}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === "" || (Number(val) >= 0 && Number(val) <= 59)) {
                                              setNewSubDurationMinutes(val);
                                            }
                                          }}
                                          className="text-xs h-9 font-mono bg-background pr-6"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground pointer-events-none">
                                          m
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Exact Daily Time */}
                                  <div className="space-y-1 min-w-0">
                                    <Label className="text-xs font-semibold flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                                      <span>Exact Daily Time</span>
                                    </Label>
                                    <Input
                                      type="time"
                                      value={newSubDailyTime}
                                      onChange={(e) => setNewSubDailyTime(e.target.value)}
                                      className="text-xs h-9 bg-background font-mono"
                                    />
                                  </div>

                                  {/* Urgency */}
                                  <div className="space-y-1 min-w-0">
                                    <Label className="text-xs font-semibold">Urgency Level</Label>
                                    <select
                                      value={newSubUrgency}
                                      onChange={(e) => setNewSubUrgency(e.target.value as any)}
                                      className="w-full h-9 text-xs bg-background rounded-md border border-input px-3 font-medium outline-none focus:ring-1 focus:ring-ring cursor-pointer text-foreground"
                                    >
                                      {SUBTASK_URGENCIES.map((u) => (
                                        <option key={u.id} value={u.id}>
                                          {u.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Performance Points */}
                                  <div className="space-y-1 min-w-0">
                                    <div className="grid grid-cols-2 gap-1.5">
                                      <div>
                                        <Label className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5 truncate">
                                          <Sparkles className="w-2.5 h-2.5 shrink-0" /> +Bonus (pts)
                                        </Label>
                                        <Input
                                          type="number"
                                          value={newSubPoints}
                                          onChange={(e) => setNewSubPoints(e.target.value)}
                                          disabled={isStaffViewer}
                                          placeholder="20"
                                          className={\`text-xs h-9 font-mono bg-background \${isStaffViewer ? "cursor-not-allowed opacity-80 bg-muted/40" : ""}\`}
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5 truncate">
                                          <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> -Penalty
                                        </Label>
                                        <Input
                                          type="number"
                                          value={newSubPenaltyPoints}
                                          onChange={(e) => setNewSubPenaltyPoints(e.target.value)}
                                          disabled={isStaffViewer}
                                          placeholder="10"
                                          className={\`text-xs h-9 font-mono bg-background text-rose-600 \${isStaffViewer ? "cursor-not-allowed opacity-80 bg-muted/40" : ""}\`}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3.5 rounded-xl border bg-muted/10 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                  {/* Duration of Task */}
                                  <div className="space-y-1 min-w-0">
                                    <Label className="text-xs font-semibold">Duration of Task</Label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      <div className="relative">
                                        <Input
                                          type="number"
                                          min="0"
                                          placeholder="1"
                                          value={newSubDurationHours}
                                          onChange={(e) => setNewSubDurationHours(e.target.value)}
                                          className="text-xs h-9 font-mono bg-background pr-6"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground pointer-events-none">
                                          h
                                        </span>
                                      </div>
                                      <div className="relative">
                                        <Input
                                          type="number"
                                          min="0"
                                          max="59"
                                          placeholder="0"
                                          value={newSubDurationMinutes}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === "" || (Number(val) >= 0 && Number(val) <= 59)) {
                                              setNewSubDurationMinutes(val);
                                            }
                                          }}
                                          className="text-xs h-9 font-mono bg-background pr-6"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground pointer-events-none">
                                          m
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Deadline Date */}
                                  <div className="space-y-1 min-w-0">
                                    <Label className="text-xs font-semibold">Deadline Date</Label>
                                    <Input
                                      type="date"
                                      value={newSubDeadlineDate}
                                      onChange={(e) => setNewSubDeadlineDate(e.target.value)}
                                      className="text-xs h-9 bg-background"
                                    />
                                  </div>

                                  {/* Deadline Time */}
                                  <div className="space-y-1 min-w-0">
                                    <Label className="text-xs font-semibold">Deadline Time</Label>
                                    <Input
                                      type="time"
                                      value={newSubDeadlineNumber}
                                      onChange={(e) => setNewSubDeadlineNumber(e.target.value)}
                                      className="text-xs h-9 bg-background font-mono"
                                    />
                                  </div>

                                  {/* Urgency */}
                                  <div className="space-y-1 min-w-0">
                                    <Label className="text-xs font-semibold">Urgency Level</Label>
                                    <select
                                      value={newSubUrgency}
                                      onChange={(e) => setNewSubUrgency(e.target.value as any)}
                                      className="w-full h-9 text-xs bg-background rounded-md border border-input px-3 font-medium outline-none focus:ring-1 focus:ring-ring cursor-pointer text-foreground"
                                    >
                                      {SUBTASK_URGENCIES.map((u) => (
                                        <option key={u.id} value={u.id}>
                                          {u.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Reward / Penalty PTS */}
                                  <div className="space-y-1 min-w-0">
                                    <div className="grid grid-cols-2 gap-1.5">
                                      <div>
                                        <Label className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5 truncate">
                                          <Sparkles className="w-2.5 h-2.5 shrink-0" /> +Bonus (pts)
                                        </Label>
                                        <Input
                                          type="number"
                                          value={newSubPoints}
                                          onChange={(e) => setNewSubPoints(e.target.value)}
                                          disabled={isStaffViewer}
                                          placeholder="20"
                                          className={\`text-xs h-9 font-mono bg-background \${isStaffViewer ? "cursor-not-allowed opacity-80 bg-muted/40" : ""}\`}
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5 truncate">
                                          <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> -Penalty
                                        </Label>
                                        <Input
                                          type="number"
                                          value={newSubPenaltyPoints}
                                          onChange={(e) => setNewSubPenaltyPoints(e.target.value)}
                                          disabled={isStaffViewer}
                                          placeholder="10"
                                          className={\`text-xs h-9 font-mono bg-background text-rose-600 \${isStaffViewer ? "cursor-not-allowed opacity-80 bg-muted/40" : ""}\`}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}`;

if (code.includes(oldRow3Daily)) {
  code = code.replace(oldRow3Daily, newRow3Daily);
  console.log("Successfully replaced Row 3 Daily & One-Time layout");
} else {
  console.warn("oldRow3Daily not found");
}

fs.writeFileSync(pagePath, code, "utf-8");
console.log("Finished patching app/admin/operations/tasks/page.tsx");

