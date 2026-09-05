"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  Building,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Info,
  Key,
  Landmark,
  Loader2,
  MoreHorizontal,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Star,
  Trash2,
  Upload,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { DocumentFileUpload, type UploadedDocumentFile } from "@/components/shared/document-file-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { useAuthStore } from "@/store";
import type { FinancePaymentMethodRow, FinancePaymentMethodType } from "@/lib/queries/finance";

const POPULAR_INDIAN_BANKS = [
  "State Bank of India (SBI)",
  "HDFC Bank",
  "ICICI Bank",
  "Punjab National Bank (PNB)",
  "Axis Bank",
  "Bank of Baroda (BOB)",
  "Kotak Mahindra Bank",
  "Canara Bank",
  "Union Bank of India",
  "IndusInd Bank",
  "IDFC First Bank",
  "Yes Bank",
  "Indian Bank",
  "Central Bank of India",
  "Bank of India (BOI)",
  "Federal Bank",
  "Bandhan Bank",
  "AU Small Finance Bank",
  "Other Bank",
];

export const PAYMENT_GATEWAY_PROVIDERS = [
  {
    id: "razorpay",
    name: "Razorpay",
    description: "Accept Cards, UPI, Netbanking & Wallets in India",
    keyIdLabel: "Key ID",
    keyIdPlaceholder: "e.g. rzp_live_xxxxxxxxxxxx or rzp_test_xxxxxxxxxxxx",
    secretLabel: "Key Secret",
    secretPlaceholder: "e.g. 8kxxxxxxxxxxxxxxxxxxxxxxxx",
    webhookLabel: "Webhook Secret (Optional)",
    badgeColor: "bg-blue-600 text-white",
    defaultTitle: "Razorpay Gateway",
  },
  {
    id: "cashfree",
    name: "Cashfree Payments",
    description: "Fast UPI, Card & Auto-Collect PG Gateway",
    keyIdLabel: "App ID / Client ID",
    keyIdPlaceholder: "e.g. CF_APP_xxxxxxxxxxxxxxxx",
    secretLabel: "Secret Key",
    secretPlaceholder: "e.g. cfsk_ma_xxxxxxxxxxxxxxxxxxxxxxxx",
    webhookLabel: "Webhook Signature Secret",
    badgeColor: "bg-purple-600 text-white",
    defaultTitle: "Cashfree Gateway",
  },
  {
    id: "payu",
    name: "PayU India",
    description: "Enterprise payment aggregator with highest success rates",
    keyIdLabel: "Merchant Key",
    keyIdPlaceholder: "e.g. 7rnFly / Merchant Key",
    secretLabel: "Merchant Salt",
    secretPlaceholder: "e.g. pjyd6gtA / Salt Key",
    webhookLabel: "Auth Header / Webhook Key",
    badgeColor: "bg-emerald-600 text-white",
    defaultTitle: "PayU Payment Gateway",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Global credit cards, debit cards & international payments",
    keyIdLabel: "Publishable Key",
    keyIdPlaceholder: "e.g. your-public-key",
    secretLabel: "Secret Key",
    secretPlaceholder: "e.g. your-secret-key",
    webhookLabel: "Webhook Signing Secret (whsec_...)",
    badgeColor: "bg-indigo-600 text-white",
    defaultTitle: "Stripe Payment Gateway",
  },
  {
    id: "phonepe_pg",
    name: "PhonePe PG (Direct Merchant)",
    description: "Direct PhonePe Merchant API payment gateway integration",
    keyIdLabel: "Merchant ID (MID)",
    keyIdPlaceholder: "e.g. M1234567890",
    secretLabel: "Salt Key",
    secretPlaceholder: "e.g. 96434309-7796-489d-8924-ab988df7656a",
    webhookLabel: "Salt Index (e.g. 1)",
    badgeColor: "bg-violet-600 text-white",
    defaultTitle: "PhonePe Direct PG",
  },
  {
    id: "paytm_pg",
    name: "Paytm Payment Gateway",
    description: "Paytm All-in-One Payment Gateway & UPI Stack",
    keyIdLabel: "Merchant ID (MID)",
    keyIdPlaceholder: "e.g. YOUR_PAYTM_MID_HERE",
    secretLabel: "Merchant Key",
    secretPlaceholder: "e.g. YOUR_PAYTM_MERCHANT_KEY",
    webhookLabel: "Website Name (DEFAULT / WEBSTAGING)",
    badgeColor: "bg-sky-600 text-white",
    defaultTitle: "Paytm PG Stack",
  },
  {
    id: "ccavenue",
    name: "CCAvenue",
    description: "Comprehensive multi-currency online payments",
    keyIdLabel: "Merchant ID",
    keyIdPlaceholder: "e.g. 123456",
    secretLabel: "Working Key",
    secretPlaceholder: "e.g. 32-character working key",
    webhookLabel: "Access Code",
    badgeColor: "bg-amber-600 text-white",
    defaultTitle: "CCAvenue Gateway",
  },
  {
    id: "instamojo",
    name: "Instamojo",
    description: "Easy payment link and checkout gateway",
    keyIdLabel: "Client ID / API Key",
    keyIdPlaceholder: "e.g. live_xxxxxxxxxxxx",
    secretLabel: "Client Secret / Auth Token",
    secretPlaceholder: "e.g. test_secret_xxxxxxxxxxxx",
    webhookLabel: "Private Salt (Optional)",
    badgeColor: "bg-teal-600 text-white",
    defaultTitle: "Instamojo Gateway",
  },
  {
    id: "custom_pg",
    name: "Custom / Other Gateway",
    description: "Any custom API or aggregator gateway credentials",
    keyIdLabel: "API Key / Public Key / Merchant ID",
    keyIdPlaceholder: "Enter API Key / Client ID",
    secretLabel: "API Secret / Private Key",
    secretPlaceholder: "Enter Secret Key / Private Key",
    webhookLabel: "Webhook Secret / Verification Key",
    badgeColor: "bg-slate-700 text-white",
    defaultTitle: "Custom Payment Gateway",
  },
];

const METHOD_TYPE_CONFIG: Record<
  FinancePaymentMethodType,
  { label: string; icon: typeof Landmark; badgeClass: string; color: string; group: "gateway" | "bank" | "upi" | "other" }
> = {
  payment_gateway: {
    label: "Payment Gateway (Online)",
    icon: Zap,
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    color: "from-emerald-600 to-teal-700",
    group: "gateway",
  },
  net_banking: {
    label: "Net Banking / Bank Account",
    icon: Landmark,
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
    color: "from-blue-600 to-indigo-700",
    group: "bank",
  },
  phonepe: {
    label: "PhonePe UPI",
    icon: Smartphone,
    badgeClass: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
    color: "from-purple-600 to-indigo-600",
    group: "upi",
  },
  google_pay: {
    label: "Google Pay (GPay)",
    icon: Smartphone,
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    color: "from-emerald-600 to-teal-700",
    group: "upi",
  },
  paytm: {
    label: "Paytm UPI",
    icon: Smartphone,
    badgeClass: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400",
    color: "from-sky-600 to-blue-700",
    group: "upi",
  },
  bhim_upi: {
    label: "BHIM UPI",
    icon: QrCode,
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    color: "from-amber-600 to-orange-700",
    group: "upi",
  },
  other_upi: {
    label: "Other UPI / QR Code",
    icon: QrCode,
    badgeClass: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400",
    color: "from-indigo-600 to-violet-700",
    group: "upi",
  },
  cash: {
    label: "Cash Collection",
    icon: Wallet,
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    color: "from-emerald-600 to-green-700",
    group: "other",
  },
  cheque: {
    label: "Cheque / Demand Draft",
    icon: CreditCard,
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    color: "from-amber-600 to-yellow-700",
    group: "other",
  },
  pos_card: {
    label: "POS Card Machine",
    icon: CreditCard,
    badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400",
    color: "from-rose-600 to-pink-700",
    group: "other",
  },
  custom: {
    label: "Custom / Other",
    icon: Building,
    badgeClass: "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400",
    color: "from-slate-600 to-gray-700",
    group: "other",
  },
};

export function PaymentMethodsClient() {
  const pathname = usePathname();
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitutionId, activeInstitution } = useActiveInstitution();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const isPlatformSection = pathname?.startsWith("/platformadmin");
  const targetInstitutionId = isPlatformSection ? null : activeInstitutionId;

  const [methods, setMethods] = useState<FinancePaymentMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGroup, setFilterGroup] = useState<"all" | "gateway" | "bank" | "upi" | "other">("all");
  const [search, setSearch] = useState("");

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<FinancePaymentMethodRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [methodType, setMethodType] = useState<FinancePaymentMethodType>("payment_gateway");
  const [title, setTitle] = useState("");
  const [bankName, setBankName] = useState("");
  const [customBankName, setCustomBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [accountType, setAccountType] = useState("Current Account");
  const [upiId, setUpiId] = useState("");
  const [upiNumber, setUpiNumber] = useState("");
  const [upiProviderName, setUpiProviderName] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [qrFiles, setQrFiles] = useState<UploadedDocumentFile[]>([]);
  const [instructions, setInstructions] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);

  // Gateway Form State
  const [gatewayProvider, setGatewayProvider] = useState("razorpay");
  const [gatewayKeyId, setGatewayKeyId] = useState("");
  const [gatewayKeySecret, setGatewayKeySecret] = useState("");
  const [gatewayWebhookSecret, setGatewayWebhookSecret] = useState("");
  const [gatewayEnvironment, setGatewayEnvironment] = useState<"live" | "test">("live");
  const [showSecretKey, setShowSecretKey] = useState(false);

  // QR Modal Preview State
  const [previewQrUrl, setPreviewQrUrl] = useState<{ url: string; title: string; upiId: string | null } | null>(null);

  // Delete State
  const [deletingMethod, setDeletingMethod] = useState<FinancePaymentMethodRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const authHeader = useMemo(() => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), [accessToken]);

  const scopeBadgeText = isPlatformSection || !targetInstitutionId
    ? "Platform payment methods"
    : `${activeInstitution?.name ?? "Institution"} payment methods`;

  const fetchMethods = useCallback(async () => {
    if (!isReady || !accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (targetInstitutionId) {
        params.set("institutionId", String(targetInstitutionId));
      }
      const res = await fetch(`/api/admin/finance/payment-methods?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch payment methods");
      setMethods(json.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeader, isReady, targetInstitutionId]);

  useEffect(() => {
    void fetchMethods();
  }, [fetchMethods]);

  const resetForm = () => {
    setEditingMethod(null);
    setMethodType("payment_gateway");
    setTitle("Razorpay Gateway");
    setBankName("");
    setCustomBankName("");
    setAccountHolderName(activeInstitution?.name || "");
    setAccountNumber("");
    setIfscCode("");
    setBranchName("");
    setAccountType("Current Account");
    setUpiId("");
    setUpiNumber("");
    setUpiProviderName("");
    setMerchantName(activeInstitution?.name || "");
    setQrFiles([]);
    setInstructions("");
    setIsActive(true);
    setIsDefault(false);
    setGatewayProvider("razorpay");
    setGatewayKeyId("");
    setGatewayKeySecret("");
    setGatewayWebhookSecret("");
    setGatewayEnvironment("live");
    setShowSecretKey(false);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (item: FinancePaymentMethodRow) => {
    setEditingMethod(item);
    setMethodType(item.method_type);
    setTitle(item.title);
    if (POPULAR_INDIAN_BANKS.includes(item.bank_name || "")) {
      setBankName(item.bank_name || "");
      setCustomBankName("");
    } else {
      setBankName(item.bank_name ? "Other Bank" : "");
      setCustomBankName(item.bank_name || "");
    }
    setAccountHolderName(item.account_holder_name || "");
    setAccountNumber(item.account_number || "");
    setIfscCode(item.ifsc_code || "");
    setBranchName(item.branch_name || "");
    setAccountType(item.account_type || "Current Account");
    setUpiId(item.upi_id || "");
    setUpiNumber(item.upi_number || "");
    setUpiProviderName(item.upi_provider_name || "");
    setMerchantName(item.merchant_name || "");
    if (item.qr_code_url) {
      setQrFiles([
        {
          name: "QR Code",
          url: item.qr_code_url,
          publicId: item.qr_code_public_id || item.qr_code_url,
          resourceType: "image",
          fileType: "image/png",
        },
      ]);
    } else {
      setQrFiles([]);
    }
    setInstructions(item.instructions || "");
    setIsActive(item.is_active);
    setIsDefault(item.is_default);

    // Gateway fields
    setGatewayProvider(item.gateway_provider || "razorpay");
    setGatewayKeyId(item.gateway_key_id || "");
    setGatewayKeySecret(item.gateway_key_secret || "");
    setGatewayWebhookSecret(item.gateway_webhook_secret || "");
    setGatewayEnvironment((item.gateway_environment as "live" | "test") || "live");
    setShowSecretKey(false);

    setDialogOpen(true);
  };

  const activeGatewayConfig = useMemo(() => {
    return PAYMENT_GATEWAY_PROVIDERS.find((p) => p.id === gatewayProvider) || PAYMENT_GATEWAY_PROVIDERS[0];
  }, [gatewayProvider]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveTitle = title.trim() || `${METHOD_TYPE_CONFIG[methodType].label} (${activeInstitution?.name || "Institution"})`;
    const effectiveBankName = bankName === "Other Bank" ? customBankName.trim() : bankName.trim();

    if (methodType === "payment_gateway") {
      if (!gatewayProvider) {
        toast.error("Please select a payment gateway provider");
        return;
      }
      if (!gatewayKeyId.trim()) {
        toast.error(`Please enter ${activeGatewayConfig?.keyIdLabel || "API Key / Key ID"}`);
        return;
      }
    } else if (methodType === "net_banking") {
      if (!effectiveBankName) {
        toast.error("Please select or enter bank name");
        return;
      }
      if (!accountNumber.trim()) {
        toast.error("Please enter bank account number");
        return;
      }
      if (!ifscCode.trim()) {
        toast.error("Please enter bank IFSC code");
        return;
      }
    } else if (["phonepe", "google_pay", "paytm", "bhim_upi", "other_upi"].includes(methodType)) {
      if (!upiId.trim() && qrFiles.length === 0) {
        toast.error("Please provide either a UPI ID or upload a QR Code image");
        return;
      }
    }

    setSaving(true);
    try {
      const qrFile = qrFiles[0] ?? null;
      const payload = {
        institutionId: activeInstitutionId,
        method_type: methodType,
        title: effectiveTitle,
        bank_name: effectiveBankName || null,
        account_holder_name: accountHolderName.trim() || null,
        account_number: accountNumber.trim() || null,
        ifsc_code: ifscCode.trim().toUpperCase() || null,
        branch_name: branchName.trim() || null,
        account_type: accountType.trim() || null,
        upi_id: upiId.trim() || null,
        upi_number: upiNumber.trim() || null,
        upi_provider_name: upiProviderName.trim() || null,
        merchant_name: merchantName.trim() || null,
        qr_code_url: qrFile?.url || null,
        qr_code_public_id: qrFile?.publicId || null,
        instructions: instructions.trim() || null,
        gateway_provider: methodType === "payment_gateway" ? gatewayProvider : null,
        gateway_key_id: methodType === "payment_gateway" ? gatewayKeyId.trim() : null,
        gateway_key_secret: methodType === "payment_gateway" ? gatewayKeySecret.trim() : null,
        gateway_webhook_secret: methodType === "payment_gateway" ? gatewayWebhookSecret.trim() : null,
        gateway_environment: methodType === "payment_gateway" ? gatewayEnvironment : "live",
        is_active: isActive,
        is_default: isDefault,
      };

      const url = editingMethod
        ? `/api/admin/finance/payment-methods/${editingMethod.id}`
        : "/api/admin/finance/payment-methods";
      const method = editingMethod ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Failed to ${editingMethod ? "update" : "create"} payment method`);

      toast.success(editingMethod ? "Payment method updated" : "Payment method created");
      setDialogOpen(false);
      resetForm();
      void fetchMethods();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save payment method");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: FinancePaymentMethodRow, nextActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/finance/payment-methods/${item.id}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextActive }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`${item.title} is now ${nextActive ? "Active" : "Inactive"}`);
      void fetchMethods();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    }
  };

  const handleSetDefault = async (item: FinancePaymentMethodRow) => {
    try {
      const res = await fetch(`/api/admin/finance/payment-methods/${item.id}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      if (!res.ok) throw new Error("Failed to set default");
      toast.success(`Set "${item.title}" as default payment method`);
      void fetchMethods();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set default");
    }
  };

  const handleDelete = async () => {
    if (!deletingMethod) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/finance/payment-methods/${deletingMethod.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete payment method");

      toast.success(`Deleted "${deletingMethod.title}"`);
      setDeletingMethod(null);
      void fetchMethods();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete payment method");
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard!`);
  };

  const maskSecret = (secret: string | null) => {
    if (!secret) return "••••••••••••";
    if (secret.length <= 8) return "••••••••";
    return `${secret.slice(0, 4)}••••••••${secret.slice(-4)}`;
  };

  const filteredMethods = useMemo(() => {
    return methods.filter((item) => {
      const config = METHOD_TYPE_CONFIG[item.method_type] ?? METHOD_TYPE_CONFIG.custom;
      if (filterGroup !== "all" && config.group !== filterGroup) {
        return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        return (
          item.title.toLowerCase().includes(query) ||
          (item.gateway_provider && item.gateway_provider.toLowerCase().includes(query)) ||
          (item.bank_name && item.bank_name.toLowerCase().includes(query)) ||
          (item.account_number && item.account_number.includes(query)) ||
          (item.ifsc_code && item.ifsc_code.toLowerCase().includes(query)) ||
          (item.upi_id && item.upi_id.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [filterGroup, methods, search]);

  const stats = useMemo(() => {
    const total = methods.length;
    const gateways = methods.filter((m) => m.method_type === "payment_gateway").length;
    const bank = methods.filter((m) => m.method_type === "net_banking").length;
    const upi = methods.filter((m) => ["phonepe", "google_pay", "paytm", "bhim_upi", "other_upi"].includes(m.method_type)).length;
    const other = methods.filter((m) => ["cash", "cheque", "pos_card", "custom"].includes(m.method_type)).length;
    return { total, gateways, bank, upi, other };
  }, [methods]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Payment Methods &amp; Gateways</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Configure Online Payment Gateways (Razorpay, Cashfree, PayU, Stripe), Net Banking bank accounts, and UPI QR codes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={openAddDialog} className="gap-2 bg-primary text-primary-foreground shadow-xs cursor-pointer">
            <Plus className="size-4" />
            Add Payment Method
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/40 p-1">
          {[
            { id: "all", label: `All Methods (${stats.total})` },
            { id: "gateway", label: `⚡ Payment Gateways (${stats.gateways})` },
            { id: "bank", label: `Bank Accounts (${stats.bank})` },
            { id: "upi", label: `UPI & QR (${stats.upi})` },
            { id: "other", label: `Cash & Others (${stats.other})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterGroup(tab.id as any)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                filterGroup === tab.id
                  ? "bg-background text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search gateway, bank, IFSC, UPI ID..."
            className="h-9 pl-9 text-xs"
          />
        </div>
      </div>

      {/* Payment Methods Cards Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl border bg-card p-5 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      ) : filteredMethods.length === 0 ? (
        <div className="rounded-xl border bg-card py-16 text-center text-sm text-muted-foreground shadow-xs">
          <Zap className="mx-auto size-10 mb-3 text-muted-foreground/40" />
          <p className="font-semibold text-foreground text-base">No payment methods found</p>
          <p className="mt-1 max-w-md mx-auto text-xs text-muted-foreground">
            Configure an Online Payment Gateway (Razorpay, Cashfree, PayU, Stripe) or Bank Account &amp; UPI QR code to accept student fee payments.
          </p>
          <Button onClick={openAddDialog} size="sm" className="mt-4 gap-2">
            <Plus className="size-4" />
            Add First Payment Method
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMethods.map((item) => {
            const config = METHOD_TYPE_CONFIG[item.method_type] ?? METHOD_TYPE_CONFIG.custom;
            const isGateway = item.method_type === "payment_gateway";
            const isBank = config.group === "bank";
            const isUpi = config.group === "upi";
            const gatewayInfo = PAYMENT_GATEWAY_PROVIDERS.find((p) => p.id === item.gateway_provider);

            return (
              <div
                key={item.id}
                className={`relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-5 shadow-xs transition-all hover:shadow-md ${
                  item.is_default ? "ring-2 ring-primary/40 border-primary" : ""
                } ${!item.is_active ? "opacity-65" : ""}`}
              >
                {/* Top Badge & Dropdown */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={`gap-1 px-2.5 py-0.5 text-xs font-semibold ${config.badgeClass}`}>
                        <config.icon className="size-3" />
                        {isGateway ? `${gatewayInfo?.name || "Payment Gateway"}` : config.label}
                      </Badge>
                      {isGateway && (
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0 ${
                            item.gateway_environment === "test"
                              ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                              : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                          }`}
                        >
                          {item.gateway_environment === "test" ? "Sandbox / Test" : "Live / Production"}
                        </Badge>
                      )}
                      {item.is_default && (
                        <Badge className="gap-1 bg-amber-500/15 text-amber-600 border border-amber-500/30 text-[10px] font-bold">
                          <Star className="size-3 fill-amber-500" />
                          Default
                        </Badge>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="-mr-1">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(item)} className="gap-2 cursor-pointer">
                          <Edit2 className="size-3.5" />
                          Edit Details &amp; Keys
                        </DropdownMenuItem>
                        {!item.is_default && (
                          <DropdownMenuItem onClick={() => handleSetDefault(item)} className="gap-2 cursor-pointer">
                            <Star className="size-3.5 text-amber-500" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(item, !item.is_active)}
                          className="gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="size-3.5" />
                          {item.is_active ? "Mark Inactive" : "Mark Active"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingMethod(item)}
                          className="gap-2 text-rose-600 font-medium cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                          Delete Method
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Title & Organization */}
                  <div className="mt-3">
                    <h3 className="font-bold text-foreground text-base leading-snug">{item.title}</h3>
                    {item.account_holder_name || item.merchant_name ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.account_holder_name || item.merchant_name}
                      </p>
                    ) : null}
                  </div>

                  {/* PAYMENT GATEWAY DETAILS */}
                  {isGateway && (
                    <div className="mt-4 space-y-2 rounded-lg border bg-muted/30 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Provider</span>
                        <span className="font-bold text-foreground">{gatewayInfo?.name || item.gateway_provider}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{gatewayInfo?.keyIdLabel || "API Key ID"}</span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                          <span className="truncate max-w-[140px]">{item.gateway_key_id ? maskSecret(item.gateway_key_id) : "-"}</span>
                          {item.gateway_key_id && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.gateway_key_id!, "Key ID")}
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Copy Key ID"
                            >
                              <Copy className="size-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      {item.gateway_webhook_secret && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Webhook</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Configured ✓</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content Specific to Net Banking */}
                  {isBank && (
                    <div className="mt-4 space-y-2 rounded-lg border bg-muted/30 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Bank</span>
                        <span className="font-semibold text-foreground">{item.bank_name || "-"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Account No.</span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                          <span>{item.account_number || "-"}</span>
                          {item.account_number && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.account_number!, "Account Number")}
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Copy"
                            >
                              <Copy className="size-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">IFSC Code</span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-primary">
                          <span>{item.ifsc_code || "-"}</span>
                          {item.ifsc_code && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.ifsc_code!, "IFSC Code")}
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Copy"
                            >
                              <Copy className="size-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      {item.branch_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Branch</span>
                          <span className="truncate text-foreground max-w-[150px]">{item.branch_name}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content Specific to UPI (PhonePe, GPay, Paytm, BHIM) */}
                  {isUpi && (
                    <div className="mt-4 space-y-2.5 rounded-lg border bg-muted/30 p-3 text-xs">
                      {item.upi_id && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">UPI ID</span>
                          <div className="flex items-center gap-1.5 font-mono font-bold text-foreground truncate max-w-[180px]">
                            <span className="truncate">{item.upi_id}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.upi_id!, "UPI ID")}
                              className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                              title="Copy"
                            >
                              <Copy className="size-3" />
                            </button>
                          </div>
                        </div>
                      )}
                      {item.qr_code_url ? (
                        <div className="mt-2 flex items-center justify-between rounded-md border bg-background p-2">
                          <div className="flex items-center gap-2">
                            <div className="relative size-10 overflow-hidden rounded-md border bg-white">
                              <Image
                                src={item.qr_code_url}
                                alt="UPI QR Code"
                                fill
                                sizes="40px"
                                className="object-contain"
                              />
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-foreground">UPI QR Code</p>
                              <p className="text-[10px] text-muted-foreground">Scan with any UPI app</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPreviewQrUrl({
                                url: item.qr_code_url!,
                                title: item.title,
                                upiId: item.upi_id,
                              })
                            }
                            className="h-7 text-xs gap-1 px-2 cursor-pointer"
                          >
                            <QrCode className="size-3.5" />
                            View QR
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Instructions if any */}
                  {item.instructions ? (
                    <p className="mt-3 text-xs italic text-muted-foreground line-clamp-2">
                      &quot;{item.instructions}&quot;
                    </p>
                  ) : null}
                </div>

                {/* Footer status toggle */}
                <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={(checked) => handleToggleActive(item, checked)}
                    />
                    <span className={item.is_active ? "font-medium text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <span className="text-[11px] text-muted-foreground">
                    Added on {item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : "-"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Payment Method Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="size-5 text-primary" />
                {editingMethod ? "Edit Payment Method / Gateway" : "Configure Payment Method / Gateway"}
              </DialogTitle>
              <DialogDescription>
                Configure Online Payment Gateways (Razorpay, Cashfree, PayU, Stripe), Net Banking, or UPI QR codes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Method Type Selection */}
              <div className="space-y-1.5">
                <Label>Payment Method Category *</Label>
                <Select
                  value={methodType}
                  onValueChange={(val) => {
                    const nextType = val as FinancePaymentMethodType;
                    setMethodType(nextType);
                    if (nextType === "payment_gateway") {
                      setTitle(activeGatewayConfig?.defaultTitle || "Razorpay Gateway");
                    } else if (nextType === "net_banking") {
                      setTitle("Primary Current Bank Account");
                    } else if (["phonepe", "google_pay", "paytm", "bhim_upi"].includes(nextType)) {
                      setTitle(`${METHOD_TYPE_CONFIG[nextType].label}`);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select payment method type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment_gateway" className="font-semibold text-primary">
                      ⚡ Online Payment Gateway (Razorpay, Cashfree, PayU, Stripe, etc.)
                    </SelectItem>
                    <SelectItem value="net_banking">🏦 Net Banking (Bank Account Transfer / NEFT / RTGS)</SelectItem>
                    <SelectItem value="phonepe">🟣 PhonePe UPI</SelectItem>
                    <SelectItem value="google_pay">🔵 Google Pay (GPay)</SelectItem>
                    <SelectItem value="paytm">🔷 Paytm UPI</SelectItem>
                    <SelectItem value="bhim_upi">🟢 BHIM UPI</SelectItem>
                    <SelectItem value="other_upi">⚡ Other UPI (CRED / Amazon Pay / Any QR)</SelectItem>
                    <SelectItem value="cash">💵 Cash Collection</SelectItem>
                    <SelectItem value="cheque">📝 Cheque / Demand Draft</SelectItem>
                    <SelectItem value="pos_card">💳 POS Card Terminal</SelectItem>
                    <SelectItem value="custom">🏢 Custom / Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* PAYMENT GATEWAY CONFIGURATION */}
              {methodType === "payment_gateway" && (
                <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Zap className="size-4 text-primary" />
                      Gateway Provider &amp; API Credentials
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold">Environment:</Label>
                      <Select
                        value={gatewayEnvironment}
                        onValueChange={(v) => setGatewayEnvironment(v as "live" | "test")}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="live" className="text-emerald-600 font-bold">🟢 Live / Prod</SelectItem>
                          <SelectItem value="test" className="text-amber-600 font-bold">🟡 Sandbox / Test</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Select Payment Gateway Provider *</Label>
                    <Select
                      value={gatewayProvider}
                      onValueChange={(val) => {
                        setGatewayProvider(val);
                        const prov = PAYMENT_GATEWAY_PROVIDERS.find((p) => p.id === val);
                        if (prov) {
                          setTitle(prov.defaultTitle);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_GATEWAY_PROVIDERS.map((prov) => (
                          <SelectItem key={prov.id} value={prov.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{prov.name}</span>
                              <span className="text-[11px] text-muted-foreground">— {prov.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>{activeGatewayConfig.keyIdLabel} *</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={gatewayKeyId}
                          onChange={(e) => setGatewayKeyId(e.target.value)}
                          placeholder={activeGatewayConfig.keyIdPlaceholder}
                          className="pl-9 font-mono text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label>{activeGatewayConfig.secretLabel}</Label>
                        <button
                          type="button"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                          className="flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer"
                        >
                          {showSecretKey ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                          {showSecretKey ? "Hide Secret" : "Reveal Secret"}
                        </button>
                      </div>
                      <Input
                        type={showSecretKey ? "text" : "password"}
                        value={gatewayKeySecret}
                        onChange={(e) => setGatewayKeySecret(e.target.value)}
                        placeholder={activeGatewayConfig.secretPlaceholder}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>{activeGatewayConfig.webhookLabel}</Label>
                      <Input
                        value={gatewayWebhookSecret}
                        onChange={(e) => setGatewayWebhookSecret(e.target.value)}
                        placeholder="Webhook signing secret / salt / token (optional)"
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Title / Nickname */}
              <div className="space-y-1.5">
                <Label>Display Name / Nickname *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Primary Razorpay PG, SBI Current Account"
                  required
                />
              </div>

              {/* NET BANKING FIELDS */}
              {methodType === "net_banking" && (
                <div className="space-y-3.5 rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Landmark className="size-4 text-primary" />
                    Bank Account Details
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Bank Name *</Label>
                      <Select
                        value={bankName}
                        onValueChange={(val) => {
                          setBankName(val);
                          if (val !== "Other Bank") setCustomBankName("");
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Indian Bank" />
                        </SelectTrigger>
                        <SelectContent>
                          {POPULAR_INDIAN_BANKS.map((b) => (
                            <SelectItem key={b} value={b}>
                              {b}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {bankName === "Other Bank" && (
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Specify Bank Name *</Label>
                        <Input
                          value={customBankName}
                          onChange={(e) => setCustomBankName(e.target.value)}
                          placeholder="e.g. Saraswat Co-operative Bank"
                          required
                        />
                      </div>
                    )}

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Account Holder / Beneficiary Name *</Label>
                      <Input
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                        placeholder="e.g. Maa Sharda Institute PVT LTD"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Account Number *</Label>
                      <Input
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="e.g. 50200012345678"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>IFSC Code *</Label>
                      <Input
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                        placeholder="e.g. HDFC0001234, SBIN0000123"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Branch Name / City (Optional)</Label>
                      <Input
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        placeholder="e.g. Connaught Place, New Delhi"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Account Type</Label>
                      <Select value={accountType} onValueChange={setAccountType}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Current Account">Current Account</SelectItem>
                          <SelectItem value="Savings Account">Savings Account</SelectItem>
                          <SelectItem value="Overdraft Account">Overdraft Account</SelectItem>
                          <SelectItem value="Escrow Account">Escrow Account</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* UPI FIELDS (PhonePe, Google Pay, Paytm, BHIM, Other UPI) */}
              {["phonepe", "google_pay", "paytm", "bhim_upi", "other_upi"].includes(methodType) && (
                <div className="space-y-3.5 rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Smartphone className="size-4 text-primary" />
                    UPI &amp; QR Code Configuration
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>UPI ID / VPA *</Label>
                      <Input
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder={
                          methodType === "phonepe"
                            ? "e.g. 9876543210@ybl, institute@ibl"
                            : methodType === "google_pay"
                              ? "e.g. institute@okhdfcbank, institute@okaxis"
                              : methodType === "paytm"
                                ? "e.g. 9876543210@paytm, institute@paytm"
                                : "e.g. institute@upi"
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Linked Mobile Number</Label>
                      <Input
                        value={upiNumber}
                        onChange={(e) => setUpiNumber(e.target.value)}
                        placeholder="e.g. 9876543210"
                        maxLength={10}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Merchant / Payee Name</Label>
                      <Input
                        value={merchantName}
                        onChange={(e) => setMerchantName(e.target.value)}
                        placeholder="e.g. Maa Sharda Educational Trust"
                      />
                    </div>

                    {methodType === "other_upi" && (
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>UPI Provider / App Name</Label>
                        <Input
                          value={upiProviderName}
                          onChange={(e) => setUpiProviderName(e.target.value)}
                          placeholder="e.g. CRED Pay, Amazon Pay, WhatsApp Pay"
                        />
                      </div>
                    )}

                    {/* QR Code Upload */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Upload Official UPI QR Code Image</Label>
                      <DocumentFileUpload
                        accessToken={accessToken}
                        files={qrFiles}
                        onFilesChange={setQrFiles}
                        maxFiles={1}
                        accept="image/*"
                        buttonLabel="Upload QR Code"
                        emptyText="Upload PNG, JPG, or WebP image of your institution's QR Code"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="space-y-1.5">
                <Label>Payer Instructions / Description (Optional)</Label>
                <Textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Student fee payments processed securely with instant fee receipt generation."
                  rows={2}
                />
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Set as Default Payment Method</Label>
                    <p className="text-xs text-muted-foreground">Will be auto-selected first during fee collection and online checkout.</p>
                  </div>
                  <Switch checked={isDefault} onCheckedChange={setIsDefault} />
                </div>

                <div className="flex items-center justify-between border-t pt-2.5">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Active Status</Label>
                    <p className="text-xs text-muted-foreground">Enable this payment method / gateway for immediate use.</p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {editingMethod ? "Save Changes" : "Create Payment Method"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Fullscreen Modal Preview */}
      <Dialog open={Boolean(previewQrUrl)} onOpenChange={(open) => !open && setPreviewQrUrl(null)}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>{previewQrUrl?.title}</DialogTitle>
            <DialogDescription>Scan with any Indian UPI app (PhonePe, Google Pay, Paytm, BHIM, CRED)</DialogDescription>
          </DialogHeader>

          {previewQrUrl?.url && (
            <div className="mx-auto my-2 size-64 overflow-hidden rounded-xl border bg-white p-3 shadow-md">
              <div className="relative size-full">
                <Image
                  src={previewQrUrl.url}
                  alt="UPI QR Code"
                  fill
                  sizes="256px"
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          )}

          {previewQrUrl?.upiId && (
            <div className="flex items-center justify-center gap-2 font-mono text-sm font-bold text-foreground">
              <span>{previewQrUrl.upiId}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(previewQrUrl.upiId!, "UPI ID")}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                title="Copy UPI ID"
              >
                <Copy className="size-4" />
              </button>
            </div>
          )}

          <DialogFooter className="sm:justify-center">
            <Button variant="outline" onClick={() => setPreviewQrUrl(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deletingMethod)} onOpenChange={(open) => !open && setDeletingMethod(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="size-5" />
              Delete Payment Method
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingMethod?.title}&quot;? Existing transaction records will retain their history.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingMethod(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
