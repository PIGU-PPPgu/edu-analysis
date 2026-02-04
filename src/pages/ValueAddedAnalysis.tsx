import React from "react";
import Navbar from "@/components/shared/Navbar";
import { ValueAddedMainDashboard } from "@/components/value-added/ValueAddedMainDashboard";

const ValueAddedAnalysis: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <ValueAddedMainDashboard />
      </div>
    </div>
  );
};

export default ValueAddedAnalysis;
