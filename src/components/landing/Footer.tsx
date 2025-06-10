import React, { useState } from "react";

const Footer: React.FC = () => {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      console.log("Subscribed with email:", email);
      alert("感谢您的订阅！");
      setEmail("");
    }
  };

  return (
    <footer className="w-full mt-[140px] px-[100px] max-md:max-w-full max-md:mt-10 max-md:px-5">
      <div className="bg-[#191A23] max-w-full w-[1241px] pt-[55px] pb-[50px] px-[60px] rounded-[45px_45px_0px_0px] max-md:px-5">
        <div className="w-full max-w-[1121px] max-md:max-w-full">
          <div className="flex w-full items-center gap-[40px_155px] flex-wrap max-md:max-w-full">
            <div className="aspect-[6.21] w-[180px] self-stretch shrink-0 my-auto flex items-center">
              <h2 className="text-white text-2xl font-bold">学生画像系统</h2>
            </div>
            <nav className="self-stretch flex min-w-60 gap-10 text-lg text-white font-normal underline flex-wrap my-auto max-md:max-w-full">
              <a
                href="#features"
                className="hover:text-[#B9FF66] transition-colors"
              >
                产品功能
              </a>
              <a
                href="#technology"
                className="hover:text-[#B9FF66] transition-colors"
              >
                AI技术栈
              </a>
              <a
                href="#workflow"
                className="hover:text-[#B9FF66] transition-colors"
              >
                AI流程
              </a>
              <a
                href="/login"
                className="hover:text-[#B9FF66] transition-colors"
              >
                开始使用
              </a>
            </nav>
            <div className="self-stretch flex gap-5 my-auto">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-[#B9FF66] transition-colors"
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </div>
          </div>

          <div className="flex gap-[40px_154px] flex-wrap mt-[66px] max-md:max-w-full max-md:mt-10">
            <div className="flex min-w-60 flex-col items-stretch">
              <div className="text-xl text-black font-medium">
                <div className="bg-[#B9FF66] px-[7px] rounded-[7px]">
                  联系我们:
                </div>
              </div>
              <div className="text-lg text-white font-normal mt-[27px]">
                <div>
                  <a
                    href="mailto:support@student-ai.com"
                    className="hover:text-[#B9FF66] transition-colors"
                  >
                    邮箱: support@student-ai.com
                  </a>
                </div>
                <div className="mt-5">
                  <a
                    href="tel:400-888-9999"
                    className="hover:text-[#B9FF66] transition-colors"
                  >
                    电话: 400-888-9999
                  </a>
                </div>
                <address className="mt-5 not-italic">
                  地址: 广东省深圳市南山区
                  <br />
                  科技园南区深圳湾科技生态园
                </address>
              </div>
            </div>

            <form
              className="bg-[rgba(41,42,50,1)] flex min-w-60 gap-5 overflow-hidden font-normal flex-wrap px-10 py-[58px] rounded-[14px] max-md:max-w-full max-md:px-5"
              onSubmit={handleSubscribe}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="邮箱地址"
                required
                className="border min-w-60 gap-2.5 overflow-hidden text-lg text-white bg-transparent w-[285px] px-[35px] py-[22px] rounded-[14px] border-white border-solid focus:outline-none focus:border-[#B9FF66] max-md:px-5"
              />
              <button
                type="submit"
                className="bg-[#B9FF66] min-w-60 gap-2.5 text-xl text-black text-center leading-[1.4] px-[35px] py-5 rounded-[14px] hover:bg-[#a8e85c] transition-colors max-md:px-5"
              >
                订阅更新
              </button>
            </form>
          </div>
        </div>

        <div className="flex w-full max-w-[1120px] flex-col items-stretch text-lg text-white font-normal leading-loose mt-[50px] max-md:max-w-full max-md:mt-10">
          <div className="border min-h-px w-full border-white border-solid" />
          <div className="flex gap-10 flex-wrap mt-[50px] max-md:max-w-full max-md:mt-10">
            <div>© 2025 学生画像系统. 保留所有权利.</div>
            <a
              href="/privacy"
              className="underline hover:text-[#B9FF66] transition-colors"
            >
              隐私政策
            </a>
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#B9FF66] transition-colors"
            >
              粤ICP备2025392229号
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
