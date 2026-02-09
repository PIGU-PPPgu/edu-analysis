"use client";

/**
 * 教师能力增值报告组件
 * 聚焦于巩固率、转化率、贡献率等能力培养指标
 */

import { TeacherValueAddedReport } from "./TeacherValueAddedReport";
import type { TeacherValueAdded } from "@/types/valueAddedTypes";

interface TeacherAbilityReportProps {
  /** 教师增值数据 */
  data: TeacherValueAdded[];

  /** 科目名称 */
  subject: string;

  /** 是否显示加载状态 */
  loading?: boolean;
}

/**
 * 教师能力增值报告
 * 复用TeacherValueAddedReport，但默认聚焦于能力维度
 */
export function TeacherAbilityReport(props: TeacherAbilityReportProps) {
  // 直接复用TeacherValueAddedReport，但默认显示能力增值tab
  return <TeacherValueAddedReport {...props} initialTab="ability" />;
}
