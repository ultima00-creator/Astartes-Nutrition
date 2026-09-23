/* OCR Tesseract local — rótulo no aparelho, sem API. */
(function () {
  const CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
  let loading = null;
  function loadEngine() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = CDN; s.async = true;
      s.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error("tesseract"));
      s.onerror = () => reject(new Error("cdn"));
      document.head.appendChild(s);
    });
    return loading;
  }
  function resizeFile(file, max) {
    max = max || 1400;
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => b ? resolve(b) : reject(new Error("blob")), "image/jpeg", 0.88);
      };
      img.onerror = reject;
      img.src = url;
    });
  }
  function tidy(text) {
    return (text || "").replace(/[|]/g, "I").split(/\n+/).map(l => l.replace(/\s+/g, " ").trim())
      .filter(l => l.length >= 3 && /[a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(l)).slice(0, 12).join("\n");
  }
  function guessQuery(text) {
    const flat = tidy(text).replace(/\n/g, " ");
    const g = typeof parseGrams === "function" ? parseGrams(flat) : null;
    const stop = /^(ingredientes|ingredient|nutri|valor|porcao|porção|tabela|informacao|informação|calorias|proteina|proteína|carboidrato|gordura|fibra|sodio|sódio|www|http|lote|validade|conservar)$/i;
    const words = flat.toLowerCase().split(/[^a-záàâãéêíóôõúç0-9]+/).filter(w => w.length > 2 && !stop.test(w));
    return (words.slice(0, 8).join(" ") + (g ? " " + g + "g" : "")).trim();
  }
  window.runLocalOcr = async function (file, onProg) {
    const T = await loadEngine();
    const blob = await resizeFile(file);
    const result = await T.recognize(blob, "por+eng", { logger: m => { if (onProg && m.status) onProg(m.status, m.progress || 0); } });
    const text = tidy(result.data && result.data.text);
    const conf = result.data && typeof result.data.confidence === "number" ? result.data.confidence : 0;
    return { text, conf, query: guessQuery(text) };
  };
  const prevPic = window.onEscribaPic;
  window.onEscribaPic = function (inp) {
    if (typeof prevPic === "function") prevPic(inp);
    const file = inp.files && inp.files[0];
    if (!file) return;
    const box = document.getElementById("escr-preview");
    if (!box) return;
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = "Ler texto no aparelho (OCR)";
    btn.onclick = () => window.ocrEscriba(file);
    box.appendChild(btn);
    const p = document.createElement("p");
    p.className = "muted"; p.id = "ocr-status";
    p.textContent = "OCR Tesseract local · por+eng. A primeira vez baixa o motor.";
    box.appendChild(p);
  };
  window.ocrEscriba = async function (file) {
    const status = document.getElementById("ocr-status") || document.getElementById("escr-note");
    const q = document.getElementById("escr-q");
    try {
      if (status) status.textContent = "Carregando Tesseract…";
      const out = await window.runLocalOcr(file, (st, pr) => { if (status) status.textContent = st + (pr ? " " + Math.round(pr * 100) + "%" : ""); });
      if (q && out.query) q.value = out.query;
      if (status) status.textContent = out.text ? ("Lido (" + Math.round(out.conf) + "%): " + out.text.replace(/\n/g, " · ")) : "Nenhum texto nítido. Aproxime o rótulo.";
      if (out.query && out.conf >= 40 && typeof window.runEscriba === "function") window.runEscriba();
    } catch (err) {
      if (status) status.textContent = "OCR falhou: " + (err.message || err);
    }
  };
})();
