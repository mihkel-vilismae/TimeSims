const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const vm = require('vm');

// Custom test runner that transpiles both test files and any imported
// project TypeScript modules on the fly.  This avoids the need for
// external transpilers such as ts‑node and works in environments with
// restricted package installation.

// Compile and execute a TypeScript module.  The compiled code is
// executed in a fresh VM context with its own require function so
// imports of .ts files are also transpiled.
function compileModule(modulePath, parentDir) {
  const source = fs.readFileSync(modulePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      strict: true,
      esModuleInterop: true
    },
    fileName: path.basename(modulePath)
  }).outputText;
  const module = { exports: {} };
  const sandbox = {
    require: (mod) => {
      // Handle Node built‑ins and external modules normally.
      if (!mod.startsWith('.') && !mod.startsWith('/')) {
        return require(mod);
      }
      // Resolve the requested path relative to the current module.
      let resolved = path.resolve(parentDir, mod);
      // If the path does not end with .ts and a .ts file exists, append it.
      if (!resolved.endsWith('.ts') && fs.existsSync(resolved + '.ts')) {
        resolved = resolved + '.ts';
      }
      // If the resolved path still has no extension and a .js file exists,
      // fall back to Node's require for CommonJS modules.
      if (!path.extname(resolved)) {
        try {
          return require(resolved);
        } catch (err) {
          // continue on to TS compilation fallback below
        }
      }
      // If the file is a TypeScript source, compile and load it.
      if (resolved.endsWith('.ts')) {
        return compileModule(resolved, path.dirname(resolved));
      }
      // Otherwise use Node's require to load the module.
      return require(resolved);
    },
    console,
    exports: module.exports,
    module,
    __dirname: parentDir,
    __filename: modulePath,
    process,
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(transpiled, sandbox, { filename: modulePath });
  return module.exports;
}

// Run a single test file.  The test file must export an async runTests
// function.  Relative imports are resolved relative to the test file's
// directory and will compile .ts files on demand.
async function runTestFile(filePath) {
  const testDir = path.dirname(filePath);
  const testExports = compileModule(filePath, testDir);
  if (testExports && typeof testExports.runTests === 'function') {
    await testExports.runTests();
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