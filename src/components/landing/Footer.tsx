import React, { useState } from "react";

const Footer: React.FC = () => {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      console.log("Subscribed with email:", email);
      alert("Thank you for subscribing!");
      setEmail("");
    }
  };

  return (
    <footer className="w-full mt-[140px] px-[100px] max-md:max-w-full max-md:mt-10 max-md:px-5">
      <div className="bg-[#191A23] max-w-full w-[1241px] pt-[55px] pb-[50px] px-[60px] rounded-[45px_45px_0px_0px] max-md:px-5">
        <div className="w-full max-w-[1121px] max-md:max-w-full">
          <div className="flex w-full items-center gap-[40px_155px] flex-wrap max-md:max-w-full">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/2fa3414f0890fc16d6d70cdf8b8ea49c140bbeee?placeholderIfAbsent=true"
              alt="Company logo"
              className="aspect-[6.21] object-contain w-[180px] self-stretch shrink-0 my-auto"
            />
            <nav className="self-stretch flex min-w-60 gap-10 text-lg text-white font-normal underline flex-wrap my-auto max-md:max-w-full">
              <a
                href="#about"
                className="hover:text-[#B9FF66] transition-colors"
              >
                About us
              </a>
              <a
                href="#services"
                className="hover:text-[#B9FF66] transition-colors"
              >
                Services
              </a>
              <a
                href="#cases"
                className="hover:text-[#B9FF66] transition-colors"
              >
                Use Cases
              </a>
              <a
                href="#pricing"
                className="hover:text-[#B9FF66] transition-colors"
              >
                Pricing
              </a>
              <a
                href="#blog"
                className="hover:text-[#B9FF66] transition-colors"
              >
                Blog
              </a>
            </nav>
            <div className="self-stretch flex gap-5 my-auto">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/fe89c208872bca86a71e5b96e0fa3e4ad26e485d?placeholderIfAbsent=true"
                  alt="Social media icon"
                  className="aspect-[1] object-contain w-[30px] hover:opacity-80 transition-opacity"
                />
              </a>
            </div>
          </div>

          <div className="flex gap-[40px_154px] flex-wrap mt-[66px] max-md:max-w-full max-md:mt-10">
            <div className="flex min-w-60 flex-col items-stretch">
              <div className="text-xl text-black font-medium">
                <div className="bg-[#B9FF66] px-[7px] rounded-[7px]">
                  Contact us:
                </div>
              </div>
              <div className="text-lg text-white font-normal mt-[27px]">
                <div>
                  <a
                    href="mailto:info@positivus.com"
                    className="hover:text-[#B9FF66] transition-colors"
                  >
                    Email: info@positivus.com
                  </a>
                </div>
                <div className="mt-5">
                  <a
                    href="tel:555-567-8901"
                    className="hover:text-[#B9FF66] transition-colors"
                  >
                    Phone: 555-567-8901
                  </a>
                </div>
                <address className="mt-5 not-italic">
                  Address: 1234 Main St
                  <br />
                  Moonstone City, Stardust State 12345
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
                placeholder="Email"
                required
                className="border min-w-60 gap-2.5 overflow-hidden text-lg text-white bg-transparent w-[285px] px-[35px] py-[22px] rounded-[14px] border-white border-solid focus:outline-none focus:border-[#B9FF66] max-md:px-5"
              />
              <button
                type="submit"
                className="bg-[#B9FF66] min-w-60 gap-2.5 text-xl text-black text-center leading-[1.4] px-[35px] py-5 rounded-[14px] hover:bg-[#a8e85c] transition-colors max-md:px-5"
              >
                Subscribe to news
              </button>
            </form>
          </div>
        </div>

        <div className="flex w-full max-w-[1120px] flex-col items-stretch text-lg text-white font-normal leading-loose mt-[50px] max-md:max-w-full max-md:mt-10">
          <div className="border min-h-px w-full border-white border-solid" />
          <div className="flex gap-10 flex-wrap mt-[50px] max-md:max-w-full max-md:mt-10">
            <div>© 2023 Positivus. All Rights Reserved.</div>
            <a
              href="/privacy"
              className="underline hover:text-[#B9FF66] transition-colors"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
