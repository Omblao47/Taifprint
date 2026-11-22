import { sb, t, esc } from './core.js';

export async function render(m) {
  const today = new Date().toISOString().slice(0, 10);
  const cnt = q => q.then(r => r.count ?? 0);
  const head = { count: 'exact', head: true };
  const [nw, pr, lt, lo, last] = await Promise.all([
    cnt(sb.from('orders').select('id', head).eq('status', 'received')),
    cnt(sb.from('orders').select('id', head).in('status', ['design', 'awaiting_approval', 'approved', 'production', 'quality_check'])),
    cnt(sb.from('orders').select('id', head).lt('due_date', today).not('status', 'in', '(delivered,cancelled)')),
    cnt(sb.from('low_stock_materials').select('id', head)),
    sb.from('orders').select('order_number,status,due_date').order('created_at', { ascending: false }).limit(5)
  ]);
  const card = (l, n, c) => `<div class="card"><small>${l}</small><div class="num" style="color:${c}">${n}</div></div>`;
  const rows = (last.data || []).map(o => `<div class="row"><span><b>${esc(o.order_number)}</b><br><small style="color:var(--mute)">${esc(o.due_date || '')}</small></span>
    <span class="badge ${o.due_date && o.due_date < today && !['delivered', 'cancelled'].includes(o.status) ? 'late' : ''}">${esc(t('st')[o.status] || o.status)}</span></div>`).join('');
  m.innerHTML = `<div class="grid">${card(t('newOrders'), nw, 'var(--blue)')}${card(t('inProd'), pr, 'var(--green)')}${card(t('late'), lt, 'var(--red)')}${card(t('lowStock'), lo, 'var(--amber)')}</div>
  <h2>${t('latest')}</h2><div class="card">${rows || `<div class="muted">${t('none')}</div>`}</div>`;
}
