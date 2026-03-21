import { base, react } from '@forge/eslint-config';

export default [
  ...react,
  {
    ignores: ['**/dist/', '**/node_modules/', '**/target/', '**/.turbo/'],
  },
];
