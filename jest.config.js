module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/server.ts"],
};
// Note: Adjust the `collectCoverageFrom` array to include or exclude files as needed.
// This configuration uses `ts-jest` to handle TypeScript files and sets the test environment to Node.js.
