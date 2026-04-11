/**
 * 预警学生追踪和管理仪表板
 * 管理预警记录、学生跟进和干预措施
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Users,
  Clock,
  CheckCircle,
  Search,
  Filter,
  Eye,
  MessageSquare,
  Calendar,
  Target,
  TrendingUp,
  FileText,
  User,
  School,
  Loader2,
  RefreshCw,
  MoreHorizontal,
  Undo2,
  Bot,
  UserPlus,
  Settings,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PriorityStudentManager from "./PriorityStudentManager";
import StudentDetailDialog from "./StudentDetailDialog";
import {
  getWarningRecords,
  getStudentWarningProfile,
  resolveWarning,
  addIntervention,
  addTrackingNote,
  batchResolveWarnings,
  batchUndoWarnings,
  undoWarningAction,
  getStudentFollowUpPriority,
  WarningRecord,
  StudentWarningProfile,
  WarningListFilter,
} from "@/services/studentWarningTrackingService";
import {
  getEnhancedPriorityStudents,
  removePriorityStudent,
  updatePriorityStudent,
  getStudentPriorityProfile,
  EnhancedPriorityStudent,
} from "@/services/priorityStudentService";
import { formatNumber } from "@/utils/formatUtils";

interface WarningTrackingDashboardProps {
  className?: string;
  filterConfig?: {
    timeRange?: string;
    classNames?: string[];
    examTitles?: string[];
    warningStatus?: string[];
    severityLevels?: string[];
  };
}

// 统计卡片组件
const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  color = "text-gray-800",
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  color?: string;
}) => (
  <Card className="bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
    <CardContent className="p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{formatNumber(value)}</p>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className="p-3 rounded-full bg-[#c0ff3f] text-black">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// 增强的优先级学生卡片
const PriorityStudentCard = ({
  student,
  onViewDetails,
  onRemove,
  onUpdate,
}: {
  student: EnhancedPriorityStudent;
  onViewDetails: (studentId: string) => void;
  onRemove?: (priorityId: string) => void;
  onUpdate?: (student: EnhancedPriorityStudent) => void;
}) => {
  const [showActions, setShowActions] = useState(false);

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // 获取优先级文本
  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "high":
        return "高优先级";
      case "medium":
        return "中优先级";
      case "low":
        return "低优先级";
      default:
        return priority;
    }
  };

  // 获取来源标注
  const getSourceBadge = (sourceType?: string) => {
    if (sourceType === "algorithm") {
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs flex items-center">
          <Bot className="h-3 w-3 mr-1" />
          算法
        </Badge>
      );
    } else if (sourceType === "manual") {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs flex items-center">
          <User className="h-3 w-3 mr-1" />
          手动
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card
      className={`bg-white border rounded-lg hover:shadow-md transition-shadow relative ${
        student.isPriorityActive
          ? "border-[#c0ff3f] bg-green-50/30"
          : "border-gray-200"
      }`}
    >
      <CardContent className="p-4">
        {/* 卡片头部 */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-medium text-gray-800">
                {student.studentName}
              </h3>
              {getSourceBadge(student.sourceType)}
            </div>
            <p className="text-sm text-gray-500">{student.className}</p>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <Badge className={getPriorityColor(student.finalPriority)}>
              {getPriorityText(student.finalPriority)}
            </Badge>
            {student.isPriorityActive && onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowActions(!showActions)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 自定义标签 */}
        {student.customTags && student.customTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {student.customTags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {student.customTags.length > 3 && (
              <Badge variant="outline" className="text-xs text-gray-500">
                +{student.customTags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* 干预目标 */}
        {student.interventionGoals && student.interventionGoals.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {student.interventionGoals.slice(0, 2).map((goal, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs bg-blue-100 text-blue-800 border-blue-200"
              >
                <Target className="h-2 w-2 mr-1" />
                {goal}
              </Badge>
            ))}
            {student.interventionGoals.length > 2 && (
              <Badge
                variant="secondary"
                className="text-xs text-gray-500 bg-gray-100"
              >
                +{student.interventionGoals.length - 2} 个目标
              </Badge>
            )}
          </div>
        )}

        {/* 统计信息 */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center text-sm text-gray-600">
            <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
            <span>{student.activeWarningsCount || 0} 个活跃预警</span>
            {student.effectiveRiskScore > 0 && (
              <span className="ml-2 text-xs text-gray-500">
                (风险评分: {student.effectiveRiskScore})
              </span>
            )}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-2 text-blue-500" />
            <span>最近预警: {student.latestWarningDate || "无预警"}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <MessageSquare className="h-4 w-4 mr-2 text-green-500" />
            <span>{student.interventionCount || 0} 次干预记录</span>
          </div>
        </div>

        {/* 原因描述 */}
        {student.reasonDescription && (
          <div className="text-xs text-gray-500 mb-3 p-2 bg-gray-50 rounded">
            {student.reasonDescription}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="space-y-2">
          {/* 主要操作按钮 */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(student.studentId)}
              className="flex-1 border-[#c0ff3f] text-[#c0ff3f] hover:bg-[#c0ff3f] hover:text-black"
            >
              <Eye className="h-4 w-4 mr-1" />
              查看详情
            </Button>
            {student.isPriorityActive && onUpdate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdate(student)}
                className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Settings className="h-4 w-4 mr-1" />
                编辑
              </Button>
            )}
          </div>

          {/* 危险操作按钮 - 只在需要时显示 */}
          {showActions &&
            student.isPriorityActive &&
            onRemove &&
            student.priorityManagementId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onRemove(student.priorityManagementId!);
                  setShowActions(false);
                }}
                className="w-full text-xs text-red-600 hover:text-red-700 border-red-300"
              >
                <X className="h-3 w-3 mr-1" />
                移除重点跟进
              </Button>
            )}
        </div>
      </CardContent>
    </Card>
  );
};

const WarningTrackingDashboard: React.FC<WarningTrackingDashboardProps> = ({
  className,
  filterConfig,
}) => {
  // 状态管理
  const [activeTab, setActiveTab] = useState("records");
  const [warningRecords, setWarningRecords] = useState<WarningRecord[]>([]);
  const [priorityStudents, setPriorityStudents] = useState<
    EnhancedPriorityStudent[]
  >([]);

  // 学生详情弹窗状态
  const [selectedStudent, setSelectedStudent] =
    useState<EnhancedPriorityStudent | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [detailDialogMode, setDetailDialogMode] = useState<"view" | "edit">(
    "view"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);

  // 过滤和搜索状态
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  // 统计数据状态
  const [stats, setStats] = useState({
    activeWarnings: 0,
    highPriorityStudents: 0,
    totalAtRiskStudents: 0,
    resolvedToday: 0,
  });

  // 加载数据
  useEffect(() => {
    loadTrackingData();
  }, []);

  // 监听筛选配置变化
  useEffect(() => {
    if (filterConfig) {
      loadTrackingData();
    }
  }, [filterConfig]);

  const loadTrackingData = async () => {
    try {
      setIsLoading(true);

      // 构建过滤条件，结合外部筛选配置
      const filter: WarningListFilter = {
        status: statusFilter !== "all" ? (statusFilter as any) : undefined,
        severity:
          severityFilter !== "all" ? (severityFilter as any) : undefined,
        searchTerm: searchTerm.trim() || undefined,
        classNames:
          filterConfig?.classNames && filterConfig.classNames.length > 0
            ? filterConfig.classNames
            : undefined,
        examTitles:
          filterConfig?.examTitles && filterConfig.examTitles.length > 0
            ? filterConfig.examTitles
            : undefined,
      };

      const priorityStudentsResult = await getEnhancedPriorityStudents(20, {
        classNames: filterConfig?.classNames,
        examTitles: filterConfig?.examTitles,
        timeRange: filterConfig?.timeRange,
      });

      // 并行加载预警记录数据（保留原有功能）
      const recordsResult = await getWarningRecords(filter, 50, 0);

      setWarningRecords(recordsResult.records);
      setPriorityStudents(priorityStudentsResult);

      // 计算统计数据 - 基于实际获取的学生数据
      const activeWarnings = recordsResult.records.filter(
        (r) => r.status === "active"
      ).length;
      const highPriorityStudents = priorityStudentsResult.filter(
        (s) => s.finalPriority === "high"
      ).length;
      const totalAtRiskStudents = priorityStudentsResult.length;
      const resolvedToday = recordsResult.records.filter(
        (r) =>
          r.status === "resolved" &&
          r.resolvedAt &&
          new Date(r.resolvedAt).toDateString() === new Date().toDateString()
      ).length;

      console.log("📈 [WarningTrackingDashboard] 统计数据:", {
        activeWarnings,
        highPriorityStudents,
        totalAtRiskStudents,
        resolvedToday,
      });

      setStats({
        activeWarnings,
        highPriorityStudents,
        totalAtRiskStudents,
        resolvedToday,
      });
    } catch (error) {
      console.error("加载追踪数据失败:", error);
      toast.error("加载数据失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 处理搜索和过滤
  useEffect(() => {
    const delayedLoad = setTimeout(() => {
      loadTrackingData();
    }, 300);

    return () => clearTimeout(delayedLoad);
  }, [searchTerm, statusFilter, severityFilter]);

  // 过滤后的预警记录
  const filteredRecords = useMemo(() => {
    return warningRecords.filter((record) => {
      const matchesSearch =
        !searchTerm ||
        record.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.details.ruleName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || record.status === statusFilter;
      const matchesSeverity =
        severityFilter === "all" || record.details.severity === severityFilter;

      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [warningRecords, searchTerm, statusFilter, severityFilter]);

  // 处理单个预警解决 - 优化用户体验
  const handleResolveWarning = async (
    warningId: string,
    action: "resolved" | "dismissed"
  ) => {
    try {
      // 乐观更新：立即更新本地状态
      setWarningRecords((prevRecords) =>
        prevRecords.map((record) =>
          record.id === warningId
            ? {
                ...record,
                status: action as const,
                resolvedAt: new Date().toISOString(),
              }
            : record
        )
      );

      // 获取当前用户ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id || "anonymous-user";

      const success = await resolveWarning(warningId, action, "", userId);
      if (success) {
        toast.success(`预警已${action === "resolved" ? "解决" : "忽略"}`);
        // 更新统计数据
        setStats((prevStats) => ({
          ...prevStats,
          activeWarnings: prevStats.activeWarnings - 1,
        }));
      } else {
        // 如果失败，回滚乐观更新
        setWarningRecords((prevRecords) =>
          prevRecords.map((record) =>
            record.id === warningId
              ? { ...record, status: "active" as const, resolvedAt: undefined }
              : record
          )
        );
      }
    } catch (error) {
      console.error("处理预警失败:", error);
      toast.error("操作失败");
      // 回滚乐观更新
      setWarningRecords((prevRecords) =>
        prevRecords.map((record) =>
          record.id === warningId
            ? { ...record, status: "active" as const, resolvedAt: undefined }
            : record
        )
      );
    }
  };

  // 批量处理预警 - 优化用户体验
  const handleBatchResolve = async (action: "resolved" | "dismissed") => {
    if (selectedRecords.length === 0) {
      toast.warning("请选择要处理的预警记录");
      return;
    }

    const selectedCount = selectedRecords.length;

    try {
      // 乐观更新：立即更新本地状态
      setWarningRecords((prevRecords) =>
        prevRecords.map((record) =>
          selectedRecords.includes(record.id)
            ? {
                ...record,
                status: action as const,
                resolvedAt: new Date().toISOString(),
              }
            : record
        )
      );

      // 获取当前用户ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id || "anonymous-user";

      const results = await batchResolveWarnings(
        selectedRecords,
        action,
        "",
        userId
      );
      const successCount = results.filter((r) => r.success).length;
      const failedCount = selectedCount - successCount;

      if (successCount > 0) {
        toast.success(
          `成功${action === "resolved" ? "解决" : "忽略"}了 ${successCount} 条预警`
        );
        // 更新统计数据
        setStats((prevStats) => ({
          ...prevStats,
          activeWarnings: prevStats.activeWarnings - successCount,
        }));
      }

      if (failedCount > 0) {
        toast.warning(`${failedCount} 条记录处理失败`);
        // 回滚失败的记录
        const failedIds = results
          .filter((r) => !r.success)
          .map((r) => r.warningId);
        setWarningRecords((prevRecords) =>
          prevRecords.map((record) =>
            failedIds.includes(record.id)
              ? { ...record, status: "active" as const, resolvedAt: undefined }
              : record
          )
        );
      }

      // 清除选择但不刷新整个列表
      setSelectedRecords([]);
    } catch (error) {
      console.error("批量处理失败:", error);
      toast.error("批量操作失败");

      // 完全回滚乐观更新
      setWarningRecords((prevRecords) =>
        prevRecords.map((record) =>
          selectedRecords.includes(record.id)
            ? { ...record, status: "active" as const, resolvedAt: undefined }
            : record
        )
      );
    }
  };

  // 单个预警撤销 - 优化用户体验
  const handleUndoWarning = async (warningId: string) => {
    try {
      // 乐观更新：立即更新本地状态
      setWarningRecords((prevRecords) =>
        prevRecords.map((record) =>
          record.id === warningId
            ? { ...record, status: "active" as const, resolvedAt: undefined }
            : record
        )
      );

      // 获取当前用户ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id || "anonymous-user";

      const success = await undoWarningAction(warningId, userId);
      if (success) {
        toast.success("预警已重新激活");
        // 不需要重新加载整个列表，只更新统计数据
        setStats((prevStats) => ({
          ...prevStats,
          activeWarnings: prevStats.activeWarnings + 1,
        }));
      } else {
        // 如果失败，回滚乐观更新
        setWarningRecords((prevRecords) =>
          prevRecords.map((record) =>
            record.id === warningId
              ? {
                  ...record,
                  status: "resolved" as const,
                  resolvedAt: new Date().toISOString(),
                }
              : record
          )
        );
      }
    } catch (error) {
      console.error("撤销预警失败:", error);
      toast.error("撤销失败");
      // 回滚乐观更新
      setWarningRecords((prevRecords) =>
        prevRecords.map((record) =>
          record.id === warningId
            ? {
                ...record,
                status: "resolved" as const,
                resolvedAt: new Date().toISOString(),
              }
            : record
        )
      );
    }
  };

  // 批量撤销预警 - 优化用户体验
  const handleBatchUndo = async () => {
    if (selectedRecords.length === 0) {
      toast.warning("请选择要撤销的预警记录");
      return;
    }

    const selectedCount = selectedRecords.length;

    try {
      // 乐观更新：立即更新本地状态
      setWarningRecords((prevRecords) =>
        prevRecords.map((record) =>
          selectedRecords.includes(record.id)
            ? { ...record, status: "active" as const, resolvedAt: undefined }
            : record
        )
      );

      // 获取当前用户ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id || "anonymous-user";

      const results = await batchUndoWarnings(selectedRecords, userId);
      const successCount = results.filter((r) => r.success).length;
      const failedCount = selectedCount - successCount;

      if (successCount > 0) {
        toast.success(`成功撤销了 ${successCount} 条预警操作`);
        // 更新统计数据
        setStats((prevStats) => ({
          ...prevStats,
          activeWarnings: prevStats.activeWarnings + successCount,
        }));
      }

      if (failedCount > 0) {
        toast.warning(`${failedCount} 条记录撤销失败`);
        // 回滚失败的记录
        const failedIds = results
          .filter((r) => !r.success)
          .map((r) => r.warningId);
        setWarningRecords((prevRecords) =>
          prevRecords.map((record) =>
            failedIds.includes(record.id)
              ? {
                  ...record,
                  status: "resolved" as const,
                  resolvedAt: new Date().toISOString(),
                }
              : record
          )
        );
      }

      // 清除选择但不刷新整个列表
      setSelectedRecords([]);
    } catch (error) {
      console.error("批量撤销失败:", error);
      toast.error("批量撤销失败");

      // 完全回滚乐观更新
      setWarningRecords((prevRecords) =>
        prevRecords.map((record) =>
          selectedRecords.includes(record.id)
            ? {
                ...record,
                status: "resolved" as const,
                resolvedAt: new Date().toISOString(),
              }
            : record
        )
      );
    }
  };

  // 查看学生详情
  const handleViewStudentDetails = (studentId: string) => {
    console.log("👁️ [WarningTrackingDashboard] 查看学生详情:", studentId);
    const student = priorityStudents.find((s) => s.studentId === studentId);
    console.log("🔍 [WarningTrackingDashboard] 找到的学生数据:", student);
    console.log("  - interventionGoals:", student?.interventionGoals);
    if (student) {
      setSelectedStudent(student);
      setDetailDialogMode("view");
      setIsDetailDialogOpen(true);
    } else {
      toast.error("未找到学生信息");
    }
  };

  // 移除重点跟进学生
  const handleRemovePriorityStudent = async (priorityId: string) => {
    try {
      const success = await removePriorityStudent(priorityId);
      if (success) {
        // 乐观更新：立即从本地状态中移除
        setPriorityStudents((prev) =>
          prev.filter((s) => s.priorityManagementId !== priorityId)
        );
        // 更新统计数据
        setStats((prevStats) => ({
          ...prevStats,
          totalAtRiskStudents: Math.max(0, prevStats.totalAtRiskStudents - 1),
        }));
      }
    } catch (error) {
      console.error("移除重点跟进学生失败:", error);
      toast.error("移除失败");
    }
  };

  // 更新重点跟进学生
  const handleUpdatePriorityStudent = (student: EnhancedPriorityStudent) => {
    setSelectedStudent(student);
    setDetailDialogMode("edit");
    setIsDetailDialogOpen(true);
  };

  // 关闭详情弹窗
  const handleCloseDetailDialog = () => {
    setIsDetailDialogOpen(false);
    setSelectedStudent(null);
  };

  // 详情弹窗更新后回调
  const handleDetailDialogUpdate = () => {
    loadTrackingData(); // 重新加载数据以获取最新信息
  };

  // 重新加载重点跟进学生数据
  const handlePriorityStudentAdded = () => {
    loadTrackingData();
  };

  // 切换选择
  const toggleSelectRecord = (recordId: string) => {
    setSelectedRecords((prev) =>
      prev.includes(recordId)
        ? prev.filter((id) => id !== recordId)
        : [...prev, recordId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedRecords.length === filteredRecords.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredRecords.map((record) => record.id));
    }
  };

  // 获取状态显示文本
  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "活跃";
      case "resolved":
        return "已解决";
      case "dismissed":
        return "已忽略";
      default:
        return status;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-red-100 text-red-800 border-red-200";
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200";
      case "dismissed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // 获取严重程度文本
  const getSeverityText = (severity: string) => {
    switch (severity) {
      case "high":
        return "高风险";
      case "medium":
        return "中风险";
      case "low":
        return "低风险";
      default:
        return "未知";
    }
  };

  // 获取严重程度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // 🆕 获取预警触发条件详情
  const getWarningTriggerDetails = (details: any): string => {
    try {
      // 成绩下降预警
      if (
        details.drop &&
        details.subject &&
        details.current_exam &&
        details.previous_exam
      ) {
        return `${details.subject}: ${details.previous_exam.score}分 → ${details.current_exam.score}分 (下降${details.drop}分)`;
      }

      // 连续不及格预警
      if (details.subject && details.exams && Array.isArray(details.exams)) {
        const scores = details.exams
          .map((exam) => `${exam.score}分`)
          .join(", ");
        return `${details.subject}: ${scores} (连续不及格)`;
      }

      // 综合成绩预警
      if (details.failed_subjects && Array.isArray(details.failed_subjects)) {
        const subjects = details.failed_subjects
          .map((s) => `${s.subject}(${s.score}分)`)
          .join(", ");
        return `不及格科目: ${subjects}`;
      }

      // 出勤率预警
      if (
        details.attendance_rate !== undefined &&
        details.present_days &&
        details.total_days
      ) {
        return `出勤率: ${(details.attendance_rate * 100).toFixed(1)}% (${details.present_days}/${details.total_days}天)`;
      }

      // 基于风险因素的预警（可能来自ML算法）
      if (details.riskFactors && Array.isArray(details.riskFactors)) {
        return `风险因素: ${details.riskFactors.join(", ")}`;
      }

      // 如果有风险评分
      if (details.riskScore) {
        return `风险评分: ${details.riskScore}`;
      }

      return "详细信息不可用";
    } catch (error) {
      console.warn("解析预警触发条件失败:", error);
      return "数据格式异常";
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#c0ff3f] mr-3" />
          <span className="text-gray-600">加载预警追踪数据...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="活跃预警"
          value={stats.activeWarnings}
          icon={AlertTriangle}
          description="需要处理的预警"
          color="text-red-600"
        />
        <StatCard
          title="高优先级学生"
          value={stats.highPriorityStudents}
          icon={Users}
          description="需要重点关注"
          color="text-orange-600"
        />
        <StatCard
          title="风险学生总数"
          value={stats.totalAtRiskStudents}
          icon={Target}
          description="正在追踪的学生"
          color="text-blue-600"
        />
        <StatCard
          title="今日已处理"
          value={stats.resolvedToday}
          icon={CheckCircle}
          description="今天解决的预警"
          color="text-green-600"
        />
      </div>

      {/* 主要内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 grid grid-cols-2 w-[400px] bg-gray-100 border border-gray-300 p-1 rounded-lg">
          <TabsTrigger
            value="records"
            className="data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black data-[state=inactive]:text-gray-700 rounded-md py-2"
          >
            <FileText className="h-4 w-4 mr-2" />
            预警记录
          </TabsTrigger>
          <TabsTrigger
            value="priority"
            className="data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black data-[state=inactive]:text-gray-700 rounded-md py-2"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            重点跟进
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-6">
          <Card className="bg-white border border-gray-200 rounded-xl">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center text-lg font-semibold text-gray-800">
                    <FileText className="h-5 w-5 mr-2 text-[#c0ff3f]" />
                    预警记录管理
                  </CardTitle>
                  <CardDescription className="text-gray-500 mt-1">
                    查看、处理和跟踪所有学生预警记录
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedRecords.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        已选择 {selectedRecords.length} 条
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleBatchResolve("resolved")}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        批量解决
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBatchResolve("dismissed")}
                        className="border-gray-300"
                      >
                        批量忽略
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBatchUndo}
                        className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      >
                        <Undo2 className="h-4 w-4 mr-1" />
                        批量撤销
                      </Button>
                    </div>
                  )}
                  <Button
                    size="sm"
                    onClick={loadTrackingData}
                    variant="outline"
                    className="border-[#c0ff3f] text-[#c0ff3f] hover:bg-[#c0ff3f] hover:text-black"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    刷新
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* 搜索和过滤 */}
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="搜索学生姓名、班级或预警类型..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="active">活跃</SelectItem>
                    <SelectItem value="resolved">已解决</SelectItem>
                    <SelectItem value="dismissed">已忽略</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={severityFilter}
                  onValueChange={setSeverityFilter}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="风险级别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部级别</SelectItem>
                    <SelectItem value="high">高风险</SelectItem>
                    <SelectItem value="medium">中风险</SelectItem>
                    <SelectItem value="low">低风险</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 预警记录表格 */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedRecords.length === filteredRecords.length &&
                            filteredRecords.length > 0
                          }
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>学生信息</TableHead>
                      <TableHead>预警类型</TableHead>
                      <TableHead>风险级别</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-gray-500"
                        >
                          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>暂无预警记录</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.map((record) => (
                        <TableRow key={record.id} className="hover:bg-gray-50">
                          <TableCell>
                            <Checkbox
                              checked={selectedRecords.includes(record.id)}
                              onCheckedChange={() =>
                                toggleSelectRecord(record.id)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-800">
                                {record.studentName}
                              </div>
                              <div className="text-sm text-gray-500">
                                <School className="h-3 w-3 inline mr-1" />
                                {record.className}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">
                                  {record.details.ruleName || "系统预警"}
                                </span>
                                {/* 🆕 预警类型标识 */}
                                {record.details.generatedBy === "ML" ? (
                                  <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                                    <Bot className="h-3 w-3 mr-1" />
                                    AI算法
                                  </Badge>
                                ) : (
                                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                    <Settings className="h-3 w-3 mr-1" />
                                    系统规则
                                  </Badge>
                                )}
                              </div>
                              {/* 🆕 详细触发信息 */}
                              {record.details.ruleDescription && (
                                <div className="text-xs text-gray-500">
                                  {record.details.ruleDescription}
                                </div>
                              )}
                              {/* 🆕 触发条件详情 */}
                              {record.details.generatedBy !== "ML" && (
                                <div className="text-xs text-gray-400">
                                  {getWarningTriggerDetails(record.details)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getSeverityColor(
                                record.details.severity
                              )}
                            >
                              {getSeverityText(record.details.severity)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(record.status)}>
                              {getStatusText(record.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            <div>
                              {new Date(record.createdAt).toLocaleDateString(
                                "zh-CN"
                              )}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(record.createdAt).toLocaleTimeString(
                                "zh-CN"
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleViewStudentDetails(record.studentId)
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {record.status === "active" ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleResolveWarning(
                                        record.id,
                                        "resolved"
                                      )
                                    }
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    解决
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleResolveWarning(
                                        record.id,
                                        "dismissed"
                                      )
                                    }
                                  >
                                    忽略
                                  </Button>
                                </>
                              ) : (
                                (record.status === "resolved" ||
                                  record.status === "dismissed") && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUndoWarning(record.id)}
                                    className="border-orange-300 text-orange-700 hover:bg-orange-50"
                                  >
                                    <Undo2 className="h-3 w-3 mr-1" />
                                    撤销
                                  </Button>
                                )
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="priority" className="space-y-6">
          <Card className="bg-white border border-gray-200 rounded-xl">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center text-lg font-semibold text-gray-800">
                    <TrendingUp className="h-5 w-5 mr-2 text-[#c0ff3f]" />
                    重点跟进学生
                  </CardTitle>
                  <CardDescription className="text-gray-500 mt-1">
                    混合管理模式：手动添加 + 算法推荐
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <PriorityStudentManager
                    onStudentAdded={handlePriorityStudentAdded}
                    trigger={
                      <Button
                        size="sm"
                        className="bg-[#c0ff3f] hover:bg-[#a8e635] text-black"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        手动添加
                      </Button>
                    }
                  />
                  <Button
                    size="sm"
                    onClick={loadTrackingData}
                    variant="outline"
                    className="border-[#c0ff3f] text-[#c0ff3f] hover:bg-[#c0ff3f] hover:text-black"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    刷新
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {priorityStudents.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>当前没有需要重点跟进的学生</p>
                  </div>
                ) : (
                  priorityStudents.map((student, index) => (
                    <PriorityStudentCard
                      key={student.studentId}
                      student={student}
                      onViewDetails={handleViewStudentDetails}
                      onRemove={
                        student.isPriorityActive
                          ? handleRemovePriorityStudent
                          : undefined
                      }
                      onUpdate={
                        student.isPriorityActive
                          ? handleUpdatePriorityStudent
                          : undefined
                      }
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 学生详情弹窗 */}
      <StudentDetailDialog
        student={selectedStudent}
        isOpen={isDetailDialogOpen}
        onClose={handleCloseDetailDialog}
        onUpdate={handleDetailDialogUpdate}
        mode={detailDialogMode}
      />
    </div>
  );
};

export default WarningTrackingDashboard;
