import { sb, S, t, $, esc, addText } from './core.js';
addText({
ar:{s_dash:'اللوحة',s_items:'الأصناف',s_total:'إجمالي الأوراق',s_count:'الأصناف',s_low:'منخفضة المخزون',s_value:'قيمة المخزون',s_buy:'شراء',s_issue:'صرف وإرجاع',s_count_btn:'جرد',s_lowlist:'أصناف تحتاج شراء',s_lastbuy:'آخر المشتريات',s_lastiss:'آخر عمليات الصرف',s_add:'إضافة صنف ورق',s_type:'نوع الورق',s_gsm:'الوزن (غرام GSM)',s_w:'العرض (سم)',s_l:'الطول (سم)',s_min:'الحد الأدنى (أوراق)',s_sheets:'ورقة',s_search:'ابحث بالنوع أو الوزن أو القياس',s_all:'الكل',s_dup:'هذا الصنف موجود مسبقاً',s_req:'أكمل النوع والوزن والعرض والطول',s_avg:'متوسط التكلفة',s_val:'القيمة',s_editmin:'تعديل الحد الأدنى',s_none:'لا توجد أصناف بعد',s_noissue:'لا توجد عمليات',s_ream:'رزمة',s_draft:'مسودة',s_confirmed:'مؤكَّد',s_cancelled:'ملغى',s_cur:'د.ج'},
fr:{s_dash:'Tableau',s_items:'Articles',s_total:'Total des feuilles',s_count:'Articles',s_low:'Stock bas',s_value:'Valeur du stock',s_buy:'Achat',s_issue:'Sortie / Retour',s_count_btn:'Inventaire',s_lowlist:'Articles à racheter',s_lastbuy:'Derniers achats',s_lastiss:'Dernières sorties',s_add:'Ajouter un papier',s_type:'Type de papier',s_gsm:'Grammage (GSM)',s_w:'Largeur (cm)',s_l:'Longueur (cm)',s_min:'Minimum (feuilles)',s_sheets:'feuilles',s_search:'Rechercher par type, grammage ou format',s_all:'Tous',s_dup:'Cet article existe déjà',s_req:'Renseignez type, grammage, largeur et longueur',s_avg:'Coût moyen',s_val:'Valeur',s_editmin:'Modifier le minimum',s_none:'Aucun article',s_noissue:'Aucune opération',s_ream:'ramettes',s_draft:'Brouillon',s_confirmed:'Confirmé',s_cancelled:'Annulé',s_cur:'DA'}});

let seg = 'dash', q = '', fT = '', fG = '', fS = '';
const nf = n => Number(n || 0).toLocaleString('fr-FR');
const sz = i => `${Number(i.width_cm)}×${Number(i.length_cm)}`;

export async function render(m) {
  const isM = S.profile.role === 'manager', bid = S.profile.branch_id;
  const R = await Promise.all([
    sb.from('paper_stock_view').select('*').eq('active', true).order('name_ar').order('gsm'),
    sb.from('paper_types').select('id,name_ar,name_fr').eq('active', true).order('sort_order'),
    isM ? sb.from('paper_item_costs').select('paper_item_id,avg_cost_per_sheet') : { data: [] },
    isM ? sb.from('paper_purchases').select('id,paper_item_id,purchase_date,reams,total_sheets,total_cost').order('created_at', { ascending: false }).limit(5) : { data: [] },
    sb.from('paper_issues').select('id,paper_item_id,order_id,sheets,status,issue_date').order('created_at', { ascending: false }).limit(5)
  ]);
  for (const r of R) if (r.error) throw r.error;
  const [items, types, costs, buys, iss] = R.map(r => r.data || []);
  const byId = Object.fromEntries(items.map(i => [i.id, i]));
  const cost = Object.fromEntries(costs.map(c => [c.paper_item_id, Number(c.avg_cost_per_sheet)]));
  const oids = [...new Set(iss.map(x => x.order_id))];
  const ords = oids.length ? (await sb.from('orders').select('id,description').in('id', oids)).data || [] : [];
  const oName = Object.fromEntries(ords.map(o => [o.id, o.description]));
  const nm = o => (S.lang === 'ar' ? o.name_ar : o.name_fr);
  const label = i => `${nm(i)} · ${i.gsm} g · ${sz(i)}`;
  const total = items.reduce((a, i) => a + i.sheets_on_hand, 0);
  const lows = items.filter(i => i.is_low);
  const value = items.reduce((a, i) => a + i.sheets_on_hand * (cost[i.id] || 0), 0);
  const card = (l, n, c) => `<div class="card"><small>${l}</small><div class="num" style="color:${c}">${n}</div></div>`;

  const dash = () => `<div class="grid">${card(t('s_total'), nf(total), 'var(--blue)')}${card(t('s_count'), items.length, 'var(--green)')}${card(t('s_low'), lows.length, 'var(--amber)')}${isM ? card(t('s_value'), nf(Math.round(value)) + ' ' + t('s_cur'), 'var(--navy)') : ''}</div>
  <div class="grid" style="grid-template-columns:repeat(${isM ? 3 : 2},1fr)">${isM ? `<button class="btn" data-open="paperbuy">${t('s_buy')}</button>` : ''}<button class="btn" data-open="paperissue">${t('s_issue')}</button><button class="btn out" data-open="papercount">${t('s_count_btn')}</button></div>
  <h2>${t('s_lowlist')}</h2><div class="card">${lows.map(i => `<div class="row"><span>${esc(label(i))}</span><span class="badge late">${nf(i.sheets_on_hand)} / ${nf(i.min_sheets)}</span></div>`).join('') || `<div class="muted">—</div>`}</div>
  ${isM ? `<h2>${t('s_lastbuy')}</h2><div class="card">${buys.map(b => `<div class="row"><span>${esc(byId[b.paper_item_id] ? label(byId[b.paper_item_id]) : '')}<br><small style="color:var(--mute)">${esc(b.purchase_date)} · ${b.reams} ${t('s_ream')} · ${nf(b.total_sheets)} ${t('s_sheets')}</small></span><b>${nf(b.total_cost)} ${t('s_cur')}</b></div>`).join('') || `<div class="muted">${t('s_noissue')}</div>`}</div>` : ''}
  <h2>${t('s_lastiss')}</h2><div class="card">${iss.map(x => `<div class="row"><span>${esc(byId[x.paper_item_id] ? label(byId[x.paper_item_id]) : '')}<br><small style="color:var(--mute)">${esc(oName[x.order_id] || '')} · ${esc(x.issue_date)}</small></span><span><b>${nf(x.sheets)}</b> <span class="badge">${t('s_' + x.status)}</span></span></div>`).join('') || `<div class="muted">${t('s_noissue')}</div>`}</div>`;

  const itemsView = () => {
    const ql = q.trim().toLowerCase();
    const rows = items.filter(i => (!fT || i.paper_type_id === fT) && (!fG || String(i.gsm) === fG) && (!fS || sz(i) === fS) && (!ql || `${nm(i)} ${i.gsm} ${sz(i)}`.toLowerCase().includes(ql))).map(i => `<div class="card f"><div class="row" style="border:0;padding:0"><b>${esc(label(i))}</b><span class="badge ${i.is_low ? 'late' : ''}">${nf(i.sheets_on_hand)} ${t('s_sheets')}</span></div>
      <small style="color:var(--mute)">${t('s_min')}: ${nf(i.min_sheets)}${isM ? ` · ${t('s_avg')}: ${(cost[i.id] || 0).toFixed(2)} · ${t('s_val')}: ${nf(Math.round(i.sheets_on_hand * (cost[i.id] || 0)))} ${t('s_cur')}` : ''}</small>
      <button class="btn out" data-min="${i.id}" style="min-height:40px">${t('s_editmin')}</button></div>`).join('');
    const opts = (arr, cur) => `<option value="">${t('s_all')}</option>${arr.map(v => `<option value="${esc(v[0])}" ${cur === v[0] ? 'selected' : ''}>${esc(v[1])}</option>`).join('')}`;
    const gs = [...new Set(items.map(i => String(i.gsm)))].sort((a, b) => a - b).map(v => [v, v + ' g']);
    const ss = [...new Set(items.map(sz))].map(v => [v, v]);
    return `<button class="btn" data-add="1">${t('s_add')}</button>
    <div class="f"><input id="sq" type="search" placeholder="${t('s_search')}" value="${esc(q)}">
    <div class="grid" style="grid-template-columns:repeat(3,1fr)"><select id="sT" aria-label="type">${opts(types.map(x => [x.id, nm(x)]), fT)}</select><select id="sG" aria-label="gsm">${opts(gs, fG)}</select><select id="sS" aria-label="size">${opts(ss, fS)}</select></div></div>
    <div id="sl" class="f">${rows || `<div class="muted">${t('s_none')}</div>`}</div>`;
  };

  const draw = () => {
    const sg = (k, l) => `<button class="btn ${seg === k ? '' : 'out'}" data-seg="${k}">${l}</button>`;
    m.innerHTML = `<div class="grid">${sg('dash', t('s_dash'))}${sg('items', t('s_items'))}</div><div id="sb" class="f">${seg === 'dash' ? dash() : itemsView()}</div>`;
    m.querySelectorAll('[data-seg]').forEach(b => (b.onclick = () => { seg = b.dataset.seg; draw(); }));
    m.querySelectorAll('[data-open]').forEach(b => (b.onclick = () => openMod(b.dataset.open)));
    m.querySelectorAll('[data-add]').forEach(b => (b.onclick = addForm));
    m.querySelectorAll('[data-min]').forEach(b => (b.onclick = () => editMin(byId[b.dataset.min])));
    if (seg === 'items') {
      const re = () => { q = $('#sq').value; fT = $('#sT').value; fG = $('#sG').value; fS = $('#sS').value; draw(); };
      $('#sq').oninput = e => { q = e.target.value; const pos = e.target.selectionStart; draw(); const n = $('#sq'); n.focus(); n.setSelectionRange(pos, pos); };
      ['sT', 'sG', 'sS'].forEach(id => ($('#' + id).onchange = re));
    }
  };

  async function openMod(name) {
    try {
      const mod = await import(`./${name}.js?v=${Date.now()}`);
      await mod.render(m, () => render(m));
    } catch (e) {
      console.error(e);
      const missing = /dynamically imported|Failed to fetch|Importing a module/i.test(String(e.message));
      $('#sb').insertAdjacentHTML('afterbegin', `<div class="muted">${missing ? t('soon') : t('err') + ': ' + esc(e.message || e)}</div>`);
    }
  }

  function addForm() {
    m.innerHTML = `<h2>${t('s_add')}</h2><div class="f">
    <select id="ft" aria-label="${t('s_type')}">${types.map(x => `<option value="${x.id}">${esc(nm(x))}</option>`).join('')}</select>
    <input id="fg" type="number" inputmode="numeric" min="1" placeholder="${t('s_gsm')}">
    <div class="grid"><input id="fw" type="number" inputmode="decimal" min="0" step="any" placeholder="${t('s_w')}"><input id="fl" type="number" inputmode="decimal" min="0" step="any" placeholder="${t('s_l')}"></div>
    <input id="fm" type="number" inputmode="numeric" min="0" placeholder="${t('s_min')}">
    <div class="err" id="fe" role="alert"></div>
    <button class="btn" id="fs">${t('o_save')}</button><button class="btn out" id="fc">${t('o_cancel')}</button></div>`;
    $('#fc').onclick = () => render(m);
    $('#fs').onclick = async () => {
      const gsm = Number($('#fg').value), w = Number($('#fw').value), l = Number($('#fl').value);
      if (!$('#ft').value || !(gsm > 0) || !(w > 0) || !(l > 0)) return ($('#fe').textContent = t('s_req'));
      const { error } = await sb.from('paper_items').insert({ branch_id: bid, paper_type_id: $('#ft').value, gsm, width_cm: w, length_cm: l, min_sheets: Number($('#fm').value || 0) });
      if (error) return ($('#fe').textContent = error.code === '23505' ? t('s_dup') : t('err') + ': ' + error.message);
      seg = 'items';
      render(m);
    };
  }

  function editMin(i) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:60;padding:16px';
    d.innerHTML = `<div class="card f" style="width:100%;max-width:420px"><b>${esc(label(i))}</b><input id="mn" type="number" inputmode="numeric" min="0" value="${i.min_sheets}" placeholder="${t('s_min')}">
    <div class="err" id="me" role="alert"></div><button class="btn" id="ms">${t('o_save')}</button><button class="btn out" id="mc">${t('o_cancel')}</button></div>`;
    document.body.appendChild(d);
    d.querySelector('#mc').onclick = () => d.remove();
    d.querySelector('#ms').onclick = async () => {
      const { error } = await sb.from('paper_items').update({ min_sheets: Number(d.querySelector('#mn').value || 0) }).eq('id', i.id);
      if (error) return (d.querySelector('#me').textContent = t('err') + ': ' + error.message);
      d.remove();
      render(m);
    };
  }
  draw();
}
