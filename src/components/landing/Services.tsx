import React from "react";
import SectionHeading from "./SectionHeading";
import ServiceCard from "./ServiceCard";

const Services: React.FC = () => {
  const services = [
    {
      title: ["Search engine", "optimization"],
      illustration: "https://cdn.builder.io/api/v1/image/assets/TEMP/ec4d143d611b9fb5d8917b6653be90a8b5a0b573?placeholderIfAbsent=true",
      bgColor: "bg-[#F3F3F3]",
      labelBgColor: "bg-[#B9FF66]",
      linkColor: "text-black",
    },
    {
      title: ["Pay-per-click", "advertising"],
      illustration: "https://cdn.builder.io/api/v1/image/assets/TEMP/4fe1208f8c09d90ba2c1f91b4ef04b843588e53e?placeholderIfAbsent=true",
      bgColor: "bg-[#B9FF66]",
      labelBgColor: "bg-white",
      linkColor: "text-black",
    },
    {
      title: ["Social Media", "Marketing"],
      illustration: "https://cdn.builder.io/api/v1/image/assets/TEMP/f36782286a158b616e66e3c7916ff7e16bf28737?placeholderIfAbsent=true",
      bgColor: "bg-[#191A23]",
      labelBgColor: "bg-white",
      linkColor: "text-white",
    },
    {
      title: ["Email", "Marketing"],
      illustration: "https://cdn.builder.io/api/v1/image/assets/TEMP/33d5b088cf784246f712c7ccf983af05badf7867?placeholderIfAbsent=true",
      bgColor: "bg-[#F3F3F3]",
      labelBgColor: "bg-[#B9FF66]",
      linkColor: "text-black",
    },
    {
      title: ["Content", "Creation"],
      illustration: "https://cdn.builder.io/api/v1/image/assets/TEMP/75155b33a392121d78853aefabda89f2d11c4900?placeholderIfAbsent=true",
      bgColor: "bg-[#B9FF66]",
      labelBgColor: "bg-white",
      linkColor: "text-black",
    },
    {
      title: ["Analytics and ", "Tracking"],
      illustration: "https://cdn.builder.io/api/v1/image/assets/TEMP/39c84813e830450bfc8de68ac0492ad1e4dad984?placeholderIfAbsent=true",
      bgColor: "bg-[#191A23]",
      labelBgColor: "bg-[#B9FF66]",
      linkColor: "text-white",
    },
  ];

  return (
    <section id="services" className="mt-[140px] max-md:mt-10">
      <SectionHeading
        title="Services"
        description="At our digital marketing agency, we offer a range of services to help businesses grow and succeed online. These services include:"
      />

      <div className="mt-20 max-md:max-w-full max-md:mt-10">
        <div className="flex gap-10 flex-wrap px-[100px] max-md:max-w-full max-md:px-5">
          <ServiceCard {...services[0]} />
          <ServiceCard {...services[1]} />
        </div>

        <div className="flex gap-10 flex-wrap mt-10 px-[100px] max-md:max-w-full max-md:px-5">
          <ServiceCard {...services[2]} />
          <ServiceCard {...services[3]} />
        </div>

        <div className="flex gap-10 flex-wrap mt-10 px-[100px] max-md:max-w-full max-md:px-5">
          <ServiceCard {...services[4]} />
          <ServiceCard {...services[5]} />
        </div>
      </div>

      <div className="flex w-full items-center gap-[-715px] text-black font-normal flex-wrap mt-[100px] px-[100px] max-md:max-w-full max-md:mt-10 max-md:px-5">
        <div className="items-center bg-[#F3F3F3] self-stretch flex min-w-60 min-h-[347px] w-[1240px] my-auto px-[60px] rounded-[45px] max-md:max-w-full max-md:px-5">
          <div className="self-stretch flex min-w-60 w-[500px] flex-col items-stretch my-auto">
            <h3 className="text-3xl font-medium max-md:max-w-full">
              Let's make things happen
            </h3>
            <p className="text-lg mt-[26px] max-md:max-w-full">
              Contact us today to learn more about how our digital marketing
              services can help your business grow and succeed online.
            </p>
            <button
              className="bg-[#191A23] gap-2.5 text-xl text-white text-center leading-[1.4] mt-[26px] px-[35px] py-5 rounded-[14px] hover:bg-[#2d2e3d] transition-colors max-md:px-5"
              onClick={() => console.log("Get your free proposal clicked")}
            >
              Get your free proposal
            </button>
          </div>
        </div>
        <img
          src="https://cdn.builder.io/api/v1/image/assets/TEMP/94dd5313b887fba6192ace09a32d8f689e824aaf?placeholderIfAbsent=true"
          alt="Digital marketing illustration"
          className="aspect-[1.25] object-contain w-[494px] self-stretch min-w-60 my-auto max-md:max-w-full"
        />
      </div>
    </section>
  );
};

export default Services;
