module.exports = function(config){
  config.set({
    files: [
      "dist/**/*.spec.js",
      { pattern: "dist/**/*.js", included: false, mutated: true }
    ],
    testFramework: "mocha",
    testRunner: "mocha",
    mutator: "javascript",
    reporter: ["clear-text", "html"],
    coverageAnalysis: "perTest",
    thresholds: {
      high: 80,
      low: 60,
      break: 60
    },
    plugins: ["stryker-mocha-framework", 'stryker-mocha-runner', "stryker-javascript-mutator", "stryker-html-reporter"]
  });
};