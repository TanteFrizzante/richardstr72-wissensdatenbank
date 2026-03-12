/* ═══════════════════════════════════════════
   Richardstr. 72 — App Logic
   Navigation, Calculators, Data
   ═══════════════════════════════════════════ */

// ─── Service Worker (PWA) ───
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(function() {});
}

// ─── Auth Gate ───
var AUTH_HASH = '683d2896fa2a073c264323b75eab86c9f7d99cb3879fae62a671842e32c746c2';

async function sha256(str) {
  var buf = new TextEncoder().encode(str);
  var hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

async function checkAuth() {
  var pw = document.getElementById('authPw').value;
  var hash = await sha256(pw);
  if (hash === AUTH_HASH) {
    sessionStorage.setItem('r72_auth', '1');
    showApp();
  } else {
    document.getElementById('authError').textContent = 'Falsches Passwort';
    document.getElementById('authPw').value = '';
    document.getElementById('authPw').focus();
  }
  return false;
}

function showApp() {
  var gate = document.getElementById('authGate');
  var app = document.getElementById('appMain');
  var toggle = document.getElementById('menuToggle');
  if (gate) gate.style.display = 'none';
  if (app) app.style.display = '';
  if (toggle) toggle.style.display = '';
}

// Auto-login if already authenticated in this session
if (sessionStorage.getItem('r72_auth') === '1') {
  document.addEventListener('DOMContentLoaded', showApp);
} else {
  document.addEventListener('DOMContentLoaded', function() {
    var toggle = document.getElementById('menuToggle');
    if (toggle) toggle.style.display = 'none';
  });
}

// ─── Navigation ───
function navigateToPage(pageId) {
  var pages = document.querySelectorAll('.page');
  var navLinks = document.querySelectorAll('#nav a');
  var sidebar = document.getElementById('sidebar');
  pages.forEach(function (p) { p.classList.remove('active'); });
  navLinks.forEach(function (l) { l.classList.remove('active'); });
  var target = document.getElementById(pageId);
  if (target) target.classList.add('active');
  var link = document.querySelector('[data-page="' + pageId + '"]');
  if (link) link.classList.add('active');
  if (window.innerWidth <= 768 && sidebar) {
    sidebar.classList.remove('open');
    var ov = document.getElementById('sidebarOverlay');
    if (ov) ov.classList.remove('show');
  }
  window.scrollTo(0, 0);
}

document.addEventListener('DOMContentLoaded', function () {
  const navLinks = document.querySelectorAll('#nav a');
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');

  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      navigateToPage(this.dataset.page);
    });
  });

  var overlay = document.getElementById('sidebarOverlay');

  function openSidebar() {
    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('show');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      if (sidebar.classList.contains('open')) closeSidebar();
      else openSidebar();
    });
  }
  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }

  // Init all calculators
  calcWEG(2000000);
  calcF20();
  calcKPDetail();
  calcVM();
  calcFin();
  renderTrello();
  renderGallery();
  renderNotes();
  renderEnergie();
  renderRenovBoard();
  renderDokumente();
  renderFlaechen();
  renderGantt();
  renderDashboard();
});

// ─── Helpers ───
function fmt(n) {
  return n.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' \u20AC';
}

function fmtN(n) {
  return n.toLocaleString('de-DE', { maximumFractionDigits: 0 });
}

function $(id) {
  return document.getElementById(id);
}

function setEl(id, txt) {
  var e = $(id);
  if (!e) return;
  if (e.tagName === 'INPUT') {
    var s = String(txt).replace(/[^0-9.,\-+]/g, '');
    s = s.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(s);
    e.value = isNaN(n) ? 0 : n;
  } else {
    e.textContent = txt;
  }
}

function getVal(id) {
  var e = $(id);
  if (!e) return 0;
  return parseFloat(e.value) || 0;
}

// ─── Back-calculation: Miete/Mon or /Jahr → €/m² ───
function revSqm(monId, sqmId, rateId) {
  var mon = getVal(monId), sqm = getVal(sqmId);
  if (sqm > 0) $(rateId).value = (mon / sqm).toFixed(2);
  calcF20();
}
function revSqmA(jahrId, sqmId, rateId) {
  var jahr = getVal(jahrId), sqm = getVal(sqmId);
  if (sqm > 0) $(rateId).value = (jahr / 12 / sqm).toFixed(2);
  calcF20();
}
function revFlat(monId, inputId) {
  $(inputId).value = getVal(monId);
  calcF20();
}
function revFlatA(jahrId, inputId) {
  $(inputId).value = Math.round(getVal(jahrId) / 12);
  calcF20();
}
function revSp(monId, countId, priceId) {
  var n = getVal(countId);
  if (n > 0) $(priceId).value = Math.round(getVal(monId) / n);
  calcF20();
}
function revSpA(jahrId, countId, priceId) {
  var n = getVal(countId);
  if (n > 0) $(priceId).value = Math.round(getVal(jahrId) / 12 / n);
  calcF20();
}

// ─── Collapsible sections ───
function toggleCollapse(el) {
  el.classList.toggle('open');
  el.nextElementSibling.classList.toggle('open');
}

// ═══════════════════════════════════
// WEG RECHNER
// ═══════════════════════════════════
var WG_W1 = 59.56, WG_W2 = 106.70, WG_W3 = 138.31;
var WG_DG_SALE = 100000, WG_IR = 21530, WG_SR = 56126;
var _weg_kp = 2000000;

function calcWEG(kp) {
  if (!kp) kp = _weg_kp || 2000000;
  _weg_kp = kp;

  var p1 = getVal('weg_p1') || 4900;
  var p2 = getVal('weg_p2') || 5200;
  var p3 = getVal('weg_p3') || 4900;

  var w1 = WG_W1 * p1, w2 = WG_W2 * p2, w3 = WG_W3 * p3;
  var tw = w1 + w2 + w3, te = kp - tw;
  var av = tw / (WG_W1 + WG_W2 + WG_W3);

  var eDG = getVal('weg_dg') || 120;
  var eTE = getVal('weg_te15') || 619.86;
  var eGar = getVal('weg_gar') || 197.60;
  var ES = eDG + eTE + eGar;

  setEl('weg_eig_sqm', ES.toFixed(2).replace('.', ',') + ' m\u00B2');
  var es = te / ES;
  var gr = kp * 0.06, no = kp * 0.015, ti = kp + gr + no;

  setEl('we1p', fmt(w1));
  setEl('we2p', fmt(w2));
  setEl('we3p', fmt(w3));
  setEl('twoh', fmt(tw));
  setEl('avgsqm', '\u00D8 ' + fmtN(Math.round(av)) + ' \u20AC/m\u00B2');
  setEl('teig', fmt(te));
  setEl('eigsqm', '\u00D8 ' + fmtN(Math.round(es)) + ' \u20AC/m\u00B2 (' + ES.toFixed(2).replace('.', ',') + ' m\u00B2)');
  setEl('kpt', fmt(kp));
  setEl('kpw', fmt(tw));
  setEl('kpe', fmt(te));
  setEl('pcw', (tw / kp * 100).toFixed(1) + ' %');
  setEl('pce', (te / kp * 100).toFixed(1) + ' %');
  setEl('kng', fmt(gr));
  setEl('knn', fmt(no));
  setEl('knt', fmt(ti));
  setEl('ri', (WG_IR / kp * 100).toFixed(2) + ' %');
  setEl('rs', (WG_SR / kp * 100).toFixed(2) + ' %');
  setEl('kf', (kp / WG_SR).toFixed(1) + 'x');
  setEl('ead', fmt(te - WG_DG_SALE));
}

function setV(kp, el) {
  document.querySelectorAll('.variant-tab').forEach(function (t) { t.classList.remove('active'); });
  el.classList.add('active');
  $('ckp').value = '';
  calcWEG(kp);
}

function setCust() {
  var v = parseInt($('ckp').value);
  if (v > 0) {
    document.querySelectorAll('.variant-tab').forEach(function (t) { t.classList.remove('active'); });
    calcWEG(v);
  }
}

// ═══════════════════════════════════
// KP VARIANTE FAKTOR 20
// ═══════════════════════════════════
var WE1_SQM = 59.56, WE2_SQM = 106.70, WE3_SQM = 138.31;
var TE15_SQM = 619.86, TE6_SQM = 57.91, SDG_SQM = 116.25;
// RENOV_GEW und INVEST_WOHN werden dynamisch vom Kalkulationsboard aktualisiert
var RENOV_GEW = 787000, INVEST_WOHN = 600000;
var EK_TOTAL = 250000, BK_PA = 5674; // Nur nicht-umlagefaehige BK (Verwaltung, Instandhaltung)

function calcF20() {
  var kp = getVal('inp_kp'); if (kp <= 0) kp = 2200000;
  var faktor = getVal('inp_faktor'); if (faktor <= 0) faktor = 20;
  var ziel_pa = kp / faktor, ziel_mon = ziel_pa / 12;
  var grest_pct = getVal('inv_grest_pct') / 100; if (grest_pct <= 0) grest_pct = 0.06;
  var notar_pct = getVal('inv_notar_pct') / 100; if (notar_pct <= 0) notar_pct = 0.015;
  var grest = kp * grest_pct, notar = kp * notar_pct;

  // EK dynamisch aus Inputs
  var ek_andreas = getVal('ek_andreas'), ek_morits = getVal('ek_morits');
  var ek_total = ek_andreas + ek_morits;
  setEl('ek_total', fmt(ek_total));

  // BK und Zinssatz dynamisch aus Inputs
  var bk_pa = getVal('cf_bk');
  var zinssatz = getVal('cf_zins') / 100;

  // RENOV_GEW = alle Gewerbe-Positionen (inkl. Scheune), INVEST_WOHN = alle Wohn-Positionen (inkl. DG)
  var total_a = kp + grest + notar + RENOV_GEW + INVEST_WOHN;
  var total_b = total_a; // Alle Positionen bereits im Board enthalten
  var fk_a = total_a - ek_total, fk_b = total_b - ek_total;

  // ─── IST Wohnen ───
  var ist_sqm_we1 = getVal('ist_sqm_we1'), ist_sqm_we2 = getVal('ist_sqm_we2');
  var ist_sqm_we3 = getVal('ist_sqm_we3'), ist_sqm_we4 = getVal('ist_sqm_we4');
  var r_we1 = getVal('inp_we1'), r_we2 = getVal('inp_we2');
  var r_we3 = getVal('inp_we3'), r_we4 = getVal('inp_we4');
  var ist_we1 = ist_sqm_we1 * r_we1, ist_we2 = ist_sqm_we2 * r_we2;
  var ist_we3 = ist_sqm_we3 * r_we3, ist_we4 = ist_sqm_we4 * r_we4;
  var ist_w_mon = ist_we1 + ist_we2 + ist_we3 + ist_we4, ist_w_pa = ist_w_mon * 12;
  var ist_w_sqm_total = ist_sqm_we1 + ist_sqm_we2 + ist_sqm_we3 + ist_sqm_we4;
  var ist_w_avg = ist_w_sqm_total > 0 ? ist_w_mon / ist_w_sqm_total : 0;
  setEl('ist_we1m', fmtN(Math.round(ist_we1)) + ' \u20AC');
  setEl('ist_we1a', fmtN(Math.round(ist_we1 * 12)) + ' \u20AC');
  setEl('ist_we2m', fmtN(Math.round(ist_we2)) + ' \u20AC');
  setEl('ist_we2a', fmtN(Math.round(ist_we2 * 12)) + ' \u20AC');
  setEl('ist_we3m', fmtN(Math.round(ist_we3)) + ' \u20AC');
  setEl('ist_we3a', fmtN(Math.round(ist_we3 * 12)) + ' \u20AC');
  setEl('ist_we4m', fmtN(Math.round(ist_we4)) + ' \u20AC');
  setEl('ist_we4a', fmtN(Math.round(ist_we4 * 12)) + ' \u20AC');
  setEl('ist_w_sqm', ist_w_sqm_total.toFixed(2).replace('.', ',') + ' m\u00B2');
  setEl('ist_w_avg', ist_w_avg.toFixed(2).replace('.', ',') + ' \u20AC/m\u00B2');
  setEl('ist_wm', fmtN(Math.round(ist_w_mon)) + ' \u20AC');
  setEl('ist_wa', fmtN(Math.round(ist_w_pa)) + ' \u20AC');

  // ─── IST Gewerbe ───
  var ist_sqm_te24 = getVal('ist_sqm_te24');
  var ist_te24_mon = getVal('ist_te24');
  setEl('ist_te24m', fmtN(Math.round(ist_te24_mon)) + ' \u20AC');
  setEl('ist_te24a', fmtN(Math.round(ist_te24_mon * 12)) + ' \u20AC');

  var ist_sqm_te5 = getVal('ist_sqm_te5'), ist_r_te5 = getVal('ist_te5');
  var ist_te5_mon = ist_sqm_te5 * ist_r_te5;
  setEl('ist_te5m', fmtN(Math.round(ist_te5_mon)) + ' \u20AC');
  setEl('ist_te5a', fmtN(Math.round(ist_te5_mon * 12)) + ' \u20AC');

  var ist_gar_n = getVal('ist_gar_n'), ist_gar_p = getVal('ist_gar_p');
  var ist_gar_mon = ist_gar_n * ist_gar_p;
  setEl('ist_garm', fmtN(Math.round(ist_gar_mon)) + ' \u20AC');
  setEl('ist_gara', fmtN(Math.round(ist_gar_mon * 12)) + ' \u20AC');

  var ist_sp_n = getVal('ist_sp_n'), ist_sp_p = getVal('ist_sp_p');
  var ist_sp_mon = ist_sp_n * ist_sp_p;
  setEl('ist_spm', fmtN(Math.round(ist_sp_mon)) + ' \u20AC');
  setEl('ist_spa', fmtN(Math.round(ist_sp_mon * 12)) + ' \u20AC');

  var gew_ist_mon = ist_te24_mon + ist_te5_mon + ist_gar_mon + ist_sp_mon;
  var gew_ist_pa = gew_ist_mon * 12;
  // Durchschnittsmiete Gewerbe: nur Flaechen mit m2 (TE2-4, TE5)
  var ist_gew_sqm_total = ist_sqm_te24 + ist_sqm_te5;
  var ist_gew_rent_sqm = ist_te24_mon + ist_te5_mon;
  var ist_gew_avg = ist_gew_sqm_total > 0 ? ist_gew_rent_sqm / ist_gew_sqm_total : 0;
  setEl('ist_gew_sqm', ist_gew_sqm_total.toFixed(2).replace('.', ',') + ' m\u00B2');
  setEl('ist_gew_avg', ist_gew_avg.toFixed(2).replace('.', ',') + ' \u20AC/m\u00B2');
  setEl('ist_gew_m', fmtN(Math.round(gew_ist_mon)) + ' \u20AC');
  setEl('ist_gew_a', fmtN(Math.round(gew_ist_pa)) + ' \u20AC');

  var ist_mon = ist_w_mon + gew_ist_mon, ist_pa = ist_mon * 12;
  var gap_pa = ziel_pa - ist_pa;
  setEl('inv_kp', fmt(kp));
  setEl('inv_ziel_pa', fmtN(Math.round(ziel_pa)) + ' \u20AC');
  setEl('inv_ziel_mon', fmtN(Math.round(ziel_mon)) + ' \u20AC');
  setEl('inv_ist_pa2', fmtN(Math.round(ist_pa)) + ' \u20AC');
  setEl('inv_gap_pa', (gap_pa >= 0 ? '+' : '') + fmtN(Math.round(gap_pa)) + ' \u20AC');
  var gapEl = $('inv_gap_pa');
  if (gapEl) gapEl.style.color = gap_pa >= 0 ? 'var(--grn)' : 'var(--red)';

  setEl('gap_ist_wm', fmtN(Math.round(ist_w_mon)) + ' \u20AC');
  setEl('gap_ist_wa', fmtN(Math.round(ist_w_pa)) + ' \u20AC');
  setEl('gap_ist_gm', fmtN(Math.round(gew_ist_mon)) + ' \u20AC');
  setEl('gap_ist_ga', fmtN(Math.round(gew_ist_pa)) + ' \u20AC');
  setEl('gap_ist_tm', fmtN(Math.round(ist_mon)) + ' \u20AC');
  setEl('gap_ist_ta', fmtN(Math.round(ist_pa)) + ' \u20AC');
  setEl('gap_ziel_m', fmtN(Math.round(ziel_mon)) + ' \u20AC');
  setEl('gap_ziel_a', fmtN(Math.round(ziel_pa)) + ' \u20AC');
  setEl('gap_delta_m', (gap_pa >= 0 ? '+' : '-') + fmtN(Math.round(Math.abs(gap_pa / 12))) + ' \u20AC');
  setEl('gap_delta_a', (gap_pa >= 0 ? '+' : '-') + fmtN(Math.round(Math.abs(gap_pa))) + ' \u20AC');
  setEl('gap_ist_faktor', ist_pa > 0 ? (kp / ist_pa).toFixed(1) + 'x' : '\u2014');

  // ─── VARIANTE A Wohnen ───
  var a_sqm_we1 = getVal('a_sqm_we1'), a_sqm_we2 = getVal('a_sqm_we2');
  var a_sqm_we3 = getVal('a_sqm_we3'), a_sqm_we4 = getVal('a_sqm_we4');
  var a_we1 = a_sqm_we1 * getVal('inp_a_we1'), a_we2 = a_sqm_we2 * getVal('inp_a_we2');
  var a_we3 = a_sqm_we3 * getVal('inp_a_we3'), a_we4 = a_sqm_we4 * getVal('inp_a_we4');
  var a_w_mon = a_we1 + a_we2 + a_we3 + a_we4, a_w_pa = a_w_mon * 12;
  var a_w_sqm_total = a_sqm_we1 + a_sqm_we2 + a_sqm_we3 + a_sqm_we4;
  var a_w_avg_val = a_w_sqm_total > 0 ? a_w_mon / a_w_sqm_total : 0;
  setEl('a_we1m', fmtN(Math.round(a_we1)) + ' \u20AC'); setEl('a_we1a', fmtN(Math.round(a_we1 * 12)) + ' \u20AC');
  setEl('a_we2m', fmtN(Math.round(a_we2)) + ' \u20AC'); setEl('a_we2a', fmtN(Math.round(a_we2 * 12)) + ' \u20AC');
  setEl('a_we3m', fmtN(Math.round(a_we3)) + ' \u20AC'); setEl('a_we3a', fmtN(Math.round(a_we3 * 12)) + ' \u20AC');
  setEl('a_we4m', fmtN(Math.round(a_we4)) + ' \u20AC'); setEl('a_we4a', fmtN(Math.round(a_we4 * 12)) + ' \u20AC');
  setEl('a_w_sqm', a_w_sqm_total.toFixed(2).replace('.', ',') + ' m\u00B2');
  setEl('a_w_avg', a_w_avg_val.toFixed(2).replace('.', ',') + ' \u20AC/m\u00B2');
  setEl('a_wm', fmtN(Math.round(a_w_mon)) + ' \u20AC'); setEl('a_wa', fmtN(Math.round(a_w_pa)) + ' \u20AC');

  // ─── VARIANTE A Gewerbe ───
  var a_sqm_te1 = getVal('a_sqm_te1'), a_sqm_te24 = getVal('a_sqm_te24');
  var a_sqm_te5a = getVal('a_sqm_te5'), a_sqm_te6 = getVal('a_sqm_te6');
  var a_te1 = a_sqm_te1 * getVal('inp_a_te1');
  var a_te24 = a_sqm_te24 * getVal('inp_a_te24');
  var a_te5 = a_sqm_te5a * getVal('inp_a_te5');
  var a_te6 = a_sqm_te6 * getVal('inp_a_te6');
  var a_sp_mon = getVal('inp_a_sp_n') * getVal('inp_a_sp_p');
  var a_g_mon = a_te1 + a_te24 + a_te5 + a_te6 + a_sp_mon, a_g_pa = a_g_mon * 12;
  var a_g_sqm_total = a_sqm_te1 + a_sqm_te24 + a_sqm_te5a + a_sqm_te6;
  var a_g_rent_sqm = a_te1 + a_te24 + a_te5 + a_te6;
  var a_g_avg_val = a_g_sqm_total > 0 ? a_g_rent_sqm / a_g_sqm_total : 0;
  setEl('a_te1m', fmtN(Math.round(a_te1)) + ' \u20AC'); setEl('a_te1a', fmtN(Math.round(a_te1 * 12)) + ' \u20AC');
  setEl('a_te24m', fmtN(Math.round(a_te24)) + ' \u20AC'); setEl('a_te24a', fmtN(Math.round(a_te24 * 12)) + ' \u20AC');
  setEl('a_te5m', fmtN(Math.round(a_te5)) + ' \u20AC'); setEl('a_te5a', fmtN(Math.round(a_te5 * 12)) + ' \u20AC');
  setEl('a_te6m', fmtN(Math.round(a_te6)) + ' \u20AC'); setEl('a_te6a', fmtN(Math.round(a_te6 * 12)) + ' \u20AC');
  setEl('a_spm', fmtN(Math.round(a_sp_mon)) + ' \u20AC'); setEl('a_spa', fmtN(Math.round(a_sp_mon * 12)) + ' \u20AC');
  setEl('a_g_sqm', a_g_sqm_total.toFixed(2).replace('.', ',') + ' m\u00B2');
  setEl('a_g_avg', a_g_avg_val.toFixed(2).replace('.', ',') + ' \u20AC/m\u00B2');
  setEl('a_gm', fmtN(Math.round(a_g_mon)) + ' \u20AC'); setEl('a_ga', fmtN(Math.round(a_g_pa)) + ' \u20AC');

  var a_tot_mon = a_w_mon + a_g_mon, a_tot_pa = a_tot_mon * 12;
  var a_delta = a_tot_pa - ziel_pa, a_fak = a_tot_pa > 0 ? kp / a_tot_pa : 999, a_ren = a_tot_pa / kp * 100;
  setEl('a_f_wm', fmtN(Math.round(a_w_mon)) + ' \u20AC'); setEl('a_f_wa', fmtN(Math.round(a_w_pa)) + ' \u20AC');
  setEl('a_f_gm', fmtN(Math.round(a_g_mon)) + ' \u20AC'); setEl('a_f_ga', fmtN(Math.round(a_g_pa)) + ' \u20AC');
  setEl('a_f_tm', fmtN(Math.round(a_tot_mon)) + ' \u20AC'); setEl('a_f_ta', fmtN(Math.round(a_tot_pa)) + ' \u20AC');
  setEl('a_f_zm', fmtN(Math.round(ziel_mon)) + ' \u20AC'); setEl('a_f_za', fmtN(Math.round(ziel_pa)) + ' \u20AC');
  setEl('a_f_dm', (a_delta >= 0 ? '+' : '') + fmtN(Math.round(a_delta / 12)) + ' \u20AC');
  setEl('a_f_da', (a_delta >= 0 ? '+' : '') + fmtN(Math.round(a_delta)) + ' \u20AC');
  var adr = $('a_f_dr');
  if (adr) adr.className = a_delta >= 0 ? 'hl-green' : 'hl-red';
  setEl('a_f_fak', a_fak.toFixed(1) + 'x');
  setEl('a_f_chk', a_fak <= faktor ? 'JA \u2014 Faktor ' + a_fak.toFixed(1) + 'x' : 'NEIN \u2014 Faktor ' + a_fak.toFixed(1) + 'x');
  var achk = $('a_f_chk');
  if (achk) achk.style.color = a_fak <= faktor ? 'var(--grn)' : 'var(--red)';
  setEl('a_f_ren', a_ren.toFixed(2) + ' %');

  // ─── VARIANTE B Wohnen ───
  var b_sqm_we1v = getVal('b_sqm_we1'), b_sqm_we2v = getVal('b_sqm_we2'), b_sqm_we3v = getVal('b_sqm_we3');
  var b_dg_sqm = getVal('inp_b_dg_sqm');
  var b_we1 = b_sqm_we1v * getVal('inp_b_we1'), b_we2 = b_sqm_we2v * getVal('inp_b_we2');
  var b_we3 = b_sqm_we3v * getVal('inp_b_we3'), b_dg = b_dg_sqm * getVal('inp_b_dg');
  var b_w_mon = b_we1 + b_we2 + b_we3 + b_dg, b_w_pa = b_w_mon * 12;
  var b_w_sqm_total = b_sqm_we1v + b_sqm_we2v + b_sqm_we3v + b_dg_sqm;
  var b_w_avg_val = b_w_sqm_total > 0 ? b_w_mon / b_w_sqm_total : 0;
  setEl('b_we1m', fmtN(Math.round(b_we1)) + ' \u20AC'); setEl('b_we1a', fmtN(Math.round(b_we1 * 12)) + ' \u20AC');
  setEl('b_we2m', fmtN(Math.round(b_we2)) + ' \u20AC'); setEl('b_we2a', fmtN(Math.round(b_we2 * 12)) + ' \u20AC');
  setEl('b_we3m', fmtN(Math.round(b_we3)) + ' \u20AC'); setEl('b_we3a', fmtN(Math.round(b_we3 * 12)) + ' \u20AC');
  setEl('b_dgm', fmtN(Math.round(b_dg)) + ' \u20AC'); setEl('b_dga', fmtN(Math.round(b_dg * 12)) + ' \u20AC');
  setEl('b_sqm_total', b_w_sqm_total.toFixed(2).replace('.', ',') + ' m\u00B2');
  setEl('b_w_avg', b_w_avg_val.toFixed(2).replace('.', ',') + ' \u20AC/m\u00B2');
  setEl('b_wm', fmtN(Math.round(b_w_mon)) + ' \u20AC'); setEl('b_wa', fmtN(Math.round(b_w_pa)) + ' \u20AC');

  // ─── VARIANTE B Gewerbe ───
  var b_sqm_te1 = getVal('b_sqm_te1'), b_sqm_te24 = getVal('b_sqm_te24');
  var b_sqm_te5b = getVal('b_sqm_te5'), b_sqm_te6v = getVal('b_sqm_te6');
  var b_te1 = b_sqm_te1 * getVal('inp_b_te1');
  var b_te24 = b_sqm_te24 * getVal('inp_b_te24');
  var b_te5 = b_sqm_te5b * getVal('inp_b_te5');
  var b_te6 = b_sqm_te6v * getVal('inp_b_te6');
  var b_sp_mon = getVal('inp_b_sp_n') * getVal('inp_b_sp_p');
  var b_g_mon = b_te1 + b_te24 + b_te5 + b_te6 + b_sp_mon, b_g_pa = b_g_mon * 12;
  var b_g_sqm_total = b_sqm_te1 + b_sqm_te24 + b_sqm_te5b + b_sqm_te6v;
  var b_g_rent_sqm = b_te1 + b_te24 + b_te5 + b_te6;
  var b_g_avg_val = b_g_sqm_total > 0 ? b_g_rent_sqm / b_g_sqm_total : 0;
  setEl('b_te1m', fmtN(Math.round(b_te1)) + ' \u20AC'); setEl('b_te1a', fmtN(Math.round(b_te1 * 12)) + ' \u20AC');
  setEl('b_te24m', fmtN(Math.round(b_te24)) + ' \u20AC'); setEl('b_te24a', fmtN(Math.round(b_te24 * 12)) + ' \u20AC');
  setEl('b_te5m', fmtN(Math.round(b_te5)) + ' \u20AC'); setEl('b_te5a', fmtN(Math.round(b_te5 * 12)) + ' \u20AC');
  setEl('b_te6m', fmtN(Math.round(b_te6)) + ' \u20AC'); setEl('b_te6a', fmtN(Math.round(b_te6 * 12)) + ' \u20AC');
  setEl('b_spm', fmtN(Math.round(b_sp_mon)) + ' \u20AC'); setEl('b_spa', fmtN(Math.round(b_sp_mon * 12)) + ' \u20AC');
  setEl('b_g_sqm', b_g_sqm_total.toFixed(2).replace('.', ',') + ' m\u00B2');
  setEl('b_g_avg', b_g_avg_val.toFixed(2).replace('.', ',') + ' \u20AC/m\u00B2');
  setEl('b_gm', fmtN(Math.round(b_g_mon)) + ' \u20AC'); setEl('b_ga', fmtN(Math.round(b_g_pa)) + ' \u20AC');

  var b_tot_mon = b_w_mon + b_g_mon, b_tot_pa = b_tot_mon * 12;
  var b_delta = b_tot_pa - ziel_pa, b_fak = b_tot_pa > 0 ? kp / b_tot_pa : 999, b_ren = b_tot_pa / kp * 100;
  setEl('b_f_wm', fmtN(Math.round(b_w_mon)) + ' \u20AC'); setEl('b_f_wa', fmtN(Math.round(b_w_pa)) + ' \u20AC');
  setEl('b_f_gm', fmtN(Math.round(b_g_mon)) + ' \u20AC'); setEl('b_f_ga', fmtN(Math.round(b_g_pa)) + ' \u20AC');
  setEl('b_f_tm', fmtN(Math.round(b_tot_mon)) + ' \u20AC'); setEl('b_f_ta', fmtN(Math.round(b_tot_pa)) + ' \u20AC');
  setEl('b_f_zm', fmtN(Math.round(ziel_mon)) + ' \u20AC'); setEl('b_f_za', fmtN(Math.round(ziel_pa)) + ' \u20AC');
  setEl('b_f_dm', (b_delta >= 0 ? '+' : '') + fmtN(Math.round(b_delta / 12)) + ' \u20AC');
  setEl('b_f_da', (b_delta >= 0 ? '+' : '') + fmtN(Math.round(b_delta)) + ' \u20AC');
  var bdr = $('b_f_dr');
  if (bdr) bdr.className = b_delta >= 0 ? 'hl-green' : 'hl-red';
  setEl('b_f_fak', b_fak.toFixed(1) + 'x');
  setEl('b_f_chk', b_fak <= faktor ? 'JA \u2014 Faktor ' + b_fak.toFixed(1) + 'x' : 'NEIN \u2014 Faktor ' + b_fak.toFixed(1) + 'x');
  var bchk = $('b_f_chk');
  if (bchk) bchk.style.color = b_fak <= faktor ? 'var(--grn)' : 'var(--red)';
  setEl('b_f_ren', b_ren.toFixed(2) + ' %');

  // VERGLEICH
  setEl('cmp_a_wm', fmtN(Math.round(a_w_mon)) + ' \u20AC');
  setEl('cmp_b_wm', fmtN(Math.round(b_w_mon)) + ' \u20AC');
  setEl('cmp_d_wm', '+' + fmtN(Math.round(b_w_mon - a_w_mon)) + ' \u20AC');
  setEl('cmp_a_ta', fmtN(Math.round(a_tot_pa)) + ' \u20AC');
  setEl('cmp_b_ta', fmtN(Math.round(b_tot_pa)) + ' \u20AC');
  setEl('cmp_d_ta', '+' + fmtN(Math.round(b_tot_pa - a_tot_pa)) + ' \u20AC');
  setEl('cmp_a_fak', a_fak.toFixed(1) + 'x'); setEl('cmp_b_fak', b_fak.toFixed(1) + 'x');
  setEl('cmp_d_fak', (b_fak - a_fak > 0 ? '+' : '') + (b_fak - a_fak).toFixed(1));
  setEl('cmp_a_ren', a_ren.toFixed(2) + ' %'); setEl('cmp_b_ren', b_ren.toFixed(2) + ' %');
  setEl('cmp_d_ren', '+' + (b_ren - a_ren).toFixed(2) + ' %');
  setEl('cmp_dg_plus', '+' + fmtN(Math.round(b_tot_pa - a_tot_pa)) + ' \u20AC/a durch Wohn-DG-Ausbau');

  // FINANZIERUNG — Mittelverwendung (dynamisch vom Kalkulationsboard)
  setEl('inv_kp2', fmt(kp));
  setEl('inv_grest', fmt(grest));
  setEl('inv_notar', fmt(notar));
  setEl('inv_mv_gew', fmt(RENOV_GEW));
  setEl('inv_mv_wohn', fmt(INVEST_WOHN));
  setEl('inv_total_a', fmt(total_a));
  setEl('inv_fk_a', fmt(fk_a));

  // Investitionskosten-Uebersicht (kauf_weg Seite) — dynamisch vom Board
  var gewListEl = $('inv_gew_list');
  if (gewListEl) {
    var gh = '<table style="font-size:12px">';
    for (var gi = 0; gi < renovGewItems.length; gi++) {
      gh += '<tr><td>' + renovGewItems[gi].name + '</td><td style="text-align:right">' + fmtN(renovGewItems[gi].preis) + ' \u20AC</td></tr>';
    }
    gh += '</table>';
    gewListEl.innerHTML = gh;
  }
  setEl('inv_sum_gew', fmt(RENOV_GEW));
  var wohnListEl = $('inv_wohn_list');
  if (wohnListEl) {
    var wh = '<table style="font-size:12px">';
    for (var wi = 0; wi < renovWohnItems.length; wi++) {
      wh += '<tr><td>' + renovWohnItems[wi].name + '</td><td style="text-align:right">' + fmtN(renovWohnItems[wi].preis) + ' \u20AC</td></tr>';
    }
    wh += '</table>';
    wohnListEl.innerHTML = wh;
  }
  setEl('inv_sum_wohn', fmt(INVEST_WOHN));

  // CASHFLOW
  var noi_a = a_tot_pa - bk_pa, zins_a = fk_a * zinssatz, cf_a = noi_a - zins_a;
  setEl('cf_a_soll', fmtN(Math.round(a_tot_pa)) + ' \u20AC/a');
  setEl('cf_a_noi', fmt(noi_a)); setEl('cf_a_zins', '-' + fmt(zins_a));
  setEl('cf_a_cf', fmt(cf_a));
  var cfa = $('cf_a_cf');
  if (cfa) cfa.style.color = cf_a >= 0 ? 'var(--grn)' : 'var(--red)';

  var noi_b = b_tot_pa - bk_pa, zins_b = fk_b * zinssatz, cf_b = noi_b - zins_b;
  setEl('cf_b_soll', fmtN(Math.round(b_tot_pa)) + ' \u20AC/a');
  setEl('cf_b_bk', '-' + fmtN(Math.round(bk_pa)) + ' \u20AC');
  setEl('cf_b_zins_pct', (zinssatz * 100).toFixed(1).replace('.', ','));
  setEl('cf_b_noi', fmt(noi_b)); setEl('cf_b_zins', '-' + fmt(zins_b));
  setEl('cf_b_cf', fmt(cf_b));
  var cfb = $('cf_b_cf');
  if (cfb) cfb.style.color = cf_b >= 0 ? 'var(--grn)' : 'var(--red)';
}

// ═══════════════════════════════════
// KP FLAECHENDETAIL
// ═══════════════════════════════════
function calcKPDetail() {
  // ─── Wohnen ───
  var wIds = ['we1','we2','we3','we4'];
  var w_sqm = 0, w_ang = 0, w_kp = 0;
  for (var i = 0; i < wIds.length; i++) {
    var id = wIds[i];
    var sqm = getVal('kpd_sqm_' + id);
    var ang = getVal('kpd_ang_' + id);
    var kp = getVal('kpd_kp_' + id);
    w_sqm += sqm; w_ang += ang; w_kp += kp;
  }

  // ─── Gewerbe ───
  var gIds = ['te1','te2','te3','te4','te5'];
  var g_sqm = 0, g_ang = 0, g_kp = 0;
  for (var i = 0; i < gIds.length; i++) {
    var id = gIds[i];
    var sqm = getVal('kpd_sqm_' + id);
    var ang = getVal('kpd_ang_' + id);
    var kp = getVal('kpd_kp_' + id);
    g_sqm += sqm; g_ang += ang; g_kp += kp;
  }

  // ─── Garagen ───
  var garIds = ['te6','te7','te8','te9','te10','te11','te12','te13','te14'];
  var gar_sqm = 0, gar_kp = 0;
  for (var i = 0; i < garIds.length; i++) {
    var id = garIds[i];
    var sqm = getVal('kpd_sqm_' + id);
    var kp = getVal('kpd_kp_' + id);
    gar_sqm += sqm; gar_kp += kp;
  }

  // ─── Keller (SE) ───
  var seIds = ['se1','se2','se3','se4','se5'];
  var se_kp = 0;
  for (var i = 0; i < seIds.length; i++) {
    se_kp += getVal('kpd_kp_' + seIds[i]);
  }

  // ─── Gemeinschaftseigentum + Potential ───
  var ge_kp = getVal('kpd_kp_ge');
  var p_sqm = getVal('kpd_sqm_we5');
  var p_kp = getVal('kpd_kp_we5');

  // ─── GESAMT ───
  var total_kp = w_kp + g_kp + gar_kp + se_kp + ge_kp + p_kp;

  // Helper: safe division
  function sd(a, b) { return b > 0 ? a / b : 0; }
  function pct(v) { return total_kp > 0 ? (v / total_kp * 100).toFixed(1).replace('.', ',') + ' %' : '\u2014'; }
  function eur(v) { return fmtN(Math.round(v)) + ' \u20AC'; }
  function sqmF(v) { return v > 0 ? fmtN(Math.round(sd(v, 1) * 100) / 100).replace(/(\d)$/, '') : '\u2014'; }

  // ─── Wohnen per-row ───
  for (var i = 0; i < wIds.length; i++) {
    var id = wIds[i];
    var sqm = getVal('kpd_sqm_' + id), ang = getVal('kpd_ang_' + id), kp = getVal('kpd_kp_' + id);
    setEl('kpd_sqmP_' + id, sqm > 0 ? fmtN(Math.round(kp / sqm)) + ' \u20AC' : '\u2014');
    setEl('kpd_angP_' + id, ang > 0 ? fmtN(Math.round(kp / ang)) + ' \u20AC' : '\u2014');
    setEl('kpd_pct_' + id, pct(kp));
  }
  // Wohnen sums
  setEl('kpd_sqm_w_sum', w_sqm.toFixed(2).replace('.', ','));
  setEl('kpd_ang_w_sum', w_ang.toFixed(2).replace('.', ','));
  setEl('kpd_kp_w_sum', eur(w_kp));
  setEl('kpd_sqmP_w_avg', w_sqm > 0 ? fmtN(Math.round(w_kp / w_sqm)) + ' \u20AC' : '\u2014');
  setEl('kpd_angP_w_avg', w_ang > 0 ? fmtN(Math.round(w_kp / w_ang)) + ' \u20AC' : '\u2014');
  setEl('kpd_pct_w_sum', pct(w_kp));

  // ─── Gewerbe per-row ───
  for (var i = 0; i < gIds.length; i++) {
    var id = gIds[i];
    var sqm = getVal('kpd_sqm_' + id), ang = getVal('kpd_ang_' + id), kp = getVal('kpd_kp_' + id);
    setEl('kpd_sqmP_' + id, sqm > 0 ? fmtN(Math.round(kp / sqm)) + ' \u20AC' : '\u2014');
    setEl('kpd_angP_' + id, ang > 0 ? fmtN(Math.round(kp / ang)) + ' \u20AC' : '\u2014');
    setEl('kpd_pct_' + id, pct(kp));
  }
  // Gewerbe sums
  setEl('kpd_sqm_g_sum', g_sqm.toFixed(2).replace('.', ','));
  setEl('kpd_ang_g_sum', g_ang.toFixed(2).replace('.', ','));
  setEl('kpd_kp_g_sum', eur(g_kp));
  setEl('kpd_sqmP_g_avg', g_sqm > 0 ? fmtN(Math.round(g_kp / g_sqm)) + ' \u20AC' : '\u2014');
  setEl('kpd_angP_g_avg', g_ang > 0 ? fmtN(Math.round(g_kp / g_ang)) + ' \u20AC' : '\u2014');
  setEl('kpd_pct_g_sum', pct(g_kp));

  // ─── Garagen per-row ───
  for (var i = 0; i < garIds.length; i++) {
    var id = garIds[i];
    var sqm = getVal('kpd_sqm_' + id), kp = getVal('kpd_kp_' + id);
    setEl('kpd_sqmP_' + id, sqm > 0 ? fmtN(Math.round(kp / sqm)) + ' \u20AC' : '\u2014');
    setEl('kpd_pct_' + id, pct(kp));
  }
  // Garagen sums
  setEl('kpd_sqm_gar_sum', gar_sqm.toFixed(2).replace('.', ','));
  setEl('kpd_kp_gar_sum', eur(gar_kp));
  setEl('kpd_sqmP_gar_avg', gar_sqm > 0 ? fmtN(Math.round(gar_kp / gar_sqm)) + ' \u20AC' : '\u2014');
  setEl('kpd_pct_gar_sum', pct(gar_kp));

  // ─── Keller per-row ───
  for (var i = 0; i < seIds.length; i++) {
    var kp = getVal('kpd_kp_' + seIds[i]);
    setEl('kpd_pct_' + seIds[i], pct(kp));
  }
  setEl('kpd_kp_se_sum', eur(se_kp));
  setEl('kpd_pct_se_sum', pct(se_kp));

  // ─── GE + Potential ───
  setEl('kpd_pct_ge', pct(ge_kp));
  setEl('kpd_sqmP_we5', p_sqm > 0 ? fmtN(Math.round(p_kp / p_sqm)) + ' \u20AC' : '\u2014');
  setEl('kpd_pct_we5', pct(p_kp));

  // ─── Gesamtuebersicht ───
  var total_sqm = w_sqm + g_sqm + gar_sqm + 27.75 + 91.69 + p_sqm;
  var total_ang = w_ang + g_ang;

  setEl('kpd_ov_w_sqm', w_sqm.toFixed(2).replace('.', ','));
  setEl('kpd_ov_w_ang', w_ang.toFixed(2).replace('.', ','));
  setEl('kpd_ov_w_kp', eur(w_kp));
  setEl('kpd_ov_w_sqmP', w_sqm > 0 ? fmtN(Math.round(w_kp / w_sqm)) + ' \u20AC' : '\u2014');
  setEl('kpd_ov_w_pct', pct(w_kp));

  setEl('kpd_ov_g_sqm', g_sqm.toFixed(2).replace('.', ','));
  setEl('kpd_ov_g_ang', g_ang.toFixed(2).replace('.', ','));
  setEl('kpd_ov_g_kp', eur(g_kp));
  setEl('kpd_ov_g_sqmP', g_sqm > 0 ? fmtN(Math.round(g_kp / g_sqm)) + ' \u20AC' : '\u2014');
  setEl('kpd_ov_g_pct', pct(g_kp));

  setEl('kpd_ov_gar_sqm', gar_sqm.toFixed(2).replace('.', ','));
  setEl('kpd_ov_gar_kp', eur(gar_kp));
  setEl('kpd_ov_gar_sqmP', gar_sqm > 0 ? fmtN(Math.round(gar_kp / gar_sqm)) + ' \u20AC' : '\u2014');
  setEl('kpd_ov_gar_pct', pct(gar_kp));

  setEl('kpd_ov_se_kp', eur(se_kp));
  setEl('kpd_ov_se_pct', pct(se_kp));

  setEl('kpd_ov_ge_kp', eur(ge_kp));
  setEl('kpd_ov_ge_pct', pct(ge_kp));

  setEl('kpd_ov_p_sqm', p_sqm.toFixed(2).replace('.', ','));
  setEl('kpd_ov_p_kp', eur(p_kp));
  setEl('kpd_ov_p_sqmP', p_sqm > 0 ? fmtN(Math.round(p_kp / p_sqm)) + ' \u20AC' : '\u2014');
  setEl('kpd_ov_p_pct', pct(p_kp));

  setEl('kpd_ov_total_sqm', total_sqm.toFixed(2).replace('.', ','));
  setEl('kpd_ov_total_ang', total_ang.toFixed(2).replace('.', ','));
  setEl('kpd_ov_total_kp', eur(total_kp));
  setEl('kpd_ov_total_sqmP', total_sqm > 0 ? fmtN(Math.round(total_kp / total_sqm)) + ' \u20AC' : '\u2014');
}

// ═══════════════════════════════════
// VARIANTE MIETE
// ═══════════════════════════════════
function calcVM() {
  var flaeche = 1200 / 2.78;
  setEl('vm_flaeche', fmtN(Math.round(flaeche * 10) / 10) + ' m\u00B2');
  setEl('vm_ist_sqm', '2,78 \u20AC/m\u00B2');
  var maiSqm = 1375.20 / flaeche;
  setEl('vm_mai_sqm', maiSqm.toFixed(2).replace('.', ',') + ' \u20AC/m\u00B2');
  setEl('vm_mai_sqm2', maiSqm.toFixed(2).replace('.', ','));

  var istPA = 1200 * 12;
  var markt15mon = flaeche * 15;
  var markt15pa = markt15mon * 12;
  setEl('vm_diff1', '-' + fmtN(Math.round(markt15pa - istPA)) + ' \u20AC/a');
  setEl('vm_diff2', '-' + fmtN(Math.round(markt15pa - 16502)) + ' \u20AC/a');

  var rates = [5, 8, 10, 12.10, 15];
  var ids = ['5', '8', '10', '12', '15'];
  for (var i = 0; i < rates.length; i++) {
    var mon = flaeche * rates[i];
    var pa = mon * 12;
    var diff = pa - istPA;
    setEl('vm_m' + ids[i] + 'm', fmtN(Math.round(mon)) + ' \u20AC');
    setEl('vm_m' + ids[i] + 'a', fmtN(Math.round(pa)) + ' \u20AC');
    setEl('vm_d' + ids[i], '+' + fmtN(Math.round(diff)) + ' \u20AC/a');
  }

  setEl('vm_markt15a', fmtN(Math.round(markt15pa)) + ' \u20AC');
  var ersparnis = markt15pa - istPA;
  setEl('vm_ersparnis', fmtN(Math.round(ersparnis)) + ' \u20AC/a');
  setEl('vm_ersparnis10', fmtN(Math.round(ersparnis * 10)) + ' \u20AC');
  setEl('vm_ersparnis30', fmtN(Math.round(ersparnis * 30)) + ' \u20AC');
}

// ═══════════════════════════════════
// FINANZIERUNGSRECHNER
// ═══════════════════════════════════
function calcFin() {
  // ─── Mieteinnahmen nach Einheiten ───
  // Flaechen aus Inputs lesen
  var sqm_we1 = getVal('fu_sqm_we1'), sqm_we2 = getVal('fu_sqm_we2');
  var sqm_we3 = getVal('fu_sqm_we3'), sqm_we4 = getVal('fu_sqm_we4');
  var sqm_te1 = getVal('fu_sqm_te1'), sqm_te24 = getVal('fu_sqm_te24');
  var sqm_te5 = getVal('fu_sqm_te5'), sqm_sdg = getVal('fu_sqm_sdg');
  var sqm_te6 = getVal('fu_sqm_te6');

  // Wohnen (€/m² → Miete)
  var we1_m = sqm_we1 * getVal('fu_we1');
  var we2_m = sqm_we2 * getVal('fu_we2');
  var we3_m = sqm_we3 * getVal('fu_we3');
  var we4_m = sqm_we4 * getVal('fu_we4');
  var sumW_m = we1_m + we2_m + we3_m + we4_m;
  var sumW_a = sumW_m * 12;
  var sqmW = sqm_we1 + sqm_we2 + sqm_we3 + sqm_we4;

  setEl('fu_we1_m', fmtN(Math.round(we1_m)) + ' \u20AC'); setEl('fu_we1_a', fmtN(Math.round(we1_m * 12)) + ' \u20AC');
  setEl('fu_we2_m', fmtN(Math.round(we2_m)) + ' \u20AC'); setEl('fu_we2_a', fmtN(Math.round(we2_m * 12)) + ' \u20AC');
  setEl('fu_we3_m', fmtN(Math.round(we3_m)) + ' \u20AC'); setEl('fu_we3_a', fmtN(Math.round(we3_m * 12)) + ' \u20AC');
  setEl('fu_we4_m', fmtN(Math.round(we4_m)) + ' \u20AC'); setEl('fu_we4_a', fmtN(Math.round(we4_m * 12)) + ' \u20AC');
  setEl('fu_sum_w_m', fmtN(Math.round(sumW_m)) + ' \u20AC'); setEl('fu_sum_w_a', fmtN(Math.round(sumW_a)) + ' \u20AC');
  setEl('fu_sqm_w', sqmW.toFixed(2).replace('.', ',') + ' m\u00B2');

  // SOLL Wohnen
  var swe1_m = sqm_we1 * getVal('fs_we1');
  var swe2_m = sqm_we2 * getVal('fs_we2');
  var swe3_m = sqm_we3 * getVal('fs_we3');
  var swe4_m = sqm_we4 * getVal('fs_we4');
  var ssumW_m = swe1_m + swe2_m + swe3_m + swe4_m;
  var ssumW_a = ssumW_m * 12;
  setEl('fs_we1_m', fmtN(Math.round(swe1_m)) + ' \u20AC'); setEl('fs_we1_a', fmtN(Math.round(swe1_m * 12)) + ' \u20AC');
  setEl('fs_we2_m', fmtN(Math.round(swe2_m)) + ' \u20AC'); setEl('fs_we2_a', fmtN(Math.round(swe2_m * 12)) + ' \u20AC');
  setEl('fs_we3_m', fmtN(Math.round(swe3_m)) + ' \u20AC'); setEl('fs_we3_a', fmtN(Math.round(swe3_m * 12)) + ' \u20AC');
  setEl('fs_we4_m', fmtN(Math.round(swe4_m)) + ' \u20AC'); setEl('fs_we4_a', fmtN(Math.round(swe4_m * 12)) + ' \u20AC');
  setEl('fs_sum_w_m', fmtN(Math.round(ssumW_m)) + ' \u20AC'); setEl('fs_sum_w_a', fmtN(Math.round(ssumW_a)) + ' \u20AC');

  // Gewerbe (€/m² oder Festbetrag)
  var te1_m = sqm_te1 * getVal('fu_te1');
  var te24_m = sqm_te24 * getVal('fu_te24');  // €/m²
  var te5_m = getVal('fu_te5');    // Festbetrag
  var sdg_m = sqm_sdg * getVal('fu_sdg');
  var te6_m = sqm_te6 * getVal('fu_te6');    // €/m²
  var sp_m = getVal('fu_sp');      // Festbetrag
  var sumG_m = te1_m + te24_m + te5_m + sdg_m + te6_m + sp_m;
  var sumG_a = sumG_m * 12;
  var sqmG = sqm_te1 + sqm_te24 + sqm_te5 + sqm_sdg + sqm_te6;

  setEl('fu_te1_m', fmtN(Math.round(te1_m)) + ' \u20AC'); setEl('fu_te1_a', fmtN(Math.round(te1_m * 12)) + ' \u20AC');
  setEl('fu_te24_m', fmtN(Math.round(te24_m)) + ' \u20AC'); setEl('fu_te24_a', fmtN(Math.round(te24_m * 12)) + ' \u20AC');
  setEl('fu_te5_m', fmtN(Math.round(te5_m)) + ' \u20AC'); setEl('fu_te5_a', fmtN(Math.round(te5_m * 12)) + ' \u20AC');
  setEl('fu_sdg_m', fmtN(Math.round(sdg_m)) + ' \u20AC'); setEl('fu_sdg_a', fmtN(Math.round(sdg_m * 12)) + ' \u20AC');
  setEl('fu_te6_m', fmtN(Math.round(te6_m)) + ' \u20AC'); setEl('fu_te6_a', fmtN(Math.round(te6_m * 12)) + ' \u20AC');
  setEl('fu_sp_m', fmtN(Math.round(sp_m)) + ' \u20AC'); setEl('fu_sp_a', fmtN(Math.round(sp_m * 12)) + ' \u20AC');
  setEl('fu_sum_g_m', fmtN(Math.round(sumG_m)) + ' \u20AC'); setEl('fu_sum_g_a', fmtN(Math.round(sumG_a)) + ' \u20AC');
  setEl('fu_sqm_g', sqmG.toFixed(2).replace('.', ',') + ' m\u00B2');

  // SOLL Gewerbe
  var ste1_m = sqm_te1 * getVal('fs_te1');
  var ste24_m = sqm_te24 * getVal('fs_te24');  // €/m²
  var ste5_m = getVal('fs_te5');    // Festbetrag
  var ssdg_m = sqm_sdg * getVal('fs_sdg');
  var ste6_m = sqm_te6 * getVal('fs_te6');    // €/m²
  var ssp_m = getVal('fs_sp');      // Festbetrag
  var ssumG_m = ste1_m + ste24_m + ste5_m + ssdg_m + ste6_m + ssp_m;
  var ssumG_a = ssumG_m * 12;
  setEl('fs_te1_m', fmtN(Math.round(ste1_m)) + ' \u20AC'); setEl('fs_te1_a', fmtN(Math.round(ste1_m * 12)) + ' \u20AC');
  setEl('fs_te24_m', fmtN(Math.round(ste24_m)) + ' \u20AC'); setEl('fs_te24_a', fmtN(Math.round(ste24_m * 12)) + ' \u20AC');
  setEl('fs_te5_m', fmtN(Math.round(ste5_m)) + ' \u20AC'); setEl('fs_te5_a', fmtN(Math.round(ste5_m * 12)) + ' \u20AC');
  setEl('fs_sdg_m', fmtN(Math.round(ssdg_m)) + ' \u20AC'); setEl('fs_sdg_a', fmtN(Math.round(ssdg_m * 12)) + ' \u20AC');
  setEl('fs_te6_m', fmtN(Math.round(ste6_m)) + ' \u20AC'); setEl('fs_te6_a', fmtN(Math.round(ste6_m * 12)) + ' \u20AC');
  setEl('fs_sp_m', fmtN(Math.round(ssp_m)) + ' \u20AC'); setEl('fs_sp_a', fmtN(Math.round(ssp_m * 12)) + ' \u20AC');
  setEl('fs_sum_g_m', fmtN(Math.round(ssumG_m)) + ' \u20AC'); setEl('fs_sum_g_a', fmtN(Math.round(ssumG_a)) + ' \u20AC');

  // Gesamtflaeche
  setEl('fu_sqm_total', (sqmW + sqmG).toFixed(2).replace('.', ',') + ' m\u00B2');

  // Gesamt IST
  var mieteMon = sumW_m + sumG_m;
  var mietePA = mieteMon * 12;
  setEl('fu_total_m', fmtN(Math.round(mieteMon)) + ' \u20AC');
  setEl('fu_total_a', fmtN(Math.round(mietePA)) + ' \u20AC');

  // Gesamt SOLL
  var sollMon = ssumW_m + ssumG_m;
  var sollPA = sollMon * 12;
  setEl('fs_total_m', fmtN(Math.round(sollMon)) + ' \u20AC');
  setEl('fs_total_a', fmtN(Math.round(sollPA)) + ' \u20AC');

  // Betriebskosten: umlagefaehig vs. nicht umlagefaehig
  var bkUmlage = getVal('fin_bk_umlage');
  var bkNicht = getVal('fin_bk_nicht');
  var bkTotal = bkUmlage + bkNicht;
  setEl('fu_bk_umlage_display', '-' + fmtN(Math.round(bkUmlage)) + ' \u20AC');
  setEl('fu_bk_nicht_display', '-' + fmtN(Math.round(bkNicht)) + ' \u20AC');
  setEl('fu_bk_total', '-' + fmtN(Math.round(bkTotal)) + ' \u20AC');
  // Fuer Cashflow: Nur nicht-umlagefaehige BK belasten den Eigentuemer
  var bk = bkNicht;

  // Collect all active loans
  var loans = [];
  var maxBind = 0;
  for (var i = 1; i <= 5; i++) {
    var cb = $('loan_on_' + i);
    var row = $('loan_row_' + i);
    var active = cb && cb.checked;
    if (row) {
      row.style.opacity = active ? '1' : '0.4';
    }
    var betrag = getVal('loan_betrag_' + i);
    var zins = getVal('loan_zins_' + i) / 100;
    var tilg = getVal('loan_tilg_' + i) / 100;
    var bind = parseInt($('loan_bind_' + i) ? $('loan_bind_' + i).value : '10') || 10;
    var sonder = getVal('loan_sonder_' + i);
    var name = $('loan_name_' + i) ? $('loan_name_' + i).value : 'Darlehen ' + i;

    if (active && betrag > 0) {
      var ann = zins + tilg;
      var rateA = betrag * ann;
      var rateM = rateA / 12;
      loans.push({idx: i, name: name, betrag: betrag, zins: zins, tilg: tilg, bind: bind, sonder: sonder, ann: ann, rateA: rateA, rateM: rateM});
      if (bind > maxBind) maxBind = bind;
      setEl('loan_rate_m_' + i, fmtN(Math.round(rateM)) + ' \u20AC');
      setEl('loan_rate_a_' + i, fmtN(Math.round(rateA)) + ' \u20AC');
    } else {
      setEl('loan_rate_m_' + i, active && betrag === 0 ? '0 \u20AC' : '\u2014');
      setEl('loan_rate_a_' + i, active && betrag === 0 ? '0 \u20AC' : '\u2014');
    }
  }

  // Totals
  var sumBetrag = 0, sumRateA = 0, sumRateM = 0, sumZinsJ1 = 0, sumTilgJ1 = 0;
  var weightedZins = 0;
  loans.forEach(function (l) {
    sumBetrag += l.betrag;
    sumRateA += l.rateA;
    sumRateM += l.rateM;
    sumZinsJ1 += l.betrag * l.zins;
    sumTilgJ1 += l.rateA - l.betrag * l.zins;
    weightedZins += l.betrag * l.zins;
  });
  var avgZins = sumBetrag > 0 ? (weightedZins / sumBetrag) * 100 : 0;
  var avgAnn = sumBetrag > 0 ? (sumRateA / sumBetrag) * 100 : 0;

  // Footer sums
  setEl('loan_sum_betrag', fmtN(Math.round(sumBetrag)) + ' \u20AC');
  setEl('loan_avg_zins', avgZins.toFixed(2) + ' %');
  setEl('loan_sum_rate_m', fmtN(Math.round(sumRateM)) + ' \u20AC');
  setEl('loan_sum_rate_a', fmtN(Math.round(sumRateA)) + ' \u20AC');

  // KPIs
  setEl('fin_rate', fmt(sumRateM) + '/Mon');
  setEl('fin_rate_a', fmt(sumRateA));
  setEl('fin_sum_darlehen', fmt(sumBetrag));
  setEl('fin_zins_a', fmt(sumZinsJ1));
  setEl('fin_tilg_a', fmt(sumTilgJ1));
  setEl('fin_avg_zins', avgZins.toFixed(2) + ' %');

  // Cashflow
  var noi = mietePA - bk; // bk = nur nicht-umlagefaehig
  setEl('fin_cf_miete', '+' + fmtN(Math.round(mietePA)) + ' \u20AC');
  setEl('fin_cf_bk_umlage', fmtN(Math.round(bkUmlage)) + ' \u20AC (Durchlaufposten)');
  setEl('fin_cf_bk_nicht', '-' + fmtN(Math.round(bk)) + ' \u20AC');
  setEl('fin_cf_noi', fmtN(Math.round(noi)) + ' \u20AC');
  var noiEl = $('fin_cf_noi');
  if (noiEl) noiEl.style.color = noi >= 0 ? 'var(--grn)' : 'var(--red)';
  setEl('fin_cf_rate', '-' + fmtN(Math.round(sumRateA)) + ' \u20AC');
  var cfNetto = noi - sumRateA;
  setEl('fin_cf_netto', (cfNetto >= 0 ? '+' : '') + fmtN(Math.round(cfNetto)) + ' \u20AC');
  var cfn = $('fin_cf_netto');
  if (cfn) cfn.style.color = cfNetto >= 0 ? 'var(--grn)' : 'var(--red)';
  setEl('fin_cf_mon', (cfNetto >= 0 ? '+' : '') + fmtN(Math.round(cfNetto / 12)) + ' \u20AC');
  var cfm = $('fin_cf_mon');
  if (cfm) cfm.style.color = cfNetto >= 0 ? 'var(--grn)' : 'var(--red)';

  // Kennzahlen
  setEl('fin_annuitaet', avgAnn.toFixed(2) + ' %');
  var dscr = sumRateA > 0 ? noi / sumRateA : 0;
  setEl('fin_dscr', dscr.toFixed(2) + 'x');
  var dscEl = $('fin_dscr');
  if (dscEl) dscEl.style.color = dscr >= 1.2 ? 'var(--grn)' : dscr >= 1.0 ? 'var(--org)' : 'var(--red)';
  var kaufpreis = getVal('inp_kp'); if (kaufpreis <= 0) kaufpreis = 2200000;
  var ltv = kaufpreis > 0 ? (sumBetrag / kaufpreis) * 100 : 0;
  setEl('fin_ltv', ltv.toFixed(1) + ' % (KP ' + fmtN(kaufpreis) + ' \u20AC)');
  var yod = sumBetrag > 0 ? (noi / sumBetrag) * 100 : 0;
  setEl('fin_yod', yod.toFixed(2) + ' %');
  var ek = EK_TOTAL;
  var ekRendite = ek > 0 ? (cfNetto / ek) * 100 : 0;
  setEl('fin_ek_rendite', ekRendite.toFixed(1) + ' % (EK ' + fmtN(ek) + ' \u20AC)');
  var ekrEl = $('fin_ek_rendite');
  if (ekrEl) ekrEl.style.color = ekRendite >= 0 ? 'var(--grn)' : 'var(--red)';

  // Per-loan detail cards
  var detailHtml = '';
  loans.forEach(function (l) {
    var rest = l.betrag, zG = 0, tG = 0;
    for (var j = 1; j <= l.bind; j++) {
      var zJ = rest * l.zins;
      var tJ = l.rateA - zJ;
      var sJ = Math.min(l.sonder, rest - tJ);
      if (sJ < 0) sJ = 0;
      var rE = rest - tJ - sJ;
      if (rE < 0) { tJ = rest; rE = 0; sJ = 0; }
      zG += zJ; tG += tJ + sJ;
      rest = rE;
      if (rest <= 0) break;
    }
    var tQuote = l.betrag > 0 ? (tG / l.betrag * 100).toFixed(1) : '0';
    var colors = ['var(--acc)', 'var(--grn)', 'var(--org)', 'var(--pur)', 'var(--cyn)'];
    var col = colors[(l.idx - 1) % 5];
    detailHtml += '<div class="stat-box" style="border-left:3px solid ' + col + '"><h3>' + l.name + '</h3><table>' +
      '<tr><td>Darlehensbetrag</td><td>' + fmt(l.betrag) + '</td></tr>' +
      '<tr><td>Zinssatz / Tilgung</td><td>' + (l.zins * 100).toFixed(2) + ' % / ' + (l.tilg * 100).toFixed(2) + ' %</td></tr>' +
      '<tr><td>Monatsrate</td><td>' + fmt(l.rateM) + '</td></tr>' +
      '<tr><td>Jahresrate</td><td>' + fmt(l.rateA) + '</td></tr>' +
      '<tr><td>Zinsen Jahr 1</td><td style="color:var(--red)">' + fmt(l.betrag * l.zins) + '</td></tr>' +
      '<tr><td>Restschuld n. ' + l.bind + ' J.</td><td style="font-weight:700">' + fmt(rest) + '</td></tr>' +
      '<tr><td>Getilgt in Bindung</td><td style="color:var(--grn)">' + fmt(tG) + ' (' + tQuote + ' %)</td></tr>' +
      '<tr><td>Zinskosten gesamt</td><td>' + fmt(zG) + '</td></tr>' +
      '</table></div>';
  });
  var detailEl = $('fin_loan_details');
  if (detailEl) detailEl.innerHTML = detailHtml;

  // Combined Tilgungsplan (aggregate all loans per year)
  if (maxBind === 0) maxBind = 10;
  var loanStates = loans.map(function (l) { return {rest: l.betrag, zins: l.zins, rateA: l.rateA, sonder: l.sonder, bind: l.bind, done: false}; });
  var tpRows = '';
  for (var y = 1; y <= maxBind; y++) {
    var yRest0 = 0, yZins = 0, yTilg = 0, ySonder = 0, yRate = 0, yRest1 = 0;
    loanStates.forEach(function (s) {
      if (s.done || s.rest <= 0) { yRest0 += 0; return; }
      yRest0 += s.rest;
      if (y > s.bind) { yRest1 += s.rest; return; }
      var zJ = s.rest * s.zins;
      var tJ = s.rateA - zJ;
      var sJ = Math.min(s.sonder, s.rest - tJ);
      if (sJ < 0) sJ = 0;
      var rE = s.rest - tJ - sJ;
      if (rE < 0) { tJ = s.rest; rE = 0; sJ = 0; }
      yZins += zJ;
      yTilg += tJ;
      ySonder += sJ;
      yRate += s.rateA + sJ;
      yRest1 += rE;
      s.rest = rE;
      if (s.rest <= 0) s.done = true;
    });
    if (yRest0 <= 0) break;
    tpRows += '<tr><td>' + y + '</td><td>' + fmt(yRest0) + '</td><td>' + fmt(yZins) + '</td><td>' + fmt(yTilg) + '</td><td>' + (ySonder > 0 ? fmt(ySonder) : '\u2014') + '</td><td>' + fmt(yRate) + '</td><td>' + fmt(yRest1) + '</td></tr>';
  }
  var tbody = $('fin_tbody');
  if (tbody) tbody.innerHTML = tpRows;
}

// ═══════════════════════════════════
// TRELLO BOARD
// ═══════════════════════════════════
var board = {
  "Backlog / Ideen": [{ n: "Milieuschutz Vorkaufsrecht", d: "Positive Auskunft benoetig" }, { n: "Wirtschaftlichkeits-DD", d: "Renditeberechnung je Variante" }, { n: "AfA Aufteilung optimieren", d: "Boden vs Gebaeude" }],
  "Finanzierung": [{ n: "BaufiTeam Liebhardt", d: "Hauptansprechpartner", lb: ["In Bearbeitung"] }, { n: "IBB Kontakt", d: "Frau Kati Mueller", lb: ["In Bearbeitung"] }, { n: "Interhyp anfragen", d: "" }, { n: "Dr. Klein anfragen", d: "" }, { n: "Sparkasse", d: "3,5% Angebot pruefen" }, { n: "KfW Foerderung", d: "Energetische Sanierung" }],
  "WEG-Teilung": [{ n: "Aufteilungsplan erstellen", d: "Architekt beauftragen", lb: ["Dringend"] }, { n: "Abgeschlossenheitsbescheinigung", d: "Bauamt Neukoelln" }, { n: "Teilungserklaerung", d: "Notar Bombitzky" }],
  "Kaeufer Jan-Philip Roedger": [{ n: "Erstgespraech / Besichtigung", d: "jp.saltero@gmail.com", lb: ["Heissester Interessent"] }, { n: "Unterlagen zusenden", d: "" }, { n: "Kaufpreisverhandlung", d: "" }, { n: "Notartermin vereinbaren", d: "" }],
  "Kaeufer Lina (1.OG)": [{ n: "Grundrisse uebergeben", d: "", cl: [{ n: "Unterlagen", d: 1, t: 2 }] }, { n: "Mieterliste uebergeben", d: "", cl: [{ n: "Unterlagen", d: 1, t: 1 }] }, { n: "Expose erstellen", d: "" }, { n: "Teilungserklaerung", d: "" }],
  "Kaeufer Kolja (EG)": [{ n: "Ersttermin 28.01.", d: "stattgefunden" }, { n: "NDA", d: "" }, { n: "Grundrisse", d: "" }, { n: "Expose", d: "" }],
  "Kaeufer Morits (DG)": [{ n: "50% DG Rohling verkaufen", d: "100.000 EUR fuer 69,5 m2" }, { n: "Baugenehmigung DG", d: "Aufschiebende Bedingung" }, { n: "Ausbau spaeter", d: "Kosten spaeter kalkulieren" }],
  "Due Diligence": [{ n: "Grundbuchauszug", d: "Von Finck anfordern", lb: ["Dringend"] }, { n: "Baulastenverzeichnis", d: "" }, { n: "Altlastenkataster", d: "" }, { n: "Energieausweis", d: "" }],
  "Unterlagen Finck": [{ n: "Grundbuchauszug aktuell", d: "", lb: ["Dringend"] }, { n: "Grundsteuer-Widerspruch", d: "" }, { n: "BK-Abrechnung 2023", d: "" }, { n: "Mietvertraege", d: "" }],
  "Sanierung / Technik": [{ n: "Heizung erneuern", d: "Gewerbe: 50.000 EUR" }, { n: "Elektrik erneuern", d: "Gewerbe: 12.000 EUR" }, { n: "Solaranlage", d: "40.000 EUR" }, { n: "Daemmung Flachdach Haus 3 & 4", d: "Gewerbe: 35.000 EUR" }, { n: "Sanierung DG Scheune", d: "Haus 4, 1. OG: 350.000 EUR" }, { n: "Wohnhaus Haus 1 Sanierung", d: "ca. 300.000 EUR" }],
  "Erledigt": [{ n: "Besichtigung durchgefuehrt", d: "Dezember 2022" }, { n: "Wertindikation Drescher", d: "1.900.000 EUR, Januar 2024" }]
};

function renderTrello(filter) {
  var el = $('tboard');
  if (!el) return;
  var h = '';
  var f = (filter || '').toLowerCase();

  for (var listName in board) {
    var cards = board[listName];
    var fc = cards.filter(function (c) {
      return !f || c.n.toLowerCase().includes(f) || (c.d || '').toLowerCase().includes(f) || listName.toLowerCase().includes(f);
    });
    if (!fc.length && f) continue;
    h += '<h2 class="section-title">' + listName + '</h2><div class="card-grid">';
    for (var i = 0; i < fc.length; i++) {
      var c = fc[i];
      var lb = (c.lb || []).map(function (l) {
        var cl = l.includes('Bearbeitung') ? 'tag-orange' : l.includes('Dringend') ? 'tag-red' : 'tag-blue';
        var icon = cl === 'tag-red' ? '\u26A0 ' : cl === 'tag-orange' ? '\u25CB ' : '\u2139 ';
        return '<span class="tag ' + cl + '">' + icon + l + '</span>';
      }).join(' ');
      var ch = '';
      if (c.cl) {
        for (var j = 0; j < c.cl.length; j++) {
          var cl = c.cl[j];
          var p = cl.t > 0 ? Math.round(cl.d / cl.t * 100) : 0;
          var co = p >= 75 ? 'green' : p >= 25 ? 'orange' : 'red';
          ch += '<div class="progress-bar"><div class="progress-fill ' + co + '" style="width:' + p + '%"></div></div><div class="progress-text">' + cl.n + ': ' + cl.d + '/' + cl.t + '</div>';
        }
      }
      h += '<div class="card">' + lb + '<h3>' + c.n + '</h3>' + (c.d ? '<p>' + c.d + '</p>' : '') + ch + '</div>';
    }
    h += '</div>';
  }
  el.innerHTML = h;
}

function filterTrello() {
  renderTrello($('tsearch').value);
}

// ═══════════════════════════════════
// GALLERY
// ═══════════════════════════════════
var galleryFiles = [
  "IMG_0316.jpeg", "IMG_0317.jpeg", "IMG_0318.jpeg", "IMG_0319.jpeg",
  "IMG_8247.jpeg", "IMG_8248.jpeg", "IMG_8250.jpeg", "IMG_8251.jpeg",
  "IMG_8252.jpeg", "IMG_8253.jpeg", "IMG_8254.jpeg", "IMG_8255.jpeg",
  "IMG_8256.jpeg", "IMG_8257.jpeg", "IMG_8258.jpeg", "IMG_8259.jpeg",
  "IMG_8260.jpeg", "IMG_8261.jpeg", "IMG_8270.jpeg", "IMG_8272.jpeg",
  "IMG_8273.jpeg", "IMG_8274.jpeg", "IMG_8638.jpeg", "IMG_8639.jpeg",
  "IMG_8889.jpeg", "IMG_8890.jpeg", "IMG_8891.jpeg", "IMG_8892.jpeg"
];
var gallerySubfolders = [
  { folder: "Richardplatz 17/Wohnung EG rechts", files: ["Frontansicht.jpeg", "IMG_8263.jpeg", "IMG_8264.jpeg", "IMG_8266.jpeg", "IMG_8267.jpeg", "IMG_8269.jpeg"] }
];

function renderGallery() {
  var g = $('gallery');
  if (!g) return;
  var html = '';
  var count = 0;

  galleryFiles.forEach(function (name) {
    count++;
    var altText = 'Projektfoto ' + count + ' — Richardstr. 72';
    html += '<div class="gallery-item" onclick="openLightbox(\'images/' + name + '\')" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\')openLightbox(\'images/' + name + '\')">' +
      '<img src="images/' + name + '" loading="lazy" alt="' + altText + '">' +
      '<div class="caption">' + name + '</div></div>';
  });

  gallerySubfolders.forEach(function (sub) {
    sub.files.forEach(function (name) {
      count++;
      var path = 'images/' + sub.folder + '/' + name;
      var altText = sub.folder + ' — Foto ' + count;
      html += '<div class="gallery-item" onclick="openLightbox(\'' + path + '\')" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\')openLightbox(\'' + path + '\')">' +
        '<img src="' + path + '" loading="lazy" alt="' + altText + '">' +
        '<div class="caption">' + sub.folder + '/' + name + '</div></div>';
    });
  });

  g.innerHTML = html;
  setEl('imgcount', count + ' Fotos');
}

function openLightbox(src) {
  $('lbi').src = src;
  $('lb').classList.add('open');
}

function closeLightbox() {
  $('lb').classList.remove('open');
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeLightbox();
});

// ═══════════════════════════════════
// NOTES
// ═══════════════════════════════════
var notes = JSON.parse(localStorage.getItem('r72notes') || '[]');
if (!notes.length) notes = [{ title: 'Allgemeine Notizen', content: '', date: new Date().toISOString().slice(0, 10) }];

function renderNotes() {
  var c = $('nc');
  if (!c) return;
  c.innerHTML = notes.map(function (n, i) {
    return '<div class="card" style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
      '<input type="text" value="' + n.title + '" onchange="notes[' + i + '].title=this.value" style="background:transparent;border:none;color:var(--txt);font-size:15px;font-weight:600;outline:none;flex:1">' +
      '<span style="font-size:10px;color:var(--mut)">' + n.date + '</span>' +
      (notes.length > 1 ? '<button onclick="deleteNote(' + i + ')" style="background:none;border:none;color:var(--red);cursor:pointer;margin-left:10px;font-size:15px">&times;</button>' : '') +
      '</div><textarea class="note-textarea" onchange="notes[' + i + '].content=this.value">' + n.content + '</textarea></div>';
  }).join('');
}

function addNote() {
  notes.unshift({ title: 'Neue Notiz', content: '', date: new Date().toISOString().slice(0, 10) });
  renderNotes();
}

function deleteNote(i) {
  notes.splice(i, 1);
  renderNotes();
}

function saveNotes() {
  localStorage.setItem('r72notes', JSON.stringify(notes));
  var b = $('sbtn');
  if (b) { b.textContent = 'Gespeichert!'; setTimeout(function () { b.textContent = 'Speichern'; }, 2000); }
}

// ═══════════════════════════════════
// ENERGIEKONZEPT (rendered as HTML)
// ═══════════════════════════════════
function renderEnergie() {
  var el = $('energie-content');
  if (!el) return;
  el.innerHTML = '<h2 class="section-title">1 Gebaeudestruktur</h2>' +
    '<div class="stat-box" style="margin-bottom:22px"><p>Das Ensemble auf Flurstck 260 besteht aus vier Gebaeudeteilen. Haus 1 am Richardplatz 17 ist das Wohngebaeude, Haus 2-4 bilden das Gewerbeensemble in der Richardstrasse 72. Alle Gebaeude stehen unter Einzeldenkmalschutz (Nr. 9090409).</p>' +
    '<div class="two-col" style="margin-top:14px">' +
    '<div class="result-card rc-wohnen"><h3>Haus 1 — Richardplatz 17</h3><table>' +
    '<tr><td>Baujahr</td><td>1889, Klinkerbauweise</td></tr>' +
    '<tr><td>Wohnflaeche Bestand</td><td>278 m\u00B2 WF (4 WE)</td></tr>' +
    '<tr><td>DG-Erweiterung (geplant)</td><td>GF 139 m\u00B2, Wohnung ca. 100-120 m\u00B2</td></tr>' +
    '<tr><td>Heizung IST</td><td>Oelheizung Buderus (KG), Tanklager im Keller</td></tr>' +
    '<tr><td>Warmwasser</td><td>Dezentral (Durchlauferhitzer)</td></tr></table></div>' +
    '<div class="result-card rc-gewerbe"><h3>Haus 2-4 — Richardstr. 72</h3><table>' +
    '<tr><td>Haus 2 (Scheune)</td><td>250 m\u00B2 NF, Lager TF, unbeheizt</td></tr>' +
    '<tr><td>Haus 3 EG (Garagen)</td><td>ca. 153 m\u00B2, unbeheizt</td></tr>' +
    '<tr><td>Haus 3 OG (Gewerbe)</td><td>95 m\u00B2, Proberaum, Klimaanlage</td></tr>' +
    '<tr><td>Haus 4 (Garagen)</td><td>ca. 65-70 m\u00B2, unbeheizt</td></tr>' +
    '<tr><td>Heizung IST</td><td>Nur Hs. 3 OG: Klimaanlage (Strom)</td></tr></table></div></div></div>' +

    '<h2 class="section-title">2 Energiebedarfsanalyse</h2>' +
    '<div class="stat-box" style="margin-bottom:22px"><h3>Gesamtwaermebedarf Ensemble</h3>' +
    '<table class="comp-table">' +
    '<tr><th>Kennzahl</th><th>Wert</th></tr>' +
    '<tr><td>Beheizte Flaeche (Szenario B)</td><td>~781 m\u00B2</td></tr>' +
    '<tr><td>Gesamtwaermebedarf</td><td>~108.500-134.750 kWh/a</td></tr>' +
    '<tr><td>Anschlusswert FHW (ca.)</td><td>~75-100 kW gemeinsam</td></tr></table></div>' +

    '<h2 class="section-title">3 Photovoltaik 18 kWp — Haus 3 Flachdach</h2>' +
    '<div class="stat-box" style="margin-bottom:22px">' +
    '<p>PV-Anlage: Angebot Novia Energie GmbH Nr. 1000120, <strong>40.937 \u20AC brutto</strong>.</p>' +
    '<table class="comp-table" style="margin-top:10px">' +
    '<tr><th>Parameter</th><th>Pessimistisch</th><th>Optimistisch</th></tr>' +
    '<tr><td>Jahreserzeugung</td><td>15.300 kWh/a</td><td>17.100 kWh/a</td></tr>' +
    '<tr><td>Eigenverbrauchsquote</td><td>~60%</td><td>~70%</td></tr>' +
    '<tr><td>Gesamtvorteil p.a.</td><td>~3.531 \u20AC/a</td><td>~4.371 \u20AC/a</td></tr>' +
    '<tr><td>Amortisation (statisch)</td><td>~11,6 Jahre</td><td>~9,4 Jahre</td></tr></table></div>' +

    '<h2 class="section-title">4 Heizungsversorgung — Empfehlung</h2>' +
    '<div class="stat-box" style="margin-bottom:22px"><h3>Haus 1 — Vergleich</h3>' +
    '<table class="comp-table">' +
    '<tr><th>Kriterium</th><th>A — Oel-Modernisierung</th><th style="background:rgba(76,175,80,0.15)">B — Fernwaerme FHW</th><th>C — Waermepumpe</th></tr>' +
    '<tr><td>Investition</td><td>8.000-12.000 \u20AC</td><td>10.000-25.000 \u20AC</td><td>25.000-40.000 \u20AC</td></tr>' +
    '<tr><td>Jaerl. Kosten (Bestand)</td><td>~6.300 \u20AC/a</td><td>~8.500-11.000 \u20AC/a</td><td>~4.500-7.500 \u20AC/a</td></tr>' +
    '<tr><td>GEG 2024</td><td style="color:var(--red)">Problematisch</td><td style="color:var(--grn)">\u2713 GEG-konform</td><td style="color:var(--grn)">\u2713 GEG-konform</td></tr>' +
    '<tr><td>Empfehlung</td><td>Nur Uebergangsloesung</td><td style="color:var(--grn);font-weight:700">\u2713 Empfohlen</td><td>Langfristig ueberpruefen</td></tr></table></div>' +

    '<h2 class="section-title">5 Massnahmenplan</h2>' +
    '<div class="two-col" style="margin-bottom:22px">' +
    '<div class="result-card" style="border-left:3px solid var(--red)"><h3>Sofortmassnahmen (0-6 Mon.)</h3><table>' +
    '<tr><td>1.</td><td>Kellersanierung Haus 1</td><td style="text-align:right">~74.500 \u20AC</td></tr>' +
    '<tr><td>2.</td><td>FHW-Machbarkeitsanfrage</td><td style="text-align:right">kostenlos</td></tr>' +
    '<tr><td>3.</td><td>Asbestverdacht Dach pruefen</td><td style="text-align:right">~1.500-3.000 \u20AC</td></tr>' +
    '<tr><td>4.</td><td>Bauantrag DG-Ausbau</td><td style="text-align:right">~5.000-12.000 \u20AC</td></tr></table></div>' +
    '<div class="result-card" style="border-left:3px solid var(--org)"><h3>Kurzfristig (6-18 Mon.)</h3><table>' +
    '<tr><td>5.</td><td>Flachdach Haus 3 daemmen</td><td style="text-align:right">~15.000-25.000 \u20AC</td></tr>' +
    '<tr><td>6.</td><td>PV-Anlage 18 kWp</td><td style="text-align:right">40.937 \u20AC</td></tr>' +
    '<tr><td>7.</td><td>FHW-Anschluss realisieren</td><td style="text-align:right">~20.000-40.000 \u20AC</td></tr>' +
    '<tr><td>8.</td><td>DG-Ausbau Haus 1</td><td style="text-align:right">~120.000-200.000 \u20AC</td></tr></table></div></div>';
}

// ═══════════════════════════════════
// KALKULATIONSBOARD (Renovierung)
// ═══════════════════════════════════
var renovGewItems = [
  {name: 'Heizung', preis: 50000},
  {name: 'Strom / Elektrik', preis: 12000},
  {name: 'Solaranlage', preis: 40000},
  {name: 'Daemmung Flachdach Haus 3 & Haus 4', preis: 35000},
  {name: 'Scheune DG Ausbau', preis: 300000},
  {name: 'Sanierung DG Scheune (Haus 4, 1. OG)', preis: 350000}
];
var renovWohnItems = [
  {name: 'Sanierung Wohngebaeude (Haus 1)', preis: 300000},
  {name: 'DG-Ausbau Wohnen (WE4)', preis: 300000}
];

function renderRenovBoard() {
  renderRenovTable('renov-board-gewerbe', 'gew', 'Renovierung Gewerbe', renovGewItems, 'var(--org)');
  renderRenovTable('renov-board-wohnen', 'wohn', 'Sanierung Wohnen', renovWohnItems, 'var(--acc)');
}

function renderRenovTable(containerId, prefix, title, items, color) {
  var el = $(containerId);
  if (!el) return;
  var html = '<div class="stat-box" style="border-left:3px solid ' + color + '">' +
    '<h3 style="margin-bottom:10px">' + title + '</h3>' +
    '<table class="comp-table renov-table">' +
    '<thead><tr><th style="text-align:left;width:60%">Massnahme</th><th style="text-align:right">Gesamtpreis</th><th style="width:36px"></th></tr></thead><tbody>';

  for (var i = 0; i < items.length; i++) {
    html += '<tr>' +
      '<td><input type="text" class="input-field renov-input-name" value="' + items[i].name.replace(/"/g, '&quot;') + '" data-prefix="' + prefix + '" data-idx="' + i + '" onchange="updateRenovItem(this)"></td>' +
      '<td style="text-align:right"><input type="number" class="input-field input-sm renov-input-preis" value="' + items[i].preis + '" step="1000" min="0" data-prefix="' + prefix + '" data-idx="' + i + '" oninput="updateRenovPreis(this)"> &euro;</td>' +
      '<td style="text-align:center"><button class="renov-del-btn" onclick="removeRenovItem(\'' + prefix + '\',' + i + ')" title="Entfernen">&times;</button></td>' +
      '</tr>';
  }

  // Summe
  var summe = 0;
  for (var j = 0; j < items.length; j++) summe += items[j].preis;
  html += '</tbody><tfoot><tr style="font-weight:700;border-top:2px solid var(--brd)">' +
    '<td>Summe</td>' +
    '<td style="text-align:right;color:' + color + '" id="renov_sum_' + prefix + '">' + fmtN(summe) + ' \u20AC</td>' +
    '<td></td></tr></tfoot></table>' +
    '<button class="renov-add-btn" onclick="addRenovItem(\'' + prefix + '\')" style="margin-top:8px">+ Massnahme hinzufuegen</button>' +
    '</div>';
  el.innerHTML = html;
}

function updateRenovItem(input) {
  var prefix = input.getAttribute('data-prefix');
  var idx = parseInt(input.getAttribute('data-idx'));
  var items = prefix === 'gew' ? renovGewItems : renovWohnItems;
  items[idx].name = input.value;
}

function updateRenovPreis(input) {
  var prefix = input.getAttribute('data-prefix');
  var idx = parseInt(input.getAttribute('data-idx'));
  var items = prefix === 'gew' ? renovGewItems : renovWohnItems;
  items[idx].preis = parseFloat(input.value) || 0;
  updateRenovSums();
}

function addRenovItem(prefix) {
  var items = prefix === 'gew' ? renovGewItems : renovWohnItems;
  items.push({name: 'Neue Massnahme', preis: 0});
  renderRenovBoard();
  updateRenovSums();
}

function removeRenovItem(prefix, idx) {
  var items = prefix === 'gew' ? renovGewItems : renovWohnItems;
  if (items.length <= 1) return; // mindestens 1 Position behalten
  items.splice(idx, 1);
  renderRenovBoard();
  updateRenovSums();
}

function updateRenovSums() {
  var sumGew = 0, sumWohn = 0;
  for (var i = 0; i < renovGewItems.length; i++) sumGew += renovGewItems[i].preis;
  for (var j = 0; j < renovWohnItems.length; j++) sumWohn += renovWohnItems[j].preis;

  setEl('renov_sum_gew', fmtN(sumGew) + ' \u20AC');
  setEl('renov_sum_wohn', fmtN(sumWohn) + ' \u20AC');

  // Globale Konstanten aktualisieren fuer calcF20()
  RENOV_GEW = sumGew;
  INVEST_WOHN = sumWohn;

  // Mittelverwendung & Cashflow neu berechnen
  calcF20();
}

// ═══════════════════════════════════
// DOKUMENTE
// ═══════════════════════════════════
function renderDokumente() {
  var el = $('dokumente-content');
  if (!el) return;
  el.innerHTML =
    '<h2 class="section-title">Projektdokumente — Uebersicht</h2>' +
    '<div class="two-col" style="margin-bottom:22px">' +
    '<div class="result-card" style="border-left:3px solid var(--acc)"><h3>Kaufunterlagen</h3><table style="font-size:12px">' +
    '<tr><td>\u2022</td><td>Teilungserklaerung (Entwurf)</td></tr>' +
    '<tr><td>\u2022</td><td>Muster-Teilungserklaerung (PDF/DOCX)</td></tr>' +
    '<tr><td>\u2022</td><td>Wertindikationsgutachten Drescher/Wertstatt (Jan. 2024)</td></tr>' +
    '<tr><td>\u2022</td><td>Anschreiben WEG-Teilung Milieuschutz Neukoelln</td></tr>' +
    '<tr><td>\u2022</td><td>Pruefung WEG-Teilung (Milieuschutz)</td></tr></table></div>' +
    '<div class="result-card" style="border-left:3px solid var(--grn)"><h3>Bau &amp; Technik</h3><table style="font-size:12px">' +
    '<tr><td>\u2022</td><td>Energiekonzept-Analyse (Maerz 2026)</td></tr>' +
    '<tr><td>\u2022</td><td>Bauzustandsbericht BWS 06-25 (Kalmbach)</td></tr>' +
    '<tr><td>\u2022</td><td>Flaechenberechnung Detail (Architekt)</td></tr>' +
    '<tr><td>\u2022</td><td>Lageplan Ebeling+Finck GbR</td></tr>' +
    '<tr><td>\u2022</td><td>Angebot PV-Anlage Novia Energie (Nr. 1000120)</td></tr></table></div></div>' +

    // ─── Plaene & Grundrisse ───
    '<h2 class="section-title">Plaene &amp; Grundrisse</h2>' +
    '<p style="color:var(--txt2);font-size:13px;margin-bottom:14px">Alle Plaene als PDF — Klick oeffnet in neuem Tab.</p>' +

    // Lageplan & Ansichten
    '<div class="stat-box" style="margin-bottom:16px">' +
    '<h3 style="margin-bottom:10px">Lageplan &amp; Ansichten</h3>' +
    '<div class="doc-plan-grid">' +
    '<a href="docs/plaene/lageplan.pdf" target="_blank" class="doc-plan-card"><span class="doc-plan-icon">\uD83D\uDDFA\uFE0F</span><span class="doc-plan-name">Lageplan</span></a>' +
    '<a href="docs/plaene/sued-ansicht.pdf" target="_blank" class="doc-plan-card"><span class="doc-plan-icon">\uD83C\uDFE0</span><span class="doc-plan-name">Sued-Ansicht</span></a>' +
    '</div></div>' +

    // Haus 1 (Vorderhaus)
    '<div class="stat-box" style="margin-bottom:16px">' +
    '<h3 style="margin-bottom:10px;color:var(--acc)">Haus 1 — Vorderhaus (WE1–WE4, TE1)</h3>' +
    '<div class="doc-plan-grid">' +
    '<a href="docs/plaene/haus1-kg.pdf" target="_blank" class="doc-plan-card"><span class="doc-plan-icon">\u2B07\uFE0F</span><span class="doc-plan-name">Kellergeschoss</span></a>' +
    '<a href="docs/plaene/haus1-eg.pdf" target="_blank" class="doc-plan-card"><span class="doc-plan-icon">\uD83C\uDFE2</span><span class="doc-plan-name">Erdgeschoss</span></a>' +
    '<a href="docs/plaene/haus1-1og.pdf" target="_blank" class="doc-plan-card"><span class="doc-plan-icon">\u2B06\uFE0F</span><span class="doc-plan-name">1. Obergeschoss</span></a>' +
    '<a href="docs/plaene/haus1-dg.pdf" target="_blank" class="doc-plan-card"><span class="doc-plan-icon">\uD83C\uDFDA\uFE0F</span><span class="doc-plan-name">Dachgeschoss</span></a>' +
    '<a href="docs/plaene/haus1-schnitt-aa.pdf" target="_blank" class="doc-plan-card"><span class="doc-plan-icon">\u2702\uFE0F</span><span class="doc-plan-name">Schnitt A-A</span></a>' +
    '<a href="docs/plaene/haus1-schnitt-bb.pdf" target="_blank" class="doc-plan-card"><span class="doc-plan-icon">\u2702\uFE0F</span><span class="doc-plan-name">Schnitt B-B</span></a>' +
    '</div></div>' +

    // Haus 2 (Seitenflügel)
    '<div class="stat-box" style="margin-bottom:16px">' +
    '<h3 style="margin-bottom:10px;color:var(--org)">Haus 2 — Seitenfluegel</h3>' +
    '<div class="doc-plan-grid">' +
    '<a href="docs/plaene/haus2-eg.pdf" target="_blank" class="doc-plan-card"><span class="doc-plan-icon">\uD83C\uDFE2</span><span class="doc-plan-name">Erdgeschoss</span></a>' +
    '</div></div>' +

    // Haus 3 (Quergebäude / Musiker)
    '<div class="stat-box" style="margin-bottom:16px">' +
    '<h3 style="margin-bottom:10px;color:var(--pur)">Haus 3 — Quergebaeude (TE5 Musiker)</h3>' +
    '<div class="doc-plan-grid">' +
    '<a href="docs/plaene/haus3-eg.pdf" target="_blank" class="doc-plan-card"><span class="doc-plan-icon">\uD83C\uDFE2</span><span class="doc-plan-name">Erdgeschoss</span></a>' +
    '<a href="docs/plaene/haus3-1og.pdf" target="_blank" class="doc-plan-card"><span class="doc-plan-icon">\u2B06\uFE0F</span><span class="doc-plan-name">1. Obergeschoss</span></a>' +
    '</div></div>' +

    // KG Gesamt
    '<div class="stat-box" style="margin-bottom:16px">' +
    '<h3 style="margin-bottom:10px;color:var(--cyn)">Kellergeschoss Gesamt</h3>' +
    '<div class="doc-plan-grid">' +
    '<a href="docs/plaene/kg-gesamt.pdf" target="_blank" class="doc-plan-card"><span class="doc-plan-icon">\u2B07\uFE0F</span><span class="doc-plan-name">KG Gesamtplan</span></a>' +
    '</div></div>' +

    // Bestandspläne (Ebeling+Finck 2022)
    '<div class="stat-box" style="margin-bottom:22px">' +
    '<h3 style="margin-bottom:10px;color:var(--txt2)">Bestandsplaene (Ebeling+Finck, Nov. 2022)</h3>' +
    '<div class="doc-plan-grid">' +
    '<a href="docs/plaene/bestand-grundstueck.pdf" target="_blank" class="doc-plan-card"><span class="doc-plan-icon">\uD83D\uDDFA\uFE0F</span><span class="doc-plan-name">Grundstueck</span></a>' +
    '<a href="docs/plaene/bestand-eg.pdf" target="_blank" class="doc-plan-card"><span class="doc-plan-icon">\uD83C\uDFE2</span><span class="doc-plan-name">EG Grundriss</span></a>' +
    '<a href="docs/plaene/bestand-og.pdf" target="_blank" class="doc-plan-card"><span class="doc-plan-icon">\u2B06\uFE0F</span><span class="doc-plan-name">OG Grundriss</span></a>' +
    '<a href="docs/plaene/bestand-schnitt1.pdf" target="_blank" class="doc-plan-card"><span class="doc-plan-icon">\u2702\uFE0F</span><span class="doc-plan-name">Schnitt 1</span></a>' +
    '<a href="docs/plaene/bestand-schnitt2.pdf" target="_blank" class="doc-plan-card"><span class="doc-plan-icon">\u2702\uFE0F</span><span class="doc-plan-name">Schnitt 2</span></a>' +
    '</div></div>' +

    '<h2 class="section-title">Status &amp; Naechste Schritte</h2>' +
    '<div class="stat-box"><table class="comp-table">' +
    '<tr><th>Dokument</th><th>Status</th><th>Aktion</th></tr>' +
    '<tr><td>Teilungserklaerung</td><td><span class="tag tag-orange">\u25CB Entwurf</span></td><td>Notar-Abstimmung erforderlich</td></tr>' +
    '<tr><td>Abgeschlossenheitsbescheinigung</td><td><span class="tag tag-red">\u26A0 Ausstehend</span></td><td>Beim Bauamt beantragen</td></tr>' +
    '<tr><td>Aufteilungsplan</td><td><span class="tag tag-red">\u26A0 Ausstehend</span></td><td>Vom Architekten erstellen lassen</td></tr>' +
    '<tr><td>Genehmigung \u00A7 250 BauGB</td><td><span class="tag tag-red">\u26A0 Ausstehend</span></td><td>Bezirksamt Neukoelln</td></tr>' +
    '<tr><td>Energiekonzept</td><td><span class="tag tag-green">\u2713 Fertig</span></td><td>Siehe Tab "Energiekonzept"</td></tr>' +
    '<tr><td>Flaechenberechnung</td><td><span class="tag tag-green">\u2713 Fertig</span></td><td>Detail-Excel vorhanden</td></tr>' +
    '<tr><td>FHW-Machbarkeitsanfrage</td><td><span class="tag tag-red">\u26A0 Ausstehend</span></td><td>Bei FHW Neukoelln einreichen</td></tr></table></div>';
}

// ═══════════════════════════════════════════
// FLAECHENBERECHNUNG (aus Excel)
// ═══════════════════════════════════════════

var FLAECHEN_DATA = [
  {nr:1, lage:'Haus 1', einheit:'WE1', bez:'EG links (59,56), 2 ZKB', raum:'Zimmer 1, Wohnen', mea:'Sondereigentum WE1', nutzung:'Wohnen', flaeche:10.41, hoehe:3.10, faktor:1, angerechnet:10.41},
  {nr:2, lage:'Haus 1', einheit:'WE1', bez:'EG links (59,56), 2 ZKB', raum:'Zimmer 2, Schlafen', mea:'Sondereigentum WE1', nutzung:'Wohnen', flaeche:32.25, hoehe:3.10, faktor:1, angerechnet:32.25},
  {nr:3, lage:'Haus 1', einheit:'WE1', bez:'EG links (59,56), 2 ZKB', raum:'Flur', mea:'Sondereigentum WE1', nutzung:'Wohnen', flaeche:5.16, hoehe:3.10, faktor:1, angerechnet:5.16},
  {nr:4, lage:'Haus 1', einheit:'WE1', bez:'EG links (59,56), 2 ZKB', raum:'Kueche', mea:'Sondereigentum WE1', nutzung:'Wohnen', flaeche:7.04, hoehe:3.10, faktor:1, angerechnet:7.04},
  {nr:5, lage:'Haus 1', einheit:'WE1', bez:'EG links (59,56), 2 ZKB', raum:'Bad', mea:'Sondereigentum WE1', nutzung:'Wohnen', flaeche:4.70, hoehe:3.10, faktor:1, angerechnet:4.70},
  {nr:6, lage:'Haus 1', einheit:'WE2', bez:'EG rechts (78,75), 3 ZKB Balkon, Garten', raum:'Zimmer 1, Wohnen', mea:'Sondereigentum WE2', nutzung:'Wohnen', flaeche:24.25, hoehe:3.10, faktor:1, angerechnet:24.25},
  {nr:7, lage:'Haus 1', einheit:'WE2', bez:'EG rechts (78,75), 3 ZKB Balkon, Garten', raum:'Zimmer 2, Schlafen', mea:'Sondereigentum WE2', nutzung:'Wohnen', flaeche:21.70, hoehe:3.10, faktor:1, angerechnet:21.70},
  {nr:8, lage:'Haus 1', einheit:'WE2', bez:'EG rechts (78,75), 3 ZKB Balkon, Garten', raum:'Zimmer 3, Kinder', mea:'Sondereigentum WE2', nutzung:'Wohnen', flaeche:11.84, hoehe:3.10, faktor:1, angerechnet:11.84},
  {nr:9, lage:'Haus 1', einheit:'WE2', bez:'EG rechts (78,75), 3 ZKB Balkon, Garten', raum:'Flur', mea:'Sondereigentum WE2', nutzung:'Wohnen', flaeche:6.44, hoehe:3.10, faktor:1, angerechnet:6.44},
  {nr:10, lage:'Haus 1', einheit:'WE2', bez:'EG rechts (78,75), 3 ZKB Balkon, Garten', raum:'Kueche', mea:'Sondereigentum WE2', nutzung:'Wohnen', flaeche:9.32, hoehe:3.10, faktor:1, angerechnet:9.32},
  {nr:11, lage:'Haus 1', einheit:'WE2', bez:'EG rechts (78,75), 3 ZKB Balkon, Garten', raum:'Bad', mea:'Sondereigentum WE2', nutzung:'Wohnen', flaeche:5.20, hoehe:3.10, faktor:1, angerechnet:5.20},
  {nr:12, lage:'Haus 1', einheit:'WE2', bez:'EG rechts (78,75), 3 ZKB Balkon, Garten', raum:'Balkon', mea:'Sondereigentum WE2', nutzung:'Wohnen', flaeche:5.90, hoehe:3.10, faktor:0.5, angerechnet:2.95},
  {nr:13, lage:'Haus 1', einheit:'WE2', bez:'EG rechts (78,75), 3 ZKB Balkon, Garten', raum:'Garten', mea:'Sondereigentum WE2', nutzung:'Wohnen', flaeche:50.00, hoehe:0, faktor:0.5, angerechnet:25.00},
  {nr:14, lage:'Haus 1', einheit:'WE3', bez:'1. OG links (58,8) & rechts (ca. 79qm) 5 ZKB', raum:'Zimmer 1, Wohnen', mea:'Sondereigentum WE3', nutzung:'Wohnen', flaeche:10.41, hoehe:3.07, faktor:1, angerechnet:10.41},
  {nr:15, lage:'Haus 1', einheit:'WE3', bez:'1. OG links (58,8) & rechts (ca. 79qm) 5 ZKB', raum:'Zimmer 2, Schlafen', mea:'Sondereigentum WE3', nutzung:'Wohnen', flaeche:32.25, hoehe:3.15, faktor:1, angerechnet:32.25},
  {nr:16, lage:'Haus 1', einheit:'WE3', bez:'1. OG links (58,8) & rechts (ca. 79qm) 5 ZKB', raum:'Flur', mea:'Sondereigentum WE3', nutzung:'Wohnen', flaeche:5.16, hoehe:3.15, faktor:1, angerechnet:5.16},
  {nr:17, lage:'Haus 1', einheit:'WE3', bez:'1. OG links (58,8) & rechts (ca. 79qm) 5 ZKB', raum:'Kueche', mea:'Sondereigentum WE3', nutzung:'Wohnen', flaeche:7.04, hoehe:3.15, faktor:1, angerechnet:7.04},
  {nr:18, lage:'Haus 1', einheit:'WE3', bez:'1. OG links (58,8) & rechts (ca. 79qm) 5 ZKB', raum:'Bad', mea:'Sondereigentum WE3', nutzung:'Wohnen', flaeche:4.70, hoehe:3.15, faktor:1, angerechnet:4.70},
  {nr:19, lage:'Haus 1', einheit:'WE3', bez:'1. OG links (58,8) & rechts (ca. 79qm) 5 ZKB', raum:'Zimmer 1, Wohnen (rechts)', mea:'Sondereigentum WE3', nutzung:'Wohnen', flaeche:24.25, hoehe:3.15, faktor:1, angerechnet:24.25},
  {nr:20, lage:'Haus 1', einheit:'WE3', bez:'1. OG links (58,8) & rechts (ca. 79qm) 5 ZKB', raum:'Zimmer 2, Schlafen (rechts)', mea:'Sondereigentum WE3', nutzung:'Wohnen', flaeche:21.70, hoehe:3.15, faktor:1, angerechnet:21.70},
  {nr:21, lage:'Haus 1', einheit:'WE3', bez:'1. OG links (58,8) & rechts (ca. 79qm) 5 ZKB', raum:'Zimmer 3, Kinder (rechts)', mea:'Sondereigentum WE3', nutzung:'Wohnen', flaeche:11.84, hoehe:3.15, faktor:1, angerechnet:11.84},
  {nr:22, lage:'Haus 1', einheit:'WE3', bez:'1. OG links (58,8) & rechts (ca. 79qm) 5 ZKB', raum:'Flur (rechts)', mea:'Sondereigentum WE3', nutzung:'Wohnen', flaeche:6.44, hoehe:3.15, faktor:1, angerechnet:6.44},
  {nr:23, lage:'Haus 1', einheit:'WE3', bez:'1. OG links (58,8) & rechts (ca. 79qm) 5 ZKB', raum:'Kueche (rechts)', mea:'Sondereigentum WE3', nutzung:'Wohnen', flaeche:9.32, hoehe:3.15, faktor:1, angerechnet:9.32},
  {nr:24, lage:'Haus 1', einheit:'WE3', bez:'1. OG links (58,8) & rechts (ca. 79qm) 5 ZKB', raum:'Bad (rechts)', mea:'Sondereigentum WE3', nutzung:'Wohnen', flaeche:5.20, hoehe:3.15, faktor:1, angerechnet:5.20},
  {nr:25, lage:'Haus 1', einheit:'WE4', bez:'DG (leerstehend)', raum:'Dachgeschossrohling Potential', mea:'Sondereigentum WE4', nutzung:'Wohnen', flaeche:120.00, hoehe:4.51, faktor:0, angerechnet:0},
  {nr:26, lage:'Haus 1', einheit:'GE', bez:'Treppenhaus 2. OG', raum:'Treppenhaus 2. OG', mea:'Gemeinschaftseigentum', nutzung:'Wohnen', flaeche:12.96, hoehe:0, faktor:0, angerechnet:0},
  {nr:27, lage:'Haus 1', einheit:'GE', bez:'Treppenhaus 1. OG', raum:'Treppenhaus 1. OG', mea:'Gemeinschaftseigentum', nutzung:'Wohnen', flaeche:12.96, hoehe:0, faktor:0, angerechnet:0},
  {nr:28, lage:'Haus 1', einheit:'GE', bez:'Treppenhaus Erdgeschoss', raum:'Treppenhaus Erdgeschoss', mea:'Gemeinschaftseigentum', nutzung:'Wohnen', flaeche:12.44, hoehe:0, faktor:0, angerechnet:0},
  {nr:29, lage:'Haus 1', einheit:'GE', bez:'Treppenhaus Kellergeschoss', raum:'Treppenhaus Kellergeschoss', mea:'Gemeinschaftseigentum', nutzung:'Wohnen', flaeche:6.51, hoehe:0, faktor:0, angerechnet:0},
  {nr:30, lage:'Haus 1', einheit:'TE1', bez:'Sonstiges Gewerbe KG links', raum:'Sonstiges Gewerbe', mea:'Teileigentum TE1', nutzung:'Gewerbe', flaeche:24.86, hoehe:2.30, faktor:0.5, angerechnet:12.43},
  {nr:31, lage:'Haus 1', einheit:'TE1', bez:'Sonstiges Gewerbe KG links', raum:'Kellerraum 1', mea:'Teileigentum TE1', nutzung:'Gewerbe', flaeche:19.46, hoehe:2.30, faktor:0.5, angerechnet:9.73},
  {nr:32, lage:'Haus 1', einheit:'TE1', bez:'Sonstiges Gewerbe KG links', raum:'Kellerraum 2', mea:'Teileigentum TE1', nutzung:'Gewerbe', flaeche:11.71, hoehe:2.30, faktor:0.5, angerechnet:5.86},
  {nr:33, lage:'Haus 1', einheit:'GE', bez:'Hausanschlussraum', raum:'Hausanschlussraum', mea:'Gemeinschaftseigentum', nutzung:'Wohnen', flaeche:14.14, hoehe:2.30, faktor:0, angerechnet:0},
  {nr:34, lage:'Haus 1', einheit:'SE1', bez:'Kellerraum 1', raum:'Kellerraum WE2', mea:'Sondereigentum WE2', nutzung:'Wohnen', flaeche:4.50, hoehe:2.30, faktor:0, angerechnet:0},
  {nr:35, lage:'Haus 1', einheit:'SE2', bez:'Kellerraum 2', raum:'Kellerraum WE3', mea:'Sondereigentum WE3', nutzung:'Wohnen', flaeche:4.50, hoehe:2.30, faktor:0, angerechnet:0},
  {nr:36, lage:'Haus 1', einheit:'SE3', bez:'Kellerraum 3', raum:'Kellerraum 3', mea:'Gemeinschaftseigentum', nutzung:'Wohnen', flaeche:2.81, hoehe:2.30, faktor:0, angerechnet:0},
  {nr:37, lage:'Haus 1', einheit:'SE4', bez:'Kellerraum 4', raum:'Kellerraum WE1', mea:'Sondereigentum WE1', nutzung:'Wohnen', flaeche:9.92, hoehe:2.30, faktor:0, angerechnet:0},
  {nr:38, lage:'Haus 1', einheit:'SE5', bez:'Kellerraum 5', raum:'Kellerraum WE4', mea:'Sondereigentum WE4', nutzung:'Wohnen', flaeche:6.02, hoehe:2.30, faktor:0, angerechnet:0},
  {nr:39, lage:'Haus 4', einheit:'TE2', bez:'Scharnier EG (Tante Frizzante)', raum:'Werkstatt', mea:'Teileigentum TE2', nutzung:'Gewerbe', flaeche:82.16, hoehe:7.75, faktor:1, angerechnet:82.16},
  {nr:40, lage:'Haus 4', einheit:'TE3', bez:'Scharnier 1. OG (Tante Frizzante)', raum:'Scharnier 1. OG', mea:'Teileigentum TE3', nutzung:'Gewerbe', flaeche:77.20, hoehe:3.70, faktor:1, angerechnet:77.20},
  {nr:41, lage:'Haus 4', einheit:'TE3', bez:'Scharnier 1. OG (Tante Frizzante)', raum:'Toilette Scharnier 1. OG', mea:'Teileigentum TE3', nutzung:'Gewerbe', flaeche:4.96, hoehe:3.70, faktor:1, angerechnet:4.96},
  {nr:42, lage:'Haus 4', einheit:'TE4', bez:'Scheune / Lager EG (Tante Frizzante)', raum:'Gemeinschaftsraum', mea:'Teileigentum TE3', nutzung:'Gewerbe', flaeche:111.67, hoehe:3.75, faktor:1, angerechnet:111.67},
  {nr:43, lage:'Haus 4', einheit:'TE4', bez:'Scheune / Lager (Tante Frizzante)', raum:'Buero', mea:'Teileigentum TE3', nutzung:'Gewerbe', flaeche:22.04, hoehe:2.65, faktor:1, angerechnet:22.04},
  {nr:44, lage:'Haus 4', einheit:'TE4', bez:'Scheune / Lager (Tante Frizzante)', raum:'Flur', mea:'Teileigentum TE3', nutzung:'Gewerbe', flaeche:6.12, hoehe:2.95, faktor:1, angerechnet:6.12},
  {nr:45, lage:'Haus 4', einheit:'TE4', bez:'Scheune / Lager (Tante Frizzante)', raum:'Abstell 1', mea:'Teileigentum TE3', nutzung:'Gewerbe', flaeche:5.98, hoehe:2.50, faktor:1, angerechnet:5.98},
  {nr:46, lage:'Haus 4', einheit:'TE4', bez:'Scheune / Lager (Tante Frizzante)', raum:'Abstell 2', mea:'Teileigentum TE3', nutzung:'Gewerbe', flaeche:3.48, hoehe:2.70, faktor:1, angerechnet:3.48},
  {nr:47, lage:'Haus 4', einheit:'TE4', bez:'Scheune / Lager (Tante Frizzante)', raum:'Treppe', mea:'Teileigentum TE3', nutzung:'Gewerbe', flaeche:5.51, hoehe:2.95, faktor:1, angerechnet:5.51},
  {nr:48, lage:'Haus 4', einheit:'TE4', bez:'Scheune DG 1. OG (Tante Frizzante)', raum:'Scheune DG gross', mea:'Teileigentum TE3', nutzung:'Gewerbe', flaeche:83.75, hoehe:5.25, faktor:0, angerechnet:0},
  {nr:49, lage:'Haus 4', einheit:'TE4', bez:'Scheune DG 1. OG (Tante Frizzante)', raum:'Scheune DG klein', mea:'Teileigentum TE3', nutzung:'Gewerbe', flaeche:32.50, hoehe:1.00, faktor:0, angerechnet:0},
  {nr:50, lage:'Haus 3', einheit:'TE5', bez:'Quergebaeude 1. OG (Wanubale GbR/Musiker)', raum:'Raum 1 / Kueche / Bad', mea:'Teileigentum TE4', nutzung:'Gewerbe', flaeche:36.15, hoehe:3.68, faktor:1, angerechnet:36.15},
  {nr:51, lage:'Haus 3', einheit:'TE5', bez:'Quergebaeude 1. OG (Wanubale GbR/Musiker)', raum:'Raum 2 / Musikstudio', mea:'Teileigentum TE4', nutzung:'Gewerbe', flaeche:61.79, hoehe:3.68, faktor:1, angerechnet:61.79},
  {nr:52, lage:'Haus 3', einheit:'TE2', bez:'Toilette Erdgeschoss', raum:'Toilette EG Gewerbe', mea:'Teileigentum TE3', nutzung:'Gewerbe', flaeche:16.38, hoehe:2.20, faktor:0, angerechnet:0},
  {nr:53, lage:'Haus 4', einheit:'GE', bez:'Kellergeschoss Scheune', raum:'Kellerraum & Oeltank / HAR', mea:'Gemeinschaftseigentum', nutzung:'Gewerbe', flaeche:28.93, hoehe:1.92, faktor:0, angerechnet:0},
  {nr:54, lage:'Haus 4', einheit:'GE', bez:'Kellergeschoss Scheune', raum:'Kohlekeller / Haustechnik', mea:'Gemeinschaftseigentum', nutzung:'Gewerbe', flaeche:3.74, hoehe:1.64, faktor:0, angerechnet:0},
  {nr:55, lage:'Haus 3', einheit:'TE9', bez:'4. Garage (Annika Finck)', raum:'4. Garage', mea:'Teileigentum TE8', nutzung:'Garage', flaeche:15.78, hoehe:2.77, faktor:0, angerechnet:0},
  {nr:56, lage:'Haus 3', einheit:'TE10', bez:'5. Garage (Holger Jordan)', raum:'5. Garage', mea:'Teileigentum TE9', nutzung:'Garage', flaeche:14.60, hoehe:2.77, faktor:0, angerechnet:0},
  {nr:57, lage:'Haus 3', einheit:'TE11', bez:'6. Garage (Michael Steeger)', raum:'6. Garage', mea:'Teileigentum TE10', nutzung:'Garage', flaeche:13.97, hoehe:2.77, faktor:0, angerechnet:0},
  {nr:58, lage:'Haus 3', einheit:'TE12', bez:'7. Garage (Corinna Schaffer)', raum:'7. Garage', mea:'Teileigentum TE11', nutzung:'Garage', flaeche:13.86, hoehe:2.77, faktor:0, angerechnet:0},
  {nr:59, lage:'Haus 3', einheit:'TE13', bez:'8. Garage (Detlev Leu)', raum:'8. Garage', mea:'Teileigentum TE12', nutzung:'Garage', flaeche:14.81, hoehe:2.77, faktor:0, angerechnet:0},
  {nr:60, lage:'Haus 3', einheit:'TE14', bez:'9. Garage (Detlev Leu)', raum:'9. Garage', mea:'Teileigentum TE13', nutzung:'Garage', flaeche:15.00, hoehe:2.77, faktor:0, angerechnet:0},
  {nr:61, lage:'Haus 2', einheit:'TE6', bez:'1. Garage (Detlev Leu, Doppelgarage)', raum:'1. Garage (Doppelgarage)', mea:'Teileigentum TE5', nutzung:'Garage', flaeche:57.91, hoehe:2.77, faktor:0, angerechnet:0},
  {nr:62, lage:'Haus 2', einheit:'TE7', bez:'2. Garage (Thomas Finck)', raum:'2. Garage', mea:'Teileigentum TE6', nutzung:'Garage', flaeche:18.09, hoehe:2.77, faktor:0, angerechnet:0},
  {nr:63, lage:'Haus 2', einheit:'TE8', bez:'3. Garage (Thomas Finck, Doppelgarage)', raum:'3. Garage', mea:'Teileigentum TE7', nutzung:'Garage', flaeche:33.58, hoehe:2.77, faktor:0, angerechnet:0},
  {nr:64, lage:'Haus 2', einheit:'WE5', bez:'Aufstockung DG Haus 2', raum:'Aufstockung Potential Neubau', mea:'Sondereigentum WE5', nutzung:'Gewerbe', flaeche:126.28, hoehe:0, faktor:0, angerechnet:0}
];

var BETRIEBSKOSTEN = [
  {nr:1, pos:'Grundsteuer', betrag:6076.64},
  {nr:2, pos:'Hausversicherung', betrag:5147.27},
  {nr:3, pos:'Muellabfuhr', betrag:594.56},
  {nr:4, pos:'Strassenreinigung', betrag:1111.12},
  {nr:5, pos:'Wasser', betrag:2145.00},
  {nr:6, pos:'Strom', betrag:829.40},
  {nr:7, pos:'Papiertonne', betrag:118.80},
  {nr:8, pos:'Schornsteinfeger', betrag:159.53},
  {nr:9, pos:'Heizoel', betrag:6300.00},
  {nr:10, pos:'Winterdienst', betrag:1191.49}
];

function renderFlaechen() {
  var fHaus = document.getElementById('fl_filter_haus').value;
  var fNutz = document.getElementById('fl_filter_nutzung').value;
  var fEig = document.getElementById('fl_filter_eigentum').value;

  var filtered = FLAECHEN_DATA.filter(function (r) {
    if (fHaus && r.lage !== fHaus) return false;
    if (fNutz && r.nutzung !== fNutz) return false;
    if (fEig && r.mea.indexOf(fEig) === -1) return false;
    return true;
  });

  // Table
  var tbody = document.getElementById('fl_tbody');
  var html = '';
  var totalFlaeche = 0, totalAngerechnet = 0;
  filtered.forEach(function (r) {
    totalFlaeche += r.flaeche;
    totalAngerechnet += r.angerechnet;
    var rowColor = r.nutzung === 'Wohnen' ? 'var(--acc)' : r.nutzung === 'Gewerbe' ? 'var(--org)' : 'var(--pur)';
    html += '<tr>' +
      '<td>' + r.nr + '</td>' +
      '<td>' + r.lage + '</td>' +
      '<td><span class="tag" style="background:' + rowColor + '20;color:' + rowColor + '">' + r.einheit + '</span></td>' +
      '<td style="font-size:.85rem">' + r.bez + '</td>' +
      '<td>' + r.raum + '</td>' +
      '<td style="font-size:.8rem;color:var(--txt2)">' + r.mea + '</td>' +
      '<td><span class="tag ' + (r.nutzung === 'Wohnen' ? 'tag-blue' : r.nutzung === 'Gewerbe' ? 'tag-orange' : 'tag-purple') + '">' + (r.nutzung === 'Wohnen' ? '\u2302 ' : r.nutzung === 'Gewerbe' ? '\u2692 ' : '\u25A3 ') + r.nutzung + '</span></td>' +
      '<td style="text-align:right">' + r.flaeche.toFixed(2) + '</td>' +
      '<td style="text-align:right">' + (r.hoehe > 0 ? r.hoehe.toFixed(2) : '-') + '</td>' +
      '<td style="text-align:right">' + r.faktor + '</td>' +
      '<td style="text-align:right;font-weight:600">' + r.angerechnet.toFixed(2) + '</td>' +
      '</tr>';
  });
  tbody.innerHTML = html;

  document.getElementById('fl_tfoot').innerHTML =
    '<tr style="font-weight:700;border-top:2px solid var(--brd)"><td colspan="7">Summe (' + filtered.length + ' Positionen)</td>' +
    '<td style="text-align:right">' + totalFlaeche.toFixed(2) + '</td><td></td><td></td>' +
    '<td style="text-align:right">' + totalAngerechnet.toFixed(2) + '</td></tr>';

  // KPIs
  var wohnFlaeche = 0, gewerbeFlaeche = 0, garageFlaeche = 0, gesamtBrutto = 0;
  FLAECHEN_DATA.forEach(function (r) {
    gesamtBrutto += r.flaeche;
    if (r.nutzung === 'Wohnen') wohnFlaeche += r.angerechnet;
    if (r.nutzung === 'Gewerbe') gewerbeFlaeche += r.angerechnet;
    if (r.nutzung === 'Garage') garageFlaeche += r.flaeche;
  });
  document.getElementById('flaechen-kpis').innerHTML =
    '<div class="kpi-card"><div class="kpi-label">Gesamt Bruttoflaeche</div><div class="kpi-val">' + gesamtBrutto.toFixed(0) + ' m&sup2;</div></div>' +
    '<div class="kpi-card"><div class="kpi-label">Wohnen (angerechnet)</div><div class="kpi-val" style="color:var(--acc)">' + wohnFlaeche.toFixed(1) + ' m&sup2;</div></div>' +
    '<div class="kpi-card"><div class="kpi-label">Gewerbe (angerechnet)</div><div class="kpi-val" style="color:var(--org)">' + gewerbeFlaeche.toFixed(1) + ' m&sup2;</div></div>' +
    '<div class="kpi-card"><div class="kpi-label">Garagen (Bruttoflaeche)</div><div class="kpi-val" style="color:var(--pur)">' + garageFlaeche.toFixed(1) + ' m&sup2;</div></div>';

  // Summary by unit
  var units = {};
  FLAECHEN_DATA.forEach(function (r) {
    var key = r.einheit;
    if (!units[key]) units[key] = {einheit: key, flaeche: 0, angerechnet: 0, nutzung: r.nutzung, lage: r.lage, bez: r.bez};
    units[key].flaeche += r.flaeche;
    units[key].angerechnet += r.angerechnet;
  });
  var unitHtml = '';
  Object.keys(units).forEach(function (key) {
    var u = units[key];
    var col = u.nutzung === 'Wohnen' ? 'var(--acc)' : u.nutzung === 'Gewerbe' ? 'var(--org)' : 'var(--pur)';
    unitHtml += '<div class="kpi-card" style="border-left:3px solid ' + col + '">' +
      '<div class="kpi-label">' + u.einheit + ' &mdash; ' + u.lage + '</div>' +
      '<div class="kpi-val" style="font-size:1.3rem">' + u.angerechnet.toFixed(1) + ' m&sup2;</div>' +
      '<div style="font-size:.8rem;color:var(--txt2)">' + u.bez + '</div>' +
      '<div style="font-size:.75rem;margin-top:.3rem;color:var(--txt2)">Brutto: ' + u.flaeche.toFixed(1) + ' m&sup2; | ' + u.nutzung + '</div>' +
      '</div>';
  });
  document.getElementById('fl_units_summary').innerHTML = unitHtml;

  // Betriebskosten
  var bkHtml = '';
  var bkTotal = 0;
  BETRIEBSKOSTEN.forEach(function (b) {
    bkTotal += b.betrag;
    bkHtml += '<tr><td>' + b.nr + '</td><td>' + b.pos + '</td><td style="text-align:right">' + b.betrag.toLocaleString('de-DE', {minimumFractionDigits: 2}) + ' \u20AC</td></tr>';
  });
  document.getElementById('bk_tbody').innerHTML = bkHtml;
  document.getElementById('bk_total').innerHTML = bkTotal.toLocaleString('de-DE', {minimumFractionDigits: 2}) + ' \u20AC';
  document.getElementById('bk_monthly').innerHTML = (bkTotal / 12).toLocaleString('de-DE', {minimumFractionDigits: 2}) + ' \u20AC';
  document.getElementById('bk_sqm').innerHTML = (bkTotal / 280).toLocaleString('de-DE', {minimumFractionDigits: 2}) + ' \u20AC/m\u00B2';
}

// ═══════════════════════════════════════════
// PROJEKTSTRUKTURPLAN / GANTT
// ═══════════════════════════════════════════

var GANTT_MONTHS = ['Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
var GANTT_START = 3; // Maerz = Monat 3
var GANTT_COLS = 10; // 10 Monate

var GANTT_PHASES = [
  { name: 'Ankauf & Due Diligence', color: 'var(--acc)', tasks: [
    {name: 'Kaufvertragsentwurf Notar', start: 3, end: 4, progress: 40, status: 'aktiv'},
    {name: 'Due Diligence rechtlich', start: 3, end: 5, progress: 10, status: 'aktiv'},
    {name: 'Due Diligence technisch', start: 3, end: 5, progress: 5, status: 'aktiv'},
    {name: 'Grundbuch & Baulastencheck', start: 3, end: 4, progress: 20, status: 'aktiv'},
    {name: 'Notartermin / Beurkundung', start: 4, end: 5, progress: 0, status: 'offen'}
  ]},
  { name: 'WEG-Teilung & Genehmigungen', color: 'var(--pur)', tasks: [
    {name: 'Aufteilungsplan (Architekt)', start: 4, end: 5, progress: 0, status: 'offen'},
    {name: 'Abgeschlossenheitsbescheinigung', start: 5, end: 6, progress: 0, status: 'offen'},
    {name: 'Teilungserklaerung (Notar)', start: 5, end: 7, progress: 0, status: 'offen'},
    {name: 'Genehmigung \u00A7250 BauGB', start: 5, end: 7, progress: 0, status: 'offen'},
    {name: 'Grundbucheintrag WEG', start: 7, end: 8, progress: 0, status: 'offen'}
  ]},
  { name: 'Finanzierung', color: 'var(--grn)', tasks: [
    {name: 'Bankangebote einholen', start: 3, end: 4, progress: 50, status: 'aktiv'},
    {name: 'KfW-Antrag (BEG 261)', start: 3, end: 5, progress: 15, status: 'aktiv'},
    {name: 'IBB Foerderdarlehen', start: 3, end: 5, progress: 10, status: 'aktiv'},
    {name: 'Kreditvertrag abschliessen', start: 5, end: 6, progress: 0, status: 'offen'},
    {name: 'Auszahlung / Kaufpreis', start: 5, end: 6, progress: 0, status: 'offen'}
  ]},
  { name: 'Sanierung Gewerbe (Richardstr. 72)', color: 'var(--org)', tasks: [
    {name: 'Heizung erneuern', start: 6, end: 8, progress: 0, status: 'offen'},
    {name: 'Elektrik / Strom', start: 6, end: 7, progress: 0, status: 'offen'},
    {name: 'Dach & Daemmung', start: 7, end: 9, progress: 0, status: 'offen'},
    {name: 'Solaranlage installieren', start: 8, end: 10, progress: 0, status: 'offen'},
    {name: 'Scheune DG Ausbau', start: 7, end: 11, progress: 0, status: 'offen'}
  ]},
  { name: 'Sanierung Wohnen (Haus 1)', color: 'var(--cyn)', tasks: [
    {name: 'Sanierungsplanung', start: 6, end: 7, progress: 0, status: 'offen'},
    {name: 'WE2 Renovierung (EG rechts)', start: 7, end: 9, progress: 0, status: 'offen'},
    {name: 'Gemeinschaftsflaechen', start: 8, end: 10, progress: 0, status: 'offen'},
    {name: 'Treppenhaus / Fassade', start: 9, end: 11, progress: 0, status: 'offen'}
  ]},
  { name: 'Verkauf Wohneinheiten', color: 'var(--red)', tasks: [
    {name: 'Expose WE2 & WE3 erstellen', start: 5, end: 6, progress: 15, status: 'aktiv'},
    {name: 'Besichtigungen / Verhandlungen', start: 6, end: 8, progress: 0, status: 'offen'},
    {name: 'Notartermine WE-Kaeufer', start: 8, end: 9, progress: 0, status: 'offen'},
    {name: 'Uebergabe WE2 (Kolja)', start: 9, end: 10, progress: 0, status: 'offen'},
    {name: 'Uebergabe WE3 (Lina)', start: 9, end: 10, progress: 0, status: 'offen'}
  ]},
  { name: 'Abschluss & Verwaltung', color: '#a3e635', tasks: [
    {name: 'Endabnahmen Sanierung', start: 11, end: 11, progress: 0, status: 'offen'},
    {name: 'Hausverwaltung beauftragen', start: 11, end: 12, progress: 0, status: 'offen'},
    {name: '1. WEG-Versammlung', start: 12, end: 12, progress: 0, status: 'offen'},
    {name: 'Projektabschluss', start: 12, end: 12, progress: 0, status: 'offen'}
  ]}
];

var GANTT_MILESTONES = [
  {name: 'Kaufvertrag beurkundet', month: 5, color: 'var(--acc)'},
  {name: 'Finanzierung gesichert', month: 6, color: 'var(--grn)'},
  {name: 'WEG-Teilung genehmigt', month: 7, color: 'var(--pur)'},
  {name: 'Baubeginn Sanierung', month: 6, color: 'var(--org)'},
  {name: 'WE2 + WE3 verkauft', month: 9, color: 'var(--red)'},
  {name: 'Sanierung abgeschlossen', month: 11, color: 'var(--cyn)'},
  {name: 'Projekt abgeschlossen', month: 12, color: '#a3e635'}
];

function renderGantt() {
  // Current month for "today" line
  var now = new Date();
  var curMonth = now.getMonth() + 1; // 1-12
  var curYear = now.getFullYear();
  var todayCol = (curYear === 2026 && curMonth >= 3 && curMonth <= 12) ? curMonth - GANTT_START : -1;

  // KPIs
  var totalTasks = 0, totalProgress = 0;
  GANTT_PHASES.forEach(function (ph) {
    ph.tasks.forEach(function (t) {
      totalTasks++;
      totalProgress += t.progress;
    });
  });
  var avgProgress = totalTasks > 0 ? Math.round(totalProgress / totalTasks) : 0;
  var monthsLeft = 12 - curMonth + (curYear < 2026 ? 12 : 0);
  if (curYear > 2026) monthsLeft = 0;

  var kpiEl = $('gantt-kpis');
  if (kpiEl) {
    kpiEl.innerHTML =
      '<div class="kpi-card"><div class="kpi-value">Mrz 2026</div><div class="kpi-label">Projektstart</div></div>' +
      '<div class="kpi-card"><div class="kpi-value">Dez 2026</div><div class="kpi-label">Projektende</div></div>' +
      '<div class="kpi-card"><div class="kpi-value" style="color:' + (avgProgress > 50 ? 'var(--grn)' : avgProgress > 20 ? 'var(--org)' : 'var(--red)') + '">' + avgProgress + ' %</div><div class="kpi-label">Fortschritt gesamt</div></div>' +
      '<div class="kpi-card"><div class="kpi-value">' + totalTasks + '</div><div class="kpi-label">Aufgaben</div></div>' +
      '<div class="kpi-card"><div class="kpi-value">' + GANTT_MILESTONES.length + '</div><div class="kpi-label">Meilensteine</div></div>' +
      '<div class="kpi-card"><div class="kpi-value">' + (monthsLeft > 0 ? monthsLeft : 0) + '</div><div class="kpi-label">Monate verbleibend</div></div>';
  }

  // Gantt Chart
  var chartEl = $('gantt-chart');
  if (!chartEl) return;
  var h = '';

  // Month header row
  h += '<div class="gantt-row gantt-header-row">';
  h += '<div class="gantt-label" style="font-weight:600;color:var(--txt)">Aufgabe</div>';
  h += '<div class="gantt-timeline">';
  for (var m = 0; m < GANTT_COLS; m++) {
    var isToday = (m === todayCol);
    h += '<div class="gantt-month-header' + (isToday ? ' today' : '') + '">' + GANTT_MONTHS[m] + '</div>';
  }
  h += '</div></div>';

  // Phases and tasks
  GANTT_PHASES.forEach(function (phase) {
    // Phase header
    h += '<div class="gantt-phase-header" style="border-left:4px solid ' + phase.color + '">';
    h += '<span style="color:' + phase.color + ';font-weight:700">' + phase.name + '</span>';
    var phProg = 0;
    phase.tasks.forEach(function (t) { phProg += t.progress; });
    phProg = phase.tasks.length > 0 ? Math.round(phProg / phase.tasks.length) : 0;
    h += '<span style="font-size:11px;color:var(--mut);margin-left:auto">' + phProg + ' %</span>';
    h += '</div>';

    // Tasks
    phase.tasks.forEach(function (task) {
      var colStart = task.start - GANTT_START + 1;
      var colEnd = task.end - GANTT_START + 2;
      if (colStart < 1) colStart = 1;
      if (colEnd > GANTT_COLS + 1) colEnd = GANTT_COLS + 1;

      var statusTag = '';
      if (task.status === 'aktiv') statusTag = '<span class="tag tag-orange" style="margin-left:6px;font-size:8px">\u25CB aktiv</span>';
      else if (task.status === 'done') statusTag = '<span class="tag tag-green" style="margin-left:6px;font-size:8px">\u2713 fertig</span>';

      h += '<div class="gantt-row">';
      h += '<div class="gantt-label">' + task.name + statusTag + '</div>';
      h += '<div class="gantt-timeline">';

      // Today line
      if (todayCol >= 0) {
        var todayPct = ((todayCol + 0.35) / GANTT_COLS) * 100;
        h += '<div class="gantt-today-line" style="left:' + todayPct + '%"></div>';
      }

      // Bar
      h += '<div class="gantt-bar" style="grid-column:' + colStart + '/' + colEnd + ';background:' + phase.color + '30;border:1px solid ' + phase.color + '60">';
      if (task.progress > 0) {
        h += '<div class="gantt-bar-fill" style="width:' + task.progress + '%;background:' + phase.color + '"></div>';
      }
      h += '</div>';
      h += '</div></div>';
    });
  });

  chartEl.innerHTML = h;

  // Milestones
  var msEl = $('gantt-milestones');
  if (msEl) {
    var msH = '<div class="gantt-row gantt-header-row">';
    msH += '<div class="gantt-label" style="font-weight:600;color:var(--txt)">Meilenstein</div>';
    msH += '<div class="gantt-timeline">';
    for (var mi = 0; mi < GANTT_COLS; mi++) {
      msH += '<div class="gantt-month-header">' + GANTT_MONTHS[mi] + '</div>';
    }
    msH += '</div></div>';

    GANTT_MILESTONES.forEach(function (ms) {
      var col = ms.month - GANTT_START + 1;
      msH += '<div class="gantt-row">';
      msH += '<div class="gantt-label" style="font-size:12px">' + ms.name + '</div>';
      msH += '<div class="gantt-timeline">';
      if (todayCol >= 0) {
        var tp = ((todayCol + 0.35) / GANTT_COLS) * 100;
        msH += '<div class="gantt-today-line" style="left:' + tp + '%"></div>';
      }
      msH += '<div style="grid-column:' + col + '/' + (col + 1) + ';display:flex;justify-content:center;align-items:center">';
      msH += '<span class="gantt-diamond" style="color:' + ms.color + '">&#x25C6;</span>';
      msH += '</div>';
      msH += '</div></div>';
    });
    msEl.innerHTML = msH;
  }

  // Phase details
  var detEl = $('gantt-details');
  if (detEl) {
    var dH = '';
    GANTT_PHASES.forEach(function (phase) {
      var phProg = 0, done = 0, aktiv = 0, offen = 0;
      phase.tasks.forEach(function (t) {
        phProg += t.progress;
        if (t.status === 'done') done++;
        else if (t.status === 'aktiv') aktiv++;
        else offen++;
      });
      phProg = phase.tasks.length > 0 ? Math.round(phProg / phase.tasks.length) : 0;
      var startM = 12, endM = 3;
      phase.tasks.forEach(function (t) { if (t.start < startM) startM = t.start; if (t.end > endM) endM = t.end; });

      dH += '<div class="stat-box" style="border-left:3px solid ' + phase.color + '">';
      dH += '<h3 style="color:' + phase.color + '">' + phase.name + '</h3>';
      dH += '<div class="progress-bar" style="margin:8px 0"><div class="progress-fill" style="width:' + phProg + '%;background:' + phase.color + '"></div></div>';
      dH += '<div style="font-size:11px;color:var(--mut);margin-bottom:8px">' + phProg + ' % abgeschlossen</div>';
      dH += '<table style="font-size:12px">';
      dH += '<tr><td>Zeitraum</td><td>' + GANTT_MONTHS[startM - 3] + ' \u2014 ' + GANTT_MONTHS[endM - 3] + ' 2026</td></tr>';
      dH += '<tr><td>Aufgaben</td><td>' + phase.tasks.length + ' (' + done + ' fertig, ' + aktiv + ' aktiv, ' + offen + ' offen)</td></tr>';
      phase.tasks.forEach(function (t) {
        var sCol = t.status === 'done' ? 'var(--grn)' : t.status === 'aktiv' ? 'var(--org)' : 'var(--mut)';
        var sIcon = t.status === 'done' ? '\u2705' : t.status === 'aktiv' ? '\u23F3' : '\u25CB';
        dH += '<tr><td style="color:' + sCol + '">' + sIcon + ' ' + t.name + '</td><td style="color:' + sCol + '">' + t.progress + ' %</td></tr>';
      });
      dH += '</table></div>';
    });
    detEl.innerHTML = dH;
  }
}

// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════

function renderDashboard() {
  // Calculate progress from GANTT_PHASES
  var totalTasks = 0, totalProgress = 0;
  var phaseData = [];
  GANTT_PHASES.forEach(function(ph) {
    var phProg = 0;
    var done = 0, aktiv = 0, offen = 0;
    ph.tasks.forEach(function(t) {
      totalTasks++;
      totalProgress += t.progress;
      phProg += t.progress;
      if (t.status === 'done') done++;
      else if (t.status === 'aktiv') aktiv++;
      else offen++;
    });
    phProg = ph.tasks.length > 0 ? Math.round(phProg / ph.tasks.length) : 0;
    phaseData.push({ name: ph.name, color: ph.color, progress: phProg, total: ph.tasks.length, done: done, aktiv: aktiv, offen: offen });
  });
  var avgProgress = totalTasks > 0 ? Math.round(totalProgress / totalTasks) : 0;

  var now = new Date();
  var curMonth = now.getMonth() + 1;
  var curYear = now.getFullYear();
  var monthsLeft = 12 - curMonth + (curYear < 2026 ? 12 : 0);
  if (curYear > 2026) monthsLeft = 0;
  var activeTasks = 0, openTasks = 0;
  GANTT_PHASES.forEach(function(ph) {
    ph.tasks.forEach(function(t) {
      if (t.status === 'aktiv') activeTasks++;
      if (t.status === 'offen') openTasks++;
    });
  });

  // ─── KPIs ───
  var kpiEl = $('dash-kpis');
  if (kpiEl) {
    var progCol = avgProgress > 50 ? 'var(--grn)' : avgProgress > 20 ? 'var(--org)' : 'var(--red)';
    kpiEl.innerHTML =
      '<div class="kpi-card"><div class="kpi-value" style="color:' + progCol + '">' + avgProgress + ' %</div><div class="kpi-label">Fortschritt</div></div>' +
      '<div class="kpi-card"><div class="kpi-value">' + activeTasks + '</div><div class="kpi-label">Aktive Aufgaben</div></div>' +
      '<div class="kpi-card"><div class="kpi-value">' + (monthsLeft > 0 ? monthsLeft : 0) + '</div><div class="kpi-label">Monate verbleibend</div></div>' +
      '<div class="kpi-card"><div class="kpi-value">2.000.000 \u20AC</div><div class="kpi-label">Kaufpreis</div></div>' +
      '<div class="kpi-card"><div class="kpi-value">250.000 \u20AC</div><div class="kpi-label">EK (mit Morits)</div></div>' +
      '<div class="kpi-card"><div class="kpi-value">~947 m\u00B2</div><div class="kpi-label">Nutzflaeche</div></div>';
  }

  // ─── Hero Progress ───
  var heroEl = $('dash-hero');
  if (heroEl) {
    var heroCol = avgProgress > 50 ? 'var(--grn)' : avgProgress > 20 ? 'var(--org)' : 'var(--acc)';
    heroEl.innerHTML =
      '<div class="dash-hero-inner">' +
      '<div class="dash-hero-top">' +
      '<span class="dash-hero-pct" style="color:' + heroCol + '">' + avgProgress + '%</span>' +
      '<span class="dash-hero-label">Gesamtfortschritt Projekt</span>' +
      '</div>' +
      '<div class="progress-bar" style="height:16px;border-radius:8px"><div class="progress-fill" style="width:' + avgProgress + '%;background:' + heroCol + ';border-radius:8px;transition:width 1s ease"></div></div>' +
      '<div class="dash-hero-range"><span>Mrz 2026 \u2014 Projektstart</span><span>Dez 2026 \u2014 Abschluss</span></div>' +
      '</div>';
  }

  // ─── Phase Progress Cards ───
  var phEl = $('dash-phases');
  if (phEl) {
    var phH = '';
    phaseData.forEach(function(p) {
      var fillCol = p.progress > 50 ? 'green' : p.progress > 20 ? 'orange' : '';
      var statusParts = [];
      if (p.done > 0) statusParts.push(p.done + ' fertig');
      if (p.aktiv > 0) statusParts.push(p.aktiv + ' aktiv');
      if (p.offen > 0) statusParts.push(p.offen + ' offen');
      phH += '<div class="card dash-phase-card" style="border-left:3px solid ' + p.color + '" onclick="navigateToPage(\'gantt\')">';
      phH += '<h3 style="color:' + p.color + ';font-size:13px;margin-bottom:8px">' + p.name + '</h3>';
      phH += '<div class="progress-bar"><div class="progress-fill ' + fillCol + '" style="width:' + p.progress + '%"></div></div>';
      phH += '<div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--mut)">';
      phH += '<span style="font-weight:600">' + p.progress + ' %</span>';
      phH += '<span>' + statusParts.join(', ') + '</span>';
      phH += '</div></div>';
    });
    phEl.innerHTML = phH;
  }

  // ─── To-Dos ───
  var todoEl = $('dash-todos');
  if (todoEl) {
    var todos = [];
    // Collect from Trello board
    for (var listName in board) {
      var cards = board[listName];
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        var prio = 3;
        if (c.lb) {
          for (var j = 0; j < c.lb.length; j++) {
            if (c.lb[j].indexOf('Dringend') >= 0 || c.lb[j].indexOf('Heissester') >= 0) prio = 1;
            else if (c.lb[j].indexOf('Bearbeitung') >= 0) prio = 2;
          }
        }
        if (prio <= 2) {
          todos.push({ name: c.n, desc: c.d || '', list: listName, prio: prio, tag: (c.lb && c.lb[0]) || (prio === 1 ? 'Dringend' : 'In Bearbeitung') });
        }
      }
    }
    // Add active GANTT tasks
    GANTT_PHASES.forEach(function(ph) {
      ph.tasks.forEach(function(t) {
        if (t.status === 'aktiv') {
          todos.push({ name: t.name, desc: t.progress + '% abgeschlossen', list: ph.name, prio: 2, tag: 'Aktiv' });
        }
      });
    });
    todos.sort(function(a, b) { return a.prio - b.prio; });
    todos = todos.slice(0, 12);

    var tdH = '';
    for (var k = 0; k < todos.length; k++) {
      var td = todos[k];
      var tagCls = td.prio === 1 ? 'tag-red' : 'tag-orange';
      var tagIcon = td.prio === 1 ? '\u26A0 ' : '\u25CB ';
      tdH += '<div class="dash-todo-item">';
      tdH += '<div class="dash-todo-head">';
      tdH += '<span class="tag ' + tagCls + '" style="font-size:9px">' + tagIcon + td.tag + '</span>';
      tdH += '<span class="dash-todo-list">' + td.list + '</span>';
      tdH += '</div>';
      tdH += '<div class="dash-todo-title">' + td.name + '</div>';
      if (td.desc) tdH += '<div class="dash-todo-desc">' + td.desc + '</div>';
      tdH += '</div>';
    }
    todoEl.innerHTML = tdH;
  }

  // ─── Calendar ───
  var calEl = $('dash-calendar');
  if (calEl) {
    calEl.innerHTML =
      '<div class="cal-embed">' +
      '<iframe src="https://calendar.google.com/calendar/embed?src=tuntefrizzante%40gmail.com&ctz=Europe%2FBerlin&mode=AGENDA&showTitle=0&showCalendars=0&showPrint=0&showTabs=0&showDate=1" style="width:100%;height:500px;border:none;border-radius:8px" frameborder="0" scrolling="no"></iframe>' +
      '</div>';
  }

  // ─── Quick Links ───
  var qlEl = $('dash-quicklinks');
  if (qlEl) {
    qlEl.innerHTML =
      '<div class="card" onclick="navigateToPage(\'fin\')"><span class="nav-icon" style="font-size:22px">&#x1F4B0;</span><h3>Finanzen</h3><p>EK, Finanzierung, Renovierung</p></div>' +
      '<div class="card" onclick="navigateToPage(\'buyer\')"><span class="nav-icon" style="font-size:22px">&#x1F3E0;</span><h3>Kaeufer</h3><p>WEG-Kaeufer &amp; Interessenten</p></div>' +
      '<div class="card" onclick="navigateToPage(\'gantt\')"><span class="nav-icon" style="font-size:22px">&#x1F4C5;</span><h3>Projektplan</h3><p>Gantt-Chart &amp; Meilensteine</p></div>' +
      '<div class="card" onclick="navigateToPage(\'finrechner\')"><span class="nav-icon" style="font-size:22px">&#x1F4B3;</span><h3>Finanzierungsrechner</h3><p>5 Darlehenstranchen</p></div>' +
      '<div class="card" onclick="navigateToPage(\'flaechen\')"><span class="nav-icon" style="font-size:22px">&#x1F4D0;</span><h3>Flaechen</h3><p>Nutzflaechen &amp; Betriebskosten</p></div>' +
      '<div class="card" onclick="navigateToPage(\'dd\')"><span class="nav-icon" style="font-size:22px">&#x1F50D;</span><h3>Due Diligence</h3><p>Grundbuch, Baulasten, Altlasten</p></div>';
  }
}
