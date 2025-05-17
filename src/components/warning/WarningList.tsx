import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Filter, AlertTriangle, RefreshCw, ChevronRight, ArrowRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";

// 导入学生画像组件
import StudentWarningProfile from "./StudentWarningProfile";
import { getWarningRecords, WarningRecord, updateWarningStatus } from "@/services/warningService";

const WarningBadge = ({ level }: { level: string }) => {
  const colorMap: Record<string, string> = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-blue-100 text-blue-800 border-blue-200"
  };
  
  const textMap: Record<string, string> = {
    high: "高风险",
    medium: "中风险",
    low: "低风险"
  };
  
  return (
    <Badge variant="outline" className={`${colorMap[level]} border`}>
      {textMap[level]}
    </Badge>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  const colorMap: Record<string, string> = {
    "成绩": "bg-purple-100 text-purple-800 border-purple-200",
    "出勤": "bg-blue-100 text-blue-800 border-blue-200",
    "作业": "bg-green-100 text-green-800 border-green-200",
    "行为": "bg-orange-100 text-orange-800 border-orange-200",
    "参与度": "bg-cyan-100 text-cyan-800 border-cyan-200"
  };
  
  return (
    <Badge variant="outline" className={`${colorMap[type] || "bg-gray-100 text-gray-800 border-gray-200"} border mr-1`}>
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
  onViewAllClick
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [warningRecords, setWarningRecords] = useState<WarningRecord[]>([]);
  const [classOptions, setClassOptions] = useState<{value: string, label: string}[]>([]);
  
  // 新增状态用于学生画像模态框
  const [selectedStudentUuid, setSelectedStudentUuid] = useState<string | null>(null);
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
      const records = await getWarningRecords(true);
      
      if (isMounted.current) {
        setWarningRecords(records);
        
        // 提取班级选项
        const classes = Array.from(new Set(records
          .filter(record => record.student?.class_id)
          .map(record => record.student?.class_id as string)))
          .map(classId => ({
            value: classId,
            label: `班级 ${classId.substring(0, 5)}` // 简化班级ID显示
          }));
        
        setClassOptions([{value: 'all', label: '所有班级'}, ...classes]);
      }
    } catch (error) {
      console.error('获取预警记录失败:', error);
      if (isMounted.current) {
        toast.error('获取预警记录失败');
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
  };
  
  // 过滤逻辑
  const filteredWarnings = warningRecords.filter(record => {
    // 搜索名字
    const matchesSearch = record.student?.name?.includes(searchTerm) || 
                         record.student?.student_id?.includes(searchTerm) ||
                         false;
    
    // 过滤班级
    const matchesClass = filterClass === "all" || record.student?.class_id === filterClass;
    
    // 过滤风险等级
    const matchesLevel = filterLevel === "all" || (record.rule?.severity || 'medium') === filterLevel;
    
    return matchesSearch && matchesClass && matchesLevel;
  });

  // 应用限制条数
  const displayedWarnings = limit ? filteredWarnings.slice(0, limit) : filteredWarnings;

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
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
      return dateString.split('T')[0] || '未知日期';
    }
  };
  
  // 获取详情
  const getWarningDetails = (record: WarningRecord): string => {
    // 尝试获取详细原因
    if (record.details && record.details.reason) {
      return record.details.reason;
    }
    
    // 尝试获取因素列表
    if (record.details && Array.isArray(record.details.factors) && record.details.factors.length > 0) {
      return record.details.factors.join(', ');
    }
    
    // 使用规则描述
    if (record.rule?.description) {
      return record.rule.description;
    }
    
    return '无详细信息';
  };

  // 处理预警状态更新
  const handleStatusUpdate = async (warningId: string, newStatus: 'active' | 'resolved' | 'dismissed') => {
    try {
      await updateWarningStatus(warningId, newStatus);
      // 更新本地状态
      setWarningRecords(prevWarnings => 
        prevWarnings.map(warning => 
          warning.id === warningId ? { ...warning, status: newStatus } : warning
        )
      );
      toast.success(`预警已${newStatus === 'resolved' ? '解决' : newStatus === 'dismissed' ? '忽略' : '激活'}`);
    } catch (error) {
      console.error('更新预警状态失败:', error);
      toast.error('更新预警状态失败');
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
              <div key={i} className="rounded-md border p-3 animate-pulse bg-gray-50">
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
                        {record.student?.name ? record.student.name.substring(0, 2) : "学生"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">{record.student?.name || "未知学生"}</div>
                      <div className="text-xs text-gray-500 flex items-center mt-0.5">
                        {getWarningTypes(record).map(type => 
                          <span key={type} className="mr-1">{type}</span>
                        )}
                        <span className="mx-1">•</span>
                        <WarningBadge level={record.rule?.severity || 'medium'} />
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
            </CardTitle>
            <CardDescription>
              显示所有具有预警状态的学生，可根据班级、风险等级和姓名进行筛选
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* 筛选工具栏 */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
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
                {classOptions.map(option => (
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
                      <div 
                        className="flex items-center space-x-3 cursor-pointer" 
                        onClick={() => record.student?.student_id && handleOpenProfileModal(record.student.student_id)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gray-100 text-gray-700 text-xs">
                            {record.student?.name ? record.student.name.substring(0, 2) : "学生"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{record.student?.name || "未知学生"}</div>
                          <div className="text-xs text-gray-500">{record.student?.student_id || "-"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getWarningTypes(record).map(type => (
                          <TypeBadge key={type} type={type} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <WarningBadge level={record.rule?.severity || 'medium'} />
                    </TableCell>
                    <TableCell>
                      {formatDate(record.created_at)}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="truncate text-sm" title={getWarningDetails(record)}>
                        {getWarningDetails(record)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={record.status === 'active' ? 'destructive' : 
                                      record.status === 'resolved' ? 'default' : 'secondary'}>
                        {record.status === 'active' ? '未处理' : 
                         record.status === 'resolved' ? '已解决' : '已忽略'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {record.status === 'active' ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleStatusUpdate(record.id, 'resolved')}
                            >
                              解决
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleStatusUpdate(record.id, 'dismissed')}
                            >
                              忽略
                            </Button>
                          </>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleStatusUpdate(record.id, 'active')}
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
