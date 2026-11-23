import { sb, S, t, esc, addText } from './core.js';
addText({
ar:{j_ask:'اكتملت هذه الطلبية. ما نوع العمل؟',j_perm:'عمل دائم (متكرر)',j_temp:'عمل مؤقت',j_later:'لاحقاً'},
fr:{j_ask:'Cette commande est terminée. Quel type de travail ?',j_perm:'Travail permanent (récurrent)',j_temp:'Travail temporaire',j_later:'Plus tard'}});

export async function askPending() {
  if (S.profile.role !== 'manager' || S.jtSkip) return;
  const { data } = await sb.from('orders').select('id,order_number,description').eq('status', 'delivered').is('job_type', null).order('delivered_at', { ascending: false }).limit(20);
  for (const o of data || []) {
    const v = await new Promise(res => {
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:60;padding:16px';
      d.innerHTML = `<div class="card f" style="width:100%;max-width:420px"><b>${esc(o.order_number)}</b><div>${esc(o.description)}</div><small>${t('j_ask')}</small>
      <button class="btn" data-v="permanent">${t('j_perm')}</button><button class="btn out" data-v="temporary">${t('j_temp')}</button><button class="btn out" data-v="later">${t('j_later')}</button></div>`;
      d.onclick = e => { const b = e.target.closest('[data-v]'); if (b) { d.remove(); res(b.dataset.v); } };
      document.body.appendChild(d);
    });
    if (v === 'later') { S.jtSkip = true; break; }
    await sb.from('orders').update({ job_type: v }).eq('id', o.id);
  }
}
