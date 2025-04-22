
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { userAuthSchema } from '@/utils/validation';
import { AuthFormData } from './types';
import { AuthProvider } from './AuthContext';
import AuthTabs from './AuthTabs';

interface UserAuthFormProps {
  onSuccess?: () => void;
}

const UserAuthForm: React.FC<UserAuthFormProps> = ({ onSuccess }) => {
  const [authType, setAuthType] = useState<'login' | 'register'>('login');
  const [loginMethod, setLoginMethod] = useState<'password'>('password');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const form = useForm<AuthFormData>({
    resolver: zodResolver(userAuthSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleSendOTP = () => {
    // This function is kept for compatibility but has no actual functionality now
  };

  const handleSwitchMethod = () => {
    // This function is kept for compatibility but has no actual functionality now
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          {authType === 'login' ? '用户登录' : '用户注册'}
        </CardTitle>
        <CardDescription className="text-center">
          {authType === 'login' ? '使用邮箱登录' : '创建新账户'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuthProvider value={{ 
          form, 
          isSubmitting, 
          otpSent, 
          onSendOTP: handleSendOTP, 
          onSwitchMethod: handleSwitchMethod 
        }}>
          <AuthTabs 
            authType={authType} 
            loginMethod={loginMethod}
            onAuthTypeChange={(v) => setAuthType(v as 'login' | 'register')}
            onSuccess={onSuccess}
          />
        </AuthProvider>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-500">
          {authType === 'login' ? '没有账号? ' : '已有账号? '}
          <Button 
            variant="link" 
            className="p-0" 
            onClick={() => setAuthType(authType === 'login' ? 'register' : 'login')}
          >
            {authType === 'login' ? '立即注册' : '立即登录'}
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
};

export default UserAuthForm;
