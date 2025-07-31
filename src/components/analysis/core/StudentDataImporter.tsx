import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Users } from "lucide-react";
import { studentService } from "@/services/education/students";
import * as XLSX from "xlsx";

interface StudentDataImporterProps {
  onDataImported: (data: any[]) => void;
}

export default function StudentDataImporter({
  onDataImported,
}: StudentDataImporterProps) {
  const [isUploading, setIsUploading] = useState(false);

  const parseFileData = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let parsedData: any[] = [];

          if (file.name.endsWith(".csv")) {
            // CSV解析
            const text = data as string;
            const lines = text.split("\n");
            const headers = lines[0].split(",").map((h) => h.trim());

            parsedData = lines
              .slice(1)
              .filter((line) => line.trim())
              .map((line) => {
                const values = line.split(",").map((v) => v.trim());
                const obj: any = {};
                headers.forEach((header, index) => {
                  obj[header] = values[index] || "";
                });
                return obj;
              });
          } else {
            // Excel解析
            const workbook = XLSX.read(data, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            parsedData = XLSX.utils.sheet_to_json(worksheet);
          }

          resolve(parsedData);
        } catch (error) {
          reject(new Error("文件解析失败，请检查文件格式"));
        }
      };

      reader.onerror = () => reject(new Error("文件读取失败"));

      if (file.name.endsWith(".csv")) {
        reader.readAsText(file, "UTF-8");
      } else {
        reader.readAsBinaryString(file);
      }
    });
  };

  const validateAndTransformData = (rawData: any[]): any[] => {
    return rawData.map((row, index) => {
      // 统一字段名称
      const transformedRow: any = {};

      // 学号字段映射
      transformedRow.student_id =
        row.student_id || row["学号"] || row.学号 || "";

      // 姓名字段映射
      transformedRow.name = row.name || row["姓名"] || row.姓名 || "";

      // 班级字段映射
      transformedRow.class_id =
        row.class_id || row.class_name || row["班级"] || row.班级 || "";

      // 可选字段映射
      transformedRow.admission_year =
        row.admission_year || row["入学年份"] || row.入学年份 || "";
      transformedRow.gender = row.gender || row["性别"] || row.性别 || null;
      transformedRow.contact_phone =
        row.contact_phone || row["联系电话"] || row.联系电话 || "";
      transformedRow.contact_email =
        row.contact_email || row["联系邮箱"] || row.联系邮箱 || "";

      // 验证必填字段
      if (!transformedRow.student_id) {
        throw new Error(`第${index + 2}行：学号不能为空`);
      }
      if (!transformedRow.name) {
        throw new Error(`第${index + 2}行：姓名不能为空`);
      }
      if (!transformedRow.class_id) {
        throw new Error(`第${index + 2}行：班级不能为空`);
      }

      return transformedRow;
    });
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // 验证文件类型
      const allowedTypes = [".xlsx", ".xls", ".csv"];
      const isValidType = allowedTypes.some((type) =>
        file.name.toLowerCase().endsWith(type)
      );

      if (!isValidType) {
        throw new Error("请选择 Excel (.xlsx/.xls) 或 CSV (.csv) 格式的文件");
      }

      // 解析文件数据
      const rawData = await parseFileData(file);

      if (!rawData || rawData.length === 0) {
        throw new Error("文件中没有找到有效数据");
      }

      // 验证和转换数据
      const validatedData = validateAndTransformData(rawData);

      // 调用学生服务进行批量导入
      const importResult = await studentService.importStudents(validatedData, {
        skipDuplicates: true,
        updateExisting: false,
      });

      if (importResult.success && importResult.data) {
        const { imported, updated, skipped, errors } = importResult.data;

        // 显示导入结果
        let description = `成功导入 ${imported} 名学生`;
        if (updated > 0) description += `，更新 ${updated} 名学生`;
        if (skipped > 0) description += `，跳过 ${skipped} 名重复学生`;

        toast.success("学生数据导入完成", {
          description,
        });

        // 如果有错误，显示警告
        if (errors.length > 0) {
          toast.warning("导入过程中出现部分错误", {
            description: `${errors.length} 个错误，请检查数据格式`,
          });
          console.warn("导入错误详情:", errors);
        }

        // 通知父组件数据导入成功
        onDataImported(validatedData);
      } else {
        throw new Error(importResult.error || "导入失败");
      }
    } catch (error) {
      console.error("导入学生数据失败:", error);
      toast.error("导入失败", {
        description:
          error instanceof Error ? error.message : "请检查文件格式是否正确",
      });
    } finally {
      setIsUploading(false);
      // 清空文件输入
      event.target.value = "";
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
