import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, LogOut, Settings, UserCircle, Download } from "lucide-react";

interface NavbarProps {
  showMainNav?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ showMainNav = true }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, signOut, isAuthReady } = useAuthContext();
  const [localUserRole, setLocalUserRole] = useState<string | null>(null);
  
  // 在组件加载时检查localStorage中是否有用户角色
  useEffect(() => {
    if (user?.id) {
      const storedRole = localStorage.getItem(`user_role_${user.id}`);
      if (storedRole) {
        setLocalUserRole(storedRole);
      }
    }
  }, [user]);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
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
      case 'admin': return '管理员';
      case 'teacher': return '教师';
      case 'student': return '学生';
      default: return '访客';
    }
  };

  return (
    <div className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex gap-2.5">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/5404ad9ad18a6dff6da5f0646acd0f77aa36f47d?placeholderIfAbsent=true"
              className="h-8 w-auto"
              alt="Positivus"
            />
          </Link>
        </div>
        
        {showMainNav && (
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive('/') && location.pathname === '/' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              首页
            </Link>
            
            {isAuthReady && user && (
            <>
              <Link
                to="/dashboard"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/dashboard') || isActive('/data-import') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                仪表板
              </Link>
              <Link
                to="/homework"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/homework') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                作业管理
              </Link>
              <Link
                to="/grade-analysis"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/grade-analysis') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                成绩分析
              </Link>
              <Link
                to="/warning-analysis"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/warning-analysis') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                预警分析
              </Link>
              <Link
                to="/student-portrait-management"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/student-portrait-management') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                学生画像
              </Link>
              <Link
                to="/class-management"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/class-management') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                班级管理
              </Link>
              <Link
                to="/ai-settings"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/ai-settings') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                AI设置
              </Link>
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
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">{user.email}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {getRoleLabel()}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>个人信息</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/ai-settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>AI模型设置</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
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