import fs from 'node:fs';
import path from 'node:path';

const [sourceDir, targetDir, mode] = process.argv.slice(2);

if (!sourceDir || !targetDir || !mode) {
  console.error('Usage: node copy-generated-typescript.mjs <sourceDir> <targetDir> <client|server>');
  process.exit(1);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.cpSync(sourceDir, targetDir, { recursive: true });

if (mode === 'client') {
  fixClientPaginationIndex(targetDir);
} else if (mode === 'server') {
  removeSelfImports(path.join(targetDir, 'server'));
} else {
  console.error(`Unknown generated client mode: ${mode}`);
  process.exit(1);
}

function fixClientPaginationIndex(targetDir) {
  const indexPath = path.join(targetDir, 'pagination', 'index.ts');

  if (!fs.existsSync(indexPath)) {
    return;
  }

  const indexSource = fs.readFileSync(indexPath, 'utf8');
  fs.writeFileSync(indexPath, indexSource.replace(/\.\/src[\\/]+pagination[\\/]+/g, './'));
}

function removeSelfImports(serverDir) {
  if (!fs.existsSync(serverDir)) {
    return;
  }

  for (const filePath of listTypeScriptFiles(serverDir)) {
    const source = fs.readFileSync(filePath, 'utf8');
    const updatedSource = source.replace(
      /import\s+(?:type\s+)?[\s\S]*?\s+from\s+["']([^"']+)["'];\r?\n/g,
      (statement, importPath) => (isSelfImport(filePath, importPath) ? '' : statement),
    );

    if (updatedSource !== source) {
      fs.writeFileSync(filePath, updatedSource);
    }
  }
}

function* listTypeScriptFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      yield* listTypeScriptFiles(entryPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      yield entryPath;
    }
  }
}

function isSelfImport(filePath, importPath) {
  if (!importPath.startsWith('.')) {
    return false;
  }

  const importedModule = normalizePath(path.resolve(path.dirname(filePath), importPath));
  const currentModule = normalizePath(path.resolve(filePath).replace(/\.ts$/, ''));

  return importedModule === currentModule;
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}
