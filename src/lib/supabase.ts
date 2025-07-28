import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";

// 确保 URL 和 API 密钥格式正确
const SUPABASE_URL = env.SUPABASE_URL.trim(); // 移除可能的空白字符
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY.replace(/%$/, ""); // 移除末尾可能的百分号

// Supabase client configured with secure connection

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  // 添加重试和错误处理
  global: {
    fetch: (...args) => {
      // 添加超时处理
      const timeout = 10000; // 10秒超时
      const controller = new AbortController();
      const { signal } = controller;

      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn("Supabase 请求超时");
      }, timeout);

      return fetch(...args, { signal })
        .then((response) => {
          clearTimeout(timeoutId);
          return response;
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          console.error("Supabase 请求失败:", error);
          return Promise.reject(error);
        });
    },
  },
});

// 添加一个重新连接方法
export const reconnectSupabase = () => {
  console.log("尝试重新连接 Supabase...");
  // 刷新页面是最简单的重新初始化连接的方法
  window.location.reload();
};

// 添加一个检查连接方法
export const checkSupabaseConnection = async () => {
  try {
    // 尝试读取一个表
    const { data, error } = await supabase.from("classes").select("*").limit(1);

    if (error) {
      console.error("Supabase 连接检查失败:", error);
      return false;
    }

    console.log("Supabase 连接正常");
    return true;
  } catch (e) {
    console.error("Supabase 连接检查异常:", e);
    return false;
  }
};
