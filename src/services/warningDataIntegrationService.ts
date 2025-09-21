/**
 * 预警数据集成服务
 * 负责预警系统与AutoSyncService之间的数据桥接和一致性维护
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DataIntegrityReport {
  totalGradeRecords: number;
  missingStudentIds: number;
  orphanedRecords: number;
  inconsistentClassRefs: number;
  fixedRecords: number;
  errors: string[];
}

export interface WarningTriggerEvent {
  type: 'data_sync_complete' | 'manual_refresh' | 'scheduled_update';
  affectedClasses: string[];
  affectedStudents: number;
  timestamp: string;
}

export class WarningDataIntegrationService {
  
  /**
   * 数据完整性检查和自动修复
   */
  async checkAndRepairDataIntegrity(classNames?: string[]): Promise<DataIntegrityReport> {
    console.log('🔍 [预警集成] 开始数据完整性检查和修复...');
    
    const report: DataIntegrityReport = {
      totalGradeRecords: 0,
      missingStudentIds: 0,
      orphanedRecords: 0,
      inconsistentClassRefs: 0,
      fixedRecords: 0,
      errors: []
    };

    try {
      // 1. 查询需要检查的成绩数据
      let gradeQuery = supabase.from('grade_data_new').select(`
        student_id,
        name,
        class_name,
        exam_title,
        total_score
      `);

      if (classNames && classNames.length > 0) {
        gradeQuery = gradeQuery.in('class_name', classNames);
      }

      const { data: gradeData, error: gradeError } = await gradeQuery;
      if (gradeError) throw gradeError;

      report.totalGradeRecords = gradeData?.length || 0;
      console.log(`📊 检查 ${report.totalGradeRecords} 条成绩记录`);

      if (!gradeData || gradeData.length === 0) {
        return report;
      }

      // 2. 识别缺少student_id的记录
      const recordsWithMissingIds = gradeData.filter(record => 
        !record.student_id || record.student_id.trim() === ''
      );
      report.missingStudentIds = recordsWithMissingIds.length;

      console.log(`⚠️ 发现 ${report.missingStudentIds} 条缺少student_id的记录`);

      // 3. 修复缺少student_id的记录
      if (recordsWithMissingIds.length > 0) {
        const fixedCount = await this.repairMissingStudentIds(recordsWithMissingIds);
        report.fixedRecords += fixedCount;
      }

      // 4. 检查孤立记录（student_id存在但students表中不存在对应记录）
      const uniqueStudentIds = [...new Set(
        gradeData
          .filter(record => record.student_id)
          .map(record => record.student_id)
      )];

      if (uniqueStudentIds.length > 0) {
        const { data: existingStudents } = await supabase
          .from('students')
          .select('id')
          .in('id', uniqueStudentIds);

        const existingIds = new Set(existingStudents?.map(s => s.id) || []);
        const orphanedIds = uniqueStudentIds.filter(id => !existingIds.has(id));
        report.orphanedRecords = orphanedIds.length;

        console.log(`🔍 发现 ${report.orphanedRecords} 个孤立的student_id引用`);
      }

      // 5. 检查班级关联一致性
      const classInconsistencies = await this.checkClassConsistency(gradeData);
      report.inconsistentClassRefs = classInconsistencies.length;

      if (classInconsistencies.length > 0) {
        console.log(`⚠️ 发现 ${report.inconsistentClassRefs} 个班级关联不一致`);
        const classFixedCount = await this.repairClassInconsistencies(classInconsistencies);
        report.fixedRecords += classFixedCount;
      }

      console.log(`✅ [预警集成] 数据完整性检查完成，修复了 ${report.fixedRecords} 条记录`);
      return report;

    } catch (error) {
      console.error('❌ [预警集成] 数据完整性检查失败:', error);
      report.errors.push(error instanceof Error ? error.message : '未知错误');
      return report;
    }
  }

  /**
   * 修复缺少student_id的记录
   */
  private async repairMissingStudentIds(records: any[]): Promise<number> {
    console.log('🔧 [预警集成] 修复缺少student_id的记录...');
    
    let fixedCount = 0;
    const batchSize = 10;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          // 根据姓名和班级查找对应的学生ID
          const { data: student } = await supabase
            .from('students')
            .select('id')
            .eq('name', record.name)
            .eq('classes.name', record.class_name)
            .single();

          if (student) {
            // 更新成绩记录的student_id
            const { error: updateError } = await supabase
              .from('grade_data_new')
              .update({ student_id: student.id })
              .eq('name', record.name)
              .eq('class_name', record.class_name)
              .is('student_id', null);

            if (!updateError) {
              fixedCount++;
              console.log(`✅ 修复 ${record.name}(${record.class_name}) 的student_id引用`);
            }
          }
        } catch (error) {
          console.warn(`⚠️ 无法修复 ${record.name}(${record.class_name}):`, error);
        }
      }

      // 避免过度请求，添加短暂延迟
      if (i + batchSize < records.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return fixedCount;
  }

  /**
   * 检查班级关联一致性
   */
  private async checkClassConsistency(gradeData: any[]): Promise<Array<{
    studentName: string;
    gradeClassName: string;
    studentTableClassName: string;
    studentId: string;
  }>> {
    const inconsistencies: Array<{
      studentName: string;
      gradeClassName: string;
      studentTableClassName: string;
      studentId: string;
    }> = [];

    // 按学生分组检查
    const studentGroups = new Map<string, any[]>();
    gradeData.forEach(record => {
      if (record.student_id) {
        if (!studentGroups.has(record.student_id)) {
          studentGroups.set(record.student_id, []);
        }
        studentGroups.get(record.student_id)!.push(record);
      }
    });

    // 批量查询学生信息
    const studentIds = Array.from(studentGroups.keys());
    if (studentIds.length === 0) return inconsistencies;

    const { data: studentsData } = await supabase
      .from('students')
      .select('id, name, classes(name)')
      .in('id', studentIds);

    // 检查每个学生的班级一致性
    studentsData?.forEach(student => {
      const gradeRecords = studentGroups.get(student.id) || [];
      const studentTableClassName = student.classes?.name;
      
      gradeRecords.forEach(record => {
        if (record.class_name !== studentTableClassName) {
          inconsistencies.push({
            studentName: student.name,
            gradeClassName: record.class_name,
            studentTableClassName: studentTableClassName || '未知',
            studentId: student.id
          });
        }
      });
    });

    return inconsistencies;
  }

  /**
   * 修复班级关联不一致
   */
  private async repairClassInconsistencies(inconsistencies: Array<{
    studentName: string;
    gradeClassName: string;
    studentTableClassName: string;
    studentId: string;
  }>): Promise<number> {
    console.log('🔧 [预警集成] 修复班级关联不一致...');
    
    let fixedCount = 0;

    for (const inconsistency of inconsistencies) {
      try {
        // 查找成绩数据中的班级是否存在
        const { data: correctClass } = await supabase
          .from('classes')
          .select('id')
          .eq('name', inconsistency.gradeClassName)
          .single();

        if (correctClass) {
          // 更新学生表中的班级关联
          const { error: updateError } = await supabase
            .from('students')
            .update({ class_id: correctClass.id })
            .eq('id', inconsistency.studentId);

          if (!updateError) {
            fixedCount++;
            console.log(`✅ 修复 ${inconsistency.studentName} 的班级关联: ${inconsistency.studentTableClassName} -> ${inconsistency.gradeClassName}`);
          }
        }
      } catch (error) {
        console.warn(`⚠️ 无法修复 ${inconsistency.studentName} 的班级关联:`, error);
      }
    }

    return fixedCount;
  }

  /**
   * 触发预警系统更新
   */
  async triggerWarningUpdate(event: WarningTriggerEvent): Promise<boolean> {
    console.log('🚨 [预警集成] 触发预警系统更新:', event);
    
    try {
      // 1. 先进行数据完整性检查和修复
      const integrityReport = await this.checkAndRepairDataIntegrity(event.affectedClasses);
      
      if (integrityReport.errors.length > 0) {
        console.warn('⚠️ 数据完整性检查发现问题:', integrityReport.errors);
      }

      // 2. 清理预警数据缓存（如果使用了缓存）
      await this.clearWarningCache(event.affectedClasses);

      // 3. 通知前端组件刷新数据
      if (event.affectedStudents > 0) {
        toast.success(`预警数据已更新`, {
          description: `影响 ${event.affectedClasses.length} 个班级，${event.affectedStudents} 名学生`
        });
      }

      console.log('✅ [预警集成] 预警系统更新完成');
      return true;

    } catch (error) {
      console.error('❌ [预警集成] 触发预警更新失败:', error);
      toast.error('预警数据更新失败', {
        description: '请稍后重试或联系管理员'
      });
      return false;
    }
  }

  /**
   * 清理预警数据缓存
   */
  private async clearWarningCache(classNames?: string[]): Promise<void> {
    // 这里可以实现具体的缓存清理逻辑
    // 例如清理localStorage、sessionStorage或其他缓存机制
    console.log('🧹 [预警集成] 清理预警数据缓存:', classNames);
  }

  /**
   * 获取数据集成状态报告
   */
  async getIntegrationStatus(): Promise<{
    isHealthy: boolean;
    lastCheckTime: string;
    issues: string[];
    recommendations: string[];
  }> {
    const report = await this.checkAndRepairDataIntegrity();
    
    const isHealthy = report.errors.length === 0 && 
      report.missingStudentIds === 0 && 
      report.orphanedRecords === 0;

    const issues: string[] = [];
    const recommendations: string[] = [];

    if (report.missingStudentIds > 0) {
      issues.push(`${report.missingStudentIds} 条成绩记录缺少学生ID关联`);
      recommendations.push('运行数据同步修复工具');
    }

    if (report.orphanedRecords > 0) {
      issues.push(`${report.orphanedRecords} 条成绩记录引用了不存在的学生`);
      recommendations.push('清理无效数据或重新导入学生信息');
    }

    if (report.inconsistentClassRefs > 0) {
      issues.push(`${report.inconsistentClassRefs} 个班级关联不一致`);
      recommendations.push('更新学生班级关联信息');
    }

    return {
      isHealthy,
      lastCheckTime: new Date().toISOString(),
      issues,
      recommendations
    };
  }
}

// 导出单例实例
export const warningDataIntegrationService = new WarningDataIntegrationService();