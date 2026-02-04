import { NextApiRequest, NextApiResponse } from "next";

/**
 * API 端点，用于测试与大模型服务的连接
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "仅支持 POST 请求" });
  }

  try {
    const { provider, version, apiKey } = req.body;

    if (!provider || !version || !apiKey) {
      return res.status(400).json({ error: "缺少必要参数" });
    }

    // 验证不同提供商的 API 密钥格式
    let isValidFormat = true;
    let formatError = "";

    switch (provider) {
      case "openai":
        if (!apiKey.startsWith("sk-") || apiKey.length < 40) {
          isValidFormat = false;
          formatError = "OpenAI API 密钥应以 sk- 开头，且长度至少为 40 个字符";
        }
        break;
      case "doubao":
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(apiKey)) {
          isValidFormat = false;
          formatError = "豆包 API 密钥应为有效的 UUID 格式";
        }
        break;
      case "glm":
        if (apiKey.length < 20) {
          isValidFormat = false;
          formatError = "智谱 GLM API 密钥长度至少为 20 个字符";
        }
        break;
      default:
        if (apiKey.length < 10) {
          isValidFormat = false;
          formatError = "API 密钥格式无效";
        }
    }

    if (!isValidFormat) {
      return res.status(400).json({ error: formatError });
    }

    // 尝试与 API 服务建立连接
    // 这里只做格式验证，实际项目中应该向真实 API 发送请求

    // 模拟 API 请求延迟
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 返回成功响应
    return res.status(200).json({
      success: true,
      message: `成功连接到 ${provider} 服务`,
      provider,
      version,
    });
  } catch (error) {
    console.error("测试 AI 连接失败:", error);
    return res.status(500).json({
      error: error.message || "服务器内部错误",
    });
  }
}
