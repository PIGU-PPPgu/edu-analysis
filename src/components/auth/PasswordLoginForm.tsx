import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Lock } from "lucide-react";
import { useAuthContext } from "./AuthContext";

const PasswordLoginForm = () => {
  const { form, isSubmitting } = useAuthContext();

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>邮箱</FormLabel>
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
        登录
      </Button>
    </div>
  );
};

export default PasswordLoginForm;
