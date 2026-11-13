/* NEXUS V2 — Formulário para reunião
   Armazenamento demonstrativo LOCAL ao navegador (não compartilhado).
   Chave e estrutura podem ser reutilizadas em assuntos-por-setor.js. */
(() => {
  'use strict';

  const CHAVE = 'nexus_v2_assuntos_reuniao';
  const LIMITE_POR_SETOR = 3;
  const SETORES = new Set([
    'Recepção', 'Patrimônio', 'Saúde', 'Social', 'Reembolso',
    'Credenciamento', 'Auditoria', 'Concierge', 'Cadastro',
    'Financeiro', 'Faturamento'
  ]);

  const $ = id => document.getElementById(id);
  const form = $('formularioReuniao');
  if (!form) return;

  const nome = $('nomeResponsavel');
  const dataRegistro = $('dataRegistro');
  const setor = $('setor');
  const dataReuniao = $('dataReuniao');
  const mensagem = $('mensagemFormulario');
  const assuntos = [1, 2, 3].map(n => $('assunto' + n));
  const botaoEnviar = form.querySelector('button[type="submit"]');

  function dataLocalISO(data = new Date()) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  function proximaSegunda() {
    const hoje = new Date();
    const dias = (8 - hoje.getDay()) % 7;
    hoje.setDate(hoje.getDate() + dias);
    return dataLocalISO(hoje);
  }

  function ehSegunda(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    const [ano, mes, dia] = iso.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia);
    return data.getFullYear() === ano && data.getMonth() === mes - 1 &&
      data.getDate() === dia && data.getDay() === 1;
  }

  function lerRegistros() {
    const texto = localStorage.getItem(CHAVE);
    if (!texto) return [];
    const dados = JSON.parse(texto);
    if (!Array.isArray(dados)) throw new Error('Formato de registros inválido.');
    return dados;
  }

  function avisar(texto, tipo = 'erro') {
    mensagem.textContent = texto;
    mensagem.dataset.tipo = tipo;
    mensagem.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
  }

  function atualizarContadores() {
    assuntos.forEach((campo, indice) => {
      const contador = $('contador' + (indice + 1));
      if (campo && contador) contador.textContent = String(campo.value.length);
    });
  }

  function atualizarDatas() {
    dataRegistro.value = dataLocalISO();
    if (!dataReuniao.value) dataReuniao.value = proximaSegunda();
  }

  atualizarDatas();
  atualizarContadores();
  assuntos.forEach(campo => campo.addEventListener('input', atualizarContadores));

  form.addEventListener('reset', () => {
    setTimeout(() => {
      atualizarDatas();
      atualizarContadores();
      avisar('', 'info');
    }, 0);
  });

  form.addEventListener('submit', evento => {
    evento.preventDefault();
    avisar('', 'info');

    const responsavel = nome.value.trim().replace(/\s+/g, ' ');
    const setorSelecionado = setor.value;
    const reuniao = dataReuniao.value;
    const temas = assuntos.map(campo => campo.value.trim()).filter(Boolean);

    if (!responsavel || !SETORES.has(setorSelecionado) || !reuniao || !temas.length) {
      avisar('Preencha o nome, o setor, a data da reunião e pelo menos um assunto.');
      return;
    }
    if (!ehSegunda(reuniao)) {
      avisar('Selecione uma segunda-feira como data da reunião.');
      dataReuniao.focus();
      return;
    }
    if (temas.some(tema => tema.length > 500)) {
      avisar('Cada assunto pode ter no máximo 500 caracteres.');
      return;
    }

    try {
      botaoEnviar.disabled = true;
      const registros = lerRegistros();
      const existentes = registros.filter(r => r && r.setor === setorSelecionado && r.dataReuniao === reuniao).length;
      if (existentes + temas.length > LIMITE_POR_SETOR) {
        const restantes = Math.max(0, LIMITE_POR_SETOR - existentes);
        avisar(`O setor ${setorSelecionado} já possui ${existentes} assunto(s) nessa reunião. Restam ${restantes} vaga(s), considerando todos os registros feitos neste navegador.`);
        return;
      }

      const agora = new Date();
      const novos = temas.map((assunto, indice) => ({
        id: (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
          ? crypto.randomUUID() : `${Date.now()}-${indice}-${Math.random().toString(36).slice(2)}`,
        responsavel,
        setor: setorSelecionado,
        dataRegistro: dataLocalISO(agora),
        registradoEm: agora.toISOString(),
        dataReuniao: reuniao,
        assunto,
        concluido: false
      }));
      localStorage.setItem(CHAVE, JSON.stringify([...registros, ...novos]));
      form.reset();
      avisar(`${novos.length} assunto(s) registrado(s) com sucesso neste navegador. Eles poderão ser exibidos na página “Assuntos por setor” quando ela estiver integrada ao mesmo armazenamento.`, 'sucesso');
      try { window.parent?.postMessage({ tipo: 'nexus:assuntos-atualizados' }, window.location.origin); } catch (_) { /* sem integração externa */ }
    } catch (erro) {
      console.error('Falha ao registrar assuntos:', erro);
      avisar('Não foi possível salvar. Verifique se o navegador permite armazenamento local e tente novamente.');
    } finally {
      botaoEnviar.disabled = false;
    }
  });
})();
