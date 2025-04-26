import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import GradeDistributionChart from "./GradeDistributionChart";
import GradeTrendChart from "./GradeTrendChart";
import HomeworkQualityChart from "./HomeworkQualityChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HomeworkAnalysisDashboardProps {
  className?: string;
}

export default function HomeworkAnalysisDashboard({ className }: HomeworkAnalysisDashboardProps) {
  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>作业分析概览</CardTitle>
            <CardDescription>全面了解学生作业完成情况与质量状况</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              通过下方图表，您可以查看作业提交的分数分布、各次作业的成绩趋势以及质量评估分析，
              这些数据将帮助您更好地了解学生学习状况，并针对性地调整教学策略。
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 pt-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-1 lg:col-span-1">
          <GradeDistributionChart />
        </div>
        <div className="md:col-span-1 lg:col-span-1">
          <GradeTrendChart />
        </div>
        <div className="md:col-span-2 lg:col-span-1">
          <HomeworkQualityChart />
        </div>
      </div>

      <div className="pt-6">
        <Card>
          <CardHeader>
            <CardTitle>详细分析</CardTitle>
            <CardDescription>按不同维度查看更多详细分析</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="grade">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="grade">成绩分析</TabsTrigger>
                <TabsTrigger value="submission">提交分析</TabsTrigger>
                <TabsTrigger value="feedback">反馈分析</TabsTrigger>
              </TabsList>
              <TabsContent value="grade" className="pt-4">
                <p className="text-sm text-muted-foreground">
                  成绩分析展示各次作业的分数分布情况，帮助教师了解学生整体掌握水平。
                  通过分析优秀、良好、及格和不及格的比例，可以针对性地调整教学难度和重点。
                </p>
              </TabsContent>
              <TabsContent value="submission" className="pt-4">
                <p className="text-sm text-muted-foreground">
                  提交分析展示作业的提交时间分布、提交率变化趋势等信息，
                  帮助教师了解学生作业完成的积极性和及时性，并对作业截止时间进行合理规划。
                </p>
              </TabsContent>
              <TabsContent value="feedback" className="pt-4">
                <p className="text-sm text-muted-foreground">
                  反馈分析汇总学生对作业难度、内容、格式等方面的反馈信息，
                  帮助教师了解作业设计的合理性，并在后续作业中进行改进。
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 