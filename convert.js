const fs = require('fs');
const path = require('path');
const marked = require('marked');

// 配置
const TEMPLATE = path.join(__dirname, 'docs/_template.html');
const OUTPUT_DIR = path.join(__dirname, 'docs');
const MD_DIR = path.join(__dirname, 'docs');

function convertMarkdown(mdPath) {
  const html = fs.readFileSync(TEMPLATE, 'utf8');
  const mdContent = fs.readFileSync(mdPath, 'utf8');
  const content = marked.parse(mdContent);

  return html.replace(
    '<main class="content" id="content"></main>',
    `<main class="content">${content}</main>`,
  );
}

// 遍历转换所有.md文件
fs.readdirSync(MD_DIR).forEach((file) => {
  if (path.extname(file) === '.md') {
    const htmlPath = path.join(OUTPUT_DIR, file.replace('.md', '.html'));
    const converted = convertMarkdown(path.join(MD_DIR, file));
    fs.writeFileSync(htmlPath, converted);
    console.log(`Converted: ${file} -> ${htmlPath}`);
  }
});
