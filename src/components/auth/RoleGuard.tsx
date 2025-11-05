import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUserRoles, AppRole } from "@/utils/roleUtils";
import { toast } from "sonner";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
  fallback?: React.ReactNode;
}

const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallback = null,
}) => {
  const navigate = useNavigate();

  const { data: userRoles, isLoading } = useQuery({
    queryKey: ["userRoles"],
    queryFn: getCurrentUserRoles,
    meta: {
      onError: () => {
        toast.error("无法验证用户权限");
        navigate("/login");
      },
    },
  });

  if (isLoading) {
    return <div>加载中...</div>;
  }

  const hasRequiredRole = userRoles?.some((role) =>
    allowedRoles.includes(role)
  );

  if (!hasRequiredRole) {
    return fallback;
  }

  return <>{children}</>;
};

export default RoleGuard;
