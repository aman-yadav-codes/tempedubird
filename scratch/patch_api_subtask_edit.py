with open(r'd:/CRM/app/api/admin/operations/tasks/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''          // Enforce: For any subtask that already existed, staff cannot modify title, price, points, penalty, or assignee
          subs = subs.map((s: any) => {
            const ex = existingMap.get(String(s.id));
            const isThisSubStarting = s.status === "in_progress" && (!ex || ex.status !== "in_progress");
            const isThisSubStopping = s.status === "pending" && ex && ex.status === "in_progress";
            if (ex) {
              return {
                ...ex,
                status: s.status || ex.status,
                uploads: s.uploads !== undefined ? s.uploads : ex.uploads || [],
                work_updates: s.work_updates !== undefined ? s.work_updates : ex.work_updates || [],
                started_at: isThisSubStarting ? new Date().toISOString() : ex.started_at || null,
                started_by_name: isThisSubStarting ? currentUserName : (ex.started_by_name || s.started_by_name || null),
                started_by_id: isThisSubStarting ? currentUserId : (ex.started_by_id || s.started_by_id || null),
                stopped_at: isThisSubStopping ? new Date().toISOString() : isThisSubStarting ? null : ex.stopped_at || null,
                stopped_by_name: isThisSubStopping ? currentUserName : (ex.stopped_by_name || null),
              };
            }
            // New subtask added by staff: lock points and penalty to standard defaults
            return {
              ...s,
              points: 20,
              penalty_points: 10,
              started_at: isThisSubStarting ? new Date().toISOString() : null,
              started_by_name: isThisSubStarting ? currentUserName : null,
              started_by_id: isThisSubStarting ? currentUserId : null,
              stopped_at: null,
            };
          });'''

replacement = '''          // Staff can update deliverable/subtask details (title, price, cadence, duration, deadline, urgency, points, assignee)
          subs = subs.map((s: any) => {
            const ex = existingMap.get(String(s.id));
            const isThisSubStarting = s.status === "in_progress" && (!ex || ex.status !== "in_progress");
            const isThisSubStopping = s.status === "pending" && ex && ex.status === "in_progress";
            if (ex) {
              return {
                ...ex,
                ...s,
                status: s.status || ex.status,
                uploads: s.uploads !== undefined ? s.uploads : ex.uploads || [],
                work_updates: s.work_updates !== undefined ? s.work_updates : ex.work_updates || [],
                started_at: isThisSubStarting ? new Date().toISOString() : ex.started_at || null,
                started_by_name: isThisSubStarting ? currentUserName : (ex.started_by_name || s.started_by_name || null),
                started_by_id: isThisSubStarting ? currentUserId : (ex.started_by_id || s.started_by_id || null),
                stopped_at: isThisSubStopping ? new Date().toISOString() : isThisSubStarting ? null : ex.stopped_at || null,
                stopped_by_name: isThisSubStopping ? currentUserName : (ex.stopped_by_name || null),
              };
            }
            return {
              ...s,
              points: s.points !== undefined ? s.points : 20,
              penalty_points: s.penalty_points !== undefined ? s.penalty_points : 10,
              started_at: isThisSubStarting ? new Date().toISOString() : null,
              started_by_name: isThisSubStarting ? currentUserName : null,
              started_by_id: isThisSubStarting ? currentUserId : null,
              stopped_at: null,
            };
          });'''

if target in content:
    content = content.replace(target, replacement, 1)
    print("Replaced in route.ts (LF)")
elif target.replace('\n', '\r\n') in content:
    content = content.replace(target.replace('\n', '\r\n'), replacement.replace('\n', '\r\n'), 1)
    print("Replaced in route.ts (CRLF)")
else:
    print("target not found in route.ts")

with open(r'd:/CRM/app/api/admin/operations/tasks/route.ts', 'w', encoding='utf-8') as f:
    f.write(content)

