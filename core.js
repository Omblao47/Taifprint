import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
export const sb = createClient('https://rierymzwgjdxccgfxitl.supabase.co', 'sb_publishable_fvG1ZCdZ-nR210L5Hzr38A_x7DY7Ap8');
export const S = { profile: null, tab: null, branch: '', lang: localStorage.getItem('lang') || 'ar' };
export const T = {
ar:{email:'البريد الإلكتروني',password:'كلمة المرور',login:'دخول',logout:'خروج',loginErr:'البريد أو كلمة المرور غير صحيحة',noProfile:'حسابك غير مفعّل بعد. تواصل مع المدير.',hello:'مرحباً',home:'الرئيسية',production:'الإنتاج',orders:'الطلبات',stock:'المخزون',tasks:'مهامي',newOrders:'طلبات جديدة',inProd:'قيد الإنتاج',late:'متأخرة',lowStock:'مواد منخفضة',latest:'أحدث الطلبات',none:'لا توجد طلبات بعد',soon:'يُبنى هذا القسم في الخطوة التالية',loading:'جارٍ التحميل…',err:'تعذّر تحميل البيانات',
role:{manager:'المدير',production_manager:'مسؤول الإنتاج',sales:'الاستقبال والمبيعات',operator:'عامل إنتاج',storekeeper:'مسؤول المخزون'},
st:{received:'جديدة',quoted:'عرض سعر',design:'تصميم',awaiting_approval:'بانتظار الموافقة',approved:'معتمدة',production:'قيد الإنتاج',quality_check:'مراقبة الجودة',ready:'جاهزة للتسليم',delivered:'مُسلَّمة',cancelled:'ملغاة'}},
fr:{email:'E-mail',password:'Mot de passe',login:'Connexion',logout:'Déconnexion',loginErr:'E-mail ou mot de passe incorrect',noProfile:"Votre compte n'est pas encore activé. Contactez l'administrateur.",hello:'Bonjour',home:'Accueil',production:'Production',orders:'Commandes',stock:'Stock',tasks:'Mes tâches',newOrders:'Nouvelles commandes',inProd:'En production',late:'En retard',lowStock:'Stock bas',latest:'Dernières commandes',none:'Aucune commande',soon:'Cette section arrive à la prochaine étape',loading:'Chargement…',err:'Chargement impossible',
role:{manager:'Administrateur',production_manager:'Chef de production',sales:'Commercial / Réception',operator:'Opérateur',storekeeper:'Magasinier'},
st:{received:'Nouvelle',quoted:'Devis',design:'Design',awaiting_approval:'Attente validation',approved:'Validée',production:'En production',quality_check:'Contrôle qualité',ready:'Prête',delivered:'Livrée',cancelled:'Annulée'}}};
export const addText = d => { for (const l of ['ar', 'fr']) Object.assign(T[l], d[l] || {}); };
export const t = k => T[S.lang][k] ?? k;
export const $ = s => document.querySelector(s);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const NAV = {manager:['home','production','orders','stock'],production_manager:['production','orders','stock'],sales:['orders'],operator:['tasks'],storekeeper:['stock']};
const ICON = {home:'M3 11l9-8 9 8v9H3z',production:'M3 8h18v10H3zM7 8V4h10v4',orders:'M5 3h14v18H5zM9 8h6M9 12h6',stock:'M3 7l9-4 9 4v10l-9 4-9-4z',tasks:'M5 3h14v18H5zM9 12l2 2 4-4'};
export const ic = k => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="${ICON[k]}"/></svg>`;
