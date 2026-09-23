/* Patinho moído em degraus de 100 g. */
(function () {
  const extra = [
    {id:"patinho-moido-cru", name:"Carne, bovina, patinho, moída, crua", cat:"Carnes", src:"Extra", kcal:137, p:21.7, c:0, f:5.5, servings:[{n:"100 g",g:100},{n:"200 g",g:200},{n:"300 g",g:300},{n:"400 g",g:400}]},
    {id:"patinho-moido-refogado", name:"Carne, bovina, patinho, moída, refogada", cat:"Carnes", src:"Extra", kcal:186, p:22.0, c:1.2, f:10.4, servings:[{n:"100 g",g:100},{n:"200 g",g:200},{n:"300 g",g:300},{n:"400 g",g:400}]},
    {id:"patinho-moido-grelhado", name:"Carne, bovina, patinho, moída, grelhada", cat:"Carnes", src:"Extra", kcal:165, p:26.5, c:0, f:6.2, servings:[{n:"100 g",g:100},{n:"200 g",g:200},{n:"300 g",g:300},{n:"400 g",g:400}]}
  ];
  const list = window.ASTARTES_FOODS || [];
  extra.forEach(e => {
    const i = list.findIndex(f => f.id === e.id);
    if (i >= 0) list[i] = e; else list.push(e);
  });
  window.ASTARTES_FOODS = list;
})();
