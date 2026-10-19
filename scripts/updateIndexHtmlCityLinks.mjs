import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '../index.html');
const citiesPath = path.resolve(__dirname, '../src/data/seoCities.json');

const cities = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));
let html = fs.readFileSync(indexPath, 'utf8');

for (const city of cities) {
  // Replace /?city=City+Name or /?city=City with /cities/slug
  const encodedPlus = encodeURIComponent(city.city).replace(/%20/g, '\\+');
  const encodedPercent = encodeURIComponent(city.city);
  
  const regex1 = new RegExp(`href="/\\?city=${encodedPlus}(&[^"]*)?"`, 'g');
  const regex2 = new RegExp(`href="/\\?city=${encodedPercent}(&[^"]*)?"`, 'g');
  const regex3 = new RegExp(`href="/\\?city=${city.city.replace(/ /g, '\\+')}(&[^"]*)?"`, 'g');

  html = html.replace(regex1, `href="/cities/${city.slug}"`);
  html = html.replace(regex2, `href="/cities/${city.slug}"`);
  html = html.replace(regex3, `href="/cities/${city.slug}"`);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Successfully updated city links in index.html to clean /cities/:slug routes');
