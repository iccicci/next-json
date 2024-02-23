const match = process.version.match(/v(\d+)/);
const ge18 = match && parseInt(match[1], 10) >= 18;

module.exports = {
  collectCoverageFrom: ["index.ts", ...(process.env.PARSER ? ["parser.ts"] : [])],
  preset:              "ts-jest",
  testEnvironment:     "jest-environment-node-single-context",
  ...(ge18 ? undefined : { testPathIgnorePatterns: ["polyfill"] })
};
