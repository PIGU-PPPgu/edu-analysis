import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserAuthForm from '@/components/auth/UserAuthForm';
import { useAuthContext } from '@/contexts/AuthContext';
import { Navbar } from '@/components/shared';

const Login = () => {
  const navigate = useNavigate();
  const { user, isAuthReady } = useAuthContext();
  const [isLoading, setIsLoading] = useState(true);

  // 如果用户已登录，重定向到首页
  useEffect(() => {
    if (isAuthReady) {
      setIsLoading(false);
      if (user) {
        navigate('/grade-analysis');
      }
    }
  }, [user, isAuthReady, navigate]);

  // 登录成功后的回调
  const handleAuthSuccess = () => {
    navigate('/grade-analysis');
  };

  if (isLoading && !isAuthReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p>正在加载...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar showMainNav={false} />
      
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">学生成绩分析系统</h1>
            <p className="text-gray-500 mt-2">登录账户以管理和分析学生成绩</p>
          </div>
          
          <UserAuthForm onSuccess={handleAuthSuccess} />
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              登录即表示您同意我们的
              <a href="#" className="text-blue-600 hover:underline mx-1">服务条款</a>
              和
              <a href="#" className="text-blue-600 hover:underline mx-1">隐私政策</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
