
import React from 'react';
import { useNavigate } from 'react-router-dom';
import UserAuthForm from '@/components/auth/UserAuthForm';
import { supabase } from '@/utils/auth';

const Login = () => {
  const navigate = useNavigate();

  // 登录成功后的回调
  const handleAuthSuccess = () => {
    navigate('/grade-analysis');
  };

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
