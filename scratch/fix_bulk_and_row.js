const fs = require('fs');

let content = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

const targetStart = '{/* Row 1: Name (if single), Price, Assign Staff */}';
const targetEndMarker = '<div className="flex justify-end pt-1">';

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEndMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Target not found!', { startIndex, endIndex });
  process.exit(1);
}

const replacement = `{/* Single Mode Input Fields (Image 1: Arranged in one row, removed from bulk mode) */}
              {subTaskCreationMode === "single" && (
                <>
                  {/* Row 1: Name, Cost, Assign Staff, Frequency & Cadence - All in ONE Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-4 space-y-1">
                      <Label className="text-xs font-semibold">Sub-Task Name *</Label>
                      <Input
                        value={newSubTitle}
                        onChange={(e) => setNewSubTitle(e.target.value)}
                        placeholder="e.g. Curriculum Design, Lab Setup..."
                        className="text-xs h-9 bg-background"
                        autoFocus
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs font-semibold truncate block">Task Cost (₹)</Label>
                      <div className="relative">
                        <IndianRupee className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        {isStaffViewer ? (
                          <Input
                            type="text"
                            value="★★★★★"
                            disabled
                            className="pl-7 text-xs h-9 font-mono bg-muted/40 cursor-not-allowed select-none text-muted-foreground font-bold tracking-wider"
                          />
                        ) : (
                          <Input
                            type="number"
                            step="100"
                            value={newSubPrice}
                            onChange={(e) => setNewSubPrice(e.target.value)}
                            placeholder="0.00"
                            className="pl-7 text-xs h-9 font-mono bg-background"
                          />
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold truncate">Assign Staff</Label>
                        {isSelectedTaskAssigned && (
                          <span className="text-[9px] text-primary font-bold bg-primary/10 px-1 py-0.5 rounded">
                            Team ({subtaskAssigneeOptions.length})
                          </span>
                        )}
                      </div>
                      <select
                        value={newSubStaffId}
                        onChange={(e) => setNewSubStaffId(e.target.value)}
                        className="w-full h-9 text-xs bg-background rounded-md border border-input px-2 font-medium outline-none focus:ring-1 focus:ring-ring cursor-pointer text-foreground truncate"
                      >
                        <option value="none">-- Unassigned --</option>
                        {subtaskAssigneeOptions.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.name} {s.role ? \`(\${s.role})\` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <Label className="text-xs font-semibold flex items-center gap-1 truncate">
                        <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>Cadence *</span>
                      </Label>
                      <select
                        value={newSubCadence}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewSubCadence(val);
                          setNewSubIsDailyRecurring(val === "daily");
                        }}
                        className="w-full text-xs h-9 bg-background border border-input rounded-md px-2 font-medium outline-none cursor-pointer text-foreground"
                      >
                        <option value="once">⚡ Once (One-Time)</option>
                        <option value="daily">🔁 Daily Basis</option>
                        <option value="weekly">📅 Weekly Basis</option>
                        <option value="monthly">🗓️ Monthly Basis</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Scheduling, Duration, Urgency & Performance Points */}
                  {newSubCadence === "daily" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-xl border bg-muted/10">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Duration Required</Label>
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

                      <div className="space-y-1">
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

                      <div className="space-y-1">
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

                      <div className="space-y-1">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 p-3 rounded-xl border bg-muted/10">
                      <div className="space-y-1">
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

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Deadline Date</Label>
                        <Input
                          type="date"
                          value={newSubDeadlineDate}
                          onChange={(e) => setNewSubDeadlineDate(e.target.value)}
                          className="text-xs h-9 bg-background"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Deadline Time</Label>
                        <Input
                          type="time"
                          value={newSubDeadlineNumber}
                          onChange={(e) => setNewSubDeadlineNumber(e.target.value)}
                          className="text-xs h-9 bg-background"
                        />
                      </div>

                      <div className="space-y-1">
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

                      <div className="space-y-1">
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
                  )}
                </>
              )}

              `;

content = content.slice(0, startIndex) + replacement + content.slice(endIndex);
fs.writeFileSync('app/admin/operations/tasks/page.tsx', content, 'utf8');
console.log('Successfully updated Modal 2 input fields in tasks page!');

