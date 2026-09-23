/* Apothecary Advisor — plano e substituição. Grok é facultativo. */
(function () {
  const STAPLES = [
    ["peito", "frango", "grelhad"],
    ["patinho", "moid"],
    ["ovo", "cozid"],
    ["arroz", "branco", "cozid"],
    ["feijao", "preto"],
    ["batata", "doce"],
    ["banana"],
    ["brocolis", "cozid"],
    ["aveia"],
    ["whey"]
  ];

  function fold(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function pickStaple(tokens) {
    const list = (typeof allFoods === "function" ? allFoods() : []).filter(f => !/papa|pure de |amassad/.test(fold(f.name)));
    let best = null, score = 1e9;
    list.forEach(f => {
      const n = fold(f.name);
      if (tokens.some(t => !n.includes(t))) return;
      let s = n.length;
      if (f.src === "Extra" || f.source === "custom") s -= 80;
      if (s < score) { score = s; best = f; }
    });
    return best;
  }
  function portion(f, grams) {
    const k = grams / 100;
    return {
      id: f.id, name: f.name, grams,
      kcal: +(f.kcal || 0) * k, p: +(f.p || 0) * k, c: +(f.c || 0) * k, fat: +(f.f || 0) * k,
      fe: +(f.fe || 0) * k, zn: +(f.zn || 0) * k, ca: +(f.ca || 0) * k, mg: +(f.mg || 0) * k,
      c_vit: +(f.vc || f.c_vit || 0) * k, a: +(f.a || 0) * k
    };
  }
  function microLine(x) {
    return `Fe ${fmt(x.fe,1)} · Zn ${fmt(x.zn,1)} · Ca ${fmt(x.ca,0)} · Mg ${fmt(x.mg,0)} · C ${fmt(x.c_vit,1)}`;
  }

  function buildPlan() {
    const p = S.profile;
    if (!p) return null;
    const t = targets(p);
    const picks = STAPLES.map(tok => pickStaple(tok)).filter(Boolean);
    const peito = pickStaple(["peito", "frango"]) || picks[0];
    const patinho = pickStaple(["patinho"]) || peito;
    const arroz = pickStaple(["arroz"]) || picks[0];
    const feijao = pickStaple(["feijao"]) || pickStaple(["feijão"]);
    const ovo = pickStaple(["ovo"]);
    const banana = pickStaple(["banana"]);
    const broc = pickStaple(["brocolis"]) || pickStaple(["brocoli"]);
    const aveia = pickStaple(["aveia"]);
    const whey = pickStaple(["whey"]);
    const meals = [
      { n: "Café", items: [ovo && portion(ovo, 100), aveia && portion(aveia, 40), banana && portion(banana, 80)].filter(Boolean) },
      { n: "Almoço", items: [peito && portion(peito, 150), arroz && portion(arroz, 150), feijao && portion(feijao, 80), broc && portion(broc, 80)].filter(Boolean) },
      { n: "Jantar", items: [patinho && portion(patinho, 150), arroz && portion(arroz, 100), broc && portion(broc, 80)].filter(Boolean) },
      { n: "Lanches", items: [whey && portion(whey, 30), banana && portion(banana, 80)].filter(Boolean) }
    ];
    const tot = { kcal: 0, p: 0, c: 0, fat: 0, fe: 0, zn: 0, ca: 0, mg: 0, c_vit: 0 };
    meals.forEach(m => m.items.forEach(it => Object.keys(tot).forEach(k => { tot[k] += it[k] || 0; })));
    return { t, meals, tot };
  }

  function swapFor(id) {
    const src = typeof foodById === "function" ? foodById(id) : null;
    if (!src) return [];
    const list = (typeof allFoods === "function" ? allFoods() : []).filter(f => f.id !== id && f.p > 3);
    const scored = list.map(f => {
      const dp = Math.abs((f.p || 0) - (src.p || 0));
      const micros = (f.fe || 0) + (f.zn || 0) + (f.ca || 0) / 100 + (f.mg || 0) / 50 + (f.vc || f.c_vit || 0) / 10;
      const srcM = (src.fe || 0) + (src.zn || 0) + (src.ca || 0) / 100 + (src.mg || 0) / 50 + (src.vc || src.c_vit || 0) / 10;
      const name = fold(f.name);
      let pen = name.length * 0.02;
      if (/papa|sanduiche|empada|bolo|suco,|refriger/.test(name)) pen += 40;
      return { f, score: dp * 2 - (micros - srcM) + pen, micros, dp };
    }).sort((a, b) => a.score - b.score).slice(0, 6);
    return scored;
  }

  window.renderApothecary = function () {
    const page = document.getElementById("page-apothecary");
    if (!page) return;
    if (!S.profile) { page.innerHTML = `<p class="empty">Forje o Capítulo no Origo primeiro.</p>`; return; }
    const plan = buildPlan();
    const keyed = !!(localStorage.getItem("astartes_xai_key") || "").trim();
    page.innerHTML = `
      <section class="ornate card">
        <h3>Apothecary Advisor<span>Plano do dia · ${plan.t.kcal} kcal · P ${plan.t.prot} g</span></h3>
        <p class="quote">Sugestão pela TBCA no peso e na doutrina atuais. Não é prescrição médica.</p>
        ${plan.meals.map(m => `
          <div class="meal">
            <div class="meal-h"><b>${m.n}</b><span class="muted">${fmt(m.items.reduce((s,i)=>s+i.kcal,0))} kcal</span></div>
            ${m.items.map(it => `<div class="entry"><div class="name">${it.name}<div class="meta">${fmt(it.grams,0)} g · P ${fmt(it.p,1)} · ${microLine(it)}</div></div><div>${fmt(it.kcal)} kcal</div></div>`).join("")}
          </div>`).join("")}
        <p class="muted">Total: ${fmt(plan.tot.kcal)} kcal · P ${fmt(plan.tot.p,0)} · C ${fmt(plan.tot.c,0)} · G ${fmt(plan.tot.fat,0)}</p>
        <p class="muted">Micros do plano: Fe ${fmt(plan.tot.fe,1)}/${DRI.fe} · Zn ${fmt(plan.tot.zn,1)}/${DRI.zn} · Ca ${fmt(plan.tot.ca,0)}/${DRI.ca} · C ${fmt(plan.tot.c_vit,1)}/${DRI.c}</p>
        <button class="btn" onclick="applyApothecaryPlan()">Lançar este plano no Diarium de hoje</button>
      </section>
      <section class="ornate card">
        <h3>Substituição<span>Macros + micros de desempenho</span></h3>
        <label class="field"><span>Trocar qual ração</span>
          <select id="apo-src">${(typeof allFoods==="function"?allFoods():[]).filter(f=>f.p>8 && fold(f.name).length<48).slice(0,80).map(f=>`<option value="${f.id}">${f.name}</option>`).join("")}</select>
        </label>
        <button class="btn ghost" onclick="showSwaps()">Pedir alternativas</button>
        <div id="apo-swaps"></div>
      </section>
      <section class="ornate card">
        <h3>Conselho do Escriba<span>${keyed ? "Grok facultativo · ligado" : "Grok desligado · só a tabela"}</span></h3>
        <label class="field"><span>Pedido</span>
          <textarea id="apo-ask" placeholder="Ex.: trocar o arroz do almoço sem perder magnésio"></textarea>
        </label>
        <button class="btn" onclick="askApothecary()">${keyed ? "Consultar o Grok" : "Aconselhar só com a TBCA"}</button>
        <p class="muted" id="apo-ans"></p>
      </section>
      <section class="ornate card">
        <h3>Selo do Escriba<span>O bot devolve · o Códice aplica</span></h3>
        <p class="muted">Cole o JSON gerado neste chat. Macros saem da TBCA.</p>
        <label class="field"><span>Retorno do bot</span>
          <textarea id="apo-seal" placeholder='{"v":1,"date":"2026-09-23","meals":{"almoco":[{"q":"patinho moída refogada","g":200}]}}'></textarea>
        </label>
        <button class="btn" onclick="importApothecarySeal()">Aplicar no Diarium</button>
        <p class="muted" id="apo-seal-msg"></p>
      </section>
      <button class="btn ghost" onclick="show('page-diario')">Voltar ao Diarium</button>
    `;
  };

  window.applyApothecaryPlan = function () {
    const plan = buildPlan();
    if (!plan) return;
    const map = { "Café": "cafe", "Almoço": "almoco", "Jantar": "jantar", "Lanches": "lanches" };
    const d = dayObj(today());
    Object.values(map).forEach(k => { d[k] = []; });
    plan.meals.forEach(m => {
      const key = map[m.n];
      m.items.forEach(it => {
        const f = foodById(it.id);
        if (f) d[key].push(scaleFood(f, it.grams));
      });
    });
    save();
    show("page-diario");
  };

  window.showSwaps = function () {
    const id = document.getElementById("apo-src").value;
    const src = foodById(id);
    const box = document.getElementById("apo-swaps");
    const rows = swapFor(id);
    box.innerHTML = `<p class="muted">Base: ${src.name} · P ${src.p}/100g · Fe ${src.fe || 0} · Zn ${src.zn || 0}</p>
      <div class="list">${rows.map(r => `
        <div class="item" onclick="pickFood('${r.f.id}')">
          <div><b>${r.f.name}</b><div class="meta">ΔP ${fmt(r.dp,1)} · Fe ${r.f.fe||0} · Zn ${r.f.zn||0} · C ${r.f.vc||r.f.c_vit||0}</div></div>
          <div class="muted">${r.f.kcal} kcal</div>
        </div>`).join("")}</div>`;
  };

  window.importApothecarySeal = function () {
    const box = document.getElementById("apo-seal");
    const msg = document.getElementById("apo-seal-msg");
    let raw = (box && box.value || "").trim();
    raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let data;
    try { data = JSON.parse(raw); } catch (e) {
      if (msg) msg.textContent = "JSON inválido.";
      return;
    }
    const date = data.date || (typeof today === "function" ? today() : null);
    if (!date || !data.meals) {
      if (msg) msg.textContent = "Falta date ou meals.";
      return;
    }
    const d = dayObj(date);
    const keys = ["cafe", "almoco", "jantar", "lanches"];
    let nAdd = 0, miss = [];
    keys.forEach(k => {
      (data.meals[k] || []).forEach(it => {
        let f = it.id && typeof foodById === "function" ? foodById(it.id) : null;
        if (!f && it.q && typeof rankEscriba === "function") f = rankEscriba(it.q)[0];
        if (!f && it.q && typeof allFoods === "function") {
          const q = it.q;
          f = allFoods().find(x => fold(x.name).includes(fold(q))) || null;
        }
        if (!f) { miss.push(it.q || it.id || "?"); return; }
        const g = Number(it.g || it.grams || 100);
        d[k].push(scaleFood(f, g));
        nAdd++;
      });
    });
    if (typeof save === "function") save();
    if (msg) msg.textContent = nAdd
      ? (nAdd + " rações seladas em " + date + (miss.length ? ". Sem match: " + miss.join(", ") : "."))
      : ("Nada aplicado. " + (miss.length ? "Sem match: " + miss.join(", ") : ""));
    if (nAdd && typeof show === "function") show("page-diario");
  };

  window.askApothecary = async function () {
    const q = (document.getElementById("apo-ask").value || "").trim();
    const ans = document.getElementById("apo-ans");
    if (!q) { ans.textContent = "Escreva o pedido."; return; }
    const plan = buildPlan();
    const local = `Pedido: ${q}. Plano atual ~ ${fmt(plan.tot.kcal)} kcal, P ${fmt(plan.tot.p,0)} g. Fe ${fmt(plan.tot.fe,1)}/${DRI.fe} mg, Zn ${fmt(plan.tot.zn,1)}/${DRI.zn} mg, C ${fmt(plan.tot.c_vit,1)}/${DRI.c} mg. Use a lista de substituição acima — o Códice não inventa vitamina.`;
    const key = (localStorage.getItem("astartes_xai_key") || "").trim();
    if (!key) { ans.textContent = local; return; }
    ans.textContent = "Consultando o Escriba…";
    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
        body: JSON.stringify({
          model: "grok-4-fast",
          temperature: 0.3,
          messages: [{ role: "user", content: `Apothecary Advisor PT-BR. ${local} Responda em 8 linhas. Não invente kcal. Sugira substituições da TBCA (nome curto) preservando proteína e citando Fe/Zn/Mg/C se relevante.` }]
        })
      });
      const json = await res.json();
      ans.textContent = (((json.choices || [])[0] || {}).message || {}).content || local;
    } catch (e) {
      ans.textContent = local + " (Grok indisponível neste browser.)";
    }
  };
})();
