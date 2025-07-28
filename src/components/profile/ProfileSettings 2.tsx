import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserProfile, UserPreferences } from "./types";
import ProfileForm from "./forms/ProfileForm";
import PreferencesForm from "./forms/PreferencesForm";

export function ProfileSettings() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    darkMode: false,
    emailNotifications: true,
    defaultSubject: "",
    theme: "system",
  });

  // 加载用户数据
  useEffect(() => {
    async function loadUserProfile() {
      try {
        setIsLoading(true);

        // 获取当前登录用户
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("未找到用户");

        setUser(user);

        // 加载用户资料
        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          throw profileError;
        }

        if (profile) {
          // 确保明确使用 as 类型断言，告诉 TypeScript profile 具有我们期望的字段
          const typedProfile = profile as unknown as UserProfile;
          setUserProfile(typedProfile);

          // Parse preferences if they exist
          if (typedProfile.preferences) {
            const prefs =
              typeof typedProfile.preferences === "string"
                ? JSON.parse(typedProfile.preferences)
                : typedProfile.preferences;

            const userPrefs = {
              darkMode: prefs?.darkMode || false,
              emailNotifications: prefs?.emailNotifications || false,
              defaultSubject: prefs?.defaultSubject || "",
              theme: prefs?.theme || "system",
            };

            setUserPreferences(userPrefs);
          }
        }
      } catch (error) {
        console.error("加载用户资料失败:", error);
        toast.error("加载用户资料失败", {
          description: error instanceof Error ? error.message : "未知错误",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadUserProfile();
  }, []);

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
            <CardDescription>管理您的个人信息和学校/机构资料</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              user={user}
              userProfile={userProfile}
              userPreferences={userPreferences}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="preferences">
        <Card>
          <CardHeader>
            <CardTitle>偏好设置</CardTitle>
            <CardDescription>管理您的系统和通知偏好</CardDescription>
          </CardHeader>
          <CardContent>
            <PreferencesForm
              user={user}
              userPreferences={userPreferences}
              setUserPreferences={setUserPreferences}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

export default ProfileSettings;
