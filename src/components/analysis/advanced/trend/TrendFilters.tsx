import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LineChart, BarChart3, Target } from "lucide-react";

interface TrendFiltersProps {
  studentOptions: { id: string; name: string }[];
  selectedStudent: string;
  viewMode: "line" | "area" | "radar";
  onStudentChange: (id: string) => void;
  onViewModeChange: (mode: "line" | "area" | "radar") => void;
}

const TrendFilters: React.FC<TrendFiltersProps> = ({
  studentOptions,
  selectedStudent,
  viewMode,
  onStudentChange,
  onViewModeChange,
}) => {
  return (
    <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#B9FF66]">
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#191A23] rounded-full border-2 border-black">
              <LineChart className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black text-[#191A23] uppercase tracking-wide">
                个人成绩趋势分析
              </CardTitle>
              <p className="text-[#191A23]/80 font-medium mt-1">
                多维度跟踪学生学习轨迹 • 智能趋势预测 • 个性化提升建议
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-black text-[#191A23] uppercase tracking-wide">
              选择学生
            </label>
            <Select value={selectedStudent} onValueChange={onStudentChange}>
              <SelectTrigger className="border-2 border-black shadow-[2px_2px_0px_0px_#191A23]">
                <SelectValue placeholder="请选择学生" />
              </SelectTrigger>
              <SelectContent>
                {studentOptions.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-[#191A23] uppercase tracking-wide">
              视图模式
            </label>
            <div className="flex gap-2">
              {[
                { value: "line" as const, label: "折线图", icon: LineChart },
                { value: "area" as const, label: "面积图", icon: BarChart3 },
                { value: "radar" as const, label: "雷达图", icon: Target },
              ].map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  onClick={() => onViewModeChange(value)}
                  className={`border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] transition-all ${viewMode === value ? "bg-[#B9FF66] text-[#191A23] translate-x-[-1px] translate-y-[-1px] shadow-[3px_3px_0px_0px_#191A23]" : "bg-white text-[#191A23] hover:bg-white"}`}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrendFilters;
