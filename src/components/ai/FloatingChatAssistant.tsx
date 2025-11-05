/**
 * 浮动AI聊天助手组件
 * 可最小化为小图标，支持多AI模型对话
 */

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Minimize2,
  Maximize2,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Settings,
  Brain,
  Sparkles,
  Database,
  BarChart3,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  chatWithModel,
  getConfiguredChineseAIModels,
} from "@/services/aiService";
import { getUserAIConfig } from "@/utils/userAuth";
import {
  getRelevantDataForQuestion,
  formatDataForAI,
} from "@/services/aiDataService";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string;
}

interface FloatingChatAssistantProps {
  className?: string;
  defaultMinimized?: boolean;
}

export const FloatingChatAssistant: React.FC<FloatingChatAssistantProps> = ({
  className = "",
  defaultMinimized = true,
}) => {
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<{
    providerId: string;
    modelId: string;
    displayName: string;
  } | null>(null);
  const [availableModels, setAvailableModels] = useState<
    {
      providerId: string;
      providerName: string;
      modelId: string;
      modelName: string;
    }[]
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Stop ongoing conversation
  const handleStopConversation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);

    // Add a system message indicating the conversation was stopped
    const stopMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: "⏹️ 对话已终止",
      timestamp: new Date(),
      model: "System",
    };
    setMessages((prev) => [...prev, stopMessage]);
  };

  // 加载全局默认AI模型（只显示全局设置的默认模型）
  useEffect(() => {
    const loadAvailableModels = async () => {
      try {
        // 获取全局AI配置
        const globalConfig = localStorage.getItem("global_ai_config");
        if (!globalConfig) {
          setMessages([
            {
              id: "1",
              role: "assistant",
              content:
                "❗ 未检测到全局AI配置。请在AI设置中配置默认模型后再使用聊天功能。",
              timestamp: new Date(),
              model: "System",
            },
          ]);
          return;
        }

        const config = JSON.parse(globalConfig);
        const defaultProvider = config.defaultProvider;
        const defaultModel = config.defaultModel;

        if (!defaultProvider || !defaultModel) {
          setMessages([
            {
              id: "1",
              role: "assistant",
              content:
                '❗ 未设置默认AI模型。请在"全局设置"中选择默认提供商和模型。',
              timestamp: new Date(),
              model: "System",
            },
          ]);
          return;
        }

        // 获取所有配置的模型，找到默认模型
        const allModels = await getConfiguredChineseAIModels();
        const defaultModelInfo = allModels.find(
          (m) => m.providerId === defaultProvider && m.modelId === defaultModel
        );

        if (defaultModelInfo) {
          // 只设置默认模型（不显示其他模型）
          setAvailableModels([defaultModelInfo]);

          const newSelectedModel = {
            providerId: defaultModelInfo.providerId,
            modelId: defaultModelInfo.modelId,
            displayName: `${defaultModelInfo.providerName} - ${defaultModelInfo.modelName}`,
          };
          setSelectedModel(newSelectedModel);

          // 添加欢迎消息
          setMessages([
            {
              id: "1",
              role: "assistant",
              content:
                "👋 你好！我是AI教学助手，专门帮助分析学生成绩数据和提供教学建议。有什么需要我帮助的吗？",
              timestamp: new Date(),
              model: newSelectedModel.displayName,
            },
          ]);
        } else {
          setMessages([
            {
              id: "1",
              role: "assistant",
              content:
                "❗ 无法加载默认模型。请检查AI设置中的提供商配置和API密钥。",
              timestamp: new Date(),
              model: "System",
            },
          ]);
        }
      } catch (error) {
        console.error("加载AI模型失败:", error);
        setMessages([
          {
            id: "1",
            role: "assistant",
            content: "🚫 AI模型加载失败，请检查网络连接或刷新页面重试。",
            timestamp: new Date(),
            model: "System",
          },
        ]);
      }
    };

    loadAvailableModels();
  }, []); // 移除selectedModel依赖，避免循环

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // 检查是否选择了AI模型
    if (!selectedModel) {
      console.error("未选择AI模型");
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content:
          "❗ 请先在AI设置中配置中文AI模型（如豆包、deepseek），然后刷新页面重试。",
        timestamp: new Date(),
        model: "System",
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // 智能数据获取 - 根据用户问题自动读取相关数据
      let dataContext = "";
      let hasDataError = false;
      let hasRealData = false;

      try {
        const relevantData = await getRelevantDataForQuestion(
          userMessage.content
        );

        if (relevantData.dataType === "error") {
          dataContext = `\n\n【数据状态】${relevantData.suggestion}`;
          hasDataError = true;
        } else if (relevantData.data) {
          // 检查是否有真实数据
          if (relevantData.dataType === "summary") {
            const summary = relevantData.data as any;
            hasRealData =
              summary.recentExams?.length > 0 && summary.totalStudents > 0;
          } else if (relevantData.dataType === "examDetail") {
            const detail = relevantData.data as any;
            hasRealData = detail.examInfo?.totalStudents > 0;
          }

          if (hasRealData) {
            dataContext = `\n\n【相关数据】\n${formatDataForAI(relevantData.data, relevantData.dataType, relevantData.frontendContext)}`;
          } else {
            dataContext =
              "\n\n【数据状态】系统检测到数据为空，请先导入考试成绩。";
            hasDataError = true;
          }
        }
      } catch (dataError) {
        console.warn("获取数据上下文失败:", dataError);
        dataContext = "\n\n【数据状态】系统无法获取成绩数据，请先导入数据。";
        hasDataError = true;
      }

      // 构建对话历史，限制上下文长度
      const conversationHistory = getRecentConversationHistory(messages, 10); // 最近10条消息

      // 检查话题相关性
      const isEducationRelated = checkEducationRelevance(userMessage.content);

      if (!isEducationRelated) {
        // 非教育相关话题，礼貌拒绝并引导
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "我是专门的教育AI助手，只能帮助分析学生成绩和提供教学建议。\n\n我可以帮您：\n📊 分析考试成绩数据\n🎯 识别学习问题\n💡 提供教学改进建议\n📈 解读成绩趋势\n\n请问您有什么关于学生成绩或教学方面的问题吗？",
          timestamp: new Date(),
          model: selectedModel.displayName,
        };
        setMessages((prev) => [...prev, aiResponse]);
        return;
      }

      // 构建增强的用户消息（包含数据上下文）
      const enhancedUserMessage = userMessage.content + dataContext;

      // 使用新的聊天API进行对话
      const aiResponseContent = await chatWithModel(
        selectedModel.providerId,
        selectedModel.modelId,
        enhancedUserMessage,
        {
          temperature: 0.7,
          maxTokens: hasDataError ? 800 : 1500, // 有数据时允许更长回复
          conversationHistory,
          systemPrompt: hasDataError
            ? '你是一个专业的教育AI助手。【重要】当前系统无法获取成绩数据，请明确告知用户："系统当前无法获取成绩数据，请先导入考试成绩后再进行分析。"不要提供任何基于假设的教学建议。回答控制在50字以内。'
            : '你是一个专业的教育AI助手，只回答教育教学相关问题。你可以同时访问前端上下文和后端数据。如果数据标注为"演示数据"，请在分析时明确提醒用户这是示例数据，建议导入真实数据获取准确分析。如果是真实数据，请结合用户当前的使用情况给出针对性建议。重点关注：1)用户当前关注的内容 2)数据洞察 3)问题识别 4)改进建议。回答控制在150字以内。',
        }
      );

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponseContent,
        timestamp: new Date(),
        model: selectedModel.displayName,
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error: any) {
      console.error("AI响应错误:", error);

      // Check if the error is due to abort
      if (
        error.name === "AbortError" ||
        abortControllerRef.current?.signal.aborted
      ) {
        // Don't show error message for intentional abort
        return;
      }

      // 错误处理：提供友好的错误信息和后备响应
      let errorMessage = "";
      if (error.message.includes("请先在AI设置中配置")) {
        errorMessage = "❗ 请先在AI设置中配置AI服务。";
      } else if (error.message.includes("API密钥")) {
        errorMessage = "🔑 AI服务API密钥有误，请检查AI设置。";
      } else if (error.message.includes("网络")) {
        errorMessage = "🌐 网络连接失败，请检查网络状态。";
      } else {
        errorMessage = "🤖 AI服务暂时不可用，";
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errorMessage + generateMockResponse(userMessage.content),
        timestamp: new Date(),
        model: "System (备用)",
      };
      setMessages((prev) => [...prev, aiResponse]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const getRecentConversationHistory = (
    messages: Message[],
    maxMessages: number = 10
  ) => {
    // 计算总字符数来决定是否需要压缩
    const totalChars = messages.reduce(
      (sum, msg) => sum + msg.content.length,
      0
    );
    const maxContextChars = 8000; // 最大上下文字符数

    let recentMessages = messages;

    // 如果总字符数超过限制，则使用消息数限制
    if (totalChars > maxContextChars) {
      recentMessages = messages.slice(-maxMessages);

      // 保留第一条欢迎消息（如果存在且不在最近消息中）
      if (
        messages.length > maxMessages &&
        messages[0].role === "assistant" &&
        messages[0].content.includes("你好！我是AI教学助手")
      ) {
        recentMessages = [messages[0], ...recentMessages.slice(1)];
      }
    }

    // 压缩长消息内容
    return recentMessages.map((msg) => ({
      role: msg.role,
      content:
        msg.content.length > 500
          ? msg.content.substring(0, 500) + "..."
          : msg.content,
    }));
  };

  const checkEducationRelevance = (message: string): boolean => {
    const educationKeywords = [
      // 教育核心词汇
      "成绩",
      "分数",
      "考试",
      "学生",
      "班级",
      "科目",
      "教学",
      "学习",
      "老师",
      "教师",
      "分析",
      "数据",
      "统计",
      "排名",
      "及格",
      "优秀",
      "表现",
      "趋势",
      "建议",

      // 具体科目
      "语文",
      "数学",
      "英语",
      "物理",
      "化学",
      "政治",
      "历史",
      "地理",
      "生物",

      // 教学相关
      "辅导",
      "复习",
      "练习",
      "作业",
      "课程",
      "知识点",
      "薄弱",
      "进步",
      "退步",
      "问题",
      "方法",
      "策略",
      "改进",
      "提高",
      "帮助",

      // 数据分析相关
      "平均",
      "最高",
      "最低",
      "对比",
      "比较",
      "差异",
      "分布",
      "波动",

      // 问候和系统相关（允许）
      "你好",
      "您好",
      "hello",
      "hi",
      "帮助",
      "功能",
      "怎么",
      "如何",
      "什么",
    ];

    const lowerMessage = message.toLowerCase();

    // 检查是否包含教育相关关键词
    const hasEducationKeywords = educationKeywords.some((keyword) =>
      lowerMessage.includes(keyword.toLowerCase())
    );

    // 明确非教育话题的关键词
    const nonEducationKeywords = [
      "天气",
      "股票",
      "游戏",
      "电影",
      "音乐",
      "美食",
      "旅游",
      "购物",
      "娱乐",
      "八卦",
      "明星",
      "体育",
      "足球",
      "篮球",
      "小说",
      "笑话",
      "段子",
      "新闻",
      "政治",
      "经济",
      "房价",
      "车",
      "手机",
      "电脑",
    ];

    const hasNonEducationKeywords = nonEducationKeywords.some((keyword) =>
      lowerMessage.includes(keyword.toLowerCase())
    );

    // 如果包含非教育关键词，直接返回false
    if (hasNonEducationKeywords) {
      return false;
    }

    // 如果包含教育关键词，返回true
    if (hasEducationKeywords) {
      return true;
    }

    // 对于很短的消息（可能是问候），允许通过
    if (message.trim().length <= 10) {
      return true;
    }

    // 默认情况下，不确定的话题也当作非教育相关
    return false;
  };

  const generateMockResponse = (userInput: string): string => {
    const responses = [
      "📊 根据成绩数据分析，我建议关注数学科目的表现差异，可以考虑分组教学。",
      "🎯 从趋势分析来看，这位学生在理科方面有很大潜力，建议加强练习。",
      "📈 班级整体成绩稳步提升，建议继续保持现有教学策略。",
      "⚠️ 发现部分学生成绩波动较大，建议增加个别辅导时间。",
      "💡 建议在下次考试前重点复习薄弱环节，特别是基础概念部分。",
      "🔍 数据显示学生在应用题方面需要加强训练，可以增加相关练习。",
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 快捷操作按钮
  const handleQuickAction = async (
    action: "overview" | "recentExam" | "suggestions"
  ) => {
    if (!selectedModel || isLoading) return;

    // 先检查数据可用性
    try {
      const relevantData = await getRelevantDataForQuestion("检查数据状态");
      if (relevantData.dataType === "error") {
        // 如果没有数据，直接显示提示
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content:
            '📊 系统检测到暂无成绩数据。\n\n请先通过以下步骤导入数据：\n1. 点击"导入成绩"功能\n2. 上传CSV格式的成绩文件\n3. 完成导入后即可使用AI分析功能',
          timestamp: new Date(),
          model: selectedModel.displayName,
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }
    } catch (error) {
      console.warn("检查数据状态失败:", error);
    }

    let quickMessage = "";
    switch (action) {
      case "overview":
        quickMessage =
          "请帮我分析一下最近的整体成绩情况，包括各班级和科目的表现。";
        break;
      case "recentExam":
        quickMessage =
          "请详细分析最近一次考试的成绩情况，包括各科目表现和需要关注的学生。";
        break;
      case "suggestions":
        quickMessage = "基于当前的成绩数据，请给出具体的教学改进建议。";
        break;
    }

    setInput(quickMessage);

    // 自动发送消息
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  // 最小化状态的小图标
  if (isMinimized) {
    return (
      <div className={cn("fixed bottom-6 right-6 z-50", className)}>
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-14 w-14 rounded-full bg-[#B9FF66] hover:bg-[#A8E055] border-2 border-black shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
        >
          <div className="relative">
            <MessageCircle className="h-6 w-6 text-[#191A23]" />
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-[#191A23] rounded-full animate-pulse" />
          </div>
        </Button>
      </div>
    );
  }

  // 展开状态的完整聊天界面
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 w-[420px] h-[650px]",
        className
      )}
    >
      <Card className="h-full bg-gradient-to-b from-white to-gray-50 border-3 border-black shadow-[12px_12px_0px_0px_#B9FF66] flex flex-col rounded-xl overflow-hidden">
        {/* 标题栏 */}
        <CardHeader className="bg-gradient-to-r from-[#B9FF66] to-[#A8E055] border-b-3 border-black p-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-[#191A23] uppercase tracking-wide">
                  AI助手
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-[#191A23]">
                    在线
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-1">
              {messages.length > 20 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const firstMessage = messages[0];
                    setMessages(
                      firstMessage.role === "assistant" &&
                        firstMessage.content.includes("你好！我是AI教学助手")
                        ? [firstMessage]
                        : []
                    );
                  }}
                  className="h-8 w-8 p-0 hover:bg-white/20 text-[#191A23]"
                  title="清理对话历史"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-8 w-8 p-0 hover:bg-white/20"
              >
                <Minimize2 className="h-4 w-4 text-[#191A23]" />
              </Button>
            </div>
          </div>

          {/* 当前使用模型显示 */}
          {selectedModel && (
            <div className="mt-3 px-3 py-2 bg-[#191A23] rounded-lg border-2 border-black">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <Sparkles className="h-3.5 w-3.5 text-[#B9FF66]" />
                  <span className="text-xs font-bold text-white">
                    当前模型:
                  </span>
                  <span className="text-xs font-black text-[#B9FF66]">
                    {selectedModel.displayName}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardHeader>

        {/* 消息区域 */}
        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="h-full overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 items-end",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="p-2.5 bg-gradient-to-br from-[#B9FF66] to-[#A8E055] rounded-full border-2 border-black shadow-md flex-shrink-0">
                    <Bot className="h-4 w-4 text-[#191A23]" />
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[75%] p-4 border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] transition-all hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.15)]",
                    message.role === "user"
                      ? "bg-gradient-to-br from-[#191A23] to-[#2a2b3a] text-white"
                      : "bg-white text-[#191A23]"
                  )}
                >
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <div
                    className="flex items-center gap-2 mt-3 pt-2 border-t border-opacity-20"
                    style={{
                      borderColor: message.role === "user" ? "#fff" : "#191A23",
                    }}
                  >
                    <span className="text-xs opacity-60 font-medium">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {message.model && (
                      <Badge
                        className={cn(
                          "text-xs font-bold px-2 py-0.5 border border-black",
                          message.role === "user"
                            ? "bg-white/20 text-white"
                            : "bg-gray-100 text-[#191A23]"
                        )}
                      >
                        {message.model}
                      </Badge>
                    )}
                  </div>
                </div>

                {message.role === "user" && (
                  <div className="p-2.5 bg-gradient-to-br from-[#191A23] to-[#2a2b3a] rounded-full border-2 border-black shadow-md flex-shrink-0">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 items-end justify-start">
                <div className="p-2.5 bg-gradient-to-br from-[#B9FF66] to-[#A8E055] rounded-full border-2 border-black shadow-md flex-shrink-0 animate-pulse">
                  <Bot className="h-4 w-4 text-[#191A23]" />
                </div>
                <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-[#B9FF66]" />
                    <span className="text-sm font-medium text-[#191A23]">
                      AI正在思考...
                    </span>
                    <Button
                      onClick={handleStopConversation}
                      className="h-7 px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white border-2 border-black font-bold rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)] transition-all"
                    >
                      ⏹ 停止
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </CardContent>

        {/* 输入区域 */}
        <div className="border-t-3 border-black p-5 bg-gradient-to-b from-gray-50 to-white flex-shrink-0">
          {/* 快捷操作按钮 */}
          {availableModels.length > 0 && !isLoading && messages.length <= 1 && (
            <div className="mb-4">
              <div className="text-xs font-black text-[#191A23] mb-2.5 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[#B9FF66]" />
                快捷分析
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => handleQuickAction("overview")}
                  className="text-xs border-2 border-black bg-white hover:bg-[#B9FF66] text-[#191A23] font-bold px-3 py-1.5 h-8 transition-all rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                >
                  <Database className="h-3.5 w-3.5 mr-1.5" />
                  整体概览
                </Button>
                <Button
                  onClick={() => handleQuickAction("recentExam")}
                  className="text-xs border-2 border-black bg-white hover:bg-[#B9FF66] text-[#191A23] font-bold px-3 py-1.5 h-8 transition-all rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                  最近考试
                </Button>
                <Button
                  onClick={() => handleQuickAction("suggestions")}
                  className="text-xs border-2 border-black bg-white hover:bg-[#B9FF66] text-[#191A23] font-bold px-3 py-1.5 h-8 transition-all rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                  教学建议
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入您的问题..."
              className="border-2 border-black shadow-[3px_3px_0px_0px_#191A23] font-medium rounded-lg text-sm focus:shadow-[4px_4px_0px_0px_#191A23] transition-all"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="border-2 border-black bg-gradient-to-br from-[#B9FF66] to-[#A8E055] hover:from-[#A8E055] hover:to-[#97CF44] text-[#191A23] font-black shadow-[3px_3px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_#191A23] transition-all rounded-lg px-5"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
            <span className="text-xs text-[#191A23]/60 font-medium">
              按{" "}
              <kbd className="px-1.5 py-0.5 bg-gray-200 border border-gray-300 rounded text-xs font-mono">
                Enter
              </kbd>{" "}
              发送
            </span>
            <div className="flex items-center gap-3">
              {messages.length > 15 && (
                <span className="text-xs text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded-md border border-orange-200">
                  {messages.length}条消息
                </span>
              )}
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#191A23]">
                <Sparkles className="h-3.5 w-3.5 text-[#B9FF66]" />
                实时数据分析
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FloatingChatAssistant;
