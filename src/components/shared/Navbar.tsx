import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth, useAuthActions } from "@/contexts/unified/modules/AuthModule";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  LogOut,
  Settings,
  UserCircle,
  Download,
  BarChart3,
  Users,
  Bell,
  Brain,
  BookOpen,
  Sparkles,
  Shield,
} from "lucide-react";
import { useViewport } from "@/hooks/use-viewport";
import {
  MobileNavigation,
  MobileTopBar,
  DEFAULT_NAVIGATION_ITEMS,
  NavigationItem,
} from "@/components/mobile/MobileNavigation";
import { cn } from "@/lib/utils";
import { useRoutePreloader } from "@/utils/routePreloader";
import { toast } from "sonner";

interface NavbarProps {
  showMainNav?: boolean;
  mobileTitle?: string;
}

const Navbar: React.FC<NavbarProps> = ({ showMainNav = true, mobileTitle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, isAuthReady } = useAuth();
  const { signOut } = useAuthActions();
  const [localUserRole, setLocalUserRole] = useState<string | null>(null);
  const { isMobile } = useViewport();
  const { setUserRole, setCurrentRoute, clearCache } = useRoutePreloader();

  // 在组件加载时检查localStorage中是否有用户角色
  useEffect(() => {
    if (user?.id) {
      const storedRole = localStorage.getItem(`user_role_${user.id}`);
      if (storedRole) {
        setLocalUserRole(storedRole);
      }
    }
  }, [user]);

  // 🚀 Master-Frontend: 路由预加载集成
  useEffect(() => {
    if (!isAuthReady) return;

    if (!user) {
      setUserRole("guest");
      clearCache();
      return;
    }

    const effectiveRole = getEffectiveRole() || "teacher";
    setUserRole(effectiveRole);
  }, [isAuthReady, user, userRole, localUserRole, setUserRole, clearCache]);

  useEffect(() => {
    setCurrentRoute(location.pathname);
  }, [location.pathname]);

  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const getUserInitials = () => {
    if (!user?.email) return "用户";
    return user.email.substring(0, 2).toUpperCase();
  };

  const getEffectiveRole = () => {
    // 优先使用AuthContext中的角色，如果没有则使用本地存储的角色
    return userRole || localUserRole;
  };

  const getRoleLabel = () => {
    const role = getEffectiveRole();
    switch (role) {
      case "admin":
        return "管理员";
      case "teacher":
        return "教师";
      case "student":
        return "学生";
      default:
        return "访客";
    }
  };

  // 构建移动端导航项
  const buildMobileNavItems = (): NavigationItem[] => {
    const baseItems: NavigationItem[] = [
      {
        id: "teacher-dashboard",
        label: "工作台",
        icon: <User className="w-5 h-5" />,
        onClick: () => navigate("/teacher-dashboard"),
      },
    ];

    if (isAuthReady && user) {
      baseItems.push(
        {
          id: "dashboard",
          label: "数据导入",
          icon: <Download className="w-5 h-5" />,
          onClick: () => navigate("/dashboard"),
        },
        {
          id: "exam-management",
          label: "考试管理",
          icon: <BookOpen className="w-5 h-5" />,
          onClick: () => navigate("/exam-management"),
        },
        {
          id: "value-added",
          label: "增值评价",
          icon: <Sparkles className="w-5 h-5" />,
          onClick: () => navigate("/value-added"),
        },
        {
          id: "homework",
          label: "作业管理",
          icon: <Settings className="w-5 h-5" />,
          onClick: () => navigate("/homework"),
        },
        {
          id: "ai-chat",
          label: "AI助手",
          icon: <UserCircle className="w-5 h-5" />,
          onClick: () => navigate("/ai-chat"),
        },
        {
          id: "settings-section",
          label: "",
          divider: true,
        },
        {
          id: "profile",
          label: "个人设置",
          icon: <Settings className="w-5 h-5" />,
          onClick: () => navigate("/profile"),
        }
      );
    }

    return baseItems;
  };

  // 获取当前激活的导航项ID
  const getActiveNavItemId = (): string | undefined => {
    if (location.pathname === "/teacher-dashboard") return "teacher-dashboard";
    if (
      location.pathname.startsWith("/dashboard") ||
      location.pathname.startsWith("/data-import")
    )
      return "dashboard";
    if (location.pathname.startsWith("/homework")) return "homework";
    if (location.pathname.startsWith("/grade-analysis"))
      return "grade-analysis";
    if (location.pathname.startsWith("/advanced-analysis"))
      return "advanced-analysis";
    if (location.pathname.startsWith("/exam-management"))
      return "exam-management";
    if (location.pathname.startsWith("/ai-chat")) return "ai-chat";
    return undefined;
  };

  // 移动端顶部操作按钮
  const mobileHeaderActions = [
    {
      icon: <Bell className="w-5 h-5" />,
      label: "通知",
      onClick: () => {},
      badge: "3",
    },
    {
      icon: <Download className="w-5 h-5" />,
      label: "导出",
      onClick: () => {},
    },
  ];

  // 如果是移动端，使用移动端导航
  if (isMobile) {
    return (
      <MobileTopBar
        title={mobileTitle || getPageTitle()}
        actions={mobileHeaderActions}
        navigationProps={{
          items: buildMobileNavItems(),
          activeItemId: getActiveNavItemId(),
          user: user
            ? {
                name: user.email?.split("@")[0] || "用户",
                email: user.email,
                role: getRoleLabel(),
              }
            : undefined,
          footerActions: [
            {
              id: "logout",
              label: "退出登录",
              icon: <LogOut className="w-5 h-5" />,
              onClick: handleSignOut,
            },
          ],
          onItemClick: (item) => {
            console.log("Navigation item clicked:", item);
          },
        }}
        className="bg-white border-b border-gray-200"
      />
    );
  }

  // 获取页面标题
  function getPageTitle(): string {
    if (location.pathname === "/teacher-dashboard") return "工作台";
    if (
      location.pathname.startsWith("/dashboard") ||
      location.pathname.startsWith("/data-import")
    )
      return "数据导入";
    if (location.pathname.startsWith("/homework")) return "作业管理";
    if (location.pathname.startsWith("/grade-analysis")) return "基础分析";
    if (location.pathname.startsWith("/advanced-analysis")) return "高级分析";
    if (location.pathname.startsWith("/exam-management")) return "考试管理";
    if (location.pathname.startsWith("/ai-chat")) return "AI助手";
    return "学习管理系统";
  }

  return (
    <div className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex gap-2.5">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/5404ad9ad18a6dff6da5f0646acd0f77aa36f47d?placeholderIfAbsent=true"
              className="h-8 w-auto"
              alt="IntelliClass"
            />
          </Link>
        </div>

        {showMainNav && (
          <nav className="hidden md:flex items-center gap-2 text-xs xl:gap-3 xl:text-sm">
            {isAuthReady && user && (
              <>
                <Link
                  to="/dashboard"
                  className={`font-medium transition-colors hover:text-primary ${
                    isActive("/dashboard") || isActive("/data-import")
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  数据导入
                </Link>
                <Link
                  to="/exam-management"
                  className={`font-medium transition-colors hover:text-primary ${
                    isActive("/exam-management")
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  考试管理
                </Link>
                <Link
                  to="/value-added"
                  className={`font-medium transition-colors hover:text-primary ${
                    isActive("/value-added")
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  增值评价
                </Link>
                <Link
                  to="/warning-analysis"
                  className={`font-medium transition-colors hover:text-primary ${
                    isActive("/warning-analysis")
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  预警分析
                </Link>
                <Link
                  to="/class-management"
                  className={`font-medium transition-colors hover:text-primary ${
                    isActive("/class-management")
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  班级管理
                </Link>

                {/* 设置功能下拉菜单 - 保留少量不常用功能 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`font-medium transition-colors hover:text-primary ${
                        isActive("/ai-settings") ||
                        isActive("/performance-monitoring")
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      设置 ▼
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48">
                    {getEffectiveRole() === "admin" && (
                      <DropdownMenuItem
                        onClick={() => navigate("/ai-settings")}
                      >
                        <UserCircle className="mr-2 h-4 w-4" />
                        AI设置
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => navigate("/performance-monitoring")}
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      性能监控
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 管理员后台入口 */}
                {getEffectiveRole() === "admin" && (
                  <Link
                    to="/admin"
                    className={`font-medium transition-colors hover:text-primary flex items-center gap-1 ${
                      isActive("/admin")
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    管理后台
                  </Link>
                )}
              </>
            )}
          </nav>
        )}

        <div className="flex items-center gap-4">
          {!isAuthReady ? (
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">
                    {user.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {getRoleLabel()}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>个人信息</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/ai-settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>AI模型设置</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/simple-import")}>
                  <Download className="mr-2 h-4 w-4" />
                  <span>快速导入</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/login")}
            >
              <User className="mr-2 h-4 w-4" />
              登录
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
