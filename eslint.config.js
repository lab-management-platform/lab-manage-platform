import js from "@eslint/js";
import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "node_modules/**",
      "apps/web/public/mammoth.browser.min.js",
      "apps/web/public/pdf.mjs",
      "apps/web/public/pdf.worker.min.mjs",
      "apps/web/scripts/**"
    ]
  },
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        ...globals.node,
        ...globals.browser
      }
    },
    plugins: {
      "@typescript-eslint": tseslint
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error"
    }
  },
  {
    files: ["packages/core/src/**/*.ts", "plugins/*/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../plugins/*", "../plugins/*"],
              message: "核心包和业务插件之间只能通过 PluginManifest、Port、Event 契约交互。"
            }
          ]
        }
      ]
    }
  },
  prettier
];
