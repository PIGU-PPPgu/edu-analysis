/**
 * 🎯 成绩数据校验结果显示面板
 * 
 * 功能：
 * 1. 显示校验结果和错误详情
 * 2. 提供手动修复选项
 * 3. 数据质量评分展示
 * 4. 可视化错误分布和统计
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  AlertCircle,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Settings,
  BarChart3,
  FileText,
  Zap,
  Eye,
  Filter
} from 'lucide-react';
import { toast } from "sonner";
import { ValidationReport, ValidationResult } from "@/services/gradeDataValidator";
import { ValidationSeverity } from "@/utils/dataValidationRules";

interface GradeValidationPanelProps {
  report: ValidationReport | null;
  isLoading: boolean;
  onRevalidate: () => void;
  onExportReport: () => void;
  onApplyFixes: (fixes: string[]) => void;
  className?: string;
}

const GradeValidationPanel: React.FC<GradeValidationPanelProps> = ({
  report,
  isLoading,
  onRevalidate,
  onExportReport,
  onApplyFixes,
  className
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedField, setSelectedField] = useState<string>('all');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [showFixableOnly, setShowFixableOnly] = useState(false);

  // 过滤结果
  const filteredResults = React.useMemo(() => {
    if (!report) return [];

    return report.results.filter(result => {
      const severityMatch = selectedSeverity === 'all' || result.severity === selectedSeverity;
      const fieldMatch = selectedField === 'all' || result.field === selectedField;
      const fixableMatch = !showFixableOnly || result.canAutoFix;
      
      return severityMatch && fieldMatch && fixableMatch;
    });
  }, [report, selectedSeverity, selectedField, showFixableOnly]);

  // 获取所有字段列表
  const availableFields = React.useMemo(() => {
    if (!report) return [];
    
    const fields = new Set<string>();
    report.results.forEach(result => {
      if (result.field) fields.add(result.field);
    });
    
    return Array.from(fields).sort();
  }, [report]);

  // 切换展开/折叠状态
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // 渲染严重程度图标和样式
  const renderSeverityBadge = (severity: ValidationSeverity) => {
    const config = {
      [ValidationSeverity.CRITICAL]: { 
        icon: XCircle, 
        variant: 'destructive' as const, 
        color: 'text-red-600',
        label: '严重'
      },
      [ValidationSeverity.ERROR]: { 
        icon: AlertTriangle, 
        variant: 'destructive' as const, 
        color: 'text-red-500',
        label: '错误'
      },
      [ValidationSeverity.WARNING]: { 
        icon: AlertCircle, 
        variant: 'secondary' as const, 
        color: 'text-yellow-600',
        label: '警告'
      },
      [ValidationSeverity.INFO]: { 
        icon: Info, 
        variant: 'outline' as const, 
        color: 'text-blue-600',
        label: '信息'
      },
    };

    const { icon: Icon, variant, color, label } = config[severity];
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        {label}
      </Badge>
    );
  };

  // 渲染数据质量圆环图
  const renderQualityCircle = () => {
    if (!report) return null;

    const { score, color, label } = report.dataQuality;
    const circumference = 2 * Math.PI * 45; // r=45
    const strokeDasharray = `${(score / 100) * circumference} ${circumference}`;

    return (
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* 背景圆 */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200"
          />
          {/* 进度圆 */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            className="transition-all duration-500 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{score}</span>
          <span className="text-xs text-gray-600">{label}</span>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>正在校验数据...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <FileText className="h-8 w-8 mx-auto text-gray-400" />
            <p className="text-gray-600">暂无校验报告</p>
            <Button onClick={onRevalidate} variant="outline" size="sm">
              开始校验
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* 概览卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              数据校验报告
            </span>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={onRevalidate}>
                <RefreshCw className="h-4 w-4 mr-1" />
                重新校验
              </Button>
              <Button variant="outline" size="sm" onClick={onExportReport}>
                <Download className="h-4 w-4 mr-1" />
                导出报告
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            共处理 {report.totalRecords} 条记录，耗时 {report.executionTime}ms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 数据质量评分 */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                数据质量评分
              </h4>
              <div className="flex items-center space-x-4">
                {renderQualityCircle()}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">有效记录：</span>
                    <Badge variant="outline">{report.validRecords}</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">无效记录：</span>
                    <Badge variant="secondary">{report.invalidRecords}</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">成功率：</span>
                    <Badge variant="outline">
                      {((report.validRecords / report.totalRecords) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* 错误统计 */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
                错误统计
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">严重</span>
                    <Badge variant="destructive">{report.summary.critical}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">错误</span>
                    <Badge variant="secondary">{report.summary.errors}</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">警告</span>
                    <Badge variant="outline">{report.summary.warnings}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">信息</span>
                    <Badge variant="outline">{report.summary.info}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 建议和快速修复 */}
      {report.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2" />
              修复建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.recommendations.map((recommendation, index) => (
                <Alert key={index}>
                  <Info className="h-4 w-4" />
                  <AlertDescription>{recommendation}</AlertDescription>
                </Alert>
              ))}
              
              {/* 自动修复按钮 */}
              {report.results.some(r => r.canAutoFix) && (
                <div className="pt-2 border-t">
                  <Button 
                    onClick={() => {
                      const fixableIds = report.results
                        .filter(r => r.canAutoFix && !r.fixed)
                        .map(r => r.id);
                      onApplyFixes(fixableIds);
                    }}
                    className="w-full"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    自动修复可修复的错误 ({report.results.filter(r => r.canAutoFix && !r.fixed).length})
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 详细结果 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            详细结果 ({filteredResults.length})
          </CardTitle>
          <CardDescription>
            查看和管理所有校验问题
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 筛选控件 */}
          <div className="flex flex-wrap gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-600">筛选条件：</span>
            </div>
            
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有级别</SelectItem>
                <SelectItem value="critical">严重</SelectItem>
                <SelectItem value="error">错误</SelectItem>
                <SelectItem value="warning">警告</SelectItem>
                <SelectItem value="info">信息</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedField} onValueChange={setSelectedField}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有字段</SelectItem>
                {availableFields.map(field => (
                  <SelectItem key={field} value={field}>{field}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={showFixableOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFixableOnly(!showFixableOnly)}
            >
              <Settings className="h-4 w-4 mr-1" />
              仅显示可修复
            </Button>
          </div>

          {/* 结果列表 */}
          {filteredResults.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-gray-600">没有符合条件的问题</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredResults.map((result, index) => (
                <div key={result.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        {renderSeverityBadge(result.severity)}
                        <span className="font-medium">{result.ruleName}</span>
                        {result.field && (
                          <Badge variant="outline" className="text-xs">
                            {result.field}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{result.message}</p>
                      {result.suggestion && (
                        <p className="text-xs text-gray-500">💡 {result.suggestion}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {result.canAutoFix && !result.fixed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onApplyFixes([result.id])}
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          修复
                        </Button>
                      )}
                      {result.fixed && (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          已修复
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        第 {result.recordIndex + 1} 行
                      </Badge>
                    </div>
                  </div>

                  {/* 展示问题数据 */}
                  {result.value !== null && result.value !== undefined && (
                    <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                      <span className="text-gray-600">问题数据：</span>
                      <code className="ml-1">{JSON.stringify(result.value)}</code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 字段统计（可折叠） */}
      <Collapsible 
        open={expandedSections.has('fieldStats')} 
        onOpenChange={() => toggleSection('fieldStats')}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  字段质量统计
                </span>
                {expandedSections.has('fieldStats') ? 
                  <ChevronUp className="h-5 w-5" /> : 
                  <ChevronDown className="h-5 w-5" />
                }
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(report.fieldStatistics).map(([field, stats]) => (
                  <div key={field} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{field}</span>
                      <Badge variant="outline">
                        {stats.validationRate.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <Progress 
                        value={stats.validationRate} 
                        className="h-2"
                      />
                      <div className="flex text-xs text-gray-600 justify-between">
                        <span>有效: {stats.valid}</span>
                        <span>无效: {stats.invalid}</span>
                        <span>缺失: {stats.missing}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default GradeValidationPanel;