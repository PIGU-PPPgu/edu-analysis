import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  CalendarIcon, 
  Plus, 
  ClipboardList, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  UserPlus,
  Calendar,
  FileText,
  ArrowRight,
  BarChart4
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  InterventionPlan, 
  InterventionActivity,
  InterventionAssessment,
  getInterventionPlans,
  createInterventionPlan,
  updateInterventionPlan,
  addInterventionActivity,
  updateInterventionActivity,
  createInterventionAssessment,
  getInterventionTypeOptions
} from '@/services/interventionService';
import { WarningRecord } from '@/services/warningService';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useSession } from '@/hooks/useSession';

// 干预状态标签组件
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">待开始</Badge>;
    case 'in_progress':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">进行中</Badge>;
    case 'completed':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">已完成</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">已取消</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// 创建干预计划表单
const CreatePlanForm = ({ 
  warningRecord, 
  onCreated 
}: { 
  warningRecord: WarningRecord,
  onCreated: (plan: InterventionPlan) => void
}) => {
  const { session } = useSession();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  
  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('请输入干预计划标题');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 当前登录用户ID
      const userId = session?.user?.id || '';
      
      const newPlan = {
        warning_id: warningRecord.id,
        title,
        description,
        status: 'pending' as const,
        created_by: userId,
        start_date: startDate?.toISOString(),
        end_date: endDate?.toISOString(),
      };
      
      const createdPlan = await createInterventionPlan(newPlan);
      
      if (createdPlan) {
        toast.success('干预计划创建成功');
        setTitle('');
        setDescription('');
        setStartDate(new Date());
        setEndDate(undefined);
        setOpen(false);
        onCreated(createdPlan);
      }
    } catch (error) {
      toast.error('创建干预计划失败');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#c0ff3f] text-black hover:bg-[#a5e034]">
          <Plus className="h-4 w-4 mr-2" />
          创建干预计划
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>创建干预计划</DialogTitle>
          <DialogDescription>
            为学生"{warningRecord.student?.name || '未知学生'}"创建预警干预计划。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">计划标题</Label>
              <Input 
                id="title" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入干预计划标题"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">计划描述</Label>
              <Textarea 
                id="description" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请输入干预计划详细描述"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>开始日期</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'yyyy-MM-dd', { locale: zhCN }) : "选择开始日期"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>结束日期</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'yyyy-MM-dd', { locale: zhCN }) : "选择结束日期"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      disabled={(date) => 
                        (startDate ? date < startDate : false) || 
                        date < new Date("1900-01-01")
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
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
              {isSubmitting ? "提交中..." : "创建计划"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// 添加干预活动表单
const AddActivityForm = ({ 
  plan, 
  onAdded 
}: { 
  plan: InterventionPlan,
  onAdded: (activity: InterventionActivity) => void
}) => {
  const [activityType, setActivityType] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [responsible, setResponsible] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  
  const interventionTypes = getInterventionTypeOptions();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activityType || !description.trim()) {
      toast.error('请填写所有必填字段');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const newActivity = {
        plan_id: plan.id,
        activity_type: activityType,
        description,
        status: 'pending' as const,
        scheduled_date: scheduledDate?.toISOString(),
        responsible_person: responsible
      };
      
      const createdActivity = await addInterventionActivity(newActivity);
      
      if (createdActivity) {
        toast.success('干预活动已添加');
        setActivityType('');
        setDescription('');
        setScheduledDate(undefined);
        setResponsible('');
        setOpen(false);
        onAdded(createdActivity);
      }
    } catch (error) {
      toast.error('添加干预活动失败');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          添加活动
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>添加干预活动</DialogTitle>
          <DialogDescription>
            为"{plan.title}"添加具体的干预活动。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="activityType">活动类型</Label>
              <Select
                value={activityType}
                onValueChange={setActivityType}
              >
                <SelectTrigger id="activityType">
                  <SelectValue placeholder="选择活动类型" />
                </SelectTrigger>
                <SelectContent>
                  {interventionTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">活动描述</Label>
              <Textarea 
                id="description" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请详细描述干预活动内容和目标"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>计划日期</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, 'yyyy-MM-dd', { locale: zhCN }) : "选择计划日期"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="responsible">负责人</Label>
              <Input 
                id="responsible" 
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="请输入负责人姓名"
              />
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
              {isSubmitting ? "提交中..." : "添加活动"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// 添加评估表单
const AddAssessmentForm = ({ 
  plan, 
  onAdded 
}: { 
  plan: InterventionPlan,
  onAdded: (assessment: InterventionAssessment) => void
}) => {
  const { session } = useSession();
  const [rating, setRating] = useState('3');
  const [observations, setObservations] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!observations.trim()) {
      toast.error('请输入观察结果');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 当前登录用户ID
      const userId = session?.user?.id || '';
      
      const metrics = {
        attendance_improvement: Math.round(Math.random() * 100),
        grade_improvement: Math.round(Math.random() * 100),
        engagement_improvement: Math.round(Math.random() * 100)
      };
      
      const newAssessment = {
        plan_id: plan.id,
        assessment_date: new Date().toISOString(),
        effectiveness_rating: parseInt(rating),
        metrics,
        observations,
        next_steps: nextSteps,
        assessed_by: userId
      };
      
      const createdAssessment = await createInterventionAssessment(newAssessment);
      
      if (createdAssessment) {
        // 更新计划状态为已完成
        await updateInterventionPlan(plan.id, { status: 'completed' });
        
        toast.success('干预评估已添加');
        setRating('3');
        setObservations('');
        setNextSteps('');
        setOpen(false);
        onAdded(createdAssessment);
      }
    } catch (error) {
      toast.error('添加干预评估失败');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BarChart4 className="h-4 w-4 mr-1" />
          添加评估
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>干预效果评估</DialogTitle>
          <DialogDescription>
            对"{plan.title}"的干预效果进行评估。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rating">有效性评分 (1-5)</Label>
              <Select
                value={rating}
                onValueChange={setRating}
              >
                <SelectTrigger id="rating">
                  <SelectValue placeholder="选择评分" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - 效果很差</SelectItem>
                  <SelectItem value="2">2 - 效果一般</SelectItem>
                  <SelectItem value="3">3 - 效果中等</SelectItem>
                  <SelectItem value="4">4 - 效果良好</SelectItem>
                  <SelectItem value="5">5 - 效果极佳</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="observations">观察结果</Label>
              <Textarea 
                id="observations" 
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="请描述干预计划的具体效果和观察结果"
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nextSteps">后续步骤</Label>
              <Textarea 
                id="nextSteps" 
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                placeholder="请描述需要继续跟进的工作"
                rows={2}
              />
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
              {isSubmitting ? "提交中..." : "提交评估"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// 干预活动列表
const ActivityList = ({ 
  activities, 
  onUpdate 
}: { 
  activities: InterventionActivity[],
  onUpdate: () => void
}) => {
  // 处理活动完成更新
  const handleComplete = async (activity: InterventionActivity) => {
    try {
      await updateInterventionActivity(activity.id, {
        status: 'completed',
        completion_date: new Date().toISOString()
      });
      onUpdate();
    } catch (error) {
      console.error('更新活动状态失败:', error);
      toast.error('更新活动状态失败');
    }
  };
  
  // 获取活动类型标签
  const getActivityTypeLabel = (type: string) => {
    const option = getInterventionTypeOptions().find(opt => opt.value === type);
    return option ? option.label : type;
  };
  
  if (activities.length === 0) {
    return <p className="text-sm text-gray-500 italic">暂无干预活动</p>;
  }
  
  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div 
          key={activity.id} 
          className={`p-4 rounded-lg border ${
            activity.status === 'completed' 
              ? 'border-green-100 bg-green-50' 
              : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-slate-50 text-slate-700">
                  {getActivityTypeLabel(activity.activity_type)}
                </Badge>
                <StatusBadge status={activity.status} />
              </div>
              <p className="mt-2 text-sm font-medium">{activity.description}</p>
              
              {activity.scheduled_date && (
                <div className="flex items-center text-xs text-gray-500 mt-2">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span>计划日期: {new Date(activity.scheduled_date).toLocaleDateString('zh-CN')}</span>
                </div>
              )}
              
              {activity.responsible_person && (
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <UserPlus className="h-3 w-3 mr-1" />
                  <span>负责人: {activity.responsible_person}</span>
                </div>
              )}
              
              {activity.completion_date && (
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                  <span>完成时间: {new Date(activity.completion_date).toLocaleDateString('zh-CN')}</span>
                </div>
              )}
              
              {activity.notes && (
                <p className="mt-2 text-xs text-gray-600 italic">{activity.notes}</p>
              )}
            </div>
            
            {activity.status !== 'completed' && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-xs h-8"
                onClick={() => handleComplete(activity)}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                标记完成
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// 评估结果组件
const AssessmentResults = ({ assessment }: { assessment: InterventionAssessment }) => {
  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-500';
    if (rating >= 3) return 'text-amber-500';
    return 'text-red-500';
  };
  
  return (
    <div className="p-4 rounded-lg border border-blue-100 bg-blue-50">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium text-blue-800">评估结果</h4>
        <div className="flex items-center gap-1">
          <span className={`font-bold text-lg ${getRatingColor(assessment.effectiveness_rating)}`}>
            {assessment.effectiveness_rating}
          </span>
          <span className="text-xs text-gray-500">/5</span>
        </div>
      </div>
      
      {assessment.metrics && (
        <div className="space-y-3 mb-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>出勤率改善</span>
              <span>{assessment.metrics.attendance_improvement}%</span>
            </div>
            <Progress value={assessment.metrics.attendance_improvement} className="h-1.5" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>成绩提升</span>
              <span>{assessment.metrics.grade_improvement}%</span>
            </div>
            <Progress value={assessment.metrics.grade_improvement} className="h-1.5" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>参与度提升</span>
              <span>{assessment.metrics.engagement_improvement}%</span>
            </div>
            <Progress value={assessment.metrics.engagement_improvement} className="h-1.5" />
          </div>
        </div>
      )}
      
      <div className="mt-3 text-sm">
        <p className="font-medium text-blue-800">观察结果:</p>
        <p className="text-gray-700">{assessment.observations}</p>
      </div>
      
      {assessment.next_steps && (
        <div className="mt-3 text-sm">
          <p className="font-medium text-blue-800">后续步骤:</p>
          <p className="text-gray-700">{assessment.next_steps}</p>
        </div>
      )}
      
      <div className="mt-3 text-xs text-gray-500">
        评估日期: {new Date(assessment.assessment_date).toLocaleDateString('zh-CN')}
      </div>
    </div>
  );
};

// 干预计划详情
const PlanDetail = ({ 
  plan, 
  onUpdate 
}: { 
  plan: InterventionPlan,
  onUpdate: () => void
}) => {
  // 更新计划状态
  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateInterventionPlan(plan.id, { status: newStatus as any });
      toast.success('状态已更新');
      onUpdate();
    } catch (error) {
      console.error('更新状态失败:', error);
      toast.error('更新状态失败');
    }
  };
  
  // 计算进度
  const calculateProgress = () => {
    if (!plan.activities || plan.activities.length === 0) return 0;
    const completed = plan.activities.filter(a => a.status === 'completed').length;
    return Math.round((completed / plan.activities.length) * 100);
  };
  
  // 默认评估（最后一次）
  const latestAssessment = plan.assessments && plan.assessments.length > 0
    ? plan.assessments[plan.assessments.length - 1]
    : null;
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className={`pb-4 ${
        plan.status === 'completed' 
          ? 'bg-green-50 border-b border-green-100' 
          : plan.status === 'in_progress'
            ? 'bg-blue-50 border-b border-blue-100'
            : 'bg-amber-50 border-b border-amber-100'
      }`}>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{plan.title}</CardTitle>
            <CardDescription className="mt-1">
              学生: {plan.student_name}
            </CardDescription>
          </div>
          <StatusBadge status={plan.status} />
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {plan.description && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">计划描述</h4>
            <p className="text-sm text-gray-600">{plan.description}</p>
          </div>
        )}
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium text-gray-700">干预进度</h4>
            <span className="text-xs font-medium text-gray-500">
              {calculateProgress()}%
            </span>
          </div>
          <Progress value={calculateProgress()} className="h-2" />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-gray-700">干预活动</h4>
            {plan.status !== 'completed' && (
              <AddActivityForm plan={plan} onAdded={onUpdate} />
            )}
          </div>
          <ActivityList 
            activities={plan.activities || []} 
            onUpdate={onUpdate} 
          />
        </div>
        
        {latestAssessment ? (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">成效评估</h4>
            <AssessmentResults assessment={latestAssessment} />
          </div>
        ) : plan.status === 'in_progress' && (plan.activities || []).some(a => a.status === 'completed') ? (
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium text-gray-700">成效评估</h4>
            <AddAssessmentForm plan={plan} onAdded={onUpdate} />
          </div>
        ) : null}
      </CardContent>
      
      <CardFooter className="bg-gray-50 border-t p-4 flex justify-between">
        <div className="text-xs text-gray-500">
          创建时间: {new Date(plan.created_at).toLocaleString()}
          {plan.start_date && (
            <> | 开始时间: {new Date(plan.start_date).toLocaleDateString()}</>
          )}
          {plan.end_date && (
            <> | 结束时间: {new Date(plan.end_date).toLocaleDateString()}</>
          )}
        </div>
        
        {plan.status !== 'completed' && (
          <div className="flex items-center gap-2">
            {plan.status === 'pending' && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => handleStatusChange('in_progress')}
              >
                <Clock className="h-3.5 w-3.5 mr-1" />
                开始干预
              </Button>
            )}
            {plan.status === 'in_progress' && (
              <Button 
                size="sm" 
                variant="outline"
                className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => handleStatusChange('completed')}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                标记完成
              </Button>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

// 干预工作流组件
const InterventionWorkflow = ({ warningRecord }: { warningRecord: WarningRecord }) => {
  const [plans, setPlans] = useState<InterventionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 加载干预计划
  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const interventionPlans = await getInterventionPlans(warningRecord.id);
      setPlans(interventionPlans);
    } catch (error) {
      console.error('获取干预计划失败:', error);
      toast.error('获取干预计划失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 首次加载和依赖更新时获取数据
  useEffect(() => {
    loadPlans();
  }, [warningRecord.id]);
  
  // 处理计划创建和更新
  const handlePlanCreated = (plan: InterventionPlan) => {
    setPlans(prev => [plan, ...prev]);
  };
  
  // 处理计划更新
  const handlePlanUpdated = () => {
    loadPlans();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">
          预警干预工作流
        </h2>
        <CreatePlanForm 
          warningRecord={warningRecord} 
          onCreated={handlePlanCreated} 
        />
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <Skeleton className="h-[200px] w-full rounded-xl" />
        </div>
      ) : plans.length === 0 ? (
        <Card className="bg-gray-50 border-dashed flex flex-col items-center justify-center p-10 text-center">
          <ClipboardList className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">暂无干预计划</h3>
          <p className="text-sm text-gray-500 max-w-md mb-6">
            为该预警创建干预计划，帮助学生改善学习状况和提升成绩。
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {plans.map(plan => (
            <PlanDetail 
              key={plan.id} 
              plan={plan} 
              onUpdate={handlePlanUpdated} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default InterventionWorkflow; 