// Offline regression suite: deliberately no database setup/global teardown.
module.exports = {
  rootDir: __dirname,
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/__tests__/server/*preview*.servertest.ts"],
  transform: {
    "^.+\\.[jt]sx?$": [
      "next/dist/build/swc/jest-transformer",
      { isServer: true },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@langfuse/shared$": "<rootDir>/../packages/shared/src/index.ts",
    "^@langfuse/shared/src/server$":
      "<rootDir>/../packages/shared/src/server/index.ts",
  },
};
