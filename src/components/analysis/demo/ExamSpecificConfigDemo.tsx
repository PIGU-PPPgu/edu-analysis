import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExamSpecificSubjectSettings } from "@/components/analysis/settings/ExamSpecificSubjectSettings";
import { examSpecificPassRateCalculator } from "@/services/examSpecificPassRateCalculator";
import { Settings, Play, RotateCcw, CheckCircle, XCircle } from "lucide-react";

export const ExamSpecificConfigDemo: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [demoResults, setDemoResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // 演示数据：同样的语文成绩在不同考试中的表现
  const demoScores = [85, 92, 78, 96, 88, 75, 90, 82, 94, 76];

  // 创建演示考试配置
  const setupDemoExams = () => {
    setIsRunning(true);

    // 期中考试：语文100分满分
    examSpecificPassRateCalculator.setExamConfig("demo_midterm", "期中考试", [
      {
        name: "语文",
        displayName: "语文",
        maxScore: 100,
        passScore: 60,
        excellentScore: 85,
        isCustom: false,
      },
    ]);

    // 期末考试：语文120分满分
    examSpecificPassRateCalculator.setExamConfig("demo_final", "期末考试", [
      {
        name: "语文",
        displayName: "语文",
        maxScore: 120,
        passScore: 72,
        excellentScore: 102,
        isCustom: false,
      },
    ]);

    // 月考：语文80分满分
    examSpecificPassRateCalculator.setExamConfig("demo_monthly", "月考", [
      {
        name: "语文",
        displayName: "语文",
        maxScore: 80,
        passScore: 48,
        excellentScore: 68,
        isCustom: false,
      },
    ]);

    // 计算各考试的结果
    const results = [
      {
        examId: "demo_midterm",
        examName: "期中考试",
        maxScore: 100,
        passScore: 60,
        excellentScore: 85,
        passRate: examSpecificPassRateCalculator.calculatePassRate(
          demoScores,
          "语文",
          "demo_midterm"
        ),
        excellentRate: examSpecificPassRateCalculator.calculateExcellentRate(
          demoScores,
          "语文",
          "demo_midterm"
        ),
        results: demoScores.map((score) => ({
          score,
          isPass: examSpecificPassRateCalculator.isPass(
            score,
            "语文",
            "demo_midterm"
          ),
          isExcellent: examSpecificPassRateCalculator.isExcellent(
            score,
            "语文",
            "demo_midterm"
          ),
          level: examSpecificPassRateCalculator.getGradeLevel(
            score,
            "语文",
            "demo_midterm"
          ),
        })),
      },
      {
        examId: "demo_final",
        examName: "期末考试",
        maxScore: 120,
        passScore: 72,
        excellentScore: 102,
        passRate: examSpecificPassRateCalculator.calculatePassRate(
          demoScores,
          "语文",
          "demo_final"
        ),
        excellentRate: examSpecificPassRateCalculator.calculateExcellentRate(
          demoScores,
          "语文",
          "demo_final"
        ),
        results: demoScores.map((score) => ({
          score,
          isPass: examSpecificPassRateCalculator.isPass(
            score,
            "语文",
            "demo_final"
          ),
          isExcellent: examSpecificPassRateCalculator.isExcellent(
            score,
            "语文",
            "demo_final"
          ),
          level: examSpecificPassRateCalculator.getGradeLevel(
            score,
            "语文",
            "demo_final"
          ),
        })),
      },
      {
        examId: "demo_monthly",
        examName: "月考",
        maxScore: 80,
        passScore: 48,
        excellentScore: 68,
        passRate: examSpecificPassRateCalculator.calculatePassRate(
          demoScores,
          "语文",
          "demo_monthly"
        ),
        excellentRate: examSpecificPassRateCalculator.calculateExcellentRate(
          demoScores,
          "语文",
          "demo_monthly"
        ),
        results: demoScores.map((score) => ({
          score,
          isPass: examSpecificPassRateCalculator.isPass(
            score,
            "语文",
            "demo_monthly"
          ),
          isExcellent: examSpecificPassRateCalculator.isExcellent(
            score,
            "语文",
            "demo_monthly"
          ),
          level: examSpecificPassRateCalculator.getGradeLevel(
            score,
            "语文",
            "demo_monthly"
          ),
        })),
      },
    ];

    setDemoResults(results);
    setIsRunning(false);
  };

  const resetDemo = () => {
    // 清除演示配置
    examSpecificPassRateCalculator.deleteExamConfig("demo_midterm");
    examSpecificPassRateCalculator.deleteExamConfig("demo_final");
    examSpecificPassRateCalculator.deleteExamConfig("demo_monthly");
    setDemoResults([]);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <CardTitle className="text-xl font-black text-[#191A23] flex items-center gap-2">
            <Settings className="w-6 h-6" />
            考试特定配置演示
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <p className="text-gray-600 leading-relaxed">
              此演示展示如何为不同考试设置不同的科目满分，以及同样的分数在不同配置下的评判结果。
            </p>

            <div className="flex gap-4">
              <Button
                onClick={setupDemoExams}
                disabled={isRunning}
                className="flex items-center gap-2 border-2 border-black bg-[#B9FF66] hover:bg-[#B9FF66] text-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
              >
                <Play className="w-4 h-4" />
                {isRunning ? "设置中..." : "运行演示"}
              </Button>

              <Button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 border-2 border-black bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
              >
                <Settings className="w-4 h-4" />
                打开设置
              </Button>

              {demoResults.length > 0 && (
                <Button
                  onClick={resetDemo}
                  variant="outline"
                  className="flex items-center gap-2 border-2 border-black font-bold hover:bg-gray-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  重置演示
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 演示结果 */}
      {demoResults.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-[#191A23]">演示结果对比</h3>

          {/* 概览对比 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {demoResults.map((result) => (
              <Card
                key={result.examId}
                className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#6B7280]"
              >
                <CardHeader className="bg-blue-100 border-b-2 border-black">
                  <CardTitle className="text-lg font-bold text-[#191A23]">
                    {result.examName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">满分：</span>
                      <span className="font-bold">{result.maxScore}分</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">及格线：</span>
                      <span className="font-bold text-green-600">
                        {result.passScore}分
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">优秀线：</span>
                      <span className="font-bold text-blue-600">
                        {result.excellentScore}分
                      </span>
                    </div>
                    <hr className="border-gray-200" />
                    <div className="flex justify-between">
                      <span className="text-gray-600">及格率：</span>
                      <span className="font-bold text-green-600">
                        {result.passRate}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">优秀率：</span>
                      <span className="font-bold text-blue-600">
                        {result.excellentRate}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 详细分数对比 */}
          <Card className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#6B7280]">
            <CardHeader className="bg-gray-100 border-b-2 border-black">
              <CardTitle className="text-lg font-bold text-[#191A23]">
                同样分数在不同考试中的评判结果
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border-2 border-black p-3 font-bold text-left">
                        分数
                      </th>
                      {demoResults.map((result) => (
                        <th
                          key={result.examId}
                          className="border-2 border-black p-3 font-bold text-center"
                        >
                          {result.examName}
                          <br />
                          <small className="text-gray-600">
                            满分{result.maxScore}
                          </small>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {demoScores.map((score, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border-2 border-black p-3 font-bold text-center bg-blue-50">
                          {score}分
                        </td>
                        {demoResults.map((result) => {
                          const scoreResult = result.results[index];
                          return (
                            <td
                              key={result.examId}
                              className="border-2 border-black p-3 text-center"
                            >
                              <div className="space-y-1">
                                <Badge
                                  variant={
                                    scoreResult.isExcellent
                                      ? "default"
                                      : scoreResult.isPass
                                        ? "secondary"
                                        : "destructive"
                                  }
                                  className="font-bold"
                                >
                                  {scoreResult.level}
                                </Badge>
                                <div className="flex justify-center gap-2">
                                  {scoreResult.isPass ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-500" />
                                  )}
                                  {scoreResult.isExcellent && (
                                    <span className="text-blue-500 font-bold">
                                      ★
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                <h4 className="font-bold text-yellow-800 mb-2">
                  💡 观察要点：
                </h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>
                    •
                    同样85分的语文成绩，在100分制的期中考试中是"优秀"，但在120分制的期末考试中只是"及格"
                  </li>
                  <li>
                    • 75分在80分制的月考中是"及格"，但在100分制中可能是"不及格"
                  </li>
                  <li>
                    •
                    这说明考试特定配置能更准确地反映学生在不同评分标准下的真实表现
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 设置模态框 */}
      <ExamSpecificSubjectSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={() => {
          // 重新计算演示结果
          if (demoResults.length > 0) {
            setupDemoExams();
          }
        }}
      />
    </div>
  );
};
