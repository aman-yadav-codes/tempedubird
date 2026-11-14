const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "components", "app-sidebar.tsx");
let content = fs.readFileSync(filePath, "utf8");

// 1. Add top-level Orders tab right before Transactions
const targetTx = `    {
        title: "Transactions",
        url: "/admin/finance/transactions",
        icon: ArrowLeftRight,
    },`;

const replacementTx = `    {
        title: "Orders & Bookings",
        url: "/admin/orders",
        icon: ShoppingCart,
    },
    {
        title: "Transactions",
        url: "/admin/finance/transactions",
        icon: ArrowLeftRight,
    },`;

if (content.includes(targetTx)) {
  content = content.replace(targetTx, replacementTx);
} else {
  // Try CRLF
  const targetTxCRLF = targetTx.replace(/\n/g, "\r\n");
  const replacementTxCRLF = replacementTx.replace(/\n/g, "\r\n");
  content = content.replace(targetTxCRLF, replacementTxCRLF);
}

// 2. Add Orders under Sales
const targetSales = `    {
        title: "Sales",
        url: "/admin/sales/pipeline",
        icon: BadgeDollarSign,
        children: [
            { title: "Pipeline", url: "/admin/sales/pipeline", icon: TrendingUp },`;

const replacementSales = `    {
        title: "Sales",
        url: "/admin/sales/pipeline",
        icon: BadgeDollarSign,
        children: [
            { title: "Orders & Bookings", url: "/admin/sales/orders", icon: ShoppingCart },
            { title: "Pipeline", url: "/admin/sales/pipeline", icon: TrendingUp },`;

if (content.includes(targetSales)) {
  content = content.replace(targetSales, replacementSales);
} else {
  const targetSalesCRLF = targetSales.replace(/\n/g, "\r\n");
  const replacementSalesCRLF = replacementSales.replace(/\n/g, "\r\n");
  content = content.replace(targetSalesCRLF, replacementSalesCRLF);
}

// 3. Remove filter in roleAwareNavItems that was removing /admin/sales/orders
const targetFilter = `                if (item.url === "/admin/sales/pipeline" && item.children) {
                    if (isInstitutionAdmin) {
                        return [{
                            ...item,
                            children: item.children.filter((child) => child.url !== "/admin/sales/orders"),
                        }];
                    }
                    return [item];
                }`;

const replacementFilter = `                if (item.url === "/admin/sales/pipeline" && item.children) {
                    return [item];
                }`;

if (content.includes(targetFilter)) {
  content = content.replace(targetFilter, replacementFilter);
} else {
  const targetFilterCRLF = targetFilter.replace(/\n/g, "\r\n");
  const replacementFilterCRLF = replacementFilter.replace(/\n/g, "\r\n");
  content = content.replace(targetFilterCRLF, replacementFilterCRLF);
}

fs.writeFileSync(filePath, content, "utf8");
console.log("Successfully updated components/app-sidebar.tsx with Orders tab!");

