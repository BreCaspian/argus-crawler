module.exports = {
  "env": {
    "node": true,
    "es6": true,
    "jest": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 2018
  },
  "rules": {
    "no-console": "off",
    "semi": ["error", "always"],
    "quotes": ["warn", "single"],
    "indent": ["warn", 2],
    "comma-dangle": ["warn", "never"],
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
  }
}; 