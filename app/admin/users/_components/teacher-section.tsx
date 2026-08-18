import type { ReactNode } from "react";
import { MultiSelect } from "@/components/ui/multi-select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { FieldError } from "./field-error";
import type { InstitutionOption, TeachingOption } from "./types";

type TeacherSectionProps = {
    isTeacher: boolean;
    teacherType?: string;
    underInstitutionId: string;
    underInstitutionName: string;
    teachingCategories: string[];
    teachingSubjects: string[];
    gender: string;
    selectedTeachingCategoryOptions: TeachingOption[];
    selectedTeachingSubjectOptions: TeachingOption[];
    teachingCategoryLoading: boolean;
    teachingSubjectLoading: boolean;
    teachingSubjectScopeLoading: boolean;
    teachingSubjectBoardReady?: boolean;
    teachingCategoryError: string | null;
    teachingSubjectError: string | null;
    teacherTypeError?: string;
    underInstitutionError?: string;
    genderError?: string;
    teacherDetailSlot?: ReactNode;
    fetchTeachingCategories: (search: string, page: number) => Promise<{ data: TeachingOption[]; hasMore: boolean }>;
    fetchTeachingSubjects: (search: string, page: number) => Promise<{ data: TeachingOption[]; hasMore: boolean }>;
    fetchInstitutions: (search: string, page: number) => Promise<{ data: InstitutionOption[]; hasMore: boolean }>;
    institutionLocked?: boolean;
    onTeacherTypeChange?: (next: string) => void;
    onInstitutionChange: (id: string, name: string, boardId: number | null) => void;
    onTeachingCategoriesChange: (value: string[]) => void;
    onTeachingSubjectsChange: (value: string[]) => void;
    onGenderChange: (value: string) => void;
};

export function TeacherSection({
    isTeacher,
    underInstitutionId,
    underInstitutionName,
    teachingCategories,
    teachingSubjects,
    gender,
    selectedTeachingCategoryOptions,
    selectedTeachingSubjectOptions,
    teachingCategoryLoading,
    teachingSubjectLoading,
    teachingSubjectScopeLoading,
    teachingSubjectBoardReady = true,
    teachingCategoryError,
    teachingSubjectError,
    underInstitutionError,
    genderError,
    fetchTeachingCategories,
    fetchTeachingSubjects,
    fetchInstitutions,
    institutionLocked = false,
    onInstitutionChange,
    onTeachingCategoriesChange,
    onTeachingSubjectsChange,
    onGenderChange,
}: TeacherSectionProps) {
    return (
        <>
            {isTeacher && (
                <div className="space-y-4 rounded-md border p-4">
                    <div className="text-sm font-medium">Teacher profile</div>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label>Institution</Label>
                            {institutionLocked ? (
                                <Input
                                    value={underInstitutionName || (underInstitutionId ? `Institution ${underInstitutionId}` : "Select institution from sidebar")}
                                    disabled
                                    className="disabled:cursor-not-allowed disabled:opacity-100"
                                />
                            ) : (
                                <AsyncSearchPopover<InstitutionOption>
                                    value={underInstitutionId}
                                    onChange={(value) => {
                                        if (!value) onInstitutionChange("", "", null);
                                    }}
                                    placeholder="Select institution"
                                    searchPlaceholder="Search institution..."
                                    emptyText="No institution found"
                                    selectedLabel={underInstitutionName}
                                    fetcher={fetchInstitutions}
                                    getValue={(item) => String(item.id)}
                                    getLabel={(item) => item.name}
                                    onSelectItem={(item) =>
                                        onInstitutionChange(String(item.id), item.name, item.board_id)
                                    }
                                    renderItem={(item) => (
                                        <div className="min-w-0">
                                            <div className="truncate font-medium">{item.name}</div>
                                            <div className="truncate text-xs text-muted-foreground">{item.slug}</div>
                                        </div>
                                    )}
                                />
                            )}
                            <FieldError message={underInstitutionError} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="add-user-teacher-gender">Gender</Label>
                            <Select value={gender} onValueChange={onGenderChange}>
                                <SelectTrigger id="add-user-teacher-gender" className="w-full">
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">Not specified</SelectItem>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                                </SelectContent>
                            </Select>
                            <FieldError message={genderError} />
                        </div>
                    </div>
                </div>
            )}

            {isTeacher && (
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                            <Label htmlFor="add-user-teaching-categories">Teaching categories</Label>
                            {teachingCategoryLoading && (
                                <span className="text-xs text-muted-foreground">Loading tree...</span>
                            )}
                        </div>

                        <MultiSelect
                            id="add-user-teaching-categories"
                            options={[]}
                            async
                            fetcher={fetchTeachingCategories}
                            selectedOptions={selectedTeachingCategoryOptions}
                            value={teachingCategories}
                            onValueChange={onTeachingCategoriesChange}
                            placeholder={
                                teachingCategoryLoading
                                    ? "Loading categories..."
                                    : "Select teaching categories"
                            }
                            searchable
                            maxCount={4}
                            deduplicateOptions
                            disabled={teachingCategoryLoading}
                            loading={teachingCategoryLoading}
                        />

                        <p className="text-xs text-muted-foreground">
                            Search categories by name. Selected categories will determine the
                            subject list.
                        </p>

                        {teachingCategoryError && <FieldError message={teachingCategoryError} />}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="add-user-teaching-subjects">Teaching subjects</Label>

                        <MultiSelect
                            id="add-user-teaching-subjects"
                            options={[]}
                            async
                            fetcher={fetchTeachingSubjects}
                            selectedOptions={selectedTeachingSubjectOptions}
                            value={teachingSubjects}
                            onValueChange={onTeachingSubjectsChange}
                            placeholder={
                                !underInstitutionId
                                    ? "Select institution first"
                                    : !teachingSubjectBoardReady
                                    ? "Loading institution board..."
                                    : teachingCategories.length === 0
                                    ? "Select categories first"
                                    : teachingSubjectScopeLoading || teachingSubjectLoading
                                        ? "Loading subjects..."
                                        : "Select teaching subjects"
                            }
                            searchable
                            maxCount={4}
                            deduplicateOptions
                            loading={teachingSubjectScopeLoading || teachingSubjectLoading}
                            disabled={
                                !underInstitutionId ||
                                !teachingSubjectBoardReady ||
                                teachingCategories.length === 0 ||
                                teachingSubjectScopeLoading
                            }
                        />

                        {teachingSubjectError && <FieldError message={teachingSubjectError} />}
                    </div>
                </div>
            )}
        </>
    );
}
