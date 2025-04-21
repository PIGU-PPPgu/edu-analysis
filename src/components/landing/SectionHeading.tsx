import React from "react";

interface SectionHeadingProps {
  title: string;
  description: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({
  title,
  description,
}) => {
  return (
    <div className="flex gap-10 text-black flex-wrap px-[100px] max-md:px-5">
      <div className="text-[40px] font-medium whitespace-nowrap">
        <div className="bg-[#B9FF66] px-[7px] rounded-[7px]">{title}</div>
      </div>
      <div className="text-lg font-normal w-[580px] max-md:max-w-full">
        {description}
      </div>
    </div>
  );
};

export default SectionHeading;
