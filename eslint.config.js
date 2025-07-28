import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage", "*.config.js", "*.config.ts", "ImportProcessor-fix-patch.tsx", "backup/**", "logs/**", "scripts/**", "server/**", "supabase/**", "tools/**", "public/**"] },
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
      // TypeScript 严格规则
      "@typescript-eslint/no-unused-vars": [
        "error",
        { 
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      // 暂时禁用需要类型信息的规则，直到解决配置问题
      // "@typescript-eslint/prefer-nullish-coalescing": "error",
      // "@typescript-eslint/prefer-optional-chain": "error", 
      // "@typescript-eslint/no-unnecessary-condition": "error",
      
      // 代码质量规则
      "no-console": "warn",
      "no-debugger": "error",
      "prefer-const": "error",
      "no-var": "error",
      "eqeqeq": ["error", "always"],
      
      // React 规则
      "react-hooks/exhaustive-deps": "error",
      
      // Prettier 集成
      "prettier/prettier": "error",
    },
  }
);
