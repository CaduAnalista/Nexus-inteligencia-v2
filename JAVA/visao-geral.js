
/*
=====================================================
 NEXUS V2 — VISÃO GERAL
 Navegação dinâmica entre dashboards

 Protótipo demonstrativo
 Compatível com GitHub Pages
=====================================================
*/

(() => {
  "use strict";

  /* ================================================
     ELEMENTOS DO HTML
  ================================================= */

  const botaoVisaoGeral = document.getElementById(
    "botaoVisaoGeral"
  );

  const botaoExpandir = document.getElementById(
    "botaoExpandirMenu"
  );

  const submenu = document.getElementById(
    "submenuDashboards"
  );

  const paginaInicial = document.getElementById(
    "paginaInicial"
  );

  const painelDinamico = document.getElementById(
    "painelDinamico"
  );

  const iframe = document.getElementById(
    "iframeDashboard"
  );

  const carregando = document.getElementById(
    "painelCarregando"
  );

  const tituloPagina = document.getElementById(
    "tituloPagina"
  );

  const subtituloPagina = document.getElementById(
    "subtituloPagina"
  );

  const botoesDashboards = Array.from(
    document.querySelectorAll(
      ".submenu-item[data-pagina]"
    )
  );

  /* ================================================
     VERIFICAÇÃO DOS ELEMENTOS
  ================================================= */

  const elementosObrigatorios = [
    botaoVisaoGeral,
    botaoExpandir,
    submenu,
    paginaInicial,
    painelDinamico,
    iframe,
    carregando,
    tituloPagina,
    subtituloPagina
  ];

  if (elementosObrigatorios.some((item) => !item)) {
    console.error(
      "NEXUS: elementos da Visão Geral não encontrados."
    );

    return;
  }

  /* ================================================
     CONFIGURAÇÕES
  ================================================= */

  const REDUZIR_MOVIMENTO = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const DURACAO_TRANSICAO = REDUZIR_MOVIMENTO
    ? 0
    : 180;

  const PAGINAS = {
    "visao-geral": {
      titulo: "Visão Geral",
      subtitulo: "Central de Inteligência e Gestão Integrada"
    },

    "inteligencia": {
      titulo: "Inteligência de Rede",
      subtitulo: "Análise territorial e rede assistencial"
    },

    "saude-social": {
      titulo: "Saúde e Social",
      subtitulo: "Indicadores de beneficiários e produtos"
    },

    "captacao-cadastro": {
      titulo: "Captação / Cadastro",
      subtitulo: "Indicadores de captação e cadastro"
    },

    "financeiro-credenciamento": {
      titulo: "Financeiro / Credenciamento",
      subtitulo: "Indicadores financeiros e rede credenciada"
    },

    "crm": {
      titulo: "CRM / Atendimento",
      subtitulo: "Monitoramento de protocolos e atendimento"
    },

    "nip": {
      titulo: "NIP",
      subtitulo: "Monitoramento de demandas e notificações"
    }
  };

  /* ================================================
     ESTADO DA NAVEGAÇÃO
  ================================================= */

  let paginaAtual = "visao-geral";

  let carregamentoAtual = 0;

  let temporizadorTransicao = null;

  let temporizadorCarregamento = null;

  let urlAtual = "";

  /* ================================================
     SUBMENU EXPANSÍVEL
  ================================================= */

  function definirSubmenu(aberto) {
    submenu.classList.toggle("aberto", aberto);

    botaoExpandir.setAttribute(
      "aria-expanded",
      String(aberto)
    );

    botaoExpandir.setAttribute(
      "aria-label",
      aberto
        ? "Recolher dashboards"
        : "Expandir dashboards"
    );
  }

  botaoExpandir.addEventListener("click", () => {
    const aberto = submenu.classList.contains(
      "aberto"
    );

    definirSubmenu(!aberto);
  });

  /* ================================================
     TÍTULO E IDENTIFICAÇÃO DA PÁGINA
  ================================================= */

  function atualizarCabecalho(idPagina) {
    const pagina = PAGINAS[idPagina];

    if (!pagina) return;

    tituloPagina.textContent = pagina.titulo;

    subtituloPagina.textContent = pagina.subtitulo;

    document.title =
      `NEXUS | ${pagina.titulo}`;
  }

  /* ================================================
     DESTAQUE DO MENU
  ================================================= */

  function atualizarMenu(idPagina) {
    const visaoGeralAtiva =
      idPagina === "visao-geral";

    botaoVisaoGeral.classList.toggle(
      "ativo",
      visaoGeralAtiva
    );

    if (visaoGeralAtiva) {
      botaoVisaoGeral.setAttribute(
        "aria-current",
        "page"
      );
    } else {
      botaoVisaoGeral.removeAttribute(
        "aria-current"
      );
    }

    botoesDashboards.forEach((botao) => {
      const ativo =
        botao.dataset.pagina === idPagina;

      botao.classList.toggle("ativo", ativo);

      if (ativo) {
        botao.setAttribute(
          "aria-current",
          "page"
        );
      } else {
        botao.removeAttribute(
          "aria-current"
        );
      }
    });
  }

  /* ================================================
     INDICADOR DE CARREGAMENTO
  ================================================= */

  function mostrarCarregamento() {
    carregando.hidden = false;

    iframe.classList.add("trocando");

    iframe.setAttribute(
      "aria-busy",
      "true"
    );
  }

  function ocultarCarregamento() {
    carregando.hidden = true;

    iframe.classList.remove("trocando");

    iframe.removeAttribute("aria-busy");
  }

  /* ================================================
     LIMPEZA DE TEMPORIZADORES
  ================================================= */

  function limparTemporizadores() {
    if (temporizadorTransicao !== null) {
      clearTimeout(temporizadorTransicao);

      temporizadorTransicao = null;
    }

    if (temporizadorCarregamento !== null) {
      clearTimeout(temporizadorCarregamento);

      temporizadorCarregamento = null;
    }
  }

  /* ================================================
     ABRIR VISÃO GERAL
  ================================================= */

  function abrirVisaoGeral() {
    if (paginaAtual === "visao-geral") {
      return;
    }

    carregamentoAtual += 1;

    limparTemporizadores();

    paginaAtual = "visao-geral";

    atualizarCabecalho("visao-geral");

    atualizarMenu("visao-geral");

    painelDinamico.hidden = true;

    paginaInicial.hidden = false;

    ocultarCarregamento();

    /*
      Libera recursos do dashboard anterior.
      O menu lateral permanece intacto.
    */

    iframe.removeAttribute("src");

    urlAtual = "";
  }

  /* ================================================
     CARREGAR DASHBOARD
  ================================================= */

  function abrirDashboard(idPagina, url) {
    if (!url || !PAGINAS[idPagina]) {
      console.warn(
        "NEXUS: dashboard indisponível:",
        idPagina
      );

      return;
    }

    /*
      Evita carregar novamente o mesmo painel.
    */

    if (
      paginaAtual === idPagina &&
      urlAtual === url
    ) {
      return;
    }

    carregamentoAtual += 1;

    const identificador = carregamentoAtual;

    limparTemporizadores();

    paginaAtual = idPagina;

    urlAtual = url;

    atualizarCabecalho(idPagina);

    atualizarMenu(idPagina);

    definirSubmenu(true);

    paginaInicial.hidden = true;

    painelDinamico.hidden = false;

    mostrarCarregamento();

    /*
      Pequena transição antes de trocar o iframe.
    */

    temporizadorTransicao = window.setTimeout(
      () => {
        if (identificador !== carregamentoAtual) {
          return;
        }

        iframe.src = url;

        /*
          Se o dashboard demorar, o indicador
          permanece visível até o evento load.
        */
      },
      DURACAO_TRANSICAO
    );
  }

  /* ================================================
     CONCLUSÃO DO CARREGAMENTO
  ================================================= */

  iframe.addEventListener("load", () => {
    /*
      Ignora eventos quando a Visão Geral
      estiver selecionada.
    */

    if (paginaAtual === "visao-geral") {
      return;
    }

    /*
      Pequeno intervalo para a transição visual.
    */

    temporizadorCarregamento = window.setTimeout(
      () => {
        ocultarCarregamento();
      },
      REDUZIR_MOVIMENTO ? 0 : 100
    );
  });

  /* ================================================
     EVENTOS DOS BOTÕES
  ================================================= */

  botaoVisaoGeral.addEventListener(
    "click",
    abrirVisaoGeral
  );

  botoesDashboards.forEach((botao) => {
    botao.addEventListener("click", () => {
      if (botao.disabled) return;

      const idPagina = botao.dataset.pagina;

      const url = botao.dataset.url;

      abrirDashboard(idPagina, url);
    });
  });

  /* ================================================
     ESTADO INICIAL
  ================================================= */

  definirSubmenu(true);

  atualizarMenu("visao-geral");

  atualizarCabecalho("visao-geral");

  paginaInicial.hidden = false;

  painelDinamico.hidden = true;

  console.info(
    "NEXUS V2: navegação dinâmica inicializada."
  );

})();
