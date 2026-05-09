const fs = require('fs');

const sql = fs.readFileSync('backend/src/main/resources/data/seed_faq_data.sql', 'utf8');

// Match each VALUES tuple: ('question', NULL|'sql', 'type', NULL|'answer', 1)
const re = /\('((?:[^']|'')*)',\s*(NULL|'(?:[^']|'')*'),\s*'([^']*)',\s*(NULL|'(?:[^']|'')*'),\s*(\d+)\)/g;

let m;
const rows = [];

while ((m = re.exec(sql)) !== null) {
  const question = m[1].replace(/''/g, "'");
  const generated_sql = m[2] === 'NULL' ? '' : m[2].replace(/^'|'$/g, '').replace(/''/g, "'");
  const type = m[3];
  const answer = m[4] === 'NULL' ? '' : m[4].replace(/^'|'$/g, '').replace(/''/g, "'");
  const is_valid = m[5];
  rows.push({ question, generated_sql, type, answer, is_valid });
}

console.log(`Total entries: ${rows.length}`);

// Write CSV
function csvEscape(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const header = 'question,generated_sql,type,answer,is_valid';
const csvRows = rows.map(r => 
  [r.question, r.generated_sql, r.type, r.answer, r.is_valid].map(csvEscape).join(',')
);

const csvContent = header + '\n' + csvRows.join('\n') + '\n';
fs.writeFileSync('backend/src/main/resources/data/seed_faq_data.csv', csvContent, 'utf8');
console.log(`CSV written to backend/src/main/resources/data/seed_faq_data.csv`);
