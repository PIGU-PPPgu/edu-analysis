import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// 导入知识点管理控制台命令
import "./services/knowledgePointManagementCommands";

// 🎨 临时修复：强制初始化亮色主题
import "./forceThemeInit";

createRoot(document.getElementById("root")!).render(<App />);
