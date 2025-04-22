
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, Lock } from 'lucide-react';
import { loginUser, registerUser, sendPhoneOTP, verifyPhoneOTP } from '@/utils/userAuth';
import { userAuthSchema } from '@/utils/validation';

const authSchema = userAuthSchema;

type AuthFormData = z.infer<typeof authSchema>;

interface UserAuthFormProps {
  onSuccess?: () => void;
}

const UserAuthForm: React.FC<UserAuthFormProps> = ({ onSuccess }) => {
  const [authType, setAuthType] = useState<'login' | 'register'>('login');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      phone: '',
      email: '',
      password: '',
      otp: '',
    },
  });

  const handleSendOTP = async () => {
    const phoneValue = form.getValues('phone');
    if (!phoneValue || !/^1[3-9]\d{9}$/.test(phoneValue)) {
      form.setError('phone', { message: '请输入有效的手机号码' });
      return;
    }

    setIsSubmitting(true);
    try {
      await sendPhoneOTP(phoneValue);
      setOtpSent(true);
    } catch (error) {
      console.error('发送验证码失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: AuthFormData) => {
    setIsSubmitting(true);
    try {
      if (authType === 'login') {
        if (loginMethod === 'password') {
          await loginUser({
            phone: data.phone,
            email: data.email,
            password: data.password || '',
          });
        } else if (loginMethod === 'otp' && otpSent && data.phone && data.otp) {
          await verifyPhoneOTP(data.phone, data.otp);
        }
      } else if (authType === 'register') {
        await registerUser({
          phone: data.phone,
          email: data.email,
          password: data.password || '',
        });
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('操作失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPasswordLoginFields = () => (
    <>
      <FormField
        control={form.control}
        name={form.getValues('email') ? 'email' : 'phone'}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{form.getValues('email') ? '邮箱' : '手机号'}</FormLabel>
            <FormControl>
              <div className="flex items-center border rounded-md">
                <div className="px-3 py-2 text-gray-500">
                  {form.getValues('email') ? <Mail className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                </div>
                <Input 
                  {...field} 
                  placeholder={form.getValues('email') ? "请输入邮箱" : "请输入手机号"}
                  className="border-0 focus-visible:ring-0" 
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>密码</FormLabel>
            <FormControl>
              <div className="flex items-center border rounded-md">
                <div className="px-3 py-2 text-gray-500">
                  <Lock className="h-5 w-5" />
                </div>
                <Input 
                  {...field} 
                  type="password" 
                  placeholder="请输入密码" 
                  className="border-0 focus-visible:ring-0" 
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Button
        type="submit"
        className="w-full bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
        disabled={isSubmitting}
      >
        {authType === 'login' ? '登录' : '注册'}
      </Button>

      {authType === 'login' && (
        <div className="text-center">
          <Button 
            variant="link" 
            type="button" 
            onClick={() => setLoginMethod('otp')}
            className="text-sm"
          >
            使用短信验证码登录
          </Button>
        </div>
      )}
    </>
  );

  const renderOtpLoginFields = () => (
    <>
      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>手机号</FormLabel>
            <FormControl>
              <div className="flex items-center border rounded-md">
                <div className="px-3 py-2 text-gray-500">
                  <Phone className="h-5 w-5" />
                </div>
                <Input 
                  {...field} 
                  placeholder="请输入手机号"
                  className="border-0 focus-visible:ring-0" 
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex items-center space-x-2">
        <FormField
          control={form.control}
          name="otp"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>验证码</FormLabel>
              <FormControl>
                <Input {...field} placeholder="请输入验证码" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleSendOTP}
          disabled={isSubmitting || otpSent}
          className="mt-8"
        >
          {otpSent ? '已发送' : '获取验证码'}
        </Button>
      </div>

      <Button
        type="submit"
        className="w-full bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
        disabled={isSubmitting || !otpSent}
      >
        登录
      </Button>

      <div className="text-center">
        <Button 
          variant="link" 
          type="button" 
          onClick={() => setLoginMethod('password')}
          className="text-sm"
        >
          使用密码登录
        </Button>
      </div>
    </>
  );

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
                {loginMethod === 'password' ? renderPasswordLoginFields() : renderOtpLoginFields()}
              </TabsContent>
              
              <TabsContent value="register">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>手机号</FormLabel>
                      <FormControl>
                        <div className="flex items-center border rounded-md">
                          <div className="px-3 py-2 text-gray-500">
                            <Phone className="h-5 w-5" />
                          </div>
                          <Input 
                            {...field} 
                            placeholder="请输入手机号"
                            className="border-0 focus-visible:ring-0" 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>邮箱 (选填)</FormLabel>
                      <FormControl>
                        <div className="flex items-center border rounded-md">
                          <div className="px-3 py-2 text-gray-500">
                            <Mail className="h-5 w-5" />
                          </div>
                          <Input 
                            {...field} 
                            placeholder="请输入邮箱"
                            className="border-0 focus-visible:ring-0" 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>密码</FormLabel>
                      <FormControl>
                        <div className="flex items-center border rounded-md">
                          <div className="px-3 py-2 text-gray-500">
                            <Lock className="h-5 w-5" />
                          </div>
                          <Input 
                            {...field} 
                            type="password" 
                            placeholder="请设置密码" 
                            className="border-0 focus-visible:ring-0" 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  className="w-full bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
                  disabled={isSubmitting}
                >
                  注册
                </Button>
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
