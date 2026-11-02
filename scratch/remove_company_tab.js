const fs = require('fs');
let code = fs.readFileSync('app/admin/company/page.tsx', 'utf8');

const isCRLF = code.includes('\r\n');
const newline = isCRLF ? '\r\n' : '\n';

// 1. Update PAGE_TABS
const oldTabs = `const PAGE_TABS = [
  { slug: "contact-branches", label: "Company Info & Branches", icon: Building2 },
  { slug: "payment-methods", label: "Payment Methods", icon: CreditCard },`;

const newTabs = `const PAGE_TABS = [
  { slug: "payment-methods", label: "Payment Methods", icon: CreditCard },`;

const oldTabsSearch = isCRLF ? oldTabs.replace(/\n/g, '\r\n') : oldTabs;
const newTabsSearch = isCRLF ? newTabs.replace(/\n/g, '\r\n') : newTabs;

if (code.includes(oldTabsSearch)) {
  code = code.replace(oldTabsSearch, newTabsSearch);
  console.log("Updated PAGE_TABS");
} else {
  console.warn("Could not find old PAGE_TABS");
}

// 2. Update tabFromUrl default
const oldTabFromUrl = `const tabFromUrl = searchParams.get("tab") || "contact-branches";`;
const newTabFromUrl = `const rawTab = searchParams.get("tab");
  const tabFromUrl = (!rawTab || rawTab === "contact-branches") ? "payment-methods" : rawTab;`;

const oldTabSearch = isCRLF ? oldTabFromUrl.replace(/\n/g, '\r\n') : oldTabFromUrl;
const newTabSearch = isCRLF ? newTabFromUrl.replace(/\n/g, '\r\n') : newTabFromUrl;

if (code.includes(oldTabSearch)) {
  code = code.replace(oldTabSearch, newTabSearch);
  console.log("Updated tabFromUrl");
} else {
  console.warn("Could not find old tabFromUrl");
}

fs.writeFileSync('app/admin/company/page.tsx', code, 'utf8');
console.log("Saved app/admin/company/page.tsx");

