/**
 * ImportProcessorDataFlow使用示例
 *
 * 展示如何在实际页面中使用ImportProcessorWithDataFlow
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImportProcessorWithDataFlow } from "@/components/analysis/core/grade-importer/components";
import type {
  ExamInfo,
  ValidationResult,
  ImportResult,
} from "@/components/analysis/core/grade-importer/types";

/**
 * 示例：使用DataFlow版本的ImportProcessor
 */
const ImportProcessorDataFlowDemo: React.FC = () => {
  const [showImporter, setShowImporter] = useState(false);

  // 模拟数据
  const mockValidData = Array.from({ length: 100 }, (_, i) => ({
    student_id: `2024${String(i + 1).padStart(4, "0")}`,
    name: `学生${i + 1}`,
    class_name: `高一${(i % 10) + 1}班`,
    chinese_score: Math.floor(Math.random() * 30) + 70,
    math_score: Math.floor(Math.random() * 30) + 70,
    english_score: Math.floor(Math.random() * 30) + 70,
    total_score: 0, // 会自动计算
  })).map((student) => ({
    ...student,
    total_score: student.chinese_score + student.math_score + student.english_score,
  }));

  const mockExamInfo: ExamInfo = {
    title: "2024年第一学期期中考试",
    type: "期中考试",
    date: "2024-11-15",
    subject: "全科",
  };

  const mockValidationResult: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    stats: {
      totalRows: mockValidData.length,
      validRows: mockValidData.length,
      invalidRows: 0,
      duplicateRows: 0,
    },
  };

  const mockHeaders = [
    "student_id",
    "name",
    "class_name",
    "chinese_score",
    "math_score",
    "english_score",
    "total_score",
  ];

  const mockMapping = {
    student_id: "student_id",
    name: "name",
    class_name: "class_name",
    chinese_score: "chinese_score",
    math_score: "math_score",
    english_score: "english_score",
    total_score: "total_score",
  };

  const handleImportComplete = (result: ImportResult) => {
    console.log("[Demo] 导入完成:", result);
    alert(`导入完成!\n成功: ${result.successCount}\n失败: ${result.failCount}`);
  };

  const handleError = (error: string) => {
    console.error("[Demo] 导入错误:", error);
    alert(`导入失败: ${error}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ImportProcessor DataFlow集成示例</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm max-w-none">
            <h3>使用说明</h3>
            <p>
              这个示例展示了如何使用带DataFlow集成的ImportProcessor组件。
              相比原版，新版本提供:
            </p>
            <ul>
              <li>✓ <strong>全局状态管理</strong> - 可在任意页面查看导入进度</li>
              <li>✓ <strong>自动持久化</strong> - 刷新页面不丢失进度</li>
              <li>✓ <strong>断点续传</strong> - 支持中断后恢复</li>
              <li>✓ <strong>零侵入集成</strong> - 原ImportProcessor完全不变</li>
            </ul>

            <h4>集成步骤</h4>
            <ol>
              <li>
                将 <code>ImportProcessor</code> 替换为{" "}
                <code>ImportProcessorWithDataFlow</code>
              </li>
              <li>保持所有props不变</li>
              <li>完成! DataFlow自动激活</li>
            </ol>

            <h4>代码对比</h4>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-xs text-gray-600 mb-2">Before:</p>
              <pre className="text-xs overflow-x-auto">
{`import { ImportProcessor } from "@/components/...";

<ImportProcessor
  validData={data}
  examInfo={examInfo}
  onImportComplete={handleComplete}
  {...otherProps}
/>`}
              </pre>

              <p className="text-xs text-gray-600 mt-4 mb-2">After (只改一个名字):</p>
              <pre className="text-xs overflow-x-auto">
{`import { ImportProcessorWithDataFlow } from "@/components/...";

<ImportProcessorWithDataFlow
  validData={data}
  examInfo={examInfo}
  onImportComplete={handleComplete}
  {...otherProps}
/>`}
              </pre>
            </div>
          </div>

          <Button onClick={() => setShowImporter(!showImporter)} className="w-full">
            {showImporter ? "隐藏导入器" : "显示导入器"}
          </Button>
        </CardContent>
      </Card>

      {showImporter && (
        <ImportProcessorWithDataFlow
          validData={mockValidData}
          examInfo={mockExamInfo}
          validationResult={mockValidationResult}
          headers={mockHeaders}
          sampleData={mockValidData.slice(0, 5)}
          currentMapping={mockMapping}
          onImportComplete={handleImportComplete}
          onError={handleError}
          fileName="demo_exam_data.xlsx"
          fileSize={50 * 1024}
        />
      )}
    </div>
  );
};

export default ImportProcessorDataFlowDemo;
