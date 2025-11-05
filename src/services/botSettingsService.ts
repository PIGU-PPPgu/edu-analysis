import { supabase } from "../lib/supabase";

export type BotType = "wechat" | "dingtalk";

export interface BotSettings {
  id?: string;
  user_id?: string;
  bot_type: BotType;
  bot_name: string;
  webhook_url: string;
  is_enabled: boolean;
  is_default: boolean;
  settings?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface TestBotResult {
  success: boolean;
  message: string;
  timestamp?: string;
  response?: any;
  code?: number;
}

class BotSettingsService {
  // 获取用户的所有机器人设置
  async getUserBotSettings(userId?: string): Promise<BotSettings[]> {
    try {
      let query = supabase
        .from("user_bot_settings")
        .select("*")
        .order("bot_type", { ascending: true })
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("获取机器人设置失败:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("获取机器人设置异常:", error);
      throw error;
    }
  }

  // 获取特定类型的机器人设置
  async getBotSettingsByType(
    botType: BotType,
    userId?: string
  ): Promise<BotSettings[]> {
    try {
      let query = supabase
        .from("user_bot_settings")
        .select("*")
        .eq("bot_type", botType)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`获取${botType}机器人设置失败:`, error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error(`获取${botType}机器人设置异常:`, error);
      throw error;
    }
  }

  // 获取默认机器人设置
  async getDefaultBotSettings(
    botType: BotType,
    userId?: string
  ): Promise<BotSettings | null> {
    try {
      let query = supabase
        .from("user_bot_settings")
        .select("*")
        .eq("bot_type", botType)
        .eq("is_default", true)
        .eq("is_enabled", true)
        .single();

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found
        console.error(`获取默认${botType}机器人设置失败:`, error);
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error(`获取默认${botType}机器人设置异常:`, error);
      throw error;
    }
  }

  // 保存机器人设置
  async saveBotSettings(
    settings: Omit<BotSettings, "id" | "user_id" | "created_at" | "updated_at">
  ): Promise<BotSettings> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error("用户未登录");
      }

      // 如果设置为默认，先清除同类型的其他默认设置
      if (settings.is_default) {
        await supabase
          .from("user_bot_settings")
          .update({ is_default: false })
          .eq("user_id", user.user.id)
          .eq("bot_type", settings.bot_type);
      }

      const { data, error } = await supabase
        .from("user_bot_settings")
        .upsert(
          {
            user_id: user.user.id,
            ...settings,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,bot_type,bot_name",
          }
        )
        .select()
        .single();

      if (error) {
        console.error("保存机器人设置失败:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("保存机器人设置异常:", error);
      throw error;
    }
  }

  // 删除机器人设置
  async deleteBotSettings(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("user_bot_settings")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("删除机器人设置失败:", error);
        throw error;
      }
    } catch (error) {
      console.error("删除机器人设置异常:", error);
      throw error;
    }
  }

  // 测试机器人连接
  async testBotConnection(
    botType: BotType,
    webhookUrl: string
  ): Promise<TestBotResult> {
    try {
      const functionName =
        botType === "wechat" ? "test-wechat" : "test-dingtalk";

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { webhook_url: webhookUrl },
      });

      if (error) {
        return {
          success: false,
          message: `测试失败: ${error.message}`,
          timestamp: new Date().toISOString(),
        };
      }

      return data as TestBotResult;
    } catch (error) {
      console.error("测试机器人连接异常:", error);
      return {
        success: false,
        message: `测试异常: ${error}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // 获取启用的机器人设置（用于推送）
  async getEnabledBotSettings(userId?: string): Promise<BotSettings[]> {
    try {
      let query = supabase
        .from("user_bot_settings")
        .select("*")
        .eq("is_enabled", true)
        .order("bot_type", { ascending: true })
        .order("is_default", { ascending: false });

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("获取启用的机器人设置失败:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("获取启用的机器人设置异常:", error);
      throw error;
    }
  }

  // 切换机器人启用状态
  async toggleBotEnabled(id: string, enabled: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from("user_bot_settings")
        .update({
          is_enabled: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("切换机器人状态失败:", error);
        throw error;
      }
    } catch (error) {
      console.error("切换机器人状态异常:", error);
      throw error;
    }
  }

  // 设置默认机器人
  async setDefaultBot(id: string, botType: BotType): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error("用户未登录");
      }

      // 先清除同类型的其他默认设置
      await supabase
        .from("user_bot_settings")
        .update({ is_default: false })
        .eq("user_id", user.user.id)
        .eq("bot_type", botType);

      // 设置新的默认机器人
      const { error } = await supabase
        .from("user_bot_settings")
        .update({
          is_default: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("设置默认机器人失败:", error);
        throw error;
      }
    } catch (error) {
      console.error("设置默认机器人异常:", error);
      throw error;
    }
  }
}

export const botSettingsService = new BotSettingsService();
