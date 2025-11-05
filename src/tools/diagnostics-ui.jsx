import React, { useState } from "react";
import { diagnoseStudentId, fixStudentId } from "./homework-diagnostics";

export function DiagnosticsTool() {
  const [studentId, setStudentId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [fixResults, setFixResults] = useState(null);

  const runDiagnostics = async () => {
    if (!studentId) return;

    setIsLoading(true);
    setResults(null);
    setFixResults(null);

    try {
      const diagnosticResults = await diagnoseStudentId(studentId);
      setResults(diagnosticResults);
    } catch (error) {
      console.error("诊断失败:", error);
      setResults({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const runFix = async () => {
    if (!results) return;

    setIsLoading(true);
    setFixResults(null);

    try {
      const fixResult = await fixStudentId(studentId);
      setFixResults(fixResult);
    } catch (error) {
      console.error("修复失败:", error);
      setFixResults({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">学生ID诊断工具</h1>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="输入学生ID"
          className="flex-1 p-2 border rounded"
        />
        <button
          onClick={runDiagnostics}
          disabled={isLoading || !studentId}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          {isLoading ? "诊断中..." : "开始诊断"}
        </button>
      </div>

      {results && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">诊断结果</h2>

          <div className="p-3 mb-3 rounded border">
            <p className="font-semibold">摘要</p>
            <p>{results.summary}</p>
          </div>

          {results.formatCheck && (
            <div
              className={`p-3 mb-3 rounded border ${results.formatCheck.isUuid ? "bg-green-50" : "bg-yellow-50"}`}
            >
              <p className="font-semibold">ID格式检查</p>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-600">输入ID:</span>{" "}
                  {results.studentId}
                </div>
                <div>
                  <span className="text-gray-600">ID类型:</span>{" "}
                  <span
                    className={
                      results.formatCheck.isUuid
                        ? "text-green-600"
                        : "text-orange-600 font-medium"
                    }
                  >
                    {results.formatCheck.formatType === "uuid"
                      ? "UUID (正确)"
                      : results.formatCheck.formatType === "student_code"
                        ? "学号 (需转换)"
                        : "未知格式"}
                  </span>
                </div>
              </div>

              {results.queryResults?.uuidLookup?.exists && (
                <div className="mt-2 p-2 bg-green-100 rounded">
                  <p className="text-green-700">
                    找到对应的UUID:{" "}
                    <span className="font-medium">
                      {results.queryResults.uuidLookup.data.id}
                    </span>
                  </p>
                  <p className="text-sm text-green-700">
                    学生: {results.queryResults.uuidLookup.data.name}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mb-3">
            <p className="font-semibold">状态: {getStatusBadge(results)}</p>
          </div>

          {(results.diagnosis?.overallStatus === "invalid" ||
            results.diagnosis?.overallStatus === "fixable") && (
            <button
              onClick={runFix}
              disabled={isLoading}
              className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300 mb-4"
            >
              {isLoading ? "修复中..." : "自动修复问题"}
            </button>
          )}

          {fixResults && (
            <div className="p-3 mb-3 rounded border bg-green-50">
              <p className="font-semibold">修复结果</p>
              <p>{fixResults.message}</p>
              {fixResults.success &&
                (fixResults.isReplacement || fixResults.isReformatted) && (
                  <div className="mt-2">
                    {fixResults.isReplacement && (
                      <p className="text-orange-700">
                        <span className="font-semibold">替代学生ID:</span>{" "}
                        {fixResults.studentId}
                      </p>
                    )}
                    {fixResults.isReformatted && (
                      <p className="text-green-700">
                        <span className="font-semibold">格式已修正:</span> 学号
                        "{fixResults.originalId}" → UUID "{fixResults.studentId}
                        "
                      </p>
                    )}
                  </div>
                )}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResultCard
              title="ID查询结果"
              success={results.queryResults?.direct.exists}
              details={[
                [
                  "直接查询",
                  results.queryResults?.direct.exists ? "成功" : "失败",
                ],
                [
                  "计数查询",
                  results.queryResults?.count.exists ? "成功" : "失败",
                ],
                [
                  "学号查询",
                  results.queryResults?.secondary.exists ? "成功" : "失败",
                ],
                [
                  "UUID查找",
                  results.queryResults?.uuidLookup?.exists ? "成功" : "失败",
                ],
                [
                  "ID一致性",
                  results.diagnosis?.details.idConsistency ? "一致" : "不一致",
                ],
                [
                  "正确格式",
                  results.formatCheck?.isUuid ? "是 (UUID)" : "否 (学号)",
                ],
              ]}
            />

            <ResultCard
              title="约束测试结果"
              success={results.diagnosis?.details.canInsert}
              details={[
                [
                  "约束存在",
                  results.constraintInfo?.constraintExists ? "是" : "否",
                ],
                ["可以插入", results.testInsertResult?.canInsert ? "是" : "否"],
                [
                  "主要问题",
                  results.diagnosis?.primaryIssue
                    ? results.diagnosis.primaryIssue === "wrong_id_format"
                      ? "ID格式错误"
                      : results.diagnosis.primaryIssue === "student_not_found"
                        ? "学生不存在"
                        : results.diagnosis.primaryIssue === "id_mismatch"
                          ? "ID不匹配"
                          : results.diagnosis.primaryIssue
                    : "无",
                ],
              ]}
            />
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer font-semibold">
              原始诊断数据
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 rounded overflow-auto text-xs">
              {JSON.stringify(results, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

// 辅助组件
function ResultCard({ title, success, details }) {
  return (
    <div
      className={`p-3 rounded border ${success ? "bg-green-50" : "bg-red-50"}`}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">{title}</h3>
        <span
          className={`px-2 py-1 rounded text-white text-xs ${success ? "bg-green-500" : "bg-red-500"}`}
        >
          {success ? "通过" : "失败"}
        </span>
      </div>
      <div className="text-sm">
        {details.map(([name, value], i) => (
          <div
            key={i}
            className="flex justify-between py-1 border-b border-gray-200 last:border-0"
          >
            <span>{name}:</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getStatusBadge(results) {
  const status = results.diagnosis?.overallStatus;

  switch (status) {
    case "valid":
      return (
        <span className="px-2 py-1 bg-green-500 text-white rounded">有效</span>
      );
    case "fixable":
      return (
        <span className="px-2 py-1 bg-yellow-500 text-white rounded">
          可修复
        </span>
      );
    case "invalid":
      return (
        <span className="px-2 py-1 bg-red-500 text-white rounded">无效</span>
      );
    default:
      return (
        <span className="px-2 py-1 bg-gray-500 text-white rounded">未知</span>
      );
  }
}
