/**
 * Excel模板生成服务
 * 提供标准Excel导入模板下载
 */

import * as XLSX from "xlsx";

/**
 * 学生信息表模板
 */
export function downloadStudentInfoTemplate() {
  const data = [
    // 字段说明
    ["必填字段", "", "✅必填", "✅必填", "✅必填", "可选"],
    // 表头
    ["学校名称", "学校代码", "学号", "姓名", "班级名称", "班级代码"],
    // 格式说明
    [
      "示例高中",
      "SH001",
      "示例：202401001",
      "示例：张三",
      "格式：高一1班（禁用括号）",
      "G1C1",
    ],
    // 示例数据
    ["示例高中", "SH001", "202401001", "张三", "高一1班", "G1C1"],
    ["示例高中", "SH001", "202401002", "李四", "高一1班", "G1C1"],
    ["示例高中", "SH001", "202401003", "王五", "高一2班", "G1C2"],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // 设置列宽
  worksheet["!cols"] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 18 },
    { wch: 12 },
    { wch: 25 },
    { wch: 12 },
  ];

  // 设置第一行为红色背景（字段说明）
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + "1";
    if (!worksheet[address]) continue;
    if (!worksheet[address].s) worksheet[address].s = {};
    worksheet[address].s = {
      fill: { fgColor: { rgb: "FFF3CD" } },
      font: { bold: true, color: { rgb: "FF0000" } },
    };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "学生信息");

  // 添加填写说明sheet
  const instructions = [
    ["📋 学生信息表填写说明"],
    [],
    ["必填字段："],
    ["  ✅ 学号 - 学生唯一标识，不能为空"],
    ["  ✅ 姓名 - 学生姓名，不能为空"],
    ["  ✅ 班级名称 - 格式必须为：高一1班、高二3班（禁用括号）"],
    [],
    ["可选字段："],
    ["  • 学校名称 - 可填写或留空"],
    ["  • 学校代码 - 可填写或留空"],
    ["  • 班级代码 - 可填写或留空"],
    [],
    ["⚠️ 注意事项："],
    ["  1. 删除前3行说明后再导入"],
    ["  2. 班级名称禁止使用括号，如 高一(1)班 ❌"],
    ["  3. 学号不能重复"],
    ["  4. 确保数据从第4行开始填写"],
  ];

  const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);
  XLSX.utils.book_append_sheet(workbook, instructionSheet, "填写说明");

  XLSX.writeFile(workbook, "学生信息表模板.xlsx");
}

/**
 * 教学编排表模板
 */
export function downloadTeachingArrangementTemplate() {
  const data = [
    // 字段说明
    [
      "可选",
      "可选",
      "✅必填",
      "可选",
      "⚠️暂不支持",
      "✅必填",
      "✅必填",
      "可选",
    ],
    // 表头
    [
      "学校名称",
      "学校代码",
      "班级名称",
      "班级代码",
      "教师工号",
      "教师姓名",
      "科目",
      "是否选课",
    ],
    // 格式说明
    [
      "示例高中",
      "SH001",
      "格式：高一1班",
      "G1C1",
      "请填教师姓名",
      "示例：张老师",
      "示例：数学",
      "是/否",
    ],
    // 示例数据
    ["示例高中", "SH001", "高一1班", "G1C1", "", "张老师", "数学", "否"],
    ["示例高中", "SH001", "高一1班", "G1C1", "", "李老师", "语文", "否"],
    ["示例高中", "SH001", "高一2班", "G1C2", "", "张老师", "数学", "否"],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet["!cols"] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 18 },
    { wch: 12 },
    { wch: 18 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "教学编排");

  // 添加填写说明
  const instructions = [
    ["📋 教学编排表填写说明"],
    [],
    ["必填字段："],
    ["  ✅ 班级名称 - 格式：高一1班、高二3班（禁用括号）"],
    ["  ✅ 教师姓名 - 教师真实姓名（系统将自动匹配教师账号）"],
    ["  ✅ 科目 - 科目名称，如：语文、数学、英语"],
    [],
    ["可选字段："],
    ["  • 学校名称/代码 - 可填写或留空"],
    ["  • 班级代码 - 可填写或留空"],
    ['  • 是否选课 - 填"是"或"否"，默认"否"'],
    [],
    ["⚠️ 重要提示："],
    ["  1. 删除前3行说明后再导入"],
    ['  2. "教师工号"字段已弃用，请在"教师姓名"列填写教师姓名'],
    ["  3. 系统会自动通过姓名匹配教师账号"],
    ["  4. 如果有同名教师，系统会提示您选择"],
    ["  5. 班级名称格式必须统一为：高一1班（无括号）"],
  ];

  const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);
  XLSX.utils.book_append_sheet(workbook, instructionSheet, "填写说明");

  XLSX.writeFile(workbook, "教学编排表模板.xlsx");
}

/**
 * 学生走班表模板（可选）
 */
export function downloadElectiveCourseTemplate() {
  const data = [
    [
      "学校名称",
      "学校代码",
      "学号",
      "姓名",
      "选课科目",
      "选课班级",
      "任课教师",
    ],
    ["示例高中", "SH001", "202401001", "张三", "物理", "物理A班", "王老师"],
    ["示例高中", "SH001", "202401002", "李四", "化学", "化学B班", "赵老师"],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet["!cols"] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "学生走班");
  XLSX.writeFile(workbook, "学生走班表模板.xlsx");
}

/**
 * 成绩表模板
 */
export function downloadGradeScoresTemplate() {
  const data = [
    [
      "学校名称",
      "学校代码",
      "学号",
      "姓名",
      "语文",
      "数学",
      "英语",
      "物理",
      "化学",
      "生物",
      "政治",
      "历史",
      "地理",
    ],
    [
      "示例高中",
      "SH001",
      "202401001",
      "张三",
      110,
      120,
      115,
      85,
      80,
      75,
      70,
      65,
      60,
    ],
    [
      "示例高中",
      "SH001",
      "202401002",
      "李四",
      105,
      125,
      120,
      90,
      85,
      80,
      75,
      70,
      65,
    ],
    [
      "示例高中",
      "SH001",
      "202401003",
      "王五",
      "Q",
      95,
      100,
      "N",
      70,
      65,
      60,
      55,
      50,
    ],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet["!cols"] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
  ];

  // 添加说明
  const instructions = [
    [],
    ["说明:"],
    ["1. 成绩填数字，如：120"],
    ["2. 缺考填 Q"],
    ["3. 未选考填 N"],
    ["4. 确保学号与学生信息表一致"],
  ];

  const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "成绩数据");
  XLSX.utils.book_append_sheet(workbook, instructionSheet, "填写说明");

  XLSX.writeFile(workbook, "成绩表模板.xlsx");
}

/**
 * 一键下载所有模板
 */
export function downloadAllTemplates() {
  try {
    downloadStudentInfoTemplate();
    setTimeout(() => downloadTeachingArrangementTemplate(), 200);
    setTimeout(() => downloadElectiveCourseTemplate(), 400);
    setTimeout(() => downloadGradeScoresTemplate(), 600);

    return {
      success: true,
      message: "所有模板已下载",
    };
  } catch (error) {
    console.error("下载模板失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "下载失败",
    };
  }
}
