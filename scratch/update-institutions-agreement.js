const fs = require('fs');
const filePath = 'd:/edubird/app/admin/institutions/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!content.includes('InstitutionAgreementDialog')) {
  content = content.replace(
    `import { InstitutionBranchManager } from "@/components/admin/institutions/institution-branch-manager";`,
    `import { InstitutionBranchManager } from "@/components/admin/institutions/institution-branch-manager";\nimport { InstitutionAgreementDialog } from "@/components/admin/institutions/institution-agreement-dialog";`
  );
}

// 2. Update buildColumns signature
const sigTarget = `function buildColumns(
    setDeleteTarget: (t: InstitutionProfile | null) => void,
    setEditing: (t: InstitutionProfile | null) => void,
    handleToggle: (t: InstitutionProfile) => Promise<void>,
    activeLoadingId: number | null,
    setViewTarget: (t: InstitutionProfile | null) => void
): ColumnDef<InstitutionProfile>[] {`;

const sigReplacement = `function buildColumns(
    setDeleteTarget: (t: InstitutionProfile | null) => void,
    setEditing: (t: InstitutionProfile | null) => void,
    handleToggle: (t: InstitutionProfile) => Promise<void>,
    activeLoadingId: number | null,
    setViewTarget: (t: InstitutionProfile | null) => void,
    setAgreementTarget: (t: InstitutionProfile | null) => void
): ColumnDef<InstitutionProfile>[] {`;

if (content.includes(sigTarget)) {
  content = content.replace(sigTarget, sigReplacement);
}

// 3. Add Agreement item to DropdownMenu
const menuTarget = `                            <DropdownMenuItem onClick={() => setEditing(item)}>
                                Edit
                            </DropdownMenuItem>`;

const menuReplacement = `                            <DropdownMenuItem onClick={() => setEditing(item)}>
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAgreementTarget(item)}>
                                Agreement
                            </DropdownMenuItem>`;

if (content.includes(menuTarget) && !content.includes('setAgreementTarget(item)')) {
  content = content.replace(menuTarget, menuReplacement);
}

// 4. Add agreementTarget state and pass to buildColumns in InstitutionsAdminPage
const stateTarget = `    const [dialogOpen, setDialogOpen] = useState(false);`;
const stateReplacement = `    const [agreementTarget, setAgreementTarget] = useState<InstitutionProfile | null>(null);\n    const [dialogOpen, setDialogOpen] = useState(false);`;

if (content.includes(stateTarget) && !content.includes('agreementTarget')) {
  content = content.replace(stateTarget, stateReplacement);
}

// 5. Update columns call in InstitutionsAdminPage
const callTarget = `    const columns = buildColumns(setDeleteTarget, setEditing, handleToggle, activeLoadingId, (item) => {
        setViewing(item);
        setViewOpen(true);
        if (item) {
            fetchMedia(item.id);
        }
    });`;

const callReplacement = `    const columns = buildColumns(setDeleteTarget, setEditing, handleToggle, activeLoadingId, (item) => {
        setViewing(item);
        setViewOpen(true);
        if (item) {
            fetchMedia(item.id);
        }
    }, setAgreementTarget);`;

if (content.includes(callTarget)) {
  content = content.replace(callTarget, callReplacement);
}

// 6. Add InstitutionAgreementDialog JSX before the closing </div>
const dialogTarget = `            <Sheet open={viewOpen} onOpenChange={(open) => {`;
const dialogReplacement = `            <InstitutionAgreementDialog
                open={!!agreementTarget}
                onOpenChange={(open) => !open && setAgreementTarget(null)}
                institution={agreementTarget}
            />

            <Sheet open={viewOpen} onOpenChange={(open) => {`;

if (content.includes(dialogTarget) && !content.includes('<InstitutionAgreementDialog')) {
  content = content.replace(dialogTarget, dialogReplacement);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('admin/institutions/page.tsx updated with Agreement option & dialog');
