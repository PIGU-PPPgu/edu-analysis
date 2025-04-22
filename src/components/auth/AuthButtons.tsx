
import React from "react";
import { Button } from "@/components/ui/button";
import { LogIn, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface AuthButtonsProps {
  onLogin: () => void;
  onWechatLogin: () => void;
}

const AuthButtons = ({ onLogin, onWechatLogin }: AuthButtonsProps) => {
  return (
    <div className="flex gap-4">
      <Button 
        className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
        onClick={onLogin}
      >
        <LogIn className="h-4 w-4 mr-2" />
        登录
      </Button>
      <Button 
        variant="outline" 
        className="flex items-center"
        onClick={onWechatLogin}
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        微信登录
      </Button>
    </div>
  );
};

export default AuthButtons;
