import React, { useMemo, memo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { ScoreSummaryProps } from "./types";

/**
 * 📊 ScoreChart - 优化版
 * Phase 1.3: 使用 React.memo 和 useMemo 优化渲染性能
 *
 * 优化措施：
 * 1. React.memo 包装组件，避免父组件重渲染时的不必要更新
 * 2. useMemo 缓存图表配置和数据，减少重复计算
 * 3. 深度比较 props，只在数据真正变化时重渲染
 */

const ScoreChart = memo<ScoreSummaryProps>(
  ({ student }) => {
    // 使用 useMemo 缓存图表配置，避免每次渲染都创建新对象
    const chartConfig = useMemo(
      () => ({
        score: { color: "#B9FF66" },
      }),
      []
    );

    // 使用 useMemo 缓存图表数据，只在 student.scores 变化时重新计算
    const chartData = useMemo(() => student.scores, [student.scores]);

    // 使用 useMemo 缓存图表边距配置
    const chartMargin = useMemo(
      () => ({ top: 20, right: 30, left: 20, bottom: 5 }),
      []
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">各科目成绩</CardTitle>
          <CardDescription>该学生在各学科的得分情况</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={chartMargin}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis domain={[0, 100]} />
                <ChartTooltip />
                <Legend />
                <Bar dataKey="score" name="分数" fill="#B9FF66" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  },
  (prevProps, nextProps) => {
    // 自定义比较函数：只有当 scores 数组真正变化时才重新渲染
    // 比较数组长度和每个元素的 score 值
    if (prevProps.student.scores.length !== nextProps.student.scores.length) {
      return false;
    }

    return prevProps.student.scores.every((score, index) => {
      const nextScore = nextProps.student.scores[index];
      return (
        score.subject === nextScore.subject && score.score === nextScore.score
      );
    });
  }
);

ScoreChart.displayName = "ScoreChart";

export default ScoreChart;
