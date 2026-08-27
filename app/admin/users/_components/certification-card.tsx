import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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

function parseDuration(durationStr: string | number | undefined) {
    if (!durationStr) return { value: "", unit: "Months" };
    const str = String(durationStr).trim();
    const match = str.match(/^(\d+(?:\.\d+)?)\s*(Hour|Hours|Day|Days|Week|Weeks|Month|Months|Year|Years)?/i);
    if (!match) return { value: str, unit: "Months" };
    const value = match[1] ?? "";
    let unit = match[2] ? match[2].toLowerCase() : "months";
    if (unit.startsWith("hour")) unit = "Hours";
    else if (unit.startsWith("day")) unit = "Days";
    else if (unit.startsWith("week")) unit = "Weeks";
    else if (unit.startsWith("year")) unit = "Years";
    else unit = "Months";
    return { value, unit };
}

export function CertificationCard({
    certification,
    index,
    errors,
    onChange,
    onDelete,
}: CertificationCardProps) {
    const { value: durationValue, unit: durationUnit } = parseDuration(certification.duration);
    const [authoritySuggestions, setAuthoritySuggestions] = useState<string[]>([
        "EduBird Central Examination Board",
        "National Skill Assessment Council",
        "State Technical Education Council",
        "Microsoft Certified Educator",
        "Amazon Web Services (AWS)",
        "Google Cloud Academy",
        "Cisco Networking Academy",
        "Institution Academic Dean",
    ]);

    useEffect(() => {
        fetch("/api/admin/certifications/authorities")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.authorities && Array.isArray(data.authorities)) {
                    const list = data.authorities.map((a: any) => a.authority_name).filter(Boolean);
                    if (list.length > 0) {
                        setAuthoritySuggestions((prev) => Array.from(new Set([...list, ...prev])));
                    }
                }
            })
            .catch(() => {});
    }, []);

    const handleDurationChange = (nextValue: string, nextUnit: string) => {
        if (!nextValue.trim()) {
            onChange({ duration: "" });
        } else {
            onChange({ duration: `${nextValue.trim()} ${nextUnit}` });
        }
    };

    const datalistId = `auth-suggestions-${index}`;

    return (
        <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_1fr_1.3fr_auto]">
            <div className="space-y-1.5">
                <Label className="h-5">Name</Label>
                <Input
                    value={certification.name}
                    onChange={(event) => onChange({ name: event.target.value })}
                    placeholder="e.g. AWS Certified Developer"
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
                    list={datalistId}
                    value={certification.issued_authority}
                    onChange={(event) => onChange({ issued_authority: event.target.value })}
                    placeholder="Choose or type issuing authority..."
                />
                <datalist id={datalistId}>
                    {authoritySuggestions.map((auth, aIdx) => (
                        <option key={aIdx} value={auth} />
                    ))}
                </datalist>
            </div>
            <div className="space-y-1.5">
                <Label className="h-5">
                    Duration
                    <HelpPopover title="Duration">
                        Enter certification training duration and choose time unit.
                    </HelpPopover>
                </Label>
                <div className="flex gap-1.5">
                    <Input
                        type="number"
                        min="1"
                        max="1200"
                        placeholder="e.g. 6"
                        value={durationValue}
                        onChange={(event) => handleDurationChange(event.target.value, durationUnit)}
                        className="w-24 shrink-0 bg-background"
                    />
                    <Select
                        value={durationUnit}
                        onValueChange={(unit) => handleDurationChange(durationValue, unit)}
                    >
                        <SelectTrigger className="w-full text-xs bg-background">
                            <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Hours">Hour(s)</SelectItem>
                            <SelectItem value="Days">Day(s)</SelectItem>
                            <SelectItem value="Weeks">Week(s)</SelectItem>
                            <SelectItem value="Months">Month(s)</SelectItem>
                            <SelectItem value="Years">Year(s)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
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
