import React from "react";
import ProfileSettings from "@/components/profile/ProfileSettings";
import { ModuleIntro } from "@/components/ui/ModuleIntro";
import { User } from "lucide-react";

export function ProfilePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">个人资料</h1>

      <ModuleIntro
        title="个人资料管理"
        description="在这里管理您的个人信息、学校资料和系统偏好设置。完善的个人资料有助于其他教师和学生更好地认识您。"
        icon={<User className="h-5 w-5" />}
        tips={[
          "上传个人头像以便在评论和消息中更容易识别",
          "填写学校和职位信息以便与同事更好地协作",
          "设置您的偏好可以让系统为您提供更个性化的体验",
        ]}
      />

      <ProfileSettings />
    </div>
  );
}

export default ProfilePage;
