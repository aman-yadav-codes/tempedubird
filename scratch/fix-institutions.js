const fs = require('fs');
const filePath = 'd:/edubird/app/admin/institutions/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Import
if (!content.includes('InstitutionAgreementDialog')) {
  content = `import { InstitutionAgreementDialog } from "@/components/admin/institutions/institution-agreement-dialog";\n` + content;
}

// 2. buildColumns definition
content = content.replace(
  /function buildColumns\([\s\S]*?\): ColumnDef<InstitutionProfile>\[\] {/,
  `function buildColumns(
    setDeleteTarget: (t: InstitutionProfile | null) => void,
    setEditing: (t: InstitutionProfile | null) => void,
    handleToggle: (t: InstitutionProfile) => Promise<void>,
    activeLoadingId: number | null,
    setViewTarget: (t: InstitutionProfile | null) => void,
    setAgreementTarget: (t: InstitutionProfile | null) => void
): ColumnDef<InstitutionProfile>[] {`
);

// 3. DropdownMenuItem for Agreement
content = content.replace(
  /<DropdownMenuItem onClick=\{.*?setEditing\(item\).*?Edit\s*<\/DropdownMenuItem>/,
  `<DropdownMenuItem onClick={() => setEditing(item)}>
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAgreementTarget(item)}>
                                Agreement
                            </DropdownMenuItem>`
);

// 4. agreementTarget state in InstitutionsAdminPage
if (!content.includes('const [agreementTarget, setAgreementTarget]')) {
  content = content.replace(
    'export default function InstitutionsAdminPage() {',
    `export default function InstitutionsAdminPage() {\n    const [agreementTarget, setAgreementTarget] = useState<InstitutionProfile | null>(null);`
  );
}

// 5. columns call
content = content.replace(
  /const columns = buildColumns\(setDeleteTarget, setEditing, handleToggle, activeLoadingId, \((item)?\) => {[\s\S]*?}\);/,
  `const columns = buildColumns(setDeleteTarget, setEditing, handleToggle, activeLoadingId, (item) => {
        setViewing(item);
        setViewOpen(true);
        if (item) {
            fetchMedia(item.id);
        }
    }, setAgreementTarget);`
);

// 6. Dialog rendering
if (!content.includes('<InstitutionAgreementDialog')) {
  content = content.replace(
    '<AlertDialog open={!!deleteTarget}',
    `<InstitutionAgreementDialog
                open={!!agreementTarget}
                onOpenChange={(open) => !open && setAgreementTarget(null)}
                institution={agreementTarget}
            />\n\n            <AlertDialog open={!!deleteTarget}`
  );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed admin/institutions/page.tsx');
