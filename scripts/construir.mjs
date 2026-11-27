// Construye el sitio en dist/:
// 1. Copia src/ a dist/ sin los parciales ni la hoja de entrada de Tailwind.
// 2. Inserta el encabezado, el pie y los íconos en cada página HTML.
// La hoja de estilos la compila después la CLI de Tailwind (ver package.json).

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(raiz, 'src');
const dist = join(raiz, 'dist');
const parciales = join(src, 'parciales');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

cpSync(src, dist, {
  recursive: true,
  filter: (origen) => {
    const ruta = relative(src, origen).split(sep).join('/');
    return !ruta.startsWith('parciales') && ruta !== 'css/entrada.css';
  },
});

const leerParcial = (nombre) => {
  const archivo = join(parciales, `${nombre}.html`);
  if (!existsSync(archivo)) throw new Error(`No existe el parcial "${nombre}"`);
  return readFileSync(archivo, 'utf8').trim();
};

const icono = (nombre, clase = '') => {
  const archivo = join(parciales, 'iconos', `${nombre}.svg`);
  if (!existsSync(archivo)) throw new Error(`No existe el ícono "${nombre}"`);
  const clases = ['icono', clase].filter(Boolean).join(' ');
  return `<svg class="${clases}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${readFileSync(archivo, 'utf8').trim()}</svg>`;
};

const anio = String(new Date().getFullYear());
let paginas = 0;

for (const archivo of readdirSync(dist).filter((n) => n.endsWith('.html'))) {
  const ruta = join(dist, archivo);
  let html = readFileSync(ruta, 'utf8');

  // <!-- incluir:encabezado activo=servicios -->
  html = html.replace(/<!--\s*incluir:([\w-]+)(?:\s+activo=([\w-]+))?\s*-->/g, (_, nombre, activo) => {
    let parcial = leerParcial(nombre);
    if (activo) {
      parcial = parcial.replaceAll(`data-nav="${activo}"`, `data-nav="${activo}" aria-current="page"`);
    }
    return parcial;
  });

  // <!-- icono:truck clase="icono-lg" -->
  html = html.replace(/<!--\s*icono:([\w-]+)(?:\s+clase="([^"]*)")?\s*-->/g, (_, nombre, clase) => icono(nombre, clase));

  html = html.replaceAll('{{anio}}', anio);

  if (/<!--\s*(incluir|icono):/.test(html) || html.includes('{{')) {
    throw new Error(`Quedó una marca sin resolver en ${archivo}`);
  }

  writeFileSync(ruta, html);
  paginas += 1;
}

console.log(`Sitio construido en dist/ (${paginas} páginas).`);
