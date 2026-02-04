"use client";

/**
 * 配置选择器组件
 * 允许用户选择已有配置或创建新配置
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  listConfigurations,
  generateRecommendedConfigName,
} from "@/services/configurationService";
import {
  readExcelFile,
  parseStudentInfo,
  parseTeachingArrangement,
} from "@/services/excelImportService";
import type {
  ImportConfiguration,
  ConfigurationMode,
  StudentInfo,
  TeachingArrangement,
} from "@/types/valueAddedTypes";

interface ConfigurationSelectorProps {
  onConfigSelect: (config: {
    mode: ConfigurationMode;
    existingConfigId?: string;
    newConfigData?: {
      name: string;
      studentInfo: StudentInfo[];
      teachingArrangement: TeachingArrangement[];
    };
  }) => void;
}

export function ConfigurationSelector({
  onConfigSelect,
}: ConfigurationSelectorProps) {
  const [mode, setMode] = useState<ConfigurationMode>("existing");
  const [configurations, setConfigurations] = useState<ImportConfiguration[]>(
    []
  );
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // 新配置相关状态
  const [newConfigName, setNewConfigName] = useState("");
  const [studentInfoFile, setStudentInfoFile] = useState<File | null>(null);
  const [teachingArrangementFile, setTeachingArrangementFile] =
    useState<File | null>(null);
  const [parsedStudentInfo, setParsedStudentInfo] = useState<StudentInfo[]>([]);
  const [parsedTeachingArrangement, setParsedTeachingArrangement] = useState<
    TeachingArrangement[]
  >([]);
  const [fileStatus, setFileStatus] = useState<{
    student: "idle" | "uploading" | "success" | "error";
    teacher: "idle" | "uploading" | "success" | "error";
  }>({ student: "idle", teacher: "idle" });

  // 加载配置列表
  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    setLoading(true);
    try {
      const configs = await listConfigurations({
        activeOnly: true,
        orderBy: "last_used_at",
        limit: 50,
      });
      setConfigurations(configs);

      // 默认选择最近使用的配置
      if (configs.length > 0 && !selectedConfigId) {
        setSelectedConfigId(configs[0].id);
      }
    } catch (error) {
      console.error("加载配置列表失败:", error);
      toast.error("加载配置列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 处理学生信息文件上传
  const handleStudentInfoUpload = async (file: File) => {
    setFileStatus((prev) => ({ ...prev, student: "uploading" }));
    try {
      const workbook = await readExcelFile(file);
      const data = parseStudentInfo(workbook);

      if (data.length === 0) {
        throw new Error("文件中没有有效数据");
      }

      setStudentInfoFile(file);
      setParsedStudentInfo(data);
      setFileStatus((prev) => ({ ...prev, student: "success" }));
      toast.success(`成功读取 ${data.length} 名学生信息`);

      // 自动生成推荐配置名称（如果教学编排也已上传）
      if (parsedTeachingArrangement.length > 0) {
        const recommendedName = generateRecommendedConfigName({
          studentInfo: data,
          teachingArrangement: parsedTeachingArrangement,
        });
        setNewConfigName(recommendedName);
      }
    } catch (error) {
      console.error("解析学生信息失败:", error);
      toast.error("解析学生信息失败");
      setFileStatus((prev) => ({ ...prev, student: "error" }));
    }
  };

  // 处理教学编排文件上传
  const handleTeachingArrangementUpload = async (file: File) => {
    setFileStatus((prev) => ({ ...prev, teacher: "uploading" }));
    try {
      const workbook = await readExcelFile(file);
      const data = parseTeachingArrangement(workbook);

      if (data.length === 0) {
        throw new Error("文件中没有有效数据");
      }

      setTeachingArrangementFile(file);
      setParsedTeachingArrangement(data);
      setFileStatus((prev) => ({ ...prev, teacher: "success" }));
      toast.success(`成功读取 ${data.length} 条教学编排记录`);

      // 自动生成推荐配置名称（如果学生信息也已上传）
      if (parsedStudentInfo.length > 0) {
        const recommendedName = generateRecommendedConfigName({
          studentInfo: parsedStudentInfo,
          teachingArrangement: data,
        });
        setNewConfigName(recommendedName);
      }
    } catch (error) {
      console.error("解析教学编排失败:", error);
      toast.error("解析教学编排失败");
      setFileStatus((prev) => ({ ...prev, teacher: "error" }));
    }
  };

  // 验证并提交选择
  const handleSubmit = () => {
    if (mode === "existing") {
      if (!selectedConfigId) {
        toast.error("请选择一个配置");
        return;
      }

      onConfigSelect({
        mode: "existing",
        existingConfigId: selectedConfigId,
      });
    } else {
      // 新配置模式
      if (!newConfigName || newConfigName.trim() === "") {
        toast.error("请输入配置名称");
        return;
      }

      if (parsedStudentInfo.length === 0) {
        toast.error("请上传学生信息表");
        return;
      }

      if (parsedTeachingArrangement.length === 0) {
        toast.error("请上传教学编排表");
        return;
      }

      onConfigSelect({
        mode: "new",
        newConfigData: {
          name: newConfigName,
          studentInfo: parsedStudentInfo,
          teachingArrangement: parsedTeachingArrangement,
        },
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>选择配置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 模式选择 */}
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as ConfigurationMode)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="existing" id="existing" />
            <Label htmlFor="existing" className="cursor-pointer">
              使用已有配置（无需重复上传学生和教师信息）
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="new" id="new" />
            <Label htmlFor="new" className="cursor-pointer">
              创建新配置（首次使用或新学期）
            </Label>
          </div>
        </RadioGroup>

        {/* 使用已有配置 */}
        {mode === "existing" && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-sm text-muted-foreground">
                加载配置列表...
              </div>
            ) : configurations.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  暂无可用配置，请选择"创建新配置"
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>选择配置</Label>
                  <Select
                    value={selectedConfigId}
                    onValueChange={setSelectedConfigId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择配置" />
                    </SelectTrigger>
                    <SelectContent>
                      {configurations.map((config) => (
                        <SelectItem key={config.id} value={config.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{config.name}</span>
                            <div className="flex items-center gap-2 ml-4 text-xs text-muted-foreground">
                              <span>{config.student_count}名学生</span>
                              <span>{config.class_count}个班级</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 显示选中配置的详情 */}
                {selectedConfigId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    {(() => {
                      const config = configurations.find(
                        (c) => c.id === selectedConfigId
                      );
                      return config ? (
                        <>
                          <h4 className="font-semibold text-blue-900 mb-2">
                            {config.name}
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-blue-800">
                            <div>
                              <div className="text-blue-600">学生</div>
                              <div className="font-semibold">
                                {config.student_count}
                              </div>
                            </div>
                            <div>
                              <div className="text-blue-600">班级</div>
                              <div className="font-semibold">
                                {config.class_count}
                              </div>
                            </div>
                            <div>
                              <div className="text-blue-600">教师</div>
                              <div className="font-semibold">
                                {config.teacher_count}
                              </div>
                            </div>
                            <div>
                              <div className="text-blue-600">科目</div>
                              <div className="font-semibold">
                                {config.subject_count}
                              </div>
                            </div>
                          </div>
                          {config.description && (
                            <p className="mt-2 text-sm text-blue-700">
                              {config.description}
                            </p>
                          )}
                        </>
                      ) : null;
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 创建新配置 */}
        {mode === "new" && (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                创建配置后，后续导入只需上传成绩文件即可，无需重复上传学生和教师信息。
              </AlertDescription>
            </Alert>

            {/* 文件上传 */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* 学生信息表 */}
              <div className="space-y-2">
                <Label>学生信息表 *</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleStudentInfoUpload(file);
                    }}
                    className="hidden"
                    id="student-info-upload"
                  />
                  <label
                    htmlFor="student-info-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                    {fileStatus.student === "success" ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div className="text-sm font-medium">
                          {studentInfoFile?.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {parsedStudentInfo.length} 名学生
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm text-muted-foreground">
                          {fileStatus.student === "uploading"
                            ? "解析中..."
                            : "点击上传 Excel 文件"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          必填：学号、姓名、班级
                        </div>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* 教学编排表 */}
              <div className="space-y-2">
                <Label>教学编排表 *</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleTeachingArrangementUpload(file);
                    }}
                    className="hidden"
                    id="teaching-arrangement-upload"
                  />
                  <label
                    htmlFor="teaching-arrangement-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                    {fileStatus.teacher === "success" ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div className="text-sm font-medium">
                          {teachingArrangementFile?.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {parsedTeachingArrangement.length} 条记录
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm text-muted-foreground">
                          {fileStatus.teacher === "uploading"
                            ? "解析中..."
                            : "点击上传 Excel 文件"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          必填：班级、教师、科目
                        </div>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* 配置名称 */}
            <div className="space-y-2">
              <Label htmlFor="config-name">配置名称 *</Label>
              <Input
                id="config-name"
                value={newConfigName}
                onChange={(e) => setNewConfigName(e.target.value)}
                placeholder="如：高一 2024-2025学年第一学期"
              />
              {newConfigName && (
                <div className="text-xs text-muted-foreground">
                  💡 提示：使用易于识别的名称，方便后续选择
                </div>
              )}
            </div>
          </div>
        )}

        {/* 提交按钮 */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={
              (mode === "existing" && !selectedConfigId) ||
              (mode === "new" &&
                (fileStatus.student !== "success" ||
                  fileStatus.teacher !== "success"))
            }
          >
            {mode === "existing" ? "使用此配置" : "创建并使用配置"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
