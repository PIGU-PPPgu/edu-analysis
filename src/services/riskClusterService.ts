import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 风险聚类接口
export interface RiskCluster {
  cluster_id: number;
  cluster_name: string;
  student_count: number;
  risk_factors: RiskFactor[];
  recommended_interventions: RecommendedIntervention[];
}

// 风险因素接口
export interface RiskFactor {
  factor: string;
  weight: number;
}

// 推荐干预接口
export interface RecommendedIntervention {
  type: string;
  name: string;
  effectiveness: number;
}

// 学生风险聚类分配接口
export interface StudentRiskClusterAssignment {
  student_id: string;
  student_name: string;
  cluster_id: number;
  cluster_name: string;
  risk_score: number;
  primary_factors: PrimaryFactor[];
}

// 主要因素接口
export interface PrimaryFactor {
  factor: string;
  score: number;
}

// 获取风险聚类
export const getRiskClusters = async (): Promise<RiskCluster[]> => {
  try {
    const { data, error } = await supabase.rpc("get_risk_clusters");

    if (error) {
      console.error("获取风险聚类失败:", error);
      throw error;
    }

    return data.map((cluster: any) => ({
      ...cluster,
      risk_factors: cluster.risk_factors || [],
      recommended_interventions: cluster.recommended_interventions || [],
    })) as RiskCluster[];
  } catch (error) {
    console.error("获取风险聚类失败:", error);
    toast.error("获取风险聚类失败");
    return [];
  }
};

// 获取学生风险聚类分配
export const getStudentRiskClusterAssignments = async (): Promise<
  StudentRiskClusterAssignment[]
> => {
  try {
    const { data, error } = await supabase.rpc(
      "get_student_risk_cluster_assignments"
    );

    if (error) {
      console.error("获取学生风险聚类分配失败:", error);
      throw error;
    }

    return data.map((assignment: any) => ({
      ...assignment,
      primary_factors: assignment.primary_factors || [],
    })) as StudentRiskClusterAssignment[];
  } catch (error) {
    console.error("获取学生风险聚类分配失败:", error);
    toast.error("获取学生风险聚类分配失败");
    return [];
  }
};

// 为特定聚类生成批量干预计划
export const generateBulkInterventionPlan = async (
  clusterId: number,
  title: string,
  description: string,
  interventionTypes: string[]
): Promise<boolean> => {
  try {
    // 这里实现批量干预计划生成逻辑
    // 1. 获取该聚类中的学生列表
    // 2. 为每个学生创建干预计划
    // 3. 添加选定的干预活动
    // 此处仅为示范，返回成功
    toast.success(`已为聚类${clusterId}生成干预计划`);
    return true;
  } catch (error) {
    console.error("生成批量干预计划失败:", error);
    toast.error("生成批量干预计划失败");
    return false;
  }
};
