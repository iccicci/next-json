module.exports = { collectCoverageFrom: ["index.ts", ...(process.env.PARSER ? ["parser.ts"] : [])], preset: "ts-jest", testEnvironment: "jest-environment-node-single-context" };
