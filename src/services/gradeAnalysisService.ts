import { supabase, checkTableExists as supabaseCheckTableExists } from '@/integrations/supabase/client';
import type { ExamInfo } from '@/components/analysis/ImportReviewDialog';

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

/**
 * 检查表是否存在
 * @param tableName 表名
 * @returns 表是否存在
 */
const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    console.log(`检查表 ${tableName} 是否存在...`);
    
    // 使用更可靠的函数检查表是否存在
    const { exists, error } = await supabaseCheckTableExists(tableName);
    
    if (error) {
      console.warn(`检查表 ${tableName} 存在性时出现警告:`, error);
    }
    
    console.log(`表 ${tableName} 存在性检查结果:`, exists);
    return exists;
  } catch (error) {
    console.error(`检查表 ${tableName} 存在性时出现异常:`, error);
    // 如果出错，我们尝试直接查询表
    try {
      // 使用直接查询表的方式来检查表是否存在
      // 只获取一条记录，并且只计数不返回数据
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      // 如果错误码是 '42P01'，说明表不存在
      if (error) {
        if (error.code === '42P01') { // '42P01' 是 PostgreSQL 中"表不存在"的错误代码
          console.log(`表 ${tableName} 不存在`);
          return false;
        }
        
        // 其他错误可能是权限问题等，但表可能存在
        console.warn(`查询表 ${tableName} 时出现非关系不存在错误:`, error);
        // 如果不是表不存在的错误，我们认为表存在但有其他限制
        return true;
      }
      
      // 没有错误，表肯定存在
      console.log(`表 ${tableName} 存在`);
      return true;
    } catch {
      // 如果连直接查询都失败，假定表不存在
      return false;
    }
  }
};

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
    mergeStrategy: MergeStrategy = 'replace'
  ) {
    try {
      // 检查必要的表是否存在
      const examsTableExists = await checkTableExists('exams');
      const gradeDataTableExists = await checkTableExists('grade_data');
      const studentsTableExists = await checkTableExists('students');
      
      if (!examsTableExists || !gradeDataTableExists) {
        throw new Error(`数据表缺失: ${!examsTableExists ? 'exams' : ''} ${!gradeDataTableExists ? 'grade_data' : ''} 表不存在`);
      }
    
      // 准备考试数据
      const examData = {
        title: examInfo.title,
        type: examInfo.type,
        date: examInfo.date,
        subject: examInfo.subject || null
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
        // 如果没有匹配到学生但studentsTableExists为真，尝试自动创建学生记录
        else if (studentsTableExists && studentInfo.name && (studentInfo.student_id || studentInfo.class_name)) {
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

      if (result?.error) throw result.error;
      
      // 返回结果中包含匹配统计信息
      const matchStats = {
        total: matchResults.length,
        matchedById: matchResults.filter(r => r.matchType === 'id').length,
        matchedByNameAndClass: matchResults.filter(r => r.matchType === 'name_class').length,
        matchedByNameOnly: matchResults.filter(r => r.matchType === 'name').length,
        noMatch: matchResults.filter(r => r.matchType === 'none').length,
        multipleMatches: matchResults.filter(r => r.multipleMatches).length
      };
      
      return { 
        success: true, 
        examId, 
        count: processedData.length, 
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
    return safeQuery('exams', async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('id, title, type, date, subject')
        .order('date', { ascending: false });
        
      if (error) throw error;
      
      return { data, error: null };
    });
  },
  
  /**
   * 获取考试成绩数据
   */
  async getExamResults(examId: string) {
    return safeQuery('grade_data', async () => {
      const { data, error } = await supabase
        .from('grade_data')
        .select('*')
        .eq('exam_id', examId);
        
      if (error) throw error;
      
      return { data, error: null };
    });
  },
  
  /**
   * 获取学生历次成绩
   */
  async getStudentResults(studentId: string) {
    try {
      const { data, error } = await supabase
        .from('grade_data')
        .select('*, exams!inner(*)')
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
        .select('*, exams!inner(*)')
        .eq('student_id', studentId)
        .order('exams.date', { ascending: true });
        
      if (subjectFilter && subjectFilter.length > 0) {
        // 如果提供了科目过滤条件
        const metadataQuery = subjectFilter.map(subject => 
          `metadata->>'${subject}_score' is not null`
        ).join(' or ');
        
        if (metadataQuery) {
          query = query.or(metadataQuery);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // 按考试日期和科目组织数据
      const trendData = data.reduce((acc: any, record) => {
        const examDate = record.exams.date;
        const examTitle = record.exams.title;
        
        // 处理总分
        if (record.total_score !== undefined) {
          if (!acc['总分']) {
            acc['总分'] = [];
          }
          
          acc['总分'].push({
            date: examDate,
            exam: examTitle,
            score: record.total_score
          });
        }
        
        // 处理各科目分数
        if (record.metadata) {
          Object.keys(record.metadata).forEach(key => {
            if (key.endsWith('_score')) {
              const subject = key.replace('_score', '');
              const score = record.metadata[key];
              
              if (!acc[subject]) {
                acc[subject] = [];
              }
              
              acc[subject].push({
                date: examDate,
                exam: examTitle,
                score: score
              });
            }
          });
        }
        
        return acc;
      }, {});
      
      return { data: trendData, error: null };
    } catch (error) {
      console.error('获取学生成绩趋势失败:', error);
      return { data: {}, error };
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
        checkTableExists('grade_tags'),
        checkTableExists('grade_data_tags')
      ]);
      
      if (tablesExist.every(Boolean)) {
        return { success: true, message: '数据库表初始化成功' };
      } else {
        const missingTables = ['exams', 'grade_data', 'grade_tags', 'grade_data_tags']
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
   * 获取交叉分析数据
   * @param rowDimension 行维度
   * @param colDimension 列维度
   * @param metric 分析指标
   */
  getCrossDimensionData: async (rowDimension: string, colDimension: string, metric: string) => {
    try {
      // 这里可以替换为实际的API调用
      // const response = await fetch('/api/analysis/cross-dimension', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ rowDimension, colDimension, metric })
      // });
      // const data = await response.json();
      // return data;
      
      // 目前使用模拟数据
      return gradeAnalysisService.generateMockCrossDimensionData(rowDimension, colDimension, metric);
    } catch (error) {
      console.error("获取交叉维度分析数据失败:", error);
      throw new Error("获取交叉维度分析数据失败");
    }
  },

  /**
   * 生成模拟的交叉分析数据
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
}; 