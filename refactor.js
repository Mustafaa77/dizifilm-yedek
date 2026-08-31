const fs = require('fs');
const path = 'lib/tmdb.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace('const BASE_URL = "/api/tmdb";', `const BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY || '';

async function apiFetch(endpoint) {
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = endpoint.startsWith('http') ? endpoint : \`\${BASE_URL}\${endpoint}\${separator}api_key=\${API_KEY}\`;
  return fetch(url);
}
`);

code = code.replace(/await fetch\(\s*`\$\{BASE_URL\}([^`]+)`\s*\)/g, 'await apiFetch(`$1`)');
code = code.replace(/await fetch\(url\)/g, 'await apiFetch(url.replace(BASE_URL, ""))'); // Since we replaced BASE_URL, searchByYear builds url with BASE_URL.

fs.writeFileSync(path, code);
console.log("Done");
