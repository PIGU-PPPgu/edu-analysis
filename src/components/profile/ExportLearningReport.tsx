import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, Printer, Loader2, Share2 } from "lucide-react";
import { StudentData } from "./types";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { portraitAPI } from "@/lib/api/portrait";

interface ExportLearningReportProps {
  student: StudentData;
}

interface ReportSection {
  id: string;
  title: string;
  description: string;
  selected: boolean;
}

const ExportLearningReport: React.FC<ExportLearningReportProps> = ({
  student,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportFormat, setReportFormat] = useState("pdf");
  const [reportSections, setReportSections] = useState<ReportSection[]>([
    {
      id: "overview",
      title: "成绩概览",
      description: "包含学生成绩数据和统计信息",
      selected: true,
    },
    {
      id: "learning_style",
      title: "学习风格分析",
      description: "学生的学习风格和偏好",
      selected: true,
    },
    {
      id: "behavior",
      title: "学习行为分析",
      description: "学习习惯和行为模式",
      selected: true,
    },
    {
      id: "ability",
      title: "能力评估",
      description: "学生各项能力的评估结果",
      selected: true,
    },
    {
      id: "ai_analysis",
      title: "AI学习画像分析",
      description: "AI生成的综合学习评估",
      selected: false,
    },
  ]);

  // 获取学生详细数据
  const { data: studentPortrait, isFetching } = useQuery({
    queryKey: ["studentCompleteData", student.studentId],
    queryFn: () => portraitAPI.getStudentPortrait(student.studentId),
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    enabled: !!student.studentId,
  });

  // 切换报告部分的选择状态
  const toggleSection = (sectionId: string) => {
    setReportSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, selected: !section.selected }
          : section
      )
    );
  };

  // 选择全部或取消全部
  const toggleAll = (selected: boolean) => {
    setReportSections((prev) =>
      prev.map((section) => ({ ...section, selected }))
    );
  };

  // 生成报告
  const handleGenerateReport = async () => {
    const selectedSections = reportSections.filter(
      (section) => section.selected
    );

    if (selectedSections.length === 0) {
      toast.error("请至少选择一个报告内容");
      return;
    }

    setIsGenerating(true);

    try {
      // 动态导入exportService
      const { advancedExportService } = await import(
        "@/services/advancedExportService"
      );

      // 调用真实的导出服务
      const result = await advancedExportService.exportStudentReport(
        student.studentId,
        {
          format: reportFormat as "pdf" | "csv" | "xlsx" | "json",
          fields: selectedSections.map((s) => s.id),
          fileName: `${student.name}_学习报告`,
        }
      );

      if (result.success) {
        toast.success("学习报告生成成功", {
          description: `已为${student.name}生成${reportFormat.toUpperCase()}格式报告`,
        });
      } else {
        throw new Error(result.error || "生成报告失败");
      }
    } catch (error) {
      console.error("生成报告失败:", error);
      toast.error("生成报告失败", {
        description: error instanceof Error ? error.message : "请稍后重试",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-5 w-5" />
          学习报告导出
        </CardTitle>
        <CardDescription>生成和导出学生学习情况综合报告</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>报告格式</Label>
          <Select value={reportFormat} onValueChange={setReportFormat}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择报告格式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF文档</SelectItem>
              <SelectItem value="docx">Word文档</SelectItem>
              <SelectItem value="html">HTML网页</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>报告内容</Label>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleAll(true)}
              >
                全选
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleAll(false)}
              >
                取消全选
              </Button>
            </div>
          </div>

          <div className="grid gap-2 pt-1">
            {reportSections.map((section) => (
              <div key={section.id} className="flex items-start space-x-2">
                <Checkbox
                  id={section.id}
                  checked={section.selected}
                  onCheckedChange={() => toggleSection(section.id)}
                />
                <div className="grid gap-0.5 leading-none">
                  <Label
                    htmlFor={section.id}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {section.title}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {section.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          打印页面
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              toast("分享功能即将上线", {
                description: "目前您可以通过导出PDF后手动分享",
              });
            }}
          >
            <Share2 className="h-4 w-4 mr-2" />
            分享
          </Button>

          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating || isFetching}
            className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                生成报告
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ExportLearningReport;
