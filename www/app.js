(function () {
  'use strict';

  // ---------- configurações ----------
  var CHAVE = 'gestor_db_v1';
  var CAT = {
    'Alimentação': { cor: '#f97316', ic: '🍽️' },
    'Transporte':  { cor: '#3b82f6', ic: '🚗' },
    'Compras':     { cor: '#a855f7', ic: '🛍️' },
    'Saúde':       { cor: '#ef4444', ic: '💊' },
    'Lazer':       { cor: '#ec4899', ic: '🎮' },
    'Contas':      { cor: '#14b8a6', ic: '🧾' },
    'Entrada':     { cor: '#0f9d78', ic: '💰' },
    'Outros':      { cor: '#94a3b8', ic: '📦' }
  };
  var TIPOS = { compra_debito: 'Compra no débito', pix_enviado: 'Pix enviado', pix_recebido: 'Pix recebido' };
  var reduzido = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------- utilitários ----------
  function $(id) { return document.getElementById(id); }
  function p2(n) { return n < 10 ? '0' + n : '' + n; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function brl(v) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
  function chaveDia(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function hora(d) { return p2(d.getHours()) + ':' + p2(d.getMinutes()); }
  function dataHora(d) { return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() + ' às ' + hora(d); }
  function inicioDoDia(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function cor(c) { return (CAT[c] || CAT.Outros).cor; }
  function novoUid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function lerValor(txt) {
    var s = String(txt).replace(/R\$|\s/g, '');
    if (!/^-?[\d.,]+$/.test(s)) return null;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var v = parseFloat(s);
    return isFinite(v) ? r2(v) : null;
  }

  // ---------- dados (um único lugar para guardar tudo) ----------
  function vazio() { return { v: 1, config: { saldoInicial: null, desde: null }, movs: [], naoRec: [] }; }
  function carregar() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { d = null; }
    if (!d || d.v !== 1) {
      d = vazio();
      try { // traz o que a versão 0.1 já tinha guardado
        (JSON.parse(localStorage.getItem('movs')) || []).forEach(function (m) { m.conta = 'caixa'; d.movs.push(m); });
        d.naoRec = JSON.parse(localStorage.getItem('naoRec')) || [];
      } catch (e) { }
    }
    d.movs.forEach(function (m) { if (!m.uid) m.uid = novoUid(); });
    return d;
  }
  var db = carregar();
  var ui = {
    tela: 'inicio', status: null, erroNativo: '',
    mes: { ano: new Date().getFullYear(), mes: new Date().getMonth() },
    filtro: { tipo: 'todas', periodo: 'mes', busca: '' }
  };
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(db)); }
    catch (e) { ui.erroNativo = 'Não consegui salvar os dados (falta espaço?)'; }
  }
  function saldoAtual() {
    if (db.config.saldoInicial == null) return null;
    var s = db.config.saldoInicial;
    db.movs.forEach(function (m) { if ((m.recebida || m.data) >= db.config.desde) s += m.sinal * m.valor; });
    return r2(s);
  }
  function porDataDesc(a, b) { return b.data.localeCompare(a.data); }

  // ---------- animação de números ----------
  function contar(el, alvo) {
    var de = el._v || 0;
    el._v = alvo;
    if (reduzido || de === alvo) { el.textContent = brl(alvo); return; }
    var t0 = performance.now(), dur = 700;
    (function passo(t) {
      var p = Math.min(1, ((t || performance.now()) - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = brl(de + (alvo - de) * e);
      if (p < 1) requestAnimationFrame(passo); else el.textContent = brl(alvo);
    })(t0);
  }

  // ---------- peças reutilizáveis ----------
  function itemHtml(m, i, comData) {
    var c = CAT[m.categoria] || CAT.Outros, d = new Date(m.data);
    var quando = comData ? p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + ' · ' + hora(d) : hora(d);
    return '<button class="mov" data-uid="' + esc(m.uid) + '" style="animation-delay:' + Math.min(i, 10) * 40 + 'ms">' +
      '<span class="ic" style="background:' + c.cor + '22">' + c.ic + '</span>' +
      '<span class="txt"><b>' + esc(m.descricao) + '</b><small>' + esc(m.categoria) + ' · ' + quando + '</small></span>' +
      '<span class="val ' + (m.sinal > 0 ? 'in' : 'out') + '">' + (m.sinal > 0 ? '+' : '−') + brl(m.valor) + '</span></button>';
  }
  function rotuloDia(d) {
    var diff = Math.round((inicioDoDia(new Date()) - inicioDoDia(d)) / 86400000);
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace(/\./g, '');
  }
  function sinalValor(v) { return (v >= 0 ? '+' : '−') + brl(Math.abs(v)); }

  // ---------- tela Início ----------
  function doMes(m) { var d = new Date(m.data); return d.getFullYear() === ui.mes.ano && d.getMonth() === ui.mes.mes; }

  function desenharRosca(movs) {
    var mapa = {}, total = 0;
    movs.forEach(function (m) { if (m.sinal < 0) { mapa[m.categoria] = (mapa[m.categoria] || 0) + m.valor; total += m.valor; } });
    var box = $('boxRosca');
    if (!total) { box.innerHTML = '<p class="vazio">Sem saídas neste mês.</p>'; return; }
    var R = 46, C = 2 * Math.PI * R, off = 0, segs = '';
    var cats = Object.keys(mapa).sort(function (a, b) { return mapa[b] - mapa[a]; });
    cats.forEach(function (c) {
      var len = mapa[c] / total * C;
      segs += '<circle class="seg" cx="60" cy="60" r="' + R + '" fill="none" stroke="' + cor(c) + '" stroke-width="14" data-len="' + len +
        '" style="stroke-dasharray:0 ' + C + ';stroke-dashoffset:' + (-off) + '"/>';
      off += len;
    });
    var leg = cats.map(function (c) {
      return '<div><i style="background:' + cor(c) + '"></i><span>' + esc(c) + '</span><b>' + brl(mapa[c]) + '</b><em>' + Math.round(mapa[c] / total * 100) + '%</em></div>';
    }).join('');
    box.innerHTML = '<div class="rosca-wrap"><div class="rosca-svg"><svg viewBox="0 0 120 120"><g transform="rotate(-90 60 60)">' +
      '<circle cx="60" cy="60" r="46" fill="none" stroke="var(--line)" stroke-width="14"/>' + segs + '</g></svg>' +
      '<div class="rosca-centro"><small>Saídas</small><b>' + brl(total) + '</b></div></div><div class="legenda">' + leg + '</div></div>';
    var gap = cats.length > 1 ? 2 : 0;
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      Array.prototype.forEach.call(box.querySelectorAll('.seg'), function (el) {
        el.style.strokeDasharray = Math.max(+el.getAttribute('data-len') - gap, 0.5) + ' ' + C;
      });
    }); });
  }

  function desenharBarras() {
    var hoje = inicioDoDia(new Date()), dias = [], idx = {}, i;
    for (i = 6; i >= 0; i--) { var d = new Date(hoje); d.setDate(hoje.getDate() - i); idx[chaveDia(d)] = dias.length; dias.push({ d: d, e: 0, s: 0 }); }
    db.movs.forEach(function (m) {
      var k = chaveDia(new Date(m.data));
      if (k in idx) { var o = dias[idx[k]]; if (m.sinal > 0) o.e += m.valor; else o.s += m.valor; }
    });
    var max = 0;
    dias.forEach(function (o) { max = Math.max(max, o.e, o.s); });
    var h = function (v) { return max ? Math.max(v / max * 100, v > 0 ? 4 : 0) : 0; };
    if (!max) { $('boxBarras').innerHTML = '<p class="vazio">Sem movimentações nos últimos 7 dias.</p>'; return; }
    $('boxBarras').innerHTML = '<div class="barras">' + dias.map(function (o, k) {
      return '<div class="col"><div class="par">' +
        '<span class="b i" style="height:' + h(o.e) + '%;animation-delay:' + k * 60 + 'ms"></span>' +
        '<span class="b o" style="height:' + h(o.s) + '%;animation-delay:' + (k * 60 + 30) + 'ms"></span></div>' +
        '<small>' + o.d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '') + '</small></div>';
    }).join('') + '</div><div class="leg-b"><span><i style="background:var(--in)"></i>Entradas</span><span><i style="background:var(--out)"></i>Saídas</span></div>';
  }

  function desenharInicio() {
    var s = saldoAtual();
    contar($('saldo'), s == null ? 0 : s);
    $('saldoInfo').textContent = db.config.desde ? 'Contando desde ' + dataHora(new Date(db.config.desde)) : '';

    var agora = new Date();
    $('mesNome').textContent = new Date(ui.mes.ano, ui.mes.mes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    $('mProx').disabled = ui.mes.ano === agora.getFullYear() && ui.mes.mes === agora.getMonth();

    var doMesLista = db.movs.filter(doMes), ent = 0, sai = 0;
    doMesLista.forEach(function (m) { if (m.sinal > 0) ent += m.valor; else sai += m.valor; });
    contar($('tEnt'), r2(ent)); contar($('tSai'), r2(sai));

    var n = db.naoRec.length;
    $('atencao').hidden = !n;
    if (n) $('atencao').innerHTML = '<span>⚠️ ' + n + (n === 1 ? ' notificação não reconhecida' : ' notificações não reconhecidas') + '</span><button class="link" data-ir="mais">Ver</button>';

    desenharRosca(doMesLista);
    desenharBarras();
    var rec = db.movs.slice().sort(porDataDesc).slice(0, 5);
    $('recentes').innerHTML = rec.length ? rec.map(function (m, i) { return itemHtml(m, i, true); }).join('')
      : '<p class="vazio" style="padding:12px 0">Nenhuma movimentação ainda. Faça um Pix ou uma compra para testar.</p>';
  }

  // ---------- tela Movimentações ----------
  function filtrar() {
    var f = ui.filtro, hoje = new Date(), q = f.busca.trim().toLowerCase(), ini = null, fim = null;
    if (f.periodo === 'mes') { ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1); fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1); }
    else if (f.periodo === 'passado') { ini = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1); fim = new Date(hoje.getFullYear(), hoje.getMonth(), 1); }
    else if (f.periodo === '7d') { ini = inicioDoDia(hoje); ini.setDate(ini.getDate() - 6); }
    return db.movs.filter(function (m) {
      var d = new Date(m.data);
      if (ini && d < ini) return false;
      if (fim && d >= fim) return false;
      if (f.tipo === 'entradas' && m.sinal < 0) return false;
      if (f.tipo === 'saidas' && m.sinal > 0) return false;
      if (q) {
        var alvo = (m.descricao + ' ' + m.categoria + ' ' + m.banco + ' ' + String(m.valor).replace('.', ',') + ' ' + brl(m.valor)).toLowerCase();
        if (alvo.indexOf(q) < 0) return false;
      }
      return true;
    }).sort(porDataDesc);
  }

  function desenharMovs() {
    var lista = filtrar(), ent = 0, sai = 0, grupos = [], mapa = {}, k = 0;
    lista.forEach(function (m) {
      if (m.sinal > 0) ent += m.valor; else sai += m.valor;
      var dk = chaveDia(new Date(m.data));
      if (!(dk in mapa)) { mapa[dk] = { d: new Date(m.data), itens: [], total: 0 }; grupos.push(mapa[dk]); }
      mapa[dk].itens.push(m); mapa[dk].total += m.sinal * m.valor;
    });
    $('resumoFiltro').innerHTML = '<span>' + lista.length + (lista.length === 1 ? ' movimentação' : ' movimentações') + '</span>' +
      '<span><span class="in">+' + brl(ent) + '</span> · <span class="out">−' + brl(sai) + '</span></span>';
    $('listaMovs').innerHTML = grupos.length ? grupos.map(function (g) {
      return '<div class="dia"><span>' + rotuloDia(g.d) + '</span><span>' + sinalValor(r2(g.total)) + '</span></div>' +
        '<div class="card lista">' + g.itens.map(function (m) { return itemHtml(m, k++, false); }).join('') + '</div>';
    }).join('') : '<div class="card"><p class="vazio">Nenhuma movimentação encontrada.</p></div>';
  }

  // ---------- tela Mais ----------
  function desenharMais() {
    $('mSaldoIni').textContent = db.config.saldoInicial == null ? '—' : brl(db.config.saldoInicial);
    $('mDesde').textContent = db.config.desde ? dataHora(new Date(db.config.desde)) : '—';
    $('naoRec').innerHTML = db.naoRec.length ? db.naoRec.map(function (n) {
      return '<div class="nr">' + esc(n.texto) + '<small>' + esc(n.pacote) + '</small></div>';
    }).join('') : '<p class="vazio">Nada por aqui.</p>';
    desenharDiag();
  }
  function linha(ok, t) { return '<p class="' + (ok ? 'in' : 'out') + '">' + (ok ? '✓ ' : '✗ ') + esc(t) + '</p>'; }
  function desenharDiag() {
    var s = ui.status, h = '';
    if (s) {
      h = linha(true, 'Leitor de notificações carregado') +
        linha(s.ativo, s.ativo ? 'Acesso às notificações liberado' : 'Acesso às notificações NÃO liberado') +
        linha(s.conectado, s.conectado ? 'Android conectou o leitor' : 'Android ainda não conectou o leitor') +
        '<p>Notificações vistas: ' + s.vistas + ' · com valor (R$): ' + s.capturadas + '</p>';
    }
    if (ui.erroNativo) h += linha(false, ui.erroNativo);
    $('diag').innerHTML = h || '<p>Carregando...</p>';
  }

  // ---------- janelas ----------
  function abrirDetalhe(uid) {
    var m = db.movs.filter(function (x) { return x.uid === uid; })[0];
    if (!m) return;
    var d = new Date(m.data);
    $('detalhe').innerHTML = '<h3>' + esc(m.descricao) + '</h3>' +
      '<span class="valorG ' + (m.sinal > 0 ? 'in' : 'out') + '">' + (m.sinal > 0 ? '+' : '−') + brl(m.valor) + '</span>' +
      '<div class="linha"><span>Tipo</span><span>' + esc(TIPOS[m.tipo] || m.tipo) + '</span></div>' +
      '<div class="linha"><span>Categoria</span><span>' + esc(m.categoria) + '</span></div>' +
      '<div class="linha"><span>Conta</span><span>' + esc(m.banco) + '</span></div>' +
      '<div class="linha"><span>Data</span><span>' + dataHora(d) + '</span></div>' +
      '<button class="btn" data-fechar="1">Fechar</button>';
    $('fundoDetalhe').classList.add('on');
  }
  var saldoObrigatorio = false;
  function abrirSaldo(primeira) {
    saldoObrigatorio = !!primeira;
    $('saldoTitulo').textContent = primeira ? 'Qual é o saldo atual da sua conta Caixa?' : 'Qual é o saldo atual da conta?';
    $('saldoCampo').value = ''; $('saldoErro').textContent = '';
    $('fundoSaldo').classList.add('on');
    setTimeout(function () { $('saldoCampo').focus(); }, 350);
  }
  function salvarSaldo() {
    var v = lerValor($('saldoCampo').value);
    if (v == null) { $('saldoErro').textContent = 'Digite um valor, por exemplo 371,89'; return; }
    db.config.saldoInicial = v; db.config.desde = new Date().toISOString();
    salvar(); $('fundoSaldo').classList.remove('on'); redesenhar();
  }

  // ---------- navegação ----------
  function redesenhar() {
    if (ui.tela === 'inicio') desenharInicio();
    else if (ui.tela === 'movs') desenharMovs();
    else desenharMais();
  }
  function ir(nome) {
    ui.tela = nome;
    ['inicio', 'movs', 'mais'].forEach(function (t) { $('t-' + t).classList.toggle('ativa', t === nome); });
    Array.prototype.forEach.call(document.querySelectorAll('#nav button'), function (b) { b.classList.toggle('on', b.getAttribute('data-ir') === nome); });
    window.scrollTo(0, 0);
    redesenhar();
  }

  // ---------- conversa com o Android ----------
  function chamar(metodo) {
    var C = window.Capacitor;
    if (!C) return Promise.reject(new Error('Capacitor não carregou'));
    var P = C.Plugins && C.Plugins.Notificacoes;
    if (P && typeof P[metodo] === 'function') return P[metodo]({});
    if (typeof C.nativePromise === 'function') return C.nativePromise('Notificacoes', metodo, {});
    return Promise.reject(new Error('Leitor de notificações não encontrado no app'));
  }
  async function processarFila() {
    var r = await chamar('lerFila'), novos = 0;
    (r.itens || []).forEach(function (n) {
      var m = Parser.interpretar(n);
      if (m) {
        if (!db.movs.some(function (x) { return x.id === m.id; })) { m.conta = 'caixa'; m.uid = novoUid(); db.movs.push(m); novos++; }
      } else { db.naoRec.unshift(n); novos++; }
    });
    if (novos) { db.naoRec = db.naoRec.slice(0, 50); salvar(); redesenhar(); }
  }
  async function atualizar() {
    try {
      var s = await chamar('status');
      ui.status = s; ui.erroNativo = '';
      $('aviso').hidden = !!s.ativo;
      await processarFila();
    } catch (e) { ui.status = null; ui.erroNativo = (e && e.message) ? e.message : String(e); }
    desenharDiag();
  }

  // ---------- eventos ----------
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-ir]');
    if (t) { ir(t.getAttribute('data-ir')); return; }
    t = e.target.closest('[data-uid]');
    if (t) { abrirDetalhe(t.getAttribute('data-uid')); return; }
    t = e.target.closest('[data-tipo]');
    if (t) { ui.filtro.tipo = t.getAttribute('data-tipo'); marcar('chTipo', t); desenharMovs(); return; }
    t = e.target.closest('[data-periodo]');
    if (t) { ui.filtro.periodo = t.getAttribute('data-periodo'); marcar('chPeriodo', t); desenharMovs(); return; }
    if (e.target.closest('[data-fechar]')) $('fundoDetalhe').classList.remove('on');
  });
  function marcar(grupo, ativo) {
    Array.prototype.forEach.call($(grupo).children, function (c) { c.classList.toggle('on', c === ativo); });
  }
  $('fundoDetalhe').addEventListener('click', function (e) { if (e.target === this) this.classList.remove('on'); });
  $('fundoSaldo').addEventListener('click', function (e) { if (e.target === this && !saldoObrigatorio) this.classList.remove('on'); });
  $('busca').addEventListener('input', function () { ui.filtro.busca = this.value; desenharMovs(); });
  $('mAnt').onclick = function () { ui.mes.mes--; if (ui.mes.mes < 0) { ui.mes.mes = 11; ui.mes.ano--; } desenharInicio(); };
  $('mProx').onclick = function () { ui.mes.mes++; if (ui.mes.mes > 11) { ui.mes.mes = 0; ui.mes.ano++; } desenharInicio(); };
  $('alterarSaldo').onclick = function () { abrirSaldo(false); };
  $('saldoOk').onclick = salvarSaldo;
  $('saldoCampo').addEventListener('keydown', function (e) { if (e.key === 'Enter') salvarSaldo(); });
  $('liberar').onclick = function () {
    chamar('abrirConfiguracoes').catch(function (e) { ui.erroNativo = 'Não consegui abrir as configurações: ' + (e && e.message ? e.message : e); desenharDiag(); });
  };
  window.onerror = function (msg) { ui.erroNativo = String(msg); };
  document.addEventListener('visibilitychange', function () { if (!document.hidden) atualizar(); });

  // ---------- início ----------
  redesenhar();
  atualizar();
  if (db.config.saldoInicial == null) abrirSaldo(true);
  setInterval(function () { if (!document.hidden) atualizar(); }, 3000);
})();
