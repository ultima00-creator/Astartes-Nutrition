/* Papa (jargão pediátrico TBCA) → moída / purê / amassada(o) */
(function () {
  function fold(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function rewrite(name) {
    if (!name || !/^papa de /i.test(name)) return name;
    const rest = name.replace(/^papa de /i, "");
    const low = fold(rest);
    const meat = /carne|frango|peito|peixe|figado|bovina|patinho|acem/.test(low);
    const ground = /moid/.test(low);
    const fruit = /banana|mamao|maca|pera|abacate|ameixa|laranja/.test(low);
    const tuber = /batata|inhame|cara |cara,|abobora|mandioca|aipim|mandioquinha|cenoura|brocolis|chuchu|abobrin/.test(low);
    if (meat && ground) {
      return rest
        .replace(/^carne bovina mo[ií]da/i, "Carne moída")
        .replace(/^carne mo[ií]da bovina/i, "Carne moída");
    }
    if (meat) {
      return "Amassado de " + rest.charAt(0).toLowerCase() + rest.slice(1);
    }
    if (fruit && !tuber) {
      return "Amassada de " + rest.charAt(0).toLowerCase() + rest.slice(1);
    }
    return "Purê de " + rest.charAt(0).toLowerCase() + rest.slice(1);
  }
  const list = window.ASTARTES_FOODS || [];
  list.forEach(f => {
    if (!f || !f.name) return;
    const next = rewrite(f.name);
    if (next !== f.name) {
      f.namePapa = f.name;
      f.name = next;
    }
  });
  window.ASTARTES_FOODS = list;
  window.rewritePapaName = rewrite;
})();
