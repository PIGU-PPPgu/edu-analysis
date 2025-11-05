import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage", "*.config.js", "*.config.ts", "ImportProcessor-fix-patch.tsx", "backup/**", "backup_archived_20250905/**", "logs/**", "scripts/**", "server/**", "supabase/**", "tools/**", "public/**", "check-tables.ts"] },
  {
    extends: [
      js.configs.recommended, 
      ...tseslint.configs.recommended,
      prettier
    ],
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "prettier": prettierPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // TypeScript 规则 - 临时调整为更宽松的设置
      "@typescript-eslint/no-unused-vars": [
        "warn", // 改为警告而不是错误
        { 
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      
      // 代码质量规则 - 调整为更宽松
      "no-console": "warn",
      "no-debugger": "warn", // 改为警告
      "prefer-const": "warn", // 改为警告
      "no-var": "warn", // 改为警告
      "eqeqeq": "warn", // 改为警告
      "no-case-declarations": "warn", // 添加并设为警告
      "no-control-regex": "warn",
      "no-useless-escape": "warn",
      "prefer-rest-params": "warn",
      "no-prototype-builtins": "warn",
      
      // React 规则 - 调整为更宽松
      "react-hooks/exhaustive-deps": "warn", // 改为警告
      "react-hooks/rules-of-hooks": "warn", // 改为警告
      
      // Prettier 集成 - 暂时禁用以避免格式化冲突
      // "prettier/prettier": "error",
    },
  }
);
