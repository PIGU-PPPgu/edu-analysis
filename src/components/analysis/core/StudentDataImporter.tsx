import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Users } from "lucide-react";

interface StudentDataImporterProps {
  onDataImported: (data: any[]) => void;
}

export default function StudentDataImporter({
  onDataImported,
}: StudentDataImporterProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // 这里应该是实际的文件处理逻辑
      // 暂时模拟一下数据导入过程
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 模拟导入的学生数据
      const mockData = [
        { student_id: "20241001", name: "张三", class_name: "初三1班" },
        { student_id: "20241002", name: "李四", class_name: "初三1班" },
        { student_id: "20241003", name: "王五", class_name: "初三2班" },
      ];

      onDataImported(mockData);
      toast.success("学生数据导入成功", {
        description: `已成功导入 ${mockData.length} 名学生信息`,
      });
    } catch (error) {
      console.error("导入学生数据失败:", error);
      toast.error("导入失败", {
        description: "请检查文件格式是否正确",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 文件上传区域 */}
      <Card className="border-dashed border-2">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8">
            <FileSpreadsheet className="h-12 w-12 text-gray-400 mb-4" />
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium mb-2">上传学生数据文件</h3>
              <p className="text-sm text-gray-500">
                支持 Excel (.xlsx) 和 CSV (.csv) 格式
              </p>
            </div>

            <div className="relative">
              <Input
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                id="student-file-upload"
              />
              <Label htmlFor="student-file-upload">
                <Button
                  variant="outline"
                  disabled={isUploading}
                  className="cursor-pointer"
                  asChild
                >
                  <div>
                    {isUploading ? (
                      <>
                        <Upload className="w-4 h-4 mr-2 animate-pulse" />
                        正在导入...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        选择文件
                      </>
                    )}
                  </div>
                </Button>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 导入说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            导入格式说明
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">必填字段：</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • <strong>学号 (student_id)</strong>: 学生唯一标识
                </li>
                <li>
                  • <strong>姓名 (name)</strong>: 学生真实姓名
                </li>
                <li>
                  • <strong>班级 (class_name)</strong>: 所属班级
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">选填字段：</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • <strong>年级 (grade)</strong>: 年级信息
                </li>
                <li>
                  • <strong>性别 (gender)</strong>: 男/女
                </li>
                <li>
                  • <strong>联系电话 (contact_phone)</strong>: 联系方式
                </li>
                <li>
                  • <strong>联系邮箱 (contact_email)</strong>: 邮箱地址
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>提示：</strong>
                确保Excel或CSV文件的第一行为字段名，与上述字段名称保持一致
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
