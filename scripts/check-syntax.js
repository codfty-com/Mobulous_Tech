import { readdirSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

const roots = ["api", "src", "server.js"];
const jsFiles = [];

const collectJsFiles = (path) => {
  const entries = readdirSync(path, { withFileTypes: true });

  for (const entry of entries) {
    const childPath = join(path, entry.name);

    if (entry.isDirectory()) {
      collectJsFiles(childPath);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      jsFiles.push(childPath);
    }
  }
};

for (const root of roots) {
  if (root.endsWith(".js")) {
    jsFiles.push(root);
  } else {
    collectJsFiles(root);
  }
}

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    process.stderr.write(`Syntax check failed for ${file}\n`);

    if (result.error) {
      process.stderr.write(`${result.error.message}\n`);
    }

    if (result.stderr) {
      process.stderr.write(result.stderr);
    } else if (result.stdout) {
      process.stderr.write(result.stdout);
    }

    process.exit(result.status || 1);
  }
}

console.log(`Syntax check passed for ${jsFiles.length} files.`);
