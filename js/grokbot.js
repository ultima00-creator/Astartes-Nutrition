/* Escriba Grok: visão + TBCA. A chave fica só no aparelho. */
(function () {
  const KEY = "astartes_xai_key";
  const MODEL = "grok-4-fast";
  const ENDPOINT = "https://api.x.ai/v1/chat/completions";

  function getKey() { return (localStorage.getItem(KEY) || "").trim(); }
  function setKey(v) {
    v = (v || "").trim();
    if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY);
  }
  window.grokKey = getKey;
  window.saveGrokKey = function () {
    const el = document.getElementById("xai-key");
    if (!el) return;
    setKey(el.value);
    alert(getKey() ? "Chave selada neste aparelho." : "Chave removida.");
  };

  function fileToDataUrl(file, max = 1024) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function askGrok(dataUrl, hint) {
    const key = getKey();
    if (!key) throw new Error("sem-chave");
    const prompt = `Você é o Escriba do Astartes Nutrition (PT-BR).
Olhe o prato e devolva APENAS JSON válido, sem markdown:
{"items":[{"q":"nome curto BR para buscar na TBCA","grams":numero ou null,"prep":"cru|refogado|grelhado|cozido|null","conf":0a1,"ask":"pergunta se estiver incerto ou vazio"}],"note":"uma linha"}
Regras:
- Não invente kcal nem proteína.
- Prefira cortes simples (patinho moída, peito de frango, arroz branco cozido).
- Se não reconhecer, items vazio e ask com pergunta objetiva.
- Dica do frater: ${hint || "(nenhuma)"}.`;
    const body = {
      model: MODEL,
      temperature: 0.2,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: dataUrl } }
        ]
      }]
    };
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + key
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error("api " + res.status + " " + t.slice(0, 180));
    }
    const json = await res.json();
    const raw = (((json.choices || [])[0] || {}).message || {}).content || "";
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("json");
    return JSON.parse(m[0]);
  }

  function paintHits(title, note, hits, grams) {
    const modal = document.getElementById("modal");
    modal.classList.add("open");
    if (!hits.length) {
      modal.innerHTML = `<div class="sheet ornate">
        <h3 class="display" style="text-align:center">${title}</h3>
        <p class="quote">${note || "O Escriba não fechou a ração."}</p>
        <button class="btn" onclick="openEscriba()">Reformular</button>
      </div>`;
      return;
    }
    window._lastRationQ = (hits[0].name || "") + (grams ? " " + grams + "g" : "");
    modal.innerHTML = `<div class="sheet ornate">
      <h3 class="display" style="text-align:center">${title}</h3>
      <p class="muted">${note || "Toque para lançar. O número é da TBCA, não do modelo."}</p>
      <div class="list">${hits.map(f => `
        <div class="item" onclick="pickFood('${f.id}')">
          <div><b>${f.name}</b><div class="meta">${f.cat || ""} · ${f.src || "TBCA"} · ${f.kcal} kcal/100g</div></div>
        </div>`).join("")}</div>
      <button class="btn ghost" onclick="openEscriba()">Nova leitura</button>
    </div>`;
  }

  const prevOpen = window.openEscriba;
  window.openEscriba = function () {
    const keyed = !!getKey();
    document.getElementById("modal").classList.add("open");
    document.getElementById("modal").innerHTML = `<div class="sheet ornate">
      <h3 class="display" style="text-align:center">Escriba Grok</h3>
      <p class="quote">${keyed ? "Aponte a câmera ao prato. O Grok lê; a TBCA assina o número." : "Sela a chave em Frater para a câmera acordar o Grok."}</p>
      <label class="field"><span>Câmera do prato</span>
        <input id="escr-pic" type="file" accept="image/*" capture="environment" onchange="onEscribaPic(this)">
      </label>
      <label class="field"><span>Dica (só se o Grok perguntar)</span>
        <input id="escr-q" placeholder="ex.: era patinho, não acém">
      </label>
      <div id="escr-preview"></div>
      <p class="muted" id="escr-note">${keyed ? "Foto dispara a leitura. Confirme o corte antes de lançar." : "Frater → Escriba Grok → chave de console.x.ai."}</p>
      ${keyed ? `<button class="btn" onclick="runEscriba()">Ler de novo</button>` : `<button class="btn" onclick="show('page-frater');closeModal()">Ir ao Frater</button>`}
      <button class="btn ghost" onclick="renderBusca()">Voltar à busca</button>
    </div>`;
  };

  const prevRun = window.runEscriba;
  window.runEscriba = async function () {
    const q = (document.getElementById("escr-q") && document.getElementById("escr-q").value || "").trim();
    const file = document.getElementById("escr-pic") && document.getElementById("escr-pic").files && document.getElementById("escr-pic").files[0];
    const note = document.getElementById("escr-note");
    if (file && getKey()) {
      try {
        if (note) note.textContent = "O Escriba examina o prato…";
        const dataUrl = await fileToDataUrl(file);
        const out = await askGrok(dataUrl, q);
        const ask = (out.items && out.items[0] && out.items[0].ask) || out.note || "";
        const queries = (out.items || []).map(it => {
          const bits = [it.q, it.prep].filter(Boolean).join(" ");
          if (it.grams) window._lastRationQ = bits + " " + it.grams + "g";
          return bits;
        }).filter(Boolean);
        if (ask && !queries.length) {
          if (note) note.textContent = ask;
          return;
        }
        let hits = [];
        queries.forEach(qq => {
          const found = (typeof rankEscriba === "function" ? rankEscriba(qq) : []).slice(0, 3);
          found.forEach(f => { if (!hits.some(h => h.id === f.id)) hits.push(f); });
        });
        if (!hits.length && q && typeof rankEscriba === "function") hits = rankEscriba(q).slice(0, 6);
        paintHits("Leitura do Escriba", ask || out.note, hits.slice(0, 8), parseGrams && parseGrams(q));
        return;
      } catch (err) {
        if (note) {
          note.textContent = String(err.message || err).indexOf("Failed to fetch") >= 0 || String(err).indexOf("TypeError") >= 0
            ? "A API xAI recusou o browser (CORS) ou a rede caiu. Use o texto ou um proxy. A chave não foi o Códice inventar servidor."
            : "Falha do Escriba: " + err.message;
        }
        if (q && typeof prevRun === "function") return prevRun();
        return;
      }
    }
    if (typeof prevRun === "function") return prevRun();
  };

  window.grokbotCard = function () {
    const k = getKey();
    return `<section class="ornate card">
      <h3>Escriba Grok<span>Visão do prato via API xAI</span></h3>
      <p class="muted">Chave em console.x.ai. Fica só neste aparelho. O modelo sugere o alimento; kcal e macros saem da TBCA.</p>
      <label class="field"><span>Chave API</span>
        <input id="xai-key" type="password" autocomplete="off" placeholder="${k ? "•••• já selada" : "xai-..."}">
      </label>
      <button class="btn" onclick="saveGrokKey()">Selar chave</button>
      <p class="quote">Modelo ${MODEL}. A assinatura SuperGrok do chat não paga esta chamada — a PWA usa a chave da API.</p>
    </section>`;
  };

  const prevFrater = window.renderFrater;
  // hook after first paint via monkeypatch when renderFrater exists
  const hook = () => {
    if (typeof window.renderFrater !== "function") return;
    const orig = window.renderFrater;
    if (orig.__grok) return;
    window.renderFrater = function () {
      orig();
      const page = document.getElementById("page-frater");
      if (!page) return;
      const install = page.querySelector(".install-hint");
      const card = document.createElement("div");
      card.innerHTML = window.grokbotCard();
      const node = card.firstElementChild;
      if (install) page.insertBefore(node, install);
      else page.appendChild(node);
    };
    window.renderFrater.__grok = true;
  };
  const prevPic = window.onEscribaPic;
  window.onEscribaPic = function (inp) {
    if (typeof prevPic === "function") prevPic(inp);
    const file = inp.files && inp.files[0];
    const box = document.getElementById("escr-preview");
    const note = document.getElementById("escr-note");
    if (file && box) {
      const extra = box.querySelector(".muted");
      if (extra && extra.id !== "escr-note") extra.textContent = getKey()
        ? "Enviando ao Grok…"
        : "Sem chave a câmera não identifica o prato.";
    }
    if (file && getKey()) window.runEscriba();
    else if (note && !getKey()) note.textContent = "Sela a chave no Frater. O SuperGrok do chat não substitui essa chamada.";
  };
  hook();
  document.addEventListener("DOMContentLoaded", hook);
})();
