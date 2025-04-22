
import React, { useEffect } from 'react';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthContext } from './AuthContext';
import PasswordLoginForm from './PasswordLoginForm';
import OTPLoginForm from './OTPLoginForm';
import RegisterForm from './RegisterForm';
import { loginUser, registerUser, verifyPhoneOTP, sendPhoneOTP } from '@/utils/userAuth';
import { toast } from 'sonner';

interface AuthTabsProps {
  authType: 'login' | 'register';
  loginMethod: 'password' | 'otp';
  onAuthTypeChange: (value: string) => void;
  onSuccess?: () => void;
}

const AuthTabs: React.FC<AuthTabsProps> = ({ 
  authType, 
  loginMethod,
  onAuthTypeChange,
  onSuccess
}) => {
  const { form, isSubmitting, setIsSubmitting, otpSent, setOtpSent } = useAuthContext();

  // 重置验证码状态当登录方式或认证类型改变时
  useEffect(() => {
    setOtpSent(false);
  }, [loginMethod, authType, setOtpSent]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (authType === 'login') {
        if (loginMethod === 'password') {
          await loginUser({
            phone: data.phone,
            email: data.email,
            password: data.password,
          });
          onSuccess?.();
        } else if (loginMethod === 'otp' && data.phone && data.otp) {
          await verifyPhoneOTP(data.phone, data.otp);
          onSuccess?.();
        }
      } else if (authType === 'register') {
        await registerUser({
          phone: data.phone,
          email: data.email,
          password: data.password,
        });
        toast.success('注册成功，请登录');
        onAuthTypeChange('login');
      }
    } catch (error) {
      console.error('认证错误:', error);
      toast.error(`认证失败: ${error.message || '请检查您的输入'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOTP = async () => {
    const phone = form.getValues('phone');
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      toast.error('请输入有效的手机号码');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await sendPhoneOTP(phone);
      setOtpSent(true);
      toast.success('验证码已发送，请查收');
    } catch (error) {
      console.error('发送验证码失败:', error);
      toast.error(`发送验证码失败: ${error.message || '请稍后重试'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Tabs defaultValue={authType} onValueChange={onAuthTypeChange}>
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="login">登录</TabsTrigger>
        <TabsTrigger value="register">注册</TabsTrigger>
      </TabsList>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <TabsContent value="login">
            {loginMethod === 'password' ? (
              <PasswordLoginForm />
            ) : (
              <OTPLoginForm />
            )}
          </TabsContent>
          
          <TabsContent value="register">
            <RegisterForm />
          </TabsContent>
        </form>
      </Form>
    </Tabs>
  );
};

export default AuthTabs;
