/* Cortes simples de patinho moído — a TBCA só traz o corte em papas/lasanhas. Valores /100 g. */
(function () {
  const extra = [
    {id:"patinho-moido-cru", name:"Carne, bovina, patinho, moída, crua", cat:"Carnes", src:"Extra", kcal:137, p:21.7, c:0, f:5.5, servings:[{n:"100 g",g:100},{n:"porção 150 g",g:150},{n:"300 g",g:300}]},
    {id:"patinho-moido-refogado", name:"Carne, bovina, patinho, moída, refogada", cat:"Carnes", src:"Extra", kcal:186, p:22.0, c:1.2, f:10.4, servings:[{n:"100 g",g:100},{n:"porção 150 g",g:150},{n:"300 g",g:300}]},
    {id:"patinho-moido-grelhado", name:"Carne, bovina, patinho, moída, grelhada", cat:"Carnes", src:"Extra", kcal:165, p:26.5, c:0, f:6.2, servings:[{n:"100 g",g:100},{n:"porção 150 g",g:150},{n:"300 g",g:300}]}
  ];
  const list = window.ASTARTES_FOODS || [];
  extra.forEach(e => { if (!list.some(f => f.id === e.id)) list.push(e); });
  window.ASTARTES_FOODS = list;
})();
