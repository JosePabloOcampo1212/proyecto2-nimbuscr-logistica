# NimbusCR Soluciones Logísticas

Sitio web de una empresa ficticia de transporte de carga en Costa Rica. Proyecto No. 2 del curso 03102 Administración de Sitios Web (UNED). El contenido y los datos de rastreo son simulados.

## Páginas

| Archivo | Página |
| --- | --- |
| `index.html` | Inicio, con mapa de la red y rastreo rápido |
| `servicios.html` | Servicios de transporte, flota y cobertura |
| `rastreo.html` | Rastreo de envíos (simulado, lee `data/envios.json`) |
| `contacto.html` | Contacto y solicitud de cotización (Netlify Forms) |
| `gracias.html` | Confirmación después de enviar el formulario |
| `404.html` | Página para rutas que no existen |
| `estado.html` | Página de verificación para el monitoreo de disponibilidad |

Guías de demostración para el rastreo: `NCR-829461`, `NCR-935017`, `NCR-573104`, `NCR-618230`, `NCR-482915` y `NCR-704558`.

## Estructura

```
src/                 Código fuente del sitio
  parciales/         Encabezado, pie e íconos que se insertan al compilar
  css/entrada.css    Estilos con Tailwind CSS v4
  js/                Menú, rastreo y validación del formulario
  data/envios.json   Guías simuladas
  _headers           Cabeceras HTTP de seguridad para Netlify
scripts/
  construir.mjs      Copia src/ a dist/ e inserta los parciales
  servir.mjs         Servidor local que aplica las cabeceras de _headers
.github/workflows/
  deploy.yml         Pipeline de CI/CD con GitHub Actions
```

## Uso local

Requiere Node.js 20 o superior.

```bash
npm install
npm run build     # genera dist/
npm run preview   # http://localhost:8080
```

## Despliegue continuo

Cada push a `main` ejecuta `.github/workflows/deploy.yml`: instala dependencias, compila el sitio, lo publica en Netlify con `netlify-cli` y verifica que la URL responda 200 con las cabeceras de seguridad.

Para reproducirlo en otra cuenta:

1. Crear un proyecto vacío en Netlify: `npx netlify-cli@27.20.1 sites:create --name <nombre>`.
2. Activar **Forms → Enable form detection** en Netlify.
3. En GitHub, en **Settings → Secrets and variables → Actions**, crear los secrets `NETLIFY_AUTH_TOKEN` y `NETLIFY_SITE_ID` y la variable `SITE_URL`.
4. Hacer push a `main`.

## Seguridad

`src/_headers` define HSTS, Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy y Cross-Origin-Opener-Policy. El sitio no usa scripts ni estilos en línea ni recursos de terceros, por eso la CSP solo permite `'self'`.

## Créditos

- Tipografía Overpass, licencia SIL Open Font License 1.1 (`src/fonts/OFL.txt`).
- Íconos de Lucide, licencia ISC.
