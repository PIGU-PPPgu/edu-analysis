/**
 * 安全功能演示组件
 * 展示如何使用新的安全系统
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useSecurity } from "@/hooks/useSecurity";
import { supabaseSecureClient } from "@/services/secureApiClient";
import { Shield, Lock, Eye, FileCheck, Key, Users } from "lucide-react";

export function SecurityDemo() {
  const security = useSecurity();
  const [testInput, setTestInput] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testPassword, setTestPassword] = useState("");
  const [testFile, setTestFile] = useState<File | null>(null);
  const [validationResults, setValidationResults] = useState<any>({});
  const [dataProtectionResult, setDataProtectionResult] = useState<any>(null);
  const [permissionReport, setPermissionReport] = useState<any>(null);

  // 输入验证示例
  const handleInputValidation = () => {
    const inputResult = security.validateInput(testInput, {
      maxLength: 100,
      minLength: 5,
      allowHtml: false,
      allowSpecialChars: false,
    });

    const emailResult = security.validateEmail(testEmail);
    const passwordResult = security.validatePassword(testPassword);
    const fileResult = testFile
      ? security.validateFile(testFile, {
          allowedTypes: "document",
          maxSize: 5 * 1024 * 1024, // 5MB
        })
      : null;

    setValidationResults({
      input: inputResult,
      email: emailResult,
      password: passwordResult,
      file: fileResult,
    });
  };

  // 数据保护示例
  const handleDataProtection = async () => {
    const sampleData = [
      {
        id: 1,
        name: "张三",
        phone: "13812345678",
        email: "zhangsan@example.com",
        student_id: "2024001",
        grade: 95,
        class_name: "高三一班",
      },
      {
        id: 2,
        name: "李四",
        phone: "13987654321",
        email: "lisi@example.com",
        student_id: "2024002",
        grade: 87,
        class_name: "高三一班",
      },
    ];

    try {
      const protectedData = await security.protectData(sampleData, {
        resource: "students",
        action: "read",
        sensitiveFields: [], // 空数组表示需要脱敏
      });

      setDataProtectionResult(protectedData);
    } catch (error) {
      setDataProtectionResult({ error: error.message });
    }
  };

  // 权限报告示例
  const handlePermissionReport = async () => {
    try {
      const report = await security.getPermissionReport();
      setPermissionReport(report);
    } catch (error) {
      setPermissionReport({ error: error.message });
    }
  };

  // 安全API调用示例
  const handleSecureApiCall = async () => {
    try {
      const result = await supabaseSecureClient.queryTable(
        "students",
        {
          select: "id, name, class_name",
          limit: 5,
        },
        {
          requireAuth: true,
          requiredRoles: ["teacher", "admin"],
          auditLog: true,
          rateLimit: {
            windowMs: 60000, // 1分钟
            maxRequests: 10,
          },
        }
      );

      console.log("安全API调用结果:", result);
    } catch (error) {
      console.error("安全API调用失败:", error);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            安全系统状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Badge
                variant={security.isAuthenticated ? "default" : "secondary"}
              >
                {security.isAuthenticated ? "已认证" : "未认证"}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">认证状态</p>
            </div>
            <div className="text-center">
              <Badge variant="outline">{security.roles.length} 个角色</Badge>
              <p className="text-sm text-muted-foreground mt-1">用户角色</p>
            </div>
            <div className="text-center">
              <Badge variant="outline">
                {security.permissions.length} 个权限
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">用户权限</p>
            </div>
            <div className="text-center">
              <Badge variant={security.loading ? "secondary" : "default"}>
                {security.loading ? "加载中" : "就绪"}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">系统状态</p>
            </div>
          </div>

          {security.isAuthenticated && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">当前用户权限:</h4>
              <div className="flex flex-wrap gap-1">
                {security.roles.map((role) => (
                  <Badge key={role} variant="secondary" className="text-xs">
                    {role}
                  </Badge>
                ))}
              </div>
              <div className="mt-2 flex gap-4 text-sm">
                <span
                  className={
                    security.isAdmin ? "text-green-600" : "text-gray-500"
                  }
                >
                  管理员: {security.isAdmin ? "是" : "否"}
                </span>
                <span
                  className={
                    security.isTeacher ? "text-blue-600" : "text-gray-500"
                  }
                >
                  教师: {security.isTeacher ? "是" : "否"}
                </span>
                <span
                  className={
                    security.isStudent ? "text-orange-600" : "text-gray-500"
                  }
                >
                  学生: {security.isStudent ? "是" : "否"}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            输入验证示例
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              文本输入验证
            </label>
            <Input
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="输入一些文本进行验证"
            />
            {validationResults.input && (
              <Alert
                className={
                  validationResults.input.isValid
                    ? "border-green-200"
                    : "border-red-200"
                }
              >
                <AlertDescription>
                  <strong>验证结果:</strong>{" "}
                  {validationResults.input.isValid ? "有效" : "无效"}
                  {!validationResults.input.isValid && (
                    <ul className="mt-1 list-disc list-inside">
                      {validationResults.input.errors.map(
                        (error: string, idx: number) => (
                          <li key={idx} className="text-red-600">
                            {error}
                          </li>
                        )
                      )}
                    </ul>
                  )}
                  {validationResults.input.sanitized && (
                    <p className="mt-1">
                      <strong>清理后:</strong>{" "}
                      {validationResults.input.sanitized}
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">邮箱验证</label>
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="输入邮箱地址"
            />
            {validationResults.email && (
              <Alert
                className={
                  validationResults.email.isValid
                    ? "border-green-200"
                    : "border-red-200"
                }
              >
                <AlertDescription>
                  <strong>邮箱验证:</strong>{" "}
                  {validationResults.email.isValid ? "有效" : "无效"}
                  {!validationResults.email.isValid && (
                    <ul className="mt-1 list-disc list-inside">
                      {validationResults.email.errors.map(
                        (error: string, idx: number) => (
                          <li key={idx} className="text-red-600">
                            {error}
                          </li>
                        )
                      )}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              密码强度验证
            </label>
            <Input
              type="password"
              value={testPassword}
              onChange={(e) => setTestPassword(e.target.value)}
              placeholder="输入密码"
            />
            {validationResults.password && (
              <Alert
                className={
                  validationResults.password.isValid
                    ? "border-green-200"
                    : "border-red-200"
                }
              >
                <AlertDescription>
                  <strong>密码强度:</strong>{" "}
                  {validationResults.password.isValid
                    ? "符合要求"
                    : "不符合要求"}
                  {!validationResults.password.isValid && (
                    <ul className="mt-1 list-disc list-inside">
                      {validationResults.password.errors.map(
                        (error: string, idx: number) => (
                          <li key={idx} className="text-red-600">
                            {error}
                          </li>
                        )
                      )}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">文件验证</label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
              onChange={(e) => setTestFile(e.target.files?.[0] || null)}
            />
            {validationResults.file && (
              <Alert
                className={
                  validationResults.file.isValid
                    ? "border-green-200"
                    : "border-red-200"
                }
              >
                <AlertDescription>
                  <strong>文件验证:</strong>{" "}
                  {validationResults.file.isValid ? "有效" : "无效"}
                  <p>类型: {validationResults.file.mimeType}</p>
                  <p>
                    大小: {(validationResults.file.size / 1024).toFixed(2)} KB
                  </p>
                  {!validationResults.file.isValid && (
                    <ul className="mt-1 list-disc list-inside">
                      {validationResults.file.errors.map(
                        (error: string, idx: number) => (
                          <li key={idx} className="text-red-600">
                            {error}
                          </li>
                        )
                      )}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Button onClick={handleInputValidation} className="w-full">
            执行验证
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            数据保护示例
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            根据用户权限自动脱敏敏感信息（手机号、邮箱、姓名等）
          </p>

          <Button
            onClick={handleDataProtection}
            disabled={!security.isAuthenticated}
          >
            测试数据保护
          </Button>

          {dataProtectionResult && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">处理结果:</h4>
              <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto">
                {JSON.stringify(dataProtectionResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            权限报告
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handlePermissionReport}
            disabled={!security.isAuthenticated}
          >
            生成权限报告
          </Button>

          {permissionReport && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">权限详情:</h4>
              <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-64">
                {JSON.stringify(permissionReport, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            安全API调用
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            演示如何使用安全API客户端进行受保护的数据访问
          </p>

          <Button
            onClick={handleSecureApiCall}
            disabled={!security.isAuthenticated}
          >
            执行安全API调用
          </Button>

          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              此调用将通过安全中间件进行权限验证、速率限制和审计记录。
              请检查浏览器控制台查看详细结果。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

export default SecurityDemo;
