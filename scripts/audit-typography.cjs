// Rebuild the full production inventory when adding/changing a UI module.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(filename) : [filename];
  });
}

const modules = [];
const errors = [];
const adapters = new Set(['components/ui/text/native-text.tsx', 'components/self-ui/adaptive-sheet-components.tsx']);
const files = ['app', 'features', 'components', 'utils', 'hooks']
  .flatMap(walk)
  .filter((filename) => /\.tsx?$/.test(filename) && !/\.test\.|__tests__/.test(filename))
  .sort();

for (const filename of files) {
  const source = fs.readFileSync(filename, 'utf8');
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const textElements = new Set();
  let fontDeclarations = 0;
  function report(node, message) {
    errors.push(`${filename}:${ast.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${message}`);
  }
  function visit(node) {
    if (
      ts.isImportDeclaration(node) &&
      ['react-native', '@gorhom/bottom-sheet'].includes(node.moduleSpecifier.text) &&
      !node.importClause?.isTypeOnly &&
      node.importClause?.namedBindings &&
      ts.isNamedImports(node.importClause.namedBindings)
    ) {
      for (const item of node.importClause.namedBindings.elements) {
        if (
          !item.isTypeOnly &&
          ['Text', 'TextInput', 'BottomSheetTextInput'].includes(item.propertyName?.text ?? item.name.text) &&
          !adapters.has(filename)
        )
          report(item, 'unmanaged text primitive');
      }
    }
    if (ts.isPropertyAssignment(node) && ['fontFamily', 'fontSize', 'lineHeight'].includes(node.name.getText(ast))) {
      fontDeclarations++;
      if (node.name.getText(ast) === 'fontFamily' && ts.isStringLiteral(node.initializer))
        report(node, 'literal font family');
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(ast);
      if (/Text|Copy|Heading|Input|Label|Title/.test(tag)) textElements.add(tag);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (/\.tsx$/.test(filename) || fontDeclarations)
    modules.push({
      path: filename,
      textElements: [...textElements].sort(),
      fontDeclarations,
      managedAt: adapters.has(filename) ? 'native adapter boundary' : 'shared text / input / composed control',
    });
}

// Check the actual loaded aliases, including static italic/weight variants.
const tokens = fs.readFileSync('constants/design-tokens.ts', 'utf8');
const registry = fs.readFileSync('constants/font-assets.ts', 'utf8');
const fontBlock = tokens.match(/  font: \{([\s\S]*?)\n  \},/)[1];
for (const [, face] of fontBlock.matchAll(/: '([^']+)'/g)) {
  if (!registry.includes(`${face}: require(`)) errors.push(`font face has no startup asset: ${face}`);
}
for (const [, asset] of registry.matchAll(/require\('([^']+)'\)/g)) {
  if (!fs.existsSync(path.resolve('constants', asset))) errors.push(`font asset missing: ${asset}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
const result = JSON.stringify({ scope: 'all production UI and typography declarations', modules }, null, 2) + '\n';
const target = 'design/typography-inventory.json';
if (process.argv.includes('--check')) {
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== result) {
    console.error('Typography inventory changed. Run node scripts/audit-typography.cjs and review the new entries.');
    process.exit(1);
  }
} else {
  fs.writeFileSync(target, result);
}
console.log(
  `Typography inventory: ${files.length} source modules scanned, ${modules.length} UI/style modules recorded, ${modules.filter((m) => m.textElements.length || m.fontDeclarations).length} with direct text/style declarations; no unmanaged fonts.`,
);
