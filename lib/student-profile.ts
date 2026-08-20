export const STUDENT_GRADES = [
  "ابتدایی",
  "هفتم",
  "هشتم",
  "نهم",
  "دهم",
  "یازدهم",
  "دوازدهم",
  "پشت کنکور",
  "دانشجو",
] as const;

export const STUDY_FIELDS = ["ریاضی", "تجربی", "انسانی", "هنر", "فنی-حرفه‌ای"] as const;

const LEGACY_GRADES = ["فارغ‌التحصیل"] as const;
const FIELD_REQUIRED_GRADES = new Set<string>([
  "دهم",
  "یازدهم",
  "دوازدهم",
  "پشت کنکور",
  "فارغ‌التحصیل",
]);

export function isStudentGrade(value: unknown): value is (typeof STUDENT_GRADES)[number] | (typeof LEGACY_GRADES)[number] {
  return typeof value === "string"
    && ([...STUDENT_GRADES, ...LEGACY_GRADES] as readonly string[]).includes(value);
}

export function isStudyField(value: unknown): value is (typeof STUDY_FIELDS)[number] {
  return typeof value === "string" && (STUDY_FIELDS as readonly string[]).includes(value);
}

export function gradeRequiresField(grade: string | null | undefined): boolean {
  return !!grade && FIELD_REQUIRED_GRADES.has(grade);
}

export function isStudentProfileComplete(profile: {
  phone: string | null | undefined;
  grade: string | null | undefined;
  field: string | null | undefined;
}): boolean {
  if (!profile.phone || !isStudentGrade(profile.grade)) return false;
  return !gradeRequiresField(profile.grade) || isStudyField(profile.field);
}
