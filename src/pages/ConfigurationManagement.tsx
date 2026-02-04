import React from "react";
import Navbar from "@/components/shared/Navbar";
import { ConfigurationManager } from "@/components/value-added/config/ConfigurationManager";

const ConfigurationManagementPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <ConfigurationManager />
      </div>
    </div>
  );
};

export default ConfigurationManagementPage;
