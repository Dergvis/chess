import hooks from 'eslint-plugin-react-hooks';
import parser from '@typescript-eslint/parser';
export default [{files:['src/**/*.{ts,tsx}'],plugins:{"react-hooks":hooks},languageOptions:{parser,parserOptions:{ecmaVersion:2022,sourceType:'module',ecmaFeatures:{jsx:true}}},rules:{'no-debugger':'error','no-dupe-else-if':'error','use-isnan':'error','valid-typeof':'error'}}];
