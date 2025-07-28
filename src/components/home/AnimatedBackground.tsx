import React from "react";

const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* 动态渐变背景 */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#B9FF66] via-[#58C2FF] to-[#FDA4FF] animate-gradient"
        style={{
          backgroundSize: "400% 400%",
          animation: "gradient 15s ease infinite",
        }}
      />

      {/* 动态浮动圆圈 */}
      <div className="absolute inset-0">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className={`absolute rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float-${index + 1}`}
            style={{
              width: `${Math.random() * 300 + 100}px`,
              height: `${Math.random() * 300 + 100}px`,
              background: `hsl(${Math.random() * 360}, 70%, 80%)`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AnimatedBackground;
