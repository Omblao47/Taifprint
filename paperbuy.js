import { sb, S, t, $, esc, addText } from './core.js';
addText({
ar:{b_title:'شراء ورق',b_item:'صنف الورق',b_pick:'اختر الصنف',b_sup:'المورد',b_nosup:'بدون مورد',b_newsup:'أو اكتب اسم مورد جديد',b_date:'تاريخ الشراء',b_reams:'عدد الرزم',b_per:'عدد الأوراق في الرزمة',b_price:'سعر الرزمة (د.ج)',b_note:'ملاحظة (اختياري)',b_tot:'إجمالي الأوراق',b_cost:'إجمالي التكلفة',b_req:'أكمل الصنف وعدد الرزم وأوراق الرزمة والسعر',b_noitems:'أضف صنف ورق أولاً من تبويب الأصناف',b_deny:'الشراء للمدير فقط'},
fr:{b_title:'Achat de papier',b_item:'Article',b_pick:'Choisir l’article',b_sup:'Fournisseur',b_nosup:'Sans fournisseur',b_newsup:'Ou saisir un nouveau fournisseur',b_date:'Date d’achat',b_reams:'Nombre de ramettes',b_per:'Feuilles par ramette',b_price:'Prix de la ramette (DA)',b_note:'Remarque (facultatif)',b_tot:'Total des feuilles',b_cost:'Coût total',b_req:'Renseignez article, ramettes, feuilles par ramette et prix',b_noitems:'Ajoutez d’abord un article dans l’onglet Articles',b_deny:'Achat réservé au directeur'}});

const nf = n => Number(n || 0).toLocaleString('fr-FR');

export async function render(m, back) {
  if (S.profile.role !== 'manager') { m.innerHTML = `<div class="muted">${t('b_deny')}</div><button class="btn out" id="bk">${t('o_cancel')}</button>`; $('#bk').onclick = back; return; }
  const bid = S.profile.branch_id;
  const [it, sp] = await Promise.all([
    sb.from('paper_stock_view').select('id,name_ar,name_fr,gsm,width_cm,length_cm,sheets_on_hand').eq('active', true).order('name_ar').order('gsm'),
    sb.from('paper_suppliers').select('id,name').eq('active', true).order('name')
  ]);
  if (it.error || sp.error) throw (it.error || sp.error);
  const label = i => `${S.lang === 'ar' ? i.name_ar : i.name_fr} · ${i.gsm} g · ${Number(i.width_cm)}×${Number(i.length_cm)} (${nf(i.sheets_on_hand)})`;
  if (!it.data.length) { m.innerHTML = `<div class="muted">${t('b_noitems')}</div><button class="btn out" id="bk">${t('o_cancel')}</button>`; $('#bk').onclick = back; return; }

  m.innerHTML = `<h2>${t('b_title')}</h2><div class="f">
  <select id="bi" aria-label="${t('b_item')}"><option value="">${t('b_pick')}</option>${it.data.map(i => `<option value="${i.id}">${esc(label(i))}</option>`).join('')}</select>
  <select id="bs" aria-label="${t('b_sup')}"><option value="">${t('b_nosup')}</option>${sp.data.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
  <input id="bn" placeholder="${t('b_newsup')}">
  <label><small>${t('b_date')}</small><input id="bd" type="date" value="${new Date().toISOString().slice(0, 10)}"></label>
  <div class="grid"><input id="br" type="number" inputmode="numeric" min="1" step="1" placeholder="${t('b_reams')}"><input id="bp" type="number" inputmode="numeric" min="1" step="1" placeholder="${t('b_per')}"></div>
  <input id="bc" type="number" inputmode="decimal" min="0" step="any" placeholder="${t('b_price')}">
  <input id="bt" placeholder="${t('b_note')}">
  <div class="card"><div class="row"><span>${t('b_tot')}</span><b id="s1">0</b></div><div class="row"><span>${t('b_cost')}</span><b id="s2">0</b></div></div>
  <div class="err" id="be" role="alert"></div>
  <button class="btn" id="bv">${t('o_save')}</button><button class="btn out" id="bk">${t('o_cancel')}</button></div>`;

  const num = id => Number($(id).value || 0);
  const calc = () => { $('#s1').textContent = nf(num('#br') * num('#bp')); $('#s2').textContent = nf(num('#br') * num('#bc')) + ' ' + t('o_cur'); };
  ['#br', '#bp', '#bc'].forEach(id => ($(id).oninput = calc));
  $('#bk').onclick = back;
  $('#bv').onclick = async () => {
    const err = x => ($('#be').textContent = x);
    err('');
    const reams = num('#br'), per = num('#bp'), price = $('#bc').value === '' ? -1 : num('#bc');
    if (!$('#bi').value || !Number.isInteger(reams) || reams < 1 || !Number.isInteger(per) || per < 1 || price < 0) return err(t('b_req'));
    const btn = $('#bv');
    btn.disabled = true;
    try {
      let sup = $('#bs').value || null;
      const nn = $('#bn').value.trim();
      if (nn && !sup) {
        const { data, error } = await sb.from('paper_suppliers').insert({ branch_id: bid, name: nn }).select('id').single();
        if (error) throw error;
        sup = data.id;
      }
      const { error } = await sb.rpc('paper_purchase_add', { p_item: $('#bi').value, p_supplier: sup, p_date: $('#bd').value || null, p_reams: reams, p_sheets_per_ream: per, p_price_per_ream: price, p_note: $('#bt').value.trim() || null });
      if (error) throw error;
      back();
    } catch (e) { console.error(e); err(t('err') + ': ' + (e.message || e)); btn.disabled = false; }
  };
}
