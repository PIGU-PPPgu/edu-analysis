
import React from 'react';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthContext } from './AuthContext';
import PasswordLoginForm from './PasswordLoginForm';
import OTPLoginForm from './OTPLoginForm';
import RegisterForm from './RegisterForm';
import { loginUser, registerUser, verifyPhoneOTP } from '@/utils/userAuth';

interface AuthTabsProps {
  authType: 'login' | 'register';
  loginMethod: 'password' | 'otp';
  onAuthTypeChange: (value: string) => void;
}

const AuthTabs: React.FC<AuthTabsProps> = ({ 
  authType, 
  loginMethod,
  onAuthTypeChange 
}) => {
  const { form } = useAuthContext();

  const onSubmit = async (data: any) => {
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
    } catch (error) {
      console.error('Auth error:', error);
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
