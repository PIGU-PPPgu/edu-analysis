import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Filter, AlertTriangle, RefreshCw } from "lucide-react";
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

const WarningList = ({ onWarningSelect }: { onWarningSelect?: (warningId: string) => void }) => {
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
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? '获取中...' : '刷新数据'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索学生姓名或学号..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="班级" />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-[160px]">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <SelectValue placeholder="风险等级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有等级</SelectItem>
                <SelectItem value="high">高风险</SelectItem>
                <SelectItem value="medium">中风险</SelectItem>
                <SelectItem value="low">低风险</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                <TableHead>学生</TableHead>
                <TableHead>学号</TableHead>
                <TableHead>风险等级</TableHead>
                <TableHead>预警类型</TableHead>
                <TableHead>预警日期</TableHead>
                <TableHead>详情</TableHead>
                <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    <p>加载中...</p>
                  </TableCell>
                </TableRow>
              ) : filteredWarnings.length > 0 ? (
                filteredWarnings.map((record) => (
                  <TableRow 
                    key={record.id}
                    onClick={() => handleOpenProfileModal(record.student?.student_id || '')}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src="" />
                          <AvatarFallback>{record.student?.name?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        {record.student?.name || '未知学生'}
                      </div>
                    </TableCell>
                    <TableCell>{record.student?.student_id || '无学号'}</TableCell>
                    <TableCell>
                      <WarningBadge level={record.rule?.severity || 'medium'} />
                    </TableCell>
                    <TableCell>
                      {getWarningTypes(record).map((type, index) => (
                        <TypeBadge key={index} type={type} />
                      ))}
                    </TableCell>
                    <TableCell>{formatDate(record.created_at)}</TableCell>
                    <TableCell className="max-w-[250px] truncate" title={getWarningDetails(record)}>
                      {getWarningDetails(record)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">查看</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    没有找到符合条件的预警记录
                  </TableCell>
                </TableRow>
              )}
              </TableBody>
            </Table>
        </div>
      </CardContent>
      {/* 只有当模态框打开且有选中的学生时才渲染StudentWarningProfile组件 */}
      {isProfileModalOpen && selectedStudentUuid && (
        <StudentWarningProfile 
          studentUuid={selectedStudentUuid}
          isOpen={isProfileModalOpen}
          onOpenChange={handleCloseProfileModal}
        />
      )}
    </Card>
  );
};

export default WarningList;
