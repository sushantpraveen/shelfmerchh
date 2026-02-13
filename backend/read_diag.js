const fs = require('fs');
const filename = process.argv[2] || 'diag_out_2.txt';
const buffer = fs.readFileSync(filename);
console.log(buffer.toString('utf16le'));
console.log('\n--- TRIED UTF16LE ---\n');
console.log(buffer.toString('utf8'));
console.log('\n--- TRIED UTF8 ---\n');
