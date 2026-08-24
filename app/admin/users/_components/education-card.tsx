import { GraduationCap, Trash2 } from "lucide-react";

import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { FieldError } from "./field-error";
import type {
    EducationForm,
    MasterOrgOption,
    QualificationOption,
} from "./types";

type EducationCardProps = {
    education: EducationForm;
    index: number;
    errors: Record<string, string>;
    accessToken: string | null;
    onChange: (patch: Partial<EducationForm>) => void;
    onDelete: () => void;
};

export function EducationCard({
    education,
    index,
    errors,
    accessToken,
    onChange,
    onDelete,
}: EducationCardProps) {
    return (
        <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium">
                    <GraduationCap className="size-4" />
                    Education {index + 1}
                </span>
                <Button type="button" variant="ghost" size="icon-sm" onClick={onDelete}>
                    <Trash2 className="size-4" />
                    <span className="sr-only">Remove education</span>
                </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label>Qualification</Label>
                    <AsyncSearchPopover<QualificationOption>
                        value={education.qualification}
                        onChange={(value) => onChange({ qualification: value })}
                        allowCustomValue
                        customValueLabel={(value) => `Use custom qualification: ${value}`}
                        onCreateCustomValue={(value) => onChange({ qualification: value })}
                        placeholder="Select qualification"
                        searchPlaceholder="Search qualification..."
                        emptyText="No qualification found"
                        selectedLabel={education.qualification}
                        fetcher={async (search, page) => {
                            const res = await fetch(
                                `/api/admin/categories/qualifications?search=${encodeURIComponent(search)}&page=${page}&limit=10`,
                                {
                                    headers: {
                                        Authorization: `Bearer ${accessToken}`,
                                    },
                                }
                            );

                            if (!res.ok) {
                                throw new Error("Failed to fetch qualifications");
                            }

                            const json = await res.json();

                            return {
                                data: json.data as QualificationOption[],
                                hasMore: page < json.pageCount,
                            };
                        }}
                        getValue={(item) => item.name}
                        getLabel={(item) => item.name}
                        onSelectItem={(item) => onChange({ qualification: item.name })}
                    />
                    <FieldError message={errors[`education.${index}.qualification`]} />
                </div>
                <div className="space-y-1.5">
                    <Label>Institution</Label>
                    <AsyncSearchPopover<MasterOrgOption>
                        value={education.institution_id || education.institution_name}
                        onChange={(value) => onChange({ institution_id: value })}
                        allowCustomValue
                        customValueLabel={(value) => `Use custom institution: "${value}"`}
                        onCreateCustomValue={(value) =>
                            onChange({
                                institution_id: "",
                                institution_name: value,
                            })
                        }
                        placeholder="Select or type institution"
                        searchPlaceholder="Search institution or type name..."
                        emptyText="No institution found"
                        selectedLabel={education.institution_name}
                        fetcher={async (search, page) => {
                            const res = await fetch(
                                `/api/institutions?search=${encodeURIComponent(search)}&page=${page}&limit=10`
                            );

                            if (!res.ok) throw new Error("Failed to fetch institutions");

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
                                institution_id: String(item.id),
                                institution_name: item.name,
                            })
                        }
                    />
                    <FieldError message={errors[`education.${index}.institution_id`] || errors[`education.${index}.institution_name`]} />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                    <div className="space-y-1.5">
                        <Label>From year</Label>
                        <Input
                            type="number"
                            value={education.from_year}
                            onChange={(event) => onChange({ from_year: event.target.value })}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>To year</Label>
                        <Input
                            type="number"
                            value={education.to_year}
                            onChange={(event) => onChange({ to_year: event.target.value })}
                        />
                    </div>
                </div>
            </div>
            <FieldError message={errors[`education.${index}.years`]} />
        </div>
    );
}
