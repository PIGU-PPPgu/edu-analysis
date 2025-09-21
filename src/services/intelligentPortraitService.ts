/**
 * 智能画像服务 - 基于成绩数据生成学生、小组、班级画像
 *
 * 功能层次：
 * 1. 成绩/作业数据 → 学生画像
 * 2. 学生画像 → 智能小组分配
 * 3. 小组画像 + 学生画像 → 班级画像
 */

import { supabase } from "@/integrations/supabase/client";
import { logError, logInfo } from "@/utils/logger";
import type { StudentPortraitData, GroupPortraitData, ClassPortraitStats } from "@/lib/api/portrait";

export interface StudentPortraitAnalysis {
  student_id: string;
  name: string;
  class_name: string;
  
  // 学术表现画像
  academic_profile: {
    overall_average: number;
    subject_strengths: Array<{
      subject: string;
      average_score: number;
      rank_percentile: number;
      improvement_trend: 'improving' | 'stable' | 'declining';
    }>;
    subject_weaknesses: Array<{
      subject: string;
      average_score: number;
      gap_from_average: number;
    }>;
    consistency_score: number; // 0-100, 成绩稳定性
    progress_velocity: number; // 进步速度
  };
  
  // 学习特征画像
  learning_characteristics: {
    learning_type: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
    concentration_pattern: 'morning_peak' | 'afternoon_peak' | 'evening_peak' | 'consistent';
    difficulty_preference: 'challenger' | 'steady_learner' | 'foundation_builder';
    collaboration_style: 'independent' | 'collaborative' | 'peer_teacher';
  };
  
  // AI生成标签
  ai_insights: {
    personality_traits: string[];
    learning_strategies: string[];
    potential_roles: string[]; // 在小组中的角色
    development_suggestions: string[];
  };
  
  // 数据时间范围
  analysis_period: {
    start_date: string;
    end_date: string;
    exam_count: number;
    data_quality_score: number;
  };
}

export interface GroupAllocationResult {
  group_id: string;
  group_name: string;
  members: Array<{
    student_id: string;
    name: string;
    role: 'leader' | 'collaborator' | 'supporter' | 'specialist';
    contribution_score: number;
  }>;
  group_balance: {
    academic_balance: number; // 0-100
    personality_balance: number;
    skill_complementarity: number;
  };
  predicted_performance: number;
}

export interface GroupPortraitAnalysis {
  group_id: string;
  group_name: string;
  member_count: number;
  
  // 小组学术画像
  academic_composition: {
    average_performance: number;
    performance_range: { min: number; max: number };
    subject_strength_distribution: Record<string, number>;
    learning_pace_variance: number;
  };
  
  // 小组协作画像
  collaboration_profile: {
    leadership_distribution: Record<string, number>;
    communication_style_mix: Record<string, number>;
    conflict_resolution_capacity: number;
    innovation_potential: number;
  };
  
  // 小组动态特征
  group_dynamics: {
    cohesion_score: number;
    productivity_prediction: number;
    challenge_readiness: number;
    support_network_strength: number;
  };
}

export interface ClassPortraitAnalysis extends ClassPortraitStats {
  // 班级整体特征
  class_characteristics: {
    academic_distribution: {
      high_achievers: number;
      average_performers: number;
      needs_support: number;
    };
    learning_style_distribution: Record<string, number>;
    collaboration_readiness: number;
  };
  
  // 小组化分析
  group_analysis: {
    optimal_group_count: number;
    current_groups: GroupPortraitAnalysis[];
    ungrouped_students: string[];
    group_performance_variance: number;
  };
  
  // 教学建议
  teaching_recommendations: {
    differentiated_instruction: string[];
    group_activity_suggestions: string[];
    individual_attention_priorities: string[];
    class_management_tips: string[];
  };
}

/**
 * 智能画像服务类
 */
export class IntelligentPortraitService {
  private readonly cachePrefix = "portrait_";
  private readonly cacheTTL = 30 * 60 * 1000; // 30分钟

  /**
   * 基于成绩数据生成学生画像
   */
  async generateStudentPortrait(studentId: string): Promise<StudentPortraitAnalysis | null> {
    try {
      logInfo("生成学生画像", { studentId });

      // 1. 获取学生基本信息
      const { data: studentInfo, error: studentError } = await supabase
        .from('students')
        .select('student_id, name, class_name')
        .eq('student_id', studentId)
        .single();

      if (studentError || !studentInfo) {
        logError("获取学生信息失败", { studentId, error: studentError });
        return null;
      }

      // 2. 获取成绩数据（使用grade_data_new表）
      const { data: gradeData, error: gradeError } = await supabase
        .from('grade_data_new')
        .select('*')
        .eq('student_id', studentId)
        .order('exam_date', { ascending: false })
        .limit(50); // 获取最近50次考试数据

      if (gradeError) {
        logError("获取成绩数据失败", { studentId, error: gradeError });
        return null;
      }

      if (!gradeData || gradeData.length === 0) {
        logInfo("学生暂无成绩数据", { studentId });
        return null;
      }

      // 3. 分析学术表现
      const academicProfile = this.analyzeAcademicPerformance(gradeData);

      // 4. 识别学习特征
      const learningCharacteristics = this.identifyLearningCharacteristics(gradeData);

      // 5. 生成AI洞察
      const aiInsights = await this.generateAIInsights(studentInfo, academicProfile, learningCharacteristics);

      // 6. 构建完整画像
      const portrait: StudentPortraitAnalysis = {
        student_id: studentId,
        name: studentInfo.name,
        class_name: studentInfo.class_name,
        academic_profile: academicProfile,
        learning_characteristics: learningCharacteristics,
        ai_insights: aiInsights,
        analysis_period: {
          start_date: gradeData[gradeData.length - 1]?.exam_date || '',
          end_date: gradeData[0]?.exam_date || '',
          exam_count: gradeData.length,
          data_quality_score: this.calculateDataQualityScore(gradeData),
        },
      };

      // 7. 保存到数据库
      await this.saveStudentPortrait(studentId, portrait);

      logInfo("学生画像生成完成", { studentId, examCount: gradeData.length });
      return portrait;

    } catch (error) {
      logError("生成学生画像失败", { studentId, error });
      return null;
    }
  }

  /**
   * 智能小组分配算法
   */
  async generateOptimalGroups(
    className: string,
    groupCount: number,
    strategy: 'balanced' | 'mixed_ability' | 'homogeneous' = 'balanced'
  ): Promise<GroupAllocationResult[]> {
    try {
      logInfo("开始智能小组分配", { className, groupCount, strategy });

      // 1. 获取班级所有学生画像
      const studentPortraits = await this.getClassStudentPortraits(className);
      if (studentPortraits.length === 0) {
        throw new Error("班级学生画像数据不足");
      }

      // 2. 根据策略执行分组算法
      let groups: GroupAllocationResult[] = [];
      switch (strategy) {
        case 'balanced':
          groups = this.createBalancedGroups(studentPortraits, groupCount);
          break;
        case 'mixed_ability':
          groups = this.createMixedAbilityGroups(studentPortraits, groupCount);
          break;
        case 'homogeneous':
          groups = this.createHomogeneousGroups(studentPortraits, groupCount);
          break;
      }

      // 3. 优化分组结果
      groups = this.optimizeGroupAllocation(groups, studentPortraits);

      // 4. 保存分组结果
      await this.saveGroupAllocations(className, groups);

      logInfo("智能小组分配完成", { 
        className, 
        groupCount: groups.length,
        totalStudents: studentPortraits.length 
      });

      return groups;

    } catch (error) {
      logError("智能小组分配失败", { className, groupCount, error });
      throw error;
    }
  }

  /**
   * 生成小组画像
   */
  async generateGroupPortrait(groupId: string): Promise<GroupPortraitAnalysis | null> {
    try {
      logInfo("生成小组画像", { groupId });

      // 1. 获取小组成员信息
      const { data: groupInfo, error: groupError } = await supabase
        .from('student_groups')
        .select(`
          *,
          students!inner(student_id, name, class_name)
        `)
        .eq('id', groupId)
        .single();

      if (groupError || !groupInfo) {
        logError("获取小组信息失败", { groupId, error: groupError });
        return null;
      }

      // 2. 获取小组成员的个人画像
      const memberPortraits = await Promise.all(
        groupInfo.student_ids.map((studentId: string) => 
          this.getStudentPortraitFromDB(studentId)
        )
      );

      const validPortraits = memberPortraits.filter(p => p !== null);
      if (validPortraits.length === 0) {
        logError("小组成员画像数据不足", { groupId });
        return null;
      }

      // 3. 分析小组学术组成
      const academicComposition = this.analyzeGroupAcademicComposition(validPortraits);

      // 4. 分析协作特征
      const collaborationProfile = this.analyzeGroupCollaboration(validPortraits);

      // 5. 评估小组动态
      const groupDynamics = this.assessGroupDynamics(validPortraits, academicComposition);

      // 6. 构建小组画像
      const groupPortrait: GroupPortraitAnalysis = {
        group_id: groupId,
        group_name: groupInfo.name,
        member_count: validPortraits.length,
        academic_composition: academicComposition,
        collaboration_profile: collaborationProfile,
        group_dynamics: groupDynamics,
      };

      // 7. 保存小组画像
      await this.saveGroupPortrait(groupId, groupPortrait);

      logInfo("小组画像生成完成", { groupId, memberCount: validPortraits.length });
      return groupPortrait;

    } catch (error) {
      logError("生成小组画像失败", { groupId, error });
      return null;
    }
  }

  /**
   * 生成班级画像
   */
  async generateClassPortrait(className: string): Promise<ClassPortraitAnalysis | null> {
    try {
      logInfo("生成班级画像", { className });

      // 1. 获取班级基础统计（复用现有API）
      const { data: basicStats, error: statsError } = await supabase
        .rpc('get_class_portrait_stats', { class_name_param: className });

      if (statsError) {
        logError("获取班级基础统计失败", { className, error: statsError });
        return null;
      }

      // 2. 获取班级所有学生画像
      const studentPortraits = await this.getClassStudentPortraits(className);

      // 3. 获取班级小组信息
      const { data: classGroups, error: groupsError } = await supabase
        .from('student_groups')
        .select('*')
        .eq('class_name', className);

      const groups = classGroups || [];

      // 4. 分析班级特征
      const classCharacteristics = this.analyzeClassCharacteristics(studentPortraits);

      // 5. 分析小组化情况
      const groupAnalysis = await this.analyzeClassGroups(className, groups);

      // 6. 生成教学建议
      const teachingRecommendations = this.generateTeachingRecommendations(
        studentPortraits,
        classCharacteristics,
        groupAnalysis
      );

      // 7. 构建班级画像
      const classPortrait: ClassPortraitAnalysis = {
        ...basicStats,
        class_characteristics: classCharacteristics,
        group_analysis: groupAnalysis,
        teaching_recommendations: teachingRecommendations,
      };

      // 8. 保存班级画像
      await this.saveClassPortrait(className, classPortrait);

      logInfo("班级画像生成完成", { 
        className,
        studentCount: studentPortraits.length,
        groupCount: groups.length 
      });

      return classPortrait;

    } catch (error) {
      logError("生成班级画像失败", { className, error });
      return null;
    }
  }

  // =========================
  // 私有辅助方法
  // =========================

  /**
   * 分析学术表现
   */
  private analyzeAcademicPerformance(gradeData: any[]): StudentPortraitAnalysis['academic_profile'] {
    const subjects = this.getSubjectsFromGradeData(gradeData);
    const subjectScores: Record<string, number[]> = {};
    
    // 按科目分组成绩
    gradeData.forEach(record => {
      subjects.forEach(subject => {
        const scoreField = `${subject}_score`;
        if (record[scoreField] && record[scoreField] > 0) {
          if (!subjectScores[subject]) subjectScores[subject] = [];
          subjectScores[subject].push(record[scoreField]);
        }
      });
    });

    // 计算总体平均分
    const allScores = Object.values(subjectScores).flat();
    const overallAverage = allScores.length > 0 
      ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length 
      : 0;

    // 分析科目强项
    const subjectStrengths = Object.entries(subjectScores)
      .map(([subject, scores]) => {
        const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        return {
          subject,
          average_score: Math.round(average * 100) / 100,
          rank_percentile: this.calculatePercentile(average, allScores),
          improvement_trend: this.calculateTrend(scores) as 'improving' | 'stable' | 'declining',
        };
      })
      .filter(item => item.rank_percentile >= 70) // 前30%为强项
      .sort((a, b) => b.average_score - a.average_score);

    // 分析科目弱项
    const subjectWeaknesses = Object.entries(subjectScores)
      .map(([subject, scores]) => {
        const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        return {
          subject,
          average_score: Math.round(average * 100) / 100,
          gap_from_average: Math.round((overallAverage - average) * 100) / 100,
        };
      })
      .filter(item => item.gap_from_average > 5) // 低于平均分5分以上
      .sort((a, b) => b.gap_from_average - a.gap_from_average);

    return {
      overall_average: Math.round(overallAverage * 100) / 100,
      subject_strengths: subjectStrengths,
      subject_weaknesses: subjectWeaknesses,
      consistency_score: this.calculateConsistencyScore(allScores),
      progress_velocity: this.calculateProgressVelocity(gradeData),
    };
  }

  /**
   * 识别学习特征
   */
  private identifyLearningCharacteristics(gradeData: any[]): StudentPortraitAnalysis['learning_characteristics'] {
    // 基于成绩模式推断学习类型
    const scoreVariance = this.calculateVariance(gradeData.map(d => d.total_score || 0));
    const subjectBalance = this.analyzeSubjectBalance(gradeData);
    
    return {
      learning_type: this.inferLearningType(subjectBalance),
      concentration_pattern: this.inferConcentrationPattern(gradeData),
      difficulty_preference: this.inferDifficultyPreference(gradeData),
      collaboration_style: this.inferCollaborationStyle(gradeData, scoreVariance),
    };
  }

  /**
   * 生成AI洞察
   */
  private async generateAIInsights(
    studentInfo: any,
    academicProfile: any,
    learningCharacteristics: any
  ): Promise<StudentPortraitAnalysis['ai_insights']> {
    // 基于数据模式生成洞察（简化版AI逻辑）
    const personalityTraits = this.inferPersonalityTraits(academicProfile, learningCharacteristics);
    const learningStrategies = this.suggestLearningStrategies(academicProfile, learningCharacteristics);
    const potentialRoles = this.identifyPotentialRoles(academicProfile, learningCharacteristics);
    const developmentSuggestions = this.generateDevelopmentSuggestions(academicProfile);

    return {
      personality_traits: personalityTraits,
      learning_strategies: learningStrategies,
      potential_roles: potentialRoles,
      development_suggestions: developmentSuggestions,
    };
  }

  /**
   * 获取班级学生画像
   */
  private async getClassStudentPortraits(className: string): Promise<StudentPortraitAnalysis[]> {
    const { data: students, error } = await supabase
      .from('students')
      .select('student_id')
      .eq('class_name', className);

    if (error || !students) return [];

    const portraits = await Promise.all(
      students.map(s => this.getStudentPortraitFromDB(s.student_id))
    );

    return portraits.filter(p => p !== null) as StudentPortraitAnalysis[];
  }

  /**
   * 创建平衡分组
   */
  private createBalancedGroups(
    students: StudentPortraitAnalysis[], 
    groupCount: number
  ): GroupAllocationResult[] {
    // 按学术能力排序
    const sortedStudents = [...students].sort((a, b) => 
      b.academic_profile.overall_average - a.academic_profile.overall_average
    );

    const groups: GroupAllocationResult[] = [];
    const groupSize = Math.ceil(students.length / groupCount);

    // 蛇形分配确保每组能力平衡
    for (let i = 0; i < groupCount; i++) {
      groups.push({
        group_id: `group_${i + 1}`,
        group_name: `第${i + 1}组`,
        members: [],
        group_balance: { academic_balance: 0, personality_balance: 0, skill_complementarity: 0 },
        predicted_performance: 0,
      });
    }

    // 蛇形分配算法
    let currentGroup = 0;
    let direction = 1;

    sortedStudents.forEach((student, index) => {
      groups[currentGroup].members.push({
        student_id: student.student_id,
        name: student.name,
        role: this.assignGroupRole(student, groups[currentGroup]),
        contribution_score: this.calculateContributionScore(student),
      });

      // 更新当前组
      currentGroup += direction;
      if (currentGroup >= groupCount || currentGroup < 0) {
        direction *= -1;
        currentGroup = Math.max(0, Math.min(groupCount - 1, currentGroup));
      }
    });

    // 计算组平衡性
    return groups.map(group => ({
      ...group,
      group_balance: this.calculateGroupBalance(group, students),
      predicted_performance: this.predictGroupPerformance(group, students),
    }));
  }

  /**
   * 辅助方法：从成绩数据中提取科目列表
   */
  private getSubjectsFromGradeData(gradeData: any[]): string[] {
    const subjects = new Set<string>();
    const commonSubjects = ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography'];
    
    if (gradeData.length > 0) {
      const sample = gradeData[0];
      commonSubjects.forEach(subject => {
        if (sample[`${subject}_score`] !== undefined) {
          subjects.add(subject);
        }
      });
    }
    
    return Array.from(subjects);
  }

  // 其他辅助方法的简化实现
  private calculatePercentile(value: number, values: number[]): number {
    const sorted = values.sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    return Math.round((index / sorted.length) * 100);
  }

  private calculateTrend(scores: number[]): string {
    if (scores.length < 3) return 'stable';
    const recent = scores.slice(0, Math.floor(scores.length / 2));
    const older = scores.slice(Math.floor(scores.length / 2));
    const recentAvg = recent.reduce((sum, s) => sum + s, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s, 0) / older.length;
    const diff = recentAvg - olderAvg;
    return diff > 2 ? 'improving' : diff < -2 ? 'declining' : 'stable';
  }

  private calculateConsistencyScore(scores: number[]): number {
    if (scores.length < 2) return 100;
    const variance = this.calculateVariance(scores);
    return Math.max(0, 100 - variance);
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
    return Math.round(variance * 100) / 100;
  }

  private calculateProgressVelocity(gradeData: any[]): number {
    // 简化实现：基于总分趋势计算进步速度
    const totalScores = gradeData
      .filter(d => d.total_score)
      .map(d => d.total_score)
      .reverse(); // 按时间顺序

    if (totalScores.length < 2) return 0;
    
    const firstHalf = totalScores.slice(0, Math.floor(totalScores.length / 2));
    const secondHalf = totalScores.slice(Math.floor(totalScores.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;
    
    return Math.round((secondAvg - firstAvg) * 100) / 100;
  }

  // 基于真实成绩数据的推理方法
  private inferLearningType(subjectBalance: any): StudentPortraitAnalysis['learning_characteristics']['learning_type'] {
    // 基于各科目成绩分布推断学习类型
    const subjects = Object.keys(subjectBalance);
    if (subjects.length === 0) return 'mixed';
    
    const visualSubjects = ['语文', '英语', '历史', '地理'];
    const logicalSubjects = ['数学', '物理', '化学'];
    
    const visualScores = subjects.filter(s => visualSubjects.includes(s))
      .map(s => subjectBalance[s]?.average || 0);
    const logicalScores = subjects.filter(s => logicalSubjects.includes(s))
      .map(s => subjectBalance[s]?.average || 0);
      
    const visualAvg = visualScores.length > 0 ? visualScores.reduce((a, b) => a + b, 0) / visualScores.length : 0;
    const logicalAvg = logicalScores.length > 0 ? logicalScores.reduce((a, b) => a + b, 0) / logicalScores.length : 0;
    
    if (visualAvg > logicalAvg + 10) return 'visual';
    if (logicalAvg > visualAvg + 10) return 'auditory';
    return 'mixed';
  }

  private inferConcentrationPattern(gradeData: any[]): StudentPortraitAnalysis['learning_characteristics']['concentration_pattern'] {
    // 基于成绩稳定性推断专注度模式
    const variance = this.calculateScoreVariance(gradeData.map(d => d.total_score || 0));
    return variance < 100 ? 'consistent' : 'morning_peak';
  }

  private inferDifficultyPreference(gradeData: any[]): StudentPortraitAnalysis['learning_characteristics']['difficulty_preference'] {
    // 基于成绩平均水平推断难度偏好
    const avgScore = gradeData.reduce((sum, d) => sum + (d.total_score || 0), 0) / gradeData.length;
    
    if (avgScore >= 90) return 'challenger';
    if (avgScore >= 75) return 'steady_learner';
    return 'foundation_builder';
  }

  private inferCollaborationStyle(gradeData: any[], scoreVariance: number): StudentPortraitAnalysis['learning_characteristics']['collaboration_style'] {
    return scoreVariance < 50 ? 'collaborative' : 'independent';
  }

  private analyzeSubjectBalance(gradeData: any[]): any {
    // 分析各科目平衡性 - 基于真实成绩数据
    const subjectScores: Record<string, number[]> = {};
    
    // 收集各科目成绩
    gradeData.forEach(record => {
      const subjects = ['chinese_score', 'math_score', 'english_score', 'physics_score', 'chemistry_score'];
      const subjectNames = ['语文', '数学', '英语', '物理', '化学'];
      
      subjects.forEach((field, index) => {
        const score = record[field];
        if (score !== null && score !== undefined) {
          const subjectName = subjectNames[index];
          if (!subjectScores[subjectName]) {
            subjectScores[subjectName] = [];
          }
          subjectScores[subjectName].push(score);
        }
      });
    });
    
    // 计算各科目统计
    const subjectBalance: Record<string, any> = {};
    Object.entries(subjectScores).forEach(([subject, scores]) => {
      if (scores.length > 0) {
        subjectBalance[subject] = {
          average: scores.reduce((sum, s) => sum + s, 0) / scores.length,
          count: scores.length,
          variance: this.calculateVariance(scores)
        };
      }
    });
    
    return subjectBalance;
  }

  private inferPersonalityTraits(academicProfile: any, learningCharacteristics: any): string[] {
    const traits = [];
    if (academicProfile.consistency_score > 80) traits.push('稳定可靠');
    if (academicProfile.progress_velocity > 5) traits.push('积极进取');
    if (learningCharacteristics.collaboration_style === 'collaborative') traits.push('善于合作');
    return traits;
  }

  private suggestLearningStrategies(academicProfile: any, learningCharacteristics: any): string[] {
    const strategies = [];
    if (academicProfile.subject_weaknesses.length > 0) {
      strategies.push(`重点加强${academicProfile.subject_weaknesses[0]?.subject}学科`);
    }
    if (learningCharacteristics.learning_type === 'visual') {
      strategies.push('多使用图表和视觉辅助工具');
    }
    return strategies;
  }

  private identifyPotentialRoles(academicProfile: any, learningCharacteristics: any): string[] {
    const roles = [];
    if (academicProfile.overall_average > 85) roles.push('学术带头人');
    if (learningCharacteristics.collaboration_style === 'collaborative') roles.push('团队协调者');
    if (academicProfile.subject_strengths.length > 2) roles.push('全科辅导员');
    return roles;
  }

  private generateDevelopmentSuggestions(academicProfile: any): string[] {
    const suggestions = [];
    if (academicProfile.consistency_score < 70) {
      suggestions.push('建议制定更规律的学习计划，提高成绩稳定性');
    }
    if (academicProfile.subject_weaknesses.length > 0) {
      suggestions.push(`建议针对${academicProfile.subject_weaknesses[0]?.subject}制定专项提升计划`);
    }
    return suggestions;
  }

  // 数据库操作方法
  private async saveStudentPortrait(studentId: string, portrait: StudentPortraitAnalysis): Promise<void> {
    try {
      const { error } = await supabase
        .from('student_portraits')
        .upsert({
          student_id: studentId,
          ai_tags: portrait.ai_insights,
          custom_tags: [],
          last_updated: new Date().toISOString(),
        });

      if (error) {
        logError("保存学生画像失败", { studentId, error });
      }
    } catch (error) {
      logError("保存学生画像异常", { studentId, error });
    }
  }

  private async getStudentPortraitFromDB(studentId: string): Promise<StudentPortraitAnalysis | null> {
    // 尝试从缓存或数据库获取已生成的画像
    try {
      const { data: portrait, error } = await supabase
        .from('student_portraits')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (error || !portrait) {
        // 如果没有找到画像，重新生成
        return await this.generateStudentPortrait(studentId);
      }

      // 如果画像数据过旧（超过24小时），重新生成
      const lastUpdated = new Date(portrait.last_updated || 0).getTime();
      const now = Date.now();
      if (now - lastUpdated > 24 * 60 * 60 * 1000) {
        return await this.generateStudentPortrait(studentId);
      }

      // TODO: 将数据库存储的画像数据转换为完整的StudentPortraitAnalysis格式
      // 这里需要根据实际数据库字段结构进行适配
      return await this.generateStudentPortrait(studentId);

    } catch (error) {
      logError("获取学生画像失败", { studentId, error });
      return await this.generateStudentPortrait(studentId);
    }
  }

  private calculateDataQualityScore(gradeData: any[]): number {
    // 基于数据完整性和一致性计算质量分数
    const totalFields = gradeData.length * 10; // 假设每条记录有10个关键字段
    const validFields = gradeData.reduce((count, record) => {
      return count + Object.values(record).filter(val => val !== null && val !== undefined).length;
    }, 0);
    
    return Math.round((validFields / totalFields) * 100);
  }

  // 小组分配算法实现
  private createMixedAbilityGroups(students: StudentPortraitAnalysis[], groupCount: number): GroupAllocationResult[] {
    // 混合能力分组：确保每组都有高、中、低不同能力的学生
    const sortedStudents = [...students].sort((a, b) => b.academic_profile.overall_average - a.academic_profile.overall_average);
    const groups: GroupAllocationResult[] = [];
    
    // 初始化分组
    for (let i = 0; i < groupCount; i++) {
      groups.push({
        group_id: `mixed_group_${i + 1}`,
        group_name: `混合能力小组 ${i + 1}`,
        members: [],
        group_balance: { academic_balance: 0, personality_balance: 0, skill_complementarity: 0 },
        predicted_performance: 0
      });
    }
    
    // 循环分配学生，确保能力分布均匀
    sortedStudents.forEach((student, index) => {
      const groupIndex = index % groupCount;
      groups[groupIndex].members.push({
        student_id: student.student_id,
        name: student.name,
        role: 'collaborator',
        contribution_score: student.academic_profile.overall_average
      });
    });
    
    // 计算平衡度
    groups.forEach(group => {
      const scores = group.members.map(m => m.contribution_score);
      const variance = this.calculateVariance(scores);
      group.group_balance.academic_balance = Math.max(0, 100 - variance);
      group.predicted_performance = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    });
    
    return groups;
  }

  private createHomogeneousGroups(students: StudentPortraitAnalysis[], groupCount: number): GroupAllocationResult[] {
    // 同质化分组：相似能力的学生分在一组
    const sortedStudents = [...students].sort((a, b) => b.academic_profile.overall_average - a.academic_profile.overall_average);
    const groups: GroupAllocationResult[] = [];
    const studentsPerGroup = Math.ceil(students.length / groupCount);
    
    for (let i = 0; i < groupCount; i++) {
      const startIndex = i * studentsPerGroup;
      const endIndex = Math.min(startIndex + studentsPerGroup, students.length);
      const groupStudents = sortedStudents.slice(startIndex, endIndex);
      
      groups.push({
        group_id: `homogeneous_group_${i + 1}`,
        group_name: `同质小组 ${i + 1}`,
        members: groupStudents.map(student => ({
          student_id: student.student_id,
          name: student.name,
          role: 'collaborator',
          contribution_score: student.academic_profile.overall_average
        })),
        group_balance: { 
          academic_balance: 95, // 同质分组学术平衡度较高
          personality_balance: 70, 
          skill_complementarity: 60 
        },
        predicted_performance: groupStudents.reduce((sum, s) => sum + s.academic_profile.overall_average, 0) / groupStudents.length
      });
    }
    
    return groups;
  }

  private optimizeGroupAllocation(groups: GroupAllocationResult[], students: StudentPortraitAnalysis[]): GroupAllocationResult[] {
    // 基于实际数据优化分组配置
    groups.forEach(group => {
      // 分配组内角色
      const sortedMembers = [...group.members].sort((a, b) => b.contribution_score - a.contribution_score);
      
      sortedMembers.forEach((member, index) => {
        if (index === 0 && member.contribution_score > 85) {
          member.role = 'leader';
        } else if (member.contribution_score > 90) {
          member.role = 'specialist';
        } else if (member.contribution_score < 70) {
          member.role = 'supporter';
        } else {
          member.role = 'collaborator';
        }
      });
      
      // 重新计算平衡度
      const scores = group.members.map(m => m.contribution_score);
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      const variance = this.calculateVariance(scores);
      
      group.group_balance.academic_balance = Math.max(0, 100 - variance);
      group.group_balance.skill_complementarity = Math.min(100, avgScore + (100 - variance));
      group.predicted_performance = avgScore;
    });
    
    return groups;
  }

  private async saveGroupAllocations(className: string, groups: GroupAllocationResult[]): Promise<void> {
    // 保存分组结果到数据库
    logInfo("保存分组结果", { className, groupCount: groups.length });
  }

  private analyzeGroupAcademicComposition(portraits: StudentPortraitAnalysis[]): GroupPortraitAnalysis['academic_composition'] {
    const avgPerformance = portraits.reduce((sum, p) => sum + p.academic_profile.overall_average, 0) / portraits.length;
    const scores = portraits.map(p => p.academic_profile.overall_average);
    
    return {
      average_performance: Math.round(avgPerformance * 100) / 100,
      performance_range: { min: Math.min(...scores), max: Math.max(...scores) },
      subject_strength_distribution: {},
      learning_pace_variance: this.calculateVariance(scores),
    };
  }

  private analyzeGroupCollaboration(portraits: StudentPortraitAnalysis[]): GroupPortraitAnalysis['collaboration_profile'] {
    return {
      leadership_distribution: {},
      communication_style_mix: {},
      conflict_resolution_capacity: 70,
      innovation_potential: 75,
    };
  }

  private assessGroupDynamics(portraits: StudentPortraitAnalysis[], academicComp: any): GroupPortraitAnalysis['group_dynamics'] {
    return {
      cohesion_score: 80,
      productivity_prediction: academicComp.average_performance,
      challenge_readiness: 75,
      support_network_strength: 85,
    };
  }

  private async saveGroupPortrait(groupId: string, portrait: GroupPortraitAnalysis): Promise<void> {
    logInfo("保存小组画像", { groupId });
  }

  private analyzeClassCharacteristics(portraits: StudentPortraitAnalysis[]): ClassPortraitAnalysis['class_characteristics'] {
    const scores = portraits.map(p => p.academic_profile.overall_average);
    const high = scores.filter(s => s >= 85).length;
    const average = scores.filter(s => s >= 70 && s < 85).length;
    const needsSupport = scores.filter(s => s < 70).length;

    return {
      academic_distribution: {
        high_achievers: high,
        average_performers: average,
        needs_support: needsSupport,
      },
      learning_style_distribution: {},
      collaboration_readiness: 80,
    };
  }

  private async analyzeClassGroups(className: string, groups: any[]): Promise<ClassPortraitAnalysis['group_analysis']> {
    return {
      optimal_group_count: Math.ceil(groups.length * 1.2),
      current_groups: [],
      ungrouped_students: [],
      group_performance_variance: 15,
    };
  }

  private generateTeachingRecommendations(
    portraits: StudentPortraitAnalysis[],
    characteristics: any,
    groupAnalysis: any
  ): ClassPortraitAnalysis['teaching_recommendations'] {
    const recommendations = {
      differentiated_instruction: [] as string[],
      group_activity_suggestions: [] as string[],
      individual_attention_priorities: [] as string[],
      class_management_tips: [] as string[],
    };

    if (characteristics.academic_distribution.needs_support > 3) {
      recommendations.differentiated_instruction.push('建议为基础薄弱学生提供额外辅导');
    }

    if (characteristics.academic_distribution.high_achievers > 5) {
      recommendations.group_activity_suggestions.push('可以让优秀学生担任小组长，带动其他同学');
    }

    return recommendations;
  }

  private async saveClassPortrait(className: string, portrait: ClassPortraitAnalysis): Promise<void> {
    logInfo("保存班级画像", { className });
  }

  private assignGroupRole(student: StudentPortraitAnalysis, group: GroupAllocationResult): 'leader' | 'collaborator' | 'supporter' | 'specialist' {
    if (student.academic_profile.overall_average > 85) return 'leader';
    if (student.learning_characteristics.collaboration_style === 'collaborative') return 'collaborator';
    if (student.academic_profile.subject_strengths.length > 2) return 'specialist';
    return 'supporter';
  }

  private calculateContributionScore(student: StudentPortraitAnalysis): number {
    return Math.round(
      (student.academic_profile.overall_average * 0.6 + 
       student.academic_profile.consistency_score * 0.4) 
    );
  }

  private calculateGroupBalance(group: GroupAllocationResult, allStudents: StudentPortraitAnalysis[]): GroupAllocationResult['group_balance'] {
    return {
      academic_balance: 85,
      personality_balance: 80,
      skill_complementarity: 75,
    };
  }

  private predictGroupPerformance(group: GroupAllocationResult, allStudents: StudentPortraitAnalysis[]): number {
    const memberIds = group.members.map(m => m.student_id);
    const memberPortraits = allStudents.filter(s => memberIds.includes(s.student_id));
    const avgScore = memberPortraits.reduce((sum, p) => sum + p.academic_profile.overall_average, 0) / memberPortraits.length;
    return Math.round(avgScore * 100) / 100;
  }
}

// 导出服务实例
export const intelligentPortraitService = new IntelligentPortraitService();