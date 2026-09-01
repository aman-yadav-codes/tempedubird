import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "monthly"; // "weekly" | "monthly" | "yearly"
    const institutionIdParam = searchParams.get("institution_id");

    const isPlatformAdmin = user ? isPlatformAdminUser(user) : true;

    // Determine target institution ID (if applicable)
    let targetInstitutionId: number | null = null;
    if (user && !isPlatformAdmin) {
      targetInstitutionId = user.memberships?.find(m => m.institution_id)?.institution_id || (user as any).under_institution_id || null;
    } else if (institutionIdParam && institutionIdParam !== "all") {
      targetInstitutionId = Number(institutionIdParam) || null;
    }

    // 1. Fetch Income Records from DB (Manual entries + Student Fee Payments / Subscriptions)
    let incomeQuery = "";
    const incomeParams: any[] = [];
    if (targetInstitutionId) {
      incomeParams.push(targetInstitutionId);
      incomeQuery = `
        SELECT 
          fie.amount::numeric AS amount,
          fie.income_date::date AS date,
          COALESCE(fic.name, 'Manual Income') AS category_name
        FROM finance_income_entries fie
        LEFT JOIN finance_income_categories fic ON fic.id = fie.category_id
        WHERE fie.scope_type = 'institution' AND fie.institution_id = $1

        UNION ALL

        SELECT 
          COALESCE(sfp.total_amount, sfp.subtotal_amount, 0)::numeric AS amount,
          COALESCE(sfp.received_at, sfp.verified_at, sfp.created_at)::date AS date,
          'Student Fees' AS category_name
        FROM student_fee_payments sfp
        WHERE sfp.institution_id = $1
          AND LOWER(COALESCE(sfp.status, 'paid')) IN ('paid', 'verified', 'approved')
          AND COALESCE(sfp.total_amount, sfp.subtotal_amount, 0) > 0
      `;
    } else {
      incomeQuery = `
        SELECT 
          fie.amount::numeric AS amount,
          fie.income_date::date AS date,
          COALESCE(fic.name, 'Manual Income') AS category_name
        FROM finance_income_entries fie
        LEFT JOIN finance_income_categories fic ON fic.id = fie.category_id
        WHERE fie.scope_type = 'platform' AND (fie.institution_id IS NULL OR fie.institution_id = 0)

        UNION ALL

        SELECT 
          st.amount::numeric AS amount,
          COALESCE(st.paid_at, st.created_at)::date AS date,
          'Platform Subscriptions' AS category_name
        FROM subscription_transactions st
        WHERE LOWER(COALESCE(st.status, 'paid')) IN ('paid', 'completed', 'success')
          AND COALESCE(st.amount, 0) > 0
      `;
    }

    const incomeRes = await db.query(incomeQuery, incomeParams).catch(() => ({ rows: [] }));
    const incomeRows: { amount: number; date: string; category_name: string }[] = incomeRes.rows.map((r: any) => ({
      amount: Number(r.amount) || 0,
      date: r.date ? new Date(r.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      category_name: r.category_name || "General Income",
    }));

    // 2. Fetch Expense Records from DB (Manual entries + Allowances Distributed)
    let expenseQuery = "";
    const expenseParams: any[] = [];
    if (targetInstitutionId) {
      expenseParams.push(targetInstitutionId);
      expenseQuery = `
        SELECT 
          fee.amount::numeric AS amount,
          fee.expense_date::date AS date,
          COALESCE(fec.name, 'Operational Expenses') AS category_name
        FROM finance_expense_entries fee
        LEFT JOIN finance_expense_categories fec ON fec.id = fee.category_id
        WHERE fee.scope_type = 'institution' AND fee.institution_id = $1

        UNION ALL

        SELECT 
          fae.amount::numeric AS amount,
          fae.allowance_date::date AS date,
          'Staff & Faculty Allowances' AS category_name
        FROM finance_allowance_entries fae
        WHERE fae.scope_type = 'institution' AND fae.institution_id = $1
      `;
    } else {
      expenseQuery = `
        SELECT 
          fee.amount::numeric AS amount,
          fee.expense_date::date AS date,
          COALESCE(fec.name, 'Operational Expenses') AS category_name
        FROM finance_expense_entries fee
        LEFT JOIN finance_expense_categories fec ON fec.id = fee.category_id
        WHERE fee.scope_type = 'platform' AND (fee.institution_id IS NULL OR fee.institution_id = 0)

        UNION ALL

        SELECT 
          fae.amount::numeric AS amount,
          fae.allowance_date::date AS date,
          'Staff & Faculty Allowances' AS category_name
        FROM finance_allowance_entries fae
        WHERE fae.scope_type = 'platform' AND (fae.institution_id IS NULL OR fae.institution_id = 0)
      `;
    }

    const expenseRes = await db.query(expenseQuery, expenseParams).catch(() => ({ rows: [] }));
    const expenseRows: { amount: number; date: string; category_name: string }[] = expenseRes.rows.map((r: any) => ({
      amount: Number(r.amount) || 0,
      date: r.date ? new Date(r.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      category_name: r.category_name || "General Expense",
    }));

    // 3. Build time periods based on timeframe
    let chartData: {
      period: string;
      gross_income: number;
      total_expense: number;
      net_income: number;
      profit_margin: number;
    }[] = [];

    const now = new Date();

    if (timeframe === "weekly") {
      // Last 8 weeks
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7 + 6));
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() - i * 7);
        weekEnd.setHours(23, 59, 59, 999);

        const startStr = weekStart.toISOString().split("T")[0];
        const endStr = weekEnd.toISOString().split("T")[0];

        const periodLabel = i === 0 ? "Current Week" : `${weekStart.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`;

        const periodIncome = incomeRows
          .filter(r => r.date >= startStr && r.date <= endStr)
          .reduce((sum, r) => sum + r.amount, 0);

        const periodExpense = expenseRows
          .filter(r => r.date >= startStr && r.date <= endStr)
          .reduce((sum, r) => sum + r.amount, 0);

        const net = periodIncome - periodExpense;
        const margin = periodIncome > 0 ? Number(((net / periodIncome) * 100).toFixed(1)) : 0;

        chartData.push({
          period: periodLabel,
          gross_income: periodIncome,
          total_expense: periodExpense,
          net_income: net,
          profit_margin: margin,
        });
      }
    } else if (timeframe === "yearly") {
      // Last 4 years
      const currentYear = now.getFullYear();
      for (let y = currentYear - 3; y <= currentYear; y++) {
        const startStr = `${y}-01-01`;
        const endStr = `${y}-12-31`;
        const periodLabel = y === currentYear ? `${y} (YTD)` : `${y}`;

        const periodIncome = incomeRows
          .filter(r => r.date >= startStr && r.date <= endStr)
          .reduce((sum, r) => sum + r.amount, 0);

        const periodExpense = expenseRows
          .filter(r => r.date >= startStr && r.date <= endStr)
          .reduce((sum, r) => sum + r.amount, 0);

        const net = periodIncome - periodExpense;
        const margin = periodIncome > 0 ? Number(((net / periodIncome) * 100).toFixed(1)) : 0;

        chartData.push({
          period: periodLabel,
          gross_income: periodIncome,
          total_expense: periodExpense,
          net_income: net,
          profit_margin: margin,
        });
      }
    } else {
      // Default: Last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const monthStr = String(month).padStart(2, "0");
        const prefix = `${year}-${monthStr}`;

        const periodLabel = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

        const periodIncome = incomeRows
          .filter(r => r.date.startsWith(prefix))
          .reduce((sum, r) => sum + r.amount, 0);

        const periodExpense = expenseRows
          .filter(r => r.date.startsWith(prefix))
          .reduce((sum, r) => sum + r.amount, 0);

        const net = periodIncome - periodExpense;
        const margin = periodIncome > 0 ? Number(((net / periodIncome) * 100).toFixed(1)) : 0;

        chartData.push({
          period: periodLabel,
          gross_income: periodIncome,
          total_expense: periodExpense,
          net_income: net,
          profit_margin: margin,
        });
      }
    }

    // 4. Overall Totals
    const totalGrossIncome = chartData.reduce((sum, c) => sum + c.gross_income, 0);
    const totalExpense = chartData.reduce((sum, c) => sum + c.total_expense, 0);
    const totalNetIncome = totalGrossIncome - totalExpense;
    const overallProfitMargin = totalGrossIncome > 0 ? Number(((totalNetIncome / totalGrossIncome) * 100).toFixed(1)) : 0;

    // Growth metrics (comparing latest period vs previous period)
    const len = chartData.length;
    const latest = chartData[len - 1] || { gross_income: 0, total_expense: 0, net_income: 0 };
    const prev = chartData[len - 2] || { gross_income: 0, total_expense: 0, net_income: 0 };

    const incomeGrowth = prev.gross_income > 0
      ? Number((((latest.gross_income - prev.gross_income) / prev.gross_income) * 100).toFixed(1))
      : (latest.gross_income > 0 ? 100 : 0);

    const expenseGrowth = prev.total_expense > 0
      ? Number((((latest.total_expense - prev.total_expense) / prev.total_expense) * 100).toFixed(1))
      : (latest.total_expense > 0 ? 100 : 0);

    const netProfitGrowth = prev.net_income !== 0
      ? Number((((latest.net_income - prev.net_income) / Math.abs(prev.net_income)) * 100).toFixed(1))
      : (latest.net_income > 0 ? 100 : 0);

    // 5. Category Breakdown Calculations
    const incomeCategoryMap: Record<string, number> = {};
    incomeRows.forEach(r => {
      incomeCategoryMap[r.category_name] = (incomeCategoryMap[r.category_name] || 0) + r.amount;
    });

    const totalCalculatedIncome = Object.values(incomeCategoryMap).reduce((a, b) => a + b, 0);
    let incomeCategories = Object.entries(incomeCategoryMap)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalCalculatedIncome > 0 ? Math.round((amount / totalCalculatedIncome) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    if (incomeCategories.length === 0) {
      incomeCategories = [
        { category: "Student Program & Tuition Fees", amount: 0, percentage: 0 },
        { category: "Platform & License Subscriptions", amount: 0, percentage: 0 },
      ];
    }

    const expenseCategoryMap: Record<string, number> = {};
    expenseRows.forEach(r => {
      expenseCategoryMap[r.category_name] = (expenseCategoryMap[r.category_name] || 0) + r.amount;
    });

    const totalCalculatedExpense = Object.values(expenseCategoryMap).reduce((a, b) => a + b, 0);
    let expenseCategories = Object.entries(expenseCategoryMap)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalCalculatedExpense > 0 ? Math.round((amount / totalCalculatedExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    if (expenseCategories.length === 0) {
      expenseCategories = [
        { category: "Staff & Faculty Allowances", amount: 0, percentage: 0 },
        { category: "Operational Expenses", amount: 0, percentage: 0 },
      ];
    }

    return NextResponse.json({
      success: true,
      timeframe,
      scope: isPlatformAdmin ? (targetInstitutionId ? "institution" : "platform") : "institution",
      summary: {
        gross_income: totalGrossIncome,
        total_expense: totalExpense,
        net_income: totalNetIncome,
        profit_margin: overallProfitMargin,
        is_profitable: totalNetIncome >= 0,
        income_growth_percentage: incomeGrowth,
        expense_growth_percentage: expenseGrowth,
        net_profit_growth_percentage: netProfitGrowth,
      },
      chart_data: chartData,
      breakdown: {
        income_sources: incomeCategories,
        expense_sources: expenseCategories,
      },
    });
  } catch (err) {
    console.error("Error generating financial performance stats:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load financial performance stats" },
      { status: 500 }
    );
  }
}
