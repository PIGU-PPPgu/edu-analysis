/**
 * 班级画像综合分析仪表板 - 展示班级整体特征和发展建议
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Users,
  TrendingUp,
  BarChart3,
  Target,
  BookOpen,
  Award,
  AlertCircle,
  CheckCircle2,
  Brain,
  Lightbulb,
  Activity,
  UserCheck,
  Star,
} from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { intelligentPortraitService, type ClassPortraitAnalysis, type GroupPortraitAnalysis } from '@/services/intelligentPortraitService';
import { toast } from 'sonner';

interface ClassPortraitDashboardProps {
  className: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

export function ClassPortraitDashboard({ className }: ClassPortraitDashboardProps) {
  const [classPortrait, setClassPortrait] = useState<ClassPortraitAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<'academic' | 'group' | 'recommendation'>('academic');

  useEffect(() => {
    loadClassPortrait();
  }, [className]);

  const loadClassPortrait = async () => {
    if (!className) return;
    
    setIsLoading(true);
    try {
      const portrait = await intelligentPortraitService.generateClassPortrait(className);
      if (portrait) {
        setClassPortrait(portrait);
      } else {
        toast.error('无法生成班级画像，请检查数据');
      }
    } catch (error) {
      console.error('加载班级画像失败:', error);
      toast.error('加载班级画像失败');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!classPortrait) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p>暂无班级画像数据</p>
            <Button onClick={loadClassPortrait} className="mt-2">
              重新生成
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 准备学术分布雷达图数据
  const academicRadarData = [
    {
      subject: '优秀率',
      value: classPortrait.excellent_rate || 0,
      maxValue: 100,
    },
    {
      subject: '进步率',
      value: classPortrait.progress_rate || 0,
      maxValue: 100,
    },
    {
      subject: '协作准备度',
      value: classPortrait.class_characteristics.collaboration_readiness || 0,
      maxValue: 100,
    },
    {
      subject: '平均成绩',
      value: ((classPortrait.average_score || 0) / 100) * 100,
      maxValue: 100,
    },
  ];

  // 准备学生分布饼图数据
  const studentDistributionData = [
    { name: '优秀学生', value: classPortrait.class_characteristics.academic_distribution.high_achievers, color: '#10B981' },
    { name: '中等学生', value: classPortrait.class_characteristics.academic_distribution.average_performers, color: '#F59E0B' },
    { name: '待提升学生', value: classPortrait.class_characteristics.academic_distribution.needs_support, color: '#EF4444' },
  ];

  // 准备科目统计数据
  const subjectStatsData = (classPortrait.subject_stats || []).map((subject: any) => ({
    name: subject.subject_name || subject.name,
    average: subject.average_score || subject.avg_score || 0,
    excellent_rate: subject.excellent_rate || subject.excellent_count / subject.total_count * 100 || 0,
  }));

  return (
    <div className="space-y-6">
      {/* 班级概览卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {className} - 班级画像
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{classPortrait.student_count}名学生</Badge>
              <Button variant="outline" size="sm" onClick={() => setShowDetailDialog(true)}>
                详细分析
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 关键指标 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(classPortrait.average_score || 0)}
              </div>
              <div className="text-sm text-muted-foreground">班级平均分</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(classPortrait.excellent_rate || 0)}%
              </div>
              <div className="text-sm text-muted-foreground">优秀率</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(classPortrait.progress_rate || 0)}%
              </div>
              <div className="text-sm text-muted-foreground">进步率</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                0
              </div>
              <div className="text-sm text-muted-foreground">学习小组</div>
            </div>
          </div>

          {/* 班级特征雷达图 */}
          <div className="h-80">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Target className="h-4 w-4" />
              班级综合特征分析
            </h4>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={academicRadarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={false}
                />
                <Radar
                  name="班级指标"
                  dataKey="value"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 详细分析标签页 */}
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="distribution">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="distribution">学生分布</TabsTrigger>
              <TabsTrigger value="subjects">科目分析</TabsTrigger>
              <TabsTrigger value="groups">小组分析</TabsTrigger>
              <TabsTrigger value="recommendations">发展建议</TabsTrigger>
            </TabsList>

            <TabsContent value="distribution" className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                学生能力分布分析
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">学习能力分布</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={studentDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, value, percent }) => `${name}: ${value}人 (${(percent * 100).toFixed(1)}%)`}
                          >
                            {studentDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">班级统计概览</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>班级规模</span>
                      <Badge>{classPortrait.student_count}人</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>性别比例</span>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          男 {Math.round((classPortrait.gender_distribution?.male || 0) / classPortrait.student_count * 100)}%
                        </Badge>
                        <Badge variant="outline">
                          女 {Math.round((classPortrait.gender_distribution?.female || 0) / classPortrait.student_count * 100)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>协作准备度</span>
                      <div className="flex items-center gap-2">
                        <Progress value={classPortrait.class_characteristics.collaboration_readiness} className="w-20" />
                        <span className="text-sm">{classPortrait.class_characteristics.collaboration_readiness}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>数据质量评分</span>
                      <Badge variant={classPortrait.data_quality_score > 80 ? "default" : "secondary"}>
                        {classPortrait.data_quality_score}分
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="subjects" className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                各科目表现分析
              </h3>

              {subjectStatsData.length > 0 ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">科目平均分对比</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subjectStatsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="average" fill="#8884d8" name="平均分" />
                          <Bar dataKey="excellent_rate" fill="#82ca9d" name="优秀率%" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无科目统计数据</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="groups" className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                小组化学习分析
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {classPortrait.group_analysis.current_groups.length}
                    </div>
                    <div className="text-sm text-muted-foreground">当前小组数</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {classPortrait.group_analysis.optimal_group_count}
                    </div>
                    <div className="text-sm text-muted-foreground">建议小组数</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600 mb-1">
                      {classPortrait.group_analysis.ungrouped_students.length}
                    </div>
                    <div className="text-sm text-muted-foreground">未分组学生</div>
                  </CardContent>
                </Card>
              </div>

              {classPortrait.group_analysis.current_groups.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">小组表现概览</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {classPortrait.group_analysis.current_groups.map((group, index) => (
                        <div key={group.group_id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{group.group_name}</span>
                            <Badge variant="outline">{group.member_count}人</Badge>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-sm">
                              <span className="text-muted-foreground">平均能力: </span>
                              <span className="font-medium">{Math.round(group.academic_composition.average_performance)}分</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">凝聚力: </span>
                              <span className={`font-medium ${
                                group.group_dynamics.cohesion_score > 80 ? 'text-green-600' : 
                                group.group_dynamics.cohesion_score > 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {group.group_dynamics.cohesion_score}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>班级暂无学习小组</p>
                  <p className="text-sm mt-2">建议创建{classPortrait.group_analysis.optimal_group_count}个学习小组</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                教学发展建议
              </h3>

              <div className="space-y-4">
                {/* 差异化教学建议 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      差异化教学建议
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {classPortrait.teaching_recommendations.differentiated_instruction.map((suggestion, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                          <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />
                          <span className="text-sm">{suggestion}</span>
                        </div>
                      ))}
                      {classPortrait.teaching_recommendations.differentiated_instruction.length === 0 && (
                        <p className="text-sm text-muted-foreground">暂无特定的差异化教学建议</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 小组活动建议 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      小组活动建议
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {classPortrait.teaching_recommendations.group_activity_suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                          <Star className="h-4 w-4 text-green-600 mt-0.5" />
                          <span className="text-sm">{suggestion}</span>
                        </div>
                      ))}
                      {classPortrait.teaching_recommendations.group_activity_suggestions.length === 0 && (
                        <p className="text-sm text-muted-foreground">暂无特定的小组活动建议</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 重点关注学生 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      个别指导重点
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {classPortrait.teaching_recommendations.individual_attention_priorities.map((priority, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                          <span className="text-sm">{priority}</span>
                        </div>
                      ))}
                      {classPortrait.teaching_recommendations.individual_attention_priorities.length === 0 && (
                        <p className="text-sm text-muted-foreground">暂无特定的个别指导建议</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 班级管理建议 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      班级管理建议
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {classPortrait.teaching_recommendations.class_management_tips.map((tip, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg">
                          <Brain className="h-4 w-4 text-purple-600 mt-0.5" />
                          <span className="text-sm">{tip}</span>
                        </div>
                      ))}
                      {classPortrait.teaching_recommendations.class_management_tips.length === 0 && (
                        <p className="text-sm text-muted-foreground">暂无特定的班级管理建议</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 详细分析对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{className} - 深度班级分析报告</DialogTitle>
            <DialogDescription>
              基于学生画像和小组画像的综合分析报告
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI综合评估
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <p>
                    <strong>班级整体水平：</strong>
                    该班级共有{classPortrait.student_count}名学生，平均成绩{Math.round(classPortrait.average_score || 0)}分，
                    优秀率{Math.round(classPortrait.excellent_rate || 0)}%，进步率{Math.round(classPortrait.progress_rate || 0)}%。
                    整体表现{classPortrait.average_score > 80 ? '优秀' : classPortrait.average_score > 70 ? '良好' : '有待提升'}。
                  </p>
                  
                  <p>
                    <strong>学生分布特征：</strong>
                    班级中有{classPortrait.class_characteristics.academic_distribution.high_achievers}名优秀学生，
                    {classPortrait.class_characteristics.academic_distribution.average_performers}名中等学生，
                    {classPortrait.class_characteristics.academic_distribution.needs_support}名需要支持的学生。
                    学生分布{classPortrait.class_characteristics.academic_distribution.high_achievers > classPortrait.student_count * 0.3 ? '偏向优秀' : '相对均衡'}。
                  </p>
                  
                  <p>
                    <strong>小组化学习状况：</strong>
                    目前班级有{classPortrait.group_analysis.current_groups.length}个学习小组，
                    建议设置{classPortrait.group_analysis.optimal_group_count}个小组。
                    协作准备度为{classPortrait.class_characteristics.collaboration_readiness}%，
                    {classPortrait.class_characteristics.collaboration_readiness > 80 ? '非常适合' : classPortrait.class_characteristics.collaboration_readiness > 60 ? '比较适合' : '需要培养'}小组协作学习。
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 数据质量报告 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  数据质量评估
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>数据完整性</span>
                    <div className="flex items-center gap-2">
                      <Progress value={classPortrait.data_quality_score} className="w-20" />
                      <span className="text-sm">{classPortrait.data_quality_score}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>数据更新时间</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(classPortrait.updated_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>画像有效期</span>
                    <span className="text-sm text-muted-foreground">
                      {classPortrait.expires_at ? new Date(classPortrait.expires_at).toLocaleDateString() : '长期有效'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ClassPortraitDashboard;