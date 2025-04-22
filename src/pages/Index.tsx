
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import { toast } from "sonner";
import { supabase, signInWithWechat, signOut } from "@/utils/auth";

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithWechat();
    } catch (error) {
      console.error('Login error:', error);
      toast.error("登录失败，请重试");
    }
  };

  const handleWechatLogin = async () => {
    try {
      await signInWithWechat();
    } catch (error) {
      console.error('WeChat login error:', error);
      toast.error("微信登录失败，请重试");
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <Hero 
        isLoggedIn={isLoggedIn} 
        onLogin={handleLogin} 
        onWechatLogin={handleWechatLogin} 
      />
      <Features />
    </div>
  );
};

export default Index;
