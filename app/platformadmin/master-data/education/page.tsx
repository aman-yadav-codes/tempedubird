import { VerticalMasterManager } from "@/components/admin/master-data/vertical-master-manager";

export default function EducationMastersPage() {
  return (
    <VerticalMasterManager
      verticalCode="education"
      title="Student & Education Masters Management"
      subtitle="Standardize student categories, subcategories, education levels, courses, academic departments, qualifications, and examination modes."
      iconName="GraduationCap"
      accentColor="from-cyan-600 to-blue-600"
    />
  );
}
