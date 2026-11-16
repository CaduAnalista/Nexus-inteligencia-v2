/* NEXUS V2 — Assuntos por setor. Persistência local temporária.
   Compatível com registros antigos que usam apenas `concluido: boolean`.
   Não há sincronização entre navegadores/computadores sem banco de dados. */
(() => {
  'use strict';
  const CHAVE = 'nexus_v2_assuntos_reuniao';
  const SETORES = [
    'Inteligência de rede', 'Gestão', 'ADM/PAT', 'Financeiro',
    'Captação/Cadastro', 'Auditoria', 'Credenciamento', 'Gerência', 'Coordenação'
  ];
  const $ = id => document.getElementById(id);
  const grade = $('gradeSetores');
  const filtroData = $('filtroDataReuniao');
  const busca = $('buscaAssuntos');
  const atualizar = $('atualizarAssuntos');
  const aviso = $('avisoAssuntos');
  const dialogo = $('dialogoEditar');
  const formEdicao = $('formEditarAssunto');
  const erroEdicao = $('erroEdicao');
  if (!grade || !filtroData || !busca || !atualizar || !dialogo || !formEdicao) return;
  const cartoes = new Map(Array.from(grade.querySelectorAll('.cartao-setor[data-setor]')).map(c => [c.dataset.setor, c]));
  let registros = [];
  let idEditando = null;
  let idPlano = null;

  function dataLocalISO(data = new Date()) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  }
  function proximaSegunda() {
    const data = new Date();
    data.setDate(data.getDate() + ((8 - data.getDay()) % 7));
    return dataLocalISO(data);
  }
  function ehSegunda(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    const [ano, mes, dia] = iso.split('-').map(Number);
    const d = new Date(ano, mes - 1, dia);
    return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia && d.getDay() === 1;
  }
  function lerRegistros() {
    const texto = localStorage.getItem(CHAVE);
    if (!texto) return [];
    const dados = JSON.parse(texto);
    if (!Array.isArray(dados)) throw new Error('Formato de armazenamento inválido');
    // Não remover setores legados: registros antigos devem permanecer preservados.
    return dados;
  }
  function salvarRegistros(dados) {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
    try { window.parent?.postMessage({ tipo: 'nexus:assuntos-atualizados' }, window.location.origin); }
    catch (_) { /* fora do iframe */ }
  }
  function statusDe(r) {
    if (['pendente', 'resolvido-antecipadamente', 'concluido-reuniao'].includes(r.status)) return r.status;
    return r.concluido === true ? 'concluido-reuniao' : 'pendente';
  }
  function definirStatus(r, status) {
    const agora = new Date().toISOString();
    r.status = status;
    r.concluido = status !== 'pendente';
    r.resolvidoEm = status === 'resolvido-antecipadamente' ? agora : null;
    r.concluidoEm = status === 'concluido-reuniao' ? agora : null;
    r.atualizadoEm = agora;
  }
  function notificar(texto, erro = false) {
    if (!aviso) return;
    aviso.textContent = texto;
    aviso.setAttribute('role', erro ? 'alert' : 'status');
  }
  function textoNormalizado(texto) {
    return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  }
  function dataLegivel(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
  }
  function botao(rotulo, classe, acao) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `acao-assunto ${classe}`;
    b.textContent = rotulo;
    b.addEventListener('click', acao);
    return b;
  }
  function atualizarRegistro(id, mutacao, mensagem) {
    try {
      const atuais = lerRegistros();
      const item = atuais.find(r => r && String(r.id) === String(id));
      if (!item) { carregar(); notificar('Assunto não encontrado. Atualize a página.', true); return; }
      mutacao(item, atuais);
      salvarRegistros(atuais);
      registros = atuais;
      renderizar();
      if (mensagem) notificar(mensagem);
    } catch (erro) {
      console.error('Falha ao atualizar assunto:', erro);
      notificar('Não foi possível salvar a alteração neste navegador.', true);
    }
  }
  function mudarStatus(id, novoStatus) {
    const mensagens = {
      'pendente': 'Assunto reaberto e devolvido aos pendentes.',
      'resolvido-antecipadamente': 'Assunto resolvido antes da reunião e mantido no histórico.',
      'concluido-reuniao': 'Assunto concluído na reunião.'
    };
    atualizarRegistro(id, r => definirStatus(r, novoStatus), mensagens[novoStatus]);
  }
  function excluir(id) {
    const item = registros.find(r => r && String(r.id) === String(id));
    if (!item || !window.confirm(`Excluir definitivamente este assunto?\n\n${item.assunto}\n\nEsta ação não poderá ser desfeita.`)) return;
    try {
      const atuais = lerRegistros();
      const indice = atuais.findIndex(r => r && String(r.id) === String(id));
      if (indice < 0) { carregar(); notificar('Assunto não encontrado.', true); return; }
      atuais.splice(indice, 1);
      salvarRegistros(atuais);
      registros = atuais;
      renderizar();
      notificar('Assunto excluído com sucesso.');
    } catch (erro) {
      console.error('Falha ao excluir assunto:', erro);
      notificar('Não foi possível excluir o assunto.', true);
    }
  }
  function abrirEdicao(id) {
    const item = registros.find(r => r && String(r.id) === String(id));
    if (!item) return;
    idEditando = String(id);
    $('editarResponsavel').value = item.responsavel || '';
    $('editarSetor').value = item.setor;
    $('editarDataReuniao').value = item.dataReuniao;
    $('editarTexto').value = item.assunto;
    erroEdicao.textContent = '';
    dialogo.showModal();
  }
  function criarItem(item) {
    const status = statusDe(item);
    const li = document.createElement('li');
    li.className = 'assunto-item';
    if (status !== 'pendente') li.classList.add(status === 'concluido-reuniao' ? 'concluido' : 'resolvido-antecipadamente');
    const corpo = document.createElement('div');
    corpo.className = 'assunto-corpo';
    const texto = document.createElement('span');
    texto.className = 'texto-assunto';
    texto.textContent = item.assunto;
    texto.setAttribute('role', 'button');
    texto.setAttribute('tabindex', '0');
    texto.setAttribute('title', 'Abrir plano de ação 5W2H');
    texto.setAttribute('aria-label', `Abrir plano de ação do assunto: ${item.assunto}`);
    texto.addEventListener('click', () => abrirPlano(item.id));
    texto.addEventListener('keydown', evento => {
      if (evento.key === 'Enter' || evento.key === ' ') { evento.preventDefault(); abrirPlano(item.id); }
    });
    corpo.appendChild(texto);
    const etiqueta = document.createElement('span');
    etiqueta.className = 'assunto-status ' + (status === 'pendente' ? '' : status === 'concluido-reuniao' ? 'concluido' : 'antecipado');
    etiqueta.textContent = status === 'pendente' ? 'Pendente' : status === 'concluido-reuniao' ? 'Concluído na reunião' : 'Resolvido antecipadamente';
    corpo.appendChild(etiqueta);
    const meta = document.createElement('span');
    meta.className = 'assunto-meta';
    const detalhes = [];
    if (item.responsavel) detalhes.push(`Responsável: ${item.responsavel}`);
    if (status === 'resolvido-antecipadamente' && item.resolvidoEm) detalhes.push(`Resolvido em ${dataLegivel(item.resolvidoEm)}`);
    if (status === 'concluido-reuniao' && item.concluidoEm) detalhes.push(`Concluído em ${dataLegivel(item.concluidoEm)}`);
    if (item.atualizadoEm) detalhes.push(`Atualizado em ${dataLegivel(item.atualizadoEm)}`);
    meta.textContent = detalhes.join(' · ');
    corpo.appendChild(meta);
    const controles = document.createElement('div');
    controles.className = 'assunto-controles';
    controles.appendChild(botao(item.plano5w2h ? 'Ver 5W2H' : 'Criar 5W2H', 'plano', () => abrirPlano(item.id)));
    controles.appendChild(botao('Editar', 'editar', () => abrirEdicao(item.id)));
    if (status === 'pendente') {
      controles.appendChild(botao('Resolver antes', 'resolver', () => mudarStatus(item.id, 'resolvido-antecipadamente')));
      controles.appendChild(botao('Concluir na reunião', 'concluir', () => mudarStatus(item.id, 'concluido-reuniao')));
    } else {
      controles.appendChild(botao('Reabrir', 'reabrir', () => mudarStatus(item.id, 'pendente')));
      if (status === 'resolvido-antecipadamente') {
        controles.appendChild(botao('Concluir na reunião', 'concluir', () => mudarStatus(item.id, 'concluido-reuniao')));
      }
    }
    controles.appendChild(botao('Excluir', 'excluir', () => excluir(item.id)));
    corpo.appendChild(controles);
    li.appendChild(corpo);
    return li;
  }
  function renderizar() {
    const data = filtroData.value;
    const termo = textoNormalizado(busca.value.trim());
    let total = 0, pendentes = 0, antecipados = 0, concluidos = 0;
    SETORES.forEach(setor => {
      const cartao = cartoes.get(setor);
      if (!cartao) return;
      const lista = cartao.querySelector('.lista-assuntos');
      const acoes = cartao.querySelector('.cartao-acoes');
      const itens = registros.filter(r => r && r.setor === setor && r.dataReuniao === data && typeof r.assunto === 'string');
      const possui = itens.length > 0;
      const todosResolvidos = possui && itens.every(r => statusDe(r) !== 'pendente');
      const corresponde = !termo || textoNormalizado(setor).includes(termo) || itens.some(r => textoNormalizado(r.assunto).includes(termo) || textoNormalizado(r.responsavel).includes(termo));
      total += itens.length;
      pendentes += itens.filter(r => statusDe(r) === 'pendente').length;
      antecipados += itens.filter(r => statusDe(r) === 'resolvido-antecipadamente').length;
      concluidos += itens.filter(r => statusDe(r) === 'concluido-reuniao').length;
      cartao.classList.toggle('sem-assuntos', !possui);
      cartao.classList.toggle('concluido', todosResolvidos);
      cartao.classList.toggle('fora-busca', !corresponde);
      cartao.dataset.status = todosResolvidos ? 'concluido' : (possui ? 'pendente' : 'vazio');
      cartao.dataset.concluido = String(todosResolvidos);
      cartao.setAttribute('aria-label', `${setor}: ${itens.length} assuntos, ${itens.filter(r => statusDe(r) === 'pendente').length} pendentes`);
      lista.replaceChildren();
      acoes.replaceChildren();
      itens.forEach(item => lista.appendChild(criarItem(item)));
      if (possui) {
        const b = document.createElement('button');
        b.type = 'button';
        b.title = todosResolvidos ? 'Reabrir todos os assuntos do setor' : 'Concluir os assuntos pendentes do setor na reunião';
        b.setAttribute('aria-label', b.title);
        b.setAttribute('aria-pressed', String(todosResolvidos));
        b.textContent = todosResolvidos ? '✓' : '○';
        b.addEventListener('click', () => {
          try {
            const atuais = lerRegistros();
            let alterados = 0;
            atuais.forEach(r => {
              if (!r || r.setor !== setor || r.dataReuniao !== data) return;
              if (todosResolvidos) {
                // Reabre todos, inclusive os resolvidos antecipadamente.
                definirStatus(r, 'pendente'); alterados++;
              } else if (statusDe(r) === 'pendente') {
                // Não altera a classificação de resolvidos antecipadamente.
                definirStatus(r, 'concluido-reuniao'); alterados++;
              }
            });
            if (!alterados) return;
            salvarRegistros(atuais);
            registros = atuais;
            renderizar();
          } catch (erro) {
            console.error('Falha ao atualizar setor:', erro);
            notificar('Não foi possível atualizar o setor.', true);
          }
        });
        acoes.appendChild(b);
      }
    });
    notificar(`${total} assunto(s) · ${pendentes} pendente(s) · ${antecipados} resolvido(s) antecipadamente · ${concluidos} concluído(s) na reunião.`);
  }
  function carregar() {
    try { registros = lerRegistros(); renderizar(); }
    catch (erro) {
      console.error('Falha ao ler registros:', erro);
      registros = [];
      renderizar();
      notificar('Não foi possível ler os assuntos armazenados neste navegador.', true);
    }
  }
  // Cada registro mantém seu plano 5W2H e um histórico de versões no mesmo armazenamento.
  const dialogoPlano = $('dialogoPlano');
  const formPlano = $('formPlano');
  const camposPlano = {
    oQue: $('planoOQue'), porQue: $('planoPorQue'), onde: $('planoOnde'),
    quando: $('planoQuando'), quem: $('planoQuem'), como: $('planoComo'), quanto: $('planoQuanto')
  };
  const historicoPlano = $('historicoPlano');
  const historicoLista = $('historicoPlanoLista');
  const botaoHistorico = $('alternarHistoricoPlano');

  function abrirPlano(id) {
    const item = registros.find(r => r && String(r.id) === String(id));
    if (!item) { notificar('Assunto não encontrado. Atualize a página.', true); return; }
    idPlano = String(id);
    $('planoAssuntoTitulo').textContent = `Assunto: ${item.assunto}`;
    const plano = item.plano5w2h || {};
    Object.entries(camposPlano).forEach(([chave, campo]) => { campo.value = plano[chave] || ''; });
    $('erroPlano').textContent = '';
    historicoPlano.hidden = true;
    botaoHistorico.textContent = 'Ver histórico';
    historicoLista.replaceChildren();
    const historico = Array.isArray(item.historico5w2h) ? item.historico5w2h : [];
    if (!historico.length) {
      const vazio = document.createElement('p');
      vazio.textContent = 'Nenhuma versão anterior registrada.';
      historicoLista.appendChild(vazio);
    } else {
      [...historico].reverse().forEach((versao, indice) => {
        const artigo = document.createElement('article');
        artigo.className = 'versao-plano';
        const titulo = document.createElement('strong');
        titulo.textContent = `Versão anterior ${historico.length - indice} · ${dataLegivel(versao.salvoEm) || 'Data não informada'}`;
        artigo.appendChild(titulo);
        const nomes = {oQue:'O que',porQue:'Por que',onde:'Onde',quando:'Quando',quem:'Quem',como:'Como',quanto:'Quanto'};
        Object.entries(nomes).forEach(([chave, nome]) => {
          const linha = document.createElement('p');
          linha.textContent = `${nome}: ${versao[chave] || 'Não informado'}`;
          artigo.appendChild(linha);
        });
        historicoLista.appendChild(artigo);
      });
    }
    dialogoPlano.showModal();
  }
  botaoHistorico.addEventListener('click', () => {
    historicoPlano.hidden = !historicoPlano.hidden;
    botaoHistorico.textContent = historicoPlano.hidden ? 'Ver histórico' : 'Ocultar histórico';
  });
  $('fecharPlano').addEventListener('click', () => dialogoPlano.close());
  $('cancelarPlano').addEventListener('click', () => dialogoPlano.close());
  dialogoPlano.addEventListener('close', () => { idPlano = null; $('erroPlano').textContent = ''; });
  formPlano.addEventListener('submit', evento => {
    evento.preventDefault();
    if (!idPlano || !formPlano.reportValidity()) return;
    const valores = Object.fromEntries(Object.entries(camposPlano).map(([chave, campo]) => [chave, campo.value.trim()]));
    if (!valores.oQue || !valores.porQue || !valores.quando || !valores.quem || !valores.como) {
      $('erroPlano').textContent = 'Preencha todos os campos obrigatórios.';
      return;
    }
    try {
      const atuais = lerRegistros();
      const item = atuais.find(r => r && String(r.id) === idPlano);
      if (!item) { $('erroPlano').textContent = 'Assunto não encontrado. Atualize a página.'; return; }
      const agora = new Date().toISOString();
      if (item.plano5w2h && typeof item.plano5w2h === 'object') {
        if (!Array.isArray(item.historico5w2h)) item.historico5w2h = [];
        item.historico5w2h.push({...item.plano5w2h});
      }
      item.plano5w2h = {...valores, salvoEm: agora};
      item.atualizadoEm = agora;
      salvarRegistros(atuais);
      registros = atuais;
      dialogoPlano.close();
      renderizar();
      notificar('Plano de ação 5W2H salvo com sucesso. O status do assunto foi preservado.');
    } catch (erro) {
      console.error('Falha ao salvar plano 5W2H:', erro);
      $('erroPlano').textContent = 'Não foi possível salvar o plano de ação neste navegador.';
    }
  });
  SETORES.forEach(s => {
    const option = document.createElement('option');
    option.value = s;
    option.textContent = s;
    $('editarSetor').appendChild(option);
  });
  formEdicao.addEventListener('submit', e => {
    e.preventDefault();
    const responsavel = $('editarResponsavel').value.trim().replace(/\s+/g, ' ');
    const setor = $('editarSetor').value;
    const reuniao = $('editarDataReuniao').value;
    const assunto = $('editarTexto').value.trim();
    if (!responsavel || responsavel.length > 120 || !SETORES.includes(setor) || !assunto || assunto.length > 500 || !ehSegunda(reuniao)) {
      erroEdicao.textContent = 'Preencha os campos corretamente. A reunião deve ser em uma segunda-feira e o assunto deve ter até 500 caracteres.';
      return;
    }
    try {
      const atuais = lerRegistros();
      const item = atuais.find(r => r && String(r.id) === idEditando);
      if (!item) { erroEdicao.textContent = 'Assunto não encontrado. Atualize a página.'; return; }
      if ((item.setor !== setor || item.dataReuniao !== reuniao) &&
          atuais.filter(r => r && String(r.id) !== idEditando && r.setor === setor && r.dataReuniao === reuniao).length >= 3) {
        erroEdicao.textContent = 'O setor de destino já possui três assuntos nessa reunião.';
        return;
      }
      item.responsavel = responsavel;
      item.setor = setor;
      item.dataReuniao = reuniao;
      item.assunto = assunto;
      item.atualizadoEm = new Date().toISOString();
      salvarRegistros(atuais);
      registros = atuais;
      dialogo.close();
      idEditando = null;
      renderizar();
      notificar('Assunto atualizado com sucesso.');
    } catch (erro) {
      console.error('Falha ao editar assunto:', erro);
      erroEdicao.textContent = 'Não foi possível salvar a edição neste navegador.';
    }
  });
  $('cancelarEdicao').addEventListener('click', () => dialogo.close());
  dialogo.addEventListener('close', () => { idEditando = null; erroEdicao.textContent = ''; });
  filtroData.value = proximaSegunda();
  filtroData.addEventListener('change', renderizar);
  busca.addEventListener('input', renderizar);
  atualizar.addEventListener('click', carregar);
  window.addEventListener('storage', evento => { if (evento.key === CHAVE || evento.key === null) carregar(); });
  window.addEventListener('focus', carregar);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) carregar(); });
  window.addEventListener('message', evento => {
    if (evento.origin === window.location.origin && evento.data?.tipo === 'nexus:assuntos-atualizados') carregar();
  });
  carregar();
})();
