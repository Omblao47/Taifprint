import { sb, S, t, $, esc, addText } from './core.js';
addText({
ar:{n_item:'منتج',n_rm:'حذف',n_pt:'نوع الطباعة',n_prod:'التسمية (Désignation) مثال: Flyer',n_size:'المقاس (Format)',n_qty:'الكمية للسحب (QNT tirage)',n_qp:'عدد القطع (QNT pcs)',n_paper:'نوع الورق (Type)',n_gr:'الوزن (Grammage)',n_price:'سعر الوحدة (اختياري)',n_die:'رقم قالب القص',n_dieimg:'صورة القالب',n_design:'ملف التصميم (PDF أو صورة)',n_fnote:'ملاحظات المنتج',n_cust:'اختر الزبون',n_oimg:'صورة الطلبية',n_add:'إضافة منتج آخر',n_pick:'التسليم في المحل',n_home:'توصيل',n_total:'المبلغ الكلي',n_ecust:'اختر الزبون أولاً',n_eitem:'اكتب التسمية والكمية لكل منتج',n_edep:'العربون أكبر من المبلغ الكلي',n_ds:'التصميم',n_in:'داخل المطبعة',n_out:'خارج المطبعة',n_od:'تاريخ الطلب',n_desig:'تسمية الطلبية (اختياري)',n_nf:'عدد الأوراق',n_ff:'المقاس النهائي (Format fini)',n_pk:'التغليف بواسطة',n_rem:'ملاحظات (Remarque)',n_g_impression:'الطباعة (Impression)',n_g_plates:'الألواح (Plaques)',n_g_lamination:'التغليف الحراري (Pelliculage)',n_g_finishing:'التشطيب (Façonnage)',n_g_others:'أخرى (Autres)'},
fr:{n_item:'Produit',n_rm:'Supprimer',n_pt:'Type d’impression',n_prod:'Désignation (ex. Flyer)',n_size:'Format',n_qty:'QNT tirage',n_qp:'QNT pcs',n_paper:'Papier (type)',n_gr:'Grammage',n_price:'Prix unitaire (facultatif)',n_die:'N° du moule de découpe',n_dieimg:'Photo du moule',n_design:'Fichier de design (PDF ou image)',n_fnote:'Notes du produit',n_cust:'Choisir le client',n_oimg:'Photo de la commande',n_add:'Ajouter un produit',n_pick:'Retrait en magasin',n_home:'Livraison',n_total:'Montant total',n_ecust:'Choisissez d’abord le client',n_eitem:'Indiquez désignation et quantité',n_edep:'L’acompte dépasse le total',n_ds:'Design',n_in:'Dans l’imprimerie',n_out:'À l’extérieur',n_od:'Date de commande',n_desig:'Désignation de la commande (facultatif)',n_nf:'Nbr feuilles',n_ff:'Format fini',n_pk:'Emballage par',n_rem:'Remarque',n_g_impression:'Impression',n_g_plates:'Préparation des plaques',n_g_lamination:'Pelliculage',n_g_finishing:'Façonnage',n_g_others:'Autres'}});

const GROUPS = ['impression', 'plates', 'lamination', 'finishing', 'others'];
const v = (c, n) => c.querySelector(`[name=${n}]`)?.value ?? '';
const nm = o => (S.lang === 'ar' ? o.name_ar : o.name_fr);

async function shrink(file) {
  const b = await createImageBitmap(file);
  const k = Math.min(1, 1280 / Math.max(b.width, b.height));
  const c = document.createElement('canvas');
  c.width = Math.round(b.width * k); c.height = Math.round(b.height * k);
  c.getContext('2d').drawImage(b, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', 0.8));
}

export async function render(m, back) {
  const bid = S.profile.branch_id;
  const [cu, pt, fo] = await Promise.all([
    sb.from('customers').select('id,name,phone,customer_code').order('name'),
    sb.from('print_types').select('id,name_ar,name_fr').eq('active', true).order('sort_order'),
    sb.from('finishing_options').select('id,name_ar,name_fr,option_group').eq('active', true).order('sort_order')
  ]);
  if (cu.error || pt.error || fo.error) throw (cu.error || pt.error || fo.error);
  const inp = (n, ph, extra = '') => `<input name="${n}" placeholder="${t(ph)}" ${extra}>`;

  const group = g => {
    const xs = fo.data.filter(x => x.option_group === g);
    return xs.length ? `<div><small>${t('n_g_' + g)}</small><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${xs.map(x => `<button type="button" class="chip" data-fin="${x.id}" aria-pressed="false">${esc(nm(x))}</button>`).join('')}</div></div>` : '';
  };

  const item = () => `<div class="card f it">
  <div class="row"><b>${t('n_item')}</b><button type="button" class="btn out" data-rm style="min-height:40px">${t('n_rm')}</button></div>
  <select name="pt" aria-label="${t('n_pt')}">${pt.data.map(p => `<option value="${p.id}">${esc(nm(p))}</option>`).join('')}</select>
  ${inp('pn', 'n_prod')}
  <div class="grid">${inp('pp', 'n_paper')}${inp('gr', 'n_gr')}</div>
  <div class="grid">${inp('sz', 'n_size')}${inp('qt', 'n_qty', 'type="number" inputmode="numeric" min="1"')}</div>
  ${inp('qp', 'n_qp', 'type="number" inputmode="numeric" min="0"')}
  ${GROUPS.map(group).join('')}
  <div class="grid">${inp('nf', 'n_nf', 'type="number" inputmode="numeric" min="0"')}${inp('ff', 'n_ff')}</div>
  ${inp('pk', 'n_pk')}
  ${inp('dn', 'n_die')}
  <label><small>${t('n_dieimg')}</small><input name="di" type="file" accept="image/*"></label>
  <label><small>${t('n_design')}</small><input name="df" type="file" accept=".pdf,image/*"></label>
  ${inp('pr', 'n_price', 'type="number" inputmode="decimal" min="0"')}
  ${inp('fn', 'n_fnote')}</div>`;

  m.innerHTML = `<style>.chip{border:1px solid var(--line);background:#fff;border-radius:16px;padding:6px 12px;min-height:40px;cursor:pointer}.chip.on{background:#E8EEFA;border-color:var(--navy);color:var(--navy);font-weight:700}</style>
  <h2>${t('o_new')}</h2><div class="f">
  <select id="cu" aria-label="${t('n_cust')}"><option value="">${t('n_cust')}</option>${cu.data.map(c => `<option value="${c.id}">${esc(c.name)} · ${esc(c.customer_code)}${c.phone ? ' · ' + esc(c.phone) : ''}</option>`).join('')}</select>
  <input id="ds2" placeholder="${t('n_desig')}">
  <div class="grid"><label><small>${t('n_od')}</small><input id="od" type="date" value="${new Date().toISOString().slice(0, 10)}"></label><label><small>${t('o_due')}</small><input id="dd" type="date"></label></div>
  <select id="ds" aria-label="${t('n_ds')}"><option value="inhouse">${t('n_ds')}: ${t('n_in')}</option><option value="external">${t('n_ds')}: ${t('n_out')}</option></select>
  <label><small>${t('n_oimg')}</small><input id="oi" type="file" accept="image/*"></label>
  <div id="its" class="f">${item()}</div>
  <button type="button" class="btn out" id="add">${t('n_add')}</button>
  <select id="dm" aria-label="${t('n_pick')}"><option value="pickup">${t('n_pick')}</option><option value="delivery">${t('n_home')}</option></select>
  <input id="da" placeholder="${t('o_addr')}" hidden>
  <div class="grid"><input id="tot" type="number" inputmode="decimal" min="0" placeholder="${t('n_total')}"><input id="dep" type="number" inputmode="decimal" min="0" placeholder="${t('o_deposit')}"></div>
  <input id="rm" placeholder="${t('n_rem')}">
  <div class="err" id="ne" role="alert"></div>
  <button class="btn" id="sv">${t('o_save')}</button><button class="btn out" id="cn">${t('o_cancel')}</button></div>`;

  let manual = false;
  const calc = () => {
    if (manual) return;
    let s = 0;
    document.querySelectorAll('.it').forEach(c => { s += (Number(v(c, 'qt')) || 0) * (Number(v(c, 'pr')) || 0); });
    $('#tot').value = s || '';
  };
  $('#tot').oninput = () => (manual = true);
  $('#its').oninput = calc;
  $('#its').onclick = e => {
    const f = e.target.closest('[data-fin]');
    if (f) f.setAttribute('aria-pressed', f.classList.toggle('on'));
    const r = e.target.closest('[data-rm]');
    if (r && document.querySelectorAll('.it').length > 1) { r.closest('.it').remove(); calc(); }
  };
  $('#add').onclick = () => $('#its').insertAdjacentHTML('beforeend', item());
  $('#dm').onchange = e => ($('#da').hidden = e.target.value !== 'delivery');
  $('#cn').onclick = back;

  const up = async (file, prefix) => {
    let blob = file, ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    if (file.type.startsWith('image/')) { blob = await shrink(file); ext = 'jpg'; }
    const path = `${bid}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('order-files').upload(path, blob, { contentType: blob.type || 'application/octet-stream' });
    if (error) throw error;
    return path;
  };
  const num = x => (x === '' ? null : Number(x));
  const txt = x => x.trim() || null;

  $('#sv').onclick = async () => {
    const err = x => ($('#ne').textContent = x);
    err('');
    const customer_id = $('#cu').value;
    if (!customer_id) return err(t('n_ecust'));
    const cards = [...document.querySelectorAll('.it')];
    const rows = [];
    for (const [i, c] of cards.entries()) {
      const q = Number(v(c, 'qt'));
      if (!v(c, 'pn').trim() || !(q > 0)) return err(t('n_eitem'));
      rows.push({ branch_id: bid, line_no: i + 1, print_type_id: v(c, 'pt') || null, product_name: v(c, 'pn').trim(), paper: txt(v(c, 'pp')), grammage: txt(v(c, 'gr')), size: txt(v(c, 'sz')), quantity: q, qty_pcs: num(v(c, 'qp')), sheets_count: num(v(c, 'nf')), finished_format: txt(v(c, 'ff')), packaging_by: txt(v(c, 'pk')), unit_price: num(v(c, 'pr')), die_number: txt(v(c, 'dn')), finishing_notes: txt(v(c, 'fn')) });
    }
    const total = Number($('#tot').value || 0), dep = Number($('#dep').value || 0);
    if (dep > total) return err(t('n_edep'));
    const btn = $('#sv');
    btn.disabled = true;
    try {
      const method = $('#dm').value;
      const order = { branch_id: bid, customer_id, description: ($('#ds2').value.trim() || rows.map(r => r.product_name).join(' + ')).slice(0, 200), total_amount: total, deposit_amount: dep, due_date: $('#dd').value || null, delivery_method: method, delivery_address: method === 'delivery' ? txt($('#da').value) : null, design_source: $('#ds').value, internal_notes: txt($('#rm').value) };
      if ($('#od').value) order.order_date = $('#od').value;
      const { data: o, error: e1 } = await sb.from('orders').insert(order).select('id').single();
      if (e1) throw e1;
      const { data: its, error: e2 } = await sb.from('order_items').insert(rows.map(r => ({ ...r, order_id: o.id }))).select('id,line_no');
      if (e2) throw e2;
      const idOf = Object.fromEntries(its.map(x => [x.line_no, x.id]));
      const fin = [], files = [];
      const add = async (file, kind, itemId) => {
        if (!file) return;
        const path = await up(file, `${o.id}/${kind}`);
        files.push({ branch_id: bid, order_id: o.id, order_item_id: itemId || null, kind, storage_path: path, file_name: file.name, uploaded_by: S.profile.user_id });
      };
      await add($('#oi').files[0], 'order_image');
      for (const [i, c] of cards.entries()) {
        const id = idOf[i + 1];
        c.querySelectorAll('[data-fin].on').forEach(b => fin.push({ order_item_id: id, finishing_option_id: b.dataset.fin, branch_id: bid }));
        await add(c.querySelector('[name=di]').files[0], 'die_image', id);
        await add(c.querySelector('[name=df]').files[0], 'design_file', id);
      }
      if (fin.length) { const { error } = await sb.from('order_item_finishing').insert(fin); if (error) throw error; }
      if (files.length) { const { error } = await sb.from('order_files').insert(files); if (error) throw error; }
      if (dep > 0) { const { error } = await sb.from('payments').insert({ branch_id: bid, order_id: o.id, amount: dep, method: 'cash', notes: 'deposit' }); if (error) throw error; }
      back();
    } catch (e) {
      console.error(e);
      err(t('err') + ': ' + (e.message || e));
      btn.disabled = false;
    }
  };
}
