import re

# 1. Update app/admin/operations/tasks/page.tsx
with open('app/admin/operations/tasks/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    # Check for cardImgs rendering block (around lines 2938-2958)
    if 'return (' in line and i > 2930 and i < 2945 and 'cardImgs' in ''.join(lines[max(0, i-20):i]):
        new_lines.append(line)
        new_lines.append('                                    <button\n')
        new_lines.append('                                      type="button"\n')
        new_lines.append('                                      onClick={() => setUploadModalState({ task, subtask: sub })}\n')
        new_lines.append('                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold transition-all cursor-pointer shadow-2xs shrink-0"\n')
        new_lines.append('                                      title="Click to view attached deliverable images in popup"\n')
        new_lines.append('                                    >\n')
        new_lines.append('                                      <ImageIcon className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />\n')
        new_lines.append('                                      <span>{cardImgs.length} {cardImgs.length === 1 ? "image" : "images"}</span>\n')
        new_lines.append('                                    </button>\n')
        skip = True
        continue
    if skip:
        if line.strip() == ');':
            new_lines.append(line)
            skip = False
        continue

    # Remove Status: label
    if '<span className="text-[10px] text-muted-foreground">Status:</span>' in line:
        continue

    new_lines.append(line)

with open('app/admin/operations/tasks/page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print('Updated operations/tasks/page.tsx')


# 2. Update app/admin/my-profile/my-profile-client.tsx
with open('app/admin/my-profile/my-profile-client.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if 'return (' in line and i > 2715 and i < 2730 and 'subImages' in ''.join(lines[max(0, i-20):i]):
        new_lines.append(line)
        new_lines.append('                                          <button\n')
        new_lines.append('                                            type="button"\n')
        new_lines.append('                                            onClick={() => setUploadModalState({ task, subtask: sub })}\n')
        new_lines.append('                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold transition-all cursor-pointer shadow-2xs shrink-0"\n')
        new_lines.append('                                            title="Click to view attached deliverable images in popup"\n')
        new_lines.append('                                          >\n')
        new_lines.append('                                            <ImageIcon className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />\n')
        new_lines.append('                                            <span>{subImages.length} {subImages.length === 1 ? "image" : "images"}</span>\n')
        new_lines.append('                                          </button>\n')
        skip = True
        continue
    if skip:
        if line.strip() == ');':
            new_lines.append(line)
            skip = False
        continue

    # Remove Status: label
    if '<span className="text-[10px] text-muted-foreground font-medium">Status:</span>' in line:
        continue

    new_lines.append(line)

with open('app/admin/my-profile/my-profile-client.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print('Updated my-profile-client.tsx')

