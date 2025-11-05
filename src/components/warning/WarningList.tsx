import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  ArrowRight,
  ExternalLink,
  ArrowUpDown,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  History,
} from "lucide-react";
import { toast } from "sonner";

// 导入学生画像组件
import StudentWarningProfile from "./StudentWarningProfile";
import {
  getWarningRecords,
  WarningRecord,
  updateWarningStatus,
} from "@/services/warningService";

// 新增：排序选项类型
type SortOption = "created_at" | "severity" | "student_name" | "status";
type SortDirection = "asc" | "desc";

// 新增：批量操作状态
interface BatchOperationState {
  selectedIds: Set<string>;
  isSelectAll: boolean;
  showBatchModal: boolean;
  batchAction: "resolve" | "dismiss" | "reactivate" | null;
}

const WarningBadge = ({ level }: { level: string }) => {
  const colorMap: Record<string, string> = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-blue-100 text-blue-800 border-blue-200",
  };

  const textMap: Record<string, string> = {
    high: "高风险",
    medium: "中风险",
    low: "低风险",
  };

  return (
    <Badge variant="outline" className={`${colorMap[level]} border`}>
      {textMap[level]}
    </Badge>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  const colorMap: Record<string, string> = {
    成绩: "bg-purple-100 text-purple-800 border-purple-200",
    出勤: "bg-blue-100 text-blue-800 border-blue-200",
    作业: "bg-green-100 text-green-800 border-green-200",
    行为: "bg-orange-100 text-orange-800 border-orange-200",
    参与度: "bg-cyan-100 text-cyan-800 border-cyan-200",
  };

  return (
    <Badge
      variant="outline"
      className={`${colorMap[type] || "bg-gray-100 text-gray-800 border-gray-200"} border mr-1`}
    >
      {type}
    </Badge>
  );
};

interface WarningListProps {
  onWarningSelect?: (warningId: string) => void;
  simplified?: boolean; // 是否为简化模式
  limit?: number; // 显示条数限制
  showViewAllButton?: boolean; // 是否显示"查看全部"按钮
  onViewAllClick?: () => void; // "查看全部"按钮点击回调
}

const WarningList: React.FC<WarningListProps> = ({
  onWarningSelect,
  simplified = false,
  limit,
  showViewAllButton = false,
  onViewAllClick,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // 新增：状态筛选
  const [filterDateRange, setFilterDateRange] = useState("all"); // 新增：时间范围筛选
  const [sortBy, setSortBy] = useState<SortOption>("created_at"); // 新增：排序字段
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc"); // 新增：排序方向
  const [isLoading, setIsLoading] = useState(false);
  const [warningRecords, setWarningRecords] = useState<WarningRecord[]>([]);
  const [classOptions, setClassOptions] = useState<
    { value: string; label: string }[]
  >([]);

  // 新增：批量操作状态
  const [batchState, setBatchState] = useState<BatchOperationState>({
    selectedIds: new Set(),
    isSelectAll: false,
    showBatchModal: false,
    batchAction: null,
  });

  // 新增状态用于学生画像模态框
  const [selectedStudentUuid, setSelectedStudentUuid] = useState<string | null>(
    null
  );
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // 添加isMounted引用以防止内存泄漏
  const isMounted = useRef(true);

  // 添加防抖计时器引用，防止快速点击导致多次打开/关闭画像
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 组件卸载时清理
  useEffect(() => {
    fetchWarningRecords();

    return () => {
      isMounted.current = false;

      // 清理任何可能的防抖计时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // 获取预警记录
  const fetchWarningRecords = async () => {
    if (!isMounted.current) return;

    try {
      setIsLoading(true);
      console.log("🎯 WarningList - 开始获取预警记录...");

      // 调用获取预警记录的服务，不传递任何筛选条件来获取所有数据
      const records = await getWarningRecords();
      console.log(
        "📋 WarningList - 获取到预警记录:",
        records?.length || 0,
        "条"
      );

      if (isMounted.current) {
        setWarningRecords(records);

        // 提取班级选项 - 修复字段名问题
        const classes = Array.from(
          new Set(
            records
              .filter((record) => record.students?.class_name)
              .map((record) => record.students?.class_name as string)
          )
        ).map((className) => ({
          value: className,
          label: className,
        }));

        setClassOptions([{ value: "all", label: "所有班级" }, ...classes]);
        console.log("🏫 WarningList - 提取到班级选项:", classes.length, "个");
      }
    } catch (error) {
      console.error("❌ WarningList - 获取预警记录失败:", error);
      if (isMounted.current) {
        toast.error("获取预警记录失败");
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const handleOpenProfileModal = (studentUuid: string) => {
    // 防止重复点击
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (isMounted.current) {
        setSelectedStudentUuid(studentUuid);
        setIsProfileModalOpen(true);
      }
    }, 300);
  };

  const handleCloseProfileModal = () => {
    // 防止重复关闭
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (isMounted.current) {
        setIsProfileModalOpen(false);

        // 延迟清理studentUuid，确保模态框完全关闭后再清理
        setTimeout(() => {
          if (isMounted.current) {
            setSelectedStudentUuid(null);
          }
        }, 300);
      }
    }, 100);
  };

  // 处理刷新
  const handleRefresh = () => {
    fetchWarningRecords();
    // 清空批量选择
    setBatchState((prev) => ({
      ...prev,
      selectedIds: new Set(),
      isSelectAll: false,
    }));
  };

  // 新增：处理排序
  const handleSort = (field: SortOption) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDirection("desc");
    }
  };

  // 新增：获取排序后的数据
  const getSortedData = (data: WarningRecord[]) => {
    return [...data].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "created_at":
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case "severity":
          const severityOrder = { high: 3, medium: 2, low: 1 };
          aValue =
            severityOrder[
              a.warning_rules?.severity as keyof typeof severityOrder
            ] || 0;
          bValue =
            severityOrder[
              b.warning_rules?.severity as keyof typeof severityOrder
            ] || 0;
          break;
        case "student_name":
          aValue = a.students?.name || "";
          bValue = b.students?.name || "";
          break;
        case "status":
          const statusOrder = { active: 3, resolved: 2, dismissed: 1 };
          aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
          bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
          break;
        default:
          return 0;
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  // 新增：时间范围过滤
  const filterByDateRange = (record: WarningRecord) => {
    if (filterDateRange === "all") return true;

    const recordDate = new Date(record.created_at);
    const now = new Date();

    switch (filterDateRange) {
      case "today":
        return recordDate.toDateString() === now.toDateString();
      case "week":
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return recordDate >= weekAgo;
      case "month":
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return recordDate >= monthAgo;
      default:
        return true;
    }
  };

  // 过滤逻辑
  const filteredWarnings = getSortedData(
    warningRecords.filter((record) => {
      // 搜索名字 - 修复字段名问题
      const matchesSearch =
        record.students?.name?.includes(searchTerm) ||
        record.students?.student_id?.includes(searchTerm) ||
        false;

      // 过滤班级 - 修复字段名问题
      const matchesClass =
        filterClass === "all" || record.students?.class_name === filterClass;

      // 过滤风险等级 - 修复字段名问题
      const matchesLevel =
        filterLevel === "all" ||
        (record.warning_rules?.severity || "medium") === filterLevel;

      // 新增：过滤状态
      const matchesStatus =
        filterStatus === "all" || record.status === filterStatus;

      // 新增：过滤时间范围
      const matchesDateRange = filterByDateRange(record);

      return (
        matchesSearch &&
        matchesClass &&
        matchesLevel &&
        matchesStatus &&
        matchesDateRange
      );
    })
  );

  // 应用限制条数
  const displayedWarnings = limit
    ? filteredWarnings.slice(0, limit)
    : filteredWarnings;

  // 新增：批量选择处理
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(displayedWarnings.map((record) => record.id));
      setBatchState((prev) => ({
        ...prev,
        selectedIds: allIds,
        isSelectAll: true,
      }));
    } else {
      setBatchState((prev) => ({
        ...prev,
        selectedIds: new Set(),
        isSelectAll: false,
      }));
    }
  };

  const handleSelectRecord = (recordId: string, checked: boolean) => {
    setBatchState((prev) => {
      const newSelectedIds = new Set(prev.selectedIds);
      if (checked) {
        newSelectedIds.add(recordId);
      } else {
        newSelectedIds.delete(recordId);
      }

      return {
        ...prev,
        selectedIds: newSelectedIds,
        isSelectAll: newSelectedIds.size === displayedWarnings.length,
      };
    });
  };

  // 新增：批量操作处理
  const handleBatchAction = (action: "resolve" | "dismiss" | "reactivate") => {
    setBatchState((prev) => ({
      ...prev,
      batchAction: action,
      showBatchModal: true,
    }));
  };

  const executeBatchAction = async () => {
    if (!batchState.batchAction) return;

    try {
      const promises = Array.from(batchState.selectedIds).map((id) =>
        updateWarningStatus(id, batchState.batchAction!)
      );

      await Promise.all(promises);

      // 更新本地状态
      setWarningRecords((prev) =>
        prev.map((record) =>
          batchState.selectedIds.has(record.id)
            ? { ...record, status: batchState.batchAction! }
            : record
        )
      );

      const actionText =
        batchState.batchAction === "resolve"
          ? "解决"
          : batchState.batchAction === "dismiss"
            ? "忽略"
            : "重新激活";
      toast.success(
        `批量${actionText}操作完成，共处理 ${batchState.selectedIds.size} 条预警`
      );

      // 清空选择
      setBatchState({
        selectedIds: new Set(),
        isSelectAll: false,
        showBatchModal: false,
        batchAction: null,
      });
    } catch (error) {
      console.error("批量操作失败:", error);
      toast.error("批量操作失败");
    }
  };

  // 格式化警告类型
  const getWarningTypes = (record: WarningRecord): string[] => {
    // 尝试从details中获取类型
    if (record.details && record.details.type) {
      return [record.details.type];
    }

    // 尝试从details中获取类型数组
    if (record.details && Array.isArray(record.details.types)) {
      return record.details.types;
    }

    // 回退到固定类型或空数组
    return ["未分类"];
  };

  // 格式化日期
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch (e) {
      return dateString.split("T")[0] || "未知日期";
    }
  };

  // 获取详情
  const getWarningDetails = (record: WarningRecord): string => {
    // 尝试获取详细原因
    if (record.details && record.details.reason) {
      return record.details.reason;
    }

    // 尝试获取因素列表
    if (
      record.details &&
      Array.isArray(record.details.factors) &&
      record.details.factors.length > 0
    ) {
      return record.details.factors.join(", ");
    }

    // 使用规则描述
    if (record.warning_rules?.description) {
      return record.warning_rules.description;
    }

    return "无详细信息";
  };

  // 处理预警状态更新
  const handleStatusUpdate = async (
    warningId: string,
    newStatus: "active" | "resolved" | "dismissed"
  ) => {
    try {
      await updateWarningStatus(warningId, newStatus);
      // 更新本地状态
      setWarningRecords((prevWarnings) =>
        prevWarnings.map((warning) =>
          warning.id === warningId ? { ...warning, status: newStatus } : warning
        )
      );
      toast.success(
        `预警已${newStatus === "resolved" ? "解决" : newStatus === "dismissed" ? "忽略" : "激活"}`
      );
    } catch (error) {
      console.error("更新预警状态失败:", error);
      toast.error("更新预警状态失败");
    }
  };

  // 简化版的列表界面，适用于AI分析页面
  if (simplified) {
    return (
      <div className="space-y-3">
        {displayedWarnings.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>暂无预警记录</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="rounded-md border p-3 animate-pulse bg-gray-50"
              >
                <div className="w-1/3 h-4 bg-gray-200 rounded mb-2"></div>
                <div className="w-2/3 h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {displayedWarnings.map((record) => (
                <div
                  key={record.id}
                  className="flex justify-between items-center p-3 rounded-md border hover:bg-gray-50 cursor-pointer"
                  onClick={() => onWarningSelect && onWarningSelect(record.id)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gray-100 text-gray-700 text-xs">
                        {record.students?.name
                          ? record.students.name.substring(0, 2)
                          : "学生"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">
                        {record.students?.name || "未知学生"}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center mt-0.5">
                        {getWarningTypes(record).map((type) => (
                          <span key={type} className="mr-1">
                            {type}
                          </span>
                        ))}
                        <span className="mx-1">•</span>
                        <WarningBadge
                          level={record.warning_rules?.severity || "medium"}
                        />
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              ))}
            </div>

            {showViewAllButton && (
              <Button
                variant="outline"
                onClick={onViewAllClick}
                className="w-full mt-2 text-sm h-9"
              >
                查看全部预警
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-semibold flex items-center">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
              学生预警列表
              {batchState.selectedIds.size > 0 && (
                <Badge variant="secondary" className="ml-2">
                  已选择 {batchState.selectedIds.size} 项
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              显示所有具有预警状态的学生，可根据多种条件进行筛选和排序
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {/* 批量操作按钮 */}
            {batchState.selectedIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBatchAction("resolve")}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  批量解决
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBatchAction("dismiss")}
                  className="text-gray-600 border-gray-200 hover:bg-gray-50"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  批量忽略
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              刷新
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 增强的筛选工具栏 */}
        <div className="space-y-3 mb-4">
          {/* 第一行：搜索和基础筛选 */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索学生姓名或学号..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-[140px]">
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="班级" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {classOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="w-[120px]">
                  <div className="flex items-center">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="风险级别" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有风险</SelectItem>
                  <SelectItem value="high">高风险</SelectItem>
                  <SelectItem value="medium">中风险</SelectItem>
                  <SelectItem value="low">低风险</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 第二行：状态筛选、时间筛选和排序 */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有状态</SelectItem>
                <SelectItem value="active">未处理</SelectItem>
                <SelectItem value="resolved">已解决</SelectItem>
                <SelectItem value="dismissed">已忽略</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterDateRange} onValueChange={setFilterDateRange}>
              <SelectTrigger className="w-[120px]">
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="时间范围" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有时间</SelectItem>
                <SelectItem value="today">今天</SelectItem>
                <SelectItem value="week">最近一周</SelectItem>
                <SelectItem value="month">最近一月</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={`${sortBy}-${sortDirection}`}
              onValueChange={(value) => {
                const [field, direction] = value.split("-") as [
                  SortOption,
                  SortDirection,
                ];
                setSortBy(field);
                setSortDirection(direction);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <div className="flex items-center">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="排序" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">时间↓</SelectItem>
                <SelectItem value="created_at-asc">时间↑</SelectItem>
                <SelectItem value="severity-desc">风险↓</SelectItem>
                <SelectItem value="severity-asc">风险↑</SelectItem>
                <SelectItem value="student_name-asc">姓名A-Z</SelectItem>
                <SelectItem value="student_name-desc">姓名Z-A</SelectItem>
                <SelectItem value="status-desc">状态↓</SelectItem>
                <SelectItem value="status-asc">状态↑</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 表格内容 */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-4"></div>
            <p>加载预警数据中...</p>
          </div>
        ) : displayedWarnings.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <AlertTriangle className="h-10 w-10 text-amber-300 mx-auto mb-4" />
            <p>暂无符合条件的预警记录</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={batchState.isSelectAll}
                      onCheckedChange={handleSelectAll}
                      aria-label="选择全部"
                    />
                  </TableHead>
                  <TableHead>学生</TableHead>
                  <TableHead>预警类型</TableHead>
                  <TableHead>风险级别</TableHead>
                  <TableHead>预警时间</TableHead>
                  <TableHead>详情</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedWarnings.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Checkbox
                        checked={batchState.selectedIds.has(record.id)}
                        onCheckedChange={(checked) =>
                          handleSelectRecord(record.id, checked as boolean)
                        }
                        aria-label={`选择 ${record.students?.name || "学生"}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center space-x-3 cursor-pointer"
                        onClick={() =>
                          record.students?.student_id &&
                          handleOpenProfileModal(record.students.student_id)
                        }
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gray-100 text-gray-700 text-xs">
                            {record.students?.name
                              ? record.students.name.substring(0, 2)
                              : "学生"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {record.students?.name || "未知学生"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {record.students?.student_id || "-"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getWarningTypes(record).map((type) => (
                          <TypeBadge key={type} type={type} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <WarningBadge
                        level={record.warning_rules?.severity || "medium"}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Clock className="h-3 w-3 mr-1 text-gray-400" />
                        {formatDate(record.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p
                        className="truncate text-sm"
                        title={getWarningDetails(record)}
                      >
                        {getWarningDetails(record)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.status === "active"
                            ? "destructive"
                            : record.status === "resolved"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {record.status === "active"
                          ? "未处理"
                          : record.status === "resolved"
                            ? "已解决"
                            : "已忽略"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        {record.status === "active" ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleStatusUpdate(record.id, "resolved")
                              }
                            >
                              解决
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleStatusUpdate(record.id, "dismissed")
                              }
                            >
                              忽略
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleStatusUpdate(record.id, "active")
                            }
                          >
                            重新激活
                          </Button>
                        )}
                        {onWarningSelect && (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-[#c0ff3f] text-black hover:bg-[#a5e034]"
                            onClick={() => onWarningSelect(record.id)}
                          >
                            查看
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 查看全部按钮 */}
        {limit && filteredWarnings.length > limit && showViewAllButton && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={onViewAllClick}>
              查看全部 ({filteredWarnings.length}) 条预警
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>

      {/* 批量操作确认对话框 */}
      <Dialog
        open={batchState.showBatchModal}
        onOpenChange={(open) =>
          setBatchState((prev) => ({ ...prev, showBatchModal: open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认批量操作</DialogTitle>
            <DialogDescription>
              您即将对 {batchState.selectedIds.size} 条预警记录执行
              {batchState.batchAction === "resolve"
                ? "解决"
                : batchState.batchAction === "dismiss"
                  ? "忽略"
                  : "重新激活"}
              操作，此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setBatchState((prev) => ({
                  ...prev,
                  showBatchModal: false,
                  batchAction: null,
                }))
              }
            >
              取消
            </Button>
            <Button onClick={executeBatchAction}>确认操作</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 学生画像模态框 */}
      {selectedStudentUuid && (
        <StudentWarningProfile
          studentId={selectedStudentUuid}
          isOpen={isProfileModalOpen}
          onClose={handleCloseProfileModal}
        />
      )}
    </Card>
  );
};

export default WarningList;
