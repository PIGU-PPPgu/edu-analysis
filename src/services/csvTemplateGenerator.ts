import { supabase } from "@/integrations/supabase/client";

/**
 * Dynamic CSV Template Generator
 * Generates CSV templates based on current grading scale configuration
 */

interface GradingScale {
  id: string;
  name: string;
  levels: GradingLevel[];
}

interface GradingLevel {
  name: string;
  min_score: number;
  max_score: number;
  position: number;
}

interface TemplateConfig {
  includeRanks?: boolean;
  includeGradeLevels?: boolean;
  subjects?: string[];
  additionalFields?: string[];
}

/**
 * Get current grading scale from user settings or default
 */
export async function getCurrentGradingScale(): Promise<GradingScale | null> {
  try {
    // First try to get user's default grading scale
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: userSettings } = await supabase
        .from("user_settings")
        .select(
          `
          default_grading_scale_id,
          grading_scales (
            id,
            name,
            grading_scale_levels (
              name,
              min_score,
              max_score,
              position
            )
          )
        `
        )
        .eq("user_id", user.id)
        .single();

      if (userSettings?.grading_scales) {
        return {
          id: userSettings.grading_scales.id,
          name: userSettings.grading_scales.name,
          levels: userSettings.grading_scales.grading_scale_levels || [],
        };
      }
    }

    // Fallback to system default grading scale
    const { data: defaultScale } = await supabase
      .from("grading_scales")
      .select(
        `
        id,
        name,
        grading_scale_levels (
          name,
          min_score,
          max_score,
          position
        )
      `
      )
      .eq("is_default", true)
      .single();

    if (defaultScale) {
      return {
        id: defaultScale.id,
        name: defaultScale.name,
        levels: defaultScale.grading_scale_levels || [],
      };
    }

    return null;
  } catch (error) {
    console.error("Failed to get grading scale:", error);
    return null;
  }
}

/**
 * Generate CSV header row based on configuration
 */
export function generateCSVHeaders(config: TemplateConfig = {}): {
  headers: string[];
  description: Record<string, string>;
} {
  const {
    includeRanks = true,
    includeGradeLevels = true,
    subjects = [
      "chinese",
      "math",
      "english",
      "physics",
      "chemistry",
      "politics",
      "history",
      "biology",
      "geography",
    ],
    additionalFields = [],
  } = config;

  const headers: string[] = [];
  const description: Record<string, string> = {};

  // Core required fields
  headers.push("exam_id");
  description.exam_id = "考试ID (必填, 唯一标识)";

  headers.push("student_id");
  description.student_id = "学号 (必填, 用于匹配学生)";

  headers.push("name");
  description.name = "姓名 (必填, 用于验证)";

  headers.push("class_name");
  description.class_name =
    "班级 (必填, 格式: 高一1班、高二3班，必须含年级，禁用括号)";

  // Exam metadata
  headers.push("exam_title");
  description.exam_title = "考试名称 (必填, 如: 2024年期中考试)";

  headers.push("exam_type");
  description.exam_type = "考试类型 (选填, 如: 期中考试/期末考试)";

  headers.push("exam_date");
  description.exam_date = "考试日期 (选填, 格式: YYYY-MM-DD)";

  // Total score fields
  headers.push("total_score");
  description.total_score = "总分 (选填, 数字)";

  headers.push("total_max_score");
  description.total_max_score = "总分满分 (选填, 默认523)";

  if (includeGradeLevels) {
    headers.push("total_grade");
    description.total_grade = "总分等级 (选填, 如: A/B/C)";
  }

  // Subject scores
  subjects.forEach((subject) => {
    headers.push(`${subject}_score`);
    description[`${subject}_score`] = `${getSubjectName(subject)}分数 (选填)`;

    if (includeGradeLevels) {
      headers.push(`${subject}_grade`);
      description[`${subject}_grade`] = `${getSubjectName(subject)}等级 (选填)`;
    }
  });

  // Ranking fields
  if (includeRanks) {
    // Total ranks
    headers.push("total_rank_in_class");
    description.total_rank_in_class = "班级总分排名 (选填)";

    headers.push("total_rank_in_grade");
    description.total_rank_in_grade = "年级总分排名 (选填)";

    headers.push("total_rank_in_school");
    description.total_rank_in_school = "校总分排名 (选填)";

    // Subject ranks
    subjects.forEach((subject) => {
      headers.push(`${subject}_rank_in_class`);
      description[`${subject}_rank_in_class`] =
        `${getSubjectName(subject)}班级排名 (选填)`;
    });
  }

  // Additional custom fields
  additionalFields.forEach((field) => {
    headers.push(field);
    description[field] = `${field} (自定义字段)`;
  });

  return { headers, description };
}

/**
 * Generate complete CSV template with headers and sample data
 */
export async function generateCSVTemplate(
  config: TemplateConfig = {},
  includeSampleData = true
): Promise<string> {
  const { headers, description } = generateCSVHeaders(config);

  // Header row with descriptions
  const descriptionRow = headers.map((h) => description[h] || h).join(",");
  const headerRow = headers.join(",");

  if (!includeSampleData) {
    return `${descriptionRow}\n${headerRow}`;
  }

  // Generate sample data rows
  const sampleRows = [
    generateSampleRow(headers, 1),
    generateSampleRow(headers, 2),
    generateSampleRow(headers, 3),
  ];

  return [descriptionRow, headerRow, ...sampleRows].join("\n");
}

/**
 * Generate a sample data row
 */
function generateSampleRow(headers: string[], index: number): string {
  const sampleData: Record<string, string> = {
    exam_id: `EXAM2024${index.toString().padStart(3, "0")}`,
    student_id: `S2024${index.toString().padStart(4, "0")}`,
    name: `示例学生${index}`,
    class_name: `高一${index}班`,
    exam_title: "2024年期中考试",
    exam_type: "期中考试",
    exam_date: "2024-11-15",
    total_score: (450 + index * 10).toString(),
    total_max_score: "523",
    total_grade: "B",
    chinese_score: (85 + index).toString(),
    chinese_grade: "B",
    math_score: (78 + index).toString(),
    math_grade: "C",
    english_score: (92 + index).toString(),
    english_grade: "A",
    physics_score: (70 + index).toString(),
    physics_grade: "C",
    chemistry_score: (75 + index).toString(),
    chemistry_grade: "C",
    politics_score: "0",
    politics_grade: "",
    history_score: "0",
    history_grade: "",
    biology_score: "0",
    biology_grade: "",
    geography_score: "0",
    geography_grade: "",
    total_rank_in_class: index.toString(),
    total_rank_in_grade: (index * 3).toString(),
    total_rank_in_school: (index * 5).toString(),
    chinese_rank_in_class: index.toString(),
    math_rank_in_class: (index + 1).toString(),
    english_rank_in_class: (index - 1 > 0 ? index - 1 : 1).toString(),
    physics_rank_in_class: index.toString(),
    chemistry_rank_in_class: index.toString(),
  };

  return headers.map((h) => sampleData[h] || "").join(",");
}

/**
 * Get Chinese name for subject code
 */
function getSubjectName(subjectCode: string): string {
  const subjectNames: Record<string, string> = {
    chinese: "语文",
    math: "数学",
    english: "英语",
    physics: "物理",
    chemistry: "化学",
    politics: "政治",
    history: "历史",
    biology: "生物",
    geography: "地理",
  };

  return subjectNames[subjectCode] || subjectCode;
}

/**
 * Download CSV template as file
 */
export function downloadCSVTemplate(
  csvContent: string,
  filename = "grade_import_template.csv"
): void {
  // Add BOM for Excel UTF-8 compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Generate and download template in one step
 */
export async function generateAndDownloadTemplate(
  config: TemplateConfig = {},
  filename?: string
): Promise<void> {
  try {
    const gradingScale = await getCurrentGradingScale();
    console.log("Current grading scale:", gradingScale);

    const csvContent = await generateCSVTemplate(config, true);
    const defaultFilename = `grade_template_${new Date().toISOString().split("T")[0]}.csv`;

    downloadCSVTemplate(csvContent, filename || defaultFilename);
  } catch (error) {
    console.error("Failed to generate template:", error);
    throw error;
  }
}

/**
 * Validate if uploaded CSV matches expected template structure
 */
export function validateCSVStructure(
  uploadedHeaders: string[],
  expectedHeaders: string[]
): {
  isValid: boolean;
  missingHeaders: string[];
  extraHeaders: string[];
  requiredHeaders: string[];
} {
  const requiredHeaders = [
    "exam_id",
    "student_id",
    "name",
    "class_name",
    "exam_title",
  ];

  const missingRequired = requiredHeaders.filter(
    (h) => !uploadedHeaders.includes(h)
  );
  const missingHeaders = expectedHeaders.filter(
    (h) => !uploadedHeaders.includes(h)
  );
  const extraHeaders = uploadedHeaders.filter(
    (h) => !expectedHeaders.includes(h)
  );

  return {
    isValid: missingRequired.length === 0,
    missingHeaders,
    extraHeaders,
    requiredHeaders: missingRequired,
  };
}
