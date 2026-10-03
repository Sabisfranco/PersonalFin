const CACHE = 'personalfin-renda-v3';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return;

  event.respondWith((async () => {
    const response = await fetch(event.request);
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;

    let html = await response.text();

    // Faz o Painel calcular a renda a partir dos valores que você digitou
    // nas tabelas Personal, Consultoria e Aplicativo.
    const oldIncome = /function income\(\)\{return db\.entries\.filter\(e=>e\.ym===ym\(\)&&e\.type==='entrada'\)\.reduce\(\(s,e\)=>s\+n\(e\.amount\),0\)\}/;
    const newIncome = `function income(){
  const mesAtual=db.month;
  const rendaPessoal=sumInputs('personal',mesAtual);
  const rendaConsultoria=sumInputs('consultoria',mesAtual);
  const rendaAplicativo=n(db.inputs.app);
  const entradasExtras=db.entries
    .filter(e=>e.ym===ym()&&e.type==='entrada')
    .reduce((total,e)=>total+n(e.amount),0);
  return rendaPessoal+rendaConsultoria+rendaAplicativo+entradasExtras;
}`;

    if (oldIncome.test(html)) {
      html = html.replace(oldIncome, newIncome);
    }

    // Não deixa o valor disponível ficar negativo.
    html = html.replace(
      /bal=inc-out/,
      'bal=Math.max(0,inc-out)'
    );

    // Troca apenas o título exibido no Painel.
    html = html.replace(
      '<div class="label">Saldo</div>',
      '<div class="label">Disponível</div>'
    );

    // Garante que o valor disponível continue verde.
    html = html.replace(
      /class="big \$\{bal>=0\?'green':'red'\}"/,
      'class="big green"'
    );

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  })());
});
