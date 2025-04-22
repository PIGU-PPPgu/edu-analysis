
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Download, FileText, Printer, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ClassReportGeneratorProps {
  className: string;
}

const ClassReportGenerator: React.FC<ClassReportGeneratorProps> = ({ className }) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportSettings, setReportSettings] = useState({
    includeWeakness: true,
    includeStrength: true,
    includeTrend: true,
    includeComparison: true,
    includeStudentList: true,
    includeSuggestions: true,
  });
  
  const handleGenerateReport = () => {
    setIsGenerating(true);
    
    // 模拟报告生成过程
    setTimeout(() => {
      setIsGenerating(false);
      toast({
        title: "报告生成成功",
        description: `${className}的班级分析报告已准备就绪`,
        variant: "default",
      });
    }, 2500);
  };
  
  const handleSettingChange = (setting: keyof typeof reportSettings) => {
    setReportSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">班级报告生成</CardTitle>
        <CardDescription>
          生成{className}的全面分析报告
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border rounded-lg p-3 bg-gray-50">
          <div className="text-sm font-medium mb-2">报告内容</div>
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <Check className="h-4 w-4 mr-2 text-green-500" />
              <span>班级基本信息</span>
            </div>
            <div className="flex items-center text-sm">
              <Check className="h-4 w-4 mr-2 text-green-500" />
              <span>各科成绩分析</span>
            </div>
            <div className="flex items-center text-sm">
              <Check className="h-4 w-4 mr-2 text-green-500" />
              <span>成绩趋势分析</span>
            </div>
            <div className="flex items-center text-sm">
              <Check className="h-4 w-4 mr-2 text-green-500" />
              <span>年级对比数据</span>
            </div>
            <div className="flex items-center text-sm">
              <Check className="h-4 w-4 mr-2 text-green-500" />
              <span>学科优劣势分析</span>
            </div>
            <div className="flex items-center text-sm">
              <Check className="h-4 w-4 mr-2 text-green-500" />
              <span>教学建议</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button 
            className="flex items-center gap-2 bg-[#B9FF66] text-black hover:bg-[#a8e85c]" 
            onClick={handleGenerateReport}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                生成中...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                生成报告
              </>
            )}
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                报告设置
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>报告设置</DialogTitle>
                <DialogDescription>
                  自定义您想要包含在班级报告中的内容
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="weakness" className="flex flex-col">
                    <span>学科弱项分析</span>
                    <span className="font-normal text-xs text-muted-foreground">包含需要改进的学科</span>
                  </Label>
                  <Switch
                    id="weakness"
                    checked={reportSettings.includeWeakness}
                    onCheckedChange={() => handleSettingChange('includeWeakness')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="strength" className="flex flex-col">
                    <span>学科优势分析</span>
                    <span className="font-normal text-xs text-muted-foreground">包含班级表现较好的学科</span>
                  </Label>
                  <Switch
                    id="strength"
                    checked={reportSettings.includeStrength}
                    onCheckedChange={() => handleSettingChange('includeStrength')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="trend" className="flex flex-col">
                    <span>成绩趋势分析</span>
                    <span className="font-normal text-xs text-muted-foreground">包含多次考试的趋势对比</span>
                  </Label>
                  <Switch
                    id="trend"
                    checked={reportSettings.includeTrend}
                    onCheckedChange={() => handleSettingChange('includeTrend')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="comparison" className="flex flex-col">
                    <span>年级对比数据</span>
                    <span className="font-normal text-xs text-muted-foreground">与年级平均水平的对比分析</span>
                  </Label>
                  <Switch
                    id="comparison"
                    checked={reportSettings.includeComparison}
                    onCheckedChange={() => handleSettingChange('includeComparison')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="studentList" className="flex flex-col">
                    <span>学生名单</span>
                    <span className="font-normal text-xs text-muted-foreground">包含班级全部学生及其成绩</span>
                  </Label>
                  <Switch
                    id="studentList"
                    checked={reportSettings.includeStudentList}
                    onCheckedChange={() => handleSettingChange('includeStudentList')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="suggestions" className="flex flex-col">
                    <span>教学建议</span>
                    <span className="font-normal text-xs text-muted-foreground">基于数据分析的教学改进建议</span>
                  </Label>
                  <Switch
                    id="suggestions"
                    checked={reportSettings.includeSuggestions}
                    onCheckedChange={() => handleSettingChange('includeSuggestions')}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">保存设置</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between gap-3">
        <Button variant="outline" className="flex-1 flex items-center justify-center gap-2">
          <Download className="h-4 w-4" />
          下载PDF
        </Button>
        <Button variant="outline" className="flex-1 flex items-center justify-center gap-2">
          <Printer className="h-4 w-4" />
          打印报告
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ClassReportGenerator;
