/**
 * ExamStatsTab — 数据分析 Tab
 * 纯展示组件，所有数据通过 props 传入，无内部 state
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Users,
  BarChart3,
  CheckCircle,
  Activity,
  Clock,
  TrendingUp,
  PieChart,
  Brain,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import type {
  UIExam as Exam,
  UIExamType as ExamType,
  UIExamStatistics as ExamStatistics,
} from "../hooks/useExamData";

interface ExamStatsTabProps {
  statistics: ExamStatistics;
  examTypes: ExamType[];
  exams: Exam[];
}

const ExamStatsTab: React.FC<ExamStatsTabProps> = ({
  statistics,
  examTypes,
  exams,
}) => {
  return (
    <div className="space-y-6">
      {/* 考试统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  考试数量分布
                </p>
                <p className="text-2xl font-bold">{statistics.total}</p>
                <p className="text-xs text-blue-600 flex items-center mt-1">
                  <Activity className="h-3 w-3 mr-1" />
                  活跃考试管理
                </p>
              </div>
              <Calendar className="h-8 w-8 text-[#B9FF66]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">平均参与率</p>
                <p className="text-2xl font-bold">
                  {statistics.averageParticipation.toFixed(1)}%
                </p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <Users className="h-3 w-3 mr-1" />
                  学生参与度高
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">平均成绩</p>
                <p className="text-2xl font-bold">
                  {statistics.averageScore.toFixed(1)}
                </p>
                <p className="text-xs text-purple-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  整体表现良好
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">改进率</p>
                <p className="text-2xl font-bold">
                  +{statistics.improvementRate.toFixed(1)}%
                </p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  持续提升
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 考试类型分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-[#B9FF66]" />
              考试类型分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {examTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{type.emoji}</span>
                    <span className="font-medium">{type.name}</span>
                  </div>
                  <Badge variant="outline">
                    {exams.filter((e) => e.type === type.name).length} 个
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              考试状态分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">即将开始</span>
                </div>
                <Badge className="bg-blue-100 text-blue-800">
                  {statistics.upcoming} 个
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">进行中</span>
                </div>
                <Badge className="bg-orange-100 text-orange-800">
                  {statistics.ongoing} 个
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">已完成</span>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  {statistics.completed} 个
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 数据洞察 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            数据洞察与建议
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h4 className="font-medium text-green-800">优势表现</h4>
              </div>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• 考试参与率保持在高水平</li>
                <li>• 学生整体成绩呈上升趋势</li>
                <li>• 考试安排合理，时间分布均匀</li>
              </ul>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <h4 className="font-medium text-orange-800">关注点</h4>
              </div>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• 部分考试类型分布不均</li>
                <li>• 需要增加形成性评估</li>
                <li>• 考试难度需要进一步调整</li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-blue-800">改进建议</h4>
              </div>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 增加小测频次，及时反馈</li>
                <li>• 优化考试时间安排</li>
                <li>• 建立考试数据档案系统</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExamStatsTab;
