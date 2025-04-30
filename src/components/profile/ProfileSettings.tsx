import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// 个人资料表单验证
const profileSchema = z.object({
  full_name: z.string().min(1, "姓名不能为空"),
  phone: z.string().optional(),
  school_name: z.string().optional(),
  position: z.string().optional(),
  avatar_url: z.string().optional(),
});

// 偏好设置表单验证
const preferencesSchema = z.object({
  darkMode: z.boolean().default(false),
  emailNotifications: z.boolean().default(true),
  defaultSubject: z.string().optional(),
  theme: z.enum(["system", "light", "dark"]).default("system"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PreferencesFormValues = z.infer<typeof preferencesSchema>;

export function ProfileSettings() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // 个人资料表单
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      school_name: "",
      position: "",
      avatar_url: "",
    },
  });

  // 偏好设置表单
  const preferencesForm = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      darkMode: false,
      emailNotifications: true,
      defaultSubject: "",
      theme: "system",
    },
  });

  // 加载用户数据
  useEffect(() => {
    async function loadUserProfile() {
      try {
        setIsLoading(true);
        
        // 获取当前登录用户
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("未找到用户");
        
        setUser(user);
        
        // 加载用户资料
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }
        
        if (profile) {
          // 更新个人资料表单
          profileForm.reset({
            full_name: profile.full_name || "",
            phone: profile.phone || "",
            school_name: profile.school_name || "",
            position: profile.position || "",
            avatar_url: profile.avatar_url || "",
          });
          
          // 更新偏好设置表单
          const preferences = profile.preferences || {};
          preferencesForm.reset({
            darkMode: preferences.darkMode || false,
            emailNotifications: preferences.emailNotifications !== false, // 默认为true
            defaultSubject: preferences.defaultSubject || "",
            theme: preferences.theme || "system",
          });
        }
      } catch (error) {
        console.error("加载用户资料失败:", error);
        toast.error("加载用户资料失败", {
          description: error instanceof Error ? error.message : "未知错误"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    loadUserProfile();
  }, []);

  // 处理头像上传
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      
      // 创建预览URL
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  // 上传头像到存储
  const uploadAvatar = async (userId: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const filePath = `avatars/${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(filePath, file);
      
    if (uploadError) throw uploadError;
    
    // 获取公共URL
    const { data } = supabase.storage.from('profiles').getPublicUrl(filePath);
    return data.publicUrl;
  };

  // 保存个人资料
  const handleProfileSubmit = async (values: ProfileFormValues) => {
    try {
      setIsSaving(true);
      
      if (!user) throw new Error("用户未登录");
      
      // 如果有新头像，先上传
      let avatarUrl = values.avatar_url;
      if (avatarFile) {
        avatarUrl = await uploadAvatar(user.id, avatarFile);
      }
      
      // 更新用户资料
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          full_name: values.full_name,
          phone: values.phone,
          school_name: values.school_name,
          position: values.position,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });
        
      if (error) throw error;
      
      toast.success("个人资料已更新");
      
      // 清除预览
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
      setAvatarFile(null);
      
    } catch (error) {
      console.error("更新个人资料失败:", error);
      toast.error("更新个人资料失败", {
        description: error instanceof Error ? error.message : "未知错误"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 保存偏好设置
  const handlePreferencesSubmit = async (values: PreferencesFormValues) => {
    try {
      setIsSaving(true);
      
      if (!user) throw new Error("用户未登录");
      
      // 获取当前用户资料
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('preferences')
        .eq('id', user.id)
        .single();
        
      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }
      
      // 合并现有偏好设置与新设置
      const currentPreferences = profile?.preferences || {};
      const newPreferences = {
        ...currentPreferences,
        darkMode: values.darkMode,
        emailNotifications: values.emailNotifications,
        defaultSubject: values.defaultSubject,
        theme: values.theme,
      };
      
      // 更新偏好设置
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          preferences: newPreferences,
          updated_at: new Date().toISOString(),
        });
        
      if (error) throw error;
      
      // 应用主题设置
      if (values.theme === "dark" || (values.theme === "system" && values.darkMode)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      toast.success("偏好设置已更新");
    } catch (error) {
      console.error("更新偏好设置失败:", error);
      toast.error("更新偏好设置失败", {
        description: error instanceof Error ? error.message : "未知错误"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="profile">个人资料</TabsTrigger>
        <TabsTrigger value="preferences">偏好设置</TabsTrigger>
      </TabsList>
      
      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle>个人资料</CardTitle>
            <CardDescription>
              管理您的个人信息和学校/机构资料
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
                {/* 头像上传部分 */}
                <div className="flex flex-col items-center sm:flex-row gap-6 mb-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage 
                      src={avatarPreview || profileForm.watch('avatar_url')} 
                      alt={profileForm.watch('full_name')} 
                    />
                    <AvatarFallback>
                      <User className="h-12 w-12" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex flex-col space-y-2">
                    <h3 className="text-sm font-medium">个人头像</h3>
                    <p className="text-xs text-muted-foreground">
                      图片将显示在您的个人主页和评论中
                    </p>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="max-w-xs"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={profileForm.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>姓名 *</FormLabel>
                        <FormControl>
                          <Input placeholder="您的姓名" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>联系电话</FormLabel>
                        <FormControl>
                          <Input placeholder="您的联系电话" {...field} />
                        </FormControl>
                        <FormDescription>仅用于账户找回，不会公开</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="school_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>学校/机构名称</FormLabel>
                        <FormControl>
                          <Input placeholder="您所在的学校或机构" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>职位</FormLabel>
                        <FormControl>
                          <Input placeholder="您的职位，如：教师、班主任等" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="avatar_url"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <CardFooter className="px-0 pt-6">
                  <Button 
                    type="submit" 
                    className="ml-auto"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        保存资料
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="preferences">
        <Card>
          <CardHeader>
            <CardTitle>偏好设置</CardTitle>
            <CardDescription>
              管理您的系统和通知偏好
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...preferencesForm}>
              <form onSubmit={preferencesForm.handleSubmit(handlePreferencesSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">外观</h3>
                  
                  <FormField
                    control={preferencesForm.control}
                    name="theme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>主题</FormLabel>
                        <FormControl>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <SelectTrigger className="w-full sm:w-[280px]">
                              <SelectValue placeholder="请选择主题" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="system">跟随系统</SelectItem>
                              <SelectItem value="light">浅色模式</SelectItem>
                              <SelectItem value="dark">深色模式</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          设置系统显示的主题模式
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={preferencesForm.control}
                    name="darkMode"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">深色模式</FormLabel>
                          <FormDescription>
                            启用深色模式以减少眼部疲劳
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">通知</h3>
                  
                  <FormField
                    control={preferencesForm.control}
                    name="emailNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">电子邮件通知</FormLabel>
                          <FormDescription>
                            接收关于作业、成绩和重要通知的邮件
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">教学偏好</h3>
                  
                  <FormField
                    control={preferencesForm.control}
                    name="defaultSubject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>默认学科</FormLabel>
                        <FormControl>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <SelectTrigger className="w-full sm:w-[280px]">
                              <SelectValue placeholder="请选择默认学科" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">无默认</SelectItem>
                              <SelectItem value="math">数学</SelectItem>
                              <SelectItem value="chinese">语文</SelectItem>
                              <SelectItem value="english">英语</SelectItem>
                              <SelectItem value="physics">物理</SelectItem>
                              <SelectItem value="chemistry">化学</SelectItem>
                              <SelectItem value="biology">生物</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          设置创建作业或查看成绩时的默认学科
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
                
                <CardFooter className="px-0 pt-6">
                  <Button 
                    type="submit" 
                    className="ml-auto"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        保存设置
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

export default ProfileSettings; 