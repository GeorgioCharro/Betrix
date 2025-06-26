/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['@repo/eslint-config/react.js'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['tailwind.config.js', '../api/**/*'],
  rules: {
    'import/order': [
      'warn',
      {
        groups: [
          'builtin', // Node "fs", "path"
          'external', // NPM packages
          'internal', // Aliased imports (like "@/components")
          ['parent', 'sibling', 'index'], // Relative paths
        ],
        pathGroups: [
          {
            pattern: '@/**',
            group: 'internal',
          },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
        'newlines-between': 'always',
      },
    ],
    'unicorn/filename-case': 'off', // ✅ disabled filename casing rule
  },
};
