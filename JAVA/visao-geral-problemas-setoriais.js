/* NEXUS V2 — complemento não destrutivo de navegação.
   Carregar DEPOIS do visao-geral.js existente. */
(() => {
  'use strict';
  const botao = document.getElementById('botaoProblemasSetoriais');
  const submenu = document.getElementById('submenuProblemasSetoriais');
  const iframe = document.getElementById('iframeDashboard');
  const painel = document.getElementById('painelDinamico');
  const inicial = document.getElementById('paginaInicial');
  const titulo = document.getElementById('tituloPagina');
  const subtitulo = document.getElementById('subtituloPagina');
  const carregando = document.getElementById('painelCarregando');
  if (!botao || !submenu || !iframe || !painel || !inicial) return;

  const paginas = {
    'formulario-reuniao': { titulo: 'Formulário para a reunião', subtitulo: 'Registro de assuntos para as reuniões setoriais.' },
    'assuntos-por-setor': { titulo: 'Assuntos por setor', subtitulo: 'Acompanhamento e conclusão dos assuntos da reunião.' }
  };
  const abrirMenu = (aberto) => {
    submenu.hidden = !aberto;
    submenu.classList.toggle('aberto', aberto);
    botao.setAttribute('aria-expanded', String(aberto));
    botao.setAttribute('aria-label', aberto ? 'Recolher Problemas-Setoriais' : 'Expandir Problemas-Setoriais');
  };
  botao.addEventListener('click', (evento) => {
    evento.preventDefault();
    evento.stopImmediatePropagation();
    abrirMenu(submenu.hidden);
  }, true);

  submenu.querySelectorAll('[data-pagina][data-url]').forEach((item) => {
    item.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopImmediatePropagation();
      const pagina = item.dataset.pagina;
      const dados = paginas[pagina];
      if (!dados) return;
      document.querySelectorAll('.menu-item.ativo, .submenu-item.ativo').forEach(el => {
        el.classList.remove('ativo');
        el.removeAttribute('aria-current');
      });
      item.classList.add('ativo');
      item.setAttribute('aria-current', 'page');
      abrirMenu(true);
      if (titulo) titulo.textContent = dados.titulo;
      if (subtitulo) subtitulo.textContent = dados.subtitulo;
      inicial.hidden = true;
      painel.hidden = false;
      if (carregando) carregando.hidden = false;
      iframe.title = dados.titulo + ' — NEXUS';
      iframe.src = item.dataset.url;
    }, true);
  });

  iframe.addEventListener('load', () => {
    if (carregando) carregando.hidden = true;
  });
})();
