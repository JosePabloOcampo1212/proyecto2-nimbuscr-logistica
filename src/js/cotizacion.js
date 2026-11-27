// Validación del formulario de cotización antes de enviarlo a Netlify Forms.
// Sin JavaScript, el navegador aplica la validación nativa (required, type, pattern).
(() => {
  const formulario = document.getElementById('form-cotizacion');
  if (!formulario) return;

  const resumen = document.getElementById('resumen-errores');
  const lista = document.getElementById('lista-errores');
  const fecha = document.getElementById('fecha');

  formulario.noValidate = true;

  // La recolección no puede programarse en el pasado (hora de Costa Rica).
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(new Date());
  if (fecha) fecha.min = hoy;

  const reglas = [
    { id: 'nombre', valida: (c) => c.value.trim().length >= 3 },
    { id: 'correo', valida: (c) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.value.trim()) },
    { id: 'telefono', valida: (c) => /^(\+?506[\s-]?)?\d{4}[\s-]?\d{4}$/.test(c.value.trim()) },
    { id: 'servicio', valida: (c) => c.value !== '' },
    { id: 'tipo-carga', valida: (c) => c.value !== '' },
    { id: 'peso', valida: (c) => Number(c.value) >= 1 && Number(c.value) <= 30000 },
    { id: 'origen', valida: (c) => c.value.trim().length >= 3 },
    { id: 'destino', valida: (c) => c.value.trim().length >= 3 },
    { id: 'fecha', valida: (c) => c.value === '' || c.value >= hoy },
    { id: 'consentimiento', valida: (c) => c.checked },
  ];

  const marcar = (campo, valido) => {
    const error = document.getElementById(`${campo.id}-error`);
    if (valido) campo.removeAttribute('aria-invalid');
    else campo.setAttribute('aria-invalid', 'true');
    if (error) error.classList.toggle('visible', !valido);
  };

  const validarCampo = (regla) => {
    const campo = document.getElementById(regla.id);
    if (!campo) return true;
    const valido = regla.valida(campo);
    marcar(campo, valido);
    return valido;
  };

  // Revalida al salir de un campo que ya mostraba error.
  for (const regla of reglas) {
    const campo = document.getElementById(regla.id);
    if (!campo) continue;
    const evento = campo.type === 'checkbox' || campo.tagName === 'SELECT' ? 'change' : 'blur';
    campo.addEventListener(evento, () => {
      if (campo.getAttribute('aria-invalid') === 'true') validarCampo(regla);
    });
  }

  formulario.addEventListener('submit', (evento) => {
    const fallidas = reglas.filter((regla) => !validarCampo(regla));
    if (fallidas.length === 0) {
      resumen.classList.remove('visible');
      return; // Se envía normalmente a Netlify Forms.
    }

    evento.preventDefault();
    lista.replaceChildren(...fallidas.map((regla) => {
      const mensaje = document.getElementById(`${regla.id}-error`)?.textContent ?? 'Revise este campo.';
      const enlace = document.createElement('a');
      enlace.href = `#${regla.id}`;
      enlace.textContent = mensaje;
      enlace.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById(regla.id)?.focus();
      });
      const item = document.createElement('li');
      item.append(enlace);
      return item;
    }));
    resumen.classList.add('visible');
    resumen.focus();
  });
})();
