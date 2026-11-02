python -c "
with open('app/admin/operations/tasks/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

for icon in ['ArrowLeft', 'ArrowRight', 'CheckCircle2', 'ListPlus', 'Zap', 'Trash2']:
    print(icon, icon in text)
"