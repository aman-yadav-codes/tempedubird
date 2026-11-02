const fs = require('fs');

let content = fs.readFileSync('app/admin/company/page.tsx', 'utf8');

// 1. Add contact-branches to PAGE_TABS
const oldPageTabs = `const PAGE_TABS = [
  { slug: "payment-methods", label: "Payment Methods", icon: CreditCard },
  { slug: "faqs", label: "FAQs", icon: HelpCircle },
  { slug: "privacy-policy", label: "Privacy Policy", icon: ShieldCheck },
  { slug: "terms-and-conditions", label: "Terms & Conditions", icon: FileText },
  { slug: "copyright-policy", label: "Copyright Policy", icon: Copyright },
  { slug: "refund-policy", label: "Refund Policy", icon: RefreshCw },
  { slug: "social-links", label: "Social Media Links", icon: Share2 },
];`;

const newPageTabs = `const PAGE_TABS = [
  { slug: "contact-branches", label: "Company Info & Branches", icon: Building2 },
  { slug: "payment-methods", label: "Payment Methods", icon: CreditCard },
  { slug: "faqs", label: "FAQs", icon: HelpCircle },
  { slug: "privacy-policy", label: "Privacy Policy", icon: ShieldCheck },
  { slug: "terms-and-conditions", label: "Terms & Conditions", icon: FileText },
  { slug: "copyright-policy", label: "Copyright Policy", icon: Copyright },
  { slug: "refund-policy", label: "Refund Policy", icon: RefreshCw },
  { slug: "social-links", label: "Social Media Links", icon: Share2 },
];`;

content = content.replace(oldPageTabs, newPageTabs);

// 2. Fix tabFromUrl so it doesn't redirect contact-branches away
content = content.replace(
  'const tabFromUrl = (!rawTab || rawTab === "contact-branches") ? "payment-methods" : rawTab;',
  'const tabFromUrl = rawTab || "contact-branches";'
);

// 3. Add certified_or_affiliated_with and registration_no to companyInfo state
content = content.replace(
  `    cin_number: "",\n    gstin: "",`,
  `    cin_number: "",\n    registration_no: "",\n    certified_or_affiliated_with: "",\n    gstin: "",`
);

// 4. Add TabsList right after <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
const tabsStart = '<Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">';
const tabsListJsx = `<Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
        {/* Navigation Tabs Bar */}
        <TabsList className="flex flex-wrap h-auto gap-1.5 p-1.5 bg-muted/50 rounded-xl border border-border/60">
          {PAGE_TABS.map((tab) => (
            <TabsTrigger
              key={tab.slug}
              value={tab.slug}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
            >
              <tab.icon className="w-3.5 h-3.5 text-primary" />
              <span>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>`;

content = content.replace(tabsStart, tabsListJsx);

// 5. Enhance Legal Entity & Registration section in contact-branches tab to include Certified or Affiliated with and clean labels
const oldLegalSection = `<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-1">
                        <Label htmlFor="ci-legal-name" className="text-xs font-semibold">Registered Company Legal Name *</Label>
                        <Input
                          id="ci-legal-name"
                          value={companyInfo.company_name || ""}
                          onChange={(e) => setCompanyInfo((prev) => ({ ...prev, company_name: e.target.value }))}
                          placeholder="e.g. EduBird Technologies Private Limited"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ci-cin" className="text-xs font-semibold">Corporate Identity No (CIN)</Label>
                        <Input
                          id="ci-cin"
                          value={companyInfo.cin_number || ""}
                          onChange={(e) => setCompanyInfo((prev) => ({ ...prev, cin_number: e.target.value }))}
                          placeholder="e.g. U72900DL2023PTC123456"
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ci-gstin" className="text-xs font-semibold">GSTIN / Tax ID</Label>
                        <Input
                          id="ci-gstin"
                          value={companyInfo.gstin || ""}
                          onChange={(e) => setCompanyInfo((prev) => ({ ...prev, gstin: e.target.value }))}
                          placeholder="e.g. 07AAAAA0000A1Z5"
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>`;

const newLegalSection = `<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ci-legal-name" className="text-xs font-semibold">Company Name *</Label>
                        <Input
                          id="ci-legal-name"
                          value={companyInfo.company_name || ""}
                          onChange={(e) => setCompanyInfo((prev) => ({ ...prev, company_name: e.target.value }))}
                          placeholder="e.g. EduBird Technologies Private Limited"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ci-cin" className="text-xs font-semibold">Company Registration Number (CIN / Reg. No.)</Label>
                        <Input
                          id="ci-cin"
                          value={companyInfo.registration_no || companyInfo.cin_number || ""}
                          onChange={(e) => setCompanyInfo((prev) => ({ ...prev, registration_no: e.target.value, cin_number: e.target.value }))}
                          placeholder="e.g. U72900DL2026PTC123456"
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ci-gstin" className="text-xs font-semibold">GST / GSTIN Number</Label>
                        <Input
                          id="ci-gstin"
                          value={companyInfo.gstin || ""}
                          onChange={(e) => setCompanyInfo((prev) => ({ ...prev, gstin: e.target.value }))}
                          placeholder="e.g. 07AAAAA0000A1Z5"
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ci-certified" className="text-xs font-semibold flex items-center gap-1.5">
                          <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                          Certified or Affiliated With
                        </Label>
                        <Input
                          id="ci-certified"
                          value={companyInfo.certified_or_affiliated_with || ""}
                          onChange={(e) => setCompanyInfo((prev) => ({ ...prev, certified_or_affiliated_with: e.target.value }))}
                          placeholder="e.g. ISO 9001:2015, UGC, CBSE, AICTE"
                        />
                      </div>
                    </div>`;

content = content.replace(oldLegalSection, newLegalSection);

// 6. Update Branch Manager label in Branch Modal Dialog to "Contact Person of Branch"
content = content.replace(
  '<Label htmlFor="br-mgr">Branch Manager</Label>',
  '<Label htmlFor="br-mgr">Contact Person of Branch *</Label>'
);

content = content.replace(
  'placeholder="e.g. Rajesh Sharma"\n                />\n              </div>',
  'placeholder="e.g. Rajesh Sharma (Branch Manager / In-Charge)"\n                />\n              </div>'
);

content = content.replace(
  '<Label htmlFor="br-phone">Contact Phone</Label>',
  '<Label htmlFor="br-phone">Branch Phone Number</Label>'
);

content = content.replace(
  '<Label htmlFor="br-email">Email Address</Label>',
  '<Label htmlFor="br-email">Branch Email Address</Label>'
);

content = content.replace(
  '<Label htmlFor="br-addr">Full Street Address *</Label>',
  '<Label htmlFor="br-addr">Branch Street Address *</Label>'
);

// 7. Update branch card manager display to "Contact Person"
content = content.replace(
  'Manager: <span className="font-medium text-foreground">{b.manager_name}</span>',
  'Contact Person: <span className="font-medium text-foreground">{b.manager_name}</span>'
);

fs.writeFileSync('app/admin/company/page.tsx', content, 'utf8');
console.log('Successfully patched app/admin/company/page.tsx!');

