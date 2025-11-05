import React, { useState } from "react";
import SectionHeading from "./SectionHeading";

const ContactForm: React.FC = () => {
  const [formType, setFormType] = useState<"sayHi" | "getQuote">("sayHi");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState({
    email: "",
    message: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear errors when typing
    if (name === "email" || name === "message") {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = { email: "", message: "" };

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required";
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
      valid = false;
    }

    // Message validation
    if (!formData.message) {
      newErrors.message = "Message is required";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      console.log("Form submitted:", formData);
      // Here you would typically send the data to your backend
      alert("Message sent successfully!");

      // Reset form
      setFormData({
        name: "",
        email: "",
        message: "",
      });
    }
  };

  return (
    <section id="contact" className="mt-[140px] max-md:mt-10">
      <SectionHeading
        title="Contact Us"
        description="Connect with Us: Let's Discuss Your Digital Marketing Needs"
      />

      <div className="flex w-full items-center gap-[-367px] font-normal mt-20 pl-[100px] max-md:max-w-full max-md:mt-10 max-md:pl-5">
        <div className="bg-[#F3F3F3] self-stretch flex min-w-60 gap-2.5 w-[1240px] my-auto pt-[60px] pb-20 px-[100px] rounded-[45px] max-md:max-w-full max-md:px-5">
          <form
            className="flex min-w-60 w-[556px] flex-col items-stretch"
            onSubmit={handleSubmit}
          >
            <div className="flex gap-[35px] text-lg text-black">
              <div
                className={`flex items-start gap-[13px] w-[145px] rounded-[29px] cursor-pointer ${formType === "sayHi" ? "font-medium" : ""}`}
                onClick={() => setFormType("sayHi")}
              >
                <div
                  className={`${formType === "sayHi" ? "bg-[#B9FF66]" : "bg-white"} border flex w-[30px] shrink-0 h-[30px] rounded-[29px] border-black border-solid`}
                />
                <div className="basis-auto my-auto">Say Hi</div>
              </div>
              <div
                className={`flex items-start gap-[13px] w-[145px] rounded-[29px] cursor-pointer ${formType === "getQuote" ? "font-medium" : ""}`}
                onClick={() => setFormType("getQuote")}
              >
                <div
                  className={`${formType === "getQuote" ? "bg-[#B9FF66]" : "bg-white"} border flex w-[30px] shrink-0 h-[30px] rounded-[29px] border-black border-solid`}
                />
                <div className="basis-auto my-auto">Get a Quote</div>
              </div>
            </div>

            <div className="w-full whitespace-nowrap mt-10">
              <div className="w-full max-w-[556px] max-md:max-w-full">
                <label
                  htmlFor="name"
                  className="text-black text-base leading-7"
                >
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Name"
                  className="bg-white border w-full gap-2.5 overflow-hidden text-lg text-[rgba(137,137,137,1)] mt-[5px] px-[30px] py-[18px] rounded-[14px] border-black border-solid max-md:px-5 focus:outline-none focus:border-[#B9FF66]"
                />
              </div>

              <div className="w-full max-w-[556px] mt-[25px] max-md:max-w-full">
                <label
                  htmlFor="email"
                  className="text-black text-base leading-7"
                >
                  Email*
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email"
                  required
                  className={`bg-white border w-full gap-2.5 overflow-hidden text-lg mt-[5px] px-[30px] py-[18px] rounded-[14px] border-solid max-md:px-5 focus:outline-none focus:border-[#B9FF66] ${errors.email ? "border-red-500 text-red-500" : "border-black text-[rgba(137,137,137,1)]"}`}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div className="min-h-[223px] w-full max-w-[556px] mt-[25px] max-md:max-w-full">
                <label
                  htmlFor="message"
                  className="text-black text-base leading-7"
                >
                  Message*
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Message"
                  required
                  className={`bg-white border min-h-[190px] w-full gap-2.5 overflow-hidden text-lg mt-[5px] px-[30px] py-[18px] rounded-[14px] border-solid max-md:px-5 focus:outline-none focus:border-[#B9FF66] ${errors.message ? "border-red-500 text-red-500" : "border-black text-[rgba(137,137,137,1)]"}`}
                />
                {errors.message && (
                  <p className="text-red-500 text-sm mt-1">{errors.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="self-stretch bg-[#191A23] w-full gap-2.5 text-xl text-white text-center leading-[1.4] mt-10 px-[35px] py-5 rounded-[14px] hover:bg-[#2d2e3d] transition-colors max-md:px-5"
            >
              Send Message
            </button>
          </form>
        </div>
        <img
          src="https://cdn.builder.io/api/v1/image/assets/TEMP/63bbf7b8a18ba77222bb01cda063cb492ca57de8?placeholderIfAbsent=true"
          alt="Contact illustration"
          className="aspect-[0.72] object-contain w-[692px] self-stretch min-w-60 my-auto rounded-[0px_0px_0px_0px] max-md:max-w-full"
        />
      </div>
    </section>
  );
};

export default ContactForm;
