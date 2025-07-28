import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreSummaryProps } from "./types";

const ScoreSummary: React.FC<ScoreSummaryProps> = ({ student }) => {
  const averageScore =
    student.scores.reduce((sum, score) => sum + score.score, 0) /
    student.scores.length;
  const maxScore = Math.max(...student.scores.map((s) => s.score));
  const minScore = Math.min(...student.scores.map((s) => s.score));
  const maxSubject = student.scores.find((s) => s.score === maxScore)?.subject;
  const minSubject = student.scores.find((s) => s.score === minScore)?.subject;

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            平均分
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageScore.toFixed(1)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            最高分
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{maxScore}</div>
          <div className="text-xs text-gray-500">{maxSubject}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            最低分
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{minScore}</div>
          <div className="text-xs text-gray-500">{minSubject}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            班级排名
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">5</div>
          <div className="text-xs text-gray-500">超过90%同学</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScoreSummary;
