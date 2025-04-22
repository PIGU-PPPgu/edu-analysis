
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import AnimatedBackground from "@/components/home/AnimatedBackground";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        setIsLoading(true);
        const { data } = await supabase.auth.getSession();
        console.log("Index页面 - 会话状态:", data.session ? "已登录" : "未登录");
        setIsLoggedIn(!!data.session);
        
        // 由于首页需要一直可见，此处不自动跳转
      } catch (error) {
        console.error("检查会话失败:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkUserSession();
    
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Index页面 - 认证状态变化:", event, session ? "已登录" : "未登录");
      setIsLoggedIn(!!session);
    });
    
    return () => {
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogin = async () => {
    navigate('/login');
  };

  const handleWechatLogin = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'wechat' as any,
        options: {
          redirectTo: window.location.origin + '/auth/callback'
        }
      });
    } catch (error) {
      console.error('微信登录失败:', error);
      toast.error("微信登录失败，请重试");
    }
  };

  const handleFreeLogin = () => {
    // 添加游客模式，可能是使用匿名登录或预设测试账号
    supabase.auth.signInWithPassword({
      email: 'demo@edu-analysis.com',
      password: 'DemoUser2024!'
    }).then(({ data, error }) => {
      if (error) {
        toast.error('游客登录失败');
      } else {
        navigate('/grade-analysis');
      }
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">正在加载...</div>;
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="container mx-auto px-4 py-12 relative">
        <Hero 
          isLoggedIn={isLoggedIn} 
          onLogin={handleLogin} 
          onWechatLogin={handleWechatLogin}
          onFreeLogin={handleFreeLogin}
        />
        <Features />
      </div>
    </div>
  );
};

export default Index;
