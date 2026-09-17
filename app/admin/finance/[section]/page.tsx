"use client";

import { use } from "react";
import { ArrowLeftRight, BadgeDollarSign, BarChart3, Bus, CalendarDays, CreditCard, FileText, IndianRupee, Landmark, Tags, TrendingUp, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";

import { AllowanceClient } from "@/app/admin/finance/allowance-client";
import { Badge } from "@/components/ui/badge";
import { EmployeePerformanceClient } from "@/app/admin/finance/employee-performance-client";
import { ExpenseClient } from "@/app/admin/finance/expense-client";
import { FinanceCategoriesClient } from "@/app/admin/finance/categories-client";
import { IncomeClient } from "@/app/admin/finance/income-client";
import { InvoicesClient } from "@/app/admin/finance/invoices-client";
import { PaymentMethodsClient } from "@/app/admin/finance/payment-methods-client";
import { PerformanceClient } from "@/app/admin/finance/performance-client";
import { RecurringExpensesClient } from "@/app/admin/finance/recurring-expenses-client";
import { PurchaseSellRequestsClient } from "@/app/admin/finance/purchase-sell-client";
import { TransportationFeeClient } from "@/app/admin/finance/transportation-fee-client";
import FeeManagementPage from "@/app/admin/students/fee-management/page";

const FINANCE_SECTIONS = {
  "fee-management": {
    title: "Fee Management",
    description: "Manage student fees, receipts, concessions, and fee collection records.",
    icon: CreditCard,
  },
  "transportation-fee": {
    title: "Transportation Fee",
    description: "Configure student transportation charges according to distance (KM) ranges and route zones.",
    icon: Bus,
  },
  transportation: {
    title: "Transportation Fee",
    description: "Configure student transportation charges according to distance (KM) ranges and route zones.",
    icon: Bus,
  },
  requests: {
    title: "Purchase & Sell Requests",
    description: "Submit purchase & sell requests with multi-tier amount routing and designated approvers.",
    icon: ArrowLeftRight,
  },
  income: {
    title: "Income",
    description: "Track institution and platform income records.",
    icon: TrendingUp,
  },
  expense: {
    title: "Expense",
    description: "Track one-time operational expense records.",
    icon: CreditCard,
  },
  invoice: {
    title: "Invoice",
    description: "View and print automatically generated invoices and receipts.",
    icon: FileText,
  },
  allowance: {
    title: "Allowance",
    description: "Manage allowances and approved payout records.",
    icon: BadgeDollarSign,
  },
  "recurring-expenses": {
    title: "Recurring Expenses",
    description: "Manage repeating expense schedules.",
    icon: CalendarDays,
  },
  performance: {
    title: "Financial Performance",
    description: "Audit Profit & Loss, Gross Income, Net Income, and Weekly/Monthly/Yearly charts.",
    icon: BarChart3,
  },
  "employee-performance": {
    title: "Employee Performance",
    description: "Track employee sales generation, commissions, salary costs, and net ROI contribution.",
    icon: UsersRound,
  },
  "payment-methods": {
    title: "Payment Methods & Gateways",
    description: "Configure Online Payment Gateways (Razorpay, Cashfree, PayU, Stripe), Bank Accounts (Net Banking), and UPI Payment details (PhonePe, Google Pay, Paytm, QR Codes).",
    icon: Landmark,
  },
  categories: {
    title: "Finance Categories",
    description: "Configure finance categories that appear in Income, Expense, and Recurring Expenses.",
    icon: Tags,
  },
} as const;

type FinanceSection = keyof typeof FINANCE_SECTIONS;

type FinanceSectionPageProps = {
  params: Promise<{
    section: string;
  }>;
};

export default function FinanceSectionPage({ params }: FinanceSectionPageProps) {
  const { section } = use(params);
  if (!(section in FINANCE_SECTIONS)) notFound();

  const config = FINANCE_SECTIONS[section as FinanceSection];
  const Icon = config.icon;

  if (section === "transportation-fee" || section === "transportation") {
    return <TransportationFeeClient />;
  }

  if (section === "requests") {
    return <PurchaseSellRequestsClient />;
  }

  if (section === "income") {
    return <IncomeClient />;
  }

  if (section === "expense") {
    return <ExpenseClient />;
  }

  if (section === "invoice") {
    return <InvoicesClient />;
  }

  if (section === "allowance") {
    return <AllowanceClient />;
  }

  if (section === "recurring-expenses") {
    return <RecurringExpensesClient />;
  }

  if (section === "performance") {
    return <PerformanceClient />;
  }

  if (section === "employee-performance") {
    return <EmployeePerformanceClient />;
  }

  if (section === "payment-methods") {
    return <PaymentMethodsClient />;
  }

  if (section === "categories") {
    return <FinanceCategoriesClient />;
  }

  if (section === "fee-management") {
    return <FeeManagementPage />;
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <IndianRupee className="size-4 text-primary" />
            Finance
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
        <Badge variant="outline" className="w-fit">
          Admin only
        </Badge>
      </div>

      <section className="rounded-lg border bg-card">
        <div className="flex items-center gap-3 border-b p-5">
          <div className="grid size-10 place-items-center rounded-md border bg-background text-primary">
            <Icon className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">{config.title} Records</h2>
            <p className="text-sm text-muted-foreground">Finance data table will be added here.</p>
          </div>
        </div>
        <div className="p-8 text-center text-sm text-muted-foreground">
          No {config.title.toLowerCase()} records yet.
        </div>
      </section>
    </div>
  );
}
