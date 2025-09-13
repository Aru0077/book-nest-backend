// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintNestJs from '@darraghor/eslint-plugin-nestjs-typed';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // 忽略文件配置
  {
    ignores: [
      'eslint.config.mjs', 
      'dist/**/*', 
      'node_modules/**/*',
      'coverage/**/*',
      '*.js',
      '*.mjs'
    ],
  },

  // 基础配置
  eslint.configs.recommended,
  
  // TypeScript 配置 - 使用推荐的类型检查规则
  ...tseslint.configs.recommendedTypeChecked,
  
  // NestJS 专用规则 - 2025年社区最佳实践
  eslintNestJs.configs.flatRecommended,
  
  // Prettier 集成
  eslintPluginPrettierRecommended,

  // 语言和解析器配置
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // 自定义规则配置
  {
    files: ['**/*.ts'],
    rules: {
      // TypeScript 规则 - 严格的类型安全配置
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off', // 允许类型断言，用于解决JWT类型问题
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
        destructuredArrayIgnorePattern: '^_'
      }],
      
      // 函数返回类型 - 对NestJS友好的配置
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
        allowDirectConstAssertionInArrowFunctions: true
      }],
      
      // Promise 处理
      '@typescript-eslint/no-misused-promises': ['error', {
        checksVoidReturn: false // NestJS 控制器兼容性
      }],
      
      // 代码质量规则
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      
      // Import 组织 - 简化版本
      'sort-imports': ['error', {
        ignoreDeclarationSort: true,
      }],

      // 针对测试文件的特殊规则
      ...(process.env.NODE_ENV === 'test' && {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off'
      })
    },
  },

  // 测试文件特殊配置
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off'
    }
  }
);