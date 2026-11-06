// Leitor de notificações bancárias. Um bloco por banco: para criar outro banco, copie
// uma função "caixa" e ajuste os textos.
(function (root) {
  function valor(s) { return parseFloat(s.replace(/\./g, '').replace(',', '.')); }
  function limpa(s) { return s.replace(/\s+/g, ' ').trim(); }

  function caixa(n) {
    var t = (n.texto || '').replace(/\r/g, ''), m;

    // Compra no débito. Ex.: "Compra com cartão de débito ELO, R$ 6,00, conta final 55-1, 04/11/2026 às 18:47."
    m = t.match(/Compra com cart[ãa]o de d[ée]bito(?: [A-Za-z]+)?,\s*R\$\s*([\d.]+,\d{2}),\s*conta final ([\d-]+),\s*(\d{2})\/(\d{2})\/(\d{4}) [àa]s (\d{2}):(\d{2})/i);
    if (m) return {
      banco: 'Caixa', tipo: 'compra_debito', sinal: -1, valor: valor(m[1]),
      descricao: 'Compra no débito',
      data: new Date(+m[5], +m[4] - 1, +m[3], +m[6], +m[7]).toISOString()
    };

    // Pix enviado. Ex.: "Pix enviado com sucesso para o(a) BANCO, no valor de R$32,65 para NOME."
    m = t.match(/Pix enviado com sucesso para o\(a\) (.+?), no valor de R\$\s*([\d.]+,\d{2}) para (.+?)\.\s*(?:N[ãa]o reconhece|$)/is);
    if (m) return {
      banco: 'Caixa', tipo: 'pix_enviado', sinal: -1, valor: valor(m[2]),
      descricao: limpa(m[3]), data: new Date(n.quando).toISOString()
    };

    // Pix recebido. Ex.: "Pix recebido com sucesso do(a) BANCO, no valor de R$1,00 do(a) NOME. ."
    m = t.match(/Pix recebido com sucesso do\(a\) (.+?), no valor de R\$\s*([\d.]+,\d{2}) do\(a\) (.+?)[.\s]*$/is);
    if (m) return {
      banco: 'Caixa', tipo: 'pix_recebido', sinal: 1, valor: valor(m[2]),
      descricao: limpa(m[3]), data: new Date(n.quando).toISOString()
    };
    return null;
  }

  var LEITORES = [caixa];

  var CATEGORIAS = [
    [/ifood|restaurante|lanche|padaria|mercado|supermercado/i, 'Alimentação'],
    [/uber|99|posto|combust/i, 'Transporte']
  ];
  function categoria(desc) {
    for (var i = 0; i < CATEGORIAS.length; i++) if (CATEGORIAS[i][0].test(desc)) return CATEGORIAS[i][1];
    return 'Outros';
  }

  // n = { pacote, titulo, texto, quando, chave }
  function interpretar(n) {
    for (var i = 0; i < LEITORES.length; i++) {
      var r = LEITORES[i](n);
      if (r) {
        r.id = (n.chave || n.quando) + '|' + n.texto;
        r.categoria = r.sinal > 0 ? 'Entrada' : categoria(r.descricao);
        r.pacote = n.pacote;
        r.recebida = new Date(n.quando).toISOString();
        return r;
      }
    }
    return null;
  }

  var api = { interpretar: interpretar };
  if (typeof module !== 'undefined') module.exports = api; else root.Parser = api;
})(this);
