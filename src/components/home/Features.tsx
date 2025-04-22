
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart2, FileText, Settings } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: <FileText className="h-5 w-5" />,
      title: "智能数据导入",
      description: "自动识别并解析多种数据格式，快速导入成绩数据"
    },
    {
      icon: <BarChart2 className="h-5 w-5" />,
      title: "可视化图表分析",
      description: "自动生成多维度图表，直观展示学生成绩数据"
    },
    {
      icon: <Settings className="h-5 w-5" />,
      title: "AI智能分析",
      description: "基于大模型的智能分析，提供个性化教学建议"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
      {features.map((feature, index) => (
        <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-[#B9FF66] p-3 rounded-lg">
                {feature.icon}
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Features;
