import React, { useState } from "react";

interface ProcessStepProps {
  number: string;
  title: string;
  description?: string;
  isOpen?: boolean;
}

const ProcessStep: React.FC<ProcessStepProps> = ({
  number,
  title,
  description,
  isOpen = false,
}) => {
  const [expanded, setExpanded] = useState(isOpen);

  return (
    <div
      className={`items-stretch border shadow-[0px_5px_0px_0px_#191A23] ${expanded && description ? "bg-[#B9FF66]" : "bg-[#F3F3F3]"} flex w-full max-w-[1234px] flex-col overflow-hidden text-black font-medium justify-center ${expanded && description ? "" : "mt-[30px]"} pl-[60px] pr-[57px] py-[41px] rounded-[45px] border-solid border-[#191A23] max-md:max-w-full max-md:px-5`}
    >
      <div className="flex w-full max-w-[1117px] items-center gap-[40px_100px] overflow-hidden justify-between flex-wrap max-md:max-w-full">
        <div className="self-stretch flex min-w-60 items-center gap-[25px] flex-wrap my-auto max-md:max-w-full">
          <div className="text-6xl self-stretch my-auto max-md:text-[40px]">
            {number}
          </div>
          <div className="text-3xl self-stretch w-[612px] my-auto max-md:max-w-full">
            {title}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="self-stretch w-[58px] my-auto focus:outline-none"
          aria-expanded={expanded}
          aria-controls={`process-step-${number}-content`}
        >
          {expanded && description ? (
            <div className="stroke-[1px] border bg-[#F3F3F3] flex flex-col items-center justify-center w-[58px] h-[58px] stroke-[#191A23] px-1.5 rounded-[50%] border-[rgba(25,26,35,1)] border-solid">
              <div className="bg-black flex w-[18px] shrink-0 h-[5px]" />
            </div>
          ) : (
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/66c44a7ca3e938a0f3f04845c891b9d47cd1d62e?placeholderIfAbsent=true"
              alt="Expand"
              className="aspect-[1] object-contain w-[58px] self-stretch shrink-0 my-auto"
            />
          )}
        </button>
      </div>

      {expanded && description && (
        <>
          <div className="border min-h-0 w-full mt-[30px] border-black border-solid" />
          <div
            id={`process-step-${number}-content`}
            className="text-black text-lg font-normal mt-[30px] max-md:max-w-full"
          >
            {description}
          </div>
        </>
      )}
    </div>
  );
};

export default ProcessStep;
