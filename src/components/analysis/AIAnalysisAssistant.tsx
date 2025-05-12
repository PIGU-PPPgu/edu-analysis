import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  BrainCircuit, 
  Loader2, 
  MessageSquarePlus, 
  MessagesSquare, 
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Download
} from "lucide-react";
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";
import { gradeAnalysisService } from "@/services/gradeAnalysisService";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface AIAnalysisAssistantProps {
  examId?: string;
  examTitle?: string;
  examType?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AnalysisReport {
  title: string;
  overview: string;
  sections: {
    title: string;
    content: string;
  }[];
}

export const AIAnalysisAssistant: React.FC<AIAnalysisAssistantProps> = ({
  examId,
  examTitle = "未知考试",
  examType = ""
}) => {
  const { gradeData } = useGradeAnalysis();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiModel, setAiModel] = useState("gpt-3.5-turbo");
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  
  // 预设问题列表
  const presetQuestions = [
    "请分析这次考试的整体表现",
    "哪些班级表现较好？为什么？",
    "哪些学生需要特别关注？",
    "如何改进成绩较差的班级？",
    "这次考试的难度如何？",
    "请提供针对性的教学建议"
  ];
  
  // 生成唯一消息ID
  const generateMessageId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };
  
  // 处理发送消息
  const handleSendMessage = async () => {
    if (!input.trim() || !examId) return;
    
    const userMessage: Message = {
      id: generateMessageId(),
      role: "user",
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsAnalyzing(true);
    
    try {
      // 获取考试分析数据
      const { data: analysisData } = await gradeAnalysisService.analyzeExamData(examId);
      
      // 调用AI分析
      const { data, error } = await gradeAnalysisService.aiAnalyzeExamData(
        gradeData,
        {
          examTitle,
          examType,
          question: input,
          analysisData
        }
      );
      
      if (error) throw error;
      
      // 添加AI回复
      const aiResponse: Message = {
        id: generateMessageId(),
        role: "assistant",
        content: data?.response || "抱歉，无法生成分析结果",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error("AI分析失败:", error);
      toast.error("AI分析失败", {
        description: error instanceof Error ? error.message : "未知错误"
      });
      
      // 添加错误消息
      const errorMessage: Message = {
        id: generateMessageId(),
        role: "assistant",
        content: "抱歉，分析过程中出现错误，请稍后再试。",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // 处理按预设问题提问
  const handlePresetQuestion = (question: string) => {
    setInput(question);
  };
  
  // 生成综合分析报告
  const generateAnalysisReport = async () => {
    if (!examId) {
      toast.error("请先选择考试");
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      // 获取考试分析数据
      const { data: analysisData } = await gradeAnalysisService.analyzeExamData(examId);
      
      // 调用AI分析
      const { data, error } = await gradeAnalysisService.aiAnalyzeExamData(
        gradeData,
        {
          examTitle,
          examType,
          generateReport: true,
          analysisData
        }
      );
      
      if (error) throw error;
      
      if (data?.report) {
        setAnalysisReport(data.report);
        toast.success("分析报告生成成功");
      } else {
        toast.error("无法生成分析报告");
      }
    } catch (error) {
      console.error("生成分析报告失败:", error);
      toast.error("生成分析报告失败");
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // 导出分析报告
  const exportReport = () => {
    if (!analysisReport) return;
    
    let reportText = `# ${analysisReport.title}\n\n`;
    reportText += `## 概述\n${analysisReport.overview}\n\n`;
    
    analysisReport.sections.forEach(section => {
      reportText += `## ${section.title}\n${section.content}\n\n`;
    });
    
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${examTitle}-分析报告.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("报告导出成功");
  };
  
  return (
    <div className="space-y-4">
      {/* AI分析助手卡片 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-lg font-medium">AI成绩分析助手</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowConfig(!showConfig)}
            >
              {showConfig ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  收起配置
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  展开配置
                </>
              )}
            </Button>
          </div>
          <CardDescription>
            智能助手将帮您分析成绩数据，回答问题并提供教学建议
          </CardDescription>
        </CardHeader>
        
        {/* AI配置区域 */}
        {showConfig && (
          <CardContent className="border-t border-b py-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">AI模型:</span>
                <Select value={aiModel} onValueChange={setAiModel}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="选择模型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="claude-3">Claude 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Sparkles className="h-4 w-4" />
                    生成分析报告
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>生成考试分析报告</DialogTitle>
                    <DialogDescription>
                      系统将为您生成一份详细的考试分析报告，包含整体表现、班级分析、个体分析和教学建议
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-2">
                    <p>将生成以下内容：</p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      <li>考试整体情况分析</li>
                      <li>各班级表现对比</li>
                      <li>成绩分布和统计分析</li>
                      <li>异常情况及需关注学生</li>
                      <li>针对性教学建议</li>
                    </ul>
                    
                    <div className="text-sm text-gray-500 pt-2">
                      注：生成报告可能需要1-2分钟
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {}}
                    >
                      取消
                    </Button>
                    <Button
                      onClick={generateAnalysisReport}
                      disabled={isAnalyzing}
                      className="gap-1"
                    >
                      {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin" />}
                      生成报告
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        )}
        
        <CardContent className="pt-3">
          {/* 消息列表区域 */}
          <div className="bg-gray-50 rounded-md p-3 h-[320px] overflow-y-auto mb-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <MessagesSquare className="h-10 w-10 mb-2 text-gray-300" />
                <p>向AI助手提问关于考试的问题</p>
                <p className="text-sm">例如：哪些学生需要特别关注？</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div 
                    key={message.id}
                    className={cn(
                      "flex gap-3 p-3 rounded-lg",
                      message.role === "user" 
                        ? "bg-blue-50 text-blue-900" 
                        : "bg-white border"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                      message.role === "user" 
                        ? "bg-blue-100 text-blue-700" 
                        : "bg-purple-100 text-purple-700"
                    )}>
                      {message.role === "user" ? "您" : "AI"}
                    </div>
                    <div className="text-sm">
                      {message.content.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {line}
                          <br />
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
                
                {isAnalyzing && (
                  <div className="flex gap-3 p-3 bg-white border rounded-lg">
                    <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      AI
                    </div>
                    <div className="text-gray-600 flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      正在分析数据...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* 预设问题 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {presetQuestions.map((question, index) => (
              <Button 
                key={index} 
                variant="outline" 
                size="sm"
                className="text-xs"
                onClick={() => handlePresetQuestion(question)}
              >
                <MessageSquarePlus className="h-3 w-3 mr-1" />
                {question.length > 15 ? question.substring(0, 15) + "..." : question}
              </Button>
            ))}
          </div>
          
          {/* 输入区域 */}
          <div className="flex gap-2">
            <Textarea 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="输入您想了解的问题..."
              className="resize-none"
              disabled={isAnalyzing}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button 
              className="shrink-0" 
              onClick={handleSendMessage}
              disabled={isAnalyzing || !input.trim()}
            >
              {isAnalyzing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* 分析报告卡片 */}
      {analysisReport && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">
                {analysisReport.title}
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                className="gap-1"
                onClick={exportReport}
              >
                <Download className="h-4 w-4" />
                导出报告
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div className="mb-6 text-gray-700">
                {analysisReport.overview}
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                {analysisReport.sections.map((section, index) => (
                  <AccordionItem key={index} value={`section-${index}`}>
                    <AccordionTrigger className="text-base font-medium">
                      {section.title}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm text-gray-700 whitespace-pre-line">
                        {section.content}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 