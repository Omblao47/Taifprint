import { sb, S, t, $, esc, addText } from './core.js';
import { askPending } from './jobtype.js';
addText({
ar:{o_orders:'الطلبات',o_customers:'الزبائن',o_archive:'الأرشيف',o_search:'ابحث بالاسم أو الرقم أو الهاتف',o_new:'طلبية جديدة',o_newc:'زبون جديد',o_name:'الاسم',o_phone:'الهاتف',o_addr:'العنوان',o_ind:'فرد',o_co:'شركة',o_save:'حفظ',o_cancel:'إلغاء',o_deposit:'العربون',o_rest:'المتبقي',o_noc:'لا يوجد زبائن بعد',o_due:'التسليم',o_cur:'د.ج',o_req:'الاسم مطلوب',a_all:'الكل',a_perm:'دائم',a_temp:'مؤقت',a_unset:'غير محدد',a_reorder:'إعادة الطلب',a_date:'تاريخ التسليم الجديد',a_done:'تم إنشاء الطلبية',a_none:'الأرشيف فارغ',a_hist:'طلبيات الزبون',a_ok:'تأكيد',a_del:'حذف',a_delq:'حذف هذه الطلبية نهائياً مع كل ما يخصها؟',a_yes:'نعم، احذف'},
fr:{o_orders:'Commandes',o_customers:'Clients',o_archive:'Archive',o_search:'Rechercher par nom, numéro ou téléphone',o_new:'Nouvelle commande',o_newc:'Nouveau client',o_name:'Nom',o_phone:'Téléphone',o_addr:'Adresse',o_ind:'Particulier',o_co:'Entreprise',o_save:'Enregistrer',o_cancel:'Annuler',o_deposit:'Acompte',o_rest:'Reste',o_noc:'Aucun client',o_due:'Livraison',o_cur:'DA',o_req:'Le nom est requis',a_all:'Tout',a_perm:'Permanent',a_temp:'Temporaire',a_unset:'Non défini',a_reorder:'Recommander',a_date:'Nouvelle date de livraison',a_done:'Commande créée',a_none:'Archive vide',a_hist:'Commandes du client',a_ok:'Confirmer',a_del:'Supprimer',a_delq:'Supprimer définitivement cette commande et tout ce qui la concerne ?',a_yes:'Oui, supprimer'}});

let tab = 'orders', q = '', af = 'all', msg = '';
const money = n => Number(n || 0).toLocaleString('fr-FR');
const JT = { permanent: 'a_perm', temporary: 'a_temp' };

export async function render(m) {
  await askPending();
  const role = S.profile.role, bid = S.profile.branch_id;
  const can = ['manager', 'production_manager', 'sales'].includes(role), mgr = role === 'manager', hide = role === 'production_manager';
  const R = await Promise.all([
    sb.from('orders').select('*').order('created_at', { ascending: false }).limit(300),
    sb.from('customers').select('id,customer_code,name,phone,address,customer_type').order('name'),
    sb.from('order_items').select('id,order_id,line_no,product_name')
  ]);
  for (const r of R) if (r.error) throw r.error;
  const [orders, customers, items] = R.map(r => r.data || []);
  const cus = Object.fromEntries(customers.map(x => [x.id, x]));
  const names = {};
  items.sort((a, b) => a.line_no - b.line_no).forEach(i => (names[i.order_id] ||= []).push(i.product_name));
  const title = o => (names[o.id] || []).join(' + ') || o.description || o.order_number;
  const today = new Date().toISOString().slice(0, 10);
  const isArch = o => ['delivered', 'cancelled'].includes(o.status);
  const jtBadge = o => `<span class="badge">${t(JT[o.job_type] || 'a_unset')}</span>`;

  const orderCard = o => {
    const late = o.due_date && o.due_date < today;
    return `<div class="card"><div class="row"><b>${esc(title(o))}</b><span class="badge ${late ? 'late' : ''}">${esc(t('st')[o.status] || o.status)}</span></div>
    ${hide ? '' : `<div><small style="color:var(--mute)">${esc(o.order_number)} · ${esc(cus[o.customer_id]?.name || '')}</small></div>`}
    <small>${t('o_due')}: ${esc(o.due_date || '—')}${hide ? '' : ` · ${t('o_deposit')}: ${money(o.deposit_amount)} · ${t('o_rest')}: ${money(o.total_amount - o.deposit_amount)} ${t('o_cur')}`}</small>
    ${mgr ? `<button class="btn out" data-del="${o.id}" style="min-height:40px">${t('a_del')}</button>` : ''}</div>`;
  };
  const archCard = o => `<div class="card f"><div class="row"><b>${esc(title(o))}</b>${jtBadge(o)}</div>
    <small style="color:var(--mute)">${hide ? '' : esc(o.order_number) + ' · ' + esc(cus[o.customer_id]?.name || '') + ' · '}${esc((o.delivered_at || o.created_at || '').slice(0, 10))}</small>
    ${mgr ? `<div class="grid"><button class="btn ${o.job_type === 'permanent' ? '' : 'out'}" data-jt="permanent" data-id="${o.id}">${t('a_perm')}</button><button class="btn ${o.job_type === 'temporary' ? '' : 'out'}" data-jt="temporary" data-id="${o.id}">${t('a_temp')}</button></div>` : ''}
    ${can && o.job_type === 'permanent' && o.status === 'delivered' ? `<button class="btn" data-re="${o.id}">${t('a_reorder')}</button>` : ''}
    ${mgr ? `<button class="btn out" data-del="${o.id}" style="min-height:40px">${t('a_del')}</button>` : ''}</div>`;

  const list = () => {
    const ql = q.trim().toLowerCase();
    if (tab === 'orders') {
      const rows = orders.filter(o => !isArch(o) && (!ql || `${title(o)} ${o.order_number} ${cus[o.customer_id]?.name || ''}`.toLowerCase().includes(ql))).map(orderCard).join('');
      return (can ? `<button class="btn" data-act="neworder">${t('o_new')}</button>` : '') + (rows || `<div class="muted">${t('none')}</div>`);
    }
    if (tab === 'archive') {
      const chips = ['all', 'permanent', 'temporary', 'unset'].map(k => `<button class="btn ${af === k ? '' : 'out'}" data-af="${k}" style="min-height:40px;padding:0 12px">${t(k === 'all' ? 'a_all' : k === 'unset' ? 'a_unset' : JT[k])}</button>`).join('');
      const rows = orders.filter(o => isArch(o) && (af === 'all' || (af === 'unset' ? !o.job_type : o.job_type === af)) && (!ql || `${title(o)} ${o.order_number} ${cus[o.customer_id]?.name || ''}`.toLowerCase().includes(ql))).map(archCard).join('');
      return `<div style="display:flex;gap:6px;flex-wrap:wrap">${chips}</div>` + (rows || `<div class="muted">${t('a_none')}</div>`);
    }
    const rows = customers.filter(c => !ql || `${c.name} ${c.phone || ''} ${c.customer_code}`.toLowerCase().includes(ql)).map(c => {
      const os = orders.filter(o => o.customer_id === c.id);
      return `<details class="card"><summary style="cursor:pointer;list-style:none"><div class="row" style="border:0;padding:0"><b>${esc(c.name)}</b><span class="badge">${esc(c.customer_code)}</span></div><small>${esc(c.phone || '')} ${esc(c.address || '')}</small></summary>
      ${os.map(o => `<div class="row"><span>${esc(title(o))}<br><small style="color:var(--mute)">${esc(o.order_number)}</small></span><span class="badge">${esc(t('st')[o.status] || o.status)}</span></div>`).join('') || `<div class="muted">${t('none')}</div>`}</details>`;
    }).join('');
    return (can ? `<button class="btn" data-act="newcustomer">${t('o_newc')}</button>` : '') + (rows || `<div class="muted">${t('o_noc')}</div>`);
  };

  const wire = () => {
    document.querySelectorAll('[data-act]').forEach(b => (b.onclick = () => (b.dataset.act === 'neworder' ? newOrder() : custForm())));
    document.querySelectorAll('[data-af]').forEach(b => (b.onclick = () => { af = b.dataset.af; $('#ol').innerHTML = list(); wire(); }));
    document.querySelectorAll('[data-jt]').forEach(b => (b.onclick = async () => { await sb.from('orders').update({ job_type: b.dataset.jt }).eq('id', b.dataset.id); render(m); }));
    document.querySelectorAll('[data-del]').forEach(b => (b.onclick = () => del(orders.find(x => x.id === b.dataset.del))));
    document.querySelectorAll('[data-re]').forEach(b => (b.onclick = () => reorder(orders.find(o => o.id === b.dataset.re))));
  };
  const draw = () => {
    const seg = (k, l) => `<button class="btn ${tab === k ? '' : 'out'}" data-seg="${k}">${l}</button>`;
    m.innerHTML = `<div class="grid" style="grid-template-columns:repeat(3,1fr)">${seg('orders', t('o_orders'))}${seg('customers', t('o_customers'))}${seg('archive', t('o_archive'))}</div>
    ${msg ? `<div class="card" role="status">${esc(msg)}</div>` : ''}
    <div class="f"><input id="oq" type="search" placeholder="${t('o_search')}" value="${esc(q)}"></div><div id="ol" class="f">${list()}</div>`;
    msg = '';
    document.querySelectorAll('[data-seg]').forEach(b => (b.onclick = () => { tab = b.dataset.seg; draw(); }));
    $('#oq').oninput = e => { q = e.target.value; $('#ol').innerHTML = list(); wire(); };
    wire();
  };

  async function newOrder() {
    try {
      const mod = await import(`./neworder.js?v=${Date.now()}`);
      await mod.render(m, () => render(m));
    } catch (e) {
      console.error(e);
      $('#ol').insertAdjacentHTML('afterbegin', `<div class="muted">${t('soon')}</div>`);
    }
  }

  function reorder(o) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:60;padding:16px';
    d.innerHTML = `<div class="card f" style="width:100%;max-width:420px"><b>${esc(title(o))}</b><label><small>${t('a_date')}</small><input id="rd" type="date"></label>
    <div class="err" id="re" role="alert"></div><button class="btn" id="ro">${t('a_ok')}</button><button class="btn out" id="rc">${t('o_cancel')}</button></div>`;
    document.body.appendChild(d);
    d.querySelector('#rc').onclick = () => d.remove();
    d.querySelector('#ro').onclick = async () => {
      const btn = d.querySelector('#ro'), err = x => (d.querySelector('#re').textContent = x);
      btn.disabled = true;
      try {
        const [it, fl] = await Promise.all([
          sb.from('order_items').select('*').eq('order_id', o.id).order('line_no'),
          sb.from('order_files').select('*').eq('order_id', o.id)
        ]);
        if (it.error || fl.error) throw (it.error || fl.error);
        const ids = it.data.map(i => i.id);
        const fn = ids.length ? await sb.from('order_item_finishing').select('order_item_id,finishing_option_id').in('order_item_id', ids) : { data: [] };
        if (fn.error) throw fn.error;
        const { data: no, error: e1 } = await sb.from('orders').insert({ branch_id: bid, customer_id: o.customer_id, description: o.description, total_amount: o.total_amount, deposit_amount: 0, due_date: d.querySelector('#rd').value || null, delivery_method: o.delivery_method, delivery_address: o.delivery_address, design_source: o.design_source, internal_notes: o.internal_notes, job_type: 'permanent' }).select('id,order_number').single();
        if (e1) throw e1;
        const rows = it.data.map(i => ({ order_id: no.id, branch_id: bid, line_no: i.line_no, print_type_id: i.print_type_id, product_name: i.product_name, size: i.size, paper: i.paper, colors: i.colors, grammage: i.grammage, quantity: i.quantity, qty_pcs: i.qty_pcs, sheets_count: i.sheets_count, finished_format: i.finished_format, packaging_by: i.packaging_by, unit_price: i.unit_price, die_number: i.die_number, finishing_notes: i.finishing_notes }));
        const { data: ni, error: e2 } = await sb.from('order_items').insert(rows).select('id,line_no');
        if (e2) throw e2;
        const map = {};
        it.data.forEach(i => { map[i.id] = ni.find(x => x.line_no === i.line_no)?.id; });
        if (fn.data.length) { const { error } = await sb.from('order_item_finishing').insert(fn.data.map(f => ({ order_item_id: map[f.order_item_id], finishing_option_id: f.finishing_option_id, branch_id: bid }))); if (error) throw error; }
        if (fl.data.length) { const { error } = await sb.from('order_files').insert(fl.data.map(f => ({ branch_id: bid, order_id: no.id, order_item_id: f.order_item_id ? map[f.order_item_id] : null, kind: f.kind, storage_path: f.storage_path, file_name: f.file_name, uploaded_by: S.profile.user_id }))); if (error) throw error; }
        d.remove();
        tab = 'orders';
        msg = `${t('a_done')}: ${no.order_number}`;
        render(m);
      } catch (e) { console.error(e); err(t('err') + ': ' + (e.message || e)); btn.disabled = false; }
    };
  }

  function del(o) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:60;padding:16px';
    d.innerHTML = `<div class="card f" style="width:100%;max-width:420px"><b>${esc(title(o))}</b><div>${t('a_delq')}</div>
    <div class="err" id="de" role="alert"></div><button class="btn" id="dy" style="background:var(--red)">${t('a_yes')}</button><button class="btn out" id="dc">${t('o_cancel')}</button></div>`;
    document.body.appendChild(d);
    d.querySelector('#dc').onclick = () => d.remove();
    d.querySelector('#dy').onclick = async () => {
      const btn = d.querySelector('#dy');
      btn.disabled = true;
      try {
        const p = await sb.from('payments').delete().eq('order_id', o.id);
        if (p.error) throw p.error;
        const r = await sb.from('orders').delete().eq('id', o.id);
        if (r.error) throw r.error;
        d.remove();
        render(m);
      } catch (e) { console.error(e); d.querySelector('#de').textContent = t('err') + ': ' + (e.message || e); btn.disabled = false; }
    };
  }

  function custForm() {
    m.innerHTML = `<h2>${t('o_newc')}</h2><div class="f">
    <input id="cn" placeholder="${t('o_name')}" required>
    <select id="ct" aria-label="type"><option value="individual">${t('o_ind')}</option><option value="company">${t('o_co')}</option></select>
    <input id="cp" type="tel" placeholder="${t('o_phone')}">
    <input id="ca" placeholder="${t('o_addr')}">
    <div class="err" id="ce" role="alert"></div>
    <button class="btn" id="cs">${t('o_save')}</button><button class="btn out" id="cc">${t('o_cancel')}</button></div>`;
    $('#cc').onclick = () => render(m);
    $('#cs').onclick = async () => {
      const name = $('#cn').value.trim();
      if (!name) return ($('#ce').textContent = t('o_req'));
      const { error } = await sb.from('customers').insert({ branch_id: bid, name, customer_type: $('#ct').value, phone: $('#cp').value.trim() || null, address: $('#ca').value.trim() || null });
      if (error) return ($('#ce').textContent = t('err') + ': ' + error.message);
      tab = 'customers';
      render(m);
    };
  }
  draw();
}
