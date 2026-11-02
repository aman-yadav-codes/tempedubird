const fs = require('fs');

let sync = fs.readFileSync('app/lib/task-attendance-sync.ts', 'utf8');

const helperCode = `

export interface GeoLocationPoint {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  source?: string;
  timestamp?: string;
}

export interface DayCheckInSession {
  id: string;
  sessionIndex: number;
  taskId: number;
  taskTitle: string;
  subtaskId?: string | number | null;
  subtaskTitle?: string | null;
  startTime: string;
  startFormatted: string;
  startLocation: GeoLocationPoint | null;
  stopTime: string | null;
  stopFormatted: string;
  stopLocation: GeoLocationPoint | null;
  durationMinutes: number;
  durationFormatted: string;
  isActive: boolean;
  status: "in_progress" | "stopped" | "completed";
  actionUser?: string;
}

/**
 * Extracts and reconstructs all check-in & check-out sessions with geo-locations for a given day
 */
export function getDayCheckInSessions(tasks: any[], targetDateStr: string): DayCheckInSession[] {
  const sessions: DayCheckInSession[] = [];
  const todayLocalStr = toLocalDateStr(new Date());
  const todayIsoStr = new Date().toISOString().split("T")[0];
  const isTargetToday = targetDateStr === todayLocalStr || targetDateStr === todayIsoStr;
  const nowMs = Date.now();

  const formatTime = (ts: string | number) => {
    try {
      return new Date(ts).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return String(ts);
    }
  };

  const formatMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return String(h) + "h " + String(m).padStart(2, "0") + "m";
    return String(m) + "m";
  };

  const cleanLoc = (loc: any): GeoLocationPoint | null => {
    if (!loc || typeof loc !== "object") return null;
    const lat = Number(loc.latitude ?? loc.lat);
    const lng = Number(loc.longitude ?? loc.lng ?? loc.lon);
    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;
    return {
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      accuracy: loc.accuracy ? Math.round(Number(loc.accuracy)) : undefined,
      address: loc.address ? String(loc.address) : undefined,
      source: loc.source ? String(loc.source) : undefined,
      timestamp: loc.timestamp ? String(loc.timestamp) : undefined,
    };
  };

  tasks.forEach((t) => {
    let handledFromHistory = false;

    if (Array.isArray(t.history) && t.history.length > 0) {
      const eventsByEntity: Record<string, any[]> = {};
      t.history.forEach((evt: any) => {
        if (!evt.timestamp) return;
        const key = evt.subtask_id ? ("sub_" + String(evt.subtask_id)) : ("task_" + String(t.id));
        if (!eventsByEntity[key]) eventsByEntity[key] = [];
        eventsByEntity[key].push(evt);
      });

      Object.entries(eventsByEntity).forEach(([key, events]) => {
        const sorted = [...events].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        let currentStartEvt: any = null;

        sorted.forEach((evt: any) => {
          if (evt.action === "started") {
            currentStartEvt = evt;
          } else if (evt.action === "stopped" || evt.action === "completed") {
            if (currentStartEvt) {
              const startOnTarget = isDateMatch(currentStartEvt.timestamp, targetDateStr);
              const stopOnTarget = isDateMatch(evt.timestamp, targetDateStr);

              if (startOnTarget || stopOnTarget) {
                handledFromHistory = true;
                const startMs = new Date(currentStartEvt.timestamp).getTime();
                const stopMs = new Date(evt.timestamp).getTime();
                const durMins = Math.max(1, Math.round((stopMs - startMs) / 60000));

                sessions.push({
                  id: "sess_" + String(t.id) + "_" + String(startMs),
                  sessionIndex: 0,
                  taskId: t.id,
                  taskTitle: t.title || "Task",
                  subtaskId: currentStartEvt.subtask_id || evt.subtask_id || null,
                  subtaskTitle: currentStartEvt.subtask_title || evt.subtask_title || null,
                  startTime: currentStartEvt.timestamp,
                  startFormatted: formatTime(currentStartEvt.timestamp),
                  startLocation: cleanLoc(currentStartEvt.location || currentStartEvt.start_location || t.start_location),
                  stopTime: evt.timestamp,
                  stopFormatted: formatTime(evt.timestamp),
                  stopLocation: cleanLoc(evt.location || evt.stop_location || t.stop_location),
                  durationMinutes: durMins,
                  durationFormatted: formatMins(durMins),
                  isActive: false,
                  status: evt.action === "completed" ? "completed" : "stopped",
                  actionUser: evt.user_name || currentStartEvt.user_name || undefined,
                });
              }
              currentStartEvt = null;
            }
          }
        });

        // Currently in progress session
        if (currentStartEvt && isTargetToday) {
          if (isDateMatch(currentStartEvt.timestamp, targetDateStr)) {
            handledFromHistory = true;
            const startMs = new Date(currentStartEvt.timestamp).getTime();
            const durMins = Math.max(1, Math.round((nowMs - startMs) / 60000));

            sessions.push({
              id: "sess_" + String(t.id) + "_" + String(startMs),
              sessionIndex: 0,
              taskId: t.id,
              taskTitle: t.title || "Task",
              subtaskId: currentStartEvt.subtask_id || null,
              subtaskTitle: currentStartEvt.subtask_title || null,
              startTime: currentStartEvt.timestamp,
              startFormatted: formatTime(currentStartEvt.timestamp),
              startLocation: cleanLoc(currentStartEvt.location || currentStartEvt.start_location || t.start_location),
              stopTime: null,
              stopFormatted: "Active / In Progress",
              stopLocation: null,
              durationMinutes: durMins,
              durationFormatted: formatMins(durMins),
              isActive: true,
              status: "in_progress",
              actionUser: currentStartEvt.user_name || undefined,
            });
          }
        }
      });
    }

    // Direct timestamps fallback if no history sessions were registered for this task on target date
    if (!handledFromHistory && t.started_at && isDateMatch(t.started_at, targetDateStr)) {
      const startMs = new Date(t.started_at).getTime();
      let stopMs = null;
      let stopTimeStr = null;
      let status = "stopped";
      let isActive = false;

      if (t.stopped_at) {
        stopMs = new Date(t.stopped_at).getTime();
        stopTimeStr = t.stopped_at;
      } else if (t.completed_at) {
        stopMs = new Date(t.completed_at).getTime();
        stopTimeStr = t.completed_at;
        status = "completed";
      } else if (isTargetToday && t.status === "in_progress") {
        stopMs = nowMs;
        status = "in_progress";
        isActive = true;
      }

      const durMins = stopMs ? Math.max(1, Math.round((stopMs - startMs) / 60000)) : 1;

      sessions.push({
        id: "sess_direct_" + String(t.id) + "_" + String(startMs),
        sessionIndex: 0,
        taskId: t.id,
        taskTitle: t.title || "Task",
        startTime: t.started_at,
        startFormatted: formatTime(t.started_at),
        startLocation: cleanLoc(t.start_location),
        stopTime: stopTimeStr,
        stopFormatted: isActive ? "Active / In Progress" : stopTimeStr ? formatTime(stopTimeStr) : "-",
        stopLocation: cleanLoc(t.stop_location),
        durationMinutes: durMins,
        durationFormatted: formatMins(durMins),
        isActive,
        status: status,
        actionUser: t.assigned_employee_name || undefined,
      });
    }
  });

  // Sort sessions chronologically
  sessions.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Assign 1-based index
  sessions.forEach((s, idx) => {
    s.sessionIndex = idx + 1;
  });

  return sessions;
}
`;

fs.writeFileSync('app/lib/task-attendance-sync.ts', sync + '\n' + helperCode, 'utf8');
console.log('Appended clean helperCode to task-attendance-sync.ts!');

