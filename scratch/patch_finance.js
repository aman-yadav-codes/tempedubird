const fs = require('fs');

// Patch income/route.ts
let inc = fs.readFileSync('app/api/admin/finance/income/route.ts', 'utf8');
const isCRLFInc = inc.includes('\r\n');
const nlInc = isCRLFInc ? '\r\n' : '\n';

if (!inc.includes('recordPerformancePoints')) {
  inc = `import { recordPerformancePoints } from "@/lib/performance/performance-engine";` + nlInc + inc;
  const targetInc = `await createFinanceIncomeEntry(db, {`;
  const replaceInc = `const createdIncome = await createFinanceIncomeEntry(db, {`;
  inc = inc.replace(targetInc, replaceInc);

  const targetRet = `return NextResponse.json({ ok: true });`;
  const replaceRet = `try {
      await recordPerformancePoints({
        employeeId: user.id,
        activityType: "finance_income",
        referenceModule: "finance_income",
        referenceRecordId: createdIncome?.id || Date.now(),
        performedBy: { id: user.id, name: user.full_name || "Admin" },
        customDescription: "Added finance income record",
        institutionId: institutionId || undefined,
      });
    } catch (e) {
      console.warn("[Finance Income] Performance points warning:", e);
    }

    return NextResponse.json({ ok: true });`;
  inc = inc.replace(targetRet, replaceRet);
  fs.writeFileSync('app/api/admin/finance/income/route.ts', inc, 'utf8');
  console.log('Successfully patched income/route.ts!');
}

// Patch expense/route.ts
let exp = fs.readFileSync('app/api/admin/finance/expense/route.ts', 'utf8');
const isCRLFExp = exp.includes('\r\n');
const nlExp = isCRLFExp ? '\r\n' : '\n';

if (!exp.includes('recordPerformancePoints')) {
  exp = `import { recordPerformancePoints } from "@/lib/performance/performance-engine";` + nlExp + exp;
  const targetExp = `await createFinanceExpenseEntry(db, {`;
  const replaceExp = `const createdExpense = await createFinanceExpenseEntry(db, {`;
  exp = exp.replace(targetExp, replaceExp);

  const targetExpRet = `return NextResponse.json({ ok: true });`;
  const replaceExpRet = `try {
      await recordPerformancePoints({
        employeeId: user.id,
        activityType: "finance_expense",
        referenceModule: "finance_expense",
        referenceRecordId: createdExpense?.id || Date.now(),
        performedBy: { id: user.id, name: user.full_name || "Admin" },
        customDescription: "Added finance expense record",
        institutionId: institutionId || undefined,
      });
    } catch (e) {
      console.warn("[Finance Expense] Performance points warning:", e);
    }

    return NextResponse.json({ ok: true });`;
  exp = exp.replace(targetExpRet, replaceExpRet);
  fs.writeFileSync('app/api/admin/finance/expense/route.ts', exp, 'utf8');
  console.log('Successfully patched expense/route.ts!');
}

