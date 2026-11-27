// Servidor local para revisar dist/ antes de publicar.
// Aplica las mismas cabeceras del archivo _headers para detectar
// problemas de la política de seguridad (CSP) antes del despliegue.

import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const puerto = Number(process.env.PORT) || 8080;

if (!existsSync(dist)) {
  console.error('No existe dist/. Ejecute primero: npm run build');
  process.exit(1);
}

const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
};

// Lee las cabeceras del bloque "/*" de _headers.
const cabeceras = {};
const archivoCabeceras = join(dist, '_headers');
if (existsSync(archivoCabeceras)) {
  let enBloqueGeneral = false;
  for (const linea of readFileSync(archivoCabeceras, 'utf8').split('\n')) {
    if (!linea.trim() || linea.trim().startsWith('#')) continue;
    if (!/^\s/.test(linea)) {
      enBloqueGeneral = linea.trim() === '/*';
      continue;
    }
    if (enBloqueGeneral) {
      const [nombre, ...valor] = linea.trim().split(':');
      const clave = nombre.toLowerCase();
      if (clave === 'strict-transport-security') continue;
      let contenido = valor.join(':').trim();
      // En http://localhost no hay HTTPS: se quita la directiva que fuerza https.
      if (clave === 'content-security-policy') contenido = contenido.replace(/;\s*upgrade-insecure-requests/, '');
      cabeceras[nombre] = contenido;
    }
  }
}

createServer((req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let archivo = normalize(join(dist, ruta));
  if (!archivo.startsWith(dist)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(archivo) && statSync(archivo).isDirectory()) archivo = join(archivo, 'index.html');

  let estado = 200;
  if (!existsSync(archivo) || ruta.endsWith('_headers')) {
    archivo = join(dist, '404.html');
    estado = 404;
  }

  res.writeHead(estado, {
    ...cabeceras,
    'Content-Type': tipos[extname(archivo)] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  res.end(readFileSync(archivo));
  console.log(`${estado} ${req.method} ${ruta}`);
}).listen(puerto, () => {
  console.log(`Sitio disponible en http://localhost:${puerto}`);
});
