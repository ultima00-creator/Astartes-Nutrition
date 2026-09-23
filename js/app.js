const KEY = "astartes_codex_v1";
const APP_VER = "1.7.0";
const MEALS = [
  { id: "cafe", name: "Café da Manhã", latin: "Prandium" },
  { id: "almoco", name: "Almoço", latin: "Merenda" },
  { id: "jantar", name: "Jantar", latin: "Cena" },
  { id: "lanches", name: "Lanches", latin: "Inter horas" }
];
const ACT = [
  { id: "1.2", n: "Sedentário", d: "Pouco ou nenhum exercício" },
  { id: "1.375", n: "Leve", d: "1–3 dias / semana" },
  { id: "1.55", n: "Moderado", d: "3–5 dias / semana" },
  { id: "1.725", n: "Ativo", d: "6–7 dias / semana" },
  { id: "1.9", n: "Muito ativo", d: "Trabalho físico + treino" }
];
const PROT = [
  { g: 1.5, n: "1,5 g/kg", d: "Volume leve · manutenção" },
  { g: 1.8, n: "1,8 g/kg", d: "Doutrina padrão" },
  { g: 2.0, n: "2,0 g/kg", d: "Déficit · enhanced · preservar massa" }
];
const CUT_WEEKS_DEFAULT = 10;
const CUT_DEFICIT = [
  { pct: 10, n: "−10%", d: "Conservador · protege mais massa" },
  { pct: 15, n: "−15%", d: "Doutrina padrão do Códice" },
  { pct: 20, n: "−20%", d: "Agressivo · janela mais curta" },
  { pct: 25, n: "−25%", d: "Duro · recurso de sobra" },
  { pct: 30, n: "−30%", d: "Extremo" },
  { pct: 40, n: "−40%", d: "Cerco" },
  { pct: 50, n: "−50%", d: "Teto do Códice · metade do GET" }
];
function cutDeficitPct(p) {
  const x = Number(p && p.cutDeficitPct);
  if (x >= 5 && x <= 50) return Math.round(x);
  return 15;
}
function deficitPicker(cur) {
  cur = cutDeficitPct({ cutDeficitPct: cur });
  return CUT_DEFICIT.map(x => `
    <label class="dose ${cur === x.pct ? "on" : ""}">
      <input type="radio" name="cutDef" value="${x.pct}" ${cur === x.pct ? "checked" : ""}>
      <b>${x.n}</b><small>${x.d}</small>
    </label>`).join("");
}
const CUT_DOCTRINE = [
  { id: "marine", weeks: 10, n: "Marine", d: "10 semanas — cenário padrão. É o caminho do Códice." },
  { id: "ultra", weeks: 16, n: "Ultra Marine", d: "16 semanas — opcional. Só se você selar por conta própria, com recursos de sobra." }
];
function doctrineOf(p) {
  const id = p && p.cutDoctrine === "ultra" ? "ultra" : "marine";
  return CUT_DOCTRINE.find(x => x.id === id);
}
const DRI = {
  fiber: 25, na: 2000, ca: 1000, fe: 14, mg: 320, zn: 11, k: 3500, phos: 700,
  se: 55, a: 800, c: 90, d: 15, e: 15, k_vit: 90,
  b1: 1.2, b2: 1.3, b3: 16, b6: 1.3, b12: 2.4, fol: 400, chol: 300, sugar: 50
};
const NUTRI_ROWS = [
  ["Energia", "kcal", "kcal", null],
  ["Proteína", "p", "g", null],
  ["Carboidratos", "c", "g", null],
  ["Gordura", "f", "g", null],
  ["Fibra", "fiber", "g", "fiber"],
  ["Açúcares", "sugar", "g", "sugar"],
  ["Gordura saturada", "sat", "g", null],
  ["Colesterol", "chol", "mg", "chol"],
  ["Sódio", "na", "mg", "na"],
  ["Cálcio", "ca", "mg", "ca"],
  ["Ferro", "fe", "mg", "fe"],
  ["Magnésio", "mg", "mg", "mg"],
  ["Zinco", "zn", "mg", "zn"],
  ["Potássio", "k", "mg", "k"],
  ["Fósforo", "phos", "mg", "phos"],
  ["Selênio", "se", "µg", "se"],
  ["Vitamina A", "a", "µg", "a"],
  ["Vitamina C", "c_vit", "mg", "c"],
  ["Vitamina D", "d", "µg", "d"],
  ["Vitamina E", "e", "mg", "e"],
  ["Vitamina K", "k_vit", "µg", "k_vit"],
  ["B1 Tiamina", "b1", "mg", "b1"],
  ["B2 Riboflavina", "b2", "mg", "b2"],
  ["B3 Niacina", "b3", "mg", "b3"],
  ["B6", "b6", "mg", "b6"],
  ["B12", "b12", "µg", "b12"],
  ["Folato", "fol", "µg", "fol"]
];

let S = load();
let viewDate = today();
let pendingMeal = "almoco";
let filterCat = "Todos";
let installEvt = null;

function today() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY)) || blank();
    if (raw.profile) {
      raw.profile.proteinPerKg = [1.5, 1.8, 2].includes(Number(raw.profile.proteinPerKg))
        ? Number(raw.profile.proteinPerKg)
        : normProt(raw.profile.proteinPerKg);
      if (raw.profile.goal === "cut" && !raw.profile.cutStart) raw.profile.cutStart = today();
      if (raw.profile.cutDoctrine === "optimal" || raw.profile.cutDoctrine === "cruise") raw.profile.cutDoctrine = "marine";
      if (!raw.profile.cutDoctrine) raw.profile.cutDoctrine = Number(raw.profile.cutWeeks) >= 14 ? "ultra" : "marine";
      raw.profile.cutWeeks = doctrineOf(raw.profile).weeks;
      if (raw.profile.cutDeficitPct == null) raw.profile.cutDeficitPct = 15;
      raw.profile.cutDeficitPct = cutDeficitPct(raw.profile);
    }
    if (!raw.favs) raw.favs = [];
    if (!raw.weights) raw.weights = [];
    raw.notify = Object.assign(defaultNotify(), raw.notify || {});
    return raw;
  } catch { return blank(); }
}
function blank() {
  return { profile: null, custom: [], recipes: [], favs: [], diary: {}, weights: [], notify: defaultNotify() };
}
function defaultNotify() {
  return {
    on: false,
    water: true,
    waterH: 3,
    meals: true,
    cafe: "08:00",
    almoco: "12:30",
    jantar: "19:30",
    peso: false,
    pesoAt: "08:00",
    cut: true,
    last: {}
  };
}
function save() { localStorage.setItem(KEY, JSON.stringify(S)); }

function allFoods() {
  const custom = (S.custom || []).map(f => ({ ...f, source: "custom" }));
  const rec = (S.recipes || []).map(r => ({ ...r, source: "recipe" }));
  return [...rec, ...custom, ...ASTARTES_FOODS];
}
function foodById(id) { return allFoods().find(f => f.id === id); }

function tmb(p) {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return Math.round(p.sex === "M" ? base + 5 : base - 161);
}
function getKcal(p) { return Math.round(tmb(p) * Number(p.activity)); }
const BULK_MIN = 250;
const BREAK_DAYS = 14;
function bulkSurplus(p) {
  const g = getKcal(p);
  return Math.max(BULK_MIN, Math.round(g * 0.10));
}
function cutAvgKcal(p) {
  return Math.round(getKcal(p) * (1 - cutDeficitPct(p) / 100));
}
function cutLowKcal(p) {
  const g = getKcal(p);
  const avg = cutAvgKcal(p);
  return Math.max(Math.round(g * 0.35), 2 * avg - g);
}
function cutHighKcal(p) {
  const g = getKcal(p);
  const avg = cutAvgKcal(p);
  return Math.min(g, 2 * avg - cutLowKcal(p));
}
function cyclePhase(p, date) {
  if (!p || p.goal !== "cut" || !p.carbCycle) return null;
  const start = p.carbCycleStart || p.cutStart || date || today();
  const n = Math.max(0, daysBetween(start, date || today()));
  return n % 2 === 0 ? "high" : "low";
}
function targetKcal(p, date) {
  const g = getKcal(p);
  if (p.goal === "cut") {
    const ph = cyclePhase(p, date);
    if (ph === "high") return cutHighKcal(p);
    if (ph === "low") return cutLowKcal(p);
    return cutAvgKcal(p);
  }
  if (p.goal === "bulk") return g + bulkSurplus(p);
  return g;
}
function normProt(v) {
  const x = Number(v) || 1.8;
  if (x <= 1.65) return 1.5;
  if (x >= 1.95) return 2;
  return 1.8;
}
function targets(p, date) {
  date = date || viewDate || today();
  const ph = cyclePhase(p, date);
  const kcal = targetKcal(p, date);
  const prot = Math.round(normProt(p.proteinPerKg) * p.weight);
  const avg = p.goal === "cut" ? cutAvgKcal(p) : kcal;
  const fat = Math.round((avg * (p.fatPct || 0.27)) / 9);
  const carb = Math.max(0, Math.round((kcal - prot * 4 - fat * 9) / 4));
  return {
    kcal, prot, carb, fat, get: getKcal(p), tmb: tmb(p),
    pkg: normProt(p.proteinPerKg),
    phase: ph,
    surplus: p.goal === "bulk" ? bulkSurplus(p) : 0,
    deficit: p.goal === "cut" ? getKcal(p) - kcal : 0,
    avgCut: p.goal === "cut" ? avg : kcal
  };
}
function daysBetween(a, b) {
  const A = new Date(a + "T12:00:00");
  const B = new Date(b + "T12:00:00");
  return Math.round((B - A) / 86400000);
}
function weightOnOrBefore(iso) {
  const rows = (S.weights || []).filter(w => w.date <= iso).sort((a,b) => a.date.localeCompare(b.date));
  if (rows.length) return rows[rows.length - 1].kg;
  return S.profile ? S.profile.weight : null;
}
function cutEffective(p, date) {
  const start = p.cutStart || date;
  const w0 = weightOnOrBefore(start);
  const w1 = S.profile ? S.profile.weight : null;
  const lost = (w0 != null && w1 != null) ? +(w0 - w1).toFixed(1) : 0;
  const byScale = w0 != null && w1 != null && (lost >= 1 || (w0 > 0 && lost / w0 >= 0.015));
  const byRecomp = !!p.recompSuccessful;
  return { ok: byScale || byRecomp, lost, w0, w1, byScale, byRecomp };
}
function cutState(p, date) {
  if (!p || p.goal !== "cut") return null;
  const doc = doctrineOf(p);
  const start = p.cutStart || date || today();
  const weeksTarget = doc.weeks;
  const elapsed = Math.max(0, daysBetween(start, date || today()));
  const dayN = elapsed + 1;
  const weekN = Math.min(weeksTarget + 4, Math.floor(elapsed / 7) + 1);
  const remain = weeksTarget * 7 - dayN;
  const weekExact = elapsed / 7;
  let phase = "ok", banner = "Campanha estável. Preserve carga nos compostos.";
  if (doc.id === "ultra" && weekExact >= 10 && dayN <= weeksTarget * 7) {
    phase = "warn";
    banner = "Você passou das 10 semanas Marine. Ultra Marine é opcional — não é promoção automática. Se não selou esse teto de propósito, encerre ou abra diet break.";
  }
  if (dayN > weeksTarget * 7) {
    phase = "adapt";
    banner = doc.id === "ultra"
      ? "Ultra Marine de 16 semanas encerrado. A adaptação chega mesmo nesse teto: diet break em manutenção ou fim de campanha."
      : "Marine de 10 semanas vencido. Caminhos: diet break ou Ultra Marine (opt-in). Bulk-up só se o corte tiver sido efetivo.";
  } else if (dayN > (weeksTarget - 2) * 7) {
    phase = "warn";
    banner = doc.id === "ultra"
      ? "Últimas 2 semanas do Ultra Marine. Sem recursos de sobra, não estique: encerre ou abra diet break."
      : "Últimas 2 semanas do Marine. Em breve: diet break ou Ultra Marine. Bulk-up se o corte for efetivo.";
  }
  return { start, weeksTarget, dayN, weekN, remain, phase, banner, doc, pct: Math.min(100, (dayN / (weeksTarget * 7)) * 100) };
}
function breakState(p, date) {
  if (!p || p.goal !== "break") return null;
  const start = p.breakStart || date || today();
  const daysTarget = Number(p.breakDays) || BREAK_DAYS;
  const elapsed = Math.max(0, daysBetween(start, date || today()));
  const dayN = elapsed + 1;
  const remain = daysTarget - dayN;
  let phase = "ok";
  let banner = "GET honrado: TMB no peso atual × atividade. Sem déficit disfarçado. 7 dias aliviam; 14 fecha a janela.";
  if (dayN > daysTarget) {
    phase = "adapt";
    banner = "Janela de diet break encerrada. Recalcule o peso, depois retome Marine ou sele Bulk-up.";
  } else if (dayN > daysTarget - 3) {
    phase = "warn";
    banner = "Reta final do break. Pese-se e decida: retomar o déficit ou abrir Bulk-up.";
  }
  return { start, daysTarget, dayN, remain, phase, banner, pct: Math.min(100, (dayN / daysTarget) * 100) };
}
function protPicker(name, selected) {
  const cur = normProt(selected);
  return PROT.map(x => `
    <label class="dose ${cur === x.g ? "on" : ""}">
      <input type="radio" name="${name}" value="${x.g}" ${cur === x.g ? "checked" : ""}>
      <b>${x.n}</b><small>${x.d}</small>
    </label>`).join("");
}
function doctrinePicker(selected) {
  const cur = selected === "ultra" ? "ultra" : "marine";
  return CUT_DOCTRINE.map(x => `
    <label class="dose ${cur === x.id ? "on" : ""}">
      <input type="radio" name="cutDoctrine" value="${x.id}" ${cur === x.id ? "checked" : ""}>
      <b>${x.n} · ${x.weeks} sem.</b><small>${x.d}</small>
    </label>`).join("");
}
function remainTxt(n) {
  if (n >= 0) return `${n} dia${n === 1 ? "" : "s"} restantes`;
  return `${Math.abs(n)} dia${Math.abs(n) === 1 ? "" : "s"} além da janela`;
}
function campaignCard(p, date) {
  if (p.goal === "cut") {
    const cs = cutState(p, date);
    if (!cs) return "";
    const ended = cs.phase === "warn" || cs.phase === "adapt";
    const marineGate = cs.doc.id === "marine" && ended;
    const ultraEnded = cs.doc.id === "ultra" && cs.phase === "adapt";
    const eff = cutEffective(p, date);
    let choices = `<button class="btn ghost" onclick="startDietBreak()">Diet break</button>`;
    if (marineGate) choices += `<button class="btn ghost" onclick="startUltraMarine()">Ultra Marine</button>`;
    if (marineGate || ultraEnded) {
      choices += `<label class="dose ${p.recompSuccessful ? "on" : ""}" style="margin-top:8px">
        <input type="checkbox" ${p.recompSuccessful ? "checked" : ""} onchange="toggleRecomp(this.checked)">
        <b>Recomp Successful</b>
        <small>Bypass técnico. Cut válido sem critério de quilo.</small>
      </label>`;
    }
    if ((marineGate || ultraEnded) && eff.ok) {
      const why = eff.byRecomp && !eff.byScale
        ? "Recomp Successful"
        : `corte efetivo: −${fmt(eff.lost,1)} kg`;
      choices += `<button class="btn ghost" onclick="startBulk()">Bulk-up (${why})</button>`;
    } else if (marineGate || ultraEnded) {
      choices += `<p class="muted">Bulk-up oculto: sem perda de ≥1 kg / 1,5% e sem Recomp Successful (${eff.w0 || "?"} → ${eff.w1 || "?"} kg).</p>`;
    }
    return `<section class="ornate card cut-card phase-${cs.phase}">
      <h3>${cs.doc.n}<span>semana ${cs.weekN} de ${cs.weeksTarget} · dia ${cs.dayN}</span></h3>
      <div class="track cut"><i style="width:${cs.pct}%"></i></div>
      <p class="muted" style="margin:8px 0 0">Início ${cs.start.split("-").reverse().join("/")} · ${remainTxt(cs.remain)}</p>
      <p class="quote">${cs.banner}</p>
      <label class="dose ${p.carbCycle ? "on" : ""}" style="margin-top:8px">
        <input type="checkbox" ${p.carbCycle ? "checked" : ""} onchange="toggleCarbCycle(this.checked)">
        <b>Ciclo de carboidratos</b>
        <small>Opcional. 1 dia alto · 1 dia baixo. Média da dupla = déficit Marine.</small>
      </label>
      ${p.carbCycle ? `<p class="muted">Hoje: <b>${cyclePhase(p, date) === "high" ? "ALTO · meta = GET" : "BAIXO · meta = 70% GET"}</b></p>
      <button class="btn ghost" onclick="flipCarbCycle()">Inverter ciclo (começar o outro hoje)</button>` : ""}
      ${choices}
    </section>`;
  }
  if (p.goal === "break") {
    const bs = breakState(p, date);
    if (!bs) return "";
    const t = targets(p);
    const eaten = sumDay(date).kcal;
    const slack = 50;
    const pardon = Math.max(BULK_MIN, Math.round(t.get * 0.12));
    let fidelity = "Ainda sem lançamento. O erro a evitar é o déficit. Passar um pouco do GET é ruído.";
    let phase = bs.phase;
    if (eaten > 0 && eaten < t.get - slack) {
      phase = "adapt";
      fidelity = `Déficit: ${fmt(eaten)} / ${t.get} kcal (${fmt(t.get - eaten)} abaixo). Esse é o erro que o break não admite.`;
    } else if (eaten > 0 && eaten <= t.get + pardon) {
      const extra = Math.max(0, Math.round(eaten - t.get));
      fidelity = extra
        ? `GET alcançado. +${extra} kcal passa — no break isso se deixa passar.`
        : `GET no ponto: ${fmt(eaten)} / ${t.get} kcal.`;
    } else if (eaten > 0) {
      fidelity = `GET cumprido, com folga grande (+${fmt(eaten - t.get)}). Não é déficit. Só não transforme o break em bulk sem selar Bulk-up.`;
    }
    return `<section class="ornate card cut-card phase-${phase}">
      <h3>Diet Break<span>dia ${bs.dayN} de ${bs.daysTarget} · meta = GET ${t.get}</span></h3>
      <div class="track cut"><i style="width:${bs.pct}%"></i></div>
      <p class="muted" style="margin:8px 0 0">Peso ${p.weight} kg · TMB ${t.tmb} · GET ${t.get} kcal (não negociável)</p>
      <p class="quote">${bs.banner}</p>
      <p class="quote">${fidelity}</p>
      <button class="btn ghost" onclick="resumeMarine()">Retomar Marine</button>
      <button class="btn ghost" onclick="startBulk()">Abrir Bulk-up</button>
    </section>`;
  }
  if (p.goal === "bulk") {
    const t = targets(p);
    return `<section class="ornate card cut-card">
      <h3>Bulk-up<span>GET + ${t.surplus} kcal (piso ${BULK_MIN})</span></h3>
      <p class="muted">TMB ${t.tmb} · GET ${t.get} · meta ${t.kcal} kcal no peso atual (${p.weight} kg).</p>
      <p class="quote">Superávit mínimo para haver ganho. Se o peso estagnar duas semanas, o Códice pede novo peso — e o GET sobe com ele.</p>
    </section>`;
  }
  return "";
}
function dayObj(date) {
  if (!S.diary[date]) {
    S.diary[date] = { cafe: [], almoco: [], jantar: [], lanches: [], water: 0, exercise: 0 };
  }
  return S.diary[date];
}
function scaleFood(f, grams) {
  const k = grams / 100;
  return {
    grams, name: f.name, id: f.id,
    kcal: n(f.kcal) * k, p: n(f.p) * k,
    pAnimal: isAnimalFood(f) ? n(f.p) * k : 0,
    carbs: n(f.c) * k, f: n(f.f) * k,
    fiber: n(f.fiber) * k, sugar: n(f.sugar) * k, sat: n(f.sat) * k,
    chol: n(f.chol) * k, na: n(f.na) * k, ca: n(f.ca) * k,
    fe: n(f.fe) * k, mg: n(f.mg) * k, zn: n(f.zn) * k,
    k: n(f.k) * k, phos: n(f.phos) * k, se: n(f.se) * k,
    a: n(f.a) * k, c_vit: n(f.vc), d: n(f.d), e: n(f.e), k_vit: n(f.k_vit),
    b1: n(f.b1), b2: n(f.b2), b3: n(f.b3), b6: n(f.b6),
    b12: n(f.b12), fol: n(f.fol)
  };
}
function n(v) { return v == null || v === "" ? 0 : Number(v); }

function isAnimalFood(f) {
  if (!f) return false;
  if (f.animal === true) return true;
  if (f.animal === false) return false;
  const cat = foldTxt(f.cat || "");
  if (/carne|pescad|laticin|ovo/.test(cat)) return true;
  const n = foldTxt(f.name || "");
  return /whey|caseina|casein|\bleite\b|queijo|iogurte|coalhada|\bovo|ovos|frango|bovina|suina|porco|patinho|acem|peixe|camarao|atum|salmao|sardinha|carne|peru|mucarela|requeijao|presunto|bacon|linguica|salsicha/.test(n);
}
function entryAnimalP(e) {
  if (e && e.pAnimal != null) return n(e.pAnimal);
  return isAnimalFood(e) || (e && e.id && isAnimalFood(foodById(e.id))) ? n(e.p) : 0;
}
function sumDay(date) {
  const d = dayObj(date);
  const acc = emptyNut();
  MEALS.forEach(m => (d[m.id] || []).forEach(e => {
    addNut(acc, e);
    acc.pAnimal += entryAnimalP(e);
  }));
  return acc;
}
function emptyNut() {
  return { kcal:0,p:0,pAnimal:0,carbs:0,f:0,fiber:0,sugar:0,sat:0,chol:0,na:0,ca:0,fe:0,mg:0,zn:0,k:0,phos:0,se:0,a:0,c_vit:0,d:0,e:0,k_vit:0,b1:0,b2:0,b3:0,b6:0,b12:0,fol:0 };
}
function addNut(a, e) {
  Object.keys(a).forEach(k => { a[k] += n(e[k]); });
  return a;
}

function spent(date, consumedKcal) {
  if (!S.profile) return { tmb: 0, base: 0, ex: 0, tef: 0, total: 0 };
  const t = targets(S.profile);
  const base = Math.max(0, t.get - t.tmb);
  const ex = n(dayObj(date).exercise);
  const tef = Math.round(consumedKcal * 0.10);
  return { tmb: t.tmb, base, ex, tef, total: t.tmb + base + ex + tef };
}

/* ---------- view ---------- */
function $(sel) { return document.querySelector(sel); }
function show(id) {
  document.body.classList.toggle("onboard", id === "page-onboard");
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === id));
  document.querySelectorAll(".nav button[data-go]").forEach(b => b.classList.toggle("on", b.dataset.go === id));
  window.scrollTo(0, 0);
  if (id === "page-diario") renderDiario();
  if (id === "page-alimentos") renderAlimentos();
  if (id === "page-relato") renderRelato();
  if (id === "page-frater") renderFrater();
}

function renderAll() {
  if (!S.profile) { renderOnboard(); show("page-onboard"); }
  else { show("page-diario"); }
}

function renderOnboard() {
  const act = ACT.map(a => `<option value="${a.id}">${a.n} — ${a.d}</option>`).join("");
  $("#page-onboard").innerHTML = `
    <div class="splash">
      <div class="sigil"><img src="assets/icon-192.png" alt=""><div class="titles">
        <small>Codex Astartes</small><strong>Astartes Nutrition</strong>
      </div></div>
      <p class="sub">ORDO CORPORIS</p>
      <h1 class="display">Templatus Imperialis</h1>
      <p class="quote">“O corpo é a primeira fortaleza. A ração, o primeiro municiamento.”</p>
      <form class="ornate card" id="form-onboard" style="text-align:left">
        <h3>Origo Fratris<span>Identificação do Astartes</span></h3>
        <label class="field"><span>Nome de guerra</span><input name="name" required placeholder="Ex.: Irmão Dante"></label>
        <div class="row2">
          <label class="field"><span>Sexo</span>
            <select name="sex"><option value="M">Masculino</option><option value="F">Feminino</option></select>
          </label>
          <label class="field"><span>Idade</span><input name="age" type="number" min="14" max="90" required></label>
        </div>
        <div class="row2">
          <label class="field"><span>Altura (cm)</span><input name="height" type="number" min="120" max="230" required></label>
          <label class="field"><span>Peso (kg)</span><input name="weight" type="number" step="0.1" min="35" max="250" required></label>
        </div>
        <label class="field"><span>Atividade</span><select name="activity">${act}</select></label>
        <label class="field"><span>Objetivo (desempenho)</span>
          <select name="goal">
            <option value="cut">Cutting · déficit à escolha</option>
            <option value="break">Diet break · GET no peso atual</option>
            <option value="keep" selected>Manutenção contínua</option>
            <option value="bulk">Bulk-up · GET + mínimo 250 kcal</option>
          </select>
        </label>
        <p class="field-lab">Proteína animal do soldado enhanced</p>
        <div class="doses">${protPicker("proteinPerKg", 1.8)}</div>
        <button class="btn" type="submit">Forjar o Capítulo</button>
      </form>
    </div>`;
  $("#form-onboard").onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    S.profile = {
      name: fd.get("name"),
      sex: fd.get("sex"),
      age: +fd.get("age"),
      height: +fd.get("height"),
      weight: +fd.get("weight"),
      activity: fd.get("activity"),
      goal: fd.get("goal"),
      proteinPerKg: normProt(fd.get("proteinPerKg")),
      fatPct: 0.27,
      waterGoal: 2500,
      cutStart: fd.get("goal") === "cut" ? today() : null,
      cutDoctrine: "marine",
      cutWeeks: CUT_WEEKS_DEFAULT,
      cutDeficitPct: 15,
      breakStart: fd.get("goal") === "break" ? today() : null,
      breakDays: BREAK_DAYS
    };
    S.weights.push({ date: today(), kg: S.profile.weight });
    save();
    show("page-diario");
  };
}

function fmt(n, d=0) { return (Math.round(n * 10**d) / 10**d).toLocaleString("pt-BR", { maximumFractionDigits: d }); }
function dateLabel(iso) {
  if (iso === today()) return "Hoje";
  const [y,m,d] = iso.split("-");
  return `${d}/${m}`;
}
function shiftDate(iso, days) {
  const dt = new Date(iso + "T12:00:00");
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0,10);
}

function renderDiario() {
  const p = S.profile;
  if (!p) return renderOnboard();
  const t = targets(p);
  const sum = sumDay(viewDate);
  const sp = spent(viewDate, sum.kcal);
  const rem = t.kcal - sum.kcal;
  const d = dayObj(viewDate);
  const mealsHtml = MEALS.map(m => {
    const items = d[m.id] || [];
    const k = items.reduce((s,e)=>s+e.kcal,0);
    return `<div class="meal">
      <div class="meal-h"><b>${m.name}</b><span class="muted">${m.latin} · ${fmt(k)} kcal</span></div>
      ${items.length ? items.map((e,i)=>`
        <div class="entry">
          <div class="name" onclick="editEntry('${m.id}',${i})">${e.name}<div class="meta">${fmt(e.grams,0)} g · P ${fmt(e.p,1)} · C ${fmt(e.carbs,1)} · G ${fmt(e.f,1)}</div></div>
          <div>${fmt(e.kcal)} kcal
            <button aria-label="editar" onclick="editEntry('${m.id}',${i})">✎</button>
            <button aria-label="remover" onclick="removeEntry('${m.id}',${i})">✕</button>
          </div>
        </div>`).join("") : `<div class="empty">Nenhuma ração lançada.</div>`}
      <button class="btn ghost" onclick="openAdd('${m.id}')">+ Registrar ração</button>
      <button class="btn ghost" onclick="saveFav('${m.id}')">Salvar favorita</button>
      ${(S.favs||[]).length ? `<button class="btn ghost" onclick="pickFav('${m.id}')">Usar favorita</button>` : ""}
    </div>`;
  }).join("");

  $("#page-diario").innerHTML = `
    <div class="date-nav">
      <button onclick="chgDate(-1)">‹</button>
      <div class="when">${dateLabel(viewDate)}${t.phase ? ` · ${t.phase === "high" ? "CHO alto" : "CHO baixo"}` : ""}</div>
      <button onclick="chgDate(1)">›</button>
    </div>
    <div style="display:flex;gap:8px;margin:0 0 10px;flex-wrap:wrap">
      <button class="btn ghost" onclick="copyYesterday()">Copiar ontem</button>
    </div>
    <section class="ornate card">
      <h3>Resumo de Energia<span>Consumido · Gastos · Restante</span></h3>
      <div class="rings">
        <div class="ring"><div class="val">${fmt(sum.kcal)}</div><div class="unit">kcal</div><div class="lab">Consumido</div></div>
        <div class="ring"><div class="val">${fmt(sp.total)}</div><div class="unit">kcal</div><div class="lab">Gastos</div></div>
        <div class="ring"><div class="val">${fmt(rem)}</div><div class="unit">kcal</div><div class="lab">Restante</div></div>
      </div>
      <p class="quote" style="font-size:12px">TMB ${t.tmb} · Atividade ${sp.base} · Exercício ${sp.ex} · TEF ${sp.tef} · ${t.pkg.toString().replace(".",",")} g/kg</p>
    </section>
    ${campaignCard(p, viewDate)}
    <section class="ornate card bars">
      <h3>Metas de Macronutrientes<span>${t.phase === "high" ? "Dia ALTO · GET" : t.phase === "low" ? "Dia BAIXO · 70% GET" : "Doutrina da ração diária"}</span></h3>
      ${bar("Energia", sum.kcal, t.kcal, "kcal")}
      ${bar("Proteína animal", sum.pAnimal, t.prot, "g", "p")}
      ${sum.p - sum.pAnimal > 0.5 ? `<p class="muted">P vegetal ${fmt(sum.p - sum.pAnimal,1)} g — fora da cota do soldado.</p>` : ""}
      ${bar("Carboidratos", sum.carbs, t.carb, "g", "c")}
      ${bar("Gordura", sum.f, t.fat, "g", "f")}
    </section>
    <section class="ornate card">
      <h3>Água<span>${d.water} / ${p.waterGoal} ml</span></h3>
      <div class="water">
        <strong>${d.water} ml</strong>
        <button onclick="addWater(200)">+200</button>
        <button onclick="addWater(300)">+300</button>
        <button onclick="addWater(500)">+500</button>
        <button onclick="addWater(-dReset())">zerar</button>
      </div>
    </section>
    <section class="ornate card">
      <h3>Exercício do dia<span>kcal acima da linha de base</span></h3>
      <div class="row2">
        <label class="field"><span>kcal de treino</span>
          <input type="number" value="${d.exercise||0}" onchange="setEx(this.value)">
        </label>
        <div class="muted" style="align-self:end;padding-bottom:12px">Soma-se aos gastos.</div>
      </div>
    </section>
    <section class="ornate card">${mealsHtml}</section>
  `;
}
function bar(lab, v, max, unit, cls="") {
  const pct = max ? Math.min(140, (v / max) * 100) : 0;
  const warn = v > max * 1.05 && lab === "Energia" ? " warn" : "";
  return `<div class="row"><div class="labrow"><span>${lab}</span><span>${fmt(v,1)} / ${fmt(max,0)} ${unit} · ${fmt(pct,0)}%</span></div>
    <div class="track ${cls}${warn}"><i style="width:${Math.min(100,pct)}%"></i></div></div>`;
}

window.chgDate = function(d) { viewDate = shiftDate(viewDate, d); renderDiario(); };
window.addWater = function(ml) {
  const d = dayObj(viewDate);
  if (ml < 0) d.water = 0; else d.water = Math.max(0, d.water + ml);
  save(); renderDiario();
};
window.dReset = () => 1;
window.setEx = function(v) { dayObj(viewDate).exercise = Math.max(0, +v || 0); save(); renderDiario(); };
window.removeEntry = function(meal, i) {
  dayObj(viewDate)[meal].splice(i, 1); save(); renderDiario();
};
function cloneItems(arr) { return JSON.parse(JSON.stringify(arr || [])); }
function rescaleEntry(e, grams) {
  grams = Math.max(1, +grams || e.grams || 100);
  const src = e.id ? foodById(e.id) : null;
  if (src) return scaleFood(src, grams);
  const k = e.grams ? grams / e.grams : 1;
  const o = { ...e, grams };
  ["kcal","p","carbs","f","fiber","sugar","sat","chol","na","ca","fe","mg","zn","k","phos","se","a","c_vit","d","e","k_vit","b1","b2","b3","b6","b12","fol"].forEach(key => {
    if (typeof o[key] === "number") o[key] = o[key] * k;
  });
  return o;
}
window.editEntry = function(meal, i) {
  const e = dayObj(viewDate)[meal][i];
  if (!e) return;
  $("#modal").classList.add("open");
  $("#modal").innerHTML = `<div class="sheet ornate">
    <h3 class="display" style="text-align:center">${e.name}</h3>
    <p class="muted" style="text-align:center">${fmt(e.kcal)} kcal · ${fmt(e.grams,0)} g agora</p>
    <label class="field"><span>Gramas</span><input id="eg" type="number" value="${fmt(e.grams,0)}"></label>
    <button class="btn" onclick="saveEdit('${meal}',${i})">Atualizar ração</button>
    <button class="btn ghost" onclick="removeEntry('${meal}',${i});closeModal()">Remover</button>
    <button class="btn ghost" onclick="closeModal()">Cancelar</button>
  </div>`;
};
window.saveEdit = function(meal, i) {
  const list = dayObj(viewDate)[meal];
  list[i] = rescaleEntry(list[i], $("#eg").value);
  save(); closeModal(); renderDiario();
};
window.copyYesterday = function() {
  const src = S.diary[shiftDate(viewDate, -1)];
  if (!src) return alert("Ontem está vazio no Códice.");
  const dst = dayObj(viewDate);
  const busy = MEALS.some(m => (dst[m.id] || []).length);
  if (busy && !confirm("Substituir o dia atual pelo de ontem?")) return;
  MEALS.forEach(m => { dst[m.id] = cloneItems(src[m.id]); });
  dst.water = src.water || 0;
  dst.exercise = src.exercise || 0;
  save(); renderDiario();
};
window.saveFav = function(meal) {
  const items = dayObj(viewDate)[meal] || [];
  if (!items.length) return alert("Essa refeição está vazia.");
  const label = MEALS.find(m => m.id === meal).name;
  const name = prompt("Nome da favorita", label);
  if (name == null) return;
  S.favs = S.favs || [];
  S.favs.push({ id: "fav-" + Date.now(), name: name.trim() || label, meal, items: cloneItems(items) });
  save(); renderDiario();
};
window.pickFav = function(meal) {
  const list = S.favs || [];
  $("#modal").classList.add("open");
  $("#modal").innerHTML = `<div class="sheet ornate">
    <h3 class="display" style="text-align:center">Favoritas</h3>
    <div class="list">${list.map((f,i)=>`
      <div class="item">
        <div onclick="applyFav('${meal}',${i})"><b>${f.name}</b><div class="meta">${f.items.length} itens · ${fmt(f.items.reduce((s,e)=>s+e.kcal,0))} kcal</div></div>
        <button onclick="delFav(${i})">✕</button>
      </div>`).join("") || "<div class='empty'>Nenhuma favorita.</div>"}</div>
    <button class="btn ghost" onclick="closeModal()">Fechar</button>
  </div>`;
};
window.applyFav = function(meal, i) {
  const f = (S.favs || [])[i];
  if (!f) return;
  const dst = dayObj(viewDate)[meal];
  if (dst.length && !confirm("Acrescentar a favorita nesta refeição?")) return;
  dayObj(viewDate)[meal] = dst.concat(cloneItems(f.items));
  save(); closeModal(); renderDiario();
};
window.delFav = function(i) {
  S.favs.splice(i, 1); save(); closeModal(); renderDiario();
};
window.openAdd = function(meal) {
  pendingMeal = meal || pendingMeal;
  renderBusca();
  $("#modal").classList.add("open");
};
window.openEscriba = function() {
  $("#modal").classList.add("open");
  $("#modal").innerHTML = `<div class="sheet ornate">
    <h3 class="display" style="text-align:center">Escriba</h3>
    <p class="quote">Diga a ração. Se a foto não bastar, o Códice pergunta.</p>
    <label class="field"><span>O que foi comido</span>
      <input id="escr-q" placeholder="patinho moída 300g" onkeydown="if(event.key==='Enter')runEscriba()">
    </label>
    <label class="field"><span>Foto do prato</span>
      <input id="escr-pic" type="file" accept="image/*" capture="environment" onchange="onEscribaPic(this)">
    </label>
    <div id="escr-preview"></div>
    <p class="muted" id="escr-note">A câmera neste aparelho não chama o Grok sozinha. Ela guarda o registro e o texto é que casa com a TBCA. Sem API, o modelo não “vê” o prato.</p>
    <button class="btn" onclick="runEscriba()">Interpretar ração</button>
    <button class="btn ghost" onclick="renderBusca()">Voltar à busca</button>
  </div>`;
};
window.onEscribaPic = function(inp) {
  const file = inp.files && inp.files[0];
  const box = $("#escr-preview");
  if (!file || !box) return;
  const url = URL.createObjectURL(file);
  box.innerHTML = `<img src="${url}" alt="prato" style="width:100%;max-height:180px;object-fit:cover;margin:8px 0;border:1px solid var(--frame)">
    <p class="muted">Foto recebida. Escreva o que o Capítulo deve lançar — corte, preparo, gramas.</p>`;
};
function rankEscriba(q) {
  return allFoods().filter(f => foodMatches(f, q)).sort((a,b) => foodScore(a,q) - foodScore(b,q));
}
window.runEscriba = function() {
  const q = ($("#escr-q") && $("#escr-q").value || "").trim();
  const hasPic = $("#escr-pic") && $("#escr-pic").files && $("#escr-pic").files[0];
  if (!q) {
    $("#escr-note").textContent = hasPic
      ? "A foto chegou, mas o Códice não identifica o alimento sem nome. Qual o corte e o preparo? Ex.: patinho moída refogada."
      : "Escreva a ração. Ex.: peito de frango grelhado 150g.";
    return;
  }
  const grams = parseGrams(q) || 100;
  window._lastRationQ = q;
  const hits = rankEscriba(q).slice(0, 6);
  if (!hits.length) {
    $("#escr-note").textContent = "Nada na TBCA com essas palavras. Qual o nome mais curto do alimento? Crie um custom se for industrial.";
    return;
  }
  const top = hits[0];
  const close = hits.filter(f => foodScore(f, q) - foodScore(top, q) < 80);
  const unsure = close.length > 1 && (foodScore(close[1], q) - foodScore(top, q) < 40);
  $("#modal").innerHTML = `<div class="sheet ornate">
    <h3 class="display" style="text-align:center">Confirmar ração</h3>
    <p class="muted" style="text-align:center">${unsure ? "Há mais de um candidato. Escolha o corte/preparo certo." : "Candidato principal. Confirme os gramas."}</p>
    <p class="quote">${q}${grams ? " · " + grams + " g lidos" : ""}</p>
    <div class="list">${hits.map(f=>`
      <div class="item" onclick="pickFood('${f.id}')">
        <div><b>${f.name}</b><div class="meta">${f.cat} · ${f.src||"TBCA"} · ${f.kcal} kcal/100g</div></div>
      </div>`).join("")}</div>
    ${unsure ? `<p class="muted">Estava cru, refogado ou grelhado? Toque a linha certa.</p>` : ""}
    <button class="btn ghost" onclick="openEscriba()">Reformular</button>
  </div>`;
  if (!unsure && $("#q")) $("#q").value = q;
};

function foldTxt(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function queryTokens(q) {
  return foldTxt(q).split(/[^a-z0-9]+/).filter(t => t && !/^\d+$/.test(t) && !["g","kg","ml","de","da","do","com","sem","e"].includes(t));
}
function parseGrams(q) {
  const m = foldTxt(q).match(/(\d+(?:[.,]\d+)?)\s*(kg|g)\b/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  return m[2] === "kg" ? Math.round(n * 1000) : Math.round(n);
}
function foodMatches(f, q) {
  if (!q || !q.trim()) return true;
  const hay = foldTxt(f.name + " " + (f.namePapa || "") + " " + (f.cat || "") + " " + (f.src || ""));
  const toks = queryTokens(q);
  if (!toks.length) return hay.includes(foldTxt(q));
  return toks.every(t => hay.includes(t));
}
function foodScore(f, q) {
  const n = foldTxt(f.name || "");
  const qq = foldTxt(q || "").trim();
  const toks = queryTokens(q);
  let s = (f.name || "").length;
  if (f.source === "custom" || f.source === "recipe" || f.src === "Extra") s -= 400;
  if (qq && n.startsWith(qq)) s -= 220;
  if (qq && n.includes(qq)) s -= 80;
  toks.forEach(t => { if (n.includes(t)) s -= 35; });
  if (/papa de |sopa,|sanduiche|empada|quiche|bolo de|pure de/.test(n)) s += 120;
  if (/grelhad|cozid|refogad|cru/.test(n) && !/papa/.test(n)) s -= 25;
  return s;
}
function renderBusca(q="") {
  const foods = allFoods().filter(f => foodMatches(f, q));
  const cats = ["Todos", ...Array.from(new Set(allFoods().map(f => f.cat).filter(Boolean)))];
  const shown = (filterCat === "Todos" ? foods : foods.filter(f => f.cat === filterCat))
    .slice().sort((a,b) => foodScore(a,q) - foodScore(b,q));
  $("#modal").innerHTML = `<div class="sheet ornate">
    <h3 class="display" style="text-align:center;margin:6px 0 10px">Rationes</h3>
    <p class="muted" style="text-align:center">Lançar em: <b>${MEALS.find(m=>m.id===pendingMeal).name}</b></p>
    <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:8px 0">
      ${MEALS.map(m=>`<span class="chip ${m.id===pendingMeal?'on':''}" onclick="pendingMeal='${m.id}';renderBusca(document.getElementById('q').value)">${m.name}</span>`).join("")}
    </div>
    <div class="search"><input id="q" placeholder="Ex.: patinho moída 300g" value="${q}" oninput="renderBusca(this.value)"></div>
    <div style="margin:8px 0">${cats.map(c=>`<span class="chip ${c===filterCat?'on':''}" onclick="filterCat='${c}';renderBusca(document.getElementById('q').value)">${c}</span>`).join("")}</div>
    <div class="list">${shown.slice(0,80).map(f=>`
      <div class="item" onclick="pickFood('${f.id}')">
        <div><b>${f.name}</b><div class="meta">${f.cat||""} · ${f.source==="custom"?"custom":f.source==="recipe"?"receita":(f.src||"TBCA")}</div></div>
        <div class="muted">${f.kcal} kcal/100g</div>
      </div>`).join("") || "<div class='empty'>Nenhuma ração encontrada.</div>"}</div>
    <button class="btn ghost" onclick="closeModal()">Fechar</button>
  </div>`;
  const inp = $("#q"); if (inp) { inp.focus(); inp.setSelectionRange(q.length, q.length); }
}
window.renderBusca = renderBusca;
window.pickFood = function(id) {
  const f = foodById(id);
  const serv = f.servings || [{n:"100 g", g:100}];
  const guessed = parseGrams(($("#q") && $("#q").value) || window._lastRationQ || "") || serv[0].g;
  $("#modal").innerHTML = `<div class="sheet ornate">
    <h3 class="display" style="text-align:center">${f.name}</h3>
    <p class="muted" style="text-align:center">${f.kcal} kcal · P ${f.p} · C ${f.c} · G ${f.f} / 100 g</p>
    <label class="field"><span>Porção</span>
      <select id="serv" onchange="document.getElementById('grams').value=this.value">
        ${serv.map(s=>`<option value="${s.g}">${s.n} (${s.g} g)</option>`).join("")}
        <option value="100">100 g</option>
      </select>
    </label>
    <label class="field"><span>Gramas</span><input id="grams" type="number" value="${guessed}"></label>
    <label class="field"><span>Refeição</span>
      <select id="meal">${MEALS.map(m=>`<option value="${m.id}" ${m.id===pendingMeal?"selected":""}>${m.name}</option>`).join("")}</select>
    </label>
    <button class="btn" onclick="confirmFood('${f.id}')">Lançar no Diarium</button>
    <button class="btn ghost" onclick="renderBusca()">Voltar</button>
  </div>`;
};
window.confirmFood = function(id) {
  const f = foodById(id);
  const g = +$("#grams").value || 100;
  const meal = $("#meal").value;
  const e = scaleFood(f, g);
  dayObj(viewDate)[meal].push(e);
  save(); closeModal(); show("page-diario");
};
window.closeModal = function() { $("#modal").classList.remove("open"); $("#modal").innerHTML = ""; };

function renderAlimentos() {
  $("#page-alimentos").innerHTML = `
    <section class="ornate card">
      <h3>Armamentarium<span>Rações, receitas e relíquias próprias</span></h3>
      <p class="quote">“A arma é só uma ferramenta. A vontade — e a ração — são a arma verdadeira.”</p>
      <button class="btn" onclick="formCustom()">Criar alimento</button>
      <button class="btn ghost" onclick="formRecipe()">Criar receita</button>
    </section>
    <section class="ornate card">
      <h3>Alimentos personalizados<span>${(S.custom||[]).length} relíquias</span></h3>
      <div class="list">${(S.custom||[]).map(f=>`
        <div class="item"><div><b>${f.name}</b><div class="meta">${f.kcal} kcal/100g</div></div>
          <button onclick="delCustom('${f.id}')">✕</button></div>`).join("") || "<div class='empty'>Nenhum alimento próprio ainda.</div>"}</div>
    </section>
    <section class="ornate card">
      <h3>Receitas<span>${(S.recipes||[]).length}</span></h3>
      <div class="list">${(S.recipes||[]).map(f=>`
        <div class="item"><div><b>${f.name}</b><div class="meta">${fmt(f.kcal)} kcal/100g</div></div>
          <button onclick="delRecipe('${f.id}')">✕</button></div>`).join("") || "<div class='empty'>Nenhuma receita gravada.</div>"}</div>
    </section>
    <section class="ornate card">
      <h3>Tabela TBCA<span>${ASTARTES_FOODS.length} rações USP/FoRC</span></h3>
      <div class="search"><input placeholder="Filtrar..." oninput="filterTaco(this.value)"></div>
      <div class="list" id="taco-list">${tacoList("")}</div>
    </section>`;
}
function tacoList(q) {
  return ASTARTES_FOODS.filter(f => foodMatches(f, q))
    .slice().sort((a,b) => foodScore(a,q) - foodScore(b,q))
    .slice(0, 80).map(f => `<div class="item" onclick="pickFood('${f.id}')"><div><b>${f.name}</b><div class="meta">${f.cat} · ${f.src||"TBCA"}</div></div><div class="muted">${f.kcal} kcal</div></div>`).join("");
}
window.filterTaco = q => { const el = $("#taco-list"); if (el) el.innerHTML = tacoList(q); };
window.delCustom = id => { S.custom = S.custom.filter(f => f.id !== id); save(); renderAlimentos(); };
window.delRecipe = id => { S.recipes = S.recipes.filter(f => f.id !== id); save(); renderAlimentos(); };

window.formCustom = function() {
  $("#modal").classList.add("open");
  $("#modal").innerHTML = `<div class="sheet ornate">
    <h3 class="display" style="text-align:center">Novo Alimento</h3>
    <label class="field"><span>Nome</span><input id="cn"></label>
    <label class="field"><span>Categoria</span><input id="cc" value="Custom"></label>
    <div class="row2">
      <label class="field"><span>kcal /100g</span><input id="ck" type="number"></label>
      <label class="field"><span>Proteína</span><input id="cp" type="number" step="0.1"></label>
    </div>
    <div class="row2">
      <label class="field"><span>Carboidrato</span><input id="ccarb" type="number" step="0.1"></label>
      <label class="field"><span>Gordura</span><input id="cf" type="number" step="0.1"></label>
    </div>
    <div class="row2">
      <label class="field"><span>Fibra</span><input id="cfi" type="number" step="0.1"></label>
      <label class="field"><span>Sódio mg</span><input id="cna" type="number"></label>
    </div>
    <label class="dose">
      <input type="checkbox" id="canimal" checked>
      <b>Proteína animal</b>
      <small>Só entra na cota 1,5 / 1,8 / 2,0 g/kg se marcado.</small>
    </label>
    <button class="btn" onclick="saveCustom()">Selar no Códice</button>
    <button class="btn ghost" onclick="closeModal()">Cancelar</button>
  </div>`;
};
window.saveCustom = function() {
  const name = $("#cn").value.trim();
  if (!name) return alert("Nome é obrigatório.");
  S.custom.push({
    id: "c-" + Date.now(), name, cat: $("#cc").value || "Custom",
    kcal: +$("#ck").value || 0, p: +$("#cp").value || 0, c: +$("#ccarb").value || 0,
    f: +$("#cf").value || 0, fiber: +$("#cfi").value || 0, na: +$("#cna").value || 0,
    servings: [{ n: "100 g", g: 100 }],
    animal: !!(document.getElementById("canimal") && document.getElementById("canimal").checked)
  });
  save(); closeModal(); renderAlimentos();
};

window.formRecipe = function() {
  $("#modal").classList.add("open");
  window._recItems = [];
  paintRecipe();
};
function paintRecipe() {
  const tot = emptyNut();
  let grams = 0;
  (_recItems || []).forEach(it => { addNut(tot, it); grams += it.grams; });
  $("#modal").innerHTML = `<div class="sheet ornate">
    <h3 class="display" style="text-align:center">Receita</h3>
    <label class="field"><span>Nome da receita</span><input id="rn" placeholder="Ex.: Frango com arroz do Capítulo"></label>
    <label class="field"><span>Peso final cozido (g)</span><input id="rg" type="number" value="${grams || 100}"></label>
    <p class="muted">Ingredientes: ${fmt(tot.kcal)} kcal totais</p>
    <div class="list">${(_recItems||[]).map((it,i)=>`<div class="item"><div>${it.name} · ${it.grams}g</div><button onclick="_recItems.splice(${i},1);paintRecipe()">✕</button></div>`).join("")}</div>
    <label class="field"><span>Adicionar ingrediente</span>
      <select id="ri" onchange="if(this.value){const f=foodById(this.value);const g=prompt('Gramas de '+f.name+'?',100);if(g){_recItems.push(scaleFood(f,+g));paintRecipe();}}">
        <option value="">— escolher —</option>
        ${allFoods().slice(0,200).map(f=>`<option value="${f.id}">${f.name}</option>`).join("")}
      </select>
    </label>
    <button class="btn" onclick="saveRecipe()">Selar receita</button>
    <button class="btn ghost" onclick="closeModal()">Cancelar</button>
  </div>`;
}
window.paintRecipe = paintRecipe;
window.saveRecipe = function() {
  const name = $("#rn").value.trim();
  const finalG = +$("#rg").value || 100;
  if (!name || !_recItems.length) return alert("Nome e ao menos um ingrediente.");
  const tot = emptyNut();
  _recItems.forEach(it => addNut(tot, it));
  const k = 100 / finalG;
  S.recipes.push({
    id: "r-" + Date.now(), name, cat: "Receitas",
    kcal: +(tot.kcal * k).toFixed(1), p: +(tot.p * k).toFixed(2),
    c: +(tot.carbs * k).toFixed(2), f: +(tot.f * k).toFixed(2),
    fiber: +(tot.fiber * k).toFixed(2), na: +(tot.na * k).toFixed(1),
    servings: [{ n: "porção da receita", g: finalG }, { n: "100 g", g: 100 }]
  });
  save(); closeModal(); renderAlimentos();
};

function renderRelato() {
  if (!S.profile) return;
  const t = targets(S.profile, viewDate);
  const sum = sumDay(viewDate);
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const dt = shiftDate(viewDate, -i);
    const tt = targets(S.profile, dt);
    week.push({ dt, kcal: sumDay(dt).kcal, goal: tt.kcal, phase: tt.phase });
  }
  const rows = [
    ["Energia", sum.kcal, t.kcal, "kcal"],
    ["Proteína animal", sum.pAnimal, t.prot, "g"],
    ["Carboidratos", sum.carbs, t.carb, "g"],
    ["Gordura", sum.f, t.fat, "g"],
    ["Fibra", sum.fiber, DRI.fiber, "g"],
    ["Açúcares", sum.sugar, DRI.sugar, "g"],
    ["Sódio", sum.na, DRI.na, "mg"],
    ["Cálcio", sum.ca, DRI.ca, "mg"],
    ["Ferro", sum.fe, DRI.fe, "mg"],
    ["Magnésio", sum.mg, DRI.mg, "mg"],
    ["Zinco", sum.zn, DRI.zn, "mg"],
    ["Potássio", sum.k, DRI.k, "mg"],
    ["Selênio", sum.se, DRI.se, "µg"],
    ["Vitamina A", sum.a, DRI.a, "µg"],
    ["Vitamina C", sum.c_vit, DRI.c, "mg"],
    ["Vitamina D", sum.d, DRI.d, "µg"],
    ["B12", sum.b12, DRI.b12, "µg"],
    ["Folato", sum.fol, DRI.fol, "µg"]
  ];
  $("#page-relato").innerHTML = `
    <section class="ornate card">
      <h3>Doctrina Nutricia<span>Relatório do dia ${dateLabel(viewDate)}${t.phase ? ` · CHO ${t.phase === "high" ? "alto" : "baixo"}` : ""}</span></h3>
      <canvas class="chart" id="weekChart"></canvas>
      <p class="muted">${S.profile.goal === "cut" ? `Déficit selado −${cutDeficitPct(S.profile)}% · média ${cutAvgKcal(S.profile)} kcal. ` : ""}${S.profile.carbCycle && S.profile.goal === "cut"
        ? "Linha = meta do dia. Sobe no alto (GET), desce no baixo. A média da dupla honra o déficit selado."
        : "Linha = meta do dia."}</p>
    </section>
    <section class="ornate card">
      <h3>Índice de nutrientes<span>Percentual da meta / DRI</span></h3>
      <table class="nutri">${rows.map(([n,v,m,u]) => {
        const pct = m ? (v/m)*100 : 0;
        return `<tr><td>${n}</td><td>${fmt(v,1)} ${u}</td><td class="pct">${fmt(pct,0)}%</td></tr>`;
      }).join("")}</table>
      <p class="quote">Micros vêm da TBCA (USP/FoRC). Quando a tabela não informa o nutriente, o Códice mostra zero — não inventa.</p>
    </section>
    <section class="ornate card">
      <h3>Gastos<span>Por que o anel do meio se move</span></h3>
      ${(() => { const sp = spent(viewDate, sum.kcal);
        return `<table class="nutri">
          <tr><td>TMB</td><td>${sp.tmb} kcal</td><td></td></tr>
          <tr><td>Atividade de linha de base</td><td>${sp.base} kcal</td><td></td></tr>
          <tr><td>Exercício lançado</td><td>${sp.ex} kcal</td><td></td></tr>
          <tr><td>TEF (10% do consumido)</td><td>${sp.tef} kcal</td><td></td></tr>
          <tr><td><b>Total</b></td><td><b>${sp.total} kcal</b></td><td></td></tr>
        </table>`; })()}
    </section>`;
  drawWeek(week);
}
function drawWeek(week) {
  const c = $("#weekChart"); if (!c) return;
  const w = c.width = c.clientWidth * 2;
  const h = c.height = 140 * 2;
  const ctx = c.getContext("2d");
  ctx.clearRect(0,0,w,h);
  const max = Math.max(1, ...week.map(x => Math.max(x.kcal || 0, x.goal || 0)));
  const pad = 30;
  const slot = (w - pad * 2) / week.length;
  const yOf = v => h - pad - (v / max) * (h - pad * 2);
  ctx.strokeStyle = "rgba(43,29,18,.45)";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  week.forEach((x, i) => {
    const gx = pad + i * slot + slot / 2;
    const gy = yOf(x.goal || 0);
    if (i === 0) ctx.moveTo(gx - slot / 2, gy);
    else ctx.lineTo(gx - slot / 2, gy);
    ctx.lineTo(gx + slot / 2, gy);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  week.forEach((x, i) => {
    const bw = slot * 0.55;
    const x0 = pad + i * slot + (slot - bw) / 2;
    const bh = ((x.kcal || 0) / max) * (h - pad * 2);
    ctx.fillStyle = x.phase === "low" ? "#5c3a1e" : x.phase === "high" ? "#c4a35a" : "#9a7b32";
    ctx.fillRect(x0, h - pad - bh, bw, bh);
    ctx.fillStyle = "#1c140e";
    ctx.font = "20px Cinzel";
    ctx.textAlign = "center";
    const tag = x.phase === "high" ? "A" : x.phase === "low" ? "B" : "";
    ctx.fillText(x.dt.slice(8) + (tag ? tag : ""), x0 + bw / 2, h - 6);
  });
}

function renderFrater() {
  const p = S.profile;
  if (!p) return;
  const t = targets(p);
  const act = ACT.map(a => `<option value="${a.id}" ${a.id===p.activity?"selected":""}>${a.n}</option>`).join("");
  $("#page-frater").innerHTML = `
    <section class="ornate card">
      <h3>Frater ${p.name}<span>Cálculo Mifflin-St Jeor</span></h3>
      <table class="nutri">
        <tr><td>TMB</td><td>${t.tmb} kcal</td></tr>
        <tr><td>GET (TMB × atividade)</td><td>${t.get} kcal</td></tr>
        <tr><td>Meta do objetivo</td><td>${t.kcal} kcal${p.goal==="bulk" ? ` (+${t.surplus})` : t.phase === "high" ? " · CHO alto = GET" : t.phase === "low" ? " · CHO baixo = 70% GET" : p.goal==="cut" ? ` (−${t.deficit})` : p.goal==="break" ? " · GET" : ""}</td></tr>
        <tr><td>Proteína animal</td><td>${t.prot} g</td></tr>
        <tr><td>Carboidrato</td><td>${t.carb} g</td></tr>
        <tr><td>Gordura</td><td>${t.fat} g</td></tr>
      </table>
    </section>
    <section class="ornate card">
      <h3>Recalcular doutrina<span>Atualize o corpo, o Códice acompanha</span></h3>
      <div class="row2">
        <label class="field"><span>Peso kg</span><input id="pw" type="number" step="0.1" value="${p.weight}"></label>
        <label class="field"><span>Idade</span><input id="pa" type="number" value="${p.age}"></label>
      </div>
      <label class="field"><span>Altura cm</span><input id="ph" type="number" value="${p.height}"></label>
      <p class="field-lab">Proteína animal do soldado enhanced</p>
      <div class="doses">${protPicker("pp", p.proteinPerKg)}</div>
      <label class="field"><span>Atividade</span><select id="pac">${act}</select></label>
      <label class="field"><span>Objetivo</span>
        <select id="pg">
          <option value="cut" ${p.goal==="cut"?"selected":""}>Cutting · déficit à escolha</option>
          <option value="break" ${p.goal==="break"?"selected":""}>Diet break · GET</option>
          <option value="keep" ${p.goal==="keep"?"selected":""}>Manutenção contínua</option>
          <option value="bulk" ${p.goal==="bulk"?"selected":""}>Bulk-up · +mín. 250 kcal</option>
        </select>
      </label>
      <label class="field"><span>Meta de água (ml)</span><input id="pwa" type="number" value="${p.waterGoal||2500}"></label>
      <button class="btn" onclick="saveProfile()">Atualizar TMB</button>
    </section>
    ${p.goal === "cut" ? `<section class="ornate card">
      <h3>Doutrina de Cutting<span>Marine padrão · Ultra Marine opcional</span></h3>
      <p class="field-lab">Déficit sobre o GET</p>
      <div class="doses">${deficitPicker(p.cutDeficitPct)}</div>
      <label class="field"><span>Ou percentual livre (5–50)</span>
        <input id="cdef" type="number" min="5" max="50" step="1" value="${cutDeficitPct(p)}">
      </label>
      <p class="muted">Hoje a meta média é GET −${cutDeficitPct(p)}% = ${cutAvgKcal(p)} kcal. No ciclo de CHO o dia baixo ajusta para a dupla continuar nessa média.</p>
      <div class="doses">${doctrinePicker(p.cutDoctrine)}</div>
      <label class="field"><span>Início da campanha</span><input id="cstart" type="date" value="${p.cutStart || today()}"></label>
      <button class="btn" onclick="saveCutClock()">Selar doutrina</button>
      <button class="btn ghost" onclick="resetCutClock()">Reiniciar campanha hoje</button>
      <button class="btn ghost" onclick="startDietBreak()">Abrir diet break agora</button>
      <label class="dose ${p.carbCycle ? "on" : ""}" style="margin-top:10px">
        <input type="checkbox" ${p.carbCycle ? "checked" : ""} onchange="toggleCarbCycle(this.checked)">
        <b>Ciclo de carboidratos</b>
        <small>Opcional. 1 alto = GET / 1 baixo = o restante. A média da dupla honra o déficit selado.</small>
      </label>
      ${p.carbCycle ? `<button class="btn ghost" onclick="flipCarbCycle()">Inverter ciclo</button>` : ""}
      <p class="quote">Marine é o padrão. Ultra Marine é opt-in. O ciclo de CHO não é obrigatório.</p>
    </section>` : p.goal === "break" ? `<section class="ornate card">
      <h3>Protocolo Diet Break<span>TMB no peso de hoje · comer o GET</span></h3>
      <p class="muted">1. Peso atual. 2. Refaz TMB. 3. Meta = GET, inteiro — honrar o GET evita erro de protocolo. 4. 7–14 dias.</p>
      <label class="field"><span>Início do break</span><input id="bstart" type="date" value="${p.breakStart || today()}"></label>
      <button class="btn" onclick="saveBreakClock()">Atualizar break</button>
      <button class="btn ghost" onclick="resumeMarine()">Retomar Marine</button>
      <button class="btn ghost" onclick="startBulk()">Ir para Bulk-up</button>
    </section>` : p.goal === "bulk" ? `<section class="ornate card">
      <h3>Bulk-up<span>Piso de +${BULK_MIN} kcal sobre o GET</span></h3>
      <p class="muted">Superávit = o maior entre ${BULK_MIN} kcal e 10% do GET. Atualize o peso para o GET não ficar velho.</p>
      <button class="btn ghost" onclick="startDietBreak()">Pausar em diet break</button>
    </section>` : `<section class="ornate card">
      <h3>Campanha<span>Manutenção contínua · sem relógio</span></h3>
      <p class="muted">Meta = GET no peso atual. Cutting, diet break ou bulk-up abrem um relógio.</p>
    </section>`}
    <section class="ornate card">
      <h3>Liber Ponderis<span>Histórico de peso</span></h3>
      <label class="dose ${p.recompSuccessful ? "on" : ""}">
        <input type="checkbox" ${p.recompSuccessful ? "checked" : ""} onchange="toggleRecomp(this.checked)">
        <b>Recomp Successful</b>
        <small>Bypass técnico. Cut válido sem critério de quilo.</small>
      </label>
      <div class="row2">
        <label class="field"><span>Novo peso</span><input id="nw" type="number" step="0.1" placeholder="${p.weight}"></label>
        <div style="align-self:end"><button class="btn" onclick="logWeight()">Registrar</button></div>
      </div>
      <canvas class="chart" id="weightChart"></canvas>
      <div class="list">${(S.weights||[]).slice().reverse().slice(0,12).map(w=>`
        <div class="item"><span>${w.date}</span><b>${w.kg} kg</b></div>`).join("") || "<div class='empty'>Sem registros.</div>"}</div>
    </section>
    <section class="ornate card">
      <h3>Sinais do Capítulo<span>Notificações da PWA</span></h3>
      <p class="muted">${notifyStatusText()}</p>
      <label class="dose ${S.notify.on ? "on" : ""}">
        <input type="checkbox" ${S.notify.on ? "checked" : ""} onchange="toggleNotify(this.checked)">
        <b>Ativar sinais</b>
        <small>Pede permissão ao sistema. No iPhone só vale com o app na Tela de Início (iOS 16.4+).</small>
      </label>
      <label class="dose ${S.notify.water ? "on" : ""}">
        <input type="checkbox" ${S.notify.water ? "checked" : ""} onchange="S.notify.water=this.checked;save()">
        <b>Água</b><small>Lembra a cada N horas, das 7h às 22h.</small>
      </label>
      <label class="field"><span>Intervalo da água (horas)</span>
        <input type="number" min="1" max="8" value="${S.notify.waterH||3}" onchange="S.notify.waterH=Math.max(1,+this.value||3);save()">
      </label>
      <label class="dose ${S.notify.meals ? "on" : ""}">
        <input type="checkbox" ${S.notify.meals ? "checked" : ""} onchange="S.notify.meals=this.checked;save()">
        <b>Refeições</b><small>Café, almoço e jantar no horário selado.</small>
      </label>
      <div class="row2">
        <label class="field"><span>Café</span><input type="time" value="${S.notify.cafe}" onchange="S.notify.cafe=this.value;save()"></label>
        <label class="field"><span>Almoço</span><input type="time" value="${S.notify.almoco}" onchange="S.notify.almoco=this.value;save()"></label>
      </div>
      <label class="field"><span>Jantar</span><input type="time" value="${S.notify.jantar}" onchange="S.notify.jantar=this.value;save()"></label>
      <label class="dose ${S.notify.peso ? "on" : ""}">
        <input type="checkbox" ${S.notify.peso ? "checked" : ""} onchange="S.notify.peso=this.checked;save()">
        <b>Peso</b><small>Um toque de manhã para lançar no Liber Ponderis.</small>
      </label>
      <label class="field"><span>Horário do peso</span><input type="time" value="${S.notify.pesoAt}" onchange="S.notify.pesoAt=this.value;save()"></label>
      <label class="dose ${S.notify.cut ? "on" : ""}">
        <input type="checkbox" ${S.notify.cut ? "checked" : ""} onchange="S.notify.cut=this.checked;save()">
        <b>Campanha</b><small>Avisa no fim do Marine / janela do break.</small>
      </label>
      <button class="btn ghost" onclick="testNotify()">Disparar sinal de teste</button>
      <p class="quote">Isto é sino local via service worker. Push remoto (chegar com o app morto no iPhone) pede servidor APNs — o Códice ainda não tem retaguarda.</p>
    </section>
    <section class="ornate card">
      <h3>Selo do Servitor<span>JSON do bot · o Códice aplica</span></h3>
      <p class="muted">Cole o bloco que o Apothecary Servitor devolver. Prato-receita tem que vir desmembrado (batata + camarão + queijo), nunca um único q.</p>
      <label class="field"><span>Código</span>
        <textarea id="bot-seal" placeholder='{"v":1,"date":"2026-09-23","meals":{"almoco":[{"q":"batata inglesa cozida","g":200},{"q":"camarão cozido","g":80}]}}'></textarea>
      </label>
      <button class="btn" onclick="importBotSeal()">Aplicar no Diarium</button>
      <p class="muted" id="bot-seal-msg"></p>
    </section>
    <section class="ornate card install-hint">
      <h3>Instalar o Códice<span>PWA v${APP_VER}</span></h3>
      <p>iPhone: Safari → Compartilhar → <b>Adicionar à Tela de Início</b>. Android: o banner “Instalar”, se aparecer.</p>
      <button class="btn" id="btn-install" style="display:none" onclick="doInstall()">Instalar Astartes Nutrition</button>
      <button class="btn" onclick="updateCodex()">Atualizar Códice (forçar nova versão)</button>
      <p class="muted" id="sw-status">Cache ${navigator.onLine ? "online" : "offline"}.</p>
      <button class="btn ghost" onclick="exportData()">Exportar dados (JSON)</button>
      <button class="btn ghost" onclick="if(confirm('Apagar o Códice deste aparelho?')){localStorage.removeItem(KEY);location.reload()}">Resetar Códice</button>
    </section>
    <p class="quote">In nomine Imperatoris. A ração é dever.</p>
  `;
  if (installEvt) $("#btn-install").style.display = "block";
  drawWeight(S.weights || []);
}
window.saveProfile = function() {
  const p = S.profile;
  const prev = p.goal;
  p.weight = +$("#pw").value; p.age = +$("#pa").value; p.height = +$("#ph").value;
  const picked = document.querySelector('input[name="pp"]:checked');
  p.proteinPerKg = normProt(picked ? picked.value : p.proteinPerKg);
  p.activity = $("#pac").value; p.goal = $("#pg").value;
  p.waterGoal = +$("#pwa").value || 2500;
  if (p.goal === "cut") p.cutDeficitPct = readCutDeficit();
  applyGoalShift(p, prev, p.goal);
  save(); renderFrater();
};
function applyGoalShift(p, prev, next) {
  if (next === "cut" && prev !== "cut") {
    p.cutStart = today();
    p.cutDoctrine = p.cutDoctrine === "ultra" ? "ultra" : "marine";
    p.cutWeeks = doctrineOf(p).weeks;
  }
  if (next === "break" && prev !== "break") {
    p.breakStart = today();
    p.breakDays = BREAK_DAYS;
    const last = (S.weights || []).slice(-1)[0];
    if (last && last.kg) p.weight = last.kg;
  }
  if (next === "bulk" && prev !== "bulk") p.bulkStart = today();
}
window.startDietBreak = function() {
  const p = S.profile;
  applyGoalShift(p, p.goal, "break");
  p.goal = "break";
  save(); show("page-diario");
};
window.startUltraMarine = function() {
  const p = S.profile;
  p.goal = "cut";
  p.cutDoctrine = "ultra";
  p.cutWeeks = 16;
  if (!p.cutStart) p.cutStart = today();
  save(); show("page-diario");
};
window.resumeMarine = function() {
  const p = S.profile;
  applyGoalShift(p, p.goal, "cut");
  p.goal = "cut";
  p.cutDoctrine = "marine";
  p.cutWeeks = 10;
  p.cutStart = today();
  save(); show("page-diario");
};
window.toggleCarbCycle = function(on) {
  S.profile.carbCycle = !!on;
  if (on && !S.profile.carbCycleStart) S.profile.carbCycleStart = today();
  if (!on) S.profile.carbCycleStart = null;
  save();
  if (document.getElementById("page-diario").classList.contains("active")) renderDiario();
  else renderFrater();
};
window.flipCarbCycle = function() {
  const p = S.profile;
  if (!p.carbCycle) return;
  const ph = cyclePhase(p, today());
  p.carbCycleStart = today();
  if (ph === "high") p.carbCycleStart = shiftDate(today(), -1);
  save();
  if (document.getElementById("page-diario").classList.contains("active")) renderDiario();
  else renderFrater();
};
window.toggleRecomp = function(on) {
  S.profile.recompSuccessful = !!on;
  save();
  if (document.getElementById("page-diario").classList.contains("active")) renderDiario();
  else renderFrater();
};
window.startBulk = function() {
  const p = S.profile;
  applyGoalShift(p, p.goal, "bulk");
  p.goal = "bulk";
  save(); show("page-diario");
};
window.saveBreakClock = function() {
  S.profile.breakStart = $("#bstart").value || today();
  S.profile.breakDays = BREAK_DAYS;
  save(); renderFrater();
};
function readCutDeficit() {
  const free = document.getElementById("cdef");
  const picked = document.querySelector('input[name="cutDef"]:checked');
  const raw = free && free.value !== "" ? +free.value : (picked ? +picked.value : 15);
  return cutDeficitPct({ cutDeficitPct: raw });
}
window.saveCutClock = function() {
  const p = S.profile;
  p.cutStart = $("#cstart").value || today();
  const picked = document.querySelector('input[name="cutDoctrine"]:checked');
  p.cutDoctrine = picked && picked.value === "ultra" ? "ultra" : "marine";
  p.cutWeeks = doctrineOf(p).weeks;
  p.cutDeficitPct = readCutDeficit();
  save(); renderFrater();
};
window.resetCutClock = function() {
  S.profile.cutStart = today();
  S.profile.cutDoctrine = S.profile.cutDoctrine === "ultra" ? "ultra" : "marine";
  S.profile.cutWeeks = doctrineOf(S.profile).weeks;
  save(); renderFrater();
};
window.logWeight = function() {
  const kg = +$("#nw").value;
  if (!kg) return;
  S.weights.push({ date: today(), kg });
  S.profile.weight = kg;
  save(); renderFrater();
};
function drawWeight(rows) {
  const c = $("#weightChart"); if (!c) return;
  const data = rows.slice().sort((a,b) => a.date.localeCompare(b.date));
  const w = c.width = c.clientWidth * 2;
  const h = c.height = 140 * 2;
  const ctx = c.getContext("2d");
  ctx.clearRect(0,0,w,h);
  if (data.length < 2) {
    ctx.fillStyle = "#1c140e";
    ctx.font = "22px Cinzel";
    ctx.fillText("Lance dois pesos para ver a curva.", 24, h/2);
    return;
  }
  const ys = data.map(x => x.kg);
  const min = Math.min(...ys) - 0.5, max = Math.max(...ys) + 0.5;
  const pad = 28;
  const xOf = i => pad + i * ((w - pad * 2) / (data.length - 1));
  const yOf = v => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  ctx.strokeStyle = "#9a7b32";
  ctx.lineWidth = 3;
  ctx.beginPath();
  data.forEach((x,i) => { const X=xOf(i), Y=yOf(x.kg); i?ctx.lineTo(X,Y):ctx.moveTo(X,Y); });
  ctx.stroke();
  ctx.fillStyle = "#5c3a1e";
  data.forEach((x,i) => { ctx.beginPath(); ctx.arc(xOf(i), yOf(x.kg), 5, 0, 7); ctx.fill(); });
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function notifyStatusText() {
  if (!("Notification" in window)) return "Este Safari não expõe a API de notificação.";
  const perm = Notification.permission;
  const home = isStandalone() ? "instalado na Tela de Início" : "ainda no Safari (não instalado)";
  return `Permissão: ${perm === "granted" ? "concedida" : perm === "denied" ? "negada" : "pendente"} · ${home}.`;
}
window.toggleNotify = async function(on) {
  S.notify = Object.assign(defaultNotify(), S.notify || {});
  if (!on) { S.notify.on = false; save(); renderFrater(); return; }
  if (!("Notification" in window)) { alert("Notificações indisponíveis neste aparelho."); S.notify.on = false; save(); renderFrater(); return; }
  const perm = await Notification.requestPermission();
  S.notify.on = perm === "granted";
  save();
  if (S.notify.on) {
    await fireNotify("Astartes Nutrition", "Sinais do Capítulo armados.", "hello", "page-diario");
    tickNotify();
  } else if (perm === "denied") {
    alert("Permissão negada. No iPhone: Ajustes → Astartes → Notificações.");
  } else if (!isStandalone()) {
    alert("No iPhone, instale na Tela de Início e abra por lá para o sistema oferecer a permissão.");
  }
  renderFrater();
};
window.testNotify = async function() {
  if (Notification.permission !== "granted") return toggleNotify(true);
  await fireNotify("Sinal de teste", "O Códice alcançou o aparelho.", "test", "page-diario");
};
async function fireNotify(title, body, tag, go) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const opts = {
    body, tag: tag || "astartes",
    icon: "assets/icon-192.png",
    badge: "assets/icon-192.png",
    data: { go: go || "page-diario" },
    renotify: true
  };
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.ready : null;
    if (reg && reg.showNotification) await reg.showNotification(title, opts);
    else new Notification(title, opts);
  } catch (err) {
    try { new Notification(title, opts); } catch (e) {}
  }
}
function hmNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function marked(key, slot) {
  S.notify.last = S.notify.last || {};
  if (S.notify.last[key] === slot) return true;
  S.notify.last[key] = slot;
  save();
  return false;
}
async function tickNotify() {
  const n = S.notify;
  if (!n || !n.on || Notification.permission !== "granted" || !S.profile) return;
  const now = new Date();
  const hour = now.getHours();
  const day = today();
  const hm = hmNow();
  if (n.meals) {
    for (const [id, label] of [["cafe","Café da manhã"],["almoco","Almoço"],["jantar","Jantar"]]) {
      if (hm === n[id] && !marked(id, day + " " + hm)) {
        const empty = !(dayObj(day)[id] || []).length;
        if (empty) await fireNotify(label, "A ração desta hora ainda não foi lançada.", "meal-"+id, "page-diario");
      }
    }
  }
  if (n.water && hour >= 7 && hour <= 22) {
    const slot = day + "-" + Math.floor(hour / (n.waterH || 3));
    if (!marked("water", slot)) {
      const w = dayObj(day).water || 0;
      if (w < (S.profile.waterGoal || 2500)) {
        await fireNotify("Água", `${w} ml de ${S.profile.waterGoal || 2500} ml. A hidratação é municiamento.`, "water", "page-diario");
      }
    }
  }
  if (n.peso && hm === n.pesoAt && !marked("peso", day)) {
    await fireNotify("Liber Ponderis", "Lance o peso de hoje.", "peso", "page-frater");
  }
  if (n.cut && S.profile.goal === "cut") {
    const cs = cutState(S.profile, day);
    if (cs && (cs.phase === "warn" || cs.phase === "adapt") && !marked("cut", day + cs.phase)) {
      await fireNotify(cs.doc.n, cs.banner, "cut", "page-diario");
    }
  }
  if (n.cut && S.profile.goal === "break") {
    const bs = breakState(S.profile, day);
    if (bs && (bs.phase === "warn" || bs.phase === "adapt") && !marked("break", day + bs.phase)) {
      await fireNotify("Diet Break", bs.banner, "break", "page-diario");
    }
  }
}
window.updateCodex = async function() {
  const el = $("#sw-status");
  if (el) el.textContent = "Buscando nova versão…";
  try {
    if (navigator.serviceWorker) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.update()));
    }
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (err) {}
  location.reload();
};
window.exportData = function() {
  const blob = new Blob([JSON.stringify(S,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "astartes-nutrition.json";
  a.click();
};
window.importBotSeal = function() {
  const box = document.getElementById("bot-seal");
  const msg = document.getElementById("bot-seal-msg");
  let raw = (box && box.value || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let data;
  try { data = JSON.parse(raw); } catch (e) {
    if (msg) msg.textContent = "JSON inválido.";
    return;
  }
  const date = data.date || today();
  if (!data.meals) { if (msg) msg.textContent = "Falta meals."; return; }
  const d = dayObj(date);
  const keys = ["cafe", "almoco", "jantar", "lanches"];
  let nAdd = 0, miss = [];
  keys.forEach(k => {
    (data.meals[k] || []).forEach(it => {
      let f = it.id ? foodById(it.id) : null;
      if (!f && it.q && typeof rankEscriba === "function") {
        const hits = rankEscriba(it.q);
        f = hits[0];
        if (hits[1] && foodScore(hits[1], it.q) - foodScore(hits[0], it.q) < 30) f = null;
      }
      if (!f) { miss.push(it.q || it.id || "?"); return; }
      d[k].push(scaleFood(f, Number(it.g || it.grams || 100)));
      nAdd++;
    });
  });
  save();
  if (msg) msg.textContent = nAdd
    ? (nAdd + " rações em " + date + (miss.length ? ". Sem match: " + miss.join(", ") : "."))
    : ("Nada aplicado." + (miss.length ? " Sem match: " + miss.join(", ") : ""));
  if (nAdd) show("page-diario");
};
window.doInstall = async function() {
  if (!installEvt) return;
  installEvt.prompt();
  await installEvt.userChoice;
  installEvt = null;
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".nav button[data-go]").forEach(b => {
    b.onclick = () => {
      if (!S.profile && b.dataset.go !== "page-onboard") return renderOnboard();
      show(b.dataset.go);
    };
  });
  $(".plus").onclick = () => { if (S.profile) openAdd(pendingMeal); };
  renderAll();
  tickNotify();
  setInterval(tickNotify, 30000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tickNotify(); });
});
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault(); installEvt = e;
});
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").then(reg => {
    reg.update().catch(() => {});
  }).catch(() => {});
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!window.__astartesReloaded) { window.__astartesReloaded = true; location.reload(); }
  });
  navigator.serviceWorker.addEventListener("message", ev => {
    if (ev.data && ev.data.type === "open" && ev.data.go) show(ev.data.go);
  });
}
