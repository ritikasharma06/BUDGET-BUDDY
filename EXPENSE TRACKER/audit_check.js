const fs = require('fs');
const js = fs.readFileSync('app.js', 'utf8');
const lines = js.split('\n');

console.log('--- Checking innerHTML assignments in app.js ---');
lines.forEach((line, i) => {
    if (line.includes('.innerHTML =') && (line.includes('${') || line.includes('+'))) {
        console.log(`Line ${i + 1}: ${line.trim().slice(0, 100)}`);
    }
});
