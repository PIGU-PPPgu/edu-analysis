import React from "react";
import SectionHeading from "./SectionHeading";
import ProcessStep from "./ProcessStep";

const WorkingProcess: React.FC = () => {
  const processSteps = [
    {
      number: "01",
      title: "Consultation",
      description:
        "During the initial consultation, we will discuss your business goals and objectives, target audience, and current marketing efforts. This will allow us to understand your needs and tailor our services to best fit your requirements.",
      isOpen: true,
    },
    {
      number: "02",
      title: "Research and Strategy Development",
      description:
        "We conduct thorough research on your industry, competitors, and target audience to develop a customized digital marketing strategy that aligns with your business goals.",
    },
    {
      number: "03",
      title: "Implementation",
      description:
        "Our team executes the strategy, implementing various digital marketing tactics such as SEO optimization, PPC campaigns, social media content, and more.",
    },
    {
      number: "04",
      title: "Monitoring and Optimization",
      description:
        "We continuously monitor the performance of your campaigns and make data-driven adjustments to optimize results and maximize ROI.",
    },
    {
      number: "05",
      title: "Reporting and Communication",
      description:
        "Regular reports are provided to keep you informed about the progress and performance of your digital marketing campaigns.",
    },
    {
      number: "06",
      title: "Continual Improvement",
      description:
        "We believe in constant improvement, so we regularly review and refine our strategies to ensure long-term success for your business.",
    },
  ];

  return (
    <section className="mt-[140px] max-md:mt-10">
      <SectionHeading
        title="Our Working Process"
        description="Step-by-Step Guide to Achieving Your Business Goals"
      />

      <div className="mt-20 px-[100px] max-md:max-w-full max-md:mr-1 max-md:mt-10 max-md:px-5">
        {processSteps.map((step, index) => (
          <ProcessStep
            key={step.number}
            number={step.number}
            title={step.title}
            description={step.description}
            isOpen={step.isOpen}
          />
        ))}
      </div>
    </section>
  );
};

export default WorkingProcess;
