import { sb, S, t, $, esc, addText } from './core.js';
addText({
ar:{p_pending:'بالانتظار',p_in_progress:'قيد العمل',p_completed:'منتهية',p_skipped:'متخطاة',p_nomc:'اختر الآلة',p_workers:'العمال',p_qty:'الكمية المنجزة',p_valid:'تم التحقق (Validation)',p_note:'ملاحظة',p_poste:'إضافة Poste سحب',p_edit:'تحديث',p_none:'لا توجد طلبيات قيد الإنتاج',p_st:'الحالة'},
fr:{p_pending:'En attente',p_in_progress:'En cours',p_completed:'Terminée',p_skipped:'Ignorée',p_nomc:'Choisir la machine',p_workers:'Opérateurs',p_qty:'Quantité réalisée',p_valid:'Validation',p_note:'Remarque',p_poste:'Ajouter un poste de tirage',p_edit:'Mettre à jour',p_none:'Aucune commande en production',p_st:'Statut'}});

const openSet = new Set();
const STY = { completed: 'background:#E6F4F1;color:#0B5F58', in_progress: 'background:#E8EEFA;color:#1D4ED8' };

export async function render(m) {
  const bid = S.profile.branch_id, today = new Date().toISOString().slice(0, 10), hide = S.profile.role === 'production_manager';
  const R = await Promise.all([
    sb.from('orders').select('id,order_number,status,due_date,customer_id').not('status', 'in', '(delivered,cancelled)').order('due_date', { ascending: true, nullsFirst: false }),
    sb.from('order_items').select('id,order_id,line_no,product_name,quantity'),
    sb.from('order_item_stages').select('id,order_item_id,stage_id,sort_order,poste,status,machine_id,done_quantity,validated,notes,started_at,production_stages(code,name_ar,name_fr)'),
    sb.from('machines').select('id,name,active').order('code'),
    sb.from('workers').select('id,full_name,active').order('full_name'),
    sb.from('stage_assignments').select('item_stage_id,worker_id'),
    sb.from('customers').select('id,name')
  ]);
  for (const r of R) if (r.error) throw r.error;
  const [or, it, st, mc, wk, as, cu] = R.map(r => r.data || []);
  const cusN = Object.fromEntries(cu.map(c => [c.id, c.name]));
  const wkN = Object.fromEntries(wk.map(w => [w.id, w.full_name]));
  const mcN = Object.fromEntries(mc.map(x => [x.id, x.name]));
  const asBy = {}, stBy = {}, itBy = {}, stById = {}, ordOf = {};
  as.forEach(a => (asBy[a.item_stage_id] ||= []).push(a.worker_id));
  st.forEach(s => { (stBy[s.order_item_id] ||= []).push(s); stById[s.id] = s; });
  it.forEach(i => { (itBy[i.order_id] ||= []).push(i); ordOf[i.id] = i.order_id; });
  const nmx = ps => (S.lang === 'ar' ? ps?.name_ar : ps?.name_fr) || '';
  const label = s => (s.production_stages?.code === 'printing' ? `${nmx(s.production_stages)} · Poste ${s.poste || 1}` : nmx(s.production_stages));
  const prog = items => {
    const all = items.flatMap(i => stBy[i.id] || []).filter(s => s.status !== 'skipped');
    return all.length ? Math.round(all.filter(s => s.status === 'completed').length / all.length * 100) : 0;
  };

  const stageRow = s => {
    const ws = (asBy[s.id] || []).map(id => wkN[id]).filter(Boolean).join('، ');
    const info = [mcN[s.machine_id], ws, s.done_quantity ? `${s.done_quantity}` : '', s.validated ? '✔' : ''].filter(Boolean).join(' · ');
    return `<div class="row"><span><b>${esc(label(s))}</b><br><small style="color:var(--mute)">${esc(info)}</small></span>
    <span style="display:flex;gap:6px;align-items:center"><span class="badge" style="${STY[s.status] || ''}">${t('p_' + s.status)}</span>
    <button class="btn out" data-edit="${s.id}" style="min-height:40px;padding:0 10px">${t('p_edit')}</button></span></div>`;
  };
  const itemBlock = i => `<div style="margin-top:10px"><b>${esc(i.product_name)}</b> <small>· ${i.quantity}</small>
    ${(stBy[i.id] || []).filter(s => s.status !== 'skipped').sort((a, b) => a.sort_order - b.sort_order || a.poste - b.poste).map(stageRow).join('')}</div>`;
  const orderCard = o => {
    const items = (itBy[o.id] || []).sort((a, b) => a.line_no - b.line_no);
    const p = prog(items), late = o.due_date && o.due_date < today;
    const names = items.map(i => i.product_name).join(' + ');
    return `<details class="card" data-oid="${o.id}" ${openSet.has(o.id) ? 'open' : ''}>
    <summary style="cursor:pointer;display:flex;flex-direction:column;gap:6px;list-style:none">
    <div class="row" style="border:0;padding:0"><b>${esc(names)}</b><span class="badge ${late ? 'late' : ''}">${esc(o.due_date || '—')}</span></div>
    ${hide ? '' : `<small style="color:var(--mute)">${esc(o.order_number)} · ${esc(cusN[o.customer_id] || '')}</small>`}
    <div style="display:flex;align-items:center;gap:10px"><div style="flex:1;height:8px;background:#E3E8F0;border-radius:4px"><div style="width:${p}%;height:8px;background:var(--green);border-radius:4px"></div></div><b>${p}%</b></div></summary>
    ${items.map(itemBlock).join('')}</details>`;
  };

  m.innerHTML = `<style>.chip{border:1px solid var(--line);background:#fff;border-radius:16px;padding:6px 12px;min-height:40px;cursor:pointer}.chip.on{background:#E8EEFA;border-color:var(--navy);color:var(--navy);font-weight:700}</style>
  ${or.length ? or.map(orderCard).join('') : `<div class="muted">${t('p_none')}</div>`}`;
  m.querySelectorAll('details').forEach(d => (d.ontoggle = () => (d.open ? openSet.add(d.dataset.oid) : openSet.delete(d.dataset.oid))));
  m.querySelectorAll('[data-edit]').forEach(b => (b.onclick = () => edit(stById[b.dataset.edit])));

  async function syncOrder(orderId) {
    const ids = (itBy[orderId] || []).map(i => i.id);
    if (!ids.length) return;
    const { data } = await sb.from('order_item_stages').select('status,production_stages(code)').in('order_item_id', ids);
    const all = data || [];
    const dl = all.filter(x => x.production_stages?.code === 'delivery');
    const rest = all.filter(x => x.production_stages?.code !== 'delivery');
    const done = x => ['completed', 'skipped'].includes(x.status);
    let upd = null;
    if (dl.length && dl.every(x => x.status === 'completed')) upd = { status: 'delivered', delivered_at: new Date().toISOString(), delivered_by: S.profile.user_id };
    else if (rest.length && rest.every(done)) upd = { status: 'ready' };
    else if (all.some(x => x.status !== 'pending')) upd = { status: 'production' };
    if (upd) await sb.from('orders').update(upd).eq('id', orderId);
  }

  function edit(s) {
    const cur = asBy[s.id] || [], sel = new Set(cur);
    let val = !!s.validated;
    const o = document.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:flex-end;justify-content:center;z-index:50';
    o.innerHTML = `<div class="card f" style="width:100%;max-width:720px;max-height:90vh;overflow:auto;border-radius:16px 16px 0 0">
    <b>${esc(label(s))}</b>
    <select id="e_st" aria-label="${t('p_st')}">${['pending', 'in_progress', 'completed', 'skipped'].map(x => `<option value="${x}" ${s.status === x ? 'selected' : ''}>${t('p_' + x)}</option>`).join('')}</select>
    <select id="e_mc" aria-label="machine"><option value="">${t('p_nomc')}</option>${mc.filter(x => x.active || x.id === s.machine_id).map(x => `<option value="${x.id}" ${s.machine_id === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
    <small>${t('p_workers')}</small>
    <div id="e_w" style="display:flex;flex-wrap:wrap;gap:6px">${wk.filter(w => w.active || sel.has(w.id)).map(w => `<button type="button" class="chip ${sel.has(w.id) ? 'on' : ''}" data-w="${w.id}">${esc(w.full_name)}</button>`).join('')}</div>
    <input id="e_q" type="number" inputmode="decimal" min="0" value="${s.done_quantity || ''}" placeholder="${t('p_qty')}">
    <button type="button" class="chip ${val ? 'on' : ''}" id="e_v">${t('p_valid')}</button>
    <input id="e_n" placeholder="${t('p_note')}" value="${esc(s.notes || '')}">
    <div class="err" id="e_e" role="alert"></div>
    <button class="btn" id="e_s">${t('o_save')}</button>
    ${s.production_stages?.code === 'printing' ? `<button class="btn out" id="e_p">${t('p_poste')}</button>` : ''}
    <button class="btn out" id="e_c">${t('o_cancel')}</button></div>`;
    document.body.appendChild(o);
    const close = () => o.remove();
    const q = x => o.querySelector(x);
    q('#e_c').onclick = close;
    q('#e_w').onclick = e => { const b = e.target.closest('[data-w]'); if (!b) return; sel.has(b.dataset.w) ? sel.delete(b.dataset.w) : sel.add(b.dataset.w); b.classList.toggle('on'); };
    q('#e_v').onclick = e => { val = !val; e.target.classList.toggle('on', val); };
    if (q('#e_p')) q('#e_p').onclick = async () => {
      const max = Math.max(...(stBy[s.order_item_id] || []).filter(x => x.stage_id === s.stage_id).map(x => x.poste || 0), 0);
      const { error } = await sb.from('order_item_stages').insert({ branch_id: bid, order_item_id: s.order_item_id, stage_id: s.stage_id, sort_order: s.sort_order, poste: max + 1 });
      if (error) return (q('#e_e').textContent = t('err') + ': ' + error.message);
      openSet.add(ordOf[s.order_item_id]); close(); render(m);
    };
    q('#e_s').onclick = async () => {
      const err = x => (q('#e_e').textContent = x);
      const btn = q('#e_s'); btn.disabled = true;
      try {
        const status = q('#e_st').value, now = new Date().toISOString();
        const upd = { status, machine_id: q('#e_mc').value || null, done_quantity: Number(q('#e_q').value || 0), validated: val, validated_at: val ? now : null, notes: q('#e_n').value.trim() || null };
        if (status === 'in_progress' && !s.started_at) upd.started_at = now;
        if (status === 'completed') { upd.finished_at = now; if (!s.started_at) upd.started_at = now; }
        const r1 = await sb.from('order_item_stages').update(upd).eq('id', s.id);
        if (r1.error) throw r1.error;
        const ev = [];
        if (status !== s.status && status === 'in_progress') ev.push({ event_type: 'started' });
        if (status !== s.status && status === 'completed') ev.push({ event_type: 'completed' });
        if ([...sel].sort().join() !== [...cur].sort().join()) {
          const d = await sb.from('stage_assignments').delete().eq('item_stage_id', s.id);
          if (d.error) throw d.error;
          if (sel.size) { const i = await sb.from('stage_assignments').insert([...sel].map(w => ({ item_stage_id: s.id, worker_id: w, branch_id: bid }))); if (i.error) throw i.error; }
          ev.push({ event_type: 'assigned', note: [...sel].map(w => wkN[w]).join('، ') });
        } else if ((upd.machine_id || '') !== (s.machine_id || '')) ev.push({ event_type: 'assigned', note: mcN[upd.machine_id] || '' });
        if (upd.done_quantity !== Number(s.done_quantity || 0)) ev.push({ event_type: 'quantity', quantity: upd.done_quantity });
        if (ev.length) await sb.from('stage_events').insert(ev.map(e => ({ branch_id: bid, item_stage_id: s.id, ...e })));
        await syncOrder(ordOf[s.order_item_id]);
        openSet.add(ordOf[s.order_item_id]); close(); render(m);
      } catch (e) { console.error(e); err(t('err') + ': ' + (e.message || e)); btn.disabled = false; }
    };
  }
}
