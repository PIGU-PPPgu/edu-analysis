import React from "react";

interface TeamMemberProps {
  name: string;
  position: string;
  description: string;
  image: string;
}

const TeamMember: React.FC<TeamMemberProps> = ({
  name,
  position,
  description,
  image,
}) => {
  return (
    <div className="bg-white shadow-[0px_5px_0px_rgba(25,26,35,1)] border min-w-60 min-h-[331px] overflow-hidden w-[387px] pt-10 pb-[63px] px-[35px] rounded-[45px] border-[rgba(25,26,35,1)] border-solid max-md:px-5">
      <div className="w-full max-w-[317px]">
        <div className="flex w-full gap-[-67px]">
          <div className="flex min-w-60 w-full gap-5 flex-1 shrink basis-[0%] pr-[43px]">
            <img
              src={image}
              alt={name}
              className="aspect-[1.03] object-contain w-[106px] shrink-0"
            />
            <div className="flex flex-col items-stretch w-[148px] rounded-[0px_0px_0px_0px]">
              <div className="text-xl font-medium">{name}</div>
              <div className="text-lg font-normal">{position}</div>
            </div>
          </div>
        </div>
        <div className="border min-h-px w-full mt-7 border-black border-solid" />
        <div className="text-lg font-normal mt-7">{description}</div>
      </div>
    </div>
  );
};

export default TeamMember;
