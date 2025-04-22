
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { userAuthSchema } from '@/utils/validation';
import { loginUser, registerUser, verifyPhoneOTP } from '@/utils/userAuth';
import { AuthFormData } from './types';
import PasswordLoginForm from './PasswordLoginForm';
import OTPLoginForm from './OTPLoginForm';
import RegisterForm from './RegisterForm';

interface UserAuthFormProps {
  onSuccess?: () => void;
}

const UserAuthForm: React.FC<UserAuthFormProps> = ({ onSuccess }) => {
  const [authType, setAuthType] = useState<'login' | 'register'>('login');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const form = useForm<AuthFormData>({
    resolver: zodResolver(userAuthSchema),
    defaultValues: {
      phone: '',
      email: '',
      password: '',
      otp: '',
    },
  });

  const onSubmit = async (data: AuthFormData) => {
    setIsSubmitting(true);
    try {
      if (authType === 'login') {
        if (loginMethod === 'password') {
          await loginUser({
            phone: data.phone,
            email: data.email,
            password: data.password,
          });
        } else if (loginMethod === 'otp' && data.phone && data.otp) {
          await verifyPhoneOTP(data.phone, data.otp);
        }
      } else if (authType === 'register') {
        await registerUser({
          phone: data.phone,
          email: data.email,
          password: data.password,
        });
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          {authType === 'login' ? '用户登录' : '用户注册'}
        </CardTitle>
        <CardDescription className="text-center">
          {authType === 'login' ? '使用手机号或邮箱登录' : '创建新账户'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login" onValueChange={(v) => setAuthType(v as 'login' | 'register')}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <TabsContent value="login">
                {loginMethod === 'password' ? (
                  <PasswordLoginForm
                    form={form}
                    isSubmitting={isSubmitting}
                    onSwitchMethod={() => setLoginMethod('otp')}
                  />
                ) : (
                  <OTPLoginForm
                    form={form}
                    isSubmitting={isSubmitting}
                    otpSent={otpSent}
                    onSendOTP={() => setOtpSent(true)}
                    onSwitchMethod={() => setLoginMethod('password')}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="register">
                <RegisterForm
                  form={form}
                  isSubmitting={isSubmitting}
                />
              </TabsContent>
            </form>
          </Form>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-500">
          {authType === 'login' 
            ? '没有账号? ' 
            : '已有账号? '}
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
