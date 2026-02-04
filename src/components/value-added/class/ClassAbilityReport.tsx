"use client";

/**
 * 班级能力增值报告组件
 * 聚焦于巩固率、转化率、贡献率等能力培养指标
 */

import { ClassValueAddedReport } from "./ClassValueAddedReport";
import type { ClassValueAdded } from "@/types/valueAddedTypes";

interface ClassAbilityReportProps {
  /** 班级增值数据 */
  data: ClassValueAdded[];

  /** 科目名称 */
  subject: string;

  /** 是否显示加载状态 */
  loading?: boolean;
}

/**
 * 班级能力增值报告
 * 复用ClassValueAddedReport，但默认聚焦于能力维度
 */
export function ClassAbilityReport(props: ClassAbilityReportProps) {
  // 直接复用ClassValueAddedReport
  // 用户可以通过Tab切换到能力增值视图
  return <ClassValueAddedReport {...props} />;
}
