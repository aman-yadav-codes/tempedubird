import psycopg2, os

db_url = None
for f in ['.env.local', '.env']:
    if os.path.exists(f):
        for line in open(f):
            if line.startswith('DATABASE_URL='):
                db_url = line.strip().split('=', 1)[1].strip('"\'')
                break
    if db_url: break

conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'staff_generated_letters' ORDER BY ordinal_position")
print("staff_generated_letters:", cur.fetchall())

cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'finance_income_entries' ORDER BY ordinal_position")
print("finance_income_entries:", cur.fetchall())

cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'finance_expense_entries' ORDER BY ordinal_position")
print("finance_expense_entries:", cur.fetchall())

cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'finance_invoices' ORDER BY ordinal_position")
print("finance_invoices:", cur.fetchall())

