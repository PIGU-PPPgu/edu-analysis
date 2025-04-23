
import React from "react";
import { Link } from "react-router-dom";

const Navbar: React.FC = () => {
  return (
    <div className="flex w-full max-w-[1440px] items-center gap-[40px_100px] overflow-hidden justify-between flex-wrap px-[100px] max-md:max-w-full max-md:px-5">
      <div className="self-stretch flex gap-2.5 overflow-hidden w-[220px] my-auto py-2.5">
        <Link to="/">
          <img
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/5404ad9ad18a6dff6da5f0646acd0f77aa36f47d?placeholderIfAbsent=true"
            className="aspect-[6.1] object-contain w-[220px]"
            alt="Company logo"
          />
        </Link>
      </div>
      <div className="self-stretch flex min-w-60 items-center gap-10 text-xl text-black font-normal leading-[1.4] justify-center flex-wrap my-auto max-md:max-w-full">
        <a
          href="#about"
          className="self-stretch my-auto hover:text-gray-600 transition-colors"
        >
          About us
        </a>
        <a
          href="#services"
          className="self-stretch my-auto hover:text-gray-600 transition-colors"
        >
          Services
        </a>
        <a
          href="#cases"
          className="self-stretch my-auto hover:text-gray-600 transition-colors"
        >
          Use Cases
        </a>
        <a
          href="#pricing"
          className="self-stretch my-auto hover:text-gray-600 transition-colors"
        >
          Pricing
        </a>
        <a
          href="#blog"
          className="self-stretch my-auto hover:text-gray-600 transition-colors"
        >
          Blog
        </a>
        <button
          className="self-stretch gap-2.5 text-center my-auto px-[35px] py-5 rounded-[14px] hover:bg-gray-100 transition-colors max-md:px-5"
          onClick={() => console.log("Request a quote clicked")}
        >
          Request a quote
        </button>
      </div>
    </div>
  );
};

export default Navbar;
