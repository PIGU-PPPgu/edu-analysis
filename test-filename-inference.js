// 测试文件名智能推断功能
function inferExamInfoFromFileName(fileName) {
  const nameWithoutExt = fileName.replace(/\.(xlsx?|csv)$/i, "");

  // 考试类型关键词匹配
  const typeMap = {
    "期中": "期中考试",
    "期末": "期末考试",
    "月考": "月考",
    "周测": "周测",
    "单元测": "单元测试",
    "模拟": "模拟考试",
    "诊断": "诊断考试",
    "摸底": "摸底考试",
  };

  let detectedType = "月考"; // 默认
  for (const [keyword, type] of Object.entries(typeMap)) {
    if (nameWithoutExt.includes(keyword)) {
      detectedType = type;
      break;
    }
  }

  // 提取日期 (YYYY-MM-DD, YYYY.MM.DD, YYYYMMDD格式)
  const datePatterns = [
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
    /(\d{4})\.(\d{1,2})\.(\d{1,2})/,
    /(\d{4})(\d{2})(\d{2})/,
  ];

  let detectedDate = new Date().toISOString().split("T")[0];
  for (const pattern of datePatterns) {
    const match = nameWithoutExt.match(pattern);
    if (match) {
      const [_, year, month, day] = match;
      detectedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      break;
    }
  }

  // 生成考试标题 (使用完整文件名,去掉扩展名和日期)
  let title = nameWithoutExt
    .replace(/\d{4}[-.]?\d{2}[-.]?\d{2}/g, "") // 移除日期
    .replace(/\s+/g, " ") // 合并多余空格
    .trim();

  // 如果标题为空,使用考试类型作为标题
  if (!title || title.length < 2) {
    title = `${detectedType}成绩`;
  }

  return {
    title,
    type: detectedType,
    date: detectedDate,
  };
}

// 测试用例
const testCases = [
  "高一(1)班期中考试成绩.xlsx",
  "2024-12-15期末考试数据.csv",
  "20241215月考成绩.xlsx",
  "高二数学月考2024.12.15.xlsx",
  "模拟考试-高三理科班.xlsx",
  "高一诊断测试.csv",
  "周测成绩单.xlsx",
  "成绩数据.xlsx", // 无明显信息
];

console.log("📊 文件名智能推断测试结果:\n");
testCases.forEach((fileName, index) => {
  const result = inferExamInfoFromFileName(fileName);
  console.log(`${index + 1}. 文件名: ${fileName}`);
  console.log(`   标题: ${result.title}`);
  console.log(`   类型: ${result.type}`);
  console.log(`   日期: ${result.date}`);
  console.log("");
});