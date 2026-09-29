// A11y lint (prd-ux-critica RF-F9.7): warn-only until the backlog reaches zero, then error.
// Standalone flat config (no @nuxt/eslint module) so the Nuxt build is untouched.
import pluginVue from 'eslint-plugin-vue'
import vueA11y from 'eslint-plugin-vuejs-accessibility'
import tseslint from 'typescript-eslint'

export default [
  { ignores: ['.nuxt/**', '.output/**', 'node_modules/**', 'dist/**', 'e2e/**', 'tests/**', 'scripts/**', 'public/**'] },
  ...pluginVue.configs['flat/essential'].map(c => ({ ...c, rules: {} })),
  {
    files: ['app/**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'], sourceType: 'module' } },
    plugins: { 'vuejs-accessibility': vueA11y },
    rules: {
      'vuejs-accessibility/alt-text': 'warn',
      'vuejs-accessibility/anchor-has-content': 'warn',
      'vuejs-accessibility/click-events-have-key-events': 'warn',
      'vuejs-accessibility/interactive-supports-focus': 'warn',
      'vuejs-accessibility/label-has-for': ['warn', { required: { some: ['nesting', 'id'] } }],
      'vuejs-accessibility/aria-props': 'warn',
      'vuejs-accessibility/aria-role': 'warn',
      'vuejs-accessibility/role-has-required-aria-props': 'warn',
      'vuejs-accessibility/tabindex-no-positive': 'warn',
      'vuejs-accessibility/no-autofocus': 'off',
    },
  },
]
