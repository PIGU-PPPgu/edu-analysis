import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  BookOpen, 
  BarChart4, 
  UserRoundSearch,
  Brain,
  ClipboardList,
  Lightbulb,
  CheckCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RiskCluster, 
  RiskFactor, 
  RecommendedIntervention, 
  StudentRiskClusterAssignment,
  getRiskClusters,
  getStudentRiskClusterAssignments,
  generateBulkInterventionPlan
} from '@/services/riskClusterService';
import { getInterventionTypeOptions } from '@/services/interventionService';

// 风险聚类卡片组件
const ClusterCard = ({ 
  cluster, 
  isSelected, 
  onClick 
}: { 
  cluster: RiskCluster; 
  isSelected: boolean;
  onClick: () => void;
}) => {
  // 生成集群的背景颜色
  const getClusterColor = (clusterId: number) => {
    switch (clusterId % 4) {
      case 0: return 'bg-amber-50 border-amber-200';
      case 1: return 'bg-blue-50 border-blue-200';
      case 2: return 'bg-green-50 border-green-200';
      case 3: return 'bg-rose-50 border-rose-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };
  
  // 计算风险指数（基于因素权重）
  const riskIndex = cluster.risk_factors.reduce((acc, factor) => acc + factor.weight, 0) / 
                    (cluster.risk_factors.length || 1);
  
  return (
    <Card 
      className={`overflow-hidden transition-all cursor-pointer ${
        isSelected ? 'ring-2 ring-offset-1 ring-[#c0ff3f]' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className={`py-4 ${getClusterColor(cluster.cluster_id)}`}>
        <CardTitle className="text-lg flex items-center justify-between">
          {cluster.cluster_name}
          <Badge variant="outline" className="bg-white/80">
            {cluster.student_count}名学生
          </Badge>
        </CardTitle>
        <CardDescription>
          风险指数: {(riskIndex * 100).toFixed(0)}%
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-4">
        <h4 className="text-sm font-medium mb-2">主要风险因素:</h4>
        <div className="space-y-2">
          {cluster.risk_factors.map((factor, idx) => (
            <div key={idx}>
              <div className="flex justify-between items-center text-xs mb-1">
                <span>{factor.factor}</span>
                <span className="font-medium">{(factor.weight * 100).toFixed(0)}%</span>
              </div>
              <Progress value={factor.weight * 100} className="h-1.5" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// 生成干预计划对话框
const GenerateInterventionDialog = ({ 
  cluster,
  onGenerated
}: { 
  cluster: RiskCluster | null;
  onGenerated: () => void;
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedInterventions, setSelectedInterventions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  
  // 在集群更改时重置表单
  useEffect(() => {
    if (cluster) {
      setTitle(`${cluster.cluster_name}群体干预计划`);
      setDescription(`为${cluster.cluster_name}群体设计的批量干预措施，针对${cluster.risk_factors.map(f => f.factor).join('、')}等问题。`);
      setSelectedInterventions([]);
    }
  }, [cluster]);
  
  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cluster) return;
    
    if (!title.trim() || !description.trim() || selectedInterventions.length === 0) {
      toast.error('请填写所有必填字段并选择至少一种干预方式');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await generateBulkInterventionPlan(
        cluster.cluster_id,
        title,
        description,
        selectedInterventions
      );
      
      setOpen(false);
      onGenerated();
    } catch (error) {
      console.error('生成干预计划失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 获取推荐干预类型ID列表
  const getRecommendedTypes = () => {
    return cluster?.recommended_interventions.map(i => i.type) || [];
  };
  
  // 干预类型选项
  const interventionOptions = getInterventionTypeOptions();
  
  if (!cluster) return null;
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#c0ff3f] text-black hover:bg-[#a5e034]">
          <Lightbulb className="h-4 w-4 mr-2" />
          生成批量干预计划
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>生成群体干预计划</DialogTitle>
            <DialogDescription>
              为"{cluster.cluster_name}"({cluster.student_count}名学生)创建批量干预计划。
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">计划标题</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入干预计划标题"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">计划描述</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="输入干预计划详细描述"
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <Label>选择干预方式</Label>
              <div className="border rounded-md p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>干预方式</span>
                  <span>推荐度</span>
                </div>
                <Separator />
                {interventionOptions.map((option) => {
                  const recommended = cluster.recommended_interventions.find(r => r.type === option.value);
                  const isRecommended = Boolean(recommended);
                  const effectiveness = recommended?.effectiveness || 0;
                  
                  return (
                    <div key={option.value} className="flex items-center justify-between space-x-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`intervention-${option.value}`}
                          checked={selectedInterventions.includes(option.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedInterventions([...selectedInterventions, option.value]);
                            } else {
                              setSelectedInterventions(
                                selectedInterventions.filter(i => i !== option.value)
                              );
                            }
                          }}
                        />
                        <label
                          htmlFor={`intervention-${option.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {option.label}
                        </label>
                      </div>
                      
                      {isRecommended && (
                        <div className="flex items-center">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden mr-2">
                            <div 
                              className="h-full bg-green-500 rounded-full" 
                              style={{ width: `${effectiveness * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs">{(effectiveness * 100).toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                带有效度百分比的干预方式是系统根据历史数据推荐的，可能对该类型学生更有效。
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              type="submit"
              className="bg-[#c0ff3f] text-black hover:bg-[#a5e034]"
              disabled={isSubmitting}
            >
              {isSubmitting ? '生成中...' : '生成干预计划'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// 学生列表组件
const StudentList = ({ students }: { students: StudentRiskClusterAssignment[] }) => {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>学生姓名</TableHead>
            <TableHead>聚类分组</TableHead>
            <TableHead>风险分数</TableHead>
            <TableHead className="w-[300px]">主要风险因素</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.student_id}>
              <TableCell className="font-medium">{student.student_name}</TableCell>
              <TableCell>{student.cluster_name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={student.risk_score * 100} 
                    className="h-2 w-24" 
                    indicatorClassName={
                      student.risk_score > 0.7 
                        ? 'bg-red-500' 
                        : student.risk_score > 0.4 
                          ? 'bg-amber-500' 
                          : 'bg-green-500'
                    }
                  />
                  <span className="text-sm">
                    {(student.risk_score * 100).toFixed(0)}%
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {student.primary_factors.map((factor, idx) => (
                    <Badge 
                      key={idx} 
                      variant="outline" 
                      className={
                        factor.score > 0.7 
                          ? 'bg-red-50 text-red-700 border-red-200' 
                          : factor.score > 0.5 
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                      }
                    >
                      {factor.factor}
                    </Badge>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

// 风险聚类分析主组件
const RiskClusterView = () => {
  const [clusters, setClusters] = useState<RiskCluster[]>([]);
  const [students, setStudents] = useState<StudentRiskClusterAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCluster, setSelectedCluster] = useState<RiskCluster | null>(null);
  
  // 加载数据
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 并行获取数据
      const [clustersData, studentsData] = await Promise.all([
        getRiskClusters(),
        getStudentRiskClusterAssignments()
      ]);
      
      setClusters(clustersData);
      setStudents(studentsData);
      
      // 默认选中第一个聚类
      if (clustersData.length > 0 && !selectedCluster) {
        setSelectedCluster(clustersData[0]);
      }
    } catch (error) {
      console.error('获取风险聚类数据失败:', error);
      toast.error('获取风险聚类数据失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 首次加载时获取数据
  useEffect(() => {
    loadData();
  }, []);
  
  // 获取特定聚类的学生
  const getStudentsInCluster = (clusterId: number) => {
    return students.filter(student => student.cluster_id === clusterId);
  };
  
  // 处理聚类选择
  const handleClusterClick = (cluster: RiskCluster) => {
    setSelectedCluster(cluster);
  };
  
  // 处理干预计划生成完成
  const handleInterventionGenerated = () => {
    toast.success('批量干预计划已生成');
    // 重新加载数据以获取最新状态
    // loadData();
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          学生风险聚类分析
        </h2>
        <p className="text-sm text-gray-500">
          系统自动将具有相似风险模式的学生进行聚类分组，并针对每个群体提供定制化的干预建议。
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">聚类概览</TabsTrigger>
          <TabsTrigger value="students">学生详情</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6 pt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
              ))}
            </div>
          ) : clusters.length === 0 ? (
            <Card className="bg-gray-50 border-dashed flex flex-col items-center justify-center p-10 text-center">
              <Brain className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">尚无风险聚类数据</h3>
              <p className="text-sm text-gray-500 max-w-md">
                系统需要足够的学生预警数据才能生成有意义的风险聚类分析。请确保系统中有足够的预警记录。
              </p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {clusters.map((cluster) => (
                  <ClusterCard
                    key={cluster.cluster_id}
                    cluster={cluster}
                    isSelected={selectedCluster?.cluster_id === cluster.cluster_id}
                    onClick={() => handleClusterClick(cluster)}
                  />
                ))}
              </div>
              
              {selectedCluster && (
                <Card className="mt-8">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>{selectedCluster.cluster_name}详情</CardTitle>
                        <CardDescription>
                          共{selectedCluster.student_count}名学生，风险指数{(selectedCluster.risk_factors.reduce((acc, f) => acc + f.weight, 0) / selectedCluster.risk_factors.length * 100).toFixed(0)}%
                        </CardDescription>
                      </div>
                      <GenerateInterventionDialog 
                        cluster={selectedCluster}
                        onGenerated={handleInterventionGenerated}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <h3 className="text-sm font-medium mb-4">推荐干预措施</h3>
                        <div className="space-y-3">
                          {selectedCluster.recommended_interventions.map((intervention, idx) => (
                            <div 
                              key={idx}
                              className="flex flex-col gap-1 p-3 rounded-md bg-gray-50 border"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{intervention.name}</span>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-none">
                                  {(intervention.effectiveness * 100).toFixed(0)}% 有效
                                </Badge>
                              </div>
                              <Progress value={intervention.effectiveness * 100} className="h-1.5" />
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-4">学生样本</h3>
                        <div className="space-y-2">
                          {getStudentsInCluster(selectedCluster.cluster_id)
                            .slice(0, 5)
                            .map((student) => (
                              <div 
                                key={student.student_id}
                                className="flex justify-between items-center p-3 rounded-md bg-gray-50 border"
                              >
                                <span className="font-medium">{student.student_name}</span>
                                <div className="flex items-center gap-2">
                                  <Progress 
                                    value={student.risk_score * 100} 
                                    className="h-1.5 w-16" 
                                  />
                                  <span className="text-xs text-gray-500">
                                    {(student.risk_score * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                          ))}
                          
                          {getStudentsInCluster(selectedCluster.cluster_id).length > 5 && (
                            <div className="text-center text-sm text-gray-500 pt-2">
                              还有 {getStudentsInCluster(selectedCluster.cluster_id).length - 5} 位学生未显示
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="students" className="space-y-6 pt-4">
          {isLoading ? (
            <Skeleton className="h-[400px] w-full rounded-xl" />
          ) : students.length === 0 ? (
            <Card className="bg-gray-50 border-dashed flex flex-col items-center justify-center p-10 text-center">
              <UserRoundSearch className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">尚无学生风险分配数据</h3>
              <p className="text-sm text-gray-500 max-w-md">
                系统需要足够的学生预警数据才能生成学生风险聚类分配。
              </p>
            </Card>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">学生风险分配</h3>
                  <p className="text-sm text-gray-500">
                    共{students.length}名学生被分配到{clusters.length}个风险聚类
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="所有聚类" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">所有聚类</SelectItem>
                      {clusters.map((cluster) => (
                        <SelectItem key={cluster.cluster_id} value={cluster.cluster_id.toString()}>
                          {cluster.cluster_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button variant="outline" size="sm">
                    <BarChart4 className="h-4 w-4 mr-2" />
                    导出报告
                  </Button>
                </div>
              </div>
              
              <StudentList students={students} />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RiskClusterView; 