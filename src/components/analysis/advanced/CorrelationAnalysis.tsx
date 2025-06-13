import React, { useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { 
  Grid,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Download,
  BarChart3,
  Activity
} from 'lucide-react';

// ============================================================================
// 类型定义
// ============================================================================

interface GradeRecord {
  id: string;
  student_id: string;
  name: string;
  class_name?: string;
  subject?: string;
  score?: number;
  total_score?: number;
  grade?: string;
  exam_title?: string;
  exam_date?: string;
}

interface CorrelationData {
  subject1: string;
  subject2: string;
  correlation: number;
  pValue: number;
  sampleSize: number;
  significance: 'high' | 'medium' | 'low' | 'none';
}

interface SubjectPairData {
  subject1: string;
  subject2: string;
  data: Array<{
    student_id: string;
    name: string;
    score1: number;
    score2: number;
  }>;
}

interface CorrelationAnalysisProps {
  gradeData: GradeRecord[];
  title?: string;
  className?: string;
}

// ============================================================================
// 计算函数
// ============================================================================

// 计算皮尔逊相关系数
const calculatePearsonCorrelation = (x: number[], y: number[]): { correlation: number; pValue: number } => {
  if (x.length !== y.length || x.length < 3) {
    return { correlation: 0, pValue: 1 };
  }

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) {
    return { correlation: 0, pValue: 1 };
  }

  const correlation = numerator / denominator;
  
  // 简化的p值计算
  const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
  const pValue = Math.min(1, Math.max(0, 2 * (1 - Math.abs(t) / Math.sqrt(n - 2 + t * t))));

  return { correlation, pValue };
};

// 获取相关性强度等级
const getCorrelationStrength = (correlation: number, pValue: number): 'high' | 'medium' | 'low' | 'none' => {
  const absCorr = Math.abs(correlation);
  
  if (pValue > 0.05) return 'none';
  if (absCorr >= 0.7) return 'high';
  if (absCorr >= 0.4) return 'medium';
  if (absCorr >= 0.2) return 'low';
  return 'none';
};

// 计算所有科目间的相关性
const calculateCorrelationMatrix = (gradeData: GradeRecord[]): CorrelationData[] => {
  // 按科目分组数据
  const subjectData = gradeData.reduce((acc, record) => {
    if (!record.subject || !record.score || isNaN(Number(record.score))) return acc;
    
    if (!acc[record.subject]) {
      acc[record.subject] = {};
    }
    acc[record.subject][record.student_id] = Number(record.score);
    return acc;
  }, {} as Record<string, Record<string, number>>);

  const subjects = Object.keys(subjectData);
  const correlations: CorrelationData[] = [];

  // 计算每对科目的相关性
  for (let i = 0; i < subjects.length; i++) {
    for (let j = i + 1; j < subjects.length; j++) {
      const subject1 = subjects[i];
      const subject2 = subjects[j];
      
      // 找到两个科目都有成绩的学生
      const commonStudents = Object.keys(subjectData[subject1]).filter(
        studentId => studentId in subjectData[subject2]
      );

      if (commonStudents.length < 3) continue;

      const scores1 = commonStudents.map(studentId => subjectData[subject1][studentId]);
      const scores2 = commonStudents.map(studentId => subjectData[subject2][studentId]);

      const { correlation, pValue } = calculatePearsonCorrelation(scores1, scores2);
      const significance = getCorrelationStrength(correlation, pValue);

      correlations.push({
        subject1,
        subject2,
        correlation,
        pValue,
        sampleSize: commonStudents.length,
        significance
      });
    }
  }

  return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
};

// 准备热力图数据
const prepareHeatmapData = (correlations: CorrelationData[]) => {
  const subjects = Array.from(new Set([
    ...correlations.map(c => c.subject1),
    ...correlations.map(c => c.subject2)
  ]));

  const matrix: Array<{ id: string; data: Array<{ x: string; y: number }> }> = [];

  subjects.forEach(subject1 => {
    const row = {
      id: subject1,
      data: subjects.map(subject2 => {
        if (subject1 === subject2) {
          return { x: subject2, y: 1 };
        }
        
        const correlation = correlations.find(
          c => (c.subject1 === subject1 && c.subject2 === subject2) ||
               (c.subject1 === subject2 && c.subject2 === subject1)
        );
        
        return { x: subject2, y: correlation?.correlation || 0 };
      })
    };
    matrix.push(row);
  });

  return matrix;
};

// 准备散点图数据
const prepareScatterData = (gradeData: GradeRecord[], subject1: string, subject2: string) => {
  const studentScores = new Map<string, { name: string; score1?: number; score2?: number }>();

  gradeData.forEach(record => {
    if (!record.student_id || !record.score || isNaN(Number(record.score))) return;
    
    if (!studentScores.has(record.student_id)) {
      studentScores.set(record.student_id, { name: record.name || record.student_id });
    }
    
    const student = studentScores.get(record.student_id)!;
    if (record.subject === subject1) {
      student.score1 = Number(record.score);
    } else if (record.subject === subject2) {
      student.score2 = Number(record.score);
    }
  });

  return Array.from(studentScores.entries())
    .filter(([_, student]) => student.score1 !== undefined && student.score2 !== undefined)
    .map(([student_id, student]) => ({
      student_id,
      name: student.name,
      x: student.score1!,
      y: student.score2!,
      [subject1]: student.score1!,
      [subject2]: student.score2!
    }));
};

// ============================================================================
// 子组件
// ============================================================================

const CorrelationMatrix = memo<{
  correlations: CorrelationData[];
}>(({ correlations }) => {
  const getCorrelationColor = (correlation: number, significance: string) => {
    if (significance === 'none') return '#f3f4f6';
    
    const intensity = Math.abs(correlation);
    if (correlation > 0) {
      return `rgba(34, 197, 94, ${intensity})`;  // 绿色表示正相关
    } else {
      return `rgba(239, 68, 68, ${intensity})`;  // 红色表示负相关
    }
  };

  const getCorrelationIcon = (correlation: number, significance: string) => {
    if (significance === 'none') return <Minus className="w-4 h-4 text-gray-400" />;
    
    if (correlation > 0) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {correlations.map((corr, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getCorrelationIcon(corr.correlation, corr.significance)}
                  <div>
                    <p className="font-medium text-sm">
                      {corr.subject1} ↔ {corr.subject2}
                    </p>
                    <p className="text-xs text-gray-500">
                      样本量: {corr.sampleSize} 名学生
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span 
                      className="px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: getCorrelationColor(corr.correlation, corr.significance) }}
                    >
                      {corr.correlation.toFixed(3)}
                    </span>
                    <Badge 
                      variant={
                        corr.significance === 'high' ? 'default' :
                        corr.significance === 'medium' ? 'secondary' :
                        corr.significance === 'low' ? 'outline' : 'destructive'
                      }
                    >
                      {corr.significance === 'high' ? '强相关' :
                       corr.significance === 'medium' ? '中等相关' :
                       corr.significance === 'low' ? '弱相关' : '无显著相关'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    p值: {corr.pValue.toFixed(4)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

const CorrelationHeatmap = memo<{
  correlations: CorrelationData[];
}>(({ correlations }) => {
  const heatmapData = useMemo(() => prepareHeatmapData(correlations), [correlations]);

  if (heatmapData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <Grid className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p>暂无足够数据生成热力图</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-96">
      <ResponsiveHeatMap
        data={heatmapData}
        margin={{ top: 60, right: 90, bottom: 60, left: 90 }}
        valueFormat=">-.3f"
        axisTop={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: '',
          legendOffset: 46
        }}
        axisRight={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: '科目',
          legendPosition: 'middle',
          legendOffset: 70
        }}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: '科目',
          legendPosition: 'middle',
          legendOffset: 46
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: '',
          legendOffset: -72
        }}
        colors={{
          type: 'diverging',
          scheme: 'red_yellow_green',
          divergeAt: 0.5,
          minValue: -1,
          maxValue: 1
        }}
        emptyColor="#f3f4f6"
        borderColor="#ffffff"
        borderWidth={2}
        labelTextColor="#333333"
        tooltip={({ cell }) => (
          <div className="bg-white p-3 shadow-lg rounded border">
            <p className="font-semibold">{cell.serieId} ↔ {cell.data.x}</p>
            <p className="text-sm text-gray-600">
              相关系数: {typeof cell.value === 'number' ? cell.value.toFixed(3) : 'N/A'}
            </p>
          </div>
        )}
      />
    </div>
  );
});

const ScatterPlotAnalysis = memo<{
  gradeData: GradeRecord[];
  correlations: CorrelationData[];
}>(({ gradeData, correlations }) => {
  const [selectedPair, setSelectedPair] = React.useState<CorrelationData | null>(
    correlations.length > 0 ? correlations[0] : null
  );

  const scatterData = useMemo(() => {
    if (!selectedPair) return [];
    return prepareScatterData(gradeData, selectedPair.subject1, selectedPair.subject2);
  }, [gradeData, selectedPair]);

  if (correlations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p>暂无相关性数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 科目对选择 */}
      <div className="flex flex-wrap gap-2">
        {correlations.slice(0, 6).map((corr, index) => (
          <Button
            key={index}
            variant={selectedPair === corr ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPair(corr)}
            className="text-xs"
          >
            {corr.subject1} ↔ {corr.subject2}
            <Badge variant="secondary" className="ml-2">
              {corr.correlation.toFixed(2)}
            </Badge>
          </Button>
        ))}
      </div>

      {/* 散点图 */}
      {selectedPair && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">
              {selectedPair.subject1} vs {selectedPair.subject2}
            </h4>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                相关系数: {selectedPair.correlation.toFixed(3)}
              </Badge>
              <Badge variant="secondary">
                样本量: {selectedPair.sampleSize}
              </Badge>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={scatterData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name={selectedPair.subject1}
                label={{ value: selectedPair.subject1, position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name={selectedPair.subject2}
                label={{ value: selectedPair.subject2, angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 shadow-lg rounded border">
                        <p className="font-semibold">{data.name}</p>
                        <p className="text-sm text-gray-600">
                          {selectedPair.subject1}: {data.x}分
                        </p>
                        <p className="text-sm text-gray-600">
                          {selectedPair.subject2}: {data.y}分
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter 
                dataKey="y" 
                fill={selectedPair.correlation > 0 ? "#10b981" : "#ef4444"}
                fillOpacity={0.6}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// 主组件
// ============================================================================

const CorrelationAnalysis: React.FC<CorrelationAnalysisProps> = ({
  gradeData,
  title = "科目相关性分析",
  className = ""
}) => {
  const correlations = useMemo(() => calculateCorrelationMatrix(gradeData), [gradeData]);
  
  const subjects = useMemo(() => {
    return Array.from(new Set(gradeData.map(record => record.subject).filter(Boolean)));
  }, [gradeData]);

  const strongCorrelations = correlations.filter(c => c.significance === 'high');
  const averageCorrelation = correlations.length > 0 
    ? correlations.reduce((sum, c) => sum + Math.abs(c.correlation), 0) / correlations.length 
    : 0;

  // 导出相关性数据
  const handleExportData = () => {
    const csvContent = [
      ['科目1', '科目2', '相关系数', 'P值', '样本量', '显著性'],
      ...correlations.map(c => [
        c.subject1,
        c.subject2,
        c.correlation.toFixed(4),
        c.pValue.toFixed(4),
        c.sampleSize.toString(),
        c.significance
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '科目相关性分析.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (subjects.length < 2) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Grid className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-600">需要至少2个科目的数据</p>
          <p className="text-sm text-gray-500 mt-1">请确保导入的数据包含多个科目的成绩</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 标题和统计摘要 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Grid className="h-6 w-6 text-blue-600" />
            {title}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            分析 {subjects.length} 个科目间的相关性 • {correlations.length} 个科目对 • 平均相关性 {averageCorrelation.toFixed(3)}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            <TrendingUp className="h-3 w-3 mr-1" />
            强相关 {strongCorrelations.length} 对
          </Badge>
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-1" />
            导出数据
          </Button>
        </div>
      </div>

      {/* 分析说明 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>相关性分析说明</AlertTitle>
        <AlertDescription>
          <div className="space-y-1 text-sm">
            <p>• <strong>相关系数范围</strong>: -1 到 1，绝对值越大相关性越强</p>
            <p>• <strong>正相关</strong>: 一个科目分数高，另一个科目分数也倾向于高</p>
            <p>• <strong>负相关</strong>: 一个科目分数高，另一个科目分数倾向于低</p>
            <p>• <strong>显著性</strong>: 基于p值判断，p&lt;0.05为显著相关</p>
          </div>
        </AlertDescription>
      </Alert>

      {/* 主要分析内容 */}
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="matrix" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="matrix" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                相关性矩阵
              </TabsTrigger>
              <TabsTrigger value="heatmap" className="flex items-center gap-2">
                <Grid className="h-4 w-4" />
                热力图
              </TabsTrigger>
              <TabsTrigger value="scatter" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                散点图分析
              </TabsTrigger>
            </TabsList>

            <TabsContent value="matrix" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">科目相关性矩阵</h3>
                <CorrelationMatrix correlations={correlations} />
              </div>
            </TabsContent>

            <TabsContent value="heatmap" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">相关性热力图</h3>
                <CorrelationHeatmap correlations={correlations} />
              </div>
            </TabsContent>

            <TabsContent value="scatter" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">科目对散点图分析</h3>
                <ScatterPlotAnalysis gradeData={gradeData} correlations={correlations} />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default memo(CorrelationAnalysis); 