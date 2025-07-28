/**
 * 成绩分析自动触发服务
 * 在成绩导入成功后自动触发AI分析
 */

import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface AnalysisTriggerConfig {
  // 是否启用自动分析
  enabled: boolean;
  // 最少触发记录数
  minRecords: number;
  // 分析延迟时间（毫秒）
  delayMs: number;
  // 是否推送到企业微信
  pushToWechat: boolean;
  // 是否推送到Linear
  pushToLinear: boolean;
}

export class GradeAnalysisAutoTrigger {
  private config: AnalysisTriggerConfig;

  constructor(
    config: AnalysisTriggerConfig = {
      enabled: true,
      minRecords: 5,
      delayMs: 2000,
      pushToWechat: true,
      pushToLinear: true,
    }
  ) {
    this.config = config;
  }

  /**
   * 成绩导入成功后的回调函数
   * @param importedRecords 导入的记录数
   * @param importDetails 导入详情
   */
  async onGradeImportSuccess(importedRecords: number, importDetails?: any) {
    if (!this.config.enabled) {
      console.log("📊 成绩分析自动触发已禁用");
      return;
    }

    if (importedRecords < this.config.minRecords) {
      console.log(
        `📊 导入记录数 ${importedRecords} 未达到触发阈值 ${this.config.minRecords}`
      );
      return;
    }

    console.log(`📊 成绩导入成功，触发AI分析 (${importedRecords}条记录)`);

    // 显示开始分析的提示
    toast.info("🤖 正在启动AI成绩分析...", {
      description: `已导入 ${importedRecords} 条记录，将在 ${this.config.delayMs / 1000} 秒后开始分析`,
      duration: 3000,
    });

    // 延迟触发，确保数据已完全保存
    setTimeout(() => {
      this.triggerAnalysis(importedRecords, importDetails);
    }, this.config.delayMs);
  }

  /**
   * 触发AI分析
   */
  private async triggerAnalysis(importedRecords: number, importDetails?: any) {
    try {
      // 调用Supabase Edge Function或直接调用分析脚本
      const result = await this.executeAnalysisScript();

      if (result.success) {
        toast.success("🎉 AI成绩分析完成！", {
          description: "分析结果已推送到企业微信和Linear",
          duration: 5000,
        });

        // 可选：在前端显示分析结果
        this.showAnalysisResult(result.analysis);
      } else {
        toast.error("❌ AI分析失败", {
          description: result.error || "请检查系统配置",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("❌ 触发AI分析失败:", error);
      toast.error("❌ 触发AI分析失败", {
        description: "请检查网络连接和系统配置",
        duration: 5000,
      });
    }
  }

  /**
   * 执行分析脚本
   */
  private async executeAnalysisScript(): Promise<{
    success: boolean;
    analysis?: string;
    error?: string;
  }> {
    try {
      // 方法1: 通过Supabase Edge Function调用
      const { data, error } = await supabase.functions.invoke(
        "grade-analysis-trigger",
        {
          body: {
            timestamp: new Date().toISOString(),
            trigger_source: "web_import",
          },
        }
      );

      if (error) {
        console.error("Edge Function error:", error);

        // 方法2: 直接调用后端API
        return await this.callBackendAPI();
      }

      return { success: true, analysis: data?.analysis };
    } catch (error) {
      console.error("执行分析脚本失败:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 调用后端API
   */
  private async callBackendAPI(): Promise<{
    success: boolean;
    analysis?: string;
    error?: string;
  }> {
    try {
      const response = await fetch("/api/trigger-grade-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          trigger_source: "web_import",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("调用后端API失败:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 在前端显示分析结果
   */
  private showAnalysisResult(analysis: string) {
    // 这里可以实现分析结果的前端显示
    // 比如弹出模态框、更新分析页面等
    console.log("📊 AI分析结果:", analysis);

    // 可选：存储到localStorage供后续查看
    const analysisHistory = JSON.parse(
      localStorage.getItem("analysisHistory") || "[]"
    );
    analysisHistory.unshift({
      timestamp: new Date().toISOString(),
      analysis: analysis,
      trigger_source: "auto_import",
    });

    // 只保留最近10次分析
    if (analysisHistory.length > 10) {
      analysisHistory.splice(10);
    }

    localStorage.setItem("analysisHistory", JSON.stringify(analysisHistory));
  }

  /**
   * 手动触发分析
   */
  async manualTrigger() {
    toast.info("🤖 手动触发AI成绩分析...", {
      description: "正在分析最近上传的成绩数据",
      duration: 3000,
    });

    const result = await this.executeAnalysisScript();

    if (result.success) {
      toast.success("🎉 手动分析完成！", {
        description: "分析结果已推送到各个渠道",
        duration: 5000,
      });
    } else {
      toast.error("❌ 手动分析失败", {
        description: result.error || "请检查系统配置",
        duration: 5000,
      });
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<AnalysisTriggerConfig>) {
    this.config = { ...this.config, ...newConfig };

    // 保存配置到localStorage
    localStorage.setItem("analysisConfig", JSON.stringify(this.config));
  }

  /**
   * 获取配置
   */
  getConfig(): AnalysisTriggerConfig {
    return { ...this.config };
  }

  /**
   * 从localStorage加载配置
   */
  loadConfig(): AnalysisTriggerConfig {
    try {
      const saved = localStorage.getItem("analysisConfig");
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error("加载分析配置失败:", error);
    }

    return this.config;
  }
}

// 创建全局实例
export const gradeAnalysisAutoTrigger = new GradeAnalysisAutoTrigger();

// 从localStorage加载配置
gradeAnalysisAutoTrigger.loadConfig();
