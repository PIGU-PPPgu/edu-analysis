
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import HeatmapChart from "@/components/analysis/HeatmapChart";
import ClassTrendChart from "@/components/analysis/ClassTrendChart";
import ScoreBoxPlot from "@/components/analysis/ScoreBoxPlot";
import CompetencyRadar from "@/components/analysis/CompetencyRadar";

const ComparisonTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <HeatmapChart 
        title="班级对比分析" 
        description="各班级在不同维度上的表现对比" 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>班级间学生表现对比</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-md">
              <h3 className="font-medium mb-2">高二(1)班 vs 高二(2)班</h3>
              <p className="text-sm text-muted-foreground">
                高二(1)班在语文和英语方面表现更好，团队协作能力突出；
                高二(2)班在数学和物理方面有优势，解题能力更强。
                两个班级的整体平均分相差2.5分，高二(1)班略高。
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>教学建议</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm text-muted-foreground">
                建议高二(1)班加强数学和物理教学，可以借鉴高二(2)班的教学方法；
                高二(2)班需要提升语文和英语水平，可以通过阅读训练和口语练习来改善。
                两个班级可以进行学习经验交流活动，取长补短。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ClassTrendChart className="高二(1)班" />
        <ClassTrendChart className="高二(2)班" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ScoreBoxPlot 
          title="高二(1)班 成绩分布"
          data={[
            { subject: "语文", min: 65, q1: 75, median: 82, q3: 88, max: 95 },
            { subject: "数学", min: 60, q1: 72, median: 80, q3: 85, max: 98 },
            { subject: "英语", min: 62, q1: 73, median: 81, q3: 87, max: 96 },
            { subject: "物理", min: 58, q1: 70, median: 78, q3: 84, max: 93 },
          ]}
        />
        <ScoreBoxPlot 
          title="高二(2)班 成绩分布"
          data={[
            { subject: "语文", min: 60, q1: 70, median: 79, q3: 84, max: 92 },
            { subject: "数学", min: 65, q1: 75, median: 84, q3: 89, max: 99 },
            { subject: "英语", min: 58, q1: 69, median: 77, q3: 83, max: 90 },
            { subject: "物理", min: 63, q1: 73, median: 82, q3: 88, max: 95 },
          ]}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CompetencyRadar 
          data={[
            { name: "知识理解", current: 85, average: 78, fullScore: 100 },
            { name: "应用能力", current: 76, average: 70, fullScore: 100 },
            { name: "分析能力", current: 68, average: 65, fullScore: 100 },
            { name: "创新思维", current: 72, average: 62, fullScore: 100 },
            { name: "表达能力", current: 80, average: 75, fullScore: 100 },
            { name: "合作学习", current: 88, average: 82, fullScore: 100 },
          ]}
          title="高二(1)班 能力维度"
          description="班级多维度能力评估"
        />
        <CompetencyRadar 
          data={[
            { name: "知识理解", current: 82, average: 78, fullScore: 100 },
            { name: "应用能力", current: 80, average: 70, fullScore: 100 },
            { name: "分析能力", current: 72, average: 65, fullScore: 100 },
            { name: "创新思维", current: 68, average: 62, fullScore: 100 },
            { name: "表达能力", current: 75, average: 75, fullScore: 100 },
            { name: "合作学习", current: 83, average: 82, fullScore: 100 },
          ]}
          title="高二(2)班 能力维度"
          description="班级多维度能力评估"
        />
      </div>
    </div>
  );
};

export default ComparisonTab;
