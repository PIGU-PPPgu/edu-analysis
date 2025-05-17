import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import HeatmapChart from "@/components/analysis/HeatmapChart";
import ClassTrendChart from "@/components/analysis/ClassTrendChart";
import ScoreBoxPlot from "@/components/analysis/ScoreBoxPlot";
import CompetencyRadar from "@/components/analysis/CompetencyRadar";

// 定义班级类型
interface ClassSummary {
  id: string;
  name: string;
  grade: string;
  averageScore?: number;
  excellentRate?: number;
  studentCount?: number;
  homeworkCount?: number;
  // 新增维度
  passRate?: number;
  knowledgeMastery?: number;
  problemSolvingAbility?: number;
  learningAttitude?: number;
  examStability?: number;
}

// 定义图表数据类型
interface BoxPlotItem {
  subject: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

interface CompetencyItem {
  name: string;
  current: number;
  average: number;
  fullScore: number;
}

interface TrendItem {
  examName: string;
  classAvg: number;
  gradeAvg: number;
}

interface HeatmapItem {
  x: string;
  y: string;
  value: number;
}

interface ComparisonTabProps {
  selectedClass: ClassSummary | null;
  allClasses: ClassSummary[];
  boxPlotData?: Record<string, BoxPlotItem[]>;
  competencyData?: Record<string, CompetencyItem[]>;
  trendData?: Record<string, TrendItem[]>;
  isLoading?: boolean;
}

const ComparisonTab: React.FC<ComparisonTabProps> = ({ 
  selectedClass, 
  allClasses, 
  boxPlotData = {},
  competencyData = {},
  trendData = {},
  isLoading = false 
}) => {
  // 如果没有选择班级或正在加载，显示加载状态
  if (!selectedClass) {
    return <div className="p-4 text-center text-gray-500">请先从上方选择一个班级以进行对比。</div>;
  }

  if (isLoading) {
    return <div className="p-4 text-center text-gray-500">正在加载数据，请稍候...</div>;
  }
  
  // 找到另一个用于比较的班级
  const classToCompare = allClasses.find(cls => cls.id !== selectedClass.id);

  // 使用useMemo优化热力图数据生成
  const heatmapData = useMemo(() => {
    const metrics = ['平均分', '优秀率', '合格率', '知识掌握', '解题能力'];
    return allClasses.filter(cls => cls && cls.name).flatMap(cls => 
      metrics.map(metric => {
        let value = 0;
        switch(metric) {
          case '平均分':
            value = cls.averageScore || 0;
            break;
          case '优秀率':
            value = cls.excellentRate || 0;
            break;
          case '合格率':
            value = cls.passRate || 0;
            break;
          case '知识掌握':
            value = cls.knowledgeMastery || 0;
            break;
          case '解题能力':
            value = cls.problemSolvingAbility || 0;
            break;
          default:
            value = 0;
        }
        
        return {
          x: metric,
          y: cls.name,
          value: value
        };
      })
    );
  }, [allClasses]);

  // 优化文本生成逻辑，使用useMemo避免重复计算
  const performanceComparisonText = useMemo(() => {
    if (!selectedClass) return "";
    
    let text = "";
    if (classToCompare) {
      text = `${selectedClass.name} 和 ${classToCompare.name} 在表现上各有千秋。`;
      
      if (selectedClass.averageScore && classToCompare.averageScore) {
        const diff = selectedClass.averageScore - classToCompare.averageScore;
        text += ` 平均分方面，${selectedClass.name} (${selectedClass.averageScore.toFixed(1)}) ${diff > 0 ? '领先' : (diff < 0 ? '落后' : '持平')} ${classToCompare.name} (${classToCompare.averageScore.toFixed(1)}) ${Math.abs(diff).toFixed(1)}分。`;
      }
      
      if (selectedClass.excellentRate && classToCompare.excellentRate) {
        const diffRate = selectedClass.excellentRate - classToCompare.excellentRate;
        text += ` 优秀率方面 (${selectedClass.excellentRate}% vs ${classToCompare.excellentRate}%)，${selectedClass.name} ${diffRate > 0 ? '更高' : (diffRate < 0 ? '更低' : '持平')}。`;
      }

      // 新增维度比较
      if (selectedClass.passRate && classToCompare.passRate) {
        const diffPass = selectedClass.passRate - classToCompare.passRate;
        text += ` 合格率差异 ${Math.abs(diffPass).toFixed(1)}%。`;
      }

      if (selectedClass.examStability && classToCompare.examStability) {
        text += ` 在考试稳定性方面，${selectedClass.name}${selectedClass.examStability > classToCompare.examStability ? '表现更稳定' : '稍显波动'}。`;
      }
    } else {
      text = `${selectedClass.name} 的详细表现如下，暂无其他班级进行直接对比。`;
    }
    
    return text;
  }, [selectedClass, classToCompare]);

  const teachingSuggestionText = useMemo(() => {
    if (!selectedClass) return "";
    
    let text = `针对 ${selectedClass.name} 的情况，建议关注其${selectedClass.averageScore && selectedClass.averageScore < 75 ? '平均分提升' : '优势学科的持续培养'}。`;
    
    if (classToCompare) {
      text += ` 对比 ${classToCompare.name}，可以考虑借鉴其在${classToCompare.averageScore && classToCompare.averageScore > (selectedClass.averageScore || 0) ? '整体教学管理' : '特定学科'}上的经验。`;
    }
    
    // 基于新维度提供更有针对性的建议
    if (selectedClass.problemSolvingAbility && selectedClass.problemSolvingAbility < 75) {
      text += " 建议加强解题策略训练和思维方法培养，提高学生的应用能力。";
    }
    
    if (selectedClass.learningAttitude && selectedClass.learningAttitude < 80) {
      text += " 可考虑开展激励计划，培养学生的学习兴趣和自主学习能力。";
    }
    
    text += " 鼓励跨班级教学研讨，分享成功案例，共同进步。";
    return text;
  }, [selectedClass, classToCompare]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>班级关键指标热力图</CardTitle>
          <CardDescription>展示所有班级在关键指标上的表现分布。颜色越深代表数值越高。</CardDescription>
        </CardHeader>
        <CardContent>
          {heatmapData.length > 0 ? (
      <HeatmapChart 
              chartData={heatmapData}
              title="班级横向对比"
              description="当前班级与其他班级在关键指标上的表现热力图"
      />
          ) : (
            <p className="text-center text-gray-500">暂无足够数据生成热力图。</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedClass.name} {classToCompare ? `vs ${classToCompare.name}` : ""} 学生表现对比
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-md">
              {classToCompare && <h3 className="font-medium mb-2">{selectedClass.name} vs {classToCompare.name}</h3>}
              <p className="text-sm text-muted-foreground">
                {performanceComparisonText}
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
                {teachingSuggestionText}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{selectedClass.name} 学习趋势</CardTitle>
            <CardDescription>{selectedClass.name}与年级平均分对比趋势</CardDescription>
          </CardHeader>
          <CardContent>
            <ClassTrendChart 
              className={selectedClass.name} 
              mockData={trendData[selectedClass.id] || []}
            />
          </CardContent>
        </Card>
        {classToCompare && (
          <Card>
            <CardHeader>
              <CardTitle>{classToCompare.name} 学习趋势</CardTitle>
              <CardDescription>{classToCompare.name}与年级平均分对比趋势</CardDescription>
            </CardHeader>
            <CardContent>
              <ClassTrendChart 
                className={classToCompare.name} 
                mockData={trendData[classToCompare.id] || []}
              />
            </CardContent>
          </Card>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{selectedClass.name} 成绩分布</CardTitle>
            <CardDescription>展示各学科成绩的分布情况，包括中位数、四分位数和异常值。</CardDescription>
          </CardHeader>
          <CardContent>
        <ScoreBoxPlot 
              data={boxPlotData[selectedClass.id] || []}
              title={`${selectedClass.name} 成绩分布`}
            />
          </CardContent>
        </Card>
        {classToCompare && (
          <Card>
            <CardHeader>
              <CardTitle>{classToCompare.name} 成绩分布</CardTitle>
              <CardDescription>展示各学科成绩的分布情况，包括中位数、四分位数和异常值。</CardDescription>
            </CardHeader>
            <CardContent>
        <ScoreBoxPlot 
                data={boxPlotData[classToCompare.id] || []}
                title={`${classToCompare.name} 成绩分布`}
        />
            </CardContent>
          </Card>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{selectedClass.name} 能力维度</CardTitle>
            <CardDescription>班级在多个核心能力维度上的表现评估。</CardDescription>
          </CardHeader>
          <CardContent>
        <CompetencyRadar 
              data={competencyData[selectedClass.id] || []}
              title={`${selectedClass.name} 能力维度`}
          description="班级多维度能力评估"
        />
          </CardContent>
        </Card>
        {classToCompare && (
          <Card>
            <CardHeader>
              <CardTitle>{classToCompare.name} 能力维度</CardTitle>
              <CardDescription>班级在多个核心能力维度上的表现评估。</CardDescription>
            </CardHeader>
            <CardContent>
        <CompetencyRadar 
                data={competencyData[classToCompare.id] || []}
                title={`${classToCompare.name} 能力维度`}
          description="班级多维度能力评估"
        />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ComparisonTab;
