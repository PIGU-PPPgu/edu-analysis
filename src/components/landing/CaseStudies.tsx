import React from "react";
import SectionHeading from "./SectionHeading";

interface CaseStudyProps {
  description: string;
}

const CaseStudy: React.FC<CaseStudyProps> = ({ description }) => {
  return (
    <div className="flex min-w-60 flex-col items-stretch w-[286px]">
      <p className="text-white text-lg">{description}</p>
      <div className="gap-[15px] text-xl text-[#B9FF66] leading-[1.4] mt-5 hover:underline cursor-pointer">
        Learn more
      </div>
    </div>
  );
};

const CaseStudies: React.FC = () => {
  const caseStudies = [
    "For a local restaurant, we implemented a targeted PPC campaign that resulted in a 50% increase in website traffic and a 25% increase in sales.",
    "For a B2B software company, we developed an SEO strategy that resulted in a first page ranking for key keywords and a 200% increase in organic traffic.",
    "For a national retail chain, we created a social media marketing campaign that increased followers by 25% and generated a 20% increase in online sales.",
  ];

  return (
    <section id="cases" className="mt-[140px] max-md:mt-10">
      <SectionHeading
        title="Case Studies"
        description="Explore Real-Life Examples of Our Proven Digital Marketing Success through Our Case Studies"
      />

      <div className="font-normal mt-20 px-[100px] max-md:max-w-full max-md:mr-1 max-md:mt-10 max-md:px-5">
        <div className="bg-[#191A23] flex gap-[40px_64px] flex-wrap px-[60px] py-[70px] rounded-[45px] max-md:max-w-full max-md:px-5">
          <CaseStudy description={caseStudies[0]} />
          <div className="border w-0 shrink-0 h-[186px] border-white border-solid" />
          <CaseStudy description={caseStudies[1]} />
          <div className="border w-0 shrink-0 h-[186px] border-white border-solid" />
          <CaseStudy description={caseStudies[2]} />
        </div>
      </div>
    </section>
  );
};

export default CaseStudies;
