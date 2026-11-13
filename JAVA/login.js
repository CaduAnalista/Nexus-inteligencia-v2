
/* NEXUS — Login e roteamento inicial
   Protótipo local: a lista abaixo é apenas uma validação no navegador.
   Para uso real, a autenticação precisa ser validada no servidor. */
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

  const PAINEL_PRINCIPAL = "Visão Geral";
  const PAGINA_PRINCIPAL = "./inteligencia.html";

  // Cadastre aqui os usuários autorizados.
  // Todos terão acesso ao painel principal.
  const USUARIOS_AUTORIZADOS = [
    {
      nome: "Visitante",
      email: "visitante@nexus.dev",
      paineis: ["Visão Geral"]
    }
  ];

  const normalizar = (valor) => String(valor || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const primeiroNome = (valor) => {
    const p = valor.trim().split(/\s+/)[0] || "";
    return p.charAt(0).toUpperCase() + p.slice(1);
  };

  let digitacao = null;

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

  function mostrarAviso(texto, tipo = "erro") {
    aviso.textContent = texto;
    aviso.classList.toggle("sucesso", tipo === "sucesso");
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

  const raiz = document.documentElement;
  let fimAlerta = null;

  function modoAlerta() {
    raiz.classList.add("alerta");
    clearTimeout(fimAlerta);

    fimAlerta = setTimeout(
      () => raiz.classList.remove("alerta"),
      2000
    );
  }

  const DURACAO_PORTAL = 2800;
  let pararFumaca = null;

  function abrirPortal(destino) {
    const portal = document.createElement("div");

    portal.className = "portal" +
      (reduzirMovimento ? " simples" : "");

    portal.setAttribute("aria-hidden", "true");
    portal.innerHTML = '<div class="portal-nevoa"></div>';

    document.body.appendChild(portal);
    document.body.classList.add("portal-ativo");

    if (window.PortalFumaca && !reduzirMovimento) {
      pararFumaca = window.PortalFumaca.iniciar(
        portal,
        DURACAO_PORTAL
      );
    }

    if (window.FundoRede) {
      window.FundoRede.dobraEspacial();
    }

    try {
      if (window.SomPortal && !reduzirMovimento) {
        window.SomPortal.tocar();
      }
    } catch (erro) {
      console.warn("Som do portal indisponível:", erro);
    }

    try {
      sessionStorage.setItem("nexus-portal", "1");
    } catch (erro) {
      // Continua sem animação de chegada.
    }

    window.setTimeout(() => {
      window.location.href = destino;
    }, reduzirMovimento ? 300 : DURACAO_PORTAL);
  }

  const FALAS = {
    nome: "Olá! Como posso te chamar?",
    email: "Agora, seu e-mail de acesso."
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

  nome.addEventListener("change", () => {
    if (nome.value.trim()) {
      nexus.reagir("feliz", 1600);
      falar(`Prazer, ${primeiroNome(nome.value)}!`);
    }
  });

  form.addEventListener("input", () => {
    aviso.textContent = "";
    aviso.classList.remove("sucesso");
  });

  palco.addEventListener("click", () => {
    nexus.reagir("feliz", 1400);
    falar("Ei! Estou pronto para analisar seus dados.");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const nomeInformado = nome.value.trim();
    const emailInformado = normalizar(email.value);
    const painelInformado = PAINEL_PRINCIPAL;

    if (!nomeInformado || !emailInformado) {
      reagirErro(
        "Preencha nome e e-mail para continuar.",
        "Faltou alguma coisa ali."
      );

      (!nomeInformado ? nome : email).focus();
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInformado)) {
      reagirErro(
        "Informe um endereço de e-mail válido.",
        "Esse e-mail parece incompleto."
      );

      email.focus();
      return;
    }

    const usuario = USUARIOS_AUTORIZADOS.find((item) =>
      normalizar(item.nome) === normalizar(nomeInformado) &&
      normalizar(item.email) === emailInformado &&
      item.paineis.includes(painelInformado)
    );

    const destino = PAGINA_PRINCIPAL;

    if (!usuario || !destino) {
      modoAlerta();

      if (!usuario) {
        reagirErro(
          "Acesso não autorizado. Confira seus dados ou solicite seu cadastro.",
          "Acesso negado! Não encontrei você na lista."
        );
      } else {
        reagirErro(
          "O painel principal ainda não está configurado.",
          "Esse painel ainda está em construção."
        );
      }

      return;
    }

    if (window.SomPortal && !reduzirMovimento) {
      window.SomPortal.preparar();
    }

    botao.disabled = true;
    botao.querySelector("span").textContent = "Acessando...";

    mostrarAviso(
      "Acesso autorizado. Abrindo o portal...",
      "sucesso"
    );

    nexus.olharPara(null);
    nexus.expressao("pronto");

    falar(
      `Tudo certo, ${primeiroNome(nomeInformado)}! Segure firme...`
    );

    window.setTimeout(
      () => abrirPortal(destino),
      reduzirMovimento ? 0 : 450
    );
  });

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;

    if (pararFumaca) {
      pararFumaca();
      pararFumaca = null;
    }

    document.querySelectorAll(".portal").forEach(
      (p) => p.remove()
    );

    document.body.classList.remove("portal-ativo");

    botao.disabled = false;
    botao.querySelector("span").textContent = "Entrar";
    aviso.textContent = "";

    nexus.expressao("curioso");
  });

  window.setTimeout(
    () => falar("Olá! Eu sou o NEXUS. Vamos analisar alguns dados?"),
    500
  );
})();
