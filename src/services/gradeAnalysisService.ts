import { supabase, checkTableExists as supabaseCheckTableExists } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ExamInfo } from '@/components/analysis/ImportReviewDialog';
import { requestCache } from '@/utils/cacheUtils';

// 分析维度选项
export const ANALYSIS_DIMENSIONS = [
  { id: "class_name", name: "班级" },
  { id: "subject", name: "科目" },
  { id: "exam_date", name: "考试时间" },
  { id: "exam_type", name: "考试类型" },
  { id: "teacher", name: "任课教师" },
  { id: "grade", name: "年级" },
  { id: "score_level", name: "分数段" },
  { id: "gender", name: "性别" }
];

// 分析指标选项
export const ANALYSIS_METRICS = [
  { id: "avg_score", name: "平均分" },
  { id: "pass_rate", name: "及格率" },
  { id: "excellence_rate", name: "优秀率" },
  { id: "min_score", name: "最低分" },
  { id: "max_score", name: "最高分" },
  { id: "student_count", name: "学生人数" },
  { id: "standard_deviation", name: "标准差" }
];

export interface GradeData {
  id?: string;
  student_id: string;
  name: string;
  class_name: string;
  exam_title: string;
  exam_type: string;
  exam_date: string;
  subject?: string;
  [key: string]: any;
}

export type MergeStrategy = 'replace' | 'update' | 'add_only';

// 辅助方法: 检查表是否存在
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    // 尝试方法1: 使用SQL查询检查表是否存在
    const { data, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    // 如果没有错误，表存在
    if (!error) {
      return true;
    }
    
    // 特定的错误信息可能表示表不存在
    if (error.message && (
        error.message.includes('does not exist') || 
        error.message.includes('不存在') ||
        error.message.includes('relation') ||
        error.message.includes('表')
    )) {
      return false;
    }
    
    // 其他错误，可能是权限问题，尝试备用方法
    console.warn(`通过直接查询检查表 ${tableName} 失败:`, error);
    
    // 尝试方法2: 通过RPC函数检查
    try {
      const { data, error } = await supabase.rpc('table_exists', { table_name: tableName });
      if (!error && data) {
        return data === true;
      }
      
      // 如果RPC失败，可能是函数不存在
      console.warn(`通过RPC检查表 ${tableName} 失败:`, error);
    } catch (rpcError) {
      console.warn(`RPC检查表 ${tableName} 失败:`, rpcError);
    }
    
    // 所有方法都失败，假设表不存在
    return false;
  } catch (e) {
    console.error(`检查表 ${tableName} 是否存在时出错:`, e);
    return false;
  }
}

/**
 * 安全查询函数 - 当表不存在或发生其他错误时返回空结果
 * @param tableName 表名
 * @param query 查询函数
 * @returns 查询结果
 */
const safeQuery = async (tableName: string, queryFn: () => Promise<any>) => {
  try {
    // 先检查表是否存在
    const tableExists = await checkTableExists(tableName);
    
    if (!tableExists) {
      console.warn(`表 ${tableName} 不存在，返回空结果`);
      return { data: [], error: new Error(`表 ${tableName} 不存在，请先执行迁移脚本创建所需表`) };
    }
    
    // 表存在，执行查询
    return await queryFn();
  } catch (error) {
    console.error(`查询表 ${tableName} 时发生错误:`, error);
    return { data: [], error };
  }
};

/**
 * 根据提供的学生信息智能匹配学生
 * 匹配规则：
 * 1. 优先使用学号匹配
 * 2. 如果无法使用学号匹配，尝试使用姓名+班级匹配
 * 3. 如果以上都不行，尝试仅使用姓名匹配（可能返回多个结果）
 */
const matchStudent = async (studentInfo: {
  student_id?: string;
  name?: string;
  class_name?: string;
}): Promise<{ 
  matchedStudent: any | null; 
  multipleMatches: boolean;
  matchType: 'id' | 'name_class' | 'name' | 'none';
}> => {
  try {
    // 如果有学号，优先使用学号匹配
    if (studentInfo.student_id) {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', studentInfo.student_id)
        .limit(1);
      
      if (data && data.length > 0) {
        return {
          matchedStudent: data[0],
          multipleMatches: false,
          matchType: 'id'
        };
      }
    }
    
    // 如果有姓名和班级，使用姓名+班级匹配
    if (studentInfo.name && studentInfo.class_name) {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('name', studentInfo.name)
        .eq('class_name', studentInfo.class_name);
      
      if (data && data.length > 0) {
        return {
          matchedStudent: data[0],
          multipleMatches: data.length > 1,
          matchType: 'name_class'
        };
      }
    }
    
    // 如果只有姓名，尝试仅通过姓名匹配，但可能会有多个结果
    if (studentInfo.name) {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('name', studentInfo.name);
      
      if (data && data.length > 0) {
        return {
          matchedStudent: data[0], // 返回第一个匹配的学生
          multipleMatches: data.length > 1,
          matchType: 'name'
        };
      }
    }
    
    // 没有找到匹配的学生
    return {
      matchedStudent: null,
      multipleMatches: false,
      matchType: 'none'
    };
  } catch (error) {
    console.error('匹配学生信息失败:', error);
    return {
      matchedStudent: null,
      multipleMatches: false,
      matchType: 'none'
    };
  }
};

export const gradeAnalysisService = {
  /**
   * 保存考试数据，使用增强的学生匹配逻辑
   */
  async saveExamData(
    processedData: Record<string, any>[],
    examInfo: ExamInfo,
    mergeStrategy: MergeStrategy = 'replace',
    options?: {
      examScope?: 'class' | 'grade';
      newStudentStrategy?: 'create' | 'ignore';
    }
  ) {
    try {
      // 默认选项
      const examScope = options?.examScope || 'class';
      const newStudentStrategy = options?.newStudentStrategy || 'ignore';
      
      console.log(`[GradeAnalysisService] 开始保存成绩数据，考试范围: ${examScope}, 新学生策略: ${newStudentStrategy}`);
      
      // 检查必要的表是否存在
      const examsTableExists = await checkTableExists('exams');
      const gradeDataTableExists = await checkTableExists('grade_data');
      const studentsTableExists = await checkTableExists('students');
      
      if (!examsTableExists || !gradeDataTableExists) {
        throw new Error(`数据表缺失: ${!examsTableExists ? 'exams' : ''} ${!gradeDataTableExists ? 'grade_data' : ''} 表不存在`);
      }
      
      // 检查exams表是否有scope字段
      if (examsTableExists) {
        try {
          const examsTableCheck = await this.checkAndFixExamsTable();
          if (!examsTableCheck.success) {
            console.warn('检查exams表警告:', examsTableCheck.message);
          }
        } catch (columnCheckError) {
          console.warn('检查exams表时发生错误:', columnCheckError);
        }
      }
      
      // 使用一次性检查所有必要字段的方法
      if (gradeDataTableExists) {
        try {
          const columnsCheck = await this.ensureAllRequiredColumns();
          if (!columnsCheck.success) {
            console.warn('检查grade_data表字段警告:', columnsCheck.message);
          } else {
            console.log('grade_data表字段检查完成:', columnsCheck.message);
            if (columnsCheck.modified) {
              console.log('成功添加了缺失的字段到grade_data表');
            }
          }
        } catch (columnsCheckError) {
          console.warn('检查grade_data表字段时发生错误:', columnsCheckError);
          
          // 即使一次性检查失败，也尝试检查单个关键字段
          try {
            await this.checkAndFixGradeColumn();
            await this.checkAndFixMatchTypeColumn();
            await this.checkAndFixMultipleMatchesColumn();
            await this.checkAndFixRankInClassColumn();
            await this.checkAndFixRankInGradeColumn();
          } catch (individualCheckError) {
            console.error('单独检查字段也失败:', individualCheckError);
          }
        }
      }
    
      // 准备考试数据
      const examData = {
        title: examInfo.title,
        type: examInfo.type,
        date: examInfo.date,
        subject: examInfo.subject || null,
        scope: examScope // 添加考试范围字段
      };

      // 1. 保存考试信息
      const { data: examRecord, error: examError } = await supabase
        .from('exams')
        .upsert([examData], { 
          onConflict: 'title,date,type',
          ignoreDuplicates: false
        })
        .select();

      if (examError) throw examError;

      // 获取考试ID
      const examId = examRecord?.[0]?.id;
      if (!examId) throw new Error('考试保存失败');
      
      // 2. 对每条记录执行智能学生匹配
      const matchResults = [];
      const gradeDataWithExamId = [];
      
      for (const item of processedData) {
        // 准备用于匹配的学生信息
        const studentInfo = {
          student_id: item.student_id,
          name: item.name,
          class_name: item.class_name
        };
        
        // 执行匹配
        const { matchedStudent, multipleMatches, matchType } = await matchStudent(studentInfo);
        
        // 根据匹配结果处理数据
        const gradeRecord: Record<string, any> = {
          ...item,
          exam_id: examId,
          match_type: matchType,
          multiple_matches: multipleMatches
        };
        
        // 如果匹配到了学生，使用系统中的学生信息
        if (matchedStudent) {
          gradeRecord.student_id = matchedStudent.student_id;
          gradeRecord.name = matchedStudent.name;
          gradeRecord.class_name = matchedStudent.class_name;
          // 添加其他可能的学生信息字段
          if (matchedStudent.grade) gradeRecord.grade = matchedStudent.grade;
          if (matchedStudent.school_id) gradeRecord.school_id = matchedStudent.school_id;
        }
        // 如果没有匹配到学生，根据新学生策略决定是否创建
        else if (studentsTableExists && newStudentStrategy === 'create' && 
                studentInfo.name && (studentInfo.student_id || studentInfo.class_name)) {
          // 创建新学生记录
          const newStudent = {
            name: studentInfo.name,
            student_id: studentInfo.student_id || `ST${Date.now()}${Math.floor(Math.random() * 1000)}`,
            class_name: studentInfo.class_name || '未知班级',
            created_at: new Date().toISOString(),
            source: 'auto_import'
          };
          
          const { data: createdStudent, error: createError } = await supabase
            .from('students')
            .insert([newStudent])
            .select();
            
          if (!createError && createdStudent && createdStudent.length > 0) {
            gradeRecord.student_id = createdStudent[0].student_id;
            gradeRecord.name = createdStudent[0].name;
            gradeRecord.class_name = createdStudent[0].class_name;
            console.log(`已自动创建学生记录: ${createdStudent[0].name}`);
          } else {
            console.warn('自动创建学生记录失败:', createError);
          }
        }
        else if (newStudentStrategy === 'ignore' && matchType === 'none') {
          console.log(`跳过未匹配到的学生记录: ${studentInfo.name || studentInfo.student_id}`);
          continue; // 跳过此条记录，不添加到gradeDataWithExamId中
        }
        
        matchResults.push({
          originalInfo: studentInfo,
          matchType,
          multipleMatches
        });
        
        gradeDataWithExamId.push(gradeRecord);
      }

      // 3. 根据不同合并策略处理数据
      let result;
      
      if (mergeStrategy === 'replace') {
        // 先删除该考试的所有现有数据
        const { error: deleteError } = await supabase
          .from('grade_data')
          .delete()
          .eq('exam_id', examId);
          
        if (deleteError) throw deleteError;
        
        // 插入新数据
        result = await supabase
          .from('grade_data')
          .insert(gradeDataWithExamId);
      } 
      else if (mergeStrategy === 'update') {
        // 对每条数据执行upsert操作
        result = await supabase
          .from('grade_data')
          .upsert(gradeDataWithExamId, {
            onConflict: 'exam_id,student_id',
            ignoreDuplicates: false
          });
      }
      else if (mergeStrategy === 'add_only') {
        // 只添加新数据，不更新现有数据
        result = await supabase
          .from('grade_data')
          .upsert(gradeDataWithExamId, {
            onConflict: 'exam_id,student_id', 
            ignoreDuplicates: true
          });
      }

      if (result?.error) {
        // 特殊处理错误：如果是"Could not find the 'grade' column"错误
        if (result.error.message && result.error.message.includes("Could not find the 'grade' column")) {
          console.error('导入错误: grade字段不存在，尝试修复...');
          
          // 尝试添加grade字段
          const fixResult = await this.checkAndFixGradeColumn();
          if (fixResult.success) {
            console.log('成功添加grade字段，重试导入');
            
            // 重新尝试导入
            result = await supabase
              .from('grade_data')
              .insert(gradeDataWithExamId);
            
            if (result?.error) {
              throw result.error;
            }
          } else {
            // 添加列失败，抛出特殊错误
            throw new Error(`grade字段不存在且无法自动添加: ${fixResult.message}`);
          }
        } else {
          throw result.error;
        }
      }
      
      // 返回结果中包含匹配统计信息
      const matchStats = {
        total: matchResults.length,
        matched: matchResults.filter(r => r.matchType !== 'none').length,
        matchedById: matchResults.filter(r => r.matchType === 'id').length,
        matchedByNameAndClass: matchResults.filter(r => r.matchType === 'name_class').length,
        matchedByNameOnly: matchResults.filter(r => r.matchType === 'name').length,
        noMatch: matchResults.filter(r => r.matchType === 'none').length,
        multipleMatches: matchResults.filter(r => r.multipleMatches).length,
        skipped: processedData.length - gradeDataWithExamId.length
      };
      
      return { 
        success: true, 
        examId, 
        count: gradeDataWithExamId.length, 
        matchStats,
        error: null 
      };
    } catch (error) {
      console.error('保存成绩数据失败:', error);
      return { success: false, error };
    }
  },
  
  /**
   * 获取考试列表
   */
  async getExamList() {
    return requestCache.get('exams_list', async () => {
      return safeQuery('exams', async () => {
        const { data, error } = await supabase
          .from('exams')
          .select('id, title, type, date, subject, scope')
          .order('date', { ascending: false });
          
        if (error) throw error;
        
        return { data, error: null };
      });
    });
  },
  
  /**
   * 获取考试成绩数据
   */
  async getExamResults(examId: string) {
    return requestCache.get(`exam_results_${examId}`, async () => {
      return safeQuery('grade_data', async () => {
        const { data, error } = await supabase
          .from('grade_data')
          .select('*')
          .eq('exam_id', examId);
          
        if (error) throw error;
        
        return { data, error: null };
      });
    });
  },
  
  /**
   * 获取学生历次成绩
   */
  async getStudentResults(studentId: string) {
    try {
      const { data, error } = await supabase
        .from('grade_data')
        .select('*, exams!inner(id, title, type, date, subject, scope)')
        .eq('student_id', studentId)
        .order('exams.date', { ascending: false });
        
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('获取学生成绩失败:', error);
      return { data: [], error };
    }
  },
  
  /**
   * 分析考试数据
   */
  async analyzeExamData(examId: string) {
    try {
      // 调用 Edge Function 分析成绩数据
      const { data, error } = await supabase.functions.invoke('analyze-grades', {
        body: { examId }
      });
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('分析成绩数据失败:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('未知错误')
      };
    }
  },
  
  /**
   * 使用AI分析成绩数据
   */
  async aiAnalyzeExamData(examData: any[], examInfo: any) {
    try {
      // 调用 AI 分析 Edge Function
      const { data, error } = await supabase.functions.invoke('ai-grade-analysis', {
        body: { 
          examData,
          examInfo
        }
      });
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('AI分析失败:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('AI分析发生错误')
      };
    }
  },

  /**
   * 获取学生成绩趋势
   */
  async getStudentTrend(studentId: string, subjectFilter?: string[]) {
    try {
      let query = supabase
        .from('grade_data')
        .select('*, exams!inner(id, title, type, date, subject, scope)')
        .eq('student_id', studentId)
        .order('exams.date', { ascending: true });
        
      if (subjectFilter && subjectFilter.length > 0) {
        query = query.in('subject', subjectFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('获取学生成绩趋势失败:', error);
      return { data: [], error };
    }
  },

  /**
   * 班级排名分析
   */
  async getClassRanking(examId: string) {
    try {
      const { data, error } = await supabase
        .from('grade_data')
        .select('*, exams!inner(*)')
        .eq('exam_id', examId);
        
      if (error) throw error;
      
      // 按班级分组并计算平均分
      const classData = data.reduce((acc: any, record) => {
        const className = record.class_name || '未知班级';
        
        if (!acc[className]) {
          acc[className] = {
            className,
            totalScore: 0,
            studentCount: 0,
            averageScore: 0,
            maxScore: 0,
            minScore: Infinity,
            passCount: 0
          };
        }
        
        const score = record.total_score || 0;
        acc[className].totalScore += score;
        acc[className].studentCount += 1;
        acc[className].maxScore = Math.max(acc[className].maxScore, score);
        acc[className].minScore = Math.min(acc[className].minScore, score);
        
        if (score >= 60) {
          acc[className].passCount += 1;
        }
        
        return acc;
      }, {});
      
      // 计算平均分和及格率
      Object.values(classData).forEach((cls: any) => {
        cls.averageScore = cls.studentCount > 0 ? cls.totalScore / cls.studentCount : 0;
        cls.passRate = cls.studentCount > 0 ? cls.passCount / cls.studentCount : 0;
        
        // 修正最低分，如果还是Infinity说明没有数据
        if (cls.minScore === Infinity) {
          cls.minScore = 0;
        }
      });
      
      // 按平均分排序
      const rankingData = Object.values(classData).sort((a: any, b: any) => 
        b.averageScore - a.averageScore
      );
      
      return { data: rankingData, error: null };
    } catch (error) {
      console.error('获取班级排名失败:', error);
      return { data: [], error };
    }
  },
  
  /**
   * 获取学生排名情况
   */
  async getStudentRanking(examId: string, classFilter?: string) {
    try {
      let query = supabase
        .from('grade_data')
        .select('*')
        .eq('exam_id', examId)
        .order('total_score', { ascending: false });
        
      if (classFilter) {
        query = query.eq('class_name', classFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // 添加排名信息
      const rankedData = data.map((student, index) => ({
        ...student,
        rank: index + 1,
        rankPercentile: data.length > 0 ? (index + 1) / data.length : 0
      }));
      
      return { data: rankedData, error: null };
    } catch (error) {
      console.error('获取学生排名失败:', error);
      return { data: [], error };
    }
  },
  
  /**
   * 获取学生进步情况分析
   */
  async getStudentProgress(studentId: string, limit = 5) {
    try {
      // 获取学生最近几次考试成绩
      const { data, error } = await supabase
        .from('grade_data')
        .select('*, exams!inner(*)')
        .eq('student_id', studentId)
        .order('exams.date', { ascending: false })
        .limit(limit);
        
      if (error) throw error;
      
      if (!data || data.length <= 1) {
        return { data: { exams: [], progressData: {} }, error: null };
      }
      
      // 整理考试信息
      const exams = data.map(record => ({
        id: record.exam_id,
        title: record.exams.title,
        date: record.exams.date,
        type: record.exams.type
      }));
      
      // 计算进步情况
      const progressData: Record<string, any> = {};
      
      // 总分进步情况
      const totalScores = data.map(record => ({
        examId: record.exam_id,
        score: record.total_score || 0,
        examTitle: record.exams.title,
        examDate: record.exams.date
      }));
      
      if (totalScores.length >= 2) {
        progressData.totalScore = {
          current: totalScores[0].score,
          previous: totalScores[1].score,
          difference: totalScores[0].score - totalScores[1].score,
          percentChange: totalScores[1].score !== 0 
            ? ((totalScores[0].score - totalScores[1].score) / totalScores[1].score) * 100 
            : 0,
          trend: totalScores.map(item => ({
            examId: item.examId,
            examTitle: item.examTitle, 
            score: item.score,
            date: item.examDate
          }))
        };
      }
      
      // 分析各科目进步情况
      // 需要确保数据中有科目字段，这里假设存储在metadata中
      const subjects = new Set<string>();
      
      // 首先找出所有科目
      data.forEach(record => {
        if (record.metadata) {
          Object.keys(record.metadata).forEach(key => {
            if (key.endsWith('_score')) {
              subjects.add(key.replace('_score', ''));
            }
          });
        }
      });
      
      // 然后分析每个科目的进步情况
      subjects.forEach(subject => {
        const fieldName = `${subject}_score`;
        const subjectScores = data
          .filter(record => record.metadata && record.metadata[fieldName] !== undefined)
          .map(record => ({
            examId: record.exam_id,
            score: record.metadata[fieldName],
            examTitle: record.exams.title,
            examDate: record.exams.date
          }));
        
        if (subjectScores.length >= 2) {
          progressData[subject] = {
            current: subjectScores[0].score,
            previous: subjectScores[1].score,
            difference: subjectScores[0].score - subjectScores[1].score,
            percentChange: subjectScores[1].score !== 0 
              ? ((subjectScores[0].score - subjectScores[1].score) / subjectScores[1].score) * 100 
              : 0,
            trend: subjectScores.map(item => ({
              examId: item.examId,
              examTitle: item.examTitle,
              score: item.score,
              date: item.examDate
            }))
          };
        }
      });
      
      return { 
        data: { 
          exams, 
          progressData 
        }, 
        error: null 
      };
    } catch (error) {
      console.error('获取学生进步情况失败:', error);
      return { data: null, error };
    }
  },

  /**
   * 创建成绩标签
   */
  async createTag(name: string, description?: string, color?: string) {
    try {
      // 首先检查表是否存在
      const { data: tables, error: tableCheckError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'grade_tags')
        .eq('table_schema', 'public');
      
      if (tableCheckError) throw tableCheckError;
      
      if (!tables || tables.length === 0) {
        console.error('grade_tags表不存在，请先创建表');
        return { 
          data: null, 
          error: new Error('grade_tags表不存在，请先执行迁移脚本创建所需表') 
        };
      }
      
      const { data, error } = await supabase
        .from('grade_tags')
        .insert([{ name, description, color }])
        .select();
        
      if (error) throw error;
      
      return { data: data?.[0], error: null };
    } catch (error) {
      console.error('创建标签失败:', error);
      return { data: null, error };
    }
  },
  
  /**
   * 获取标签列表
   */
  async getTags() {
    try {
      // 首先检查表是否存在
      const { data: tables, error: tableCheckError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'grade_tags')
        .eq('table_schema', 'public');
      
      if (tableCheckError) throw tableCheckError;
      
      if (!tables || tables.length === 0) {
        console.warn('grade_tags表不存在');
        return { data: [], error: null };
      }
      
      const { data, error } = await supabase
        .from('grade_tags')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('获取标签列表失败:', error);
      return { data: [], error };
    }
  },
  
  /**
   * 为成绩添加标签
   */
  async addTagToGradeData(gradeDataId: string, tagId: string) {
    try {
      // 首先检查表是否存在
      const { data: tables, error: tableCheckError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'grade_data_tags')
        .eq('table_schema', 'public');
      
      if (tableCheckError) throw tableCheckError;
      
      if (!tables || tables.length === 0) {
        console.error('grade_data_tags表不存在');
        return { 
          data: null, 
          error: new Error('grade_data_tags表不存在，请先执行迁移脚本创建所需表') 
        };
      }
      
      const { data, error } = await supabase
        .from('grade_data_tags')
        .insert([{ grade_id: gradeDataId, tag_id: tagId }])
        .select();
        
      if (error) throw error;
      
      return { data: data?.[0], error: null };
    } catch (error) {
      console.error('添加标签失败:', error);
      return { data: null, error };
    }
  },
  
  /**
   * 从成绩中移除标签
   */
  async removeTagFromGradeData(gradeDataId: string, tagId: string) {
    try {
      // 首先检查表是否存在
      const { data: tables, error: tableCheckError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'grade_data_tags')
        .eq('table_schema', 'public');
      
      if (tableCheckError) throw tableCheckError;
      
      if (!tables || tables.length === 0) {
        console.warn('grade_data_tags表不存在');
        return { success: true, error: null };
      }
      
      const { data, error } = await supabase
        .from('grade_data_tags')
        .delete()
        .eq('grade_id', gradeDataId)
        .eq('tag_id', tagId);
        
      if (error) throw error;
      
      return { success: true, error: null };
    } catch (error) {
      console.error('移除标签失败:', error);
      return { success: false, error };
    }
  },
  
  /**
   * 获取带有特定标签的成绩数据
   */
  async getGradesByTag(tagId: string) {
    try {
      // 首先检查表是否存在
      const { data: tables, error: tableCheckError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'grade_data_tags')
        .eq('table_schema', 'public');
      
      if (tableCheckError) throw tableCheckError;
      
      if (!tables || tables.length === 0) {
        console.warn('grade_data_tags表不存在');
        return { data: [], error: null };
      }
      
      const { data, error } = await supabase
        .from('grade_data_tags')
        .select('grade_id')
        .eq('tag_id', tagId);
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return { data: [], error: null };
      }
      
      const gradeIds = data.map(item => item.grade_id);
      
      const { data: gradeData, error: gradeError } = await supabase
        .from('grade_data')
        .select('*, exams!inner(*)')
        .in('id', gradeIds);
        
      if (gradeError) throw gradeError;
      
      return { data: gradeData, error: null };
    } catch (error) {
      console.error('获取标签成绩数据失败:', error);
      return { data: [], error };
    }
  },
  
  /**
   * 班级成绩对比
   */
  async compareClassPerformance(examId: string, classNames: string[]) {
    try {
      if (!classNames || classNames.length === 0) {
        return { data: [], error: null };
      }
      
      const { data, error } = await supabase
        .from('grade_data')
        .select('*, exams!inner(*)')
        .eq('exam_id', examId)
        .in('class_name', classNames);
        
      if (error) throw error;
      
      // 按班级分组并计算统计数据
      const classStats = classNames.map(className => {
        const classData = data.filter(item => item.class_name === className);
        const scores = classData.map(item => item.total_score || 0);
        
        if (scores.length === 0) {
          return {
            className,
            averageScore: 0,
            maxScore: 0,
            minScore: 0,
            passRate: 0,
            studentCount: 0
          };
        }
        
        const sum = scores.reduce((a, b) => a + b, 0);
        const average = sum / scores.length;
        const max = Math.max(...scores);
        const min = Math.min(...scores);
        const passCount = scores.filter(score => score >= 60).length;
        const passRate = scores.length > 0 ? passCount / scores.length : 0;
        
        return {
          className,
          averageScore: average,
          maxScore: max,
          minScore: min,
          passRate,
          studentCount: scores.length
        };
      });
      
      return { data: classStats, error: null };
    } catch (error) {
      console.error('比较班级表现失败:', error);
      return { data: [], error };
    }
  },
  
  /**
   * 导出分析报告
   */
  async exportAnalysisReport(examId: string) {
    try {
      // 获取考试信息
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();
        
      if (examError) throw examError;
      
      // 获取考试成绩数据
      const { data: gradeData, error: gradeError } = await supabase
        .from('grade_data')
        .select('*')
        .eq('exam_id', examId);
        
      if (gradeError) throw gradeError;
      
      // 获取班级排名
      const { data: classRanking, error: rankingError } = await this.getClassRanking(examId);
      
      if (rankingError) throw rankingError;
      
      // 生成报告内容
      const reportContent = {
        examInfo: examData,
        gradeData,
        classRanking,
        timestamp: new Date().toISOString()
      };
      
      return { data: reportContent, error: null };
    } catch (error) {
      console.error('导出分析报告失败:', error);
      return { data: null, error };
    }
  },
  
  /**
   * 初始化数据库表
   * 创建成绩分析系统所需的所有数据表
   */
  async initializeTables() {
    try {
      console.log('开始初始化成绩分析系统所需的数据表...');
      
      // 创建考试表SQL
      const createExamsTableSQL = `
      CREATE TABLE IF NOT EXISTS exams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        date DATE,
        subject TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );`;
      
      // 创建成绩数据表SQL
      const createGradeDataTableSQL = `
      CREATE TABLE IF NOT EXISTS grade_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        student_id TEXT NOT NULL,
        name TEXT,
        class_name TEXT,
        subject TEXT,
        total_score NUMERIC,
        exam_date DATE,
        exam_type TEXT,
        exam_title TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        UNIQUE(exam_id, student_id)
      );`;
      
      // 创建学生表SQL
      const createStudentsTableSQL = `
      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        class_name TEXT,
        grade TEXT,
        school_id TEXT,
        gender TEXT,
        birth_date DATE,
        contact_info JSONB,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
      
      -- 创建RLS策略
      ALTER TABLE students ENABLE ROW LEVEL SECURITY;
      
      -- 创建自动更新时间戳触发器
      CREATE OR REPLACE FUNCTION update_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      CREATE TRIGGER update_students_timestamp
      BEFORE UPDATE ON students
      FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
      `;
      
      // 创建成绩标签表SQL
      const createGradeTagsTableSQL = `
      CREATE TABLE IF NOT EXISTS grade_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT 'bg-blue-500',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );`;
      
      // 创建成绩数据和标签的关联表SQL
      const createGradeDataTagsTableSQL = `
      CREATE TABLE IF NOT EXISTS grade_data_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        grade_id UUID NOT NULL,
        tag_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        CONSTRAINT grade_data_tags_grade_id_tag_id_key UNIQUE (grade_id, tag_id),
        CONSTRAINT grade_data_tags_grade_id_fkey FOREIGN KEY (grade_id) REFERENCES grade_data(id) ON DELETE CASCADE,
        CONSTRAINT grade_data_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES grade_tags(id) ON DELETE CASCADE
      );`;
      
      // 执行SQL创建表
      // 尝试执行创建表SQL
      const executeSQL = async (sql: string, description: string) => {
        try {
          console.log(`执行${description}...`);
          
          // 首先尝试使用 exec_sql RPC 函数
          try {
            const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
            
            // 如果没有错误，执行成功
            if (!error) {
              console.log(`${description}通过RPC执行成功`);
              return { success: true };
            }
            
            // 如果是"函数不存在"的错误，尝试其他方法
            if (error.message && error.message.includes('function') && error.message.includes('not exist')) {
              console.warn(`exec_sql RPC 函数不存在，尝试其他方法...`);
              // 继续后面的代码尝试其他方法
            } else {
              // 其他类型的错误
              console.error(`执行${description}失败:`, error);
              return { success: false, error };
            }
          } catch (rpcError) {
            console.warn(`通过RPC执行${description}时出错:`, rpcError);
            // 继续后面的代码尝试其他方法
          }
          
          // 使用一个组装的解决方案：使用SQL注释来尝试创建表
          // 这种方法是不完美的，但在某些有限的权限环境中可能能工作
          try {
            // 我们在表名前添加注释，尝试通过注释执行SQL
            // 这取决于Supabase如何处理SQL查询的方式
            // 如果这样不行，我们只能提示用户手动执行SQL
            const commentPrefix = `-- ${Math.random().toString(36).substring(2, 15)}`;
            const { count, error } = await supabase
              .from('_dummy')
              .select('*')
              .eq('create_table_sql', sql)
              .limit(1);
            
            if (error) {
              // 如果错误，提示用户手动执行SQL
              console.warn(`无法自动创建表，需要手动执行SQL`);
              return { 
                success: false, 
                needsManualExecution: true,
                sql,
                description,
                message: '需要在Supabase控制台手动执行SQL'
              };
            }
          } catch (error) {
            console.warn(`创建表的备用方法也失败:`, error);
          }
          
          // 如果前面的方法都失败了，我们检查表是否已经存在
          // 如果表存在，我们认为创建成功
          const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i)?.[1];
          
          if (tableName) {
            const exists = await checkTableExists(tableName);
            if (exists) {
              console.log(`表 ${tableName} 已存在，认为创建成功`);
              return { success: true };
            }
          }
          
          // 所有方法都失败，提示用户手动执行SQL
          return { 
            success: false, 
            needsManualExecution: true,
            sql,
            description,
            message: '需要在Supabase控制台手动执行SQL'
          };
        } catch (error) {
          console.error(`执行${description}时发生意外错误:`, error);
          return { success: false, error };
        }
      };
      
      // 尝试创建表
      const results = await Promise.all([
        executeSQL(createExamsTableSQL, '创建考试表'),
        executeSQL(createGradeDataTableSQL, '创建成绩数据表'),
        executeSQL(createStudentsTableSQL, '创建学生表'),
        executeSQL(createGradeTagsTableSQL, '创建成绩标签表'),
        executeSQL(createGradeDataTagsTableSQL, '创建成绩数据标签关联表')
      ]);
      
      // 检查是否有任何错误
      const errors = results.filter(result => !result.success);
      
      if (errors.length > 0) {
        console.error('初始化数据库表过程中发生错误:', errors);
        
        // 收集需要手动执行的SQL
        const manualSqlScripts = results
          .filter(result => result.needsManualExecution)
          .map(result => `-- ${result.description}\n${result.sql}`)
          .join('\n\n');
        
        if (manualSqlScripts) {
          return { 
            success: false, 
            errors,
            manualSqlScripts,
            message: '无法自动创建数据库表。请在Supabase管理面板中手动执行以下SQL脚本：',
            needsManualExecution: true
          };
        }
        
        return { 
          success: false, 
          errors,
          message: '无法自动创建数据库表。请在Supabase管理面板中手动执行SQL脚本。'
        };
      }
      
      // 再次检查所有需要的表是否存在
      const tablesExist = await Promise.all([
        checkTableExists('exams'),
        checkTableExists('grade_data'),
        checkTableExists('students'),
        checkTableExists('grade_tags'),
        checkTableExists('grade_data_tags')
      ]);
      
      if (tablesExist.every(Boolean)) {
        return { success: true, message: '数据库表初始化成功' };
      } else {
        const missingTables = ['exams', 'grade_data', 'students', 'grade_tags', 'grade_data_tags']
          .filter((_, index) => !tablesExist[index]);
        
        return { 
          success: false, 
          message: `初始化后检查表发现以下表仍不存在: ${missingTables.join(', ')}`,
          missingTables
        };
      }
    } catch (error) {
      console.error('初始化数据库表失败:', error);
      return { 
        success: false, 
        error, 
        message: '初始化数据库表失败，请手动执行SQL脚本。' 
      };
    }
  },

  /**
   * 检查学生表结构并修复缺失字段
   */
  async checkAndFixStudentsTable() {
    try {
      // 先检查表是否存在
      const tableExists = await checkTableExists('students');
      if (!tableExists) {
        console.warn('学生表不存在，需要创建');
        return await this.ensureStudentsTableExists();
      }
      
      // 创建修复表结构的完整SQL
      const fixTableSQL = `
      -- 完整的修复学生表结构脚本
      DO $$
      DECLARE
        column_exists BOOLEAN;
      BEGIN
        -- 检查并添加 class_name 字段
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'students' 
          AND column_name = 'class_name'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
          RAISE NOTICE 'Adding class_name column to students table';
          ALTER TABLE students ADD COLUMN class_name TEXT;
        END IF;
        
        -- 检查并添加 student_id 字段
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'students' 
          AND column_name = 'student_id'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
          RAISE NOTICE 'Adding student_id column to students table';
          ALTER TABLE students ADD COLUMN student_id TEXT NOT NULL DEFAULT 'STD' || gen_random_uuid();
          
          -- 添加唯一约束
          ALTER TABLE students ADD CONSTRAINT students_student_id_unique UNIQUE(student_id);
        END IF;
        
        -- 检查并添加 name 字段
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'students' 
          AND column_name = 'name'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
          RAISE NOTICE 'Adding name column to students table';
          ALTER TABLE students ADD COLUMN name TEXT NOT NULL DEFAULT '未命名学生';
        END IF;
        
        -- 检查并添加其他重要字段
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'students' 
          AND column_name = 'grade'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
          RAISE NOTICE 'Adding grade column to students table';
          ALTER TABLE students ADD COLUMN grade TEXT;
        END IF;
        
        -- 检查并添加元数据字段
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'students' 
          AND column_name = 'metadata'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
          RAISE NOTICE 'Adding metadata column to students table';
          ALTER TABLE students ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        END IF;
        
        -- 确保时间戳字段存在
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'students' 
          AND column_name = 'created_at'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
          RAISE NOTICE 'Adding created_at column to students table';
          ALTER TABLE students ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        END IF;
        
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'students' 
          AND column_name = 'updated_at'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
          RAISE NOTICE 'Adding updated_at column to students table';
          ALTER TABLE students ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        END IF;
      END $$;
      `;
      
      try {
        console.log('执行学生表结构修复SQL...');
        
        // 尝试使用RPC函数执行SQL
        const { error } = await supabase.rpc('exec_sql', { sql_query: fixTableSQL });
        
        if (error) {
          console.error('自动修复表结构失败:', error);
          // 尝试备用方法
          try {
            // 直接执行一个简单的ALTER查询来判断权限
            const { error: directError } = await supabase
              .from('students')
              .select('*')
              .limit(1);
              
            if (directError && directError.message.includes('does not exist')) {
              console.error('students表不存在');
              return await this.ensureStudentsTableExists();
            }
            
            return {
              success: false,
              message: '无法自动修复表结构，需要在Supabase控制台手动执行以下SQL:',
              sql: fixTableSQL
            };
          } catch (e) {
            console.error('尝试备用方法失败:', e);
            return {
              success: false,
              message: '无法自动修复表结构，需要在Supabase控制台手动执行SQL:',
              sql: fixTableSQL
            };
          }
        }
        
        // 修复成功，检查字段是否真的存在了
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒确保更改生效
        
        // 检查class_name字段
        const checkResult = await supabase
          .from('students')
          .select('class_name')
          .limit(1)
          .single();
          
        if (checkResult.error && checkResult.error.message.includes('does not exist')) {
          console.warn('修复失败，class_name字段仍不存在');
          return {
            success: false,
            message: 'class_name字段仍不存在，请手动执行SQL:',
            sql: 'ALTER TABLE students ADD COLUMN class_name TEXT;'
          };
        }
        
        return {
          success: true,
          message: '学生表结构已成功修复'
        };
      } catch (sqlError) {
        console.error('执行修复SQL失败:', sqlError);
        return {
          success: false,
          error: sqlError,
          message: '无法执行修复SQL脚本',
          sql: fixTableSQL
        };
      }
    } catch (error) {
      console.error('检查和修复学生表结构失败:', error);
      return {
        success: false,
        error,
        message: '检查和修复学生表结构过程中发生错误'
      };
    }
  },

  /**
   * 检查并创建学生表
   * 如果表不存在，则创建它
   */
  async ensureStudentsTableExists() {
    try {
      // 检查表是否存在
      const tableExists = await checkTableExists('students');
      
      if (tableExists) {
        console.log('学生表已存在，检查字段完整性');
        return await this.checkAndFixStudentsTable();
      }
      
      // 创建更完整的学生表SQL，包括所有必要的字段
      const createStudentsTableSQL = `
      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        class_name TEXT,
        grade TEXT,
        school_id TEXT,
        gender TEXT,
        birth_date DATE,
        contact_info JSONB DEFAULT '{}'::jsonb,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
      
      -- 创建RLS策略
      ALTER TABLE students ENABLE ROW LEVEL SECURITY;
      
      -- 默认RLS策略: 允许所有授权用户读取
      CREATE POLICY "允许授权用户读取学生信息" ON students FOR SELECT USING (auth.role() = 'authenticated');
      
      -- 创建自动更新时间戳触发器
      CREATE OR REPLACE FUNCTION update_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      DROP TRIGGER IF EXISTS update_students_timestamp ON students;
      CREATE TRIGGER update_students_timestamp
      BEFORE UPDATE ON students
      FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
      `;
      
      // 尝试执行SQL
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: createStudentsTableSQL });
        if (error) {
          console.error('创建学生表失败:', error);
          return { 
            success: false, 
            error, 
            message: '创建学生表失败，请在Supabase控制台手动执行SQL脚本。',
            sql: createStudentsTableSQL 
          };
        }
        
        // 检查表是否真的创建成功
        const tableCreated = await checkTableExists('students');
        if (tableCreated) {
          console.log('学生表创建成功');
          return { success: true, message: '学生表创建成功' };
        } else {
          return { 
            success: false, 
            message: '尝试创建学生表，但表仍不存在',
            sql: createStudentsTableSQL 
          };
        }
      } catch (rpcError) {
        console.error('RPC执行创建学生表失败:', rpcError);
        
        // 尝试直接使用SQL方法
        try {
          // 尝试使用直接查询创建表 - 注意这可能不起作用，取决于Supabase权限
          console.log('尝试使用替代方法创建学生表...');
          return { 
            success: false, 
            message: '无法自动创建学生表。请在Supabase控制台手动执行以下SQL脚本:',
            sql: createStudentsTableSQL
          };
        } catch (directError) {
          console.error('替代方法创建学生表失败:', directError);
          return { 
            success: false, 
            error: directError, 
            message: '创建学生表失败。请在Supabase控制台手动执行SQL脚本。',
            sql: createStudentsTableSQL
          };
        }
      }
    } catch (error) {
      console.error('检查/创建学生表失败:', error);
      return { 
        success: false, 
        error, 
        message: '学生表检查/创建过程中出错。' 
      };
    }
  },

  /**
   * 获取交叉分析数据
   * @param rowDimension 行维度
   * @param colDimension 列维度
   * @param metric 分析指标
   */
  getCrossDimensionData: async (rowDimension: string, colDimension: string, metric: string) => {
    try {
      // 构建查询参数
      const params = new URLSearchParams({
        row_dimension: rowDimension,
        col_dimension: colDimension,
        metric: metric
      });
      
      // 使用Supabase函数获取数据
      const { data, error } = await supabase.functions.invoke('analyze-data', {
        body: { 
          row_dimension: rowDimension,
          col_dimension: colDimension,
          metric: metric
        }
      });
      
      if (error) {
        console.error("调用交叉分析API失败:", error);
        throw new Error("获取交叉维度分析数据失败");
      }
      
      return data;
    } catch (error) {
      console.error("获取交叉维度分析数据失败:", error);
      throw new Error("获取交叉维度分析数据失败");
    }
  },

  /**
   * 生成模拟的交叉分析数据（仅用于开发测试）
   */
  generateMockCrossDimensionData: (rowField: string, colField: string, valueField: string) => {
    const mockData = [];
    const rowValues = ['高一(1)班', '高一(2)班', '高一(3)班', '高二(1)班', '高二(2)班'];
    const colValues = {
      'subject': ['语文', '数学', '英语', '物理', '化学', '生物'],
      'exam_type': ['期中考试', '期末考试', '单元测试', '模拟考试'],
      'teacher': ['李老师', '王老师', '张老师', '刘老师', '赵老师'],
      'exam_date': ['2023-09', '2023-10', '2023-11', '2023-12', '2024-01'],
      'class_name': ['高一(1)班', '高一(2)班', '高一(3)班', '高二(1)班', '高二(2)班'],
    };
    
    // 使用实际的列维度值，如果不存在则使用默认值
    const actualRowValues = rowField in colValues ? colValues[rowField] : rowValues;
    const actualColValues = colField in colValues ? colValues[colField] : ['选项1', '选项2', '选项3'];
    
    // 为每个行列组合生成数据
    actualRowValues.forEach(row => {
      actualColValues.forEach(col => {
        let value;
        
        // 根据指标类型生成不同范围的随机值
        switch(valueField) {
          case 'avg_score':
            value = 60 + Math.random() * 30; // 60-90 之间的随机分数
            break;
          case 'pass_rate':
            value = 0.6 + Math.random() * 0.4; // 60%-100% 之间的随机通过率
            break;
          case 'excellence_rate':
            value = Math.random() * 0.5; // 0-50% 之间的随机优秀率
            break;
          case 'min_score':
            value = 40 + Math.random() * 30; // 40-70 之间的随机最低分
            break;
          case 'max_score':
            value = 85 + Math.random() * 15; // 85-100 之间的随机最高分
            break;
          default:
            value = Math.random() * 100;
        }
        
        mockData.push({
          [rowField]: row,
          [colField]: col,
          [valueField]: value
        });
      });
    });
    
    return mockData;
  },

  // 尝试初始化或验证数据库
  async initializeDatabase() {
    // 检查所有必要的表是否存在
    const [examsExists, gradeDataExists, studentsExists] = await Promise.all([
      checkTableExists('exams'),
      checkTableExists('grade_data'),
      checkTableExists('students')
    ]);
    
    const missingTables = [];
    if (!examsExists) missingTables.push('exams');
    if (!gradeDataExists) missingTables.push('grade_data');
    if (!studentsExists) missingTables.push('students');
    
    // 如果有缺失的表，尝试创建它们
    if (missingTables.length > 0) {
      console.warn(`发现缺失的表: ${missingTables.join(', ')}`);
      const result = await this.initializeTables();
      
      if (!result.success) {
        // 显示给用户缺少表的警告
        toast.error('数据库表缺失', {
          description: `系统检测到以下表不存在: ${missingTables.join(', ')}。这可能导致数据导入失败。请联系管理员。`
        });
        return result;
      }
      
      return { success: true, createdTables: missingTables };
    }
    
    // 如果students表存在，检查并修复其结构
    if (studentsExists) {
      try {
        // 静默检查学生表结构并尝试自动修复
        const tableCheck = await this.checkAndFixStudentsTable();
        
        if (!tableCheck.success) {
          console.warn('学生表结构有问题:', tableCheck.message);
          // 此处只记录问题，不中断流程，让后续步骤决定是否需要处理
          return { 
            success: true, 
            message: '所有必要的表都已存在，但学生表结构可能需要修复',
            studentsTableNeedsRepair: true,
            repairInfo: tableCheck
          };
        }
      } catch (error) {
        console.error('检查学生表结构失败:', error);
        // 仍然返回成功，但标记可能存在问题
        return {
          success: true,
          message: '所有必要的表都已存在，但检查学生表结构时发生错误',
          studentsTableCheckError: true,
          error
        };
      }
    }
    
    return { success: true, message: '所有必要的表都已存在且结构正确' };
  },

  /**
   * 检查并修复exams表，确保scope字段存在
   */
  async checkAndFixExamsTable() {
    console.log('开始检查考试表结构...');
    
    try {
      // 检查考试表是否存在
      const tableExists = await checkTableExists('exams');
      if (!tableExists) {
        console.log('考试表不存在，需要创建');
        return {
          success: false,
          message: '考试表不存在，请先初始化数据库',
          sql: `
          CREATE TABLE IF NOT EXISTS exams (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            type TEXT NOT NULL,
            date DATE,
            subject TEXT,
            scope TEXT DEFAULT 'class' NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            created_by UUID REFERENCES auth.users(id)
          );
          `
        };
      }
      
      // 标记字段是否已经验证存在
      let scopeColumnExists = false;
      
      // 方法1: 尝试使用RPC函数检查
      try {
        const { data: columnInfo, error: columnError } = await supabase.rpc('has_column', { 
          table_name: 'exams', 
          column_name: 'scope' 
        });
        
        if (!columnError && columnInfo === true) {
          console.log('使用RPC确认scope字段已存在');
          scopeColumnExists = true;
        }
      } catch (rpcError) {
        console.log('RPC函数不存在或调用失败，尝试备选方法');
      }
      
      // 方法2: 如果RPC失败，尝试直接查询信息模式
      if (!scopeColumnExists) {
        try {
          const { data, error } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'exams')
            .eq('column_name', 'scope')
            .eq('table_schema', 'public');
            
          if (!error && data && data.length > 0) {
            console.log('通过information_schema确认scope字段已存在');
            scopeColumnExists = true;
          }
        } catch (queryError) {
          console.log('information_schema查询失败，尝试最后方法');
        }
      }
      
      // 方法3: 如果前两种方法都失败，尝试直接执行添加列，并通过错误判断列是否存在
      if (!scopeColumnExists) {
        try {
          // 尝试执行添加列的SQL
          const { data, error } = await supabase.rpc('exec_sql', { 
            sql_query: `ALTER TABLE exams ADD COLUMN scope TEXT DEFAULT 'class' NOT NULL;` 
          });
          
          // 如果没有错误，说明列成功添加
          if (!error) {
            console.log('成功添加scope字段到exams表');
            return { 
              success: true, 
              message: '成功添加scope字段到exams表',
              modified: true
            };
          }
          
          // 如果错误是"列已存在"，实际上是成功的情况
          if (error && error.message && 
              (error.message.includes('already exists') || 
               error.code === '42701' || 
               error.message.includes('已经存在'))) {
            console.log('根据错误信息判断scope字段已存在');
            scopeColumnExists = true;
          } else {
            // 其他错误情况
            throw error;
          }
        } catch (execError) {
          console.error('尝试添加列失败，无法确定列是否存在:', execError);
        }
      }
      
      // 如果通过任何方法确认列已存在
      if (scopeColumnExists) {
        console.log('考试表结构检查完成，scope字段已存在');
        return { success: true, message: '考试表结构正常' };
      }
      
      // 如果到这里，说明所有自动方法都失败了，提供SQL脚本供手动执行
      console.warn('无法确认或添加scope字段，需要手动执行SQL');
      return {
        success: false,
        message: '考试表缺少scope字段，自动修复失败',
        sql: `
        -- 添加scope字段到exams表
        DO $$
        BEGIN
          BEGIN
            ALTER TABLE exams ADD COLUMN scope TEXT DEFAULT 'class' NOT NULL;
            RAISE NOTICE 'scope字段已添加';
          EXCEPTION WHEN duplicate_column THEN
            RAISE NOTICE 'scope字段已存在，无需添加';
          END;
        END $$;
        `
      };
    } catch (error) {
      console.error('检查考试表结构失败:', error);
      return { 
        success: false, 
        message: `检查考试表结构时出错: ${error instanceof Error ? error.message : '未知错误'}` 
      };
    }
  },

  /**
   * 修复grade_data表添加exam_scope字段
   */
  async fixGradeDataTable() {
    try {
      console.log('正在检查grade_data表是否需要修复...');
      
      // 首先检查表是否存在
      const tableExists = await checkTableExists('grade_data');
      if (!tableExists) {
        console.log('grade_data表不存在，需要创建');
        return {
          success: false,
          message: 'grade_data表不存在，请先初始化数据库',
          needsCreation: true
        };
      }
      
      // 标记字段是否已经验证存在
      let examScopeColumnExists = false;
      
      // 方法1: 尝试使用RPC函数检查
      try {
        const { data: hasExamScopeColumn, error: checkError } = await supabase.rpc('has_column', { 
          table_name: 'grade_data', 
          column_name: 'exam_scope' 
        });

        if (!checkError && hasExamScopeColumn === true) {
          console.log('使用RPC确认exam_scope字段已存在');
          examScopeColumnExists = true;
        }
      } catch (rpcError) {
        console.log('RPC函数不存在或调用失败，尝试备选方法');
      }
      
      // 方法2: 如果RPC失败，尝试直接查询信息模式
      if (!examScopeColumnExists) {
        try {
          const { data, error } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'grade_data')
            .eq('column_name', 'exam_scope')
            .eq('table_schema', 'public');
            
          if (!error && data && data.length > 0) {
            console.log('通过information_schema确认exam_scope字段已存在');
            examScopeColumnExists = true;
          }
        } catch (queryError) {
          console.log('information_schema查询失败，尝试最后方法');
        }
      }
      
      // 方法3: 如果前两种方法都失败，尝试直接执行添加列，并通过错误判断列是否存在
      if (!examScopeColumnExists) {
        try {
          // 尝试执行添加列的SQL
          const addColumnSQL = `
            ALTER TABLE grade_data ADD COLUMN exam_scope TEXT DEFAULT 'class';
            COMMENT ON COLUMN grade_data.exam_scope IS '考试范围，继承自exams表';
          `;
          
          const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: addColumnSQL
          });
          
          // 如果没有错误，说明列成功添加
          if (!error) {
            console.log('成功添加exam_scope字段');
            return { success: true, modified: true };
          }
          
          // 如果错误是"列已存在"，实际上是成功的情况
          if (error && error.message && 
              (error.message.includes('already exists') || 
               error.code === '42701' || 
               error.message.includes('已经存在'))) {
            console.log('根据错误信息判断exam_scope字段已存在');
            examScopeColumnExists = true;
          } else {
            // 其他错误情况，记录详细信息
            console.error('添加exam_scope字段错误:', error);
            
            // 检查一下错误是否包含额外信息
            if (error.details) {
              console.error('错误详情:', error.details);
            }
            if (error.hint) {
              console.error('错误提示:', error.hint);
            }
            
            // 尝试一下另一种更直接的方式添加列
            try {
              const { data: directData, error: directError } = await supabase
                .from('grade_data')
                .select('count(*)')
                .limit(1);
              
              if (!directError) {
                // 表存在且可以访问，但可能无法修改结构
                return { 
                  success: false, 
                  message: '无法自动添加exam_scope字段，请手动执行SQL', 
                  sql: addColumnSQL
                };
              }
            } catch (directQueryError) {
              console.error('直接查询grade_data表失败:', directQueryError);
            }
            
            throw error;
          }
        } catch (execError) {
          console.error('尝试添加列失败，无法确定列是否存在:', execError);
        }
      }
      
      // 如果通过任何方法确认列已存在
      if (examScopeColumnExists) {
        console.log('grade_data表结构正常，exam_scope字段已存在');
        return { success: true, modified: false };
      }
      
      // 如果到这里，说明所有自动方法都失败了，提供SQL脚本供手动执行
      console.warn('无法确认或添加exam_scope字段，需要手动执行SQL');
      return {
        success: false,
        message: 'grade_data表缺少exam_scope字段，自动修复失败',
        sql: `
        -- 添加exam_scope字段到grade_data表
        DO $$
        BEGIN
          BEGIN
            ALTER TABLE grade_data ADD COLUMN exam_scope TEXT DEFAULT 'class';
            COMMENT ON COLUMN grade_data.exam_scope IS '考试范围，继承自exams表';
            RAISE NOTICE 'exam_scope字段已添加';
          EXCEPTION WHEN duplicate_column THEN
            RAISE NOTICE 'exam_scope字段已存在，无需添加';
          END;
        END $$;
        `
      };
    } catch (error) {
      console.error('修复grade_data表出错:', error);
      return { 
        success: false, 
        error,
        message: `修复grade_data表出错: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  },

  /**
   * 创建或修复数据库辅助函数
   */
  async createHelperFunctions() {
    try {
      console.log('正在创建数据库辅助函数...');
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: `
        -- 创建检查列是否存在的函数
        CREATE OR REPLACE FUNCTION public.has_column(table_name text, column_name text)
        RETURNS boolean AS $$
        DECLARE
          column_exists boolean;
        BEGIN
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = $1
            AND column_name = $2
          ) INTO column_exists;
          
          RETURN column_exists;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- 创建安全的SQL执行函数
        CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
        RETURNS text AS $$
        BEGIN
          EXECUTE sql_query;
          RETURN 'SQL executed successfully';
        EXCEPTION WHEN OTHERS THEN
          RETURN 'SQL执行失败: ' || SQLERRM;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- 为RPC函数添加注释
        COMMENT ON FUNCTION public.has_column IS '检查指定表中是否存在某列';
        COMMENT ON FUNCTION public.exec_sql IS '安全地执行动态SQL语句，用于系统维护';

        -- 设置适当的权限
        GRANT EXECUTE ON FUNCTION public.has_column TO authenticated;
        GRANT EXECUTE ON FUNCTION public.exec_sql TO authenticated;
        `
      });

      if (error) {
        // 如果exec_sql函数不存在，我们可能需要直接执行SQL
        console.error('创建辅助函数失败，可能需要在Supabase Studio手动执行SQL。错误:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error('创建辅助函数出错:', error);
      return { success: false, error };
    }
  },

  /**
   * 修复所有表结构
   */
  async fixAllTables() {
    const results = {
      helperFunctions: false,
      examsTable: false,
      gradeDataTable: false,
      gradeDataColumns: false,
      errors: []
    };

    try {
      // 1. 创建辅助函数
      const helperResult = await this.createHelperFunctions();
      results.helperFunctions = helperResult.success;
      if (!helperResult.success) {
        results.errors.push('创建辅助函数失败');
      }

      // 2. 修复exams表
      const examsResult = await this.checkAndFixExamsTable();
      results.examsTable = examsResult.success;
      if (!examsResult.success) {
        results.errors.push('修复exams表失败');
      }

      // 3. 修复grade_data表
      const gradeDataResult = await this.fixGradeDataTable();
      results.gradeDataTable = gradeDataResult.success;
      if (!gradeDataResult.success) {
        results.errors.push('修复grade_data表失败');
      }
      
      // 4. 一次性检查并修复grade_data表的所有列
      const columnsResult = await this.ensureAllRequiredColumns();
      results.gradeDataColumns = columnsResult.success;
      if (!columnsResult.success) {
        results.errors.push('修复grade_data表字段失败');
      }

      return {
        success: results.helperFunctions && results.examsTable && 
                results.gradeDataTable && results.gradeDataColumns,
        results,
        error: results.errors.length > 0 ? results.errors.join('; ') : null
      };
    } catch (error) {
      console.error('修复表结构失败:', error);
      return {
        success: false,
        results,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  },

  /**
   * 删除指定考试及相关成绩数据
   * @param examId 考试ID
   * @returns 删除结果
   */
  async deleteExam(examId: string): Promise<{ success: boolean; error?: any; message?: string }> {
    if (!examId) {
      return { success: false, message: "考试ID不能为空" };
    }

    try {
      console.log(`[GradeAnalysisService] 开始删除考试: ${examId}`);

      // 执行级联删除：先删除成绩数据，再删除考试记录
      // 1. 删除相关的成绩数据
      const { error: gradeDeleteError } = await supabase
        .from('grade_data')
        .delete()
        .eq('exam_id', examId);

      if (gradeDeleteError) {
        console.error('删除成绩数据失败:', gradeDeleteError);
        return { 
          success: false, 
          error: gradeDeleteError,
          message: `删除成绩数据失败: ${gradeDeleteError.message}` 
        };
      }

      // 2. 删除考试记录
      const { error: examDeleteError } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId);

      if (examDeleteError) {
        console.error('删除考试记录失败:', examDeleteError);
        return { 
          success: false, 
          error: examDeleteError,
          message: `删除考试记录失败: ${examDeleteError.message}` 
        };
      }

      console.log(`[GradeAnalysisService] 考试 ${examId} 删除成功`);
      return { success: true, message: "考试删除成功" };
    } catch (error) {
      console.error('删除考试时发生错误:', error);
      return { 
        success: false, 
        error, 
        message: error instanceof Error ? error.message : "删除考试时发生未知错误" 
      };
    }
  },

  /**
   * 修复exams表添加scope字段
   */
  async fixExamsTable() {
    try {
      console.log('正在检查exams表是否需要修复...');
      // 先检查辅助函数是否存在，如果不存在则创建
      try {
        const { data: hasColumnExists } = await supabase.rpc('has_column', { 
          table_name: 'exams', 
          column_name: 'id' 
        });
      } catch (error) {
        // 如果函数不存在，先创建辅助函数
        console.log('辅助函数不存在，正在创建...');
        await this.createHelperFunctions();
      }

      // 检查scope字段是否存在
      const { data: hasScopeColumn, error: checkError } = await supabase.rpc('has_column', { 
        table_name: 'exams', 
        column_name: 'scope' 
      });

      if (checkError) {
        console.error('检查scope字段失败:', checkError);
        return { success: false, error: checkError };
      }

      // 如果字段不存在，添加它
      if (!hasScopeColumn) {
        console.log('scope字段不存在，正在添加...');
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: `
          ALTER TABLE exams ADD COLUMN scope TEXT DEFAULT 'class' NOT NULL;
          COMMENT ON COLUMN exams.scope IS '考试范围，可以是班级(class)或年级(grade)级别';
          `
        });

        if (error) {
          console.error('添加scope字段失败:', error);
          return { success: false, error };
        }

        console.log('成功添加scope字段');
        return { success: true, modified: true };
      }

      console.log('exams表结构正常，scope字段已存在');
      return { success: true, modified: false };
    } catch (error) {
      console.error('修复exams表出错:', error);
      return { success: false, error };
    }
  },

  /**
   * 检查grade_data表是否有grade字段，并在需要时添加
   */
  async checkAndFixGradeColumn() {
    try {
      console.log('开始检查grade_data表的grade字段...');
      
      // 首先检查表是否存在
      const tableExists = await checkTableExists('grade_data');
      if (!tableExists) {
        console.log('grade_data表不存在，需要先创建表');
        return {
          success: false,
          message: 'grade_data表不存在，请先初始化数据库',
          needsCreation: true
        };
      }
      
      // 标记字段是否已经验证存在
      let gradeColumnExists = false;
      
      // 方法1: 尝试使用RPC函数检查
      try {
        const { data: hasGradeColumn, error: checkError } = await supabase.rpc('has_column', { 
          table_name: 'grade_data', 
          column_name: 'grade' 
        });

        if (!checkError && hasGradeColumn === true) {
          console.log('使用RPC确认grade字段已存在');
          gradeColumnExists = true;
        }
      } catch (rpcError) {
        console.log('RPC函数不存在或调用失败，尝试备选方法');
      }
      
      // 方法2: 如果RPC失败，尝试直接查询信息模式
      if (!gradeColumnExists) {
        try {
          const { data, error } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'grade_data')
            .eq('column_name', 'grade')
            .eq('table_schema', 'public');
            
          if (!error && data && data.length > 0) {
            console.log('通过information_schema确认grade字段已存在');
            gradeColumnExists = true;
          }
        } catch (queryError) {
          console.log('information_schema查询失败，尝试最后方法');
        }
      }
      
      // 方法3: 如果前两种方法都失败，尝试直接执行添加列，并通过错误判断列是否存在
      if (!gradeColumnExists) {
        try {
          // 尝试执行添加列的SQL
          const addColumnSQL = `
            ALTER TABLE grade_data ADD COLUMN grade TEXT;
            COMMENT ON COLUMN grade_data.grade IS '等级评定';
          `;
          
          const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: addColumnSQL
          });
          
          // 如果没有错误，说明列成功添加
          if (!error) {
            console.log('成功添加grade字段');
            return { success: true, modified: true };
          }
          
          // 如果错误是"列已存在"，实际上是成功的情况
          if (error && error.message && 
              (error.message.includes('already exists') || 
               error.code === '42701' || 
               error.message.includes('已经存在'))) {
            console.log('根据错误信息判断grade字段已存在');
            gradeColumnExists = true;
          } else {
            // 其他错误情况，记录详细信息
            console.error('添加grade字段错误:', error);
            
            // 检查一下错误是否包含额外信息
            if (error.details) {
              console.error('错误详情:', error.details);
            }
            if (error.hint) {
              console.error('错误提示:', error.hint);
            }
            
            throw error;
          }
        } catch (execError) {
          console.error('尝试添加列失败，无法确定列是否存在:', execError);
        }
      }
      
      // 如果通过任何方法确认列已存在
      if (gradeColumnExists) {
        console.log('grade_data表结构正常，grade字段已存在');
        return { success: true, modified: false };
      }
      
      // 如果到这里，说明所有自动方法都失败了，提供SQL脚本供手动执行
      console.warn('无法确认或添加grade字段，需要手动执行SQL');
      return {
        success: false,
        message: 'grade_data表缺少grade字段，自动修复失败',
        sql: `
        -- 添加grade字段到grade_data表
        DO $$
        BEGIN
          BEGIN
            ALTER TABLE grade_data ADD COLUMN grade TEXT;
            COMMENT ON COLUMN grade_data.grade IS '等级评定';
            RAISE NOTICE 'grade字段已添加';
          EXCEPTION WHEN duplicate_column THEN
            RAISE NOTICE 'grade字段已存在，无需添加';
          END;
        END $$;
        `
      };
    } catch (error) {
      console.error('检查grade字段出错:', error);
      return { 
        success: false, 
        error,
        message: `检查grade字段出错: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  },

  /**
   * 检查grade_data表是否有import_strategy字段，并在需要时添加
   */
  async checkAndFixImportStrategyColumn() {
    try {
      console.log('开始检查grade_data表的import_strategy字段...');
      
      // 首先检查表是否存在
      const tableExists = await checkTableExists('grade_data');
      if (!tableExists) {
        console.log('grade_data表不存在，需要先创建表');
        return {
          success: false,
          message: 'grade_data表不存在，请先初始化数据库',
          needsCreation: true
        };
      }
      
      // 标记字段是否已经验证存在
      let importStrategyColumnExists = false;
      
      // 方法1: 尝试使用RPC函数检查
      try {
        const { data: hasColumn, error: checkError } = await supabase.rpc('has_column', { 
          table_name: 'grade_data', 
          column_name: 'import_strategy' 
        });

        if (!checkError && hasColumn === true) {
          console.log('使用RPC确认import_strategy字段已存在');
          importStrategyColumnExists = true;
        }
      } catch (rpcError) {
        console.log('RPC函数不存在或调用失败，尝试备选方法');
      }
      
      // 方法2: 如果RPC失败，尝试直接查询信息模式
      if (!importStrategyColumnExists) {
        try {
          const { data, error } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'grade_data')
            .eq('column_name', 'import_strategy')
            .eq('table_schema', 'public');
            
          if (!error && data && data.length > 0) {
            console.log('通过information_schema确认import_strategy字段已存在');
            importStrategyColumnExists = true;
          }
        } catch (queryError) {
          console.log('information_schema查询失败，尝试最后方法');
        }
      }
      
      // 方法3: 如果前两种方法都失败，尝试直接执行添加列，并通过错误判断列是否存在
      if (!importStrategyColumnExists) {
        try {
          // 尝试执行添加列的SQL
          const addColumnSQL = `
            ALTER TABLE grade_data ADD COLUMN import_strategy TEXT;
            COMMENT ON COLUMN grade_data.import_strategy IS '数据导入策略';
          `;
          
          const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: addColumnSQL
          });
          
          // 如果没有错误，说明列成功添加
          if (!error) {
            console.log('成功添加import_strategy字段');
            return { success: true, modified: true };
          }
          
          // 如果错误是"列已存在"，实际上是成功的情况
          if (error && error.message && 
              (error.message.includes('already exists') || 
               error.code === '42701' || 
               error.message.includes('已经存在'))) {
            console.log('根据错误信息判断import_strategy字段已存在');
            importStrategyColumnExists = true;
          } else {
            // 其他错误情况，记录详细信息
            console.error('添加import_strategy字段错误:', error);
            
            // 检查一下错误是否包含额外信息
            if (error.details) {
              console.error('错误详情:', error.details);
            }
            if (error.hint) {
              console.error('错误提示:', error.hint);
            }
            
            throw error;
          }
        } catch (execError) {
          console.error('尝试添加列失败，无法确定列是否存在:', execError);
        }
      }
      
      // 如果通过任何方法确认列已存在
      if (importStrategyColumnExists) {
        console.log('grade_data表结构正常，import_strategy字段已存在');
        return { success: true, modified: false };
      }
      
      // 如果到这里，说明所有自动方法都失败了，提供SQL脚本供手动执行
      console.warn('无法确认或添加import_strategy字段，需要手动执行SQL');
      return {
        success: false,
        message: 'grade_data表缺少import_strategy字段，自动修复失败',
        sql: `
        -- 添加import_strategy字段到grade_data表
        DO $$
        BEGIN
          BEGIN
            ALTER TABLE grade_data ADD COLUMN import_strategy TEXT;
            COMMENT ON COLUMN grade_data.import_strategy IS '数据导入策略';
            RAISE NOTICE 'import_strategy字段已添加';
          EXCEPTION WHEN duplicate_column THEN
            RAISE NOTICE 'import_strategy字段已存在，无需添加';
          END;
        END $$;
        `
      };
    } catch (error) {
      console.error('检查import_strategy字段出错:', error);
      return { 
        success: false, 
        error,
        message: `检查import_strategy字段出错: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  },

  /**
   * 检查grade_data表是否有match_type字段，并在需要时添加
   */
  async checkAndFixMatchTypeColumn() {
    try {
      console.log('开始检查grade_data表的match_type字段...');
      
      // 首先检查表是否存在
      const tableExists = await checkTableExists('grade_data');
      if (!tableExists) {
        console.log('grade_data表不存在，需要先创建表');
        return {
          success: false,
          message: 'grade_data表不存在，请先初始化数据库',
          needsCreation: true
        };
      }
      
      // 标记字段是否已经验证存在
      let matchTypeColumnExists = false;
      
      // 方法1: 尝试使用RPC函数检查
      try {
        const { data: hasColumn, error: checkError } = await supabase.rpc('has_column', { 
          table_name: 'grade_data', 
          column_name: 'match_type' 
        });

        if (!checkError && hasColumn === true) {
          console.log('使用RPC确认match_type字段已存在');
          matchTypeColumnExists = true;
        }
      } catch (rpcError) {
        console.log('RPC函数不存在或调用失败，尝试备选方法');
      }
      
      // 方法2: 如果RPC失败，尝试直接查询信息模式
      if (!matchTypeColumnExists) {
        try {
          const { data, error } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'grade_data')
            .eq('column_name', 'match_type')
            .eq('table_schema', 'public');
            
          if (!error && data && data.length > 0) {
            console.log('通过information_schema确认match_type字段已存在');
            matchTypeColumnExists = true;
          }
        } catch (queryError) {
          console.log('information_schema查询失败，尝试最后方法');
        }
      }
      
      // 方法3: 如果前两种方法都失败，尝试直接执行添加列，并通过错误判断列是否存在
      if (!matchTypeColumnExists) {
        try {
          // 尝试执行添加列的SQL
          const addColumnSQL = `
            ALTER TABLE grade_data ADD COLUMN match_type TEXT;
            COMMENT ON COLUMN grade_data.match_type IS '学生匹配类型，例如id、name_class、name等';
          `;
          
          const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: addColumnSQL
          });
          
          // 如果没有错误，说明列成功添加
          if (!error) {
            console.log('成功添加match_type字段');
            return { success: true, modified: true };
          }
          
          // 如果错误是"列已存在"，实际上是成功的情况
          if (error && error.message && 
              (error.message.includes('already exists') || 
               error.code === '42701' || 
               error.message.includes('已经存在'))) {
            console.log('根据错误信息判断match_type字段已存在');
            matchTypeColumnExists = true;
          } else {
            // 其他错误情况，记录详细信息
            console.error('添加match_type字段错误:', error);
            
            // 检查一下错误是否包含额外信息
            if (error.details) {
              console.error('错误详情:', error.details);
            }
            if (error.hint) {
              console.error('错误提示:', error.hint);
            }
            
            throw error;
          }
        } catch (execError) {
          console.error('尝试添加列失败，无法确定列是否存在:', execError);
        }
      }
      
      // 如果通过任何方法确认列已存在
      if (matchTypeColumnExists) {
        console.log('grade_data表结构正常，match_type字段已存在');
        return { success: true, modified: false };
      }
      
      // 如果到这里，说明所有自动方法都失败了，提供SQL脚本供手动执行
      console.warn('无法确认或添加match_type字段，需要手动执行SQL');
      return {
        success: false,
        message: 'grade_data表缺少match_type字段，自动修复失败',
        sql: `
        -- 添加match_type字段到grade_data表
        DO $$
        BEGIN
          BEGIN
            ALTER TABLE grade_data ADD COLUMN match_type TEXT;
            COMMENT ON COLUMN grade_data.match_type IS '学生匹配类型，例如id、name_class、name等';
            RAISE NOTICE 'match_type字段已添加';
          EXCEPTION WHEN duplicate_column THEN
            RAISE NOTICE 'match_type字段已存在，无需添加';
          END;
        END $$;
        `
      };
    } catch (error) {
      console.error('检查match_type字段出错:', error);
      return { 
        success: false, 
        error,
        message: `检查match_type字段出错: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  },

  /**
   * 检查grade_data表是否有multiple_matches字段，并在需要时添加
   */
  async checkAndFixMultipleMatchesColumn() {
    try {
      console.log('开始检查grade_data表的multiple_matches字段...');
      
      // 首先检查表是否存在
      const tableExists = await checkTableExists('grade_data');
      if (!tableExists) {
        console.log('grade_data表不存在，需要先创建表');
        return {
          success: false,
          message: 'grade_data表不存在，请先初始化数据库',
          needsCreation: true
        };
      }
      
      // 标记字段是否已经验证存在
      let multipleMatchesColumnExists = false;
      
      // 方法1: 尝试使用RPC函数检查
      try {
        const { data: hasColumn, error: checkError } = await supabase.rpc('has_column', { 
          table_name: 'grade_data', 
          column_name: 'multiple_matches' 
        });

        if (!checkError && hasColumn === true) {
          console.log('使用RPC确认multiple_matches字段已存在');
          multipleMatchesColumnExists = true;
        }
      } catch (rpcError) {
        console.log('RPC函数不存在或调用失败，尝试备选方法');
      }
      
      // 方法2: 如果RPC失败，尝试直接查询信息模式
      if (!multipleMatchesColumnExists) {
        try {
          const { data, error } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'grade_data')
            .eq('column_name', 'multiple_matches')
            .eq('table_schema', 'public');
            
          if (!error && data && data.length > 0) {
            console.log('通过information_schema确认multiple_matches字段已存在');
            multipleMatchesColumnExists = true;
          }
        } catch (queryError) {
          console.log('information_schema查询失败，尝试最后方法');
        }
      }
      
      // 方法3: 如果前两种方法都失败，尝试直接执行添加列，并通过错误判断列是否存在
      if (!multipleMatchesColumnExists) {
        try {
          // 尝试执行添加列的SQL
          const addColumnSQL = `
            ALTER TABLE grade_data ADD COLUMN multiple_matches BOOLEAN DEFAULT false;
            COMMENT ON COLUMN grade_data.multiple_matches IS '是否存在多个匹配结果';
          `;
          
          const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: addColumnSQL
          });
          
          // 如果没有错误，说明列成功添加
          if (!error) {
            console.log('成功添加multiple_matches字段');
            return { success: true, modified: true };
          }
          
          // 如果错误是"列已存在"，实际上是成功的情况
          if (error && error.message && 
              (error.message.includes('already exists') || 
               error.code === '42701' || 
               error.message.includes('已经存在'))) {
            console.log('根据错误信息判断multiple_matches字段已存在');
            multipleMatchesColumnExists = true;
          } else {
            // 其他错误情况，记录详细信息
            console.error('添加multiple_matches字段错误:', error);
            
            // 检查一下错误是否包含额外信息
            if (error.details) {
              console.error('错误详情:', error.details);
            }
            if (error.hint) {
              console.error('错误提示:', error.hint);
            }
            
            throw error;
          }
        } catch (execError) {
          console.error('尝试添加列失败，无法确定列是否存在:', execError);
        }
      }
      
      // 如果通过任何方法确认列已存在
      if (multipleMatchesColumnExists) {
        console.log('grade_data表结构正常，multiple_matches字段已存在');
        return { success: true, modified: false };
      }
      
      // 如果到这里，说明所有自动方法都失败了，提供SQL脚本供手动执行
      console.warn('无法确认或添加multiple_matches字段，需要手动执行SQL');
      return {
        success: false,
        message: 'grade_data表缺少multiple_matches字段，自动修复失败',
        sql: `
        -- 添加multiple_matches字段到grade_data表
        DO $$
        BEGIN
          BEGIN
            ALTER TABLE grade_data ADD COLUMN multiple_matches BOOLEAN DEFAULT false;
            COMMENT ON COLUMN grade_data.multiple_matches IS '是否存在多个匹配结果';
            RAISE NOTICE 'multiple_matches字段已添加';
          EXCEPTION WHEN duplicate_column THEN
            RAISE NOTICE 'multiple_matches字段已存在，无需添加';
          END;
        END $$;
        `
      };
    } catch (error) {
      console.error('检查multiple_matches字段出错:', error);
      return { 
        success: false, 
        error,
        message: `检查multiple_matches字段出错: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  },

  /**
   * 检查grade_data表是否有rank_in_class字段，并在需要时添加
   */
  async checkAndFixRankInClassColumn() {
    try {
      console.log('开始检查grade_data表的rank_in_class字段...');
      
      // 首先检查表是否存在
      const tableExists = await checkTableExists('grade_data');
      if (!tableExists) {
        console.log('grade_data表不存在，需要先创建表');
        return {
          success: false,
          message: 'grade_data表不存在，请先初始化数据库',
          needsCreation: true
        };
      }
      
      // 标记字段是否已经验证存在
      let rankInClassColumnExists = false;
      
      // 方法1: 尝试使用RPC函数检查
      try {
        const { data: hasColumn, error: checkError } = await supabase.rpc('has_column', { 
          table_name: 'grade_data', 
          column_name: 'rank_in_class' 
        });

        if (!checkError && hasColumn === true) {
          console.log('使用RPC确认rank_in_class字段已存在');
          rankInClassColumnExists = true;
        }
      } catch (rpcError) {
        console.log('RPC函数不存在或调用失败，尝试备选方法');
      }
      
      // 方法2: 如果RPC失败，尝试直接查询信息模式
      if (!rankInClassColumnExists) {
        try {
          const { data, error } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'grade_data')
            .eq('column_name', 'rank_in_class')
            .eq('table_schema', 'public');
            
          if (!error && data && data.length > 0) {
            console.log('通过information_schema确认rank_in_class字段已存在');
            rankInClassColumnExists = true;
          }
        } catch (queryError) {
          console.log('information_schema查询失败，尝试最后方法');
        }
      }
      
      // 方法3: 如果前两种方法都失败，尝试直接执行添加列，并通过错误判断列是否存在
      if (!rankInClassColumnExists) {
        try {
          // 尝试执行添加列的SQL
          const addColumnSQL = `
            ALTER TABLE grade_data ADD COLUMN rank_in_class INTEGER;
            COMMENT ON COLUMN grade_data.rank_in_class IS '班级内排名';
          `;
          
          const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: addColumnSQL
          });
          
          // 如果没有错误，说明列成功添加
          if (!error) {
            console.log('成功添加rank_in_class字段');
            return { success: true, modified: true };
          }
          
          // 如果错误是"列已存在"，实际上是成功的情况
          if (error && error.message && 
              (error.message.includes('already exists') || 
               error.code === '42701' || 
               error.message.includes('已经存在'))) {
            console.log('根据错误信息判断rank_in_class字段已存在');
            rankInClassColumnExists = true;
          } else {
            // 其他错误情况，记录详细信息
            console.error('添加rank_in_class字段错误:', error);
            
            // 检查一下错误是否包含额外信息
            if (error.details) {
              console.error('错误详情:', error.details);
            }
            if (error.hint) {
              console.error('错误提示:', error.hint);
            }
            
            throw error;
          }
        } catch (execError) {
          console.error('尝试添加列失败，无法确定列是否存在:', execError);
        }
      }
      
      // 如果通过任何方法确认列已存在
      if (rankInClassColumnExists) {
        console.log('grade_data表结构正常，rank_in_class字段已存在');
        return { success: true, modified: false };
      }
      
      // 如果到这里，说明所有自动方法都失败了，提供SQL脚本供手动执行
      console.warn('无法确认或添加rank_in_class字段，需要手动执行SQL');
      return {
        success: false,
        message: 'grade_data表缺少rank_in_class字段，自动修复失败',
        sql: `
        -- 添加rank_in_class字段到grade_data表
        DO $$
        BEGIN
          BEGIN
            ALTER TABLE grade_data ADD COLUMN rank_in_class INTEGER;
            COMMENT ON COLUMN grade_data.rank_in_class IS '班级内排名';
            RAISE NOTICE 'rank_in_class字段已添加';
          EXCEPTION WHEN duplicate_column THEN
            RAISE NOTICE 'rank_in_class字段已存在，无需添加';
          END;
        END $$;
        `
      };
    } catch (error) {
      console.error('检查rank_in_class字段出错:', error);
      return { 
        success: false, 
        error,
        message: `检查rank_in_class字段出错: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  },

  /**
   * 检查grade_data表是否有rank_in_grade字段，并在需要时添加
   */
  async checkAndFixRankInGradeColumn() {
    try {
      console.log('开始检查grade_data表的rank_in_grade字段...');
      
      // 首先检查表是否存在
      const tableExists = await checkTableExists('grade_data');
      if (!tableExists) {
        console.log('grade_data表不存在，需要先创建表');
        return {
          success: false,
          message: 'grade_data表不存在，请先初始化数据库',
          needsCreation: true
        };
      }
      
      // 标记字段是否已经验证存在
      let rankInGradeColumnExists = false;
      
      // 方法1: 尝试使用RPC函数检查
      try {
        const { data: hasColumn, error: checkError } = await supabase.rpc('has_column', { 
          table_name: 'grade_data', 
          column_name: 'rank_in_grade' 
        });

        if (!checkError && hasColumn === true) {
          console.log('使用RPC确认rank_in_grade字段已存在');
          rankInGradeColumnExists = true;
        }
      } catch (rpcError) {
        console.log('RPC函数不存在或调用失败，尝试备选方法');
      }
      
      // 方法2: 如果RPC失败，尝试直接查询信息模式
      if (!rankInGradeColumnExists) {
        try {
          const { data, error } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'grade_data')
            .eq('column_name', 'rank_in_grade')
            .eq('table_schema', 'public');
            
          if (!error && data && data.length > 0) {
            console.log('通过information_schema确认rank_in_grade字段已存在');
            rankInGradeColumnExists = true;
          }
        } catch (queryError) {
          console.log('information_schema查询失败，尝试最后方法');
        }
      }
      
      // 方法3: 如果前两种方法都失败，尝试直接执行添加列，并通过错误判断列是否存在
      if (!rankInGradeColumnExists) {
        try {
          // 尝试执行添加列的SQL
          const addColumnSQL = `
            ALTER TABLE grade_data ADD COLUMN rank_in_grade INTEGER;
            COMMENT ON COLUMN grade_data.rank_in_grade IS '年级内排名';
          `;
          
          const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: addColumnSQL
          });
          
          // 如果没有错误，说明列成功添加
          if (!error) {
            console.log('成功添加rank_in_grade字段');
            return { success: true, modified: true };
          }
          
          // 如果错误是"列已存在"，实际上是成功的情况
          if (error && error.message && 
              (error.message.includes('already exists') || 
               error.code === '42701' || 
               error.message.includes('已经存在'))) {
            console.log('根据错误信息判断rank_in_grade字段已存在');
            rankInGradeColumnExists = true;
          } else {
            // 其他错误情况，记录详细信息
            console.error('添加rank_in_grade字段错误:', error);
            
            // 检查一下错误是否包含额外信息
            if (error.details) {
              console.error('错误详情:', error.details);
            }
            if (error.hint) {
              console.error('错误提示:', error.hint);
            }
            
            throw error;
          }
        } catch (execError) {
          console.error('尝试添加列失败，无法确定列是否存在:', execError);
        }
      }
      
      // 如果通过任何方法确认列已存在
      if (rankInGradeColumnExists) {
        console.log('grade_data表结构正常，rank_in_grade字段已存在');
        return { success: true, modified: false };
      }
      
      // 如果到这里，说明所有自动方法都失败了，提供SQL脚本供手动执行
      console.warn('无法确认或添加rank_in_grade字段，需要手动执行SQL');
      return {
        success: false,
        message: 'grade_data表缺少rank_in_grade字段，自动修复失败',
        sql: `
        -- 添加rank_in_grade字段到grade_data表
        DO $$
        BEGIN
          BEGIN
            ALTER TABLE grade_data ADD COLUMN rank_in_grade INTEGER;
            COMMENT ON COLUMN grade_data.rank_in_grade IS '年级内排名';
            RAISE NOTICE 'rank_in_grade字段已添加';
          EXCEPTION WHEN duplicate_column THEN
            RAISE NOTICE 'rank_in_grade字段已存在，无需添加';
          END;
        END $$;
        `
      };
    } catch (error) {
      console.error('检查rank_in_grade字段出错:', error);
      return { 
        success: false, 
        error,
        message: `检查rank_in_grade字段出错: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  },
  
  /**
   * 一次性检查并修复所有可能需要的列
   * 这是一个更全面的方法，可以防止逐渐发现缺失列的问题
   */
  async ensureAllRequiredColumns() {
    try {
      console.log('开始全面检查grade_data表的所有必要字段...');
      
      // 检查表是否存在
      const tableExists = await checkTableExists('grade_data');
      if (!tableExists) {
        console.log('grade_data表不存在，需要先创建表');
        return {
          success: false,
          message: 'grade_data表不存在，请先初始化数据库',
          needsCreation: true
        };
      }

      // 定义所有需要检查的字段列表
      const requiredColumns = [
        { name: 'score', type: 'NUMERIC', comment: '分数值' },
        { name: 'grade', type: 'TEXT', comment: '等级评定' },
        { name: 'import_strategy', type: 'TEXT', comment: '数据导入策略' },
        { name: 'match_type', type: 'TEXT', comment: '学生匹配类型，例如id、name_class、name等' },
        { name: 'multiple_matches', type: 'BOOLEAN DEFAULT false', comment: '是否存在多个匹配结果' },
        { name: 'rank_in_class', type: 'INTEGER', comment: '班级内排名' },
        { name: 'rank_in_grade', type: 'INTEGER', comment: '年级内排名' },
        { name: 'exam_scope', type: 'TEXT DEFAULT \'class\'', comment: '考试范围，继承自exams表' }
      ];

      const results = {
        success: true,
        modified: false,
        details: {},
        message: '所有必要字段检查完成'
      };

      // 一次性添加所有缺失的列
      const missingColumns = [];
      
      // 尝试检查每个列是否存在
      for (const column of requiredColumns) {
        let columnExists = false;
        
        // 尝试方法1: 使用RPC函数
        try {
          const { data: hasColumn, error: checkError } = await supabase.rpc('has_column', { 
            table_name: 'grade_data', 
            column_name: column.name 
          });

          if (!checkError && hasColumn === true) {
            console.log(`使用RPC确认${column.name}字段已存在`);
            columnExists = true;
            results.details[column.name] = { exists: true, method: 'rpc' };
            continue;
          }
        } catch (rpcError) {
          // RPC可能不可用，继续尝试其他方法
        }
        
        // 尝试方法2: 信息模式查询
        try {
          const { data, error } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'grade_data')
            .eq('column_name', column.name)
            .eq('table_schema', 'public');
            
          if (!error && data && data.length > 0) {
            console.log(`通过information_schema确认${column.name}字段已存在`);
            columnExists = true;
            results.details[column.name] = { exists: true, method: 'information_schema' };
            continue;
          }
        } catch (queryError) {
          // 查询可能失败，继续尝试其他方法
        }
        
        // 如果到这里还没确认列存在，就假设它不存在，添加到缺失列表
        if (!columnExists) {
          missingColumns.push(column);
        }
      }
      
      // 如果有缺失的列，尝试添加它们
      if (missingColumns.length > 0) {
        results.modified = true;
        
        // 构建SQL脚本来添加所有缺失的列
        const columnsSQL = missingColumns.map(col => 
          `ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};\n` +
          `COMMENT ON COLUMN grade_data.${col.name} IS '${col.comment}';`
        ).join('\n');
        
        const addColumnsSQL = `
        DO $$
        BEGIN
          ${columnsSQL}
        END $$;
        `;
        
        try {
          const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: addColumnsSQL
          });
          
          if (!error) {
            console.log(`成功添加缺失的字段: ${missingColumns.map(c => c.name).join(', ')}`);
            
            missingColumns.forEach(col => {
              results.details[col.name] = { exists: false, added: true };
            });
          } else {
            // 即使发生错误，也可能有一些列已成功添加
            // 这里假设错误是由于某些列已存在导致的
            console.warn(`添加列时有警告: ${error.message}`);
            
            missingColumns.forEach(col => {
              if (error.message && error.message.includes(col.name) && 
                 (error.message.includes('already exists') || error.code === '42701')) {
                results.details[col.name] = { exists: true, method: 'error_inference' };
              } else {
                results.details[col.name] = { exists: false, added: true, warning: true };
              }
            });
          }
        } catch (execError) {
          console.error('执行SQL添加列失败:', execError);
          results.success = false;
          results.message = '尝试添加缺失字段时发生错误';
          return results;
        }
      }
      
      return results;
    } catch (error) {
      console.error('检查所有必要字段时出错:', error);
      return { 
        success: false, 
        error,
        message: `检查所有必要字段时出错: ${error instanceof Error ? error.message : '未知错误'}` 
      };
    }
  }
}; 