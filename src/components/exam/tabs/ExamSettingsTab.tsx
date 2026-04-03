/**
 * ExamSettingsTab — 设置管理 Tab
 * 包含：考试类型管理、评分标准、考试时间、通知设置、数据管理
 * Props 只读，所有设置功能目前为 toast 占位
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Target,
  Clock,
  AlertCircle,
  Download,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { UIExam, UIExamType } from "../hooks/useExamData";

interface ExamSettingsTabProps {
  examTypes: UIExamType[];
  exams: UIExam[];
}

const ExamSettingsTab: React.FC<ExamSettingsTabProps> = ({
  examTypes,
  exams,
}) => {
  return (
    <div className="space-y-6">
      {/* 考试类型管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-[#B9FF66]" />
              考试类型管理
            </div>
            <Button
              size="sm"
              className="bg-[#B9FF66] text-black hover:bg-[#A3E85A]"
              onClick={() => toast.success("添加考试类型功能开发中")}
            >
              <Plus className="h-4 w-4 mr-1" />
              添加类型
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {examTypes.map((type) => (
              <div
                key={type.id}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{type.emoji}</span>
                    <span className="font-medium">{type.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        toast.success(`编辑${type.name}功能开发中`)
                      }
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    {!type.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toast.success(`删除${type.name}功能开发中`)
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600">{type.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant={type.isDefault ? "default" : "secondary"}>
                    {type.isDefault ? "系统默认" : "自定义"}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {exams.filter((e) => e.type === type.name).length} 个考试
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 评分设置 + 时间设置 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              评分标准设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultTotalScore">默认总分</Label>
              <Input
                id="defaultTotalScore"
                type="number"
                defaultValue="100"
                className="border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passingScore">及格分数</Label>
              <Input
                id="passingScore"
                type="number"
                defaultValue="60"
                className="border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="excellentScore">优秀分数</Label>
              <Input
                id="excellentScore"
                type="number"
                defaultValue="90"
                className="border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
              />
            </div>
            <Button
              className="w-full bg-blue-500 hover:bg-blue-600"
              onClick={() => toast.success("评分标准保存功能开发中")}
            >
              保存设置
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              考试时间设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultDuration">默认考试时长（分钟）</Label>
              <Input
                id="defaultDuration"
                type="number"
                defaultValue="120"
                className="border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bufferTime">考试间隔时间（分钟）</Label>
              <Input
                id="bufferTime"
                type="number"
                defaultValue="30"
                className="border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="advanceNotice">提前通知时间（小时）</Label>
              <Input
                id="advanceNotice"
                type="number"
                defaultValue="24"
                className="border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
              />
            </div>
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600"
              onClick={() => toast.success("时间设置保存功能开发中")}
            >
              保存设置
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 通知设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-purple-500" />
            通知设置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-800">考试提醒</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">考试前提醒</p>
                    <p className="text-sm text-gray-600">
                      在考试开始前发送提醒
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 text-[#B9FF66] bg-gray-100 border-gray-300 rounded focus:ring-[#B9FF66] focus:ring-2"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">成绩发布通知</p>
                    <p className="text-sm text-gray-600">成绩公布时自动通知</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 text-[#B9FF66] bg-gray-100 border-gray-300 rounded focus:ring-[#B9FF66] focus:ring-2"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-800">系统通知</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">考试创建通知</p>
                    <p className="text-sm text-gray-600">
                      新考试创建时通知相关人员
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 text-[#B9FF66] bg-gray-100 border-gray-300 rounded focus:ring-[#B9FF66] focus:ring-2"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">异常情况预警</p>
                    <p className="text-sm text-gray-600">
                      检测到异常时发送预警
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 text-[#B9FF66] bg-gray-100 border-gray-300 rounded focus:ring-[#B9FF66] focus:ring-2"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <Button
              className="bg-purple-500 hover:bg-purple-600"
              onClick={() => toast.success("通知设置保存功能开发中")}
            >
              <Settings className="h-4 w-4 mr-2" />
              保存通知设置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 数据管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-green-500" />
            数据管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => toast.success("数据导出功能开发中")}
            >
              <Download className="h-5 w-5" />
              <span>导出考试数据</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => toast.success("数据备份功能开发中")}
            >
              <RefreshCw className="h-5 w-5" />
              <span>备份数据</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => toast.success("数据清理功能开发中")}
            >
              <Trash2 className="h-5 w-5" />
              <span>数据清理</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExamSettingsTab;
