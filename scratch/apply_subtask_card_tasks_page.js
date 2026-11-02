const fs = require('fs');

let code = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Add SubtaskCard import
if (!code.includes('import { SubtaskCard }')) {
  code = code.replace(
    'import { SubTaskWorkUpdateDialog } from "./subtask-work-update-dialog";',
    `import { SubTaskWorkUpdateDialog } from "./subtask-work-update-dialog";
import { SubtaskCard } from "@/components/subtask-card";`
  );
}

// 2. Add editSubCadence state
if (!code.includes('const [editSubCadence, setEditSubCadence]')) {
  code = code.replace(
    '  const [editSubIsDaily, setEditSubIsDaily] = useState(false);',
    `  const [editSubIsDaily, setEditSubIsDaily] = useState(false);
  const [editSubCadence, setEditSubCadence] = useState("once");`
  );

  code = code.replace(
    '    setEditSubIsDaily(Boolean((sub as any).is_daily_recurring));',
    `    const cad = (sub as any).cadence || ((sub as any).is_daily_recurring ? "daily" : "once");
    setEditSubCadence(cad);
    setEditSubIsDaily(cad !== "once");`
  );

  code = code.replace(
    '        is_daily_recurring: editSubIsDaily,',
    `        cadence: editSubCadence,
        is_daily_recurring: editSubCadence !== "once",`
  );
}

// 3. Update Cadence in MODAL 3 (Edit Deliverable / Sub-Task Dialog)
const oldModal3Cadence = `            {/* Frequency Cadence: Daily vs Once */}
            <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Task Cadence: Daily Recurring vs One-Time</span>
              </Label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditSubIsDaily(false)}
                  className={\`p-2.5 rounded-lg border text-left transition-all text-xs font-bold flex items-center gap-2 cursor-pointer \${
                    !editSubIsDaily
                      ? "bg-background border-primary text-foreground shadow-xs ring-1 ring-primary/40"
                      : "bg-muted/40 text-muted-foreground hover:bg-background border-border"
                  }\`}
                >
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span>⚡ Once (One-Time)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditSubIsDaily(true)}
                  className={\`p-2.5 rounded-lg border text-left transition-all text-xs font-bold flex items-center gap-2 cursor-pointer \${
                    editSubIsDaily
                      ? "bg-background border-primary text-foreground shadow-xs ring-1 ring-primary/40"
                      : "bg-muted/40 text-muted-foreground hover:bg-background border-border"
                  }\`}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                  <span>🔁 Daily Basis</span>
                </button>
              </div>
            </div>`;

const newModal3Cadence = `            {/* Single Dropdown for Task Cadence / Frequency per User Request */}
            <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Task Cadence / Frequency *</span>
              </Label>
              <select
                value={editSubCadence}
                onChange={(e) => {
                  setEditSubCadence(e.target.value);
                  setEditSubIsDaily(e.target.value !== "once");
                }}
                className="w-full h-9 text-xs bg-background rounded-md border border-input px-3 font-semibold outline-none cursor-pointer text-foreground shadow-2xs"
              >
                <option value="once">⚡ Once (One-Time)</option>
                <option value="daily">🔁 Daily Basis</option>
                <option value="weekly">📅 Weekly Basis</option>
                <option value="monthly">🗓️ Monthly Basis</option>
              </select>
            </div>`;

if (code.includes(oldModal3Cadence)) {
  code = code.replace(oldModal3Cadence, newModal3Cadence);
  console.log("Replaced MODAL 3 cadence with single dropdown!");
}

// 4. Update Cadence in MODAL 2 (Add Sub-Tasks Dialog)
const oldModal2Cadence = `                  {/* Row 2: Task Frequency & Cadence: Daily Basis vs Once */}
                  <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        Task Frequency & Cadence *
                      </Label>
                      <span className="text-[10px] text-muted-foreground font-medium">Daily vs One-Time</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewSubIsDailyRecurring(false)}
                        className={\`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all cursor-pointer \${
                          !newSubIsDailyRecurring
                            ? "bg-background border-primary shadow-xs ring-1 ring-primary/40 text-foreground font-semibold"
                            : "bg-card/60 hover:bg-background/80 border-border text-muted-foreground"
                        }\`}
                      >
                        <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-foreground">⚡ Once (One-Time)</div>
                          <div className="text-[10px] text-muted-foreground leading-tight">Standard single deliverable with deadline</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewSubIsDailyRecurring(true)}
                        className={\`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all cursor-pointer \${
                          newSubIsDailyRecurring
                            ? "bg-background border-primary shadow-xs ring-1 ring-primary/40 text-foreground font-semibold"
                            : "bg-card/60 hover:bg-background/80 border-border text-muted-foreground"
                        }\`}
                      >
                        <RefreshCw className="w-4 h-4 text-blue-500 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-foreground">🔁 Daily Basis</div>
                          <div className="text-[10px] text-muted-foreground leading-tight">Repeats everyday at exact time</div>
                        </div>
                      </button>
                    </div>
                  </div>`;

const newModal2Cadence = `                  {/* Single Dropdown for Task Frequency & Cadence per User Request */}
                  <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      Task Frequency & Cadence *
                    </Label>
                    <select
                      value={newSubCadence}
                      onChange={(e) => {
                        setNewSubCadence(e.target.value);
                        setNewSubIsDailyRecurring(e.target.value !== "once");
                      }}
                      className="w-full h-9 text-xs bg-background rounded-md border border-input px-3 font-semibold outline-none cursor-pointer text-foreground shadow-2xs"
                    >
                      <option value="once">⚡ Once (One-Time)</option>
                      <option value="daily">🔁 Daily Basis</option>
                      <option value="weekly">📅 Weekly Basis</option>
                      <option value="monthly">🗓️ Monthly Basis</option>
                    </select>
                  </div>`;

if (code.includes(oldModal2Cadence)) {
  code = code.replace(oldModal2Cadence, newModal2Cadence);
  console.log("Replaced MODAL 2 cadence with single dropdown!");
}

// 5. Replace Board Card subtask loop with SubtaskCard
const boardSubtaskAnchorStart = `{isExpanded && subTasksList.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {subTasksList.map((sub: any, sIdx: number) => {`;

const boardSubtaskAnchorEnd = `                        })}
                      </div>
                    )}`;

const boardSubtaskReplacement = `{isExpanded && subTasksList.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {subTasksList.map((sub: any, sIdx: number) => (
                          <SubtaskCard
                            key={sub.id || sIdx}
                            task={task}
                            subtask={sub}
                            index={sIdx}
                            currentUserId={user?.id}
                            isClientView={isClientRole || Boolean(pathname?.startsWith("/client"))}
                            staffOptions={getProjectStaffOptions(task)}
                            allowedStatuses={allowedStatuses}
                            onUpdateSubtask={handleDirectSubtaskFieldUpdate}
                            onDeleteSubtask={handleDirectSubtaskDelete}
                            onOpenEdit={(t, s) => handleOpenEditSubtask(t, s)}
                            onOpenHistory={() => setHistoryModalTask(task)}
                            onOpenUploads={(t, s) => setUploadModalState({ task: t, subtask: s })}
                            onStatusChange={(t, subId, status) => handleSubTaskStatusDirectUpdate(t, subId, status)}
                            onStart={(t, s) => handleSubTaskStatusDirectUpdate(t, s.id, "in_progress")}
                            onStop={(t, s) => handleSubTaskStatusDirectUpdate(t, s.id, "pending")}
                          />
                        ))}
                      </div>
                    )}`;

const bStartIdx = code.indexOf(boardSubtaskAnchorStart);
if (bStartIdx !== -1) {
  const bEndIdx = code.indexOf(boardSubtaskAnchorEnd, bStartIdx);
  if (bEndIdx !== -1) {
    code = code.substring(0, bStartIdx) + boardSubtaskReplacement + code.substring(bEndIdx + boardSubtaskAnchorEnd.length);
    console.log("Replaced Board subtask rendering with SubtaskCard!");
  }
}

// 6. Replace List View subtask loop with SubtaskCard
const listSubtaskAnchorStart = `{isExpanded && subTasksList.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {subTasksList.map((sub, index) => {`;

const listSubtaskAnchorEnd = `                        })}
                      </div>
                    )}`;

const listSubtaskReplacement = `{isExpanded && subTasksList.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {subTasksList.map((sub: any, sIdx: number) => (
                          <SubtaskCard
                            key={sub.id || sIdx}
                            task={task}
                            subtask={sub}
                            index={sIdx}
                            currentUserId={user?.id}
                            isClientView={isClientRole || Boolean(pathname?.startsWith("/client"))}
                            staffOptions={getProjectStaffOptions(task)}
                            allowedStatuses={allowedStatuses}
                            onUpdateSubtask={handleDirectSubtaskFieldUpdate}
                            onDeleteSubtask={handleDirectSubtaskDelete}
                            onOpenEdit={(t, s) => handleOpenEditSubtask(t, s)}
                            onOpenHistory={() => setHistoryModalTask(task)}
                            onOpenUploads={(t, s) => setUploadModalState({ task: t, subtask: s })}
                            onStatusChange={(t, subId, status) => handleSubTaskStatusDirectUpdate(t, subId, status)}
                            onStart={(t, s) => handleSubTaskStatusDirectUpdate(t, s.id, "in_progress")}
                            onStop={(t, s) => handleSubTaskStatusDirectUpdate(t, s.id, "pending")}
                          />
                        ))}
                      </div>
                    )}`;

const lStartIdx = code.indexOf(listSubtaskAnchorStart);
if (lStartIdx !== -1) {
  const lEndIdx = code.indexOf(listSubtaskAnchorEnd, lStartIdx);
  if (lEndIdx !== -1) {
    code = code.substring(0, lStartIdx) + listSubtaskReplacement + code.substring(lEndIdx + listSubtaskAnchorEnd.length);
    console.log("Replaced List subtask rendering with SubtaskCard!");
  }
}

fs.writeFileSync('app/admin/operations/tasks/page.tsx', code, 'utf8');
console.log('Successfully saved app/admin/operations/tasks/page.tsx');

