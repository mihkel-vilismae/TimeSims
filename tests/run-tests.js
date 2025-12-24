const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const vm = require('vm');

// Simple TypeScript test runner that transpiles .test.ts files on the fly
// using the TypeScript compiler API.  Each test file must export an
// async function named `runTests` which contains its assertions.  Tests
// should use Node's built‑in `assert` module for assertions.

async function runTestFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      strict: true,
      esModuleInterop: true
    },
    fileName: path.basename(filePath)
  }).outputText;
  const sandbox = {
    require: (mod) => {
      if (mod === 'assert') return require('assert');
      // Allow requiring project files via relative paths
      return require(mod);
    },
    console,
    exports: {},
    module: { exports: {} },
    __dirname: path.dirname(filePath),
    __filename: filePath,
    process
  };
  vm.runInNewContext(transpiled, sandbox, { filename: filePath });
  const exported = sandbox.module.exports;
  if (exported && typeof exported.runTests === 'function') {
    await exported.runTests();
  } else {
    console.warn(`No runTests() exported by ${filePath}`);
  }
}

async function run() {
  const testDir = __dirname;
  const files = fs
    .readdirSync(testDir)
    .filter((f) => f.endsWith('.test.ts'))
    .sort();
  let failures = 0;
  for (const file of files) {
    const fp = path.join(testDir, file);
    try {
      await runTestFile(fp);
      console.log('PASS', file);
    } catch (err) {
      failures++;
      console.error('FAIL', file, err);
    }
  }
  if (failures > 0) {
    console.error('Test failures:', failures);
    process.exit(1);
  } else {
    console.log('All tests passed');
  }
}

run().catch((err) => {
  console.error('Fatal test runner error', err);
  process.exit(1);
});