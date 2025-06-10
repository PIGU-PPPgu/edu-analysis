import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, BookOpen, TrendingUp, Award } from 'lucide-react';
import { getScoreColors, getRateColors, BRAND_COLORS } from '@/config/colors';

interface ClassData {
  id?: string;
  name?: string;
  grade?: string;
  studentCount?: number;
  averageScore?: number;
  excellentRate?: number;
  passRate?: number;
  created_at?: string;
  subjectCount?: number;
}

interface ClassProfileCardProps {
  classData: ClassData;
}

export const ClassProfileCard: React.FC<ClassProfileCardProps> = ({ classData }) => {
  const excellentColors = getRateColors(classData.excellentRate || 0);
  const passColors = getRateColors(classData.passRate || 0);
  const avgScoreColors = getScoreColors(classData.averageScore || 0);

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Award className={`w-6 h-6 text-[${BRAND_COLORS.primary}]`} />
            {classData.name}
          </CardTitle>
          <Badge variant="secondary" className="text-sm">
            {classData.grade}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 基础统计 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Users className={`w-5 h-5 text-[${BRAND_COLORS.primary}]`} />
            <div>
              <p className="text-sm text-gray-600">学生人数</p>
              <p className="text-lg font-semibold">{classData.studentCount}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <BookOpen className={`w-5 h-5 text-[${BRAND_COLORS.primary}]`} />
            <div>
              <p className="text-sm text-gray-600">科目数量</p>
              <p className="text-lg font-semibold">{classData.subjectCount || 9}</p>
            </div>
          </div>
        </div>

        {/* 成绩指标 */}
        <div className="space-y-3">
          <div className={`p-3 rounded-lg ${avgScoreColors.bg}`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">平均分</span>
              <span className={`text-lg font-bold ${avgScoreColors.text}`}>
                {classData.averageScore?.toFixed(1) || 'N/A'}
              </span>
            </div>
          </div>

          <div className={`p-3 rounded-lg ${excellentColors.bg}`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">优秀率</span>
              <span className={`text-lg font-bold ${excellentColors.text}`}>
                {classData.excellentRate?.toFixed(1) || 0}%
              </span>
            </div>
          </div>

          <div className={`p-3 rounded-lg ${passColors.bg}`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">及格率</span>
              <span className={`text-lg font-bold ${passColors.text}`}>
                {classData.passRate?.toFixed(1) || 0}%
              </span>
            </div>
          </div>
        </div>

        {/* 趋势指标 */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">整体趋势</span>
          </div>
          <Badge className={`${excellentColors.bg} ${excellentColors.text} border-0`}>
            {(classData.excellentRate || 0) > 80 ? '表现优秀' : 
             (classData.excellentRate || 0) > 60 ? '稳步提升' : '需要关注'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClassProfileCard; 