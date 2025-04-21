import React from "react";
import SectionHeading from "./SectionHeading";

interface TestimonialProps {
  quote: string;
  name: string;
  position: string;
  variant: "standard" | "bubble1" | "bubble2";
}

const Testimonial: React.FC<TestimonialProps> = ({
  quote,
  name,
  position,
  variant,
}) => {
  return (
    <div className="flex min-w-60 flex-col w-[606px] max-md:max-w-full">
      {variant === "standard" && (
        <div className="flex max-w-full w-[606px] items-stretch gap-[40px_93px]">
          <div className="w-[502px] mt-12 max-md:mt-10">{quote}</div>
          <img
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/f1028502b692327053dcfda86b4d4dc1b6cc0ec7?placeholderIfAbsent=true"
            alt="Quote bubble"
            className="aspect-[0.98] object-contain w-fit fill-[#191A23] stroke-[1px] stroke-[#B9FF66] grow shrink-0 basis-0"
          />
        </div>
      )}

      {variant === "bubble1" && (
        <div className="max-w-full w-[606px]">
          <div className="flex flex-col relative fill-[#191A23] stroke-[1px] stroke-[#B9FF66] overflow-hidden min-h-[266px] w-full pt-12 pb-20 px-[52px] max-md:max-w-full max-md:px-5">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/c8d5c3e81877a56e6de4274edd981d3737271251?placeholderIfAbsent=true"
              alt="Quote bubble"
              className="absolute h-full w-full object-cover inset-0"
            />
            {quote}
          </div>
        </div>
      )}

      {variant === "bubble2" && (
        <div className="max-w-full w-[606px]">
          <div className="flex flex-col relative fill-[#191A23] stroke-[1px] stroke-[#B9FF66] overflow-hidden aspect-[1.03] w-full pt-12 pb-20 px-[52px] max-md:pl-5">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/0541f925bc51719b0a7f1d3fe895902ca562d5d8?placeholderIfAbsent=true"
              alt="Quote bubble"
              className="absolute h-full w-full object-cover inset-0"
            />
            {quote}
          </div>
        </div>
      )}

      <div className="mt-5 max-md:max-w-full">
        <span className="font-medium text-[20px] leading-[26px] text-[#B9FF66]">
          {name}
        </span>
        <br />
        {position}
      </div>
    </div>
  );
};

const Testimonials: React.FC = () => {
  const testimonialData = {
    quote:
      '"We have been working with Positivus for the past year and have seen a significant increase in website traffic and leads as a result of their efforts. The team is professional, responsive, and truly cares about the success of our business. We highly recommend Positivus to any company looking to grow their online presence."',
    name: "John Smith",
    position: "Marketing Director at XYZ Corp",
  };

  return (
    <section className="mt-[100px] max-md:mt-10">
      <SectionHeading
        title="Testimonials"
        description="Hear from Our Satisfied Clients: Read Our Testimonials to Learn More about Our Digital Marketing Services"
      />

      <div className="items-stretch bg-[#191A23] self-center flex w-full max-w-[1240px] flex-col overflow-hidden text-lg text-white font-normal justify-center mt-20 py-[76px] rounded-[45px] max-md:max-w-full max-md:mt-10">
        <div className="flex w-full flex-col items-center max-md:max-w-full">
          <div className="flex w-full gap-[40px_50px] justify-between overflow-x-auto px-[100px] max-md:px-5">
            <Testimonial
              quote={testimonialData.quote}
              name={testimonialData.name}
              position={testimonialData.position}
              variant="standard"
            />
            <Testimonial
              quote={testimonialData.quote}
              name={testimonialData.name}
              position={testimonialData.position}
              variant="bubble1"
            />
            <Testimonial
              quote={testimonialData.quote}
              name={testimonialData.name}
              position={testimonialData.position}
              variant="bubble2"
            />
          </div>
          <div className="flex justify-center items-center gap-4 min-h-3.5 w-[564px] max-w-full mt-[124px] max-md:mt-10">
            {[0, 1, 2].map((index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === 0
                    ? "bg-[#B9FF66] w-4 h-4"
                    : "bg-white opacity-70 hover:opacity-100"
                }`}
                onClick={() =>
                  console.log(`Navigate to testimonial ${index + 1}`)
                }
                aria-label={`View testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
