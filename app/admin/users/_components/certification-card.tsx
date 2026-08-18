import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { FieldError } from "./field-error";
import { HelpPopover } from "./help-popover";
import type { CertificationForm } from "./types";

type CertificationCardProps = {
    certification: CertificationForm;
    index: number;
    errors: Record<string, string>;
    onChange: (patch: Partial<CertificationForm>) => void;
    onDelete: () => void;
};

export function CertificationCard({
    certification,
    index,
    errors,
    onChange,
    onDelete,
}: CertificationCardProps) {
    return (
        <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <div className="space-y-1.5">
                <Label className="h-5">Name</Label>
                <Input
                    value={certification.name}
                    onChange={(event) => onChange({ name: event.target.value })}
                />
                <FieldError message={errors[`certification.${index}.name`]} />
            </div>
            <div className="space-y-1.5">
                <Label className="h-5">
                    Issued authority
                    <HelpPopover title="Issued authority">
                        The institute, board, company, or organization that issued this certification.
                    </HelpPopover>
                </Label>
                <Input
                    value={certification.issued_authority}
                    onChange={(event) => onChange({ issued_authority: event.target.value })}
                />
            </div>
            <div className="space-y-1.5">
                <Label className="h-5">
                    Duration
                    <HelpPopover title="Duration">
                        Enter the certification duration in months.
                    </HelpPopover>
                </Label>
                <Input
                    type="number"
                    min="1"
                    max="1200"
                    placeholder="6"
                    value={certification.duration}
                    onChange={(event) => onChange({ duration: event.target.value })}
                />
                <FieldError message={errors[`certification.${index}.duration`]} />
            </div>
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="self-end"
                onClick={onDelete}
            >
                <Trash2 className="size-4" />
                <span className="sr-only">Remove certification</span>
            </Button>
        </div>
    );
}
