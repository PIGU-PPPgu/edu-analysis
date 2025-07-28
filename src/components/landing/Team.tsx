import React from "react";
import SectionHeading from "./SectionHeading";
import TeamMember from "./TeamMember";

const Team: React.FC = () => {
  const teamMembers = [
    {
      name: "John Smith",
      position: "CEO and Founder",
      description:
        "10+ years of experience in digital marketing. Expertise in SEO, PPC, and content strategy",
      image:
        "https://cdn.builder.io/api/v1/image/assets/TEMP/ff0549d5449aba2e429c0a629c935792673cb366?placeholderIfAbsent=true",
    },
    {
      name: "Jane Doe",
      position: "Director of Operations",
      description:
        "7+ years of experience in project management and team leadership. Strong organizational and communication skills",
      image:
        "https://cdn.builder.io/api/v1/image/assets/TEMP/e08780f229cb49fd0d70d020c1dacd78f635973b?placeholderIfAbsent=true",
    },
    {
      name: "Michael Brown",
      position: "Senior SEO Specialist",
      description:
        "5+ years of experience in SEO and content creation. Proficient in keyword research and on-page optimization",
      image:
        "https://cdn.builder.io/api/v1/image/assets/TEMP/40a77ad3331e32eb712918dca85b7571c48a1d3f?placeholderIfAbsent=true",
    },
    {
      name: "Emily Johnson",
      position: "PPC Manager",
      description:
        "3+ years of experience in paid search advertising. Skilled in campaign management and performance analysis",
      image:
        "https://cdn.builder.io/api/v1/image/assets/TEMP/e0a11ad96befc9913007f369d2928cf52ae9df2c?placeholderIfAbsent=true",
    },
    {
      name: "Brian Williams",
      position: "Social Media Specialist",
      description:
        "4+ years of experience in social media marketing. Proficient in creating and scheduling content, analyzing metrics, and building engagement",
      image:
        "https://cdn.builder.io/api/v1/image/assets/TEMP/8aacfc92b373c2c6b75b667534729cdb72b457e5?placeholderIfAbsent=true",
    },
    {
      name: "Sarah Kim",
      position: "Content Creator",
      description:
        "2+ years of experience in writing and editing\nSkilled in creating compelling, SEO-optimized content for various industries",
      image:
        "https://cdn.builder.io/api/v1/image/assets/TEMP/b734b0b8f585b7410aaa06910d785412fd78da81?placeholderIfAbsent=true",
    },
  ];

  return (
    <section className="mt-[140px] max-md:mt-10">
      <SectionHeading
        title="Team"
        description="Meet the skilled and experienced team behind our successful digital marketing strategies"
      />

      <div className="text-black mt-20 max-md:max-w-full max-md:mt-10">
        <div className="flex gap-10 flex-wrap px-[100px] max-md:max-w-full max-md:px-5">
          {teamMembers.slice(0, 3).map((member, index) => (
            <TeamMember
              key={index}
              name={member.name}
              position={member.position}
              description={member.description}
              image={member.image}
            />
          ))}
        </div>

        <div className="flex gap-10 flex-wrap mt-10 px-[100px] max-md:max-w-full max-md:px-5">
          {teamMembers.slice(3, 6).map((member, index) => (
            <TeamMember
              key={index + 3}
              name={member.name}
              position={member.position}
              description={member.description}
              image={member.image}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-center mt-10">
        <button
          className="bg-[#191A23] gap-2.5 text-xl text-white font-normal text-center leading-[1.4] px-[35px] py-5 rounded-[14px] hover:bg-[#2d2e3d] transition-colors max-md:px-5"
          onClick={() => console.log("See all team clicked")}
        >
          See all team
        </button>
      </div>
    </section>
  );
};

export default Team;
