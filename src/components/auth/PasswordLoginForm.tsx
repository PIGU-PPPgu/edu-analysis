
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Lock } from 'lucide-react';
import { AuthFormData } from './types';

interface PasswordLoginFormProps {
  form: UseFormReturn<AuthFormData>;
  isSubmitting: boolean;
  onSwitchMethod: () => void;
}

const PasswordLoginForm = ({ form, isSubmitting, onSwitchMethod }: PasswordLoginFormProps) => {
  return (
    <div className="space-y-4">
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
        登录
      </Button>

      <div className="text-center">
        <Button 
          variant="link" 
          type="button" 
          onClick={onSwitchMethod}
          className="text-sm"
        >
          使用短信验证码登录
        </Button>
      </div>
    </div>
  );
};

export default PasswordLoginForm;
