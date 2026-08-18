import { Trash2 } from "lucide-react";

import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MONTHS } from "@/lib/utils/user-form.constants";

import { FieldError } from "./field-error";
import type {
    DesignationOption,
    ExperienceForm,
    MasterOrgOption,
} from "./types";

type ExperienceCardProps = {
    experience: ExperienceForm;
    index: number;
    errors: Record<string, string>;
    accessToken: string | null;
    onChange: (patch: Partial<ExperienceForm>) => void;
    onDelete: () => void;
};

async function fetchDesignations(
    accessToken: string,
    search: string,
    page: number
) {
    const res = await fetch(
        `/api/admin/master-data/designations?search=${encodeURIComponent(search)}&page=${page}&limit=10`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch designations");
    }

    const json = await res.json();

    return {
        data: json.data as DesignationOption[],
        hasMore: page < json.pageCount,
    };
}

export function ExperienceCard({
    experience,
    index,
    errors,
    accessToken,
    onChange,
    onDelete,
}: ExperienceCardProps) {
    return (
        <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Experience {index + 1}</span>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onDelete}
                >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Remove experience</span>
                </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label>Job title</Label>

                    <AsyncSearchPopover<DesignationOption>
                        value={experience.job_title}
                        onChange={(value) => onChange({ job_title: value })}
                        fetcher={(search, page) =>
                            fetchDesignations(accessToken!, search, page)
                        }
                        getValue={(item) => item.name}
                        getLabel={(item) => item.name}
                        placeholder="Select designation"
                        searchPlaceholder="Search designation..."
                        emptyText="No designation found"
                        selectedLabel={experience.job_title}
                        onSelectItem={(item) => onChange({ job_title: item.name })}
                    />

                    <FieldError message={errors[`experience.${index}.job_title`]} />
                </div>
                <div className="space-y-1.5">
                    <Label>Company</Label>
                    <AsyncSearchPopover<MasterOrgOption>
                        value={experience.company_id || experience.company_name}
                        onChange={(value) => onChange({ company_id: value })}
                        allowCustomValue
                        customValueLabel={(value) => `Add new company: ${value}`}
                        onCreateCustomValue={(value) =>
                            onChange({
                                company_id: "",
                                company_name: value,
                            })
                        }
                        placeholder="Select company"
                        searchPlaceholder="Search company..."
                        emptyText="No company found"
                        selectedLabel={experience.company_name}
                        fetcher={async (search, page) => {
                            const res = await fetch(
                                `/api/admin/master-data/organizations?type=company&search=${encodeURIComponent(search)}&page=${page}&limit=10`,
                                {
                                    headers: {
                                        Authorization: `Bearer ${accessToken}`,
                                    },
                                }
                            );

                            if (!res.ok) throw new Error("Failed to fetch companies");

                            const json = await res.json();
                            return {
                                data: json.data as MasterOrgOption[],
                                hasMore: page < json.pageCount,
                            };
                        }}
                        getValue={(item) => String(item.id)}
                        getLabel={(item) => item.name}
                        onSelectItem={(item) =>
                            onChange({
                                company_id: String(item.id),
                                company_name: item.name,
                            })
                        }
                    />
                    <FieldError message={errors[`experience.${index}.company_name`]} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label>From month</Label>
                        <Select
                            value={experience.from_month}
                            onValueChange={(value) => onChange({ from_month: value })}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTHS.map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>From year</Label>
                        <Input
                            type="number"
                            value={experience.from_year}
                            onChange={(event) => onChange({ from_year: event.target.value })}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label>To month</Label>
                        <Select
                            value={experience.to_month}
                            onValueChange={(value) => onChange({ to_month: value })}
                            disabled={experience.is_current}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTHS.map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>To year</Label>
                        <Input
                            type="number"
                            value={experience.to_year}
                            onChange={(event) => onChange({ to_year: event.target.value })}
                            disabled={experience.is_current}
                        />
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <Checkbox
                    id={`current-${experience.id}`}
                    checked={experience.is_current}
                    onCheckedChange={(checked) => onChange({ is_current: checked === true })}
                />
                <Label htmlFor={`current-${experience.id}`} className="cursor-pointer">
                    Current role
                </Label>
            </div>
            <FieldError message={errors[`experience.${index}.from`]} />
            <FieldError message={errors[`experience.${index}.to`]} />
        </div>
    );
}
