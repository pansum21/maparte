import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf8');
const regex = /href="\/\?city=([^"&]+)/g;
const cities = [];
let match;
while ((match = regex.exec(html)) !== null) {
  cities.push(decodeURIComponent(match[1].replace(/\+/g, ' ')));
}
const unique = [...new Set(cities)];
console.log('Unique cities found:', unique.length);
console.log(unique);
