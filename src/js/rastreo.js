// Rastreo simulado de envíos.
// Lee las guías de /data/envios.json y calcula las fechas a partir de la hora
// actual, de modo que cada guía de demostración muestre un recorrido vigente.
(() => {
  const formulario = document.getElementById('form-rastreo');
  const campo = document.getElementById('codigo');
  const resultado = document.getElementById('resultado');
  const anuncio = document.getElementById('anuncio');
  if (!formulario || !campo || !resultado) return;

  const ETAPAS = [
    { id: 'recibido', nombre: 'Recibido' },
    { id: 'centro', nombre: 'En centro de distribución' },
    { id: 'transito', nombre: 'En tránsito' },
    { id: 'reparto', nombre: 'En reparto' },
    { id: 'entregado', nombre: 'Entregado' },
  ];
  const PATRON = /^NCR-\d{6}$/;
  const ZONA = 'America/Costa_Rica';
  const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const formatoEvento = new Intl.DateTimeFormat('es-CR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: ZONA,
  });
  const formatoDia = new Intl.DateTimeFormat('es-CR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: ZONA });
  const formatoHora = new Intl.DateTimeFormat('es-CR', { hour: 'numeric', minute: '2-digit', timeZone: ZONA });
  const formatoPeso = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 });

  // Crea elementos sin usar innerHTML.
  const crear = (etiqueta, atributos = {}, ...hijos) => {
    const elemento = document.createElement(etiqueta);
    for (const [clave, valor] of Object.entries(atributos)) {
      if (valor === null || valor === undefined || valor === false) continue;
      if (clave === 'clase') elemento.className = valor;
      else if (clave === 'texto') elemento.textContent = valor;
      else elemento.setAttribute(clave, valor === true ? '' : valor);
    }
    for (const hijo of hijos.flat()) {
      if (hijo === null || hijo === undefined || hijo === false) continue;
      elemento.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
    }
    return elemento;
  };

  const iconoSvg = (ruta) => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'icono');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.75');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    for (const d of ruta) {
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', d);
      svg.append(path);
    }
    return svg;
  };
  const ICONO_ALERTA = ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'];

  const normalizar = (valor) => {
    const limpio = valor.toUpperCase().replace(/[\s_]/g, '').replace(/[–—]/g, '-');
    if (/^NCR\d{6}$/.test(limpio)) return `NCR-${limpio.slice(3)}`;
    if (/^\d{6}$/.test(limpio)) return `NCR-${limpio}`;
    return limpio;
  };

  let datos = null;
  const cargarDatos = async () => {
    if (datos) return datos;
    const respuesta = await fetch('/data/envios.json', { headers: { Accept: 'application/json' } });
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    datos = await respuesta.json();
    return datos;
  };

  const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms));

  const mostrar = (...nodos) => {
    resultado.replaceChildren(...nodos);
  };

  const aviso = (tipo, titulo, texto) => crear('div', { clase: `aviso aviso-${tipo}` },
    iconoSvg(ICONO_ALERTA),
    crear('div', {}, crear('strong', { texto: titulo }), crear('p', { texto: texto })));

  // Costa Rica usa UTC-6 todo el año (no tiene horario de verano).
  const DESFASE_CR = 6;
  const HORA = 3600000;

  // Fecha de hoy en Costa Rica como { y, m, d }.
  const hoyEnCostaRica = () => {
    const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date()).split('-').map(Number);
    return { y, m, d };
  };

  // Instante de un evento: día relativo a la fecha base y hora local "HH:MM".
  const instante = (base, dia, hora) => {
    const [hh, mm] = hora.split(':').map(Number);
    return new Date(Date.UTC(base.y, base.m - 1, base.d + dia, hh + DESFASE_CR, mm));
  };

  const redondearA = (fecha, minutos) => {
    const paso = minutos * 60000;
    return new Date(Math.ceil(fecha.getTime() / paso) * paso);
  };

  // Hora estimada siempre en el futuro y dentro del horario de entregas (7:00 a 18:00).
  const ajustarEntrega = (estimada, hora, hoy, ahora) => {
    let fecha = estimada;
    const minimo = new Date(ahora.getTime() + 45 * 60000);
    // Si la hora prevista ya pasó, se intenta la misma hora hoy y, si tampoco alcanza, lo antes posible.
    if (fecha < minimo) fecha = instante(hoy, 0, hora);
    if (fecha < minimo) fecha = redondearA(minimo, 30);
    const local = new Date(fecha.getTime() - DESFASE_CR * HORA);
    const horaLocal = local.getUTCHours();
    if (horaLocal >= 18 || horaLocal < 7) {
      const diaExtra = horaLocal >= 18 ? 1 : 0;
      fecha = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + diaExtra, 9 + DESFASE_CR, 0));
    }
    return fecha;
  };

  const renderizarGuia = (codigo, envio) => {
    const ahora = new Date();
    const hoy = hoyEnCostaRica();
    // Si el último evento de hoy todavía no ha ocurrido, el recorrido se corre un día atrás.
    const final = envio.eventos[envio.eventos.length - 1];
    const corrimiento = instante(hoy, final.dia, final.hora) > ahora ? -1 : 0;

    const eventos = envio.eventos.map((evento) => ({ ...evento, fecha: instante(hoy, evento.dia + corrimiento, evento.hora) }));
    const ultimo = eventos[eventos.length - 1];
    const indiceActual = ETAPAS.findIndex((etapa) => etapa.id === ultimo.etapa);
    const entregado = ultimo.etapa === 'entregado';
    const conIncidencia = Boolean(envio.incidencia);

    let textoEstado = ETAPAS[indiceActual].nombre;
    let claseEstado = 'estado-curso';
    if (entregado) claseEstado = 'estado-entregado';
    if (conIncidencia) {
      textoEstado = 'Con incidencia';
      claseEstado = 'estado-retenido';
    }

    const progreso = crear('ol', { clase: 'progreso', 'aria-label': 'Etapas del envío' },
      ETAPAS.map((etapa, i) => {
        let clase = '';
        let estadoLector = 'pendiente';
        if (i < indiceActual || (entregado && i === indiceActual)) {
          clase = 'hecho';
          estadoLector = 'completada';
        } else if (i === indiceActual) {
          clase = conIncidencia ? 'actual detenido' : 'actual';
          estadoLector = conIncidencia ? 'etapa actual, detenida' : 'etapa actual';
        }
        return crear('li', { clase, 'aria-current': i === indiceActual ? 'step' : null },
          etapa.nombre.replace(' de distribución', ''),
          crear('span', { clase: 'sr-only', texto: `: ${estadoLector}` }));
      }));

    let tituloEntrega = 'Entrega estimada';
    let textoEntrega = 'Por confirmar';
    if (entregado) {
      tituloEntrega = 'Entregado';
      textoEntrega = formatoEvento.format(ultimo.fecha);
    } else if (!conIncidencia && envio.entrega_estimada) {
      const { dia, hora } = envio.entrega_estimada;
      const estimada = ajustarEntrega(instante(hoy, dia + corrimiento, hora), hora, hoy, ahora);
      textoEntrega = `${formatoDia.format(estimada)}, cerca de las ${formatoHora.format(estimada)}`;
    }

    const dato = (titulo, valor) => crear('div', {}, crear('dt', { texto: titulo }), crear('dd', { texto: valor }));
    const datosEnvio = crear('dl', { clase: 'datos-envio mt-8' },
      dato(tituloEntrega, textoEntrega),
      dato('Servicio', envio.servicio),
      dato('Contenido', envio.contenido),
      dato('Peso', `${formatoPeso.format(envio.peso_kg)} kg`),
      dato('Unidades', envio.unidad),
      dato('Remitente', envio.remitente),
      dato('Destinatario', envio.destinatario),
      envio.recibido_por ? dato('Recibió', envio.recibido_por) : null);

    const historial = crear('ol', { clase: 'historial' },
      [...eventos].reverse().map((evento) => crear('li', {},
        crear('time', { datetime: evento.fecha.toISOString(), texto: formatoEvento.format(evento.fecha) }),
        crear('div', {},
          crear('p', { texto: evento.detalle }),
          crear('p', { clase: 'lugar', texto: evento.lugar })))));

    const guia = crear('article', { clase: 'guia', 'aria-labelledby': 'guia-codigo' },
      crear('header', { clase: 'guia-encabezado' },
        crear('div', {},
          crear('p', { clase: 'guia-etiqueta', texto: 'Guía' }),
          crear('h2', { clase: 'guia-codigo', id: 'guia-codigo', tabindex: '-1', texto: codigo })),
        crear('span', { clase: `estado ${claseEstado}`, texto: textoEstado })),
      crear('div', { clase: 'guia-cuerpo' },
        crear('p', { clase: 'trayecto' },
          crear('span', { texto: envio.origen }),
          crear('span', { clase: 'hacia', texto: 'hacia' }),
          crear('span', { texto: envio.destino })),
        conIncidencia ? crear('div', { clase: 'mt-5' }, aviso('alerta', envio.incidencia.titulo, envio.incidencia.detalle)) : null,
        progreso,
        datosEnvio,
        crear('h3', { clase: 'mt-10 mb-5', texto: 'Historial del envío' }),
        historial));

    mostrar(guia);
    return `Guía ${codigo}: ${textoEstado}.`;
  };

  const buscar = async (valor, { enfocar = true } = {}) => {
    const codigo = normalizar(valor);
    campo.value = codigo;

    if (!PATRON.test(codigo)) {
      campo.setAttribute('aria-invalid', 'true');
      mostrar(aviso('error', 'Revise el número de guía', 'El número de guía empieza con NCR y sigue con seis dígitos, por ejemplo NCR-482915.'));
      anuncio.textContent = 'Número de guía con formato incorrecto.';
      campo.focus();
      return;
    }
    campo.removeAttribute('aria-invalid');
    history.replaceState(null, '', `?codigo=${encodeURIComponent(codigo)}`);

    mostrar(crear('div', { clase: 'cargando' }, crear('span', { clase: 'cargando-ruta', 'aria-hidden': 'true' }), `Buscando la guía ${codigo}…`));
    anuncio.textContent = `Buscando la guía ${codigo}.`;

    try {
      const [{ envios }] = await Promise.all([cargarDatos(), esperar(450)]);
      const envio = envios[codigo];
      if (!envio) {
        mostrar(aviso('error', `No encontramos la guía ${codigo}`, 'Revise el número en su comprobante de recolección o pruebe con una de las guías de demostración.'));
        anuncio.textContent = `No se encontró la guía ${codigo}.`;
        return;
      }
      anuncio.textContent = renderizarGuia(codigo, envio);
      if (enfocar) {
        resultado.scrollIntoView({ behavior: reducirMovimiento ? 'auto' : 'smooth', block: 'start' });
        document.getElementById('guia-codigo')?.focus({ preventScroll: true });
      }
    } catch (error) {
      mostrar(aviso('error', 'No se pudo consultar el rastreo', 'Revise su conexión a internet y vuelva a intentarlo en unos segundos.'));
      anuncio.textContent = 'No se pudo consultar el rastreo.';
    }
  };

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    buscar(campo.value);
  });

  campo.addEventListener('input', () => campo.removeAttribute('aria-invalid'));

  formulario.querySelectorAll('[data-codigo]').forEach((boton) => {
    boton.addEventListener('click', () => buscar(boton.dataset.codigo));
  });

  const inicial = new URLSearchParams(window.location.search).get('codigo');
  if (inicial) buscar(inicial, { enfocar: true });
})();
