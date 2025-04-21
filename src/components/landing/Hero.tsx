import React from "react";

const Hero: React.FC = () => {
  return (
    <div className="flex max-w-full w-[1440px] gap-[40px_100px] overflow-hidden text-xl font-normal justify-between flex-wrap mt-[70px] px-[100px] max-md:mt-10 max-md:px-5">
      <div className="flex min-w-60 flex-col items-stretch w-[531px] max-md:max-w-full">
        <h1 className="text-black text-6xl font-medium max-md:max-w-full max-md:text-[40px]">
          Navigating the digital landscape for success
        </h1>
        <p className="text-black leading-7 mt-[35px] max-md:max-w-full">
          Our digital marketing agency helps businesses grow and succeed online
          through a range of services including SEO, PPC, social media
          marketing, and content creation.
        </p>
        <button
          className="bg-[#191A23] gap-2.5 text-white text-center leading-[1.4] mt-[35px] px-[35px] py-5 rounded-[14px] hover:bg-[#2d2e3d] transition-colors max-md:px-5"
          onClick={() => console.log("Book a consultation clicked")}
        >
          Book a consultation
        </button>
      </div>
      <img
        src="https://cdn.builder.io/api/v1/image/assets/TEMP/2a765a16b6e08517be0488828bde52dace8cf284?placeholderIfAbsent=true"
        alt="Digital marketing illustration"
        className="aspect-[1.17] object-contain w-[600px] min-w-60 max-md:max-w-full"
      />
    </div>
  );
};

export default Hero;
