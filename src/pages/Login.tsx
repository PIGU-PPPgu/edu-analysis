
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserAuthForm from '@/components/auth/UserAuthForm';
import { supabase } from '@/integrations/supabase/client';
import { getSession } from '@/utils/auth';
import { toast } from 'sonner';

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  // 检查用户是否已登录
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const session = await getSession();
        if (session) {
          console.log('Login页面 - 用户已登录，跳转到成绩分析页');
          navigate('/grade-analysis');
        } else {
          console.log('Login页面 - 用户未登录');
        }
      } catch (error) {
        console.error('检查登录状态失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  // 登录成功后的回调
  const handleAuthSuccess = () => {
    console.log('登录成功，准备跳转到成绩分析页面');
    toast.success("登录成功");
    
    // 添加较长延迟确保状态完全更新
    setTimeout(() => {
      console.log('延迟后执行跳转到成绩分析页面');
      navigate('/grade-analysis', { replace: true });
    }, 1000);
  };

  if (isLoading) {
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">学生成绩分析系统</h1>
        <p className="text-gray-500 mt-2">登录账户以管理和分析学生成绩</p>
      </div>
      
      <UserAuthForm onSuccess={handleAuthSuccess} />
      
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          登录即表示您同意我们的
          <a href="#" className="text-blue-600 hover:underline">服务条款</a>
          和
          <a href="#" className="text-blue-600 hover:underline">隐私政策</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
