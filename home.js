import { sb, S, t, esc } from './core.js';

export async function render(m) {
  const hide = S.profile.role === 'production_manager';
  const today = new Date().toISOString().slice(0, 10);
  const cnt = q => q.then(r => r.count ?? 0);
  const head = { count: 'exact', head: true };
  const [nw, pr, lt, lo, last] = await Promise.all([
    cnt(sb.from('orders').select('id', head).eq('status', 'received')),
    cnt(sb.from('orders').select('id', head).in('status', ['design', 'awaiting_approval', 'approved', 'production', 'quality_check'])),
    cnt(sb.from('orders').select('id', head).lt('due_date', today).not('status', 'in', '(delivered,cancelled)')),
    cnt(sb.from('low_stock_materials').select('id', head)),
    sb.from('orders').select('id,order_number,status,due_date,customer_id').order('created_at', { ascending: false }).limit(5)
  ]);
  const orders = last.data || [], oids = orders.map(o => o.id);
  const [it, cu] = await Promise.all([
    oids.length ? sb.from('order_items').select('id,order_id,line_no,product_name').in('order_id', oids) : { data: [] },
    !hide && orders.length ? sb.from('customers').select('id,name').in('id', orders.map(o => o.customer_id)) : { data: [] }
  ]);
  const items = it.data || [], iids = items.map(i => i.id);
  const st = iids.length ? (await sb.from('order_item_stages').select('order_item_id,status').in('order_item_id', iids)).data || [] : [];
  const cusN = Object.fromEntries((cu.data || []).map(c => [c.id, c.name]));
  const info = o => {
    const its = items.filter(i => i.order_id === o.id).sort((a, b) => a.line_no - b.line_no);
    const ids = its.map(i => i.id);
    const ss = st.filter(s => ids.includes(s.order_item_id) && s.status !== 'skipped');
    return { names: its.map(i => i.product_name).join(' + '), p: ss.length ? Math.round(ss.filter(s => s.status === 'completed').length / ss.length * 100) : 0 };
  };
  const card = (l, n, c) => `<div class="card"><small>${l}</small><div class="num" style="color:${c}">${n}</div></div>`;
  const rows = orders.map(o => {
    const { names, p } = info(o);
    const late = o.due_date && o.due_date < today && !['delivered', 'cancelled'].includes(o.status);
    return `<div class="row" style="align-items:flex-start"><span style="flex:1"><b>${esc(names || o.order_number)}</b>
      ${hide ? '' : `<br><small style="color:var(--mute)">${esc(o.order_number)} · ${esc(cusN[o.customer_id] || '')}</small>`}
      <div style="display:flex;align-items:center;gap:8px;margin-top:6px"><div style="flex:1;height:6px;background:#E3E8F0;border-radius:3px"><div style="width:${p}%;height:6px;background:var(--green);border-radius:3px"></div></div><small><b>${p}%</b></small></div></span>
      <span class="badge ${late ? 'late' : ''}">${esc(o.due_date || t('st')[o.status] || '')}</span></div>`;
  }).join('');
  m.innerHTML = `<div class="grid">${card(t('newOrders'), nw, 'var(--blue)')}${card(t('inProd'), pr, 'var(--green)')}${card(t('late'), lt, 'var(--red)')}${card(t('lowStock'), lo, 'var(--amber)')}</div>
  <h2>${t('latest')}</h2><div class="card">${rows || `<div class="muted">${t('none')}</div>`}</div>`;
}
