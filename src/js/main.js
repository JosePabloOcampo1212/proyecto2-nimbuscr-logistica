// Comportamiento común a todas las páginas: menú en pantallas angostas.
(() => {
  const boton = document.querySelector('.boton-menu');
  const menu = document.getElementById('menu-principal');
  if (!boton || !menu) return;

  const cerrar = () => {
    boton.setAttribute('aria-expanded', 'false');
    menu.classList.remove('abierto');
  };

  boton.addEventListener('click', () => {
    const abrir = boton.getAttribute('aria-expanded') !== 'true';
    boton.setAttribute('aria-expanded', String(abrir));
    menu.classList.toggle('abierto', abrir);
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && menu.classList.contains('abierto')) {
      cerrar();
      boton.focus();
    }
  });

  menu.addEventListener('click', (evento) => {
    if (evento.target.closest('a')) cerrar();
  });

  window.matchMedia('(min-width: 56.01rem)').addEventListener('change', (consulta) => {
    if (consulta.matches) cerrar();
  });
})();
