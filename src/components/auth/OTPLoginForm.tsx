
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';
import { AuthFormData } from './types';

interface OTPLoginFormProps {
  form: UseFormReturn<AuthFormData>;
  isSubmitting: boolean;
  otpSent: boolean;
  onSendOTP: () => void;
  onSwitchMethod: () => void;
}

const OTPLoginForm = ({ form, isSubmitting, otpSent, onSendOTP, onSwitchMethod }: OTPLoginFormProps) => {
  return (
    <div className="space-y-4">
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
          onClick={onSendOTP}
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
          onClick={onSwitchMethod}
          className="text-sm"
        >
          使用密码登录
        </Button>
      </div>
    </div>
  );
};

export default OTPLoginForm;
