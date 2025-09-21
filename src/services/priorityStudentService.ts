/**
 * 重点跟进学生管理服务
 * 支持手动添加和算法推荐的混合管理模式
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 重点跟进学生管理接口
export interface PriorityStudentManagement {
  id: string;
  studentId: string;
  sourceType: 'manual' | 'algorithm' | 'hybrid';
  addedBy?: string;
  priorityLevel: 'high' | 'medium' | 'low';
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  customTags: string[];
  category?: string;
  followUpStartDate: string;
  followUpEndDate?: string;
  expectedReviewDate?: string;
  reasonDescription?: string;
  notes?: string;
  interventionGoals: string[];
  progressNotes: Record<string, any>;
  algorithmScore?: number;
  algorithmFactors?: Record<string, any>;
  algorithmVersion?: string;
  isIgnoredByAlgorithm: boolean;
  autoReviewEnabled: boolean;
  notificationEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
  completedAt?: string;
}

// 增强的重点跟进学生视图
export interface EnhancedPriorityStudent {
  studentId: string;
  studentName: string;
  className: string;
  priorityManagementId?: string;
  sourceType?: 'manual' | 'algorithm' | 'hybrid';
  priorityLevel: 'high' | 'medium' | 'low';
  priorityStatus?: 'active' | 'paused' | 'completed' | 'cancelled';
  customTags: string[];
  category?: string;
  followUpStartDate?: string;
  followUpEndDate?: string;
  reasonDescription?: string;
  notes?: string;
  interventionGoals?: string[]; // 添加干预目标字段
  algorithmScore?: number;
  priorityAddedAt?: string;
  effectiveRiskScore: number;
  activeWarningsCount: number;
  totalWarningsCount: number;
  latestWarningDate?: string;
  interventionCount: number;
  lastInterventionDate?: string;
  avgInterventionEffectiveness?: number;
  finalPriority: 'high' | 'medium' | 'low';
  isPriorityActive: boolean;
}

// 添加重点跟进学生参数
export interface AddPriorityStudentParams {
  studentId: string;
  priorityLevel?: 'high' | 'medium' | 'low';
  sourceType?: 'manual' | 'algorithm' | 'hybrid';
  reasonDescription: string;
  customTags?: string[];
  category?: string;
  followUpEndDate?: string;
  interventionGoals?: string[];
  notes?: string;
  algorithmScore?: number;
  algorithmFactors?: Record<string, any>;
}

// 更新重点跟进学生参数
export interface UpdatePriorityStudentParams {
  priorityLevel?: 'high' | 'medium' | 'low';
  status?: 'active' | 'paused' | 'completed' | 'cancelled';
  customTags?: string[];
  category?: string;
  followUpEndDate?: string;
  expectedReviewDate?: string;
  interventionGoals?: string[];
  notes?: string;
  reasonDescription?: string;
}

// 干预记录接口
export interface PriorityInterventionRecord {
  id: string;
  priorityManagementId: string;
  studentId: string;
  performedBy?: string;
  interventionType: 'meeting' | 'phone_call' | 'counseling' | 'tutoring' | 'home_visit' | 'parent_meeting' | 'peer_support' | 'behavior_plan' | 'academic_plan' | 'other';
  interventionTitle: string;
  interventionDescription?: string;
  interventionDate: string;
  durationMinutes?: number;
  followUpRequired: boolean;
  nextFollowUpDate?: string;
  effectivenessRating?: number;
  studentResponse?: 'positive' | 'neutral' | 'negative' | 'mixed';
  goalsProgress?: Record<string, any>;
  detailedNotes?: string;
  resourcesUsed: string[];
  participants: string[];
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

/**
 * 获取增强的重点跟进学生列表（支持筛选）
 */
export async function getEnhancedPriorityStudents(
  limit: number = 20, 
  filterConfig?: {
    classNames?: string[];
    examTitles?: string[];
    timeRange?: string;
  }
): Promise<EnhancedPriorityStudent[]> {
  try {
    console.log('🎯 获取增强的重点跟进学生列表（支持筛选）...', filterConfig);

    // 使用新架构：基于成绩数据计算预警学生
    return await getGradeBasedPriorityStudents(limit, filterConfig);

  } catch (error) {
    console.error('获取增强重点跟进学生列表失败:', error);
    return await getFallbackPriorityStudents(limit);
  }
}

/**
 * 备用查询：当增强视图不可用时
 */
async function getFallbackPriorityStudents(limit: number): Promise<EnhancedPriorityStudent[]> {
  try {
    console.log('🔄 使用备用查询获取重点跟进学生...');

    // 先查询手动添加的重点跟进学生
    const { data: manualPriority, error: manualError } = await supabase
      .from('priority_student_management')
      .select(`
        *,
        students!inner(student_id, name, class_name)
      `)
      .eq('status', 'active')
      .order('priority_level', { ascending: true }) // high -> medium -> low
      .order('created_at', { ascending: false });

    if (manualError) {
      console.error('手动重点跟进查询失败:', manualError);
    } else {
      console.log('🗄️ [调试] 从数据库查询到的原始手动重点跟进数据:', manualPriority);
      // 检查每个学生的intervention_goals字段
      manualPriority?.forEach((priority, index) => {
        console.log(`  学生${index + 1}: ${priority.students?.name} - intervention_goals:`, priority.intervention_goals);
      });
    }

    // 查询有活跃预警的学生（作为算法推荐）
    const { data: warnings, error: warningError } = await supabase
      .from('warning_records')
      .select(`
        student_id,
        created_at,
        details,
        students!inner(student_id, name, class_name)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (warningError) {
      console.error('预警记录查询失败:', warningError);
    }

    const result: EnhancedPriorityStudent[] = [];

    // 1. 添加手动管理的学生（优先级最高）
    if (manualPriority) {
      manualPriority.forEach((priority, index) => {
        const mappedStudent = {
          studentId: priority.student_id,
          studentName: priority.students.name,
          className: priority.students.class_name,
          priorityManagementId: priority.id,
          sourceType: priority.source_type,
          priorityLevel: priority.priority_level,
          priorityStatus: priority.status,
          customTags: priority.custom_tags || [],
          category: priority.category,
          followUpStartDate: priority.follow_up_start_date,
          followUpEndDate: priority.follow_up_end_date,
          reasonDescription: priority.reason_description,
          notes: priority.notes,
          interventionGoals: priority.intervention_goals || [], // 添加干预目标
          algorithmScore: priority.algorithm_score,
          priorityAddedAt: priority.created_at,
          effectiveRiskScore: priority.algorithm_score || 50,
          activeWarningsCount: 0, // 需要单独查询
          totalWarningsCount: 0,
          interventionCount: 0,
          finalPriority: priority.priority_level,
          isPriorityActive: true,
        };
        
        console.log(`🔄 [调试] 映射学生${index + 1} ${priority.students.name}:`);
        console.log(`  原始数据intervention_goals:`, priority.intervention_goals);
        console.log(`  映射后interventionGoals:`, mappedStudent.interventionGoals);
        
        result.push(mappedStudent);
      });
    }

    // 2. 添加算法推荐的学生（排除已手动管理的）
    if (warnings && warnings.length > 0) {
      // 按学生分组统计
      const studentStats = warnings.reduce((acc, warning) => {
        const studentId = warning.student_id;
        
        // 跳过已经手动管理的学生
        if (result.some(s => s.studentId === studentId)) {
          return acc;
        }

        if (!acc[studentId]) {
          acc[studentId] = {
            studentId,
            name: warning.students.name,
            className: warning.students.class_name,
            activeWarnings: 0,
            latestWarning: warning.created_at,
            highSeverityCount: 0
          };
        }
        
        acc[studentId].activeWarnings++;
        
        if (warning.details?.severity === 'high') {
          acc[studentId].highSeverityCount++;
        }
        
        if (new Date(warning.created_at) > new Date(acc[studentId].latestWarning)) {
          acc[studentId].latestWarning = warning.created_at;
        }
        
        return acc;
      }, {});

      // 转换为增强学生对象
      Object.values(studentStats).forEach((student: any) => {
        // 只推荐风险较高的学生
        if (student.activeWarnings >= 2) {
          let riskScore = student.activeWarnings * 15;
          riskScore += student.highSeverityCount * 20;
          
          const daysSinceLatest = Math.floor((Date.now() - new Date(student.latestWarning).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceLatest <= 1) riskScore += 20;
          else if (daysSinceLatest <= 3) riskScore += 15;
          else if (daysSinceLatest <= 7) riskScore += 10;

          let priority: 'high' | 'medium' | 'low';
          if (riskScore >= 70 || student.highSeverityCount >= 2) priority = 'high';
          else if (riskScore >= 40 || student.activeWarnings >= 3) priority = 'medium';
          else priority = 'low';

          let lastWarningDate: string;
          if (daysSinceLatest === 0) lastWarningDate = '今天';
          else if (daysSinceLatest === 1) lastWarningDate = '1天前';
          else if (daysSinceLatest < 7) lastWarningDate = `${daysSinceLatest}天前`;
          else lastWarningDate = `${Math.floor(daysSinceLatest / 7)}周前`;

          result.push({
            studentId: student.studentId,
            studentName: student.name,
            className: student.className,
            sourceType: 'algorithm',
            priorityLevel: priority,
            customTags: [],
            effectiveRiskScore: Math.round(riskScore),
            activeWarningsCount: student.activeWarnings,
            totalWarningsCount: student.activeWarnings,
            latestWarningDate: lastWarningDate,
            interventionCount: 0,
            finalPriority: priority,
            isPriorityActive: false, // 算法推荐但未正式添加
          });
        }
      });
    }

    // 按优先级和风险评分排序
    const sortedResult = result
      .sort((a, b) => {
        // 手动管理的优先
        if (a.isPriorityActive !== b.isPriorityActive) {
          return a.isPriorityActive ? -1 : 1;
        }
        
        // 按优先级排序
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        const priorityDiff = priorityOrder[a.finalPriority] - priorityOrder[b.finalPriority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // 按风险评分排序
        return b.effectiveRiskScore - a.effectiveRiskScore;
      })
      .slice(0, limit);

    console.log(`✅ 备用查询成功获取${sortedResult.length}名重点跟进学生`, sortedResult);
    return sortedResult;

  } catch (error) {
    console.error('备用查询失败:', error);
    return [];
  }
}

/**
 * 手动添加重点跟进学生
 */
export async function addPriorityStudent(params: AddPriorityStudentParams): Promise<boolean> {
  try {
    console.log('👤 手动添加重点跟进学生:', params.studentId);
    console.log('📋 添加参数详情:', params);

    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    const { error } = await supabase
      .from('priority_student_management')
      .insert({
        student_id: params.studentId,
        source_type: params.sourceType || 'manual',
        added_by: userId,
        priority_level: params.priorityLevel || 'medium',
        status: 'active',
        custom_tags: params.customTags || [],
        category: params.category,
        follow_up_start_date: new Date().toISOString().split('T')[0],
        follow_up_end_date: params.followUpEndDate,
        reason_description: params.reasonDescription,
        notes: params.notes,
        intervention_goals: params.interventionGoals || [],
        algorithm_score: params.algorithmScore,
        algorithm_factors: params.algorithmFactors || {},
        algorithm_version: '1.0'
      });

    if (error) {
      console.error('添加重点跟进学生失败:', error);
      toast.error('添加失败');
      return false;
    }

    toast.success('已添加到重点跟进');
    return true;

  } catch (error) {
    console.error('添加重点跟进学生异常:', error);
    toast.error('操作失败');
    return false;
  }
}

/**
 * 更新重点跟进学生信息
 */
export async function updatePriorityStudent(
  priorityId: string, 
  params: UpdatePriorityStudentParams
): Promise<boolean> {
  try {
    console.log('✏️ 更新重点跟进学生:', priorityId);
    console.log('📝 更新参数:', params);

    const updateData: any = {};
    
    if (params.priorityLevel) updateData.priority_level = params.priorityLevel;
    if (params.status) updateData.status = params.status;
    if (params.customTags !== undefined) updateData.custom_tags = params.customTags;
    if (params.category) updateData.category = params.category;
    if (params.followUpEndDate) updateData.follow_up_end_date = params.followUpEndDate;
    if (params.expectedReviewDate) updateData.expected_review_date = params.expectedReviewDate;
    if (params.interventionGoals !== undefined) updateData.intervention_goals = params.interventionGoals;
    if (params.notes !== undefined) updateData.notes = params.notes;
    if (params.reasonDescription) updateData.reason_description = params.reasonDescription;
    
    console.log('🔍 最终更新数据:', updateData);

    const { error } = await supabase
      .from('priority_student_management')
      .update(updateData)
      .eq('id', priorityId);

    if (error) {
      console.error('更新重点跟进学生失败:', error);
      toast.error('更新失败');
      return false;
    }

    toast.success('更新成功');
    return true;

  } catch (error) {
    console.error('更新重点跟进学生异常:', error);
    toast.error('操作失败');
    return false;
  }
}

/**
 * 移除重点跟进学生
 */
export async function removePriorityStudent(priorityId: string): Promise<boolean> {
  try {
    console.log('🗑️ 移除重点跟进学生:', priorityId);

    const { error } = await supabase
      .from('priority_student_management')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString()
      })
      .eq('id', priorityId);

    if (error) {
      console.error('移除重点跟进学生失败:', error);
      toast.error('移除失败');
      return false;
    }

    toast.success('已移出重点跟进');
    return true;

  } catch (error) {
    console.error('移除重点跟进学生异常:', error);
    toast.error('操作失败');
    return false;
  }
}

/**
 * 批量添加算法推荐的学生到重点跟进
 */
export async function batchAddAlgorithmRecommendations(
  studentIds: string[], 
  priorityLevel: 'high' | 'medium' | 'low' = 'medium'
): Promise<Array<{studentId: string, success: boolean}>> {
  const results = [];
  
  for (const studentId of studentIds) {
    const success = await addPriorityStudent({
      studentId,
      sourceType: 'algorithm',
      priorityLevel,
      reasonDescription: '基于算法推荐添加到重点跟进',
      notes: '系统根据预警记录和风险评分自动推荐'
    });
    results.push({ studentId, success });
  }
  
  return results;
}

/**
 * 获取学生的详细档案信息（包括重点跟进历史）
 */
export async function getStudentPriorityProfile(studentId: string): Promise<any> {
  try {
    console.log('📋 获取学生重点跟进档案:', studentId);

    // 只查询存在的表，避免404错误
    const { data: currentPriority, error } = await supabase
      .from('priority_student_management')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .single();

    if (error) {
      console.warn('查询重点跟进档案失败:', error);
      return null;
    }

    return {
      currentPriority,
      priorityHistory: [], // 历史记录表暂未创建
      interventions: []   // 干预记录表暂未创建
    };

  } catch (error) {
    console.error('获取学生重点跟进档案失败:', error);
    return null;
  }
}

/**
 * 添加干预记录
 */
export async function addInterventionRecord(
  params: Omit<PriorityInterventionRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<boolean> {
  try {
    console.log('📝 添加干预记录:', params.studentId);

    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    const { error } = await supabase
      .from('priority_intervention_records')
      .insert({
        priority_management_id: params.priorityManagementId,
        student_id: params.studentId,
        performed_by: userId,
        intervention_type: params.interventionType,
        intervention_title: params.interventionTitle,
        intervention_description: params.interventionDescription,
        intervention_date: params.interventionDate,
        duration_minutes: params.durationMinutes,
        follow_up_required: params.followUpRequired,
        next_follow_up_date: params.nextFollowUpDate,
        effectiveness_rating: params.effectivenessRating,
        student_response: params.studentResponse,
        goals_progress: params.goalsProgress || {},
        detailed_notes: params.detailedNotes,
        resources_used: params.resourcesUsed || [],
        participants: params.participants || [],
        status: params.status || 'completed'
      });

    if (error) {
      console.error('添加干预记录失败:', error);
      toast.error('添加干预记录失败');
      return false;
    }

    toast.success('干预记录已保存');
    return true;

  } catch (error) {
    console.error('添加干预记录异常:', error);
    toast.error('操作失败');
    return false;
  }
}

/**
 * 搜索可添加到重点跟进的学生
 */
export async function searchStudentsForPriority(searchTerm: string = '', limit: number = 20): Promise<any[]> {
  try {
    console.log('🔍 搜索学生用于添加重点跟进:', searchTerm);

    let query = supabase
      .from('students')
      .select(`
        student_id,
        name,
        class_name,
        priority_student_management!left(id, status)
      `);

    if (searchTerm.trim()) {
      query = query.or(`name.ilike.%${searchTerm}%,student_id.ilike.%${searchTerm}%,class_name.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query
      .order('name')
      .limit(limit);

    if (error) {
      console.error('搜索学生失败:', error);
      return [];
    }

    // 过滤掉已经在重点跟进中的学生
    return (data || []).filter(student => 
      !student.priority_student_management?.some(p => p.status === 'active')
    );

  } catch (error) {
    console.error('搜索学生异常:', error);
    return [];
  }
}

/**
 * 基于成绩数据计算预警学生（新架构）
 */
async function getGradeBasedPriorityStudents(
  limit: number, 
  filterConfig?: {
    classNames?: string[];
    examTitles?: string[];
    timeRange?: string;
  }
): Promise<EnhancedPriorityStudent[]> {
  try {
    console.log('🚀 [新架构] 基于成绩数据计算预警学生...');

    // 1. 查询成绩数据并应用筛选
    let gradesQuery = supabase
      .from('grades')
      .select(`
        student_id,
        subject,
        score,
        exam_title,
        exam_date,
        exam_type,
        students!inner(
          student_id,
          name,
          class_name
        )
      `);

    // 应用筛选条件
    if (filterConfig?.classNames && filterConfig.classNames.length > 0) {
      console.log('📚 应用班级筛选:', filterConfig.classNames);
      gradesQuery = gradesQuery.in('students.class_name', filterConfig.classNames);
    }

    if (filterConfig?.examTitles && filterConfig.examTitles.length > 0) {
      console.log('📊 应用考试筛选:', filterConfig.examTitles);
      gradesQuery = gradesQuery.in('exam_title', filterConfig.examTitles);
    }

    // 时间范围筛选
    if (filterConfig?.timeRange && filterConfig.timeRange !== 'semester') {
      const now = new Date();
      let startDate: Date;

      switch (filterConfig.timeRange) {
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      }

      if (startDate) {
        gradesQuery = gradesQuery.gte('exam_date', startDate.toISOString().split('T')[0]);
      }
    }

    const { data: gradesData, error: gradesError } = await gradesQuery;

    if (gradesError) {
      console.error('❌ 查询成绩数据失败:', gradesError);
      return [];
    }

    console.log('✅ 查询到成绩数据:', gradesData?.length || 0, '条');

    if (!gradesData || gradesData.length === 0) {
      return [];
    }

    // 2. 按学生分组并计算预警指标
    const studentData = new Map<string, {
      studentInfo: any;
      grades: any[];
      warningReasons: string[];
      riskScore: number;
    }>();

    gradesData.forEach(grade => {
      const studentId = grade.student_id;
      if (!studentData.has(studentId)) {
        studentData.set(studentId, {
          studentInfo: grade.students,
          grades: [],
          warningReasons: [],
          riskScore: 0
        });
      }
      studentData.get(studentId)!.grades.push(grade);
    });

    // 3. 计算每个学生的预警情况
    const priorityStudents: EnhancedPriorityStudent[] = [];

    studentData.forEach((student, studentId) => {
      const grades = student.grades;
      const warningReasons: string[] = [];
      let riskScore = 0;

      // 分析不及格情况
      const failingGrades = grades.filter(g => g.score < 60);
      if (failingGrades.length >= 2) {
        const subjects = failingGrades.map(g => g.subject).join('、');
        warningReasons.push(`多科目不及格(${subjects})`);
        riskScore += failingGrades.length * 20;
      }

      // 分析平均成绩
      const avgScore = grades.reduce((sum, g) => sum + g.score, 0) / grades.length;
      if (avgScore < 70) {
        warningReasons.push(`平均分过低(${avgScore.toFixed(1)}分)`);
        riskScore += (70 - avgScore) * 2;
      }

      // 分析严重不及格
      const severeFailures = grades.filter(g => g.score < 40);
      if (severeFailures.length > 0) {
        const subjects = severeFailures.map(g => g.subject).join('、');
        warningReasons.push(`严重不及格(${subjects})`);
        riskScore += severeFailures.length * 30;
      }

      // 分析单科极差成绩
      const extremelyLowGrades = grades.filter(g => g.score < 30);
      if (extremelyLowGrades.length > 0) {
        warningReasons.push(`极低分科目(${extremelyLowGrades.length}科)`);
        riskScore += extremelyLowGrades.length * 40;
      }

      // 只有预警的学生才加入列表
      if (warningReasons.length > 0) {
        // 确定优先级
        let priorityLevel: 'high' | 'medium' | 'low' = 'low';
        if (riskScore >= 80) {
          priorityLevel = 'high';
        } else if (riskScore >= 40) {
          priorityLevel = 'medium';
        }

        priorityStudents.push({
          studentId: studentId,
          studentName: student.studentInfo.name,
          className: student.studentInfo.class_name,
          priorityLevel,
          sourceType: 'algorithm',
          customTags: warningReasons,
          effectiveRiskScore: Math.round(riskScore),
          activeWarningsCount: warningReasons.length,
          totalWarningsCount: warningReasons.length,
          latestWarningDate: new Date().toISOString().split('T')[0],
          interventionCount: 0,
          interventionGoals: [],
          finalPriority: priorityLevel,
          isPriorityActive: true,
          reasonDescription: warningReasons.join('；')
        });
      }
    });

    // 4. 查询手动添加的重点跟进学生并合并（🆕 分层筛选：手动学生不受筛选影响）
    const { data: manualPriority } = await supabase
      .from('priority_student_management')
      .select(`
        *,
        students!inner(student_id, name, class_name)
      `)
      .eq('status', 'active');

    console.log('🎯 [分层筛选策略] 手动添加的重点跟进学生不受筛选器影响，始终显示');

    if (manualPriority && manualPriority.length > 0) {
      // 🆕 手动学生不应用筛选，始终保持显示
      manualPriority.forEach(priority => {
        const existingIndex = priorityStudents.findIndex(p => p.studentId === priority.student_id);
        
        if (existingIndex >= 0) {
          // 合并算法和手动数据
          priorityStudents[existingIndex] = {
            ...priorityStudents[existingIndex],
            priorityManagementId: priority.id,
            sourceType: 'hybrid',
            priorityLevel: priority.priority_level,
            customTags: [...(priority.custom_tags || []), ...priorityStudents[existingIndex].customTags],
            interventionGoals: priority.intervention_goals || [],
            reasonDescription: priority.reason_description || priorityStudents[existingIndex].reasonDescription,
            notes: priority.notes
          };
        } else {
          // 添加纯手动的学生
          priorityStudents.push({
            studentId: priority.student_id,
            studentName: priority.students.name,
            className: priority.students.class_name,
            priorityManagementId: priority.id,
            sourceType: 'manual',
            priorityLevel: priority.priority_level,
            customTags: priority.custom_tags || [],
            interventionGoals: priority.intervention_goals || [],
            effectiveRiskScore: 50, // 手动添加默认风险分
            activeWarningsCount: 1,
            totalWarningsCount: 1,
            interventionCount: 0,
            finalPriority: priority.priority_level,
            isPriorityActive: true,
            reasonDescription: priority.reason_description || '手动添加的重点跟进学生'
          });
        }
      });
    }

    // 5. 分层排序策略：手动学生优先，然后按风险等级和分数排序
    const sortedStudents = priorityStudents
      .sort((a, b) => {
        // 🆕 第一层：手动添加的学生优先显示
        if (a.sourceType === 'manual' && b.sourceType !== 'manual') return -1;
        if (b.sourceType === 'manual' && a.sourceType !== 'manual') return 1;
        
        // 🆕 第二层：混合类型（手动+算法）其次
        if (a.sourceType === 'hybrid' && b.sourceType === 'algorithm') return -1;
        if (b.sourceType === 'hybrid' && a.sourceType === 'algorithm') return 1;
        
        // 第三层：按优先级排序
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priorityLevel] - priorityOrder[a.priorityLevel];
        if (priorityDiff !== 0) return priorityDiff;
        
        // 第四层：按风险分数排序
        return (b.effectiveRiskScore || 0) - (a.effectiveRiskScore || 0);
      })
      .slice(0, limit);

    console.log(`✅ 基于成绩数据计算完成，找到${sortedStudents.length}名预警学生`);
    
    // 🆕 展示分层筛选效果
    const manualCount = sortedStudents.filter(s => s.sourceType === 'manual').length;
    const hybridCount = sortedStudents.filter(s => s.sourceType === 'hybrid').length;
    const algorithmCount = sortedStudents.filter(s => s.sourceType === 'algorithm').length;
    
    console.log('🎯 [分层筛选结果]');
    console.log(`  手动添加: ${manualCount}名 (不受筛选影响)`);
    console.log(`  混合来源: ${hybridCount}名 (手动+算法)`);  
    console.log(`  算法推荐: ${algorithmCount}名 (受筛选影响)`);
    
    console.log('📊 预警学生详情:', sortedStudents.map(s => ({
      name: s.studentName,
      class: s.className,
      source: s.sourceType,
      priority: s.priorityLevel,
      reasons: s.customTags,
      score: s.effectiveRiskScore
    })));

    return sortedStudents;

  } catch (error) {
    console.error('❌ 基于成绩数据计算预警学生失败:', error);
    return [];
  }
}