import { sb, S, t, $, esc, addText } from './core.js';
addText({
ar:{o_orders:'الطلبات',o_customers:'الزبائن',o_search:'ابحث بالرقم أو الاسم أو الهاتف',o_new:'طلبية جديدة',o_newc:'زبون جديد',o_name:'الاسم',o_phone:'الهاتف',o_addr:'العنوان',o_ind:'فرد',o_co:'شركة',o_save:'حفظ',o_cancel:'إلغاء',o_deposit:'العربون',o_rest:'المتبقي',o_noc:'لا يوجد زبائن بعد',o_due:'التسليم',o_cur:'د.ج',o_req:'الاسم مطلوب'},
fr:{o_orders:'Commandes',o_customers:'Clients',o_search:'Rechercher par numéro, nom ou téléphone',o_new:'Nouvelle commande',o_newc:'Nouveau client',o_name:'Nom',o_phone:'Téléphone',o_addr:'Adresse',o_ind:'Particulier',o_co:'Entreprise',o_save:'Enregistrer',o_cancel:'Annuler',o_deposit:'Acompte',o_rest:'Reste',o_noc:'Aucun client',o_due:'Livraison',o_cur:'DA',o_req:'Le nom est requis'}});

let tab = 'orders', q = '';
const money = n => Number(n || 0).toLocaleString('fr-FR');

export async function render(m) {
  const can = ['manager', 'sales'].includes(S.profile.role);
  const [o, c] = await Promise.all([
    sb.from('orders').select('id,order_number,status,due_date,total_amount,deposit_amount,customer_id').order('created_at', { ascending: false }).limit(100),
    sb.from('customers').select('id,customer_code,name,phone,address,customer_type').order('name')
  ]);
  if (o.error || c.error) throw (o.error || c.error);
  const orders = o.data || [], customers = c.data || [];
  const cus = Object.fromEntries(customers.map(x => [x.id, x]));
  const today = new Date().toISOString().slice(0, 10);

  const list = () => {
    const ql = q.trim().toLowerCase();
    if (tab === 'orders') {
      const rows = orders.filter(r => !ql || `${r.order_number} ${cus[r.customer_id]?.name || ''}`.toLowerCase().includes(ql)).map(r => {
        const late = r.due_date && r.due_date < today && !['delivered', 'cancelled'].includes(r.status);
        return `<div class="card"><div class="row"><b>${esc(r.order_number)}</b><span class="badge ${late ? 'late' : ''}">${esc(t('st')[r.status] || r.status)}</span></div>
        <div>${esc(cus[r.customer_id]?.name || '')}</div>
        <small>${t('o_due')}: ${esc(r.due_date || '—')} · ${t('o_deposit')}: ${money(r.deposit_amount)} · ${t('o_rest')}: ${money(r.total_amount - r.deposit_amount)} ${t('o_cur')}</small></div>`;
      }).join('');
      return (can ? `<button class="btn" data-act="neworder">${t('o_new')}</button>` : '') + (rows || `<div class="muted">${t('none')}</div>`);
    }
    const rows = customers.filter(r => !ql || `${r.name} ${r.phone || ''} ${r.customer_code}`.toLowerCase().includes(ql)).map(r =>
      `<div class="card"><div class="row"><b>${esc(r.name)}</b><span class="badge">${esc(r.customer_code)}</span></div>
      <small>${esc(r.phone || '')} ${esc(r.address || '')}</small></div>`).join('');
    return (can ? `<button class="btn" data-act="newcustomer">${t('o_newc')}</button>` : '') + (rows || `<div class="muted">${t('o_noc')}</div>`);
  };

  const wire = () => {
    document.querySelectorAll('[data-act]').forEach(b => b.onclick = () => (b.dataset.act === 'neworder' ? newOrder(m) : custForm(m)));
  };
  const draw = () => {
    const seg = (k, l) => `<button class="btn ${tab === k ? '' : 'out'}" data-seg="${k}">${l}</button>`;
    m.innerHTML = `<div class="grid">${seg('orders', t('o_orders'))}${seg('customers', t('o_customers'))}</div>
    <div class="f"><input id="oq" type="search" placeholder="${t('o_search')}" value="${esc(q)}"></div><div id="ol" class="f">${list()}</div>`;
    document.querySelectorAll('[data-seg]').forEach(b => b.onclick = () => { tab = b.dataset.seg; draw(); });
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
      const { error } = await sb.from('customers').insert({ branch_id: S.profile.branch_id, name, customer_type: $('#ct').value, phone: $('#cp').value.trim() || null, address: $('#ca').value.trim() || null });
      if (error) return ($('#ce').textContent = t('err') + ': ' + error.message);
      tab = 'customers';
      render(m);
    };
  }
  draw();
}
