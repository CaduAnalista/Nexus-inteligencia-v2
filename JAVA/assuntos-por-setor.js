/* NEXUS V2 — Assuntos por setor
   Compatível com formulario-reuniao.js.
   Armazenamento demonstrativo: localStorage deste navegador/origem.
   Não compartilha dados entre computadores. */
(() => {
  'use strict';

  const CHAVE = 'nexus_v2_assuntos_reuniao';
  const SETORES = [
    'Recepção', 'Patrimônio', 'Saúde', 'Social', 'Reembolso',
    'Credenciamento', 'Auditoria', 'Concierge', 'Cadastro',
    'Financeiro', 'Faturamento'
  ];

  const $ = id => document.getElementById(id);
  const grade = $('gradeSetores');
  const filtroData = $('filtroDataReuniao');
  const busca = $('buscaAssuntos');
  const atualizar = $('atualizarAssuntos');
  const aviso = $('avisoAssuntos');
  if (!grade || !filtroData || !busca || !atualizar) return;

  const cartoes = new Map(
    Array.from(grade.querySelectorAll('.cartao-setor[data-setor]'))
      .map(cartao => [cartao.dataset.setor, cartao])
  );
  let registros = [];

  function dataLocalISO(data = new Date()) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  }

  function proximaSegunda() {
    const data = new Date();
    data.setDate(data.getDate() + ((8 - data.getDay()) % 7));
    return dataLocalISO(data);
  }

  function lerRegistros() {
    const texto = localStorage.getItem(CHAVE);
    if (!texto) return [];
    const dados = JSON.parse(texto);
    if (!Array.isArray(dados)) throw new Error('Formato de armazenamento inválido');
    return dados.filter(r => r && typeof r === 'object' &&
      SETORES.includes(r.setor) && typeof r.assunto === 'string' &&
      typeof r.dataReuniao === 'string');
  }

  function salvarRegistros(dados) {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
    try {
      window.parent?.postMessage({ tipo: 'nexus:assuntos-atualizados' }, window.location.origin);
    } catch (_) { /* fora do iframe */ }
  }

  function notificar(texto, erro = false) {
    if (!aviso) return;
    aviso.textContent = texto;
    aviso.setAttribute('role', erro ? 'alert' : 'status');
  }

  function textoNormalizado(texto) {
    return String(texto || '').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  }

  function criarBotaoCheck(rotulo, concluido, aoClicar) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'botao-concluir';
    botao.setAttribute('aria-pressed', String(concluido));
    botao.setAttribute('aria-label', rotulo);
    botao.title = rotulo;
    botao.textContent = concluido ? '✓' : '○';
    botao.addEventListener('click', aoClicar);
    return botao;
  }

  function alternarConclusao(id, setor, data, novoValor) {
    try {
      // Lê novamente antes de gravar para evitar sobrescrever registros recentes.
      const atuais = lerRegistros();
      const registro = atuais.find(r => String(r.id) === String(id) &&
        r.setor === setor && r.dataReuniao === data);
      if (!registro) {
        notificar('Esse assunto não foi encontrado. Clique em Atualizar.', true);
        carregar();
        return;
      }
      registro.concluido = novoValor;
      registro.concluidoEm = novoValor ? new Date().toISOString() : null;
      salvarRegistros(atuais);
      registros = atuais;
      renderizar();
    } catch (erro) {
      console.error('Falha ao atualizar conclusão:', erro);
      notificar('Não foi possível salvar a conclusão neste navegador.', true);
    }
  }

  function renderizar() {
    const data = filtroData.value;
    const termo = textoNormalizado(busca.value.trim());
    let assuntosDaReuniao = 0;
    let concluidos = 0;

    SETORES.forEach(setor => {
      const cartao = cartoes.get(setor);
      if (!cartao) return;
      const lista = cartao.querySelector('.lista-assuntos');
      const acoes = cartao.querySelector('.cartao-acoes');
      if (!lista || !acoes) return;

      // A grade e a posição de cada setor nunca mudam.
      const itens = registros.filter(r => r.setor === setor && r.dataReuniao === data);
      const possui = itens.length > 0;
      const todosConcluidos = possui && itens.every(r => r.concluido === true);
      const corresponde = !termo || textoNormalizado(setor).includes(termo) ||
        itens.some(r => textoNormalizado(r.assunto).includes(termo));

      assuntosDaReuniao += itens.length;
      concluidos += itens.filter(r => r.concluido === true).length;
      cartao.classList.toggle('sem-assuntos', !possui);
      cartao.classList.toggle('concluido', todosConcluidos);
      cartao.classList.toggle('fora-busca', !corresponde);
      cartao.dataset.status = todosConcluidos ? 'concluido' : (possui ? 'pendente' : 'vazio');
      cartao.dataset.concluido = String(todosConcluidos);
      cartao.setAttribute('aria-label', `${setor}: ${itens.length} assunto(s), ${itens.filter(r => r.concluido).length} concluído(s)`);

      lista.replaceChildren();
      acoes.replaceChildren();
      itens.forEach(item => {
        const li = document.createElement('li');
        li.className = 'assunto-item';
        li.classList.toggle('concluido', item.concluido === true);
        const texto = document.createElement('span');
        texto.textContent = item.assunto;
        texto.className = 'texto-assunto';
        li.appendChild(texto);
        // Check individual: concluir um tema não conclui os demais.
        li.appendChild(criarBotaoCheck(
          `${item.concluido ? 'Reabrir' : 'Concluir'} assunto de ${setor}: ${item.assunto}`,
          item.concluido === true,
          () => alternarConclusao(item.id, setor, data, item.concluido !== true)
        ));
        lista.appendChild(li);
      });

      if (possui) {
        const botaoSetor = criarBotaoCheck(
          todosConcluidos ? `Reabrir todos os assuntos de ${setor}` : `Concluir todos os assuntos de ${setor}`,
          todosConcluidos,
          () => {
            try {
              const atuais = lerRegistros();
              const novoValor = !todosConcluidos;
              atuais.forEach(r => {
                if (r.setor === setor && r.dataReuniao === data) {
                  r.concluido = novoValor;
                  r.concluidoEm = novoValor ? new Date().toISOString() : null;
                }
              });
              salvarRegistros(atuais);
              registros = atuais;
              renderizar();
            } catch (erro) {
              console.error('Falha ao concluir setor:', erro);
              notificar('Não foi possível atualizar o setor.', true);
            }
          }
        );
        acoes.appendChild(botaoSetor);
      }
    });

    notificar(`${assuntosDaReuniao} assunto(s) para a reunião selecionada · ${concluidos} concluído(s).`);
  }

  function carregar() {
    try {
      registros = lerRegistros();
      renderizar();
    } catch (erro) {
      console.error('Falha ao ler registros:', erro);
      registros = [];
      renderizar();
      notificar('Não foi possível ler os assuntos armazenados neste navegador.', true);
    }
  }

  filtroData.value = proximaSegunda();
  filtroData.addEventListener('change', renderizar);
  busca.addEventListener('input', renderizar);
  atualizar.addEventListener('click', carregar);
  window.addEventListener('storage', evento => {
    if (evento.key === CHAVE || evento.key === null) carregar();
  });
  window.addEventListener('focus', carregar);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) carregar();
  });
  window.addEventListener('message', evento => {
    if (evento.origin === window.location.origin && evento.data?.tipo === 'nexus:assuntos-atualizados') carregar();
  });

  // Regras adicionais para botões por assunto e cartões não encontrados na busca.
  const estilo = document.createElement('style');
  estilo.textContent = `
    .cartao-setor.fora-busca { opacity: .16; }
    .cartao-setor .lista-assuntos li.assunto-item {
      display:flex; align-items:flex-start; justify-content:space-between;
      gap:12px; padding-right:0;
    }
    .cartao-setor .lista-assuntos li .texto-assunto { flex:1; min-width:0; }
    .cartao-setor .lista-assuntos li .botao-concluir {
      flex:0 0 32px; width:32px; height:32px; margin-top:0;
      font-size:21px; line-height:1;
    }
    .cartao-setor .lista-assuntos li.concluido .texto-assunto { text-decoration:line-through; text-decoration-thickness:1px; }
    .cartao-setor.concluido .lista-assuntos li .botao-concluir {
      background:#087d4a; border-color:#7affbb; color:#fff;
    }
  `;
  document.head.appendChild(estilo);
  carregar();
})();
