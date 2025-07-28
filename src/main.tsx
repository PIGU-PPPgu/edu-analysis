import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// 导入知识点管理控制台命令
import "./services/knowledgePointManagementCommands";

createRoot(document.getElementById("root")!).render(<App />);
