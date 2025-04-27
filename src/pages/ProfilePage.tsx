import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Navbar } from "@/components/shared";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// 个人信息更新表单验证
const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "姓名至少需要2个字符",
  }),
  email: z.string().email({
    message: "请输入有效的电子邮箱地址",
  }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole, refreshSession, isAuthReady } = useAuthContext();
  const [userDetails, setUserDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 表单初始化
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
    },
    mode: "onChange",
  });

  // 如果用户未登录，重定向到登录页面
  useEffect(() => {
    if (isAuthReady && !user) {
      navigate("/login");
    }
  }, [user, isAuthReady, navigate]);
  
  // 获取用户详细信息
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // 根据角色获取不同的用户信息
        if (userRole === 'student') {
          const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (!error && data) {
            setUserDetails(data);
            form.reset({
              name: data.name || "",
              email: user.email || "",
            });
          } else {
            console.error("获取学生信息失败:", error);
            setError("获取用户信息失败，请稍后再试");
          }
        } else if (userRole === 'teacher') {
          const { data, error } = await supabase
            .from('teachers')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (!error && data) {
            setUserDetails(data);
            form.reset({
              name: data.name || "",
              email: user.email || "",
            });
          } else {
            console.error("获取教师信息失败:", error);
            setError("获取用户信息失败，请稍后再试");
          }
        } else {
          form.reset({
            name: user.user_metadata?.name || "",
            email: user.email || "",
          });
        }
      } catch (err) {
        console.error("获取用户详情出错:", err);
        setError("获取用户信息时发生错误");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserDetails();
  }, [user, userRole, form]);
  
  // 处理个人信息更新
  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // 更新用户元数据
      const { error: updateError } = await supabase.auth.updateUser({
        data: { name: values.name }
      });
      
      if (updateError) throw updateError;
      
      // 根据角色更新相应的表
      if (userRole === 'student') {
        const { error } = await supabase
          .from('students')
          .update({ name: values.name })
          .eq('id', user.id);
          
        if (error) throw error;
      } else if (userRole === 'teacher') {
        const { error } = await supabase
          .from('teachers')
          .update({ 
            name: values.name,
            email: values.email 
          })
          .eq('id', user.id);
          
        if (error) throw error;
      }
      
      toast.success("个人信息更新成功");
      await refreshSession();
    } catch (err: any) {
      console.error("更新个人信息失败:", err);
      setError(err.message || "更新个人信息失败，请稍后再试");
      toast.error("更新失败");
    } finally {
      setIsSaving(false);
    }
  };
  
  // 处理密码重置
  const handleResetPassword = async () => {
    if (!user?.email) {
      toast.error("无法获取您的邮箱地址");
      return;
    }
    
    setIsResettingPassword(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast.success("密码重置链接已发送到您的邮箱");
    } catch (err: any) {
      console.error("发送密码重置邮件失败:", err);
      toast.error("发送密码重置邮件失败");
    } finally {
      setIsResettingPassword(false);
    }
  };
  
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  
  if (!user) {
    return null; // 会被重定向到登录页
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">个人信息</h1>
          
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>错误</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="details">个人资料</TabsTrigger>
              <TabsTrigger value="security">账号安全</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>个人资料</CardTitle>
                  <CardDescription>
                    管理您的个人信息
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>姓名</FormLabel>
                              <FormControl>
                                <Input placeholder="请输入您的姓名" {...field} />
                              </FormControl>
                              <FormDescription>
                                这是您在系统中显示的姓名
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>电子邮箱</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="您的电子邮箱" 
                                  {...field} 
                                  disabled={true}
                                />
                              </FormControl>
                              <FormDescription>
                                您的主要联系邮箱（不可直接修改）
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {userRole === 'student' && userDetails && (
                          <>
                            <Separator className="my-4" />
                            <div className="space-y-4">
                              <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-1">
                                  <Label>学号</Label>
                                </div>
                                <div className="col-span-3">
                                  <div className="font-medium">{userDetails.student_id}</div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-1">
                                  <Label>班级</Label>
                                </div>
                                <div className="col-span-3">
                                  <div className="font-medium">{userDetails.class_id ? userDetails.class_id : '未分配班级'}</div>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                        
                        <Button type="submit" disabled={isSaving}>
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              保存中...
                            </>
                          ) : "保存修改"}
                        </Button>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>账号安全</CardTitle>
                  <CardDescription>
                    管理您的账号安全设置
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">密码重置</h3>
                    <p className="text-sm text-gray-500">
                      系统将向您的邮箱发送密码重置链接，您可以通过链接设置新密码
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleResetPassword} 
                    disabled={isResettingPassword}
                  >
                    {isResettingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        发送中...
                      </>
                    ) : "发送密码重置链接"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 