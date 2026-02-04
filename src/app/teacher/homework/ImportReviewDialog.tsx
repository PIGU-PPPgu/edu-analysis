import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, Lightbulb } from "lucide-react";

interface ImportReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileSize: number;
  // removed: initialFileData: Record<string, string>[] | null; // Step 1 now fetches this
  // removed: initialFileHeaders: string[]; // Step 1 now fetches this
  onStartAiParsing: (file: File) => Promise<{
    ยอดเยี่ยมMapping: Record<string, string>;
    sampleData: Record<string, string>[];
  }>; // 假设返回AI映射和一些样本数据
  systemFields: SystemField[];
  onCheckStudents: (
    data: Record<string, string>[],
    mappings: Record<string, string>
  ) => Promise<StudentToImport[]>;
  onConfirmImport: (
    students: StudentToImport[],
    finalMappings: Record<string, string>
  ) => Promise<void>;
  getRawFilePreview: () => Promise<{
    headers: string[];
    data: Record<string, string>[];
  }>; // 新增: 用于获取步骤1的原始数据预览
  fileToProcess: File | null; // 传递实际文件用于AI解析
  onSuggestFieldMapping?: (
    header: string,
    allHeaders: string[],
    sampleData: Record<string, string>[]
  ) => void; // AI建议回调
  aiSuggestedMappings?: Record<string, string> | null; // 从父组件接收AI建议的初始映射
  onNewCustomFieldCreated?: (fieldName: string) => void; // 新增回调：通知父组件创建了新的自定义字段
}

interface SystemField {
  id: string;
  name: string;
}

interface StudentToImport {
  name: string;
  className: string;
  isExisting: boolean;
  data: Record<string, any>;
}

export const ImportReviewDialog: React.FC<ImportReviewDialogProps> = ({
  isOpen,
  onClose,
  fileName,
  fileSize,
  // initialFileData, // removed
  // initialFileHeaders, // removed
  onStartAiParsing,
  systemFields,
  onCheckStudents,
  onConfirmImport,
  getRawFilePreview, // 新增
  fileToProcess, // 新增
  onSuggestFieldMapping,
  aiSuggestedMappings,
  onNewCustomFieldCreated, // 新增
}) => {
  const [rawFileHeaders, setRawFileHeaders] = useState<string[]>([]);
  const [rawFileData, setRawFileData] = useState<Record<string, string>[]>([]);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [parsedDataForReview, setParsedDataForReview] = useState<
    Record<string, string>[] | null
  >(null);
  const [userConfirmedMappings, setUserConfirmedMappings] = useState<
    Record<string, string>
  >({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newFieldName, setNewFieldName] = useState("");
  const [aiProcessing, setAiProcessing] = useState(false);
  const [studentsForImport, setStudentsForImport] = useState<StudentToImport[]>(
    []
  );
  const [isCheckingStudents, setIsCheckingStudents] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const [initialMappingsApplied, setInitialMappingsApplied] = useState(false); // 确保AI建议只应用一次

  const systemFieldsToMap = useMemo(() => {
    // Log systemFields prop for debugging
    console.log(
      "[ImportReviewDialog] systemFields prop received:",
      systemFields
    );
    const baseFields = systemFields.map((sf) => ({
      value: sf.id,
      label: sf.name,
    }));
    // This will be enhanced later when customFields are passed from GradeOverview
    return baseFields;
  }, [systemFields]);

  // For Step 1: Fetch raw file preview
  useEffect(() => {
    if (isOpen && currentStep === 0 && !parsedDataForReview) {
      // Actually step 1, but currentStep is 0-indexed
      const fetchPreview = async () => {
        console.log("[ImportReviewDialog Step 1] Fetching raw file preview...");
        setIsFetchingPreview(true);
        setError(null);
        try {
          const { headers, data } = await getRawFilePreview();
          console.log("[ImportReviewDialog Step 1] Raw file preview fetched:", {
            headers,
            data_count: data.length,
          });
          setRawFileHeaders(headers);
          setRawFileData(data);
          // Initialize fileHeaders and parsedDataForReview for subsequent steps if needed,
          // or let step 2's AI parsing populate them.
          // For now, let's assume AI parsing will provide the primary headers/data for step 2.
        } catch (e) {
          console.error(
            "[ImportReviewDialog Step 1] Error fetching raw file preview:",
            e
          );
          setError("获取文件预览失败，请确保文件有效。");
        } finally {
          setIsFetchingPreview(false);
        }
      };
      fetchPreview();
    }
  }, [isOpen, currentStep, getRawFilePreview, parsedDataForReview]);

  // Effect to apply AI suggested mappings once when they become available for step 2
  useEffect(() => {
    if (
      currentStep === 1 &&
      aiSuggestedMappings &&
      Object.keys(aiSuggestedMappings).length > 0 &&
      !initialMappingsApplied
    ) {
      console.log(
        "[ImportReviewDialog Step 2] Applying AI suggested mappings:",
        aiSuggestedMappings
      );
      setUserConfirmedMappings((prev) => ({ ...prev, ...aiSuggestedMappings }));
      setInitialMappingsApplied(true); // Mark as applied
      // Also ensure fileHeaders are set from AI suggestions or parsed data if not already
      if (
        fileHeaders.length === 0 &&
        parsedDataForReview &&
        parsedDataForReview.length > 0
      ) {
        setFileHeaders(Object.keys(parsedDataForReview[0]));
        console.log(
          "[ImportReviewDialog Step 2] File headers set from parsedDataForReview:",
          Object.keys(parsedDataForReview[0])
        );
      }
    }
  }, [
    currentStep,
    aiSuggestedMappings,
    initialMappingsApplied,
    fileHeaders,
    parsedDataForReview,
  ]);

  const sampleDataForSuggestion = useMemo(() => {
    if (parsedDataForReview && parsedDataForReview.length > 0) {
      const data = parsedDataForReview.slice(
        0,
        Math.min(5, parsedDataForReview.length)
      );
      console.log(
        "[ImportReviewDialog] Generated sampleDataForSuggestion:",
        data
      );
      return data;
    }
    console.log(
      "[ImportReviewDialog] No parsedDataForReview to generate sampleDataForSuggestion."
    );
    return [];
  }, [parsedDataForReview]);

  const handleNextStep = async () => {
    setError(null);
    if (currentStep === 0) {
      // User confirmed raw data preview, proceed to AI parsing (Step 2)
      console.log(
        "[ImportReviewDialog] Proceeding from Step 1 (Raw Preview) to Step 2 (AI Parsing)."
      );
      if (!fileToProcess) {
        setError("没有文件可供处理。");
        console.error(
          "[ImportReviewDialog] fileToProcess is null when trying to start AI parsing."
        );
        return;
      }
      setAiProcessing(true);
      try {
        const { ยอดเยี่ยมMapping, sampleData } =
          await onStartAiParsing(fileToProcess);
        console.log("[ImportReviewDialog Step 2] AI parsing completed.", {
          ยอดเยี่ยมMapping,
          sampleData_count: sampleData?.length,
        });
        // AI解析后，设置用于字段映射的数据
        if (sampleData && sampleData.length > 0) {
          setFileHeaders(Object.keys(sampleData[0]));
          setParsedDataForReview(sampleData); // 使用AI返回的样本数据进行映射和预览
          console.log(
            "[ImportReviewDialog Step 2] fileHeaders and parsedDataForReview set from AI parsing results."
          );
        } else {
          // Fallback if AI doesn't return sampleData, try to use rawFileData if available
          // This case should ideally be handled by onStartAiParsing providing consistent output
          if (rawFileData.length > 0) {
            setFileHeaders(rawFileHeaders);
            setParsedDataForReview(rawFileData);
            console.warn(
              "[ImportReviewDialog Step 2] AI parsing did not return sampleData, falling back to rawFileData for review."
            );
          } else {
            console.error(
              "[ImportReviewDialog Step 2] AI parsing did not return sampleData, and no rawFileData available."
            );
            setError("AI解析未能提供可供审核的数据。");
            setAiProcessing(false);
            return;
          }
        }
        // setUserConfirmedMappings(ยอดเยี่ยมMapping); // AI建议的映射在useEffect中处理
        // Reset initialMappingsApplied so new AI suggestions can be applied if user goes back and forth
        setInitialMappingsApplied(false);
        setCurrentStep(1);
      } catch (e) {
        console.error("[ImportReviewDialog Step 2] AI parsing error:", e);
        setError("AI智能匹配失败，请稍后重试或手动映射。");
      } finally {
        setAiProcessing(false);
      }
    } else if (currentStep === 1) {
      // User confirmed mappings (Step 2), proceed to student check (Step 3)
      console.log(
        "[ImportReviewDialog] Proceeding from Step 2 (Mapping) to Step 3 (Student Check)."
      );
      console.log(
        "[ImportReviewDialog Step 2] Final user confirmed mappings:",
        userConfirmedMappings
      );
      if (!parsedDataForReview) {
        setError("没有可供处理的数据。");
        console.error(
          "[ImportReviewDialog] parsedDataForReview is null when proceeding to student check."
        );
        return;
      }

      setIsCheckingStudents(true);
      try {
        const students = await onCheckStudents(
          parsedDataForReview,
          userConfirmedMappings
        );
        setStudentsForImport(students);
        setCurrentStep(2);
      } catch (e) {
        console.error("[ImportReviewDialog Step 3] Student check error:", e);
        setError("学生信息检查失败，请重试。");
      } finally {
        setIsCheckingStudents(false);
      }
    } else if (currentStep === 2) {
      // Student check completed, proceed to final confirmation
      setCurrentStep(3);
    }
  };

  const handleMappingChange = (originalHeader: string, newMapping: string) => {
    console.log(
      `[ImportReviewDialog Step 2] handleMappingChange called. Header: ${originalHeader}, New Mapping: ${newMapping}`
    );
    if (newMapping === "NEW_FIELD") {
      setNewFieldName("");
      setEditingField(originalHeader);
    } else {
      setUserConfirmedMappings((prev) => ({
        ...prev,
        [originalHeader]: newMapping,
      }));
      setEditingField(null);
    }
  };

  const handleConfirmNewField = (originalHeader: string) => {
    console.log(
      `[ImportReviewDialog Step 2] handleConfirmNewField called. Header: ${originalHeader}, New Field Name: ${newFieldName}`
    );
    if (newFieldName.trim()) {
      const actualNewFieldName = newFieldName.trim();

      // Update local mappings to reflect the user's intent immediately for the UI
      setUserConfirmedMappings((prev) => ({
        ...prev,
        [originalHeader]: actualNewFieldName,
      }));

      if (onNewCustomFieldCreated) {
        console.log(
          `[ImportReviewDialog Step 2] Calling onNewCustomFieldCreated with: ${actualNewFieldName}`
        );
        onNewCustomFieldCreated(actualNewFieldName);
      } else {
        console.warn(
          `[ImportReviewDialog Step 2] onNewCustomFieldCreated is not defined. Cannot create global custom field.`
        );
      }

      setEditingField(null);
      setNewFieldName("");
    } else {
      console.warn(
        `[ImportReviewDialog Step 2] New field name is empty for header: ${originalHeader}`
      );
      // Optionally, set an error or provide feedback to the user
    }
  };

  // Effect for logging userConfirmedMappings changes
  useEffect(() => {
    console.log(
      "[ImportReviewDialog Step 2] useEffect detected change in userConfirmedMappings:",
      userConfirmedMappings
    );
    // Any logic that needs to run when mappings change, e.g., updating a preview
    if (parsedDataForReview && fileHeaders.length > 0) {
      // This will trigger re-render of the preview table if it depends on userConfirmedMappings
      console.log(
        "[ImportReviewDialog Step 2] Mappings changed, preview table will re-render."
      );
    }
  }, [userConfirmedMappings, parsedDataForReview, fileHeaders]);

  const resetDialog = useCallback(() => {
    console.log("[ImportReviewDialog] Resetting dialog state.");
    setCurrentStep(0);
    setFileHeaders([]);
    setParsedDataForReview(null);
    setUserConfirmedMappings({});
    setEditingField(null);
    setNewFieldName("");
    setAiProcessing(false);
    setStudentsForImport([]);
    setIsCheckingStudents(false);
    setIsImporting(false);
    setError(null);
    setImportSuccess(false);
    setRawFileHeaders([]);
    setRawFileData([]);
    setIsFetchingPreview(false);
    setInitialMappingsApplied(false);
  }, []);

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 0: // Raw data preview
        return rawFileData.length > 0;
      case 1: // AI mapping confirmation
        return Object.keys(userConfirmedMappings).length > 0;
      case 2: // Student check
        return studentsForImport.length > 0;
      case 3: // Final confirmation
        return true;
      default:
        return false;
    }
  };

  const handleFinalImport = async () => {
    if (studentsForImport.length === 0) {
      setError("没有学生数据可导入");
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      await onConfirmImport(studentsForImport, userConfirmedMappings);
      setImportSuccess(true);
      setTimeout(() => {
        onClose();
        resetDialog();
      }, 2000);
    } catch (error) {
      console.error("导入失败:", error);
      setError("导入失败，请重试");
    } finally {
      setIsImporting(false);
    }
  };

  const renderStep2Content = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">第三步：学生信息合并</h3>
      <p>检查学生信息匹配结果，确认无误后进行导入。</p>
      {isCheckingStudents && (
        <div className="flex items-center space-x-2">
          <Loader2 className="animate-spin" />
          <span>正在检查学生信息...</span>
        </div>
      )}
      {studentsForImport.length > 0 && (
        <div className="overflow-auto max-h-60 border rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">
                  学生姓名
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">
                  班级
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">
                  状态
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {studentsForImport.map((student, index) => (
                <tr key={index}>
                  <td className="px-3 py-2">{student.name}</td>
                  <td className="px-3 py-2">{student.className}</td>
                  <td className="px-3 py-2">
                    {student.isExisting ? "已存在" : "新增"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderStep3Content = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">第四步：最终确认导入</h3>
      <p>请确认以下信息无误后点击"确认导入"。</p>
      <div className="bg-gray-50 p-4 rounded-md">
        <p>
          <strong>文件名：</strong>
          {fileName}
        </p>
        <p>
          <strong>学生数量：</strong>
          {studentsForImport.length}
        </p>
        <p>
          <strong>字段映射：</strong>
          {Object.keys(userConfirmedMappings).length} 个字段
        </p>
      </div>
      {isImporting && (
        <div className="flex items-center space-x-2">
          <Loader2 className="animate-spin" />
          <span>正在导入数据...</span>
        </div>
      )}
      {importSuccess && (
        <div className="text-green-600 flex items-center space-x-2">
          <span>✓ 导入成功！</span>
        </div>
      )}
    </div>
  );

  // Render logic for Step 1 (Raw Data Preview)
  const renderStep0Content = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">第一步：原始数据预览</h3>
      <p>
        请检查以下从文件中读取的原始数据。确认无误后，我们将进行AI智能匹配。
      </p>
      {isFetchingPreview && (
        <div className="flex items-center space-x-2">
          <Loader2 className="animate-spin" />
          <span>正在加载预览...</span>
        </div>
      )}
      {!isFetchingPreview && error && (
        <div className="text-red-500 flex items-center space-x-2">
          <AlertTriangle />
          <span>{error}</span>
        </div>
      )}
      {!isFetchingPreview && !error && rawFileData.length > 0 && (
        <div className="overflow-auto max-h-96 border rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {rawFileHeaders.map((header, index) => (
                  <th
                    key={index}
                    className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rawFileData.slice(0, 20).map(
                (
                  row,
                  rowIndex // Show limited rows for raw preview
                ) => (
                  <tr key={rowIndex}>
                    {rawFileHeaders.map((header, colIndex) => (
                      <td
                        key={colIndex}
                        className="px-3 py-2 whitespace-nowrap"
                      >
                        {row[header] !== undefined && row[header] !== null ? (
                          String(row[header])
                        ) : (
                          <span className="text-gray-400 italic">空</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )
              )}
            </tbody>
          </table>
          {rawFileData.length > 20 && (
            <p className="text-xs text-gray-500 mt-2">
              （仅显示前20行原始数据）
            </p>
          )}
        </div>
      )}
      {!isFetchingPreview &&
        !error &&
        rawFileData.length === 0 &&
        !isFetchingPreview && <p>未能加载预览数据。</p>}
    </div>
  );

  // Render logic for Step 2 (AI Matching and Confirmation)
  const renderStep1Content = () => (
    // This is effectively step 2 due to 0-indexed currentStep
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">第二步：AI智能匹配与确认</h3>
      <p>
        AI已尝试根据文件内容匹配系统信息项，请检查并确认或修改不正确的匹配。您可以手动选择匹配，或为无法匹配的项创建新的自定义信息项。
      </p>
      {aiProcessing && (
        <div className="flex items-center space-x-2">
          <Loader2 className="animate-spin" />
          <span>AI智能匹配处理中，请稍候...</span>
        </div>
      )}
      {!aiProcessing && error && (
        <div className="text-red-500 flex items-center space-x-2">
          <AlertTriangle />
          <span>{error}</span>
        </div>
      )}
      {!aiProcessing &&
        !error &&
        parsedDataForReview &&
        fileHeaders.length > 0 && (
          <div>
            <div className="font-semibold mb-2">字段映射：</div>
            <div className="overflow-x-auto border rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      原始表头
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      匹配到系统信息项
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fileHeaders.map((header) => {
                    const currentMapping = userConfirmedMappings[header] || "";
                    const isEffectivelyUnmapped =
                      !currentMapping ||
                      currentMapping === "unknown" ||
                      currentMapping.startsWith("NEW_FIELD::");
                    // More specific log for mapping state
                    console.log(
                      `[ImportReviewDialog Step 2 Render] Header: "${header}", Current Mapping: "${currentMapping}", Is Effectively Unmapped: ${isEffectivelyUnmapped}, Editing Field: "${editingField}"`
                    );

                    return (
                      <tr key={header}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                          {header}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {editingField === header ? (
                            <div className="flex items-center space-x-2">
                              <Input
                                type="text"
                                value={newFieldName}
                                onChange={(e) =>
                                  setNewFieldName(e.target.value)
                                }
                                placeholder="输入新信息项名称"
                                className="h-8 text-sm"
                              />
                              <Button
                                onClick={() => handleConfirmNewField(header)}
                                size="sm"
                                className="text-xs"
                              >
                                确认
                              </Button>
                              <Button
                                onClick={() => setEditingField(null)}
                                size="sm"
                                variant="outline"
                                className="text-xs"
                              >
                                取消
                              </Button>
                            </div>
                          ) : (
                            <Select
                              value={
                                userConfirmedMappings[header]?.startsWith(
                                  "NEW_FIELD::"
                                )
                                  ? userConfirmedMappings[header]?.split(
                                      "NEW_FIELD::"
                                    )[1]
                                  : currentMapping
                              }
                              onValueChange={(value) =>
                                handleMappingChange(header, value)
                              }
                            >
                              <SelectTrigger className="w-full text-sm h-8">
                                <SelectValue placeholder="选择信息项..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value="unknown"
                                  disabled={
                                    !!currentMapping &&
                                    currentMapping !== "unknown"
                                  }
                                >
                                  标记为未匹配
                                </SelectItem>
                                {systemFieldsToMap.map((sf) => (
                                  <SelectItem key={sf.value} value={sf.value}>
                                    {sf.label}
                                  </SelectItem>
                                ))}
                                <SelectItem value="NEW_FIELD">
                                  --- 创建新的自定义信息项 ---
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {isEffectivelyUnmapped &&
                            onSuggestFieldMapping &&
                            editingField !== header && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  console.log(
                                    `[ImportReviewDialog Step 2] AI Suggest button clicked for header: ${header}`
                                  );
                                  console.log(
                                    `[ImportReviewDialog Step 2] Passing to onSuggestFieldMapping - header: ${header}, fileHeaders:`,
                                    fileHeaders,
                                    `sampleData:`,
                                    sampleDataForSuggestion
                                  );
                                  if (onSuggestFieldMapping) {
                                    // Extra check before calling
                                    onSuggestFieldMapping(
                                      header,
                                      fileHeaders,
                                      sampleDataForSuggestion
                                    );
                                  }
                                }}
                                title="AI建议匹配"
                                className="p-1 text-yellow-500 hover:text-yellow-600"
                              >
                                <Lightbulb size={18} />
                              </Button>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 font-semibold">数据预览（基于当前映射）：</div>
            <div className="overflow-auto max-h-60 border rounded-md">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {fileHeaders.map((originalHeader, index) => {
                      const mappedKey = userConfirmedMappings[originalHeader];
                      let displayHeader = originalHeader; // Default to original if no mapping or unknown
                      if (mappedKey && mappedKey !== "unknown") {
                        const systemField = systemFieldsToMap.find(
                          (sf) => sf.value === mappedKey
                        );
                        if (systemField) {
                          displayHeader = systemField.label;
                        } else if (!mappedKey.startsWith("NEW_FIELD::")) {
                          // If it's not a system field and not a NEW_FIELD placeholder,
                          // it might be a directly used custom field name after creation
                          displayHeader = mappedKey;
                        }
                        // If it was NEW_FIELD::, it's now directly the name, so covered by mappedKey
                      }

                      // Log for debugging header display
                      // console.log(`[ImportReviewDialog Step 2 Preview Header] Original: ${originalHeader}, MappedKey: ${mappedKey}, Display: ${displayHeader}`);

                      return (
                        <th
                          key={index}
                          className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap bg-gray-50"
                        >
                          {displayHeader}
                          {originalHeader !== displayHeader && (
                            <span className="block text-gray-400 text-xxs">
                              ({originalHeader})
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parsedDataForReview.slice(0, 10).map(
                    (
                      row,
                      rowIndex // Show limited rows for mapped preview
                    ) => (
                      <tr key={rowIndex}>
                        {fileHeaders.map((header, colIndex) => (
                          <td
                            key={colIndex}
                            className="px-3 py-2 whitespace-nowrap"
                          >
                            {row[header] !== undefined &&
                            row[header] !== null ? (
                              String(row[header])
                            ) : (
                              <span className="text-gray-400 italic">空</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
              {parsedDataForReview.length > 10 && (
                <p className="text-xs text-gray-500 mt-2">
                  （仅显示前10行预览数据）
                </p>
              )}
            </div>
          </div>
        )}
      {!aiProcessing &&
        !error &&
        (!parsedDataForReview || fileHeaders.length === 0) && (
          <p>AI解析后无数据显示。请检查文件或尝试重新解析。</p>
        )}
    </div>
  );

  const steps = [
    { title: "数据预览", content: renderStep0Content(), id: "preview" },
    { title: "AI匹配与确认", content: renderStep1Content(), id: "map" },
    { title: "学生信息合并", content: renderStep2Content(), id: "merge" },
    { title: "最终确认导入", content: renderStep3Content(), id: "confirm" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>导入作业数据 - {fileName}</DialogTitle>
          <DialogDescription>
            文件大小: {(fileSize / 1024).toFixed(2)} KB
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 步骤指示器 */}
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    index === currentStep
                      ? "bg-blue-500 text-white"
                      : index < currentStep
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {index + 1}
                </div>
                <span
                  className={`ml-2 text-sm ${
                    index === currentStep
                      ? "font-medium text-blue-600"
                      : index < currentStep
                        ? "text-green-600"
                        : "text-gray-500"
                  }`}
                >
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-4 ${
                      index < currentStep ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* 当前步骤内容 */}
          <div className="border rounded-lg p-6">
            {steps[currentStep]?.content}
          </div>

          {/* 导航按钮 */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevStep}
              disabled={currentStep === 0}
            >
              上一步
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={handleNextStep}
                  disabled={!canProceedToNextStep()}
                >
                  下一步
                </Button>
              ) : (
                <Button
                  onClick={handleFinalImport}
                  disabled={!canProceedToNextStep()}
                >
                  确认导入
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
