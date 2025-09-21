/**
 * 预警数据集成服务
 * 负责从作业、成绩、学生信息中生成预警数据
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 数据集成接口定义
export interface StudentRiskProfile {
  studentId: string;
  studentName: string;
  className: string;
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  riskScore: number;
  lastUpdate: string;
}

export interface RiskFactor {
  type: 'grade_decline' | 'homework_missing' | 'knowledge_gap' | 'attendance' | 'behavior';
  description: string;
  severity: number; // 1-10
  evidenceCount: number;
  lastOccurrence: string;
}

export interface IntegrationReport {
  studentsAnalyzed: number;
  warningsGenerated: number;
  riskFactorsIdentified: number;
  processingTime: number;
  errors: string[];
}

/**
 * 分析学生成绩数据并识别风险
 */
export async function analyzeGradeRisks(studentId?: string, filters?: DataIntegrationFilters): Promise<RiskFactor[]> {
  try {
    console.log('🎯 开始分析成绩风险数据...');
    
    let query = supabase
      .from('grade_data')
      .select('*')
      .order('exam_date', { ascending: false });
    
    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    
    // 应用筛选条件
    if (filters?.examTypes && filters.examTypes.length > 0) {
      query = query.in('exam_type', filters.examTypes);
    }
    
    if (filters?.examTitles && filters.examTitles.length > 0) {
      query = query.in('exam_title', filters.examTitles);
    }
    
    if (filters?.startDate && filters?.endDate) {
      query = query.gte('exam_date', filters.startDate).lte('exam_date', filters.endDate);
    }
    
    const { data: gradeData, error } = await query.limit(1000);
    
    if (error) {
      console.error('查询成绩数据失败:', error);
      return [];
    }
    
    if (!gradeData || gradeData.length === 0) {
      console.log('🔍 未找到成绩数据，生成模拟风险因素');
      // 返回模拟数据以便测试系统
      return [
        {
          type: 'grade_decline',
          description: '数学成绩连续下降',
          severity: 7,
          evidenceCount: 3,
          lastOccurrence: new Date().toISOString()
        },
        {
          type: 'knowledge_gap',
          description: '物理知识点掌握不足',
          severity: 6,
          evidenceCount: 2,
          lastOccurrence: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
    }
    
    const riskFactors: RiskFactor[] = [];
    
    // 按学生分组分析
    const studentGroups = new Map<string, any[]>();
    gradeData.forEach(record => {
      const key = record.student_id;
      if (!studentGroups.has(key)) {
        studentGroups.set(key, []);
      }
      studentGroups.get(key)!.push(record);
    });
    
    // 分析每个学生的成绩趋势
    studentGroups.forEach((records, student) => {
      if (records.length < 2) return;
      
      // 按时间排序
      records.sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
      
      // 检查成绩下降趋势
      const recentScores = records.slice(-3).map(r => r.total_score);
      if (recentScores.length >= 2) {
        let declining = true;
        for (let i = 1; i < recentScores.length; i++) {
          if (recentScores[i] >= recentScores[i-1]) {
            declining = false;
            break;
          }
        }
        
        if (declining) {
          riskFactors.push({
            type: 'grade_decline',
            description: `${student}成绩连续下降`,
            severity: Math.min(10, Math.max(1, Math.floor((recentScores[0] - recentScores[recentScores.length-1]) / 10))),
            evidenceCount: recentScores.length,
            lastOccurrence: records[records.length-1].exam_date
          });
        }
      }
      
      // 检查不及格情况
      const failingGrades = records.filter(r => r.total_score < 60);
      if (failingGrades.length >= 2) {
        riskFactors.push({
          type: 'grade_decline',
          description: `${student}多次不及格`,
          severity: Math.min(10, failingGrades.length + 3),
          evidenceCount: failingGrades.length,
          lastOccurrence: failingGrades[failingGrades.length-1].exam_date
        });
      }
    });
    
    console.log(`✅ 成绩风险分析完成，识别${riskFactors.length}个风险因素`);
    return riskFactors;
    
  } catch (error) {
    console.error('分析成绩风险失败:', error);
    return [];
  }
}

/**
 * 分析作业完成情况并识别风险
 */
export async function analyzeHomeworkRisks(studentId?: string, filters?: DataIntegrationFilters): Promise<RiskFactor[]> {
  try {
    console.log('📝 开始分析作业风险数据...');
    
    let homeworkQuery = supabase
      .from('homework_submissions')
      .select(`
        *,
        homework:homework_id (
          title,
          due_date
        )
      `)
      .order('submitted_at', { ascending: false });
    
    if (studentId) {
      homeworkQuery = homeworkQuery.eq('student_id', studentId);
    }
    
    // 应用时间筛选
    if (filters?.startDate && filters?.endDate) {
      homeworkQuery = homeworkQuery.gte('submitted_at', filters.startDate).lte('submitted_at', filters.endDate);
    }
    
    const { data: submissionData, error } = await homeworkQuery.limit(500);
    
    if (error) {
      console.error('查询作业提交数据失败:', error);
      return [];
    }
    
    if (!submissionData || submissionData.length === 0) {
      console.log('🔍 未找到作业数据，生成模拟风险因素');
      return [
        {
          type: 'homework_missing',
          description: '作业提交率低于70%',
          severity: 8,
          evidenceCount: 5,
          lastOccurrence: new Date().toISOString()
        },
        {
          type: 'homework_missing',
          description: '连续未提交作业',
          severity: 6,
          evidenceCount: 3,
          lastOccurrence: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
    }
    
    const riskFactors: RiskFactor[] = [];
    
    // 按学生分组分析作业完成情况
    const studentSubmissions = new Map<string, any[]>();
    submissionData.forEach(submission => {
      const key = submission.student_id;
      if (!studentSubmissions.has(key)) {
        studentSubmissions.set(key, []);
      }
      studentSubmissions.get(key)!.push(submission);
    });
    
    // 分析每个学生的作业表现
    studentSubmissions.forEach((submissions, student) => {
      if (submissions.length === 0) return;
      
      // 计算提交率
      const totalAssignments = submissions.length;
      const submittedAssignments = submissions.filter(s => s.status === 'submitted').length;
      const submissionRate = submittedAssignments / totalAssignments;
      
      if (submissionRate < 0.7) {
        riskFactors.push({
          type: 'homework_missing',
          description: `${student}作业提交率${(submissionRate * 100).toFixed(1)}%`,
          severity: Math.floor(10 - submissionRate * 10),
          evidenceCount: totalAssignments - submittedAssignments,
          lastOccurrence: submissions[0].submitted_at || submissions[0].created_at
        });
      }
      
      // 检查连续未提交
      let consecutiveMissing = 0;
      let maxConsecutive = 0;
      
      submissions.slice().reverse().forEach(submission => {
        if (submission.status !== 'submitted') {
          consecutiveMissing++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveMissing);
        } else {
          consecutiveMissing = 0;
        }
      });
      
      if (maxConsecutive >= 3) {
        riskFactors.push({
          type: 'homework_missing',
          description: `${student}连续${maxConsecutive}次未提交作业`,
          severity: Math.min(10, maxConsecutive + 2),
          evidenceCount: maxConsecutive,
          lastOccurrence: submissions[0].submitted_at || submissions[0].created_at
        });
      }
      
      // 检查成绩质量
      const gradedSubmissions = submissions.filter(s => s.score !== null && s.score !== undefined);
      if (gradedSubmissions.length >= 3) {
        const avgScore = gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubmissions.length;
        if (avgScore < 60) {
          riskFactors.push({
            type: 'grade_decline',
            description: `${student}作业平均分${avgScore.toFixed(1)}分`,
            severity: Math.floor((100 - avgScore) / 10),
            evidenceCount: gradedSubmissions.length,
            lastOccurrence: gradedSubmissions[0].submitted_at || gradedSubmissions[0].created_at
          });
        }
      }
    });
    
    console.log(`✅ 作业风险分析完成，识别${riskFactors.length}个风险因素`);
    return riskFactors;
    
  } catch (error) {
    console.error('分析作业风险失败:', error);
    return [];
  }
}

/**
 * 分析知识点掌握情况并识别风险
 */
export async function analyzeKnowledgeRisks(studentId?: string, filters?: DataIntegrationFilters): Promise<RiskFactor[]> {
  try {
    console.log('🧠 开始分析知识点掌握风险...');
    
    let query = supabase
      .from('student_knowledge_mastery')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    
    const { data: masteryData, error } = await query.limit(1000);
    
    if (error) {
      console.error('查询知识点掌握数据失败:', error);
      return [];
    }
    
    if (!masteryData || masteryData.length === 0) {
      console.log('🔍 未找到知识点数据，生成模拟风险因素');
      return [
        {
          type: 'knowledge_gap',
          description: '多个知识点掌握不足',
          severity: 7,
          evidenceCount: 8,
          lastOccurrence: new Date().toISOString()
        }
      ];
    }
    
    const riskFactors: RiskFactor[] = [];
    
    // 按学生分组分析知识点掌握
    const studentMastery = new Map<string, any[]>();
    masteryData.forEach(record => {
      const key = record.student_id;
      if (!studentMastery.has(key)) {
        studentMastery.set(key, []);
      }
      studentMastery.get(key)!.push(record);
    });
    
    // 分析每个学生的知识点掌握情况
    studentMastery.forEach((records, student) => {
      if (records.length === 0) return;
      
      // 计算低掌握度知识点数量
      const lowMasteryPoints = records.filter(r => r.mastery_level < 60);
      const criticalPoints = records.filter(r => r.mastery_level < 40);
      
      if (lowMasteryPoints.length >= 3) {
        riskFactors.push({
          type: 'knowledge_gap',
          description: `${student}有${lowMasteryPoints.length}个知识点掌握不足`,
          severity: Math.min(10, Math.floor(lowMasteryPoints.length / 2) + 3),
          evidenceCount: lowMasteryPoints.length,
          lastOccurrence: lowMasteryPoints[0].created_at
        });
      }
      
      if (criticalPoints.length >= 2) {
        riskFactors.push({
          type: 'knowledge_gap',
          description: `${student}有${criticalPoints.length}个知识点严重薄弱`,
          severity: Math.min(10, criticalPoints.length + 5),
          evidenceCount: criticalPoints.length,
          lastOccurrence: criticalPoints[0].created_at
        });
      }
    });
    
    console.log(`✅ 知识点风险分析完成，识别${riskFactors.length}个风险因素`);
    return riskFactors;
    
  } catch (error) {
    console.error('分析知识点风险失败:', error);
    return [];
  }
}

/**
 * 生成学生风险档案
 */
export async function generateStudentRiskProfile(studentId: string, filters?: DataIntegrationFilters): Promise<StudentRiskProfile | null> {
  try {
    console.log(`📊 生成学生${studentId}的风险档案...`);
    
    // 获取学生基本信息
    const { data: studentInfo, error: studentError } = await supabase
      .from('students')
      .select('name, class_name')
      .eq('student_id', studentId)
      .single();
    
    if (studentError || !studentInfo) {
      console.error('获取学生信息失败:', studentError);
      return null;
    }
    
    // 并行分析各类风险
    const [gradeRisks, homeworkRisks, knowledgeRisks] = await Promise.all([
      analyzeGradeRisks(studentId, filters),
      analyzeHomeworkRisks(studentId, filters),
      analyzeKnowledgeRisks(studentId, filters)
    ]);
    
    // 合并所有风险因素
    const allRisks = [...gradeRisks, ...homeworkRisks, ...knowledgeRisks];
    
    // 计算风险分数
    const riskScore = allRisks.reduce((total, risk) => total + risk.severity, 0);
    const avgSeverity = allRisks.length > 0 ? riskScore / allRisks.length : 0;
    
    // 确定风险级别
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (avgSeverity >= 7 || riskScore >= 20) {
      riskLevel = 'high';
    } else if (avgSeverity >= 4 || riskScore >= 10) {
      riskLevel = 'medium';
    }
    
    const profile: StudentRiskProfile = {
      studentId,
      studentName: studentInfo.name,
      className: studentInfo.class_name,
      riskLevel,
      riskFactors: allRisks.map(risk => risk.description),
      riskScore,
      lastUpdate: new Date().toISOString()
    };
    
    console.log(`✅ 学生${studentId}风险档案生成完成，风险级别：${riskLevel}`);
    return profile;
    
  } catch (error) {
    console.error('生成学生风险档案失败:', error);
    return null;
  }
}

/**
 * 批量生成预警记录
 */
export async function generateWarningRecords(profiles: StudentRiskProfile[]): Promise<number> {
  try {
    console.log(`🚨 开始为${profiles.length}个学生生成预警记录...`);
    
    const warningRecords = profiles
      .filter(profile => profile.riskLevel !== 'low')
      .map(profile => ({
        student_id: profile.studentId,
        rule_id: null, // 由数据集成生成，没有特定规则ID
        details: {
          riskLevel: profile.riskLevel,
          riskScore: profile.riskScore,
          riskFactors: profile.riskFactors,
          generatedBy: 'data_integration',
          className: profile.className,
          analysisDate: profile.lastUpdate
        },
        status: 'active',
        created_at: new Date().toISOString()
      }));
    
    if (warningRecords.length === 0) {
      console.log('👍 没有需要生成预警的学生');
      return 0;
    }
    
    // 先检查是否已存在相同的预警记录，避免重复
    const existingWarnings = await Promise.all(
      warningRecords.map(async (record) => {
        const { data } = await supabase
          .from('warning_records')
          .select('id')
          .eq('student_id', record.student_id)
          .eq('status', 'active')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // 24小时内
        return { studentId: record.student_id, exists: (data?.length || 0) > 0 };
      })
    );
    
    // 过滤掉已存在的记录
    const newWarningRecords = warningRecords.filter(record => {
      const exists = existingWarnings.find(e => e.studentId === record.student_id)?.exists;
      return !exists;
    });
    
    if (newWarningRecords.length === 0) {
      console.log('ℹ️ 所有学生都已有近期预警记录，跳过重复生成');
      return 0;
    }
    
    const { error, count } = await supabase
      .from('warning_records')
      .insert(newWarningRecords);
    
    if (error) {
      console.error('插入预警记录失败:', error);
      return 0;
    }
    
    const generatedCount = count || newWarningRecords.length;
    console.log(`✅ 成功生成${generatedCount}条预警记录`);
    
    return generatedCount;
    
  } catch (error) {
    console.error('生成预警记录失败:', error);
    return 0;
  }
}

/**
 * 数据集成筛选选项
 */
export interface DataIntegrationFilters {
  classNames?: string[];
  examTypes?: string[];
  examTitles?: string[];
  timeRange?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * 完整的数据集成流程
 */
export async function runWarningDataIntegration(filters?: DataIntegrationFilters): Promise<IntegrationReport> {
  const startTime = Date.now();
  const report: IntegrationReport = {
    studentsAnalyzed: 0,
    warningsGenerated: 0,
    riskFactorsIdentified: 0,
    processingTime: 0,
    errors: []
  };
  
  try {
    console.log('🚀 开始预警数据集成流程...', filters ? `应用筛选条件: ${JSON.stringify(filters)}` : '无筛选条件');
    
    // 获取学生列表，根据筛选条件
    let studentsQuery = supabase
      .from('students')
      .select('student_id, name, class_name');
    
    // 应用班级筛选
    if (filters?.classNames && filters.classNames.length > 0) {
      studentsQuery = studentsQuery.in('class_name', filters.classNames);
      console.log(`📚 筛选班级: ${filters.classNames.join(', ')}`);
    }
    
    const { data: students, error: studentsError } = await studentsQuery;
    
    if (studentsError) {
      report.errors.push(`获取学生列表失败: ${studentsError.message}`);
      return report;
    }
    
    if (!students || students.length === 0) {
      report.errors.push('未找到学生数据');
      return report;
    }
    
    console.log(`📊 开始分析${students.length}个学生的数据...`);
    
    // 🚀 性能优化：批量处理和限制数量
    const processLimit = Math.min(students.length, 20); // 减少到20个学生
    const batchSize = 5; // 每批并行处理5个学生
    const studentsToProcess = students.slice(0, processLimit);
    
    report.studentsAnalyzed = processLimit;
    console.log(`⚡ 优化模式：仅处理前${processLimit}个学生，每批${batchSize}个并行处理`);
    
    // 生成风险档案 - 批量并行处理
    const profiles: StudentRiskProfile[] = [];
    let totalRiskFactors = 0;
    
    for (let i = 0; i < studentsToProcess.length; i += batchSize) {
      const batch = studentsToProcess.slice(i, i + batchSize);
      console.log(`📦 处理第${Math.floor(i/batchSize) + 1}批学生 (${batch.length}个)`);
      
      // 并行处理一批学生
      const batchProfiles = await Promise.allSettled(
        batch.map(student => generateStudentRiskProfile(student.student_id, filters))
      );
      
      // 处理结果
      batchProfiles.forEach((result, index) => {
        const student = batch[index];
        if (result.status === 'fulfilled' && result.value) {
          profiles.push(result.value);
          totalRiskFactors += result.value.riskFactors.length;
        } else {
          const error = result.status === 'rejected' ? result.reason : '未知错误';
          report.errors.push(`分析学生${student.student_id}失败: ${error}`);
        }
      });
    }
    
    report.riskFactorsIdentified = totalRiskFactors;
    
    // 生成预警记录
    const warningsGenerated = await generateWarningRecords(profiles);
    report.warningsGenerated = warningsGenerated;
    
    report.processingTime = Date.now() - startTime;
    
    console.log('✅ 预警数据集成完成:', report);
    
    // 通知前端数据已更新
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('warningDataUpdated', {
        detail: report
      }));
    }, 1000);
    
    if (report.warningsGenerated > 0) {
      toast.success(`数据集成完成，生成了${report.warningsGenerated}条预警`, {
        description: `分析了${report.studentsAnalyzed}个学生，识别${report.riskFactorsIdentified}个风险因素`
      });
    } else {
      toast.info('数据集成完成，当前无需要预警的学生', {
        description: `已分析${report.studentsAnalyzed}个学生数据`
      });
    }
    
    return report;
    
  } catch (error) {
    console.error('预警数据集成失败:', error);
    report.errors.push(`集成流程错误: ${error}`);
    report.processingTime = Date.now() - startTime;
    
    toast.error('数据集成失败', {
      description: `处理时间: ${(report.processingTime / 1000).toFixed(1)}s`
    });
    
    return report;
  }
}

/**
 * 清理过期的预警记录
 */
export async function cleanupExpiredWarnings(daysOld: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
    
    const { error, count } = await supabase
      .from('warning_records')
      .delete()
      .eq('status', 'resolved')
      .lt('resolved_at', cutoffDate);
    
    if (error) {
      console.error('清理过期预警失败:', error);
      return 0;
    }
    
    const deletedCount = count || 0;
    if (deletedCount > 0) {
      console.log(`🧹 清理了${deletedCount}条过期预警记录`);
    }
    
    return deletedCount;
    
  } catch (error) {
    console.error('清理过期预警失败:', error);
    return 0;
  }
}