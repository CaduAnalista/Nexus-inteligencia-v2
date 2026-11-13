
/*
  NEXUS — Login demonstrativo V2

  Usuário de teste:
  Nome: Teste
  E-mail: teste@corporativo.com

  Este login é apenas demonstrativo.
  Não representa autenticação segura.
*/

(() => {
  "use strict";

  const form = document.getElementById("formLogin");
  const nome = document.getElementById("nome");
  const email = document.getElementById("email");
  const aviso = document.getElementById("aviso");
  const cartao = document.getElementById("painelLogin");
  const balao = document.getElementById("balao");
  const balaoTexto = document.getElementById("balaoTexto");
  const botao = document.getElementById("botaoEntrar");
  const palco = document.getElementById("nexusPalco");

  const nexus = window.Nexus || {
    expressao() {},
    reagir() {},
    olharPara() {}
  };

  const reduzirMovimento = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /*
    CONFIGURAÇÃO DO ACESSO
  */

  const PAINEL_PRINCIPAL = "Visão Geral";

  // Destino temporário até criarmos a Visão Geral.
  const PAGINA_PRINCIPAL = "./inteligencia.html";

  const USUARIOS_AUTORIZADOS = [
    {
      nome: "Teste",
      email: "teste@corporativo.com",
      paineis: ["Visão Geral"]
    }
  ];

  /*
    PREENCHIMENTO AUTOMÁTICO
  */

  nome.value = "Teste";
  email.value = "teste@corporativo.com";

  nome.readOnly = true;
  email.readOnly = true;

  /*
    FUNÇÕES AUXILIARES
  */

  const normalizar = (valor) =>
    String(valor || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const primeiroNome = (valor) => {
    const p = valor.trim().split(/\s+/)[0] || "";

    return p.charAt(0).toUpperCase() + p.slice(1);
  };

  let digitacao = null;

  /*
    FALAS DO PERSONAGEM
  */

  function falar(texto) {
    clearInterval(digitacao);

    if (reduzirMovimento) {
      balaoTexto.textContent = texto;
      return;
    }

    let i = 0;

    balaoTexto.textContent = "";
    balao.classList.add("digitando");

    digitacao = setInterval(() => {
      i += 1;

      balaoTexto.textContent = texto.slice(0, i);

      if (i >= texto.length) {
        clearInterval(digitacao);
        balao.classList.remove("digitando");
      }
    }, 24);
  }

  /*
    MENSAGENS DO FORMULÁRIO
  */

  function mostrarAviso(texto, tipo = "erro") {
    aviso.textContent = texto;

    aviso.classList.toggle(
      "sucesso",
      tipo === "sucesso"
    );
  }

  function reagirErro(
    texto,
    fala = "Hmm... algo não bateu. Confira seus dados."
  ) {
    mostrarAviso(texto);

    falar(fala);

    nexus.reagir("erro", 2400);

    cartao.classList.remove("tremer");

    void cartao.offsetWidth;

    cartao.classList.add("tremer");
  }

  /*
    MODO ALERTA
  */

  const raiz = document.documentElement;

  let fimAlerta = null;

  function modoAlerta() {
    raiz.classList.add("alerta");

    clearTimeout(fimAlerta);

    fimAlerta = setTimeout(() => {
      raiz.classList.remove("alerta");
    }, 2000);
  }

  /*
    ANIMAÇÃO DO PORTAL
  */

  const DURACAO_PORTAL = 2800;

  let pararFumaca = null;

  function abrirPortal(destino) {
    const portal = document.createElement("div");

    portal.className =
      "portal" +
      (reduzirMovimento ? " simples" : "");

    portal.setAttribute("aria-hidden", "true");

    portal.innerHTML =
      '<div class="portal-nevoa"></div>';

    document.body.appendChild(portal);

    document.body.classList.add("portal-ativo");

    /*
      Fumaça do portal
    */

    if (
      window.PortalFumaca &&
      !reduzirMovimento
    ) {
      pararFumaca = window.PortalFumaca.iniciar(
        portal,
        DURACAO_PORTAL
      );
    }

    /*
      Efeito espacial do fundo
    */

    if (window.FundoRede) {
      window.FundoRede.dobraEspacial();
    }

    /*
      Som do portal
    */

    try {
      if (
        window.SomPortal &&
        !reduzirMovimento
      ) {
        window.SomPortal.tocar();
      }
    } catch (erro) {
      console.warn(
        "Som do portal indisponível:",
        erro
      );
    }

    /*
      Sinalização da animação de chegada
    */

    try {
      sessionStorage.setItem(
        "nexus-portal",
        "1"
      );
    } catch (erro) {
      // Continua sem animação de chegada.
    }

    /*
      Redirecionamento
    */

    window.setTimeout(() => {
      window.location.href = destino;
    }, reduzirMovimento ? 300 : DURACAO_PORTAL);
  }

  /*
    INTERAÇÃO COM OS CAMPOS
  */

  const FALAS = {
    nome: "Olá! Seu acesso demonstrativo está preparado.",
    email: "Seu e-mail de teste já está preenchido."
  };

  [nome, email].forEach((campo) => {
    campo.addEventListener("focus", () => {
      nexus.olharPara(campo);

      nexus.expressao("curioso");

      falar(FALAS[campo.id]);
    });

    campo.addEventListener("input", () => {
      nexus.olharPara(campo);
    });

    campo.addEventListener("blur", () => {
      nexus.olharPara(null);
    });
  });

  /*
    INTERAÇÃO COM O NEXUS
  */

  palco.addEventListener("click", () => {
    nexus.reagir("feliz", 1400);

    falar(
      "Ei! Estou pronto para apresentar os indicadores."
    );
  });

  /*
    LOGIN DEMONSTRATIVO
  */

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const nomeInformado = nome.value.trim();

    const emailInformado = normalizar(
      email.value
    );

    const painelInformado = PAINEL_PRINCIPAL;

    /*
      Validação dos campos
    */

    if (!nomeInformado || !emailInformado) {
      reagirErro(
        "Os dados de acesso não foram encontrados.",
        "Faltou alguma informação."
      );

      return;
    }

    /*
      Validação do e-mail
    */

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        emailInformado
      )
    ) {
      reagirErro(
        "Informe um endereço de e-mail válido.",
        "Esse e-mail parece incompleto."
      );

      return;
    }

    /*
      Verificação demonstrativa do usuário
    */

    const usuario = USUARIOS_AUTORIZADOS.find(
      (item) =>
        normalizar(item.nome) ===
          normalizar(nomeInformado) &&

        normalizar(item.email) ===
          emailInformado &&

        item.paineis.includes(
          painelInformado
        )
    );

    const destino = PAGINA_PRINCIPAL;

    /*
      Acesso não autorizado
    */

    if (!usuario || !destino) {
      modoAlerta();

      if (!usuario) {
        reagirErro(
          "Usuário demonstrativo não autorizado.",
          "Não encontrei esse acesso."
        );
      } else {
        reagirErro(
          "O painel principal não está configurado.",
          "Esse painel ainda está em construção."
        );
      }

      return;
    }

    /*
      Preparar o som
    */

    if (
      window.SomPortal &&
      !reduzirMovimento
    ) {
      window.SomPortal.preparar();
    }

    /*
      Bloquear botão durante a animação
    */

    botao.disabled = true;

    botao.querySelector("span").textContent =
      "Acessando...";

    /*
      Mensagem de sucesso
    */

    mostrarAviso(
      "Acesso demonstrativo autorizado. Abrindo o portal...",
      "sucesso"
    );

    /*
      Reação do NEXUS
    */

    nexus.olharPara(null);

    nexus.expressao("pronto");

    falar(
      `Tudo certo, ${primeiroNome(nomeInformado)}! Vamos começar!`
    );

    /*
      Iniciar portal
    */

    window.setTimeout(() => {
      abrirPortal(destino);
    }, reduzirMovimento ? 0 : 450);
  });

  /*
    RESTAURAR TELA AO VOLTAR
  */

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;

    if (pararFumaca) {
      pararFumaca();

      pararFumaca = null;
    }

    document
      .querySelectorAll(".portal")
      .forEach((p) => p.remove());

    document.body.classList.remove(
      "portal-ativo"
    );

    botao.disabled = false;

    botao.querySelector("span").textContent =
      "Entrar";

    aviso.textContent = "";

    /*
      Garantir dados demonstrativos
    */

    nome.value = "Teste";
    email.value = "teste@corporativo.com";

    nexus.expressao("curioso");
  });

  /*
    MENSAGEM INICIAL
  */

  window.setTimeout(() => {
    falar(
      "Olá, Teste! Seu acesso está pronto. Clique em Entrar!"
    );
  }, 500);

})();
