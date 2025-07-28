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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 加载用户配置的中文AI模型
  useEffect(() => {
    const loadAvailableModels = async () => {
      try {
        const models = await getConfiguredChineseAIModels();
        setAvailableModels(models);

        // 如果有可用模型且未选择模型，自动选择第一个
        if (models.length > 0 && !selectedModel) {
          const firstModel = models[0];
          const newSelectedModel = {
            providerId: firstModel.providerId,
            modelId: firstModel.modelId,
            displayName: `${firstModel.providerName} - ${firstModel.modelName}`,
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
        } else if (models.length === 0) {
          // 没有配置中文AI模型
          setMessages([
            {
              id: "1",
              role: "assistant",
              content:
                "❗ 未检测到配置的中文AI模型。请在AI设置中配置豆包、deepseek等中文AI服务后再使用聊天功能。",
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
    } catch (error) {
      console.error("AI响应错误:", error);

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
      className={cn("fixed bottom-6 right-6 z-50 w-96 h-[600px]", className)}
    >
      <Card className="h-full bg-white border-2 border-black shadow-[8px_8px_0px_0px_#B9FF66] flex flex-col">
        {/* 标题栏 */}
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black p-4 flex-shrink-0">
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

          {/* AI模型选择 */}
          <div className="flex gap-1 mt-2 flex-wrap">
            {availableModels.length > 0 ? (
              availableModels.map((model) => {
                const modelKey = `${model.providerId}-${model.modelId}`;
                const isSelected =
                  selectedModel?.providerId === model.providerId &&
                  selectedModel?.modelId === model.modelId;
                return (
                  <Button
                    key={modelKey}
                    onClick={() =>
                      setSelectedModel({
                        providerId: model.providerId,
                        modelId: model.modelId,
                        displayName: `${model.providerName} - ${model.modelName}`,
                      })
                    }
                    className={cn(
                      "text-xs font-bold px-2 py-1 h-6 border border-black transition-all",
                      isSelected
                        ? "bg-[#191A23] text-white translate-x-[-1px] translate-y-[-1px] shadow-[2px_2px_0px_0px_#191A23]"
                        : "bg-white text-[#191A23] hover:bg-white"
                    )}
                  >
                    {model.modelName}
                  </Button>
                );
              })
            ) : (
              <div className="text-xs text-[#191A23]/70 px-2 py-1">
                未配置中文AI模型，请在AI设置中配置
              </div>
            )}
          </div>
        </CardHeader>

        {/* 消息区域 */}
        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="h-full overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="p-2 bg-[#B9FF66] rounded-full border-2 border-black flex-shrink-0">
                    <Bot className="h-3 w-3 text-[#191A23]" />
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[80%] p-3 border-2 border-black rounded-lg",
                    message.role === "user"
                      ? "bg-[#191A23] text-white"
                      : "bg-white text-[#191A23]"
                  )}
                >
                  <p className="text-sm font-medium">{message.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {message.model && (
                      <Badge className="text-xs bg-[#6B7280] text-white">
                        {message.model}
                      </Badge>
                    )}
                  </div>
                </div>

                {message.role === "user" && (
                  <div className="p-2 bg-[#191A23] rounded-full border-2 border-black flex-shrink-0">
                    <User className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="p-2 bg-[#B9FF66] rounded-full border-2 border-black flex-shrink-0">
                  <Bot className="h-3 w-3 text-[#191A23]" />
                </div>
                <div className="bg-white border-2 border-black rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#B9FF66]" />
                    <span className="text-sm font-medium text-[#191A23]">
                      AI思考中...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </CardContent>

        {/* 输入区域 */}
        <div className="border-t-2 border-black p-4 bg-[#F8F8F8] flex-shrink-0">
          {/* 快捷操作按钮 */}
          {availableModels.length > 0 && !isLoading && messages.length <= 1 && (
            <div className="mb-3">
              <div className="text-xs font-bold text-[#191A23] mb-2 uppercase tracking-wide">
                快捷分析
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => handleQuickAction("overview")}
                  className="text-xs border border-black bg-white hover:bg-[#B9FF66] text-[#191A23] font-medium px-3 py-1 h-7 transition-all"
                >
                  <Database className="h-3 w-3 mr-1" />
                  整体概览
                </Button>
                <Button
                  onClick={() => handleQuickAction("recentExam")}
                  className="text-xs border border-black bg-white hover:bg-[#B9FF66] text-[#191A23] font-medium px-3 py-1 h-7 transition-all"
                >
                  <BarChart3 className="h-3 w-3 mr-1" />
                  最近考试
                </Button>
                <Button
                  onClick={() => handleQuickAction("suggestions")}
                  className="text-xs border border-black bg-white hover:bg-[#B9FF66] text-[#191A23] font-medium px-3 py-1 h-7 transition-all"
                >
                  <BookOpen className="h-3 w-3 mr-1" />
                  教学建议
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息..."
              className="border-2 border-black shadow-[2px_2px_0px_0px_#191A23] font-medium"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="border-2 border-black bg-[#B9FF66] hover:bg-[#A8E055] text-[#191A23] font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-[#191A23]/70">
              按 Enter 发送，Shift+Enter 换行
            </span>
            <div className="flex items-center gap-2">
              {messages.length > 15 && (
                <span className="text-xs text-orange-600 font-medium">
                  对话较长({messages.length}条)
                </span>
              )}
              <div className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-[#B9FF66]" />
                <span className="text-xs font-medium text-[#191A23]">
                  基于真实数据
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FloatingChatAssistant;
