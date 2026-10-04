import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const root = process.cwd();
const readme = readFileSync(
  process.argv[2] ?? path.join(root, "README.md"),
  "utf8"
);
const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) {
  throw new Error(
    ts.flattenDiagnosticMessageText(config.error.messageText, "\n")
  );
}
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const options = {
  ...parsed.options,
  allowJs: true,
  checkJs: true,
  noEmit: true,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
};

// Check the actual fences in separate modules, without executing API requests.
// TypeScript snippets share the import/client setup documented in the README.
const sources = new Map();
const locations = new Map();
for (const match of readme.matchAll(
  /```(typescript|javascript)\r?\n([\s\S]*?)```/g
)) {
  const [, language, code] = match;
  const line = readme.slice(0, match.index).split("\n").length + 1;
  const extension = language === "typescript" ? "mts" : "cjs";
  const file = path.join(root, "scripts", `readme-line-${line}.${extension}`);
  let setup = "";
  if (language === "typescript") {
    if (!/import\s*\{[^}]*\bKit\b[^}]*\}/.test(code)) {
      setup += 'import { Kit } from "@anthonyhagi/kit-node-sdk";\n';
    }
    if (!/\bconst\s+kit\b/.test(code)) {
      setup += 'const kit = new Kit({ apiKey: "YOUR_API_KEY" });\n';
    }
  }
  sources.set(file, `${setup}${code}`);
  locations.set(file, { line, setupLines: setup.split("\n").length - 1 });
}
if (sources.size === 0) {
  throw new Error("No TypeScript or JavaScript examples found in README.md");
}

const host = ts.createCompilerHost(options);
const getSourceFile = host.getSourceFile.bind(host);
host.getSourceFile = (
  file,
  languageVersion,
  onError,
  shouldCreateNewSourceFile
) => {
  if (sources.has(file)) {
    return ts.createSourceFile(
      file,
      sources.get(file),
      {
        languageVersion:
          typeof languageVersion === "object"
            ? languageVersion.languageVersion
            : languageVersion,
        impliedNodeFormat: file.endsWith(".cjs")
          ? ts.ModuleKind.CommonJS
          : ts.ModuleKind.ESNext,
      },
      true,
      file.endsWith(".cjs") ? ts.ScriptKind.JS : ts.ScriptKind.TS
    );
  }
  return getSourceFile(
    file,
    languageVersion,
    onError,
    shouldCreateNewSourceFile
  );
};
const program = ts.createProgram([...sources.keys()], options, host);
const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
for (const diagnostic of diagnostics) {
  let location = "";
  if (diagnostic.file && diagnostic.start !== undefined) {
    const position = diagnostic.file.getLineAndCharacterOfPosition(
      diagnostic.start
    );
    const example = locations.get(diagnostic.file.fileName);
    location = example
      ? `README.md:${example.line + position.line - example.setupLines}:${position.character + 1}: `
      : `${path.relative(root, diagnostic.file.fileName)}:${position.line + 1}:${position.character + 1}: `;
  }
  console.error(
    `${location}${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
  );
}
if (diagnostics.length > 0) {
  process.exitCode = 1;
} else {
  console.log(`Typechecked ${sources.size} README examples successfully.`);
}
