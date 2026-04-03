"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/unified/modules/AuthModule";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Building2,
  Users,
  BarChart3,
  Shield,
  Plus,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ─── 类型定义 ───────────────────────────────────────────────

interface School {
  id: string;
  school_name: string;
  school_code: string;
  address?: string;
  contact_phone?: string;
  principal?: string;
  school_type?: string;
  is_active?: boolean;
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  school_id?: string;
  school_name?: string;
  role?: string;
  created_at: string;
}

interface SchoolStats {
  school_id: string;
  school_name: string;
  student_count: number;
  grade_data_count: number;
  exam_count: number;
  activity_count: number;
  user_count: number;
}

// ─── 主组件 ─────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  const [schools, setSchools] = useState<School[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<SchoolStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // 对话框状态
  const [schoolDialog, setSchoolDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    data: Partial<School>;
  }>({ open: false, mode: "create", data: {} });

  const [userSchoolDialog, setUserSchoolDialog] = useState<{
    open: boolean;
    userId: string;
    currentSchoolId: string;
    currentRole: string;
  } | null>(null);

  // 权限守卫：非 admin 跳回首页
  useEffect(() => {
    if (userRole && userRole !== "admin") {
      toast.error("无权访问管理员面板");
      navigate("/dashboard");
    }
  }, [userRole, navigate]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadSchools(), loadUsers(), loadStats()]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ─── 数据加载 ─────────────────────────────────────────────

  async function loadSchools() {
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .order("created_at");
    if (error) {
      toast.error("加载学校数据失败: " + error.message);
      return;
    }
    setSchools(data || []);
  }

  async function loadUsers() {
    // 查询 user_profiles 并关联学校名称
    const { data, error } = await supabase
      .from("user_profiles")
      .select(
        `id, full_name, school_id, created_at,
         schools(school_name),
         user_roles(role)`
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      toast.error("加载用户数据失败: " + error.message);
      return;
    }

    // 获取 email（通过 auth.users — 需要用 supabase admin，这里直接查已知字段）
    const mapped: UserProfile[] = (data || []).map((u: any) => ({
      id: u.id,
      email: u.id, // placeholder，会在下面通过 RPC 或其他方式补充
      full_name: u.full_name,
      school_id: u.school_id,
      school_name: u.schools?.school_name ?? "未分配",
      role: u.user_roles?.[0]?.role ?? "student",
      created_at: u.created_at,
    }));

    setUsers(mapped);
  }

  async function loadStats() {
    const { data: schoolList } = await supabase
      .from("schools")
      .select("id, school_name");
    if (!schoolList) return;

    const statsArr: SchoolStats[] = await Promise.all(
      schoolList.map(async (s) => {
        const [studentRes, gradeRes, examRes, activityRes, userRes] =
          await Promise.all([
            supabase
              .from("students")
              .select("id", { count: "exact", head: true })
              .eq("school_id", s.id),
            supabase
              .from("grade_data")
              .select("id", { count: "exact", head: true })
              .eq("school_id", s.id),
            supabase
              .from("exams")
              .select("id", { count: "exact", head: true })
              .eq("school_id", s.id),
            supabase
              .from("value_added_activities")
              .select("id", { count: "exact", head: true })
              .eq("school_id", s.id),
            supabase
              .from("user_profiles")
              .select("id", { count: "exact", head: true })
              .eq("school_id", s.id),
          ]);
        return {
          school_id: s.id,
          school_name: s.school_name,
          student_count: studentRes.count ?? 0,
          grade_data_count: gradeRes.count ?? 0,
          exam_count: examRes.count ?? 0,
          activity_count: activityRes.count ?? 0,
          user_count: userRes.count ?? 0,
        };
      })
    );
    setStats(statsArr);
  }

  // ─── 学校 CRUD ────────────────────────────────────────────

  async function saveSchool() {
    const { data: schoolData, mode } = schoolDialog;
    if (!schoolData.school_name || !schoolData.school_code) {
      toast.error("学校名称和编码为必填项");
      return;
    }

    if (mode === "create") {
      const { error } = await supabase.from("schools").insert({
        school_name: schoolData.school_name,
        school_code: schoolData.school_code,
        address: schoolData.address,
        contact_phone: schoolData.contact_phone,
        principal: schoolData.principal,
        school_type: schoolData.school_type ?? "high_school",
        is_active: true,
      });
      if (error) {
        toast.error("创建失败: " + error.message);
        return;
      }
      toast.success("学校已创建");
    } else {
      const { error } = await supabase
        .from("schools")
        .update({
          school_name: schoolData.school_name,
          school_code: schoolData.school_code,
          address: schoolData.address,
          contact_phone: schoolData.contact_phone,
          principal: schoolData.principal,
        })
        .eq("id", schoolData.id!);
      if (error) {
        toast.error("更新失败: " + error.message);
        return;
      }
      toast.success("学校信息已更新");
    }

    setSchoolDialog({ open: false, mode: "create", data: {} });
    await loadSchools();
    await loadStats();
  }

  // ─── 用户学校/角色分配 ────────────────────────────────────

  async function saveUserAssignment() {
    if (!userSchoolDialog) return;
    const { userId, currentSchoolId, currentRole } = userSchoolDialog;

    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({ school_id: currentSchoolId })
      .eq("id", userId);
    if (profileError) {
      toast.error("更新用户学校失败: " + profileError.message);
      return;
    }

    // 更新角色：先删旧角色，再插新角色
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: currentRole });
    if (roleError) {
      toast.error("更新角色失败: " + roleError.message);
      return;
    }

    toast.success("用户分配已更新");
    setUserSchoolDialog(null);
    await loadUsers();
    await loadStats();
  }

  // ─── 渲染 ─────────────────────────────────────────────────

  if (userRole !== "admin") return null;

  const totalStudents = stats.reduce((s, x) => s + x.student_count, 0);
  const totalExams = stats.reduce((s, x) => s + x.exam_count, 0);
  const totalUsers = stats.reduce((s, x) => s + x.user_count, 0);

  return (
    <div className="space-y-6 p-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            系统管理后台
          </h1>
          <p className="text-muted-foreground mt-1">
            管理所有学校、用户和系统数据
          </p>
        </div>
        <Button variant="outline" onClick={loadAll} disabled={loading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          刷新
        </Button>
      </div>

      {/* 总览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="学校总数"
          value={schools.length}
          icon={<Building2 className="h-5 w-5 text-blue-500" />}
        />
        <StatCard
          title="用户总数"
          value={totalUsers}
          icon={<Users className="h-5 w-5 text-green-500" />}
        />
        <StatCard
          title="学生总数"
          value={totalStudents}
          icon={<Users className="h-5 w-5 text-purple-500" />}
        />
        <StatCard
          title="考试总数"
          value={totalExams}
          icon={<BarChart3 className="h-5 w-5 text-orange-500" />}
        />
      </div>

      {/* 标签页 */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b px-6 pt-4">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="overview" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" /> 数据总览
              </TabsTrigger>
              <TabsTrigger value="schools" className="flex items-center gap-1">
                <Building2 className="h-4 w-4" /> 学校管理
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-1">
                <Users className="h-4 w-4" /> 用户管理
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── 数据总览 ── */}
          <TabsContent value="overview" className="p-6">
            <CardTitle className="mb-4">各学校数据统计</CardTitle>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>学校名称</TableHead>
                  <TableHead className="text-right">用户数</TableHead>
                  <TableHead className="text-right">学生数</TableHead>
                  <TableHead className="text-right">成绩记录</TableHead>
                  <TableHead className="text-right">考试数</TableHead>
                  <TableHead className="text-right">增值活动</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((s) => (
                  <TableRow key={s.school_id}>
                    <TableCell className="font-medium">
                      {s.school_name}
                    </TableCell>
                    <TableCell className="text-right">{s.user_count}</TableCell>
                    <TableCell className="text-right">
                      {s.student_count}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.grade_data_count}
                    </TableCell>
                    <TableCell className="text-right">{s.exam_count}</TableCell>
                    <TableCell className="text-right">
                      {s.activity_count}
                    </TableCell>
                  </TableRow>
                ))}
                {stats.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      {loading ? "加载中..." : "暂无数据"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* ── 学校管理 ── */}
          <TabsContent value="schools" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <CardTitle>学校列表</CardTitle>
              <Button
                size="sm"
                onClick={() =>
                  setSchoolDialog({ open: true, mode: "create", data: {} })
                }
              >
                <Plus className="h-4 w-4 mr-1" /> 新增学校
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>学校名称</TableHead>
                  <TableHead>编码</TableHead>
                  <TableHead>校长</TableHead>
                  <TableHead>联系电话</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.school_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {s.school_code}
                    </TableCell>
                    <TableCell>{s.principal ?? "-"}</TableCell>
                    <TableCell>{s.contact_phone ?? "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.is_active !== false ? "default" : "secondary"
                        }
                      >
                        {s.is_active !== false ? "启用" : "停用"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setSchoolDialog({ open: true, mode: "edit", data: s })
                        }
                      >
                        <Pencil className="h-3 w-3 mr-1" /> 编辑
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {schools.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      {loading ? "加载中..." : "暂无学校"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* ── 用户管理 ── */}
          <TabsContent value="users" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle>用户列表</CardTitle>
                <CardDescription>显示最近 200 个用户</CardDescription>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户 ID (前8位)</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>所属学校</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-muted-foreground text-xs font-mono">
                      {u.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>{u.full_name ?? "未设置"}</TableCell>
                    <TableCell>{u.school_name}</TableCell>
                    <TableCell>
                      <RoleBadge role={u.role} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setUserSchoolDialog({
                            open: true,
                            userId: u.id,
                            currentSchoolId: u.school_id ?? "",
                            currentRole: u.role ?? "student",
                          })
                        }
                      >
                        <Pencil className="h-3 w-3 mr-1" /> 分配
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      {loading ? "加载中..." : "暂无用户"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </Card>

      {/* ── 学校编辑对话框 ── */}
      <Dialog
        open={schoolDialog.open}
        onOpenChange={(open) => setSchoolDialog((d) => ({ ...d, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {schoolDialog.mode === "create" ? "新增学校" : "编辑学校"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormField
              label="学校名称 *"
              value={schoolDialog.data.school_name ?? ""}
              onChange={(v) =>
                setSchoolDialog((d) => ({
                  ...d,
                  data: { ...d.data, school_name: v },
                }))
              }
            />
            <FormField
              label="学校编码 *"
              value={schoolDialog.data.school_code ?? ""}
              onChange={(v) =>
                setSchoolDialog((d) => ({
                  ...d,
                  data: { ...d.data, school_code: v },
                }))
              }
            />
            <FormField
              label="校长姓名"
              value={schoolDialog.data.principal ?? ""}
              onChange={(v) =>
                setSchoolDialog((d) => ({
                  ...d,
                  data: { ...d.data, principal: v },
                }))
              }
            />
            <FormField
              label="联系电话"
              value={schoolDialog.data.contact_phone ?? ""}
              onChange={(v) =>
                setSchoolDialog((d) => ({
                  ...d,
                  data: { ...d.data, contact_phone: v },
                }))
              }
            />
            <FormField
              label="地址"
              value={schoolDialog.data.address ?? ""}
              onChange={(v) =>
                setSchoolDialog((d) => ({
                  ...d,
                  data: { ...d.data, address: v },
                }))
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setSchoolDialog({ open: false, mode: "create", data: {} })
              }
            >
              取消
            </Button>
            <Button onClick={saveSchool}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 用户分配对话框 ── */}
      {userSchoolDialog && (
        <Dialog
          open={userSchoolDialog.open}
          onOpenChange={(open) => !open && setUserSchoolDialog(null)}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>分配学校 / 角色</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>所属学校</Label>
                <Select
                  value={userSchoolDialog.currentSchoolId}
                  onValueChange={(v) =>
                    setUserSchoolDialog(
                      (d) => d && { ...d, currentSchoolId: v }
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择学校" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.school_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>角色</Label>
                <Select
                  value={userSchoolDialog.currentRole}
                  onValueChange={(v) =>
                    setUserSchoolDialog((d) => d && { ...d, currentRole: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">管理员</SelectItem>
                    <SelectItem value="teacher">教师</SelectItem>
                    <SelectItem value="student">学生</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setUserSchoolDialog(null)}
              >
                取消
              </Button>
              <Button onClick={saveUserAssignment}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── 小组件 ──────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 bg-muted rounded-lg">{icon}</div>
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleBadge({ role }: { role?: string }) {
  const map: Record<
    string,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }
  > = {
    admin: { label: "管理员", variant: "default" },
    teacher: { label: "教师", variant: "secondary" },
    student: { label: "学生", variant: "outline" },
  };
  const cfg = map[role ?? "student"] ?? map.student;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function FormField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
