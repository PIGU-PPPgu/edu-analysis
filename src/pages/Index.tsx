
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import AnimatedBackground from "@/components/home/AnimatedBackground";
import { toast } from "sonner";
import { supabase } from "@/utils/auth";

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };
    
    checkUserSession();
    
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });
    
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

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
    navigate('/grade-analysis');
  };

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
