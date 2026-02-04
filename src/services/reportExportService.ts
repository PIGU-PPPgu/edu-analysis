/**
 * 报告导出服务
 * 支持导出Excel和PDF格式的增值评价报告
 */

import * as XLSX from "xlsx";
import type {
  ClassValueAdded,
  TeacherValueAdded,
  StudentValueAdded,
  SubjectBalanceAnalysis,
} from "@/types/valueAddedTypes";

/**
 * 导出班级增值报告为Excel
 */
export function exportClassReportToExcel(
  data: ClassValueAdded[],
  options: {
    fileName?: string;
    subject: string;
  }
) {
  try {
    // 准备表格数据
    const worksheetData = [
      // 表头
      [
        "班级名称",
        "科目",
        "增值率",
        "进步学生比例",
        "Z-Score变化",
        "巩固率",
        "转化率",
        "贡献率",
        "学生总数",
        "入口优秀人数",
        "出口优秀人数",
        "优秀增长",
        "年级排名",
      ],
      // 数据行
      ...data.map((item) => [
        item.class_name,
        item.subject,
        `${(item.avg_score_value_added_rate * 100).toFixed(2)}%`,
        `${(item.progress_student_ratio * 100).toFixed(1)}%`,
        item.avg_z_score_change.toFixed(3),
        `${(item.consolidation_rate * 100).toFixed(1)}%`,
        `${(item.transformation_rate * 100).toFixed(1)}%`,
        `${(item.contribution_rate * 100).toFixed(2)}%`,
        item.total_students,
        item.entry_excellent_count,
        item.exit_excellent_count,
        item.excellent_gain > 0
          ? `+${item.excellent_gain}`
          : item.excellent_gain,
        `${item.rank_in_grade}/${item.total_classes}`,
      ]),
    ];

    // 创建工作簿
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "班级增值报告");

    // 设置列宽
    worksheet["!cols"] = [
      { wch: 15 }, // 班级名称
      { wch: 10 }, // 科目
      { wch: 12 }, // 增值率
      { wch: 14 }, // 进步学生比例
      { wch: 12 }, // Z-Score变化
      { wch: 10 }, // 巩固率
      { wch: 10 }, // 转化率
      { wch: 10 }, // 贡献率
      { wch: 10 }, // 学生总数
      { wch: 14 }, // 入口优秀人数
      { wch: 14 }, // 出口优秀人数
      { wch: 10 }, // 优秀增长
      { wch: 12 }, // 年级排名
    ];

    // 导出文件
    const fileName =
      options.fileName ||
      `班级增值报告_${options.subject}_${new Date().toLocaleDateString()}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error("导出班级报告失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "导出失败",
    };
  }
}

/**
 * 导出教师增值报告为Excel
 */
export function exportTeacherReportToExcel(
  data: TeacherValueAdded[],
  options: {
    fileName?: string;
    subject: string;
  }
) {
  try {
    // 准备表格数据
    const worksheetData = [
      // 表头
      [
        "教师姓名",
        "科目",
        "增值率",
        "进步学生数",
        "进步学生比例",
        "Z-Score变化",
        "巩固率",
        "转化率",
        "贡献率",
        "优秀增长",
        "学生总数",
        "入口优秀数",
        "出口优秀数",
        "学科排名",
      ],
      // 数据行
      ...data.map((item) => [
        item.teacher_name,
        item.subject,
        `${(item.avg_score_value_added_rate * 100).toFixed(2)}%`,
        item.progress_student_count,
        `${(item.progress_student_ratio * 100).toFixed(1)}%`,
        item.avg_z_score_change.toFixed(3),
        `${(item.consolidation_rate * 100).toFixed(1)}%`,
        `${(item.transformation_rate * 100).toFixed(1)}%`,
        `${(item.contribution_rate * 100).toFixed(2)}%`,
        item.excellent_gain > 0
          ? `+${item.excellent_gain}`
          : item.excellent_gain,
        item.total_students,
        item.entry_excellent_count,
        item.exit_excellent_count,
        `${item.rank_in_subject}/${item.total_teachers}`,
      ]),
    ];

    // 创建工作簿
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "教师增值报告");

    // 设置列宽
    worksheet["!cols"] = [
      { wch: 12 }, // 教师姓名
      { wch: 10 }, // 科目
      { wch: 12 }, // 增值率
      { wch: 12 }, // 进步学生数
      { wch: 14 }, // 进步学生比例
      { wch: 12 }, // Z-Score变化
      { wch: 10 }, // 巩固率
      { wch: 10 }, // 转化率
      { wch: 10 }, // 贡献率
      { wch: 10 }, // 优秀增长
      { wch: 10 }, // 学生总数
      { wch: 12 }, // 入口优秀数
      { wch: 12 }, // 出口优秀数
      { wch: 12 }, // 学科排名
    ];

    // 导出文件
    const fileName =
      options.fileName ||
      `教师增值报告_${options.subject}_${new Date().toLocaleDateString()}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error("导出教师报告失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "导出失败",
    };
  }
}

/**
 * 导出学生增值报告为Excel
 */
export function exportStudentReportToExcel(
  data: StudentValueAdded[],
  options?: {
    fileName?: string;
  }
) {
  try {
    // 准备表格数据
    const worksheetData = [
      // 表头
      [
        "学号",
        "姓名",
        "班级",
        "科目",
        "入口成绩",
        "出口成绩",
        "分数增值",
        "增值率",
        "入口等级",
        "出口等级",
        "等级变化",
        "是否巩固",
        "是否转化",
      ],
      // 数据行
      ...data.map((item) => [
        item.student_id,
        item.student_name,
        item.class_name,
        item.subject,
        item.entry_score,
        item.exit_score,
        item.score_value_added > 0
          ? `+${item.score_value_added}`
          : item.score_value_added,
        `${(item.score_value_added_rate * 100).toFixed(2)}%`,
        item.entry_level,
        item.exit_level,
        item.level_change > 0 ? `+${item.level_change}` : item.level_change,
        item.is_consolidated ? "是" : "否",
        item.is_transformed ? "是" : "否",
      ]),
    ];

    // 创建工作簿
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "学生增值报告");

    // 设置列宽
    worksheet["!cols"] = [
      { wch: 12 }, // 学号
      { wch: 10 }, // 姓名
      { wch: 12 }, // 班级
      { wch: 10 }, // 科目
      { wch: 10 }, // 入口成绩
      { wch: 10 }, // 出口成绩
      { wch: 10 }, // 分数增值
      { wch: 12 }, // 增值率
      { wch: 10 }, // 入口等级
      { wch: 10 }, // 出口等级
      { wch: 10 }, // 等级变化
      { wch: 10 }, // 是否巩固
      { wch: 10 }, // 是否转化
    ];

    // 导出文件
    const fileName =
      options?.fileName ||
      `学生增值报告_${new Date().toLocaleDateString()}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error("导出学生报告失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "导出失败",
    };
  }
}

/**
 * 导出学科均衡报告为Excel
 */
export function exportSubjectBalanceReportToExcel(
  data: SubjectBalanceAnalysis[],
  options?: {
    fileName?: string;
  }
) {
  try {
    // 主表数据
    const mainData = [
      ["班级名称", "总体增值率", "学科偏离度", "均衡得分", "年级排名"],
      ...data.map((item) => [
        item.class_name,
        `${(item.total_score_value_added_rate * 100).toFixed(2)}%`,
        item.subject_deviation.toFixed(3),
        item.balance_score.toFixed(3),
        `${item.total_rank}`,
      ]),
    ];

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 添加主表
    const mainSheet = XLSX.utils.aoa_to_sheet(mainData);
    mainSheet["!cols"] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(workbook, mainSheet, "学科均衡总览");

    // 为每个班级创建详细表
    data.forEach((classData, index) => {
      if (index < 10) {
        // 限制工作表数量
        const detailData = [
          ["科目", "增值率", "偏离度", "班级排名"],
          ...classData.subjects.map((subject) => [
            subject.subject,
            `${(subject.value_added_rate * 100).toFixed(2)}%`,
            `${(subject.deviation_from_avg * 100).toFixed(2)}%`,
            subject.rank,
          ]),
        ];

        const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
        detailSheet["!cols"] = [
          { wch: 10 },
          { wch: 12 },
          { wch: 12 },
          { wch: 12 },
        ];

        // 工作表名称限制31个字符
        const sheetName = classData.class_name.substring(0, 28);
        XLSX.utils.book_append_sheet(workbook, detailSheet, sheetName);
      }
    });

    // 导出文件
    const fileName =
      options?.fileName ||
      `学科均衡报告_${new Date().toLocaleDateString()}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error("导出学科均衡报告失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "导出失败",
    };
  }
}

/**
 * 导出历次追踪报告为Excel
 */
export function exportTrackingReportToExcel(
  data: {
    entityName: string;
    seriesName: string;
    trackingData: Array<{
      exam_title: string;
      exam_date: string;
      value_added_rate: number;
      consolidation_rate: number;
      transformation_rate: number;
      contribution_rate: number;
      rank: number;
    }>;
  },
  options?: {
    fileName?: string;
  }
) {
  try {
    // 准备表格数据
    const worksheetData = [
      // 标题行
      [`${data.entityName} - ${data.seriesName}`],
      [],
      // 表头
      ["考试名称", "考试日期", "增值率", "巩固率", "转化率", "贡献率", "排名"],
      // 数据行
      ...data.trackingData.map((item) => [
        item.exam_title,
        new Date(item.exam_date).toLocaleDateString("zh-CN"),
        `${(item.value_added_rate * 100).toFixed(2)}%`,
        `${(item.consolidation_rate * 100).toFixed(1)}%`,
        `${(item.transformation_rate * 100).toFixed(1)}%`,
        `${(item.contribution_rate * 100).toFixed(2)}%`,
        item.rank,
      ]),
    ];

    // 创建工作簿
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "历次追踪");

    // 合并标题行
    worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];

    // 设置列宽
    worksheet["!cols"] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
    ];

    // 导出文件
    const fileName =
      options?.fileName ||
      `历次追踪_${data.entityName}_${new Date().toLocaleDateString()}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error("导出历次追踪报告失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "导出失败",
    };
  }
}

/**
 * 批量导出所有报告
 */
export async function exportAllReports(params: {
  classData?: ClassValueAdded[];
  teacherData?: TeacherValueAdded[];
  studentData?: StudentValueAdded[];
  subjectBalanceData?: SubjectBalanceAnalysis[];
  subject?: string;
}) {
  const results = {
    success: [] as string[],
    failed: [] as string[],
  };

  try {
    // 导出班级报告
    if (params.classData && params.classData.length > 0) {
      const result = exportClassReportToExcel(params.classData, {
        subject: params.subject || "全科",
      });
      if (result.success) {
        results.success.push("班级增值报告");
      } else {
        results.failed.push("班级增值报告");
      }
    }

    // 导出教师报告
    if (params.teacherData && params.teacherData.length > 0) {
      const result = exportTeacherReportToExcel(params.teacherData, {
        subject: params.subject || "全科",
      });
      if (result.success) {
        results.success.push("教师增值报告");
      } else {
        results.failed.push("教师增值报告");
      }
    }

    // 导出学生报告
    if (params.studentData && params.studentData.length > 0) {
      const result = exportStudentReportToExcel(params.studentData);
      if (result.success) {
        results.success.push("学生增值报告");
      } else {
        results.failed.push("学生增值报告");
      }
    }

    // 导出学科均衡报告
    if (params.subjectBalanceData && params.subjectBalanceData.length > 0) {
      const result = exportSubjectBalanceReportToExcel(
        params.subjectBalanceData
      );
      if (result.success) {
        results.success.push("学科均衡报告");
      } else {
        results.failed.push("学科均衡报告");
      }
    }

    return {
      success: results.failed.length === 0,
      results,
    };
  } catch (error) {
    console.error("批量导出失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "批量导出失败",
    };
  }
}
