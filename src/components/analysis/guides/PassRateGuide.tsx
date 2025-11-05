/**
 * 及格率配置使用指南
 * 帮助用户理解如何设置和使用科目满分配置
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  Info,
  Settings2,
  Target,
  Calculator,
  Award,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  BookOpen,
} from "lucide-react";

interface PassRateGuideProps {
  className?: string;
}

const PassRateGuide: React.FC<PassRateGuideProps> = ({ className }) => {
  return (
    <Card
      className={cn(
        "bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all",
        className
      )}
    >
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-black text-[#191A23] uppercase tracking-wide">
              科目满分配置指南
            </CardTitle>
            <p className="text-sm text-[#191A23]/80 font-medium mt-1">
              了解如何正确设置科目满分以获得准确的及格率统计
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* 功能概述 */}
        <Alert className="border-2 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <span className="font-medium">功能说明：</span>
            系统支持为每个科目设置独立的满分、及格分和优秀分。设置后，所有分析界面中的及格率、优秀率计算都会自动使用新的标准。
          </AlertDescription>
        </Alert>

        {/* 设置步骤 */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[#191A23] flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            设置步骤
          </h3>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
              <Badge className="bg-[#B9FF66] text-[#191A23] border border-black font-bold min-w-6 h-6 flex items-center justify-center">
                1
              </Badge>
              <div>
                <p className="font-medium text-[#191A23]">点击"科目设置"按钮</p>
                <p className="text-sm text-gray-600 mt-1">
                  在基础分析界面右上角找到橙色的"科目设置"按钮并点击
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
              <Badge className="bg-[#F7931E] text-white border border-black font-bold min-w-6 h-6 flex items-center justify-center">
                2
              </Badge>
              <div>
                <p className="font-medium text-[#191A23]">设置各科目满分</p>
                <p className="text-sm text-gray-600 mt-1">
                  根据学校实际情况，为语文、数学、英语等科目设置正确的满分值
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
              <Badge className="bg-[#9C88FF] text-white border border-black font-bold min-w-6 h-6 flex items-center justify-center">
                3
              </Badge>
              <div>
                <p className="font-medium text-[#191A23]">
                  自动计算或手动设置及格线
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  开启"自动计算比例"会自动设置60%及格、85%优秀，也可手动调整
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
              <Badge className="bg-[#191A23] text-white border border-black font-bold min-w-6 h-6 flex items-center justify-center">
                4
              </Badge>
              <div>
                <p className="font-medium text-[#191A23]">保存配置</p>
                <p className="text-sm text-gray-600 mt-1">
                  点击"保存配置"按钮，系统会自动刷新所有分析数据
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 配置示例 */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[#191A23] flex items-center gap-2">
            <Target className="w-5 h-5" />
            配置示例
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-2 border-[#B9FF66]">
              <CardContent className="p-4">
                <h4 className="font-bold text-[#191A23] mb-3 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  理科配置
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>物理：</span>
                    <span className="font-medium">满分63分，及格38分</span>
                  </div>
                  <div className="flex justify-between">
                    <span>化学：</span>
                    <span className="font-medium">满分45分，及格27分</span>
                  </div>
                  <div className="flex justify-between">
                    <span>数学：</span>
                    <span className="font-medium">满分100分，及格60分</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-[#F7931E]">
              <CardContent className="p-4">
                <h4 className="font-bold text-[#191A23] mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  文科配置
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>语文：</span>
                    <span className="font-medium">满分120分，及格72分</span>
                  </div>
                  <div className="flex justify-between">
                    <span>英语：</span>
                    <span className="font-medium">满分75分，及格45分</span>
                  </div>
                  <div className="flex justify-between">
                    <span>历史：</span>
                    <span className="font-medium">满分70分，及格42分</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 重要提醒 */}
        <Alert className="border-2 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <span className="font-medium">重要提醒：</span>
            配置保存后会影响所有分析界面的及格率显示。请确保设置的分数线符合学校实际标准，避免影响统计准确性。
          </AlertDescription>
        </Alert>

        {/* 影响范围 */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[#191A23] flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            配置影响范围
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-green-50 rounded-lg border-2 border-green-200">
              <h4 className="font-medium text-green-800 mb-2">基础分析界面</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• 统计概览中的及格率</li>
                <li>• 班级对比中的及格率</li>
                <li>• 科目分析中的及格率</li>
              </ul>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">高级分析功能</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• AI分析中的风险评估</li>
                <li>• 等级分布统计</li>
                <li>• 趋势分析和预警</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 小贴士 */}
        <Alert className="border-2 border-yellow-200 bg-yellow-50">
          <Lightbulb className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <span className="font-medium">小贴士：</span>
            系统会自动保存您的配置到浏览器本地，下次访问时无需重新设置。如需在其他设备使用相同配置，请重新设置一次。
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default PassRateGuide;
