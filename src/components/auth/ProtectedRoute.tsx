import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  allowedRoles?: string[];
  redirectPath?: string;
}

/**
 * 路由保护组件，用于限制只有特定角色的用户才能访问某些路由
 * @param allowedRoles 允许访问的角色数组，为空时表示任何已登录用户都可访问
 * @param redirectPath 未授权时重定向的路径，默认为"/login"
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles = [],
  redirectPath = "/login",
}) => {
  const { user, userRole, isAuthReady } = useAuthContext();

  // 认证尚未就绪，显示加载指示器
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 用户未登录，重定向到登录页
  if (!user) {
    return <Navigate to={redirectPath} replace />;
  }

  // 检查用户角色是否被允许访问（如果指定了角色限制）
  if (
    allowedRoles.length > 0 &&
    (!userRole || !allowedRoles.includes(userRole))
  ) {
    // 用户没有所需权限，重定向到未授权页面
    return <Navigate to="/unauthorized" replace />;
  }

  // 用户有访问权限，渲染子路由
  return <Outlet />;
};

export default ProtectedRoute;
