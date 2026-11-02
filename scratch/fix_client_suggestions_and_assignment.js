const fs = require('fs');

let content = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

// 1. Update fetchClientsForModal to grab token from localStorage as fallback
const oldFetchClients = `  const fetchClientsForModal = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = \`Bearer \${accessToken}\`;
      const res = await fetch("/api/admin/sales/clients?status=active", { headers });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.clients) && json.clients.length > 0) {
          setClients(json.clients);
        }
      }
    } catch (err) {
      console.warn("fetchClientsForModal error:", err);
    }
  }, [accessToken]);`;

const newFetchClients = `  const fetchClientsForModal = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      const token = accessToken || (typeof window !== "undefined" ? localStorage.getItem("accessToken") || localStorage.getItem("token") : "");
      if (token) headers["Authorization"] = \`Bearer \${token}\`;
      const res = await fetch("/api/admin/sales/clients?status=active", { headers });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.clients) && json.clients.length > 0) {
          setClients(json.clients);
        }
      }
    } catch (err) {
      console.warn("fetchClientsForModal error:", err);
    }
  }, [accessToken]);`;

if (content.includes(oldFetchClients)) {
  content = content.replace(oldFetchClients, newFetchClients);
  console.log('Updated fetchClientsForModal.');
} else {
  console.log('fetchClientsForModal not found for exact replacement, using regex.');
  content = content.replace(
    /const fetchClientsForModal = useCallback[\s\S]*?\}, \[accessToken\]\);/,
    newFetchClients.trim()
  );
}

// 2. Fix filteredClientList: do NOT filter away clients based on !c.institution_id
const oldFilteredClients = `  const filteredClientList = useMemo(() => {
    const baseList = isPlatformRoute ? clients.filter((c) => !c.institution_id) : clients;
    if (!clientSearchQuery.trim()) return baseList;
    const q = clientSearchQuery.toLowerCase();
    return baseList.filter((c) => {
      const name = (c.company_name || c.name || "").toLowerCase();
      const type = (c.client_type || "").toLowerCase();
      const contact = (c.contact_person || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      return name.includes(q) || type.includes(q) || contact.includes(q) || email.includes(q);
    });
  }, [clients, clientSearchQuery, isPlatformRoute]);`;

const newFilteredClients = `  const filteredClientList = useMemo(() => {
    const baseList = clients;
    if (!clientSearchQuery.trim()) return baseList;
    const q = clientSearchQuery.toLowerCase();
    return baseList.filter((c) => {
      const name = (c.company_name || c.name || "").toLowerCase();
      const type = (c.client_type || "").toLowerCase();
      const contact = (c.contact_person || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      return name.includes(q) || type.includes(q) || contact.includes(q) || email.includes(q);
    });
  }, [clients, clientSearchQuery]);`;

if (content.includes(oldFilteredClients)) {
  content = content.replace(oldFilteredClients, newFilteredClients);
  console.log('Updated filteredClientList to include all active clients.');
} else {
  console.log('filteredClientList not found for exact match, trying regex.');
  content = content.replace(
    /const filteredClientList = useMemo\(\(\) => \{\s*const baseList = isPlatformRoute \? clients\.filter[\s\S]*?\}, \[clients, clientSearchQuery, isPlatformRoute\]\);/,
    newFilteredClients.trim()
  );
}

// 3. Make sure selectedClientObjects includes user_id
content = content.replace(
  `        .map((c) => ({\n          id: c.id,\n          name: c.name,\n          company_name: c.company_name || c.name,\n          email: c.email || null,\n          phone: c.phone || null,\n          client_type: c.client_type || null,\n        }));`,
  `        .map((c) => ({\n          id: c.id,\n          name: c.name,\n          company_name: c.company_name || c.name,\n          email: c.email || null,\n          phone: c.phone || null,\n          client_type: c.client_type || null,\n          user_id: c.user_id || null,\n        }));`
);

// 4. Ensure clicking the dropdown button or "Client" button always fetches clients
content = content.replace(
  `onClick={() => {\n                          if (!clientDropdownOpen && clients.length === 0) {\n                            void fetchClientsForModal();\n                          }\n                          setClientDropdownOpen(!clientDropdownOpen);\n                        }}`,
  `onClick={() => {\n                          if (!clientDropdownOpen) {\n                            void fetchClientsForModal();\n                          }\n                          setClientDropdownOpen(!clientDropdownOpen);\n                        }}`
);

content = content.replace(
  `                      if (clients.length === 0) {\n                        void fetchClientsForModal();\n                      }`,
  `                      void fetchClientsForModal();`
);

fs.writeFileSync('app/admin/operations/tasks/page.tsx', content, 'utf8');
console.log('Successfully patched page.tsx!');

