
import React from 'react';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthContext } from './AuthContext';
import PasswordLoginForm from './PasswordLoginForm';
import RegisterForm from './RegisterForm';
import { loginUser, registerUser } from '@/utils/userAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AuthTabsProps {
  authType: 'login' | 'register';
  loginMethod: 'password';
  onAuthTypeChange: (value: string) => void;
  onSuccess?: () => void;
}

const AuthTabs: React.FC<AuthTabsProps> = ({ 
  authType, 
  loginMethod,
  onAuthTypeChange,
  onSuccess
}) => {
  const { form, isSubmitting, setIsSubmitting } = useAuthContext();

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (authType === 'login') {
        console.log('开始登录:', data);
        const result = await loginUser({
          email: data.email,
          password: data.password,
        });
        
        console.log('登录成功:', result);
        toast.success('登录成功');
        
        // 登录成功后由 onAuthStateChange 事件处理跳转
        // 这里只需要调用 onSuccess 回调
        if (onSuccess) {
          onSuccess();
        }
      } else if (authType === 'register') {
        console.log('开始注册:', data);
        await registerUser({
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

  return (
    <Tabs defaultValue={authType} onValueChange={onAuthTypeChange}>
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="login">登录</TabsTrigger>
        <TabsTrigger value="register">注册</TabsTrigger>
      </TabsList>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <TabsContent value="login">
            <PasswordLoginForm />
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
