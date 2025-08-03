#!/usr/bin/env node

const { execSync } = require("child_process");

console.log("Running all tests...\n");

try {
  execSync("npx jest --no-coverage", {
    stdio: "inherit",
  });
} catch (error) {
  console.error("Tests completed with errors");
  process.exit(1);
}
