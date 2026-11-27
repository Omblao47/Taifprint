import { sb, S, t, $, esc, addText } from './core.js';
addText({
ar:{i_new:'صرف جديد',i_list:'العمليات',i_item:'صنف الورق',i_order:'الطلبية',i_oitem:'المنتج (اختياري)',i_sheets:'عدد الأوراق',i_note:'ملاحظة',i_draft:'حفظ كمسودة',i_confirm:'حفظ وتأكيد الصرف',i_conf1:'تأكيد الصرف',i_cancel:'إلغاء الصرف',i_return:'إرجاع',i_ret_q:'عدد الأوراق المرجعة',i_reason:'السبب',i_returned:'مُرجَع',i_avail:'المتاح',i_req:'اختر الصنف والطلبية واكتب عدد الأوراق',i_over:'الكمية أكبر من الرصيد المتاح',i_none:'لا توجد عمليات صرف',i_pickitem:'اختر الصنف',i_pickorder:'اختر الطلبية',i_all:'كل الطلبية',i_back:'رجوع',i_nodraft:'حُفظ كمسودة ولم يُؤكَّد',i_noorders:'لا توجد طلبيات'},
fr:{i_new:'Nouvelle sortie',i_list:'Opérations',i_item:'Article',i_order:'Commande',i_oitem:'Produit (facultatif)',i_sheets:'Nombre de feuilles',i_note:'Remarque',i_draft:'Enregistrer en brouillon',i_confirm:'Enregistrer et confirmer',i_conf1:'Confirmer la sortie',i_cancel:'Annuler la sortie',i_return:'Retour',i_ret_q:'Feuilles retournées',i_reason:'Motif',i_returned:'Retourné',i_avail:'Disponible',i_req:'Choisissez article, commande et nombre de feuilles',i_over:'Quantité supérieure au stock disponible',i_none:'Aucune sortie',i_pickitem:'Choisir l’article',i_pickorder:'Choisir la commande',i_all:'Toute la commande',i_back:'Retour',i_nodraft:'Enregistré en brouillon, non confirmé',i_noorders:'Aucune commande'}});

let view = 'new', note = '';
const nf = n => Number(n || 0).toLocaleString('fr-FR');

export async function render(m, back) {
  const hide = S.profile.role === 'production_manager';
  const R = await Promise.all([
    sb.from('paper_stock_view').select('id,name_ar,name_fr,gsm,width_cm,length_cm,sheets_on_hand').eq('active', true).order('name_ar').order('gsm'),
    sb.from('orders').select('id,order_number,description,status').order('created_at', { ascending: false }).limit(300),
    sb.from('order_items').select('id,order_id,line_no,product_name'),
    sb.from('paper_issues').select('id,paper_item_id,order_id,order_item_id,sheets,status,issue_date,note').order('created_at', { ascending: false }).limit(50),
    sb.from('paper_returns').select('issue_id,sheets')
  ]);
  for (const r of R) if (r.error) throw r.error;
  const [items, orders, oitems, issues, rets] = R.map(r => r.data || []);
  const itemBy = Object.fromEntries(items.map(i => [i.id, i]));
  const orderBy = Object.fromEntries(orders.map(o => [o.id, o]));
  const names = {}, retBy = {};
  oitems.sort((a, b) => a.line_no - b.line_no).forEach(i => (names[i.order_id] ||= []).push(i));
  rets.forEach(r => (retBy[r.issue_id] = (retBy[r.issue_id] || 0) + r.sheets));
  const label = i => `${S.lang === 'ar' ? i.name_ar : i.name_fr} · ${i.gsm} g · ${Number(i.width_cm)}×${Number(i.length_cm)}`;
  const oLabel = o => (hide ? '' : o.order_number + ' · ') + ((names[o.id] || []).map(x => x.product_name).join(' + ') || o.description || '');
  const active = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));

  const form = () => `<div class="f">
    <select id="ii" aria-label="${t('i_item')}"><option value="">${t('i_pickitem')}</option>${items.map(i => `<option value="${i.id}">${esc(label(i))} (${t('i_avail')}: ${nf(i.sheets_on_hand)})</option>`).join('')}</select>
    <select id="io" aria-label="${t('i_order')}"><option value="">${t('i_pickorder')}</option>${active.map(o => `<option value="${o.id}">${esc(oLabel(o))}</option>`).join('')}</select>
    <select id="ip" aria-label="${t('i_oitem')}"><option value="">${t('i_all')}</option></select>
    <input id="is" type="number" inputmode="numeric" min="1" step="1" placeholder="${t('i_sheets')}">
    <input id="in" placeholder="${t('i_note')}" value="${esc(note)}">
    <div class="err" id="ie" role="alert"></div>
    <button class="btn" id="ic">${t('i_confirm')}</button><button class="btn out" id="id">${t('i_draft')}</button></div>`;

  const list = () => issues.map(x => {
    const it = itemBy[x.paper_item_id], o = orderBy[x.order_id], rt = retBy[x.id] || 0;
    return `<div class="card f"><div class="row" style="border:0;padding:0"><b>${esc(it ? label(it) : '')}</b><span class="badge">${t('s_' + x.status)}</span></div>
    <small style="color:var(--mute)">${esc(o ? oLabel(o) : '')} · ${esc(x.issue_date)}</small>
    <div><b>${nf(x.sheets)}</b> ${t('s_sheets')}${rt ? ` · ${t('i_returned')}: ${nf(rt)}` : ''}</div>
    ${x.status === 'draft' ? `<div class="grid"><button class="btn" data-cf="${x.id}">${t('i_conf1')}</button><button class="btn out" data-cx="${x.id}">${t('i_cancel')}</button></div>` : ''}
    ${x.status === 'confirmed' && x.sheets - rt > 0 ? `<button class="btn out" data-rt="${x.id}">${t('i_return')}</button>` : ''}</div>`;
  }).join('') || `<div class="muted">${t('i_none')}</div>`;

  const draw = (msg = '') => {
    const sg = (k, l) => `<button class="btn ${view === k ? '' : 'out'}" data-v="${k}">${l}</button>`;
    m.innerHTML = `<button class="btn out" id="bk" style="min-height:40px">${t('i_back')}</button>
    <div class="grid">${sg('new', t('i_new'))}${sg('list', t('i_list'))}</div>
    ${msg ? `<div class="err" role="alert">${esc(msg)}</div>` : ''}
    <div id="vb" class="f">${view === 'new' ? form() : list()}</div>`;
    $('#bk').onclick = back;
    m.querySelectorAll('[data-v]').forEach(b => (b.onclick = () => { view = b.dataset.v; draw(); }));
    if (view === 'new') {
      $('#io').onchange = e => {
        const xs = names[e.target.value] || [];
        $('#ip').innerHTML = `<option value="">${t('i_all')}</option>` + xs.map(x => `<option value="${x.id}">${esc(x.product_name)}</option>`).join('');
      };
      $('#in').oninput = e => (note = e.target.value);
      $('#ic').onclick = () => save(true);
      $('#id').onclick = () => save(false);
    } else {
      m.querySelectorAll('[data-cf]').forEach(b => (b.onclick = () => act('paper_issue_confirm', { p_issue: b.dataset.cf })));
      m.querySelectorAll('[data-cx]').forEach(b => (b.onclick = () => act('paper_issue_cancel', { p_issue: b.dataset.cx })));
      m.querySelectorAll('[data-rt]').forEach(b => (b.onclick = () => retForm(issues.find(x => x.id === b.dataset.rt))));
    }
  };

  async function act(fn, args) {
    const { error } = await sb.rpc(fn, args);
    if (error) { draw(t('err') + ': ' + error.message); return; }
    render(m, back);
  }

  async function save(confirm) {
    const err = x => ($('#ie').textContent = x);
    err('');
    const item = $('#ii').value, order = $('#io').value, sheets = Number($('#is').value);
    if (!item || !order || !Number.isInteger(sheets) || sheets < 1) return err(t('i_req'));
    if (confirm && sheets > itemBy[item].sheets_on_hand) return err(`${t('i_over')}: ${nf(itemBy[item].sheets_on_hand)}`);
    $('#ic').disabled = true; $('#id').disabled = true;
    const c = await sb.rpc('paper_issue_create', { p_item: item, p_order: order, p_order_item: $('#ip').value || null, p_sheets: sheets, p_note: $('#in').value.trim() || null });
    if (c.error) { $('#ic').disabled = false; $('#id').disabled = false; return err(t('err') + ': ' + c.error.message); }
    note = '';
    if (confirm) {
      const r = await sb.rpc('paper_issue_confirm', { p_issue: c.data });
      if (r.error) { view = 'list'; await render(m, back); return m.insertAdjacentHTML('afterbegin', `<div class="err" role="alert">${esc(t('i_nodraft') + ': ' + r.error.message)}</div>`); }
    }
    view = 'list';
    render(m, back);
  }

  function retForm(x) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:60;padding:16px';
    const left = x.sheets - (retBy[x.id] || 0);
    d.innerHTML = `<div class="card f" style="width:100%;max-width:420px"><b>${t('i_return')} · max ${nf(left)}</b>
    <input id="rq" type="number" inputmode="numeric" min="1" max="${left}" step="1" placeholder="${t('i_ret_q')}"><input id="rr" placeholder="${t('i_reason')}">
    <div class="err" id="re" role="alert"></div><button class="btn" id="ry">${t('o_save')}</button><button class="btn out" id="rc">${t('o_cancel')}</button></div>`;
    document.body.appendChild(d);
    d.querySelector('#rc').onclick = () => d.remove();
    d.querySelector('#ry').onclick = async () => {
      const q = Number(d.querySelector('#rq').value);
      if (!Number.isInteger(q) || q < 1 || q > left) return (d.querySelector('#re').textContent = t('i_ret_q'));
      const { error } = await sb.rpc('paper_return_add', { p_issue: x.id, p_sheets: q, p_reason: d.querySelector('#rr').value.trim() || null });
      if (error) return (d.querySelector('#re').textContent = t('err') + ': ' + error.message);
      d.remove();
      render(m, back);
    };
  }
  draw();
}
