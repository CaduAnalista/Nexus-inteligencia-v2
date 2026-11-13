
/*
=====================================================
 NEXUS V2 — VISÃO GERAL
 Navegação dinâmica e menu lateral retrátil

 Compatível com:
 HTML/visao-geral.html
 CSS/visao-geral.css

 Ambiente demonstrativo — GitHub Pages
=====================================================
*/

(() => {
  "use strict";

  /* ================================================
     ELEMENTOS DA INTERFACE
  ================================================= */

  const menuLateral = document.getElementById(
    "menuLateral"
  );

  const botaoRecolherMenu = document.getElementById(
    "botaoRecolherMenu"
  );

  const botaoVisaoGeral = document.getElementById(
    "botaoVisaoGeral"
  );

  const botaoExpandirMenu = document.getElementById(
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
     VALIDAÇÃO INICIAL
  ================================================= */

  const elementosObrigatorios = [
    menuLateral,
    botaoRecolherMenu,
    botaoVisaoGeral,
    botaoExpandirMenu,
    submenu,
    paginaInicial,
    painelDinamico,
    iframe,
    carregando,
    tituloPagina,
    subtituloPagina
  ];

  if (elementosObrigatorios.some(el => !el)) {
    console.error(
      "NEXUS: elementos obrigatórios não encontrados."
    );
    return;
  }

  /* ================================================
     CONFIGURAÇÕES
  ================================================= */

  const movimentoReduzido = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const DURACAO_TRANSICAO = movimentoReduzido
    ? 0
    : 180;

  const PAGINAS = {
    "visao-geral": {
      titulo: "Visão Geral",
      subtitulo:
        "Central de Inteligência e Gestão Integrada"
    },

    "inteligencia": {
      titulo: "Inteligência de Rede",
      subtitulo:
        "Análise territorial e rede assistencial"
    },

    "saude-social": {
      titulo: "Saúde e Social",
      subtitulo:
        "Indicadores de beneficiários e produtos"
    },

    "captacao-cadastro": {
      titulo: "Captação / Cadastro",
      subtitulo:
        "Indicadores de captação e cadastro"
    },

    "financeiro-credenciamento": {
      titulo: "Financeiro / Credenciamento",
      subtitulo:
        "Indicadores financeiros e rede credenciada"
    },

    "crm": {
      titulo: "CRM / Atendimento",
      subtitulo:
        "Monitoramento de protocolos e atendimento"
    },

    "nip": {
      titulo: "NIP",
      subtitulo:
        "Monitoramento de demandas e notificações"
    }
  };

  /* ================================================
     ESTADO DA APLICAÇÃO
  ================================================= */

  let paginaAtual = "visao-geral";

  let urlAtual = "";

  let identificadorNavegacao = 0;

  let temporizadorTransicao = null;

  let temporizadorCarregamento = null;

  let menuRecolhido = false;

  /* ================================================
     CONTROLE DO MENU LATERAL
  ================================================= */

  function definirMenuLateral(recolhido) {
    menuRecolhido = recolhido;

    menuLateral.classList.toggle(
      "recolhido",
      recolhido
    );

    botaoRecolherMenu.setAttribute(
      "aria-expanded",
      String(!recolhido)
    );

    const descricao = recolhido
      ? "Expandir menu lateral"
      : "Recolher menu lateral";

    botaoRecolherMenu.setAttribute(
      "aria-label",
      descricao
    );

    botaoRecolherMenu.title = descricao;

    /*
      Quando recolhido, o submenu fica oculto
      pelo CSS. Ao expandir, o estado anterior
      do submenu é preservado.
    */

    if (recolhido) {
      botaoVisaoGeral.title =
        "Expandir menu e abrir Visão Geral";
    } else {
      botaoVisaoGeral.title = "Visão Geral";
    }
  }

  botaoRecolherMenu.addEventListener(
    "click",
    () => {
      definirMenuLateral(!menuRecolhido);
    }
  );

  /* ================================================
     CONTROLE DO SUBMENU
  ================================================= */

  function definirSubmenu(aberto) {
    submenu.classList.toggle(
      "aberto",
      aberto
    );

    botaoExpandirMenu.setAttribute(
      "aria-expanded",
      String(aberto)
    );

    const descricao = aberto
      ? "Recolher dashboards"
      : "Expandir dashboards";

    botaoExpandirMenu.setAttribute(
      "aria-label",
      descricao
    );

    botaoExpandirMenu.title = descricao;
  }

  botaoExpandirMenu.addEventListener(
    "click",
    () => {
      /*
        Se o menu lateral estiver recolhido,
        primeiro ele será expandido.
      */

      if (menuRecolhido) {
        definirMenuLateral(false);
        definirSubmenu(true);
        return;
      }

      const aberto = submenu.classList.contains(
        "aberto"
      );

      definirSubmenu(!aberto);
    }
  );

  /* ================================================
     CABEÇALHO DINÂMICO
  ================================================= */

  function atualizarCabecalho(idPagina) {
    const pagina = PAGINAS[idPagina];

    if (!pagina) return;

    tituloPagina.textContent = pagina.titulo;

    subtituloPagina.textContent = pagina.subtitulo;

    document.title = `NEXUS | ${pagina.titulo}`;
  }

  /* ================================================
     MENU ATIVO
  ================================================= */

  function atualizarMenuAtivo(idPagina) {
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

    botoesDashboards.forEach(botao => {
      const ativo =
        botao.dataset.pagina === idPagina;

      botao.classList.toggle(
        "ativo",
        ativo
      );

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
     TEMPORIZADORES
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
     VOLTAR À VISÃO GERAL
  ================================================= */

  function abrirVisaoGeral() {
    /*
      Se o menu estiver recolhido, clicar no
      ícone Visão Geral expande o menu.
    */

    if (menuRecolhido) {
      definirMenuLateral(false);
    }

    if (paginaAtual === "visao-geral") {
      return;
    }

    identificadorNavegacao++;

    limparTemporizadores();

    paginaAtual = "visao-geral";
    urlAtual = "";

    atualizarCabecalho("visao-geral");
    atualizarMenuAtivo("visao-geral");

    painelDinamico.hidden = true;
    paginaInicial.hidden = false;

    ocultarCarregamento();

    /*
      Libera o dashboard anterior.
      A estrutura principal não recarrega.
    */

    iframe.removeAttribute("src");
  }

  /* ================================================
     ABRIR DASHBOARD
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
      Evita recarregar o mesmo dashboard.
    */

    if (
      paginaAtual === idPagina &&
      urlAtual === url
    ) {
      return;
    }

    identificadorNavegacao++;

    const navegacaoAtual = identificadorNavegacao;

    limparTemporizadores();

    paginaAtual = idPagina;
    urlAtual = url;

    atualizarCabecalho(idPagina);
    atualizarMenuAtivo(idPagina);

    paginaInicial.hidden = true;
    painelDinamico.hidden = false;

    /*
      Mantém o menu aberto ou recolhido
      conforme a escolha do usuário.
    */

    mostrarCarregamento();

    temporizadorTransicao = window.setTimeout(
      () => {
        if (
          navegacaoAtual !== identificadorNavegacao
        ) {
          return;
        }

        iframe.title =
          `Dashboard ${PAGINAS[idPagina].titulo}`;

        iframe.src = url;
      },
      DURACAO_TRANSICAO
    );
  }

  /* ================================================
     CARREGAMENTO DO IFRAME
  ================================================= */

  iframe.addEventListener("load", () => {
    if (paginaAtual === "visao-geral") {
      return;
    }

    /*
      Pequeno intervalo para evitar
      transições visuais bruscas.
    */

    const navegacaoAtual = identificadorNavegacao;

    if (temporizadorCarregamento !== null) {
      clearTimeout(temporizadorCarregamento);
    }

    temporizadorCarregamento = window.setTimeout(
      () => {
        if (
          navegacaoAtual !== identificadorNavegacao
        ) {
          return;
        }

        ocultarCarregamento();
      },
      movimentoReduzido ? 0 : 100
    );
  });

  /* ================================================
     EVENTOS DE NAVEGAÇÃO
  ================================================= */

  botaoVisaoGeral.addEventListener(
    "click",
    abrirVisaoGeral
  );

  botoesDashboards.forEach(botao => {
    botao.addEventListener("click", () => {
      if (botao.disabled) return;

      const idPagina = botao.dataset.pagina;
      const url = botao.dataset.url;

      abrirDashboard(idPagina, url);
    });
  });

  /* ================================================
     INICIALIZAÇÃO
  ================================================= */

  definirMenuLateral(false);

  definirSubmenu(true);

  atualizarMenuAtivo("visao-geral");

  atualizarCabecalho("visao-geral");

  paginaInicial.hidden = false;
  painelDinamico.hidden = true;

  console.info(
    "NEXUS V2: navegação dinâmica inicializada."
  );

})();
