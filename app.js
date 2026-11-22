import { sb, S, t, $, esc, NAV, ic } from './core.js';

function applyLang() { document.documentElement.lang = S.lang; document.documentElement.dir = S.lang === 'ar' ? 'rtl' : 'ltr'; }
function flip(fn) { S.lang = S.lang === 'ar' ? 'fr' : 'ar'; localStorage.setItem('lang', S.lang); fn(); }

function login(msg = '') {
  applyLang();
  $('#app').innerHTML = `<form class="login" id="lf"><h1>TAIF PRINT ERP</h1>
  <input id="em" type="email" autocomplete="username" placeholder="${t('email')}" required>
  <input id="pw" type="password" autocomplete="current-password" placeholder="${t('password')}" required>
  <div class="err" id="er" role="alert">${esc(msg)}</div>
  <button class="btn" type="submit">${t('login')}</button>
  <button class="ghost" type="button" id="lg" style="color:#12305F;border-color:#C9D6EE">${S.lang === 'ar' ? 'Français' : 'العربية'}</button></form>`;
  $('#lg').onclick = () => flip(login);
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    const { error } = await sb.auth.signInWithPassword({ email: $('#em').value.trim(), password: $('#pw').value });
    if (error) return ($('#er').textContent = t('loginErr'));
    boot();
  };
}

async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return login();
  const { data: p } = await sb.from('profiles').select('*').eq('user_id', session.user.id).maybeSingle();
  if (!p || !p.active || !NAV[p.role]) { await sb.auth.signOut(); return login(t('noProfile')); }
  S.profile = p;
  if (!localStorage.getItem('lang')) S.lang = p.language || 'ar';
  const { data: b } = await sb.from('branches').select('name').eq('id', p.branch_id).maybeSingle();
  S.branch = b?.name || '';
  S.tab = NAV[p.role][0];
  shell();
}

function shell() {
  applyLang();
  const p = S.profile;
  $('#app').innerHTML = `<header class="top"><div class="t"><small>${t('hello')}، ${esc(p.full_name)} · ${esc(t('role')[p.role])}</small><b>TAIF PRINT</b>${S.branch ? `<small>${esc(S.branch)}</small>` : ''}</div>
  <button class="ghost" id="lg" aria-label="language">${S.lang === 'ar' ? 'FR' : 'AR'}</button>
  <button class="ghost" id="lo" aria-label="${t('logout')}">${t('logout')}</button></header>
  <main id="main"></main>
  <nav class="nav">${NAV[p.role].map(k => `<button data-tab="${k}" class="${k === S.tab ? 'on' : ''}">${ic(k)}${t(k)}</button>`).join('')}</nav>`;
  $('#lg').onclick = () => flip(shell);
  $('#lo').onclick = async () => { await sb.auth.signOut(); login(); };
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; shell(); });
  tab();
}

async function tab() {
  const m = $('#main');
  m.innerHTML = `<div class="muted">${t('loading')}</div>`;
  try {
    const mod = await import(`./${S.tab}.js?v=${Date.now()}`);
    await mod.render(m);
  } catch (e) {
    console.error(e);
    const missing = /dynamically imported|Failed to fetch|Importing a module/i.test(String(e.message));
    m.innerHTML = `<div class="muted">${t(missing ? 'soon' : 'err')}</div>`;
  }
}

boot();
