import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import UserAuthForm from "@/components/auth/UserAuthForm";
import { Navbar } from "@/components/shared";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthReady } = useAuthContext();
  
  // 如果用户已登录，重定向到首页
  useEffect(() => {
    if (isAuthReady && user) {
      navigate("/");
    }
  }, [user, isAuthReady, navigate]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar showMainNav={false} />
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">欢迎使用教育分析平台</h1>
          <UserAuthForm onSuccess={() => navigate("/")} />
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 