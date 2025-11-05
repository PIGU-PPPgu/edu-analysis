// 测试多级表头解析功能
// 模拟用户提供的场景: 第1行是科目(合并单元格), 第2行是具体指标

const testData = {
  multiLevelExample: [
    // 第1行: 科目标题 (模拟合并单元格)
    ["姓名", "学号", "班级", "语文", "", "", "", "数学", "", "", "", "英语", "", "", ""],

    // 第2行: 具体指标
    ["", "", "", "分数", "等级", "校排", "级排", "分数", "等级", "校排", "级排", "分数", "等级", "校排", "级排"],

    // 第3行开始: 实际数据
    ["张三", "2024001", "高一(1)班", 95, "A", 5, 12, 88, "B", 15, 28, 92, "A", 8, 18],
    ["李四", "2024002", "高一(1)班", 87, "B", 12, 25, 95, "A", 3, 8, 89, "B", 12, 22],
    ["王五", "2024003", "高一(2)班", 92, "A", 8, 18, 91, "A", 8, 16, 85, "B", 18, 35]
  ],

  expectedHeaders: [
    "姓名",
    "学号",
    "班级",
    "语文分数",
    "语文等级",
    "语文校排",
    "语文级排",
    "数学分数",
    "数学等级",
    "数学校排",
    "数学级排",
    "英语分数",
    "英语等级",
    "英语校排",
    "英语级排"
  ],

  expectedDataStartRow: 2 // 数据从第3行开始(索引为2)
};

// 模拟intelligentFileParser的检测逻辑
function detectMultiLevelHeaders(jsonData) {
  if (jsonData.length < 2) {
    const headers = jsonData[0]?.filter(h => h !== "") || [];
    return { headers, dataStartRow: 1 };
  }

  const row1 = jsonData[0] || [];
  const row2 = jsonData[1] || [];

  // 检测第2行是否包含子字段关键词
  const row2Keywords = ["分数", "成绩", "得分", "等级", "评级", "排名", "班排", "级排", "校排"];
  const hasRow2Keywords = row2.some(cell =>
    row2Keywords.some(keyword => String(cell || "").includes(keyword))
  );

  // 检测第1行是否有空白单元格但第2行有值
  const row1HasBlanks = row1.some((cell, index) => !cell && row2[index]);

  const isMultiLevel = hasRow2Keywords || row1HasBlanks;

  if (!isMultiLevel) {
    const headers = row1.filter(h => h !== "");
    console.log(`✅ 单级表头: ${headers.length}个字段`);
    return { headers, dataStartRow: 1 };
  }

  // 多级表头合并
  console.log(`🔍 检测到多级表头,开始合并...`);
  const mergedHeaders = [];
  let currentParent = "";

  const basicFields = ["姓名", "学号", "班级", "name", "id", "class"];

  for (let colIndex = 0; colIndex < Math.max(row1.length, row2.length); colIndex++) {
    const parentCell = String(row1[colIndex] || "").trim();
    const childCell = String(row2[colIndex] || "").trim();

    if (parentCell) {
      currentParent = parentCell;
    }

    if (childCell) {
      const isBasic = basicFields.some(field =>
        childCell.toLowerCase().includes(field.toLowerCase())
      );

      if (currentParent && !isBasic) {
        mergedHeaders.push(`${currentParent}${childCell}`);
      } else {
        mergedHeaders.push(childCell);
      }
    } else if (parentCell) {
      mergedHeaders.push(parentCell);
    }
  }

  const filteredHeaders = mergedHeaders.filter(h => h !== "");
  console.log(`✅ 合并后表头 (${filteredHeaders.length}个):`, filteredHeaders);

  return { headers: filteredHeaders, dataStartRow: 2 };
}

// 执行测试
console.log("📊 多级表头解析功能测试\n");

console.log("==== 测试场景 ====");
console.log("第1行 (父级):", testData.multiLevelExample[0]);
console.log("第2行 (子级):", testData.multiLevelExample[1]);
console.log("第3行 (数据):", testData.multiLevelExample[2]);
console.log("");

const result = detectMultiLevelHeaders(testData.multiLevelExample);

console.log("\n==== 测试结果 ====");
console.log("解析的表头:", result.headers);
console.log("数据起始行:", result.dataStartRow);
console.log("");

// 验证结果
const headersMatch = JSON.stringify(result.headers) === JSON.stringify(testData.expectedHeaders);
const dataRowMatch = result.dataStartRow === testData.expectedDataStartRow;

console.log("==== 验证 ====");
console.log(`表头是否正确: ${headersMatch ? "✅ 通过" : "❌ 失败"}`);
console.log(`数据起始行是否正确: ${dataRowMatch ? "✅ 通过" : "❌ 失败"}`);

if (!headersMatch) {
  console.log("\n❌ 期望的表头:", testData.expectedHeaders);
  console.log("❌ 实际的表头:", result.headers);

  // 详细对比
  console.log("\n差异分析:");
  testData.expectedHeaders.forEach((expected, index) => {
    const actual = result.headers[index];
    if (expected !== actual) {
      console.log(`  位置${index}: 期望"${expected}", 实际"${actual}"`);
    }
  });
}

console.log("\n==== 数据解析测试 ====");
const parsedData = testData.multiLevelExample.slice(result.dataStartRow).map(row => {
  const obj = {};
  result.headers.forEach((header, index) => {
    obj[header] = row[index];
  });
  return obj;
});

console.log("解析的数据对象:");
parsedData.forEach((student, index) => {
  console.log(`\n学生${index + 1}:`, student);
});

console.log("\n==== 关键字段验证 ====");
const student1 = parsedData[0];
console.log(`✅ 姓名: ${student1["姓名"]}`);
console.log(`✅ 语文分数: ${student1["语文分数"]}`);
console.log(`✅ 语文等级: ${student1["语文等级"]}`);
console.log(`✅ 数学分数: ${student1["数学分数"]}`);
console.log(`✅ 英语校排: ${student1["英语校排"]}`);