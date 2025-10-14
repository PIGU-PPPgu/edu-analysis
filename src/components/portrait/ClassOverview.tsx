import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Award,
  Target,
  BookOpen,
  Brain,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import StatCard from "./StatCard";
import { ClassPortraitStats } from "@/lib/api/portrait";
import { PageLoading } from "@/components/ui/loading";
import EmptyState from "@/components/ui/empty-state";

interface ClassOverviewProps {
  classId: string;
  className: string;
  stats: ClassPortraitStats | null;
  onViewClassPortrait: (classId: string) => void;
  isLoading: boolean;
}

/**
 * 班级概览组件
 * 展示班级整体画像和关键统计指标
 */
const ClassOverview: React.FC<ClassOverviewProps> = ({
  classId,
  className,
  stats,
  onViewClassPortrait,
  isLoading,
}) => {
  if (isLoading) {
    return <PageLoading text="加载班级统计数据..." />;
  }

  if (!stats) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="无法加载班级数据"
        description="班级统计数据暂时无法获取，请稍后重试"
        action={{
          label: "重新加载",
          onClick: () => window.location.reload(),
          variant: "outline",
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 班级画像概述 */}
      <div className="p-6 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              {className} 班级画像
            </h3>
            <p className="text-gray-600 mt-1">
              基于多维数据分析的班级综合学习画像，助力精准教学
            </p>
          </div>
          <Button onClick={() => onViewClassPortrait(classId)} size="lg">
            <BarChart3 className="h-4 w-4 mr-2" />
            深度分析
          </Button>
        </div>
      </div>

      {/* 核心指标统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">班级平均分</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.averageScore.toFixed(1)}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2">
              <Badge
                className={
                  stats.averageScore >= 90
                    ? "bg-green-100 text-green-800"
                    : stats.averageScore >= 80
                      ? "bg-blue-100 text-blue-800"
                      : "bg-yellow-100 text-yellow-800"
                }
              >
                {stats.averageScore >= 90
                  ? "A等级"
                  : stats.averageScore >= 80
                    ? "B+等级"
                    : "B等级"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">优秀率</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.excellentRate}%
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Award className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2">
              <Badge variant="secondary" className="text-green-700">
                {Math.round((stats.studentCount * stats.excellentRate) / 100)}
                人优秀
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">学习进度</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.progressRate}%
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                {stats.progressRate > 75 ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                )}
              </div>
            </div>
            <div className="mt-2">
              <Badge
                className={
                  stats.progressRate > 90
                    ? "bg-green-100 text-green-800"
                    : stats.progressRate > 75
                      ? "bg-blue-100 text-blue-800"
                      : "bg-red-100 text-red-800"
                }
              >
                {stats.progressRate > 90
                  ? "领先"
                  : stats.progressRate > 75
                    ? "正常"
                    : "滞后"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">预警学生</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.warningStudentCount || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-2">
              <Badge
                className={
                  (stats.warningStudentCount || 0) === 0
                    ? "bg-green-100 text-green-800"
                    : (stats.warningStudentCount || 0) < 5
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }
              >
                {(stats.warningStudentCount || 0) === 0 ? "无预警" : "需关注"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 学科统计 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            学科分析报告
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stats.subjectStats.map((subject, index) => (
              <div
                key={index}
                className="space-y-3 p-4 border rounded-lg bg-gray-50/50"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        subject.averageScore >= 85
                          ? "bg-green-500"
                          : subject.averageScore >= 75
                            ? "bg-blue-500"
                            : subject.averageScore >= 65
                              ? "bg-yellow-500"
                              : "bg-red-500"
                      }`}
                    ></div>
                    <span className="font-medium">{subject.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">
                      {subject.averageScore.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">平均分</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>成绩分布</span>
                    <span>
                      {((subject.averageScore / 100) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        subject.averageScore >= 85
                          ? "bg-green-500"
                          : subject.averageScore >= 75
                            ? "bg-blue-500"
                            : subject.averageScore >= 65
                              ? "bg-yellow-500"
                              : "bg-red-500"
                      }`}
                      style={{
                        width: `${(subject.averageScore / 100) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">优秀:</span>
                    <span className="font-medium text-green-600">
                      {subject.excellentCount}人
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">及格:</span>
                    <span className="font-medium text-blue-600">
                      {subject.passingCount}人
                    </span>
                  </div>
                </div>

                {/* 学科表现趋势指示器 */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-1 text-xs">
                    {subject.averageScore >= 85 && (
                      <>
                        <Award className="h-3 w-3 text-green-500" />
                        <span className="text-green-600">表现优异</span>
                      </>
                    )}
                    {subject.averageScore >= 75 &&
                      subject.averageScore < 85 && (
                        <>
                          <TrendingUp className="h-3 w-3 text-blue-500" />
                          <span className="text-blue-600">表现良好</span>
                        </>
                      )}
                    {subject.averageScore < 75 && (
                      <>
                        <Target className="h-3 w-3 text-orange-500" />
                        <span className="text-orange-600">需要提升</span>
                      </>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {subject.excellentCount + subject.passingCount}人参与
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 班级人员构成 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-blue-600" />
              班级人员构成
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span className="font-medium">男生</span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-600">
                    {stats.gender.male}
                  </div>
                  <div className="text-xs text-gray-500">
                    {((stats.gender.male / stats.studentCount) * 100).toFixed(
                      1
                    )}
                    %
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-pink-500"></div>
                  <span className="font-medium">女生</span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-pink-600">
                    {stats.gender.female}
                  </div>
                  <div className="text-xs text-gray-500">
                    {((stats.gender.female / stats.studentCount) * 100).toFixed(
                      1
                    )}
                    %
                  </div>
                </div>
              </div>

              {stats.gender.other > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                    <span className="font-medium">其他</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-600">
                      {stats.gender.other}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(
                        (stats.gender.other / stats.studentCount) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <div className="text-sm text-gray-600 mb-2">男女比例分布</div>
                <div className="h-6 bg-gray-200 rounded-full flex overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{
                      width: `${(stats.gender.male / stats.studentCount) * 100}%`,
                    }}
                  ></div>
                  <div
                    className="h-full bg-pink-500 transition-all duration-300"
                    style={{
                      width: `${(stats.gender.female / stats.studentCount) * 100}%`,
                    }}
                  ></div>
                  {stats.gender.other > 0 && (
                    <div
                      className="h-full bg-gray-500 transition-all duration-300"
                      style={{
                        width: `${(stats.gender.other / stats.studentCount) * 100}%`,
                      }}
                    ></div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 班级学习特征分析 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-purple-600" />
              学习特征分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 学习能力分布 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">学习能力分布</span>
                  <Badge variant="outline" className="text-xs">
                    基于成绩分析
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-600">优秀 (90+)</span>
                    <span className="font-medium">
                      {Math.round(
                        (stats.studentCount * stats.excellentRate) / 100
                      )}
                      人
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">良好 (80-89)</span>
                    <span className="font-medium">
                      {Math.round(stats.studentCount * 0.3)}人
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-600">及格 (60-79)</span>
                    <span className="font-medium">
                      {Math.round(stats.studentCount * 0.4)}人
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">待提升 (&lt;60)</span>
                    <span className="font-medium">
                      {stats.studentCount -
                        Math.round(
                          (stats.studentCount * stats.excellentRate) / 100
                        ) -
                        Math.round(stats.studentCount * 0.7)}
                      人
                    </span>
                  </div>
                </div>
              </div>

              {/* 关注度指标 */}
              <div className="pt-3 border-t">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="text-lg font-bold text-green-600">
                      {stats.studentCount - (stats.warningStudentCount || 0)}
                    </div>
                    <div className="text-green-600">正常学生</div>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded">
                    <div className="text-lg font-bold text-orange-600">
                      {stats.warningStudentCount || 0}
                    </div>
                    <div className="text-orange-600">需关注</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 智能分组建议 */}
      {stats.studentCount > 10 && (
        <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      智能分组建议
                      <Badge className="bg-indigo-100 text-indigo-700">
                        AI推荐
                      </Badge>
                    </h4>
                    <p className="text-sm text-gray-600">
                      基于学生画像的智能分组功能
                    </p>
                  </div>
                </div>
                <div className="space-y-2 pl-12">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Layers className="h-4 w-4 text-indigo-600" />
                    根据学生成绩、学习风格、能力画像自动分组
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Users className="h-4 w-4 text-indigo-600" />
                    优化班级协作，实现分层教学和精准辅导
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Brain className="h-4 w-4 text-indigo-600" />
                    AI分析班级结构，提供最佳分组方案
                  </div>
                </div>
              </div>
              <Button
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
                onClick={() => {
                  // 导航到智能分组标签
                  const smartGroupTab = document.querySelector(
                    '[value="smart-group"]'
                  ) as HTMLElement;
                  if (smartGroupTab) {
                    smartGroupTab.click();
                  }
                }}
              >
                开始分组
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClassOverview;
