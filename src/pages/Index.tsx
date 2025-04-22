
import React, { useState, useEffect } from "react";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import { toast } from "sonner";
import { supabase, signInWithWechat } from "@/utils/auth";

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // 检查用户登录状态
    const checkUserSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };
    
    checkUserSession();
    
    // 监听认证状态变化
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });
    
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithWechat();
    } catch (error) {
      console.error('登录失败:', error);
      toast.error("登录失败，请重试");
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <Hero 
        isLoggedIn={isLoggedIn} 
        onLogin={handleLogin} 
        onWechatLogin={handleLogin} 
      />
      <Features />
    </div>
  );
};

export default Index;
