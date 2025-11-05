import React, { useState, useEffect } from "react";
import { X, Copy, Trash2, Plus, Save, RotateCcw, Settings } from "lucide-react";
import { examSpecificPassRateCalculator } from "@/services/examSpecificPassRateCalculator";

interface SubjectConfig {
  name: string;
  displayName: string;
  maxScore: number;
  passScore: number;
  excellentScore: number;
  isCustom: boolean;
}

interface ExamSpecificSubjectSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  currentExamId?: string; // 当前查看的考试ID
  currentExamName?: string; // 当前查看的考试名称
}

export const ExamSpecificSubjectSettings: React.FC<
  ExamSpecificSubjectSettingsProps
> = ({ isOpen, onClose, onSave, currentExamId, currentExamName }) => {
  const [activeTab, setActiveTab] = useState<"global" | "exam">("global");
  const [globalConfigs, setGlobalConfigs] = useState<SubjectConfig[]>([]);
  const [examConfigs, setExamConfigs] = useState<SubjectConfig[]>([]);
  const [examList, setExamList] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [newExamName, setNewExamName] = useState<string>("");
  const [autoCalculate, setAutoCalculate] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfigs();
      loadExamList();
      if (currentExamId) {
        setSelectedExamId(currentExamId);
        setActiveTab("exam");
      }
    }
  }, [isOpen, currentExamId]);

  const loadConfigs = () => {
    // 加载全局配置
    const calculator = examSpecificPassRateCalculator;
    const allGlobalConfigs = calculator.getGlobalConfigs();
    setGlobalConfigs(allGlobalConfigs);

    // 如果有选中的考试，加载考试特定配置
    if (selectedExamId) {
      const examConfig = calculator.getExamConfig(selectedExamId);
      if (examConfig) {
        setExamConfigs(Array.from(examConfig.subjects.values()));
      } else {
        // 如果没有考试特定配置，使用全局配置作为模板
        setExamConfigs([...allGlobalConfigs]);
      }
    }
  };

  const loadExamList = () => {
    const calculator = examSpecificPassRateCalculator;
    const configs = calculator.getAllExamConfigs();
    setExamList(configs);
  };

  const handleSubjectChange = (
    index: number,
    field: keyof SubjectConfig,
    value: string | number | boolean,
    isExamConfig: boolean = false
  ) => {
    const configs = isExamConfig ? [...examConfigs] : [...globalConfigs];
    const config = { ...configs[index] };

    if (field === "maxScore" && typeof value === "number") {
      config.maxScore = value;
      if (autoCalculate) {
        config.passScore = Math.round(value * 0.6);
        config.excellentScore = Math.round(value * 0.85);
      }
    } else {
      (config as any)[field] = value;
    }

    configs[index] = config;

    if (isExamConfig) {
      setExamConfigs(configs);
    } else {
      setGlobalConfigs(configs);
    }
    setHasChanges(true);
  };

  const handleSaveGlobal = () => {
    examSpecificPassRateCalculator.updateGlobalConfig(globalConfigs);
    setHasChanges(false);
    alert("全局配置已保存！");
    if (onSave) onSave();
  };

  const handleSaveExam = () => {
    if (!selectedExamId) {
      alert("请选择或创建一个考试");
      return;
    }

    const examName =
      examList.find((e) => e.examId === selectedExamId)?.examName ||
      newExamName ||
      selectedExamId;
    examSpecificPassRateCalculator.setExamConfig(
      selectedExamId,
      examName,
      examConfigs
    );
    loadExamList();
    setHasChanges(false);
    alert(`考试"${examName}"的配置已保存！`);
    if (onSave) onSave();
  };

  const handleCreateExam = () => {
    if (!newExamName.trim()) {
      alert("请输入考试名称");
      return;
    }

    const examId = `exam_${Date.now()}`;
    setSelectedExamId(examId);
    setExamConfigs([...globalConfigs]); // 使用全局配置作为模板
    setNewExamName("");
    setHasChanges(true);
  };

  const handleCopyFromExam = (sourceExamId: string) => {
    const sourceConfig =
      examSpecificPassRateCalculator.getExamConfig(sourceExamId);
    if (sourceConfig) {
      setExamConfigs(Array.from(sourceConfig.subjects.values()));
      setHasChanges(true);
    }
  };

  const handleDeleteExam = (examId: string) => {
    if (confirm("确定要删除这个考试的配置吗？")) {
      examSpecificPassRateCalculator.deleteExamConfig(examId);
      loadExamList();
      if (selectedExamId === examId) {
        setSelectedExamId("");
        setExamConfigs([]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-orange-600" />
            <h2 className="text-2xl font-bold text-gray-900">科目配置管理</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "global"
                ? "text-orange-600 border-b-2 border-orange-600 bg-orange-50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => setActiveTab("global")}
          >
            全局默认配置
          </button>
          <button
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "exam"
                ? "text-orange-600 border-b-2 border-orange-600 bg-orange-50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => setActiveTab("exam")}
          >
            考试特定配置
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[65vh]">
          {activeTab === "global" ? (
            /* 全局配置 */
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">全局默认设置</h3>
                <p className="text-sm text-gray-600 mb-4">
                  这些设置将作为所有考试的默认配置。如果某个考试没有特定配置，将使用这些值。
                </p>

                <div className="flex items-center gap-4 mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={autoCalculate}
                      onChange={(e) => setAutoCalculate(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">
                      自动计算及格线（60%）和优秀线（85%）
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-6 gap-4 text-sm font-medium text-gray-600 px-4 py-2 bg-gray-100 rounded-lg">
                  <div>科目</div>
                  <div>满分</div>
                  <div>及格线</div>
                  <div>优秀线</div>
                  <div>及格率标准</div>
                  <div>优秀率标准</div>
                </div>

                {globalConfigs.map((config, index) => (
                  <div
                    key={config.name}
                    className="grid grid-cols-6 gap-4 items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="font-medium text-gray-900">
                      {config.displayName}
                    </div>
                    <div>
                      <input
                        type="number"
                        value={config.maxScore}
                        onChange={(e) =>
                          handleSubjectChange(
                            index,
                            "maxScore",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="满分"
                        min="1"
                        max="1000"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={config.passScore}
                        onChange={(e) =>
                          handleSubjectChange(
                            index,
                            "passScore",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="及格线"
                        disabled={autoCalculate}
                        min="0"
                        max={config.maxScore}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={config.excellentScore}
                        onChange={(e) =>
                          handleSubjectChange(
                            index,
                            "excellentScore",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="优秀线"
                        disabled={autoCalculate}
                        min={config.passScore}
                        max={config.maxScore}
                      />
                    </div>
                    <div className="text-sm text-green-600 font-medium">
                      {config.maxScore > 0
                        ? Math.round((config.passScore / config.maxScore) * 100)
                        : 0}
                      %
                    </div>
                    <div className="text-sm text-blue-600 font-medium">
                      {config.maxScore > 0
                        ? Math.round(
                            (config.excellentScore / config.maxScore) * 100
                          )
                        : 0}
                      %
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => {
                    loadConfigs();
                    setHasChanges(false);
                  }}
                  className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  重置
                </button>
                <button
                  onClick={handleSaveGlobal}
                  disabled={!hasChanges}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  保存全局配置
                </button>
              </div>
            </div>
          ) : (
            /* 考试特定配置 */
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">考试特定设置</h3>
                <p className="text-sm text-gray-600 mb-4">
                  为特定考试设置不同的科目满分和及格线。这将覆盖全局默认设置。
                </p>

                {/* 考试选择/创建 */}
                <div className="flex items-center gap-4 mb-4">
                  <select
                    value={selectedExamId}
                    onChange={(e) => {
                      setSelectedExamId(e.target.value);
                      if (e.target.value) {
                        loadConfigs();
                      } else {
                        setExamConfigs([]);
                      }
                      setHasChanges(false);
                    }}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">选择现有考试</option>
                    {examList.map((exam) => (
                      <option key={exam.examId} value={exam.examId}>
                        {exam.examName} ({exam.examId})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newExamName}
                      onChange={(e) => setNewExamName(e.target.value)}
                      placeholder="新考试名称"
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <button
                      onClick={handleCreateExam}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      创建
                    </button>
                  </div>
                </div>

                {/* 考试管理按钮 */}
                {examList.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleCopyFromExam(e.target.value);
                        }
                        e.target.value = "";
                      }}
                      defaultValue=""
                      className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">从其他考试复制配置</option>
                      {examList
                        .filter((e) => e.examId !== selectedExamId)
                        .map((exam) => (
                          <option key={exam.examId} value={exam.examId}>
                            {exam.examName}
                          </option>
                        ))}
                    </select>

                    {selectedExamId && (
                      <button
                        onClick={() => handleDeleteExam(selectedExamId)}
                        className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 flex items-center gap-2 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        删除考试配置
                      </button>
                    )}
                  </div>
                )}
              </div>

              {selectedExamId && (
                <div className="space-y-4">
                  <div className="grid grid-cols-6 gap-4 text-sm font-medium text-gray-600 px-4 py-2 bg-blue-100 rounded-lg">
                    <div>科目</div>
                    <div>满分</div>
                    <div>及格线</div>
                    <div>优秀线</div>
                    <div>及格率标准</div>
                    <div>优秀率标准</div>
                  </div>

                  {examConfigs.map((config, index) => (
                    <div
                      key={config.name}
                      className="grid grid-cols-6 gap-4 items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <div className="font-medium text-gray-900">
                        {config.displayName}
                      </div>
                      <div>
                        <input
                          type="number"
                          value={config.maxScore}
                          onChange={(e) =>
                            handleSubjectChange(
                              index,
                              "maxScore",
                              parseInt(e.target.value) || 0,
                              true
                            )
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="满分"
                          min="1"
                          max="1000"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={config.passScore}
                          onChange={(e) =>
                            handleSubjectChange(
                              index,
                              "passScore",
                              parseInt(e.target.value) || 0,
                              true
                            )
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="及格线"
                          min="0"
                          max={config.maxScore}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={config.excellentScore}
                          onChange={(e) =>
                            handleSubjectChange(
                              index,
                              "excellentScore",
                              parseInt(e.target.value) || 0,
                              true
                            )
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="优秀线"
                          min={config.passScore}
                          max={config.maxScore}
                        />
                      </div>
                      <div className="text-sm text-green-600 font-medium">
                        {config.maxScore > 0
                          ? Math.round(
                              (config.passScore / config.maxScore) * 100
                            )
                          : 0}
                        %
                      </div>
                      <div className="text-sm text-blue-600 font-medium">
                        {config.maxScore > 0
                          ? Math.round(
                              (config.excellentScore / config.maxScore) * 100
                            )
                          : 0}
                        %
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedExamId && (
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={() => {
                      loadConfigs();
                      setHasChanges(false);
                    }}
                    className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    重置
                  </button>
                  <button
                    onClick={handleSaveExam}
                    disabled={!hasChanges}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    保存考试配置
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
