with open('app/admin/my-profile/my-profile-client.tsx', 'r', encoding='utf8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if any(k in l for k in ['<TabsList', 'TabsTrigger', 'value="attendance"', 'value="leaderboard"']):
        print(i + 1, l.strip())

