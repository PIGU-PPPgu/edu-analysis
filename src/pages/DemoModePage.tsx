/**
 * Demo 模式页面
 * 一键生成和加载演示数据，用于视频录制和产品展示
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  Database,
  Users,
  BarChart3,
  AlertTriangle,
  Video,
  Copy,
  ExternalLink,
} from "lucide-react";
import {
  generateDemoData,
  exportDemoDataToJSON,
} from "@/utils/generateDemoData";
import { supabase } from "@/lib/supabase";

export default function DemoModePage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string>("");

  // 生成并上传演示数据
  const handleGenerateAndUpload = async () => {
    setLoading(true);
    setStatus("idle");
    setError("");

    try {
      // 1. 生成数据
      console.log("📊 生成演示数据...");
      const { students, gradeData, warnings, summary } = generateDemoData();

      // 2. 清理现有演示数据（可选）
      console.log("🗑️ 清理旧数据...");
      await supabase
        .from("warning_records")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("grade_data").delete().like("student_id", "2024%");
      await supabase.from("students").delete().like("student_id", "2024%");

      // 3. 插入学生数据
      console.log("👥 插入学生数据...");
      const { error: studentsError } = await supabase
        .from("students")
        .insert(students);
      if (studentsError) throw studentsError;

      // 4. 插入成绩数据（分批插入，避免超时）
      console.log("📈 插入成绩数据...");
      const batchSize = 100;
      for (let i = 0; i < gradeData.length; i += batchSize) {
        const batch = gradeData.slice(i, i + batchSize);
        const { error: gradeError } = await supabase
          .from("grade_data")
          .insert(batch);
        if (gradeError) throw gradeError;
        console.log(
          `   进度: ${Math.min(i + batchSize, gradeData.length)}/${gradeData.length}`
        );
      }

      // 5. 插入预警数据
      console.log("⚠️ 插入预警数据...");
      const { error: warningsError } = await supabase
        .from("warning_records")
        .insert(warnings as any);
      if (warningsError) throw warningsError;

      console.log("✅ 演示数据生成成功！");
      setStatus("success");
      setSummary(summary);
    } catch (err: any) {
      console.error("❌ 生成演示数据失败:", err);
      setError(err.message || "生成失败");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  // 仅生成数据（不上传）
  const handleGenerateOnly = () => {
    try {
      exportDemoDataToJSON();
      setStatus("success");
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  };

  // 复制演示账号
  const copyDemoCredentials = () => {
    const credentials = `演示账号
用户名: demo@example.com
密码: demo123456`;
    navigator.clipboard.writeText(credentials);
    alert("已复制到剪贴板");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 页面标题 */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-bold flex items-center gap-2">
                  <Video className="h-8 w-8 text-primary" />
                  Demo 模式
                </CardTitle>
                <p className="text-gray-500 mt-2">
                  一键生成演示数据，准备视频录制和产品展示
                </p>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                演示专用
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* 功能说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📋 使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  生成并上传数据
                </h3>
                <p className="text-sm text-blue-800">
                  自动生成完整的演示数据并上传到数据库。适合在线演示和视频录制。
                </p>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  仅生成数据
                </h3>
                <p className="text-sm text-green-800">
                  生成演示数据并导出为 JSON 文件。适合离线演示或备份使用。
                </p>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                注意事项
              </h3>
              <ul className="text-sm text-yellow-800 space-y-1 ml-4 list-disc">
                <li>生成并上传数据会清理所有学号以"2024"开头的现有数据</li>
                <li>建议在专用的演示环境中使用，不要在生产环境操作</li>
                <li>生成过程需要 30-60 秒，请耐心等待</li>
                <li>数据包含 3 个班级、105 名学生、315 条成绩记录</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🚀 操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={handleGenerateAndUpload}
                disabled={loading}
                size="lg"
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    生成并上传数据
                  </>
                )}
              </Button>

              <Button
                onClick={handleGenerateOnly}
                disabled={loading}
                size="lg"
                variant="outline"
                className="flex-1"
              >
                <Download className="h-5 w-5 mr-2" />
                仅生成数据
              </Button>
            </div>

            {/* 演示账号 */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">演示账号</h3>
                  <p className="text-sm text-gray-600">
                    用户名:{" "}
                    <code className="bg-gray-200 px-2 py-1 rounded">
                      demo@example.com
                    </code>
                  </p>
                  <p className="text-sm text-gray-600">
                    密码:{" "}
                    <code className="bg-gray-200 px-2 py-1 rounded">
                      demo123456
                    </code>
                  </p>
                </div>
                <Button
                  onClick={copyDemoCredentials}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  复制
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 状态反馈 */}
        {status === "success" && summary && (
          <Card className="border-2 border-green-500">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-lg text-green-900 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                数据生成成功
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white border rounded-lg text-center">
                  <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{summary.studentsCount}</p>
                  <p className="text-sm text-gray-600">学生</p>
                </div>
                <div className="p-4 bg-white border rounded-lg text-center">
                  <Database className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{summary.classesCount}</p>
                  <p className="text-sm text-gray-600">班级</p>
                </div>
                <div className="p-4 bg-white border rounded-lg text-center">
                  <BarChart3 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {summary.gradeRecordsCount}
                  </p>
                  <p className="text-sm text-gray-600">成绩记录</p>
                </div>
                <div className="p-4 bg-white border rounded-lg text-center">
                  <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{summary.warningsCount}</p>
                  <p className="text-sm text-gray-600">预警记录</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">
                  🎬 下一步：开始录制
                </h3>
                <p className="text-sm text-blue-800 mb-3">
                  数据已准备就绪！你可以访问以下页面开始录制演示视频：
                </p>
                <div className="space-y-2">
                  <a
                    href="/warning-analysis"
                    target="_blank"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    预警分析页面
                  </a>
                  <a
                    href="/class-management"
                    target="_blank"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    班级管理页面
                  </a>
                  <a
                    href="/student-management"
                    target="_blank"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    学生管理页面
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {status === "error" && (
          <Card className="border-2 border-red-500">
            <CardHeader className="bg-red-50">
              <CardTitle className="text-lg text-red-900 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                生成失败
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-red-800">{error}</p>
              <p className="text-sm text-gray-600 mt-2">
                请检查数据库连接和权限设置。
              </p>
            </CardContent>
          </Card>
        )}

        {/* 数据说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📊 生成的数据</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">学生数据</h3>
                <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                  <li>3 个班级：高一(1)班（尖子班）、高一(2)班、高一(3)班</li>
                  <li>每班 35 名学生，共 105 名</li>
                  <li>真实的中文姓名（从常见姓名库随机生成）</li>
                  <li>学号格式：2024 + 班级编号 + 学生编号</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">成绩数据</h3>
                <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                  <li>3 次考试：第一次月考、期中考试、第二次月考</li>
                  <li>
                    9
                    门科目：语文、数学、英语、物理、化学、生物、政治、历史、地理
                  </li>
                  <li>成绩符合正态分布，尖子班平均分更高</li>
                  <li>包含总分、各科成绩、等级、排名</li>
                  <li>共 315 条成绩记录（105 学生 × 3 次考试）</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">预警数据</h3>
                <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                  <li>自动检测成绩下降超过 10% 的学生</li>
                  <li>自动检测总分低于 60% 的学生</li>
                  <li>约 15-20 条预警记录</li>
                  <li>预警状态：活跃</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
