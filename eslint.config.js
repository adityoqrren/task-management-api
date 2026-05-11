import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import importPlugin from "eslint-plugin-import";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js, import: importPlugin },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      "import/no-unresolved": "error", // Menandai merah jika file/path tidak ketemu
      "import/named": "error",         // Menandai jika export name salah panggil
      "no-unused-vars": "warn"         // Opsional: memberi peringatan variabel nganggur
    },
    settings: {
      "import/resolver": {
        node: true
      },
      "import/core-modules": ["eslint/config", "eslint"]
    }
  },
]);
