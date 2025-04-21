import React from "react";

interface ServiceCardProps {
  title: string[];
  illustration: string;
  bgColor: string;
  labelBgColor: string;
  linkColor: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  title,
  illustration,
  bgColor,
  labelBgColor,
  linkColor,
}) => {
  return (
    <div
      className={`justify-between items-center shadow-[0px_5px_0px_0px_#191A23] ${bgColor} flex min-w-60 gap-[40px_67px] overflow-hidden flex-wrap w-[600px] p-[50px] rounded-[45px] max-md:max-w-full max-md:px-5`}
    >
      <div className="self-stretch flex flex-col items-stretch justify-center my-auto">
        <div className="flex flex-col items-stretch text-3xl text-black font-medium">
          {title.map((line, index) => (
            <div
              key={index}
              className={`${labelBgColor} px-[7px] rounded-[7px]`}
            >
              {line}
            </div>
          ))}
        </div>
        <div
          className={`gap-[15px] text-xl ${linkColor} font-normal leading-[1.4] mt-[93px] hover:underline cursor-pointer max-md:mt-10`}
        >
          Learn more
        </div>
      </div>
      <div className="self-stretch flex flex-col items-stretch justify-center w-[210px] my-auto py-0.5">
        <img
          src={illustration}
          alt={title.join(" ")}
          className="aspect-[1.27] object-contain w-[210px]"
        />
      </div>
    </div>
  );
};

export default ServiceCard;
