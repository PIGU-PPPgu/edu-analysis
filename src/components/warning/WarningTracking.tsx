import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Calendar,
  Target,
  User,
  Phone,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { formatNumber } from "@/utils/formatUtils";

// 跟踪记录接口
interface TrackingRecord {
  id: string;
  warningId: string;
  studentName: string;
  className: string;
  action: string;
  actionDate: string;
  followupDate?: string;
  notes: string;
  status: "pending" | "in_progress" | "completed" | "follow_up_needed";
  effectiveness: "unknown" | "low" | "medium" | "high";
  actionType:
    | "contact_parent"
    | "student_meeting"
    | "tutoring"
    | "counseling"
    | "other";
}

// 预警跟踪组件
const WarningTracking: React.FC<{ warningId?: string }> = ({ warningId }) => {
  const [trackingRecords, setTrackingRecords] = useState<TrackingRecord[]>([]);
  const [selectedWarning, setSelectedWarning] = useState<string>(
    warningId || ""
  );
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [newRecord, setNewRecord] = useState({
    action: "",
    actionType: "student_meeting" as const,
    followupDate: "",
    notes: "",
  });

  // 模拟数据
  useEffect(() => {
    const mockData: TrackingRecord[] = [
      {
        id: "1",
        warningId: "w1",
        studentName: "张小明",
        className: "高二(1)班",
        action: "与学生进行一对一谈话，了解学习困难",
        actionDate: "2024-01-15",
        followupDate: "2024-01-22",
        notes:
          "学生反馈数学基础较薄弱，特别是函数部分理解困难。已安排课后辅导。",
        status: "in_progress",
        effectiveness: "medium",
        actionType: "student_meeting",
      },
      {
        id: "2",
        warningId: "w1",
        studentName: "张小明",
        className: "高二(1)班",
        action: "联系家长说明情况，建议家校配合",
        actionDate: "2024-01-16",
        notes: "家长表示配合，会在家监督孩子完成作业和复习。",
        status: "completed",
        effectiveness: "high",
        actionType: "contact_parent",
      },
      {
        id: "3",
        warningId: "w2",
        studentName: "李小华",
        className: "高二(2)班",
        action: "安排数学课后辅导",
        actionDate: "2024-01-14",
        followupDate: "2024-01-21",
        notes: "辅导老师反馈学生学习态度有改善，但还需要持续努力。",
        status: "follow_up_needed",
        effectiveness: "medium",
        actionType: "tutoring",
      },
    ];

    if (selectedWarning) {
      setTrackingRecords(
        mockData.filter((r) => r.warningId === selectedWarning)
      );
    } else {
      setTrackingRecords(mockData);
    }
  }, [selectedWarning]);

  const handleAddRecord = () => {
    if (!newRecord.action.trim() || !newRecord.notes.trim()) {
      toast.error("请填写必要信息");
      return;
    }

    const record: TrackingRecord = {
      id: Date.now().toString(),
      warningId: selectedWarning || "default",
      studentName: "当前学生",
      className: "当前班级",
      action: newRecord.action,
      actionDate: new Date().toISOString().split("T")[0],
      followupDate: newRecord.followupDate || undefined,
      notes: newRecord.notes,
      status: "in_progress",
      effectiveness: "unknown",
      actionType: newRecord.actionType,
    };

    setTrackingRecords((prev) => [record, ...prev]);
    setNewRecord({
      action: "",
      actionType: "student_meeting",
      followupDate: "",
      notes: "",
    });
    setIsAddingRecord(false);
    toast.success("跟踪记录已添加");
  };

  const updateRecordStatus = (id: string, status: TrackingRecord["status"]) => {
    setTrackingRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
    toast.success("状态已更新");
  };

  const updateEffectiveness = (
    id: string,
    effectiveness: TrackingRecord["effectiveness"]
  ) => {
    setTrackingRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, effectiveness } : r))
    );
    toast.success("效果评估已更新");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "follow_up_needed":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "已完成";
      case "in_progress":
        return "进行中";
      case "follow_up_needed":
        return "需跟进";
      case "pending":
        return "待处理";
      default:
        return "未知";
    }
  };

  const getEffectivenessColor = (effectiveness: string) => {
    switch (effectiveness) {
      case "high":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEffectivenessText = (effectiveness: string) => {
    switch (effectiveness) {
      case "high":
        return "效果良好";
      case "medium":
        return "效果一般";
      case "low":
        return "效果较差";
      default:
        return "待评估";
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "contact_parent":
        return <Phone className="h-4 w-4" />;
      case "student_meeting":
        return <User className="h-4 w-4" />;
      case "tutoring":
        return <BookOpen className="h-4 w-4" />;
      case "counseling":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题和新增按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">预警跟踪记录</h2>
          <p className="text-gray-600 mt-1">记录和跟踪预警处理进展</p>
        </div>

        <Button
          onClick={() => setIsAddingRecord(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Target className="h-4 w-4 mr-2" />
          添加跟踪记录
        </Button>
      </div>

      {/* 添加新记录表单 */}
      {isAddingRecord && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">新增跟踪记录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>行动类型</Label>
                <select
                  value={newRecord.actionType}
                  onChange={(e) =>
                    setNewRecord((prev) => ({
                      ...prev,
                      actionType: e.target
                        .value as TrackingRecord["actionType"],
                    }))
                  }
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="student_meeting">学生面谈</option>
                  <option value="contact_parent">联系家长</option>
                  <option value="tutoring">课后辅导</option>
                  <option value="counseling">心理咨询</option>
                  <option value="other">其他</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>跟进时间（可选）</Label>
                <Input
                  type="date"
                  value={newRecord.followupDate}
                  onChange={(e) =>
                    setNewRecord((prev) => ({
                      ...prev,
                      followupDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>具体行动</Label>
              <Input
                placeholder="描述具体采取的行动..."
                value={newRecord.action}
                onChange={(e) =>
                  setNewRecord((prev) => ({
                    ...prev,
                    action: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>详细记录</Label>
              <Textarea
                placeholder="记录详细情况、学生反馈、改进建议等..."
                value={newRecord.notes}
                onChange={(e) =>
                  setNewRecord((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsAddingRecord(false)}
              >
                取消
              </Button>
              <Button onClick={handleAddRecord}>保存记录</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 跟踪记录列表 */}
      <div className="space-y-4">
        {trackingRecords.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">暂无跟踪记录</p>
              <p className="text-gray-400 text-sm mt-2">
                开始记录您的预警处理行动
              </p>
            </CardContent>
          </Card>
        ) : (
          trackingRecords.map((record) => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      {getActionIcon(record.actionType)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {record.studentName} - {record.className}
                      </h3>
                      <p className="text-sm text-gray-600">{record.action}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(record.status)}>
                      {getStatusText(record.status)}
                    </Badge>
                    <Badge
                      className={getEffectivenessColor(record.effectiveness)}
                    >
                      {getEffectivenessText(record.effectiveness)}
                    </Badge>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700">{record.notes}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      行动时间: {record.actionDate}
                    </div>
                    {record.followupDate && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        跟进时间: {record.followupDate}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={record.status}
                      onChange={(e) =>
                        updateRecordStatus(
                          record.id,
                          e.target.value as TrackingRecord["status"]
                        )
                      }
                      className="text-xs border rounded px-2 py-1"
                    >
                      <option value="pending">待处理</option>
                      <option value="in_progress">进行中</option>
                      <option value="completed">已完成</option>
                      <option value="follow_up_needed">需跟进</option>
                    </select>

                    <select
                      value={record.effectiveness}
                      onChange={(e) =>
                        updateEffectiveness(
                          record.id,
                          e.target.value as TrackingRecord["effectiveness"]
                        )
                      }
                      className="text-xs border rounded px-2 py-1"
                    >
                      <option value="unknown">待评估</option>
                      <option value="low">效果较差</option>
                      <option value="medium">效果一般</option>
                      <option value="high">效果良好</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 跟踪统计 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            跟踪统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {trackingRecords.length}
              </div>
              <div className="text-sm text-gray-500">总记录数</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {
                  trackingRecords.filter((r) => r.status === "in_progress")
                    .length
                }
              </div>
              <div className="text-sm text-gray-500">进行中</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {trackingRecords.filter((r) => r.status === "completed").length}
              </div>
              <div className="text-sm text-gray-500">已完成</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {
                  trackingRecords.filter((r) => r.effectiveness === "high")
                    .length
                }
              </div>
              <div className="text-sm text-gray-500">效果良好</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WarningTracking;
