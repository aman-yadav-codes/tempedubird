# Update operations/tasks/page.tsx
with open('app/admin/operations/tasks/page.tsx', 'r', encoding='utf-8') as f:
    page_content = f.read()

target_page_marker = '''  // Handle opening subtasks modal directly from URL query param
  useEffect(() => {'''

repl_page_effect = '''  // Keep uploadModalState and workUpdateModalState in sync whenever tasks update
  useEffect(() => {
    if (!uploadModalState) return;
    const currentTask = tasks.find((t) => t.id === uploadModalState.task.id);
    if (!currentTask) return;
    const currentSub = (currentTask.sub_tasks || []).find(
      (s: any) => String(s.id) === String(uploadModalState.subtask.id)
    );
    if (currentSub) {
      setUploadModalState({ task: currentTask, subtask: currentSub });
    }
  }, [tasks]);

  useEffect(() => {
    if (!workUpdateModalState) return;
    const currentTask = tasks.find((t) => t.id === workUpdateModalState.task.id);
    if (!currentTask) return;
    const currentSub = (currentTask.sub_tasks || []).find(
      (s: any) => String(s.id) === String(workUpdateModalState.subtask.id)
    );
    if (currentSub) {
      setWorkUpdateModalState({ task: currentTask, subtask: currentSub });
    }
  }, [tasks]);

  // Handle opening subtasks modal directly from URL query param
  useEffect(() => {'''

if target_page_marker in page_content:
    page_content = page_content.replace(target_page_marker, repl_page_effect, 1)
    with open('app/admin/operations/tasks/page.tsx', 'w', encoding='utf-8') as f:
        f.write(page_content)
    print('Updated operations/tasks/page.tsx successfully')
else:
    print('target_page_marker not found in page.tsx')


# Update my-profile-client.tsx
with open('app/admin/my-profile/my-profile-client.tsx', 'r', encoding='utf-8') as f:
    prof_content = f.read()

target_prof_marker = '''  const normalizeTaskStatus = (status?: string) => {'''

repl_prof_effect = '''  useEffect(() => {
    if (!uploadModalState) return;
    const currentTask = tasks.find((t: any) => t.id === uploadModalState.task.id);
    if (!currentTask) return;
    const currentSub = (currentTask.sub_tasks || []).find(
      (s: any) => String(s.id) === String(uploadModalState.subtask.id)
    );
    if (currentSub) {
      setUploadModalState({ task: currentTask, subtask: currentSub });
    }
  }, [tasks]);

  useEffect(() => {
    if (!workUpdateModalState) return;
    const currentTask = tasks.find((t: any) => t.id === workUpdateModalState.task.id);
    if (!currentTask) return;
    const currentSub = (currentTask.sub_tasks || []).find(
      (s: any) => String(s.id) === String(workUpdateModalState.subtask.id)
    );
    if (currentSub) {
      setWorkUpdateModalState({ task: currentTask, subtask: currentSub });
    }
  }, [tasks]);

  const normalizeTaskStatus = (status?: string) => {'''

if target_prof_marker in prof_content:
    prof_content = prof_content.replace(target_prof_marker, repl_prof_effect, 1)
    with open('app/admin/my-profile/my-profile-client.tsx', 'w', encoding='utf-8') as f:
        f.write(prof_content)
    print('Updated my-profile-client.tsx successfully')
else:
    print('target_prof_marker not found in my-profile-client.tsx')

