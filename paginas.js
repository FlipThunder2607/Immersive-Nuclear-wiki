/* Immersive Nuclear wiki: page tree and texts. The machines, items and fluids of the purification line come from
   recursos/itens-e-fluidos/progressao/dados.js (IN_GRAPH, updated every version); this file only says which nodes
   each page shows and adds the texts. The planned topics (enrichment onwards) have their own small graphs here, built
   from docs/PLANEJAMENTO-INICIAL.md, docs/CADEIA-URANIO-ATE-COMBUSTIVEL.md (the machines of enrichment and fuel),
   docs/SUBPRODUTOS-ENRIQUECIMENTO-E-COMBUSTIVEL.md (their products and by-products, researched) and
   docs/contaminacao-immersive-nuclear-v1.txt: nothing in them is decided beyond what those documents say, so their
   nodes are 'Previsto' (named in the chain) or 'Em aberto'.
   Image paths are relative to design/ (D). */
window.IN_WIKI=(()=>{
const D='recursos/',img=(src,cap)=>({src:D+src,cap}),ph=cap=>({cap});
// Small graph builder for the planned topics: nodes placed on a grid (col, row), edges as in dados.js. A node may end
// with extras ({glyph, img, model}); an edge may end with its own points (via), in grid units like the nodes.
const GX=col=>130+col*230,GY=row=>110+row*200;
const plan=(nodes,edges)=>{const ns=nodes.map(([id,name,col,row,kind,status,recipe,info,extra])=>({id,name,x:GX(col),y:GY(row),kind,img:null,recipe,info,status,...extra}));
  return {nodes:ns,edges:edges.map(([a,b,type='main',via=null])=>({a,b,type,via:via&&via.map(([c,r])=>[GX(c),GY(r)])}))};};
const OPEN='A definir.';
// ---------- Contamination tree (docs/contaminacao-immersive-nuclear-v1.txt) ----------
// Two halves side by side (radiological + particulate, chemical + physical). Per type: its protections on the left, the
// type, its subtypes in a column, and on each subtype's row the materials and machines where it shows up, fed by a bus
// line above the row. A material's square says whether its warning is already in the game's tooltip ('No jogo') or
// only agreed ('Definido'); future materials are 'Previsto'. Grades 0-4 are the proposal's.
const HZ=(()=>{const src=id=>IN_GRAPH.nodes.find(n=>n.id===id)||{},nodes=[],edges=[],ROW=165,LEAF=125,WIDE=205;
  // leaf: [source node id or null, name, grade, status]; a source id brings its icon, fluid or 3D model
  const leaf=([from,name,grade,status],x,y,key)=>{const n=src(from),machine=n.kind==='machine';
    nodes.push({id:key,name:name+(grade!=null?' · grau '+grade:''),x:x+(machine?(WIDE-LEAF)/2:0),y,kind:n.kind||'item',img:n.img||null,model:n.model,glyph:from?null:'?',status,
      recipe:status==='No jogo'?'O aviso já aparece no tooltip; o efeito ainda não existe.':status==='Previsto'?'Material ou máquina das etapas futuras.':'Definido na proposta; sem aviso nem efeito no jogo ainda.',info:''});
    return machine?WIDE:LEAF;};
  const half=(x0,y0,types)=>{let y=y0;types.forEach(t=>{const rows=t.subs.length,ty=y+(rows-1)*ROW/2,TX=x0+330,SX=x0+560;
    nodes.push({id:t.id,name:t.name,x:TX,y:ty,kind:'machine',glyph:t.glyph,status:'Definido',recipe:t.recipe,info:t.info});
    t.prot.forEach(([pid,pname,pinfo],i)=>{const py=ty+(i-(t.prot.length-1)/2)*120;nodes.push({id:pid,name:pname,x:x0+90,y:py,kind:'item',glyph:'✚',status:'Em aberto',recipe:pinfo,info:'Proteção: próximo passo do design.'});
      edges.push({a:pid,b:t.id,type:'supply',via:[[x0+142,py],[x0+190,py],[x0+190,ty],[TX-85,ty]]});});
    t.subs.forEach((sub,r)=>{const sy=y+r*ROW;nodes.push({id:sub.id,name:sub.name,x:SX,y:sy,kind:'item',glyph:sub.glyph,status:sub.status||'Definido',recipe:sub.recipe,info:sub.info});
      edges.push({a:t.id,b:sub.id,type:'main',via:[[TX+85,ty],[TX+125,ty],[TX+125,sy],[SX-52,sy]]});
      let lx=SX+190;(sub.leaves||[]).forEach((l,i)=>{const key=sub.id+'_'+i,w=leaf(l,lx,sy,key),cx=lx+(w===WIDE?(WIDE-LEAF)/2:0);
        edges.push({a:sub.id,b:key,type:'waste',via:[[SX+52,sy],[SX+85,sy],[SX+85,sy-82],[cx,sy-82],[cx,sy-(w===WIDE?68:56)]]});lx+=w;});});
    y+=rows*ROW+70;});};
  half(0,120,[
    {id:'rad',name:'Radiológica',glyph:'☢',recipe:'Dose de radiação. Acumula no jogador e cai muito devagar.',info:'Efeitos por dose: baixa (só o dosímetro), moderada (fome, fraqueza leve), alta (náusea, sem regeneração), severa (vida máxima menor, dano), letal (dano contínuo). Postura: tempo, distância e blindagem. Na purificação a radiação é baixa; o risco cresce no enriquecimento, no reator e no combustível usado.',
      prot:[['p_shield','Blindagem','Diminui a irradiação entre o jogador e a fonte.'],['p_dosi','Dosímetro','Mostra a dose acumulada.'],['p_treat','Tratamento da dose interna','Item futuro para a dose que fica no corpo.']],
      subs:[{id:'r_ext',name:'Externa (irradiação)',glyph:'◎',recipe:'Ficar perto de uma fonte: itens no inventário, tanques e blocos com material radioativo, reator.',info:'Diminui com a distância e com blindagem.',
          leaves:[['yellow','Yellowcake',2,'No jogo'],['umido','Concentrado úmido',2,'No jogo'],['pura','Solução purificada',2,'No jogo'],['polpa','Polpa e solução bruta',1,'No jogo'],['u','Pó de urânio',1,'Definido'],[null,'Combustível usado',4,'Previsto']]},
        {id:'r_int',name:'Interna',glyph:'●',recipe:'Material radioativo dentro do corpo: pó respirado ou contato com líquido radioativo.',info:'O pior caso: continua dando dose depois que o jogador se afasta. Pode precisar de tratamento.',
          leaves:[['yellow','Yellowcake inalado',null,'Definido'],['u','Pó de urânio inalado',null,'Definido'],['eff','Efluente (contato)',1,'No jogo']]},
        {id:'r_sur',name:'Superfície',glyph:'▦',status:'Previsto',recipe:'Ideia para depois: itens, blocos ou o jogador ficam contaminados e passam a radiação adiante.',info:'Até serem descontaminados.',leaves:[]}]},
    {id:'par',name:'Particulada',glyph:'☁',recipe:'Pó que entra pelos pulmões. Acumula como carga nos pulmões e cai devagar em ar limpo.',info:'Efeitos por carga: baixa (tosse), média (fôlego curto), alta (lentidão, cansaço de mineração). Pó radioativo também soma dose interna. O concentrado úmido quase não solta pó; o yellowcake seco solta muito.',
      prot:[['p_mask','Máscara / respirador','Impede de respirar o pó.']],
      subs:[{id:'p_dry',name:'Pó seco',glyph:'∴',recipe:'Manusear pó seco.',info:'Seco solta pó; úmido quase não. Pó radioativo soma dose interna.',
          leaves:[['yellow','Yellowcake',3,'No jogo'],['u','Pó de urânio',2,'Definido'],['lime','Cal',2,'Definido']]},
        {id:'p_mach',name:'Máquinas que geram pó',glyph:'⚙',recipe:'O secador aberto ou quebrado; o Triturador do IE moendo minério de urânio.',info:'O secador é a etapa perigosa para a respiração.',
          leaves:[['m5','Secador industrial',null,'Previsto'],['crushRes','Triturador do IE',null,'Definido']]},
        {id:'p_cloud',name:'Nuvem de pó',glyph:'≋',recipe:'Derramar pó seco, ou uma explosão perto de material em pó.',info:'Deixa a área empoeirada por um tempo.',leaves:[]}]}]);
  half(1620,120,[
    {id:'qui',name:'Química',glyph:'⚗',recipe:'Contato com substância agressiva. Efeito na hora; some quando o contato acaba.',info:'Exposição: contato com líquido (vazamento, tanque quebrado), respingo ao quebrar uma máquina com fluido, vapor perto de vazamentos ou tanques abertos. Sai afastando-se e lavando-se com água. Postura: não encostar.',
      prot:[['p_glove','Luvas e roupa','Protegem do contato e do respingo.'],['p_shower','Chuveiro de emergência','Bloco futuro: lava o jogador.']],
      subs:[{id:'q_acid',name:'Ácido / corrosivo',glyph:'H⁺',recipe:'Queimadura e desgaste da armadura e das ferramentas.',info:'Enquanto houver contato.',
          leaves:[['polpa','Polpa',2,'No jogo'],['bruta','Solução bruta',2,'No jogo'],['pura','Solução purificada',2,'No jogo'],['eff','Efluente',3,'No jogo'],['poor','Efluente pobre',null,'No jogo'],[null,'Hexafluoreto',4,'Previsto']]},
        {id:'q_base',name:'Cáustico / alcalino',glyph:'OH⁻',recipe:'Dano mais leve e lentidão.',info:'Enquanto houver contato.',
          leaves:[['lime','Cal',2,'No jogo'],['sludge','Lama neutralizada',null,'Definido']]},
        {id:'q_tox',name:'Tóxico (metais pesados)',glyph:'☠',recipe:'Veneno; com exposição repetida, fraqueza.',info:'O urânio natural ataca os rins: o perigo real dele é químico e por inalação.',
          leaves:[['eff','Efluente',null,'Definido'],['yellow','Yellowcake',null,'Definido']]},
        {id:'q_vap',name:'Vapor de solvente',glyph:'≈',recipe:'Náusea e tontura (a visão balança).',info:'Perto de vazamentos ou tanques abertos.',
          leaves:[['solvent','Solvente',1,'Definido']]}]},
    {id:'fis',name:'Física',glyph:'⚠',recipe:'Fogo, pressão, calor e explosão, no sentido das normas de segurança (GHS / NR-26). Acidente pontual: nada se acumula.',info:'É o gatilho que transforma um risco contido num acidente com contaminação: uma explosão espalha líquido, pó e radiação. Postura: não deixar o acidente acontecer.',
      prot:[],
      subs:[{id:'f_fire',name:'Inflamável',glyph:'▲',recipe:'Vazamento perto de fogo ou lava acende; um tanque de solvente em chamas pode explodir.',info:'',leaves:[['solvent','Solvente',3,'No jogo']]},
        {id:'f_ox',name:'Oxidante',glyph:'O',recipe:'Perto de fogo, torna o incêndio mais forte.',info:'',leaves:[['reagent','Reagente de processamento',2,'No jogo']]},
        {id:'f_press',name:'Pressão',glyph:'P',recipe:'Passado o limite (ideia para depois), a máquina rompe e espalha o conteúdo.',info:'',
          leaves:[['m2','Filtro-prensa',null,'Definido'],[null,'Reator',null,'Previsto'],[null,'Hexafluoreto',2,'Previsto']]},
        {id:'f_heat',name:'Temperatura',glyph:'°C',recipe:'Encostar em superfície quente causa queimadura.',info:'',
          leaves:[['m5','Secador industrial',null,'Previsto'],[null,'Reator e linhas de vapor',null,'Previsto'],[null,'Combustível usado',1,'Previsto']]},
        {id:'f_boom',name:'Explosão',glyph:'✸',recipe:'Combinações dos de cima: destrói blocos e espalha os outros tipos (líquido, pó, radiação).',info:'',leaves:[]}]}]);
  // Radioactive dust adds internal dose: from the dry-dust row up to the internal row, between the bus and the subtypes
  const dry=nodes.find(n=>n.id==='p_dry'),int=nodes.find(n=>n.id==='r_int');
  edges.push({a:'p_dry',b:'r_int',type:'recycle',via:[[dry.x-52,dry.y+20],[dry.x-75,dry.y+20],[dry.x-75,int.y+20],[int.x-52,int.y+20]]});
  // Grades 0-4 per material (radiological, chemical, particulate, physical) and the physical kind
  const table=[['Pó de urânio (IE)','progressao/assets/uranio.png',1,1,2,0,''],['Reagente','x16/reagente_processamento.png',0,2,1,2,'oxidante'],['Polpa / solução bruta','fluidos/uranium_slurry_still.png',1,2,0,0,''],
    ['Solvente','fluidos/extraction_solvent_still.png',0,1,0,3,'inflamável; o químico é o vapor'],['Solução purificada','fluidos/purified_uranium_solution_still.png',2,2,0,0,''],['Efluente','fluidos/chemical_effluent_still.png',1,3,0,0,''],
    ['Cal','x16/cal.png',0,2,2,0,''],['Concentrado úmido','x16/concentrado_umido_uranio.png',2,1,0,0,''],['Yellowcake','x16/yellowcake.png',2,2,3,0,''],
    ['Hexafluoreto (futuro, enriquecimento)',null,2,4,0,2,'pressão'],['Combustível usado / rejeito de alta (futuro)',null,4,1,0,1,'calor']];
  return {plan:{nodes,edges},table};})();

const pages=[
{id:'inicio',title:'Início',home:true},

// ---------- Purification of uranium (the part in the game) ----------
{id:'purificacao',group:'Em produção',desc:'Do pó de urânio ao yellowcake',title:'Purificação do urânio',tag:'em produção',
  lead:'A primeira linha do mod: do pó de urânio do Immersive Engineering ao yellowcake, o concentrado de urânio ainda não enriquecido. Cinco máquinas multibloco em série, com insumos feitos nas máquinas do IE e todos os subprodutos com destino.',
  graph:{all:true},
  text:[['Como a linha funciona','O pó de urânio é atacado quimicamente no processamento químico e vira polpa. O filtro-prensa separa o sólido e deixa passar a solução bruta. A separação química tira o urânio da solução com um solvente e o devolve limpo numa solução de lavagem. A precipitação transforma o urânio dissolvido em sólido e o secador industrial entrega o yellowcake.'],
    ['Nenhuma máquina trabalha sozinha','Cada etapa depende do IE: o reagente vem do Triturador, o solvente da Refinaria e do Misturador, a cal do Forno de Coque. E cada resíduo volta para algum lugar: o efluente é reciclado no processamento químico, passa pela Extratora de Metais ou é neutralizado e filtrado, virando torta, concreto e água.']]},
{id:'linha1',section:'Visão geral',short:'Linha principal',parent:'purificacao',title:'Linha principal: do minério ao yellowcake',
  lead:'O caminho principal do urânio, sem os insumos e os resíduos. Cada máquina recebe o produto da anterior.',
  graph:{ids:['u','m1','polpa','m2','bruta','m3','pura','m4','umido','m5','yellow','drum']}},
{id:'insumos',section:'Visão geral',parent:'purificacao',title:'Insumos e reagentes',
  lead:'Tudo o que a linha consome além do urânio. Quase tudo sai das máquinas do IE: enxofre e nitrato do Triturador, biodiesel da Refinaria, solvente e solução de lavagem do Misturador, cal do Forno de Coque. Com o Immersive Petroleum o enxofre sai em quantidade, mas ele nunca é obrigatório.',
  graph:{ids:['sulfur','nitrate','reagent','water','filter','worn','bio','mixer','water2','solvent','wash','agent','coke','lime','m1','m2','m3','m4']}},
{id:'subprodutos',section:'Visão geral',parent:'purificacao',title:'Subprodutos e tratamento',
  lead:'Nada é jogado fora. O efluente não pode ser descartado (se o tanque encher, a separação para): volta ao processamento químico como licor reciclado, passa pela Extratora de Metais ou é neutralizado com cal e filtrado. O rejeito do filtro é neutralizado e triturado ou vira bloco.',
  graph:{ids:['m2','residue','nres','crushRes','resOut','eff','extract','deposit','recovery','nuggets','poor','neutral','sludge','filterSludge','cake','block','concrete','reuse','plates','condensate','coke','lime']},
  text:[['Progressão sugerida','Começa devolvendo o efluente ao processamento químico. Quando sobra efluente, entra a neutralização (cal no Misturador do IE e filtração da lama no filtro-prensa). Para lucrar, a Extratora de Metais vem antes da neutralização e o depósito vira pepitas no Triturador.']]},
{id:'maq1',section:'Máquinas',parent:'purificacao',title:'Processamento químico',machine:'m1',
  lead:'Ataca quimicamente o pó de urânio e o transforma em polpa, num reator por lotes com funil dosador e agitador.',
  facts:[['Estrutura','3 × 6 × 3, 45 blocos do IE'],['Desde','0.1.0-alpha (por lotes desde a 0.1.1)'],['Tanques','12.000 mB'],['Energia','16.000 IF']]},
{id:'maq2',section:'Máquinas',parent:'purificacao',title:'Filtro-prensa',machine:'m2',
  lead:'Separa o sólido da polpa e deixa passar a solução. As 28 placas fecham, a bomba pressuriza, a solução atravessa os filtros e o rejeito cai na esteira.',
  facts:[['Estrutura','3 × 3 × 9, 56 blocos'],['Desde','0.1.0-alpha.16'],['Filtros','28, vida de 64 usos'],['Energia','~6.720 IF por lote']]},
{id:'maq3',section:'Máquinas',parent:'purificacao',title:'Separação química',machine:'m3',
  lead:'Extração por solvente em dois estágios, em dois misturadores-decantadores: o urânio passa da solução bruta para o solvente e depois do solvente para a solução de lavagem.',
  facts:[['Estrutura','5 × 4 × 7, 118 blocos'],['Desde','0.1.1-alpha'],['Decantadores','16.000 mB, 1 min por lote'],['Solvente','ciclo fechado, perda de 500 mB por lote']]},
{id:'maq35',section:'Máquinas',parent:'purificacao',title:'Extratora de metais',machine:'extract',
  lead:'Recupera por eletrólise os metais dissolvidos no efluente. Seis placas de eletrodo mergulham na cuba, recebem o depósito e sobem para o raspador limpar sobre a bandeja.',
  facts:[['Estrutura','4 camadas, 44 blocos'],['Desde','0.1.3-alpha (em teste)'],['Cuba','12.000 mB por lote'],['Placas','6: aço, chumbo-prata ou electrum']],
  extraIds:['plates','deposit']},
{id:'maq4',section:'Máquinas',parent:'purificacao',title:'Precipitação',machine:'m4',tag:'previsto',
  lead:'Fará o urânio dissolvido virar sólido e separará esse sólido do líquido. É a próxima máquina a entrar no mod (0.1.4-alpha).',
  facts:[['Visual previsto','3 × 3 × 4: tanque agitado sobre tremonha'],['Versão','0.1.4-alpha (próxima)']]},
{id:'maq5',section:'Máquinas',parent:'purificacao',title:'Secador industrial',machine:'m5',tag:'previsto',
  lead:'Secará o concentrado úmido e entregará o yellowcake, coletando o condensado de processo.',
  facts:[['Visual previsto','3 × 5 × 3: câmara horizontal isolada'],['Versão','depois da precipitação']]},

// ---------- Planned topics ----------
{id:'enriquecimento',group:'Próximas etapas',desc:'Conversão e enriquecimento',title:'Enriquecimento',tag:'previsto',
  lead:'A segunda linha do mod: o yellowcake vira hexafluoreto de urânio, um composto que vira gás, e as centrífugas separam a parte rica em urânio-235. Duas máquinas: a Unidade de Conversão e a Unidade de Enriquecimento. Os subprodutos e seus destinos seguem a indústria real; quantidades e receitas ainda serão definidas.',
  graph:{plan:plan([
    ['hf','Ácido fluorídrico',1,0,'fluid','Em aberto','Fonte a definir (na indústria: fluorita com ácido sulfúrico).','Também volta da desconversão do rejeito e da reconversão do combustível.',{glyph:'HF'}],
    ['h2','Hidrogênio',2,0,'fluid','Em aberto','Fonte a definir.','Reduz o óxido de urânio dentro da conversão.',{glyph:'H₂'}],
    ['yc','Yellowcake',0,1,'item','Registrado','Produto da purificação do urânio.','Concentrado de urânio, ainda não enriquecido.',{img:'x16/yellowcake.png'}],
    ['conv','Unidade de Conversão',1,1,'machine','Previsto','Yellowcake + ácido fluorídrico + hidrogênio → hexafluoreto de urânio.','Agrupa o que a indústria faz em etapas: o óxido é reduzido com hidrogênio, vira tetrafluoreto com o ácido fluorídrico e hexafluoreto com flúor, feito do próprio ácido por eletrólise.'],
    ['uf6n','Hexafluoreto natural',2,1,'fluid','Previsto','Saída da conversão.','UF₆ com a proporção natural de urânio-235 (0,7%). Sólido frio, gás quando aquecido.',{glyph:'UF₆'}],
    ['enr','Unidade de Enriquecimento',3,1,'machine','Previsto','Hexafluoreto natural → hexafluoreto enriquecido + hexafluoreto empobrecido.','Centrífugas em cascata: o gás rico em urânio-235 sai de um lado e o empobrecido do outro. Consome muita energia.'],
    ['uf6e','Hexafluoreto enriquecido',4,1,'fluid','Previsto','Produto do enriquecimento.','Vai para a fabricação do combustível, na Unidade de Reconversão.',{glyph:'UF₆'}],
    ['res','Resíduo com urânio',0,2,'item','Em aberto','Sobra sólida da conversão.','Volta para o processamento químico da purificação.',{glyph:'U'}],
    ['feff','Efluente fluoretado',1,2,'fluid','Em aberto','Água com flúor que sai da conversão.','Neutralizado com cal, como o efluente da purificação.',{glyph:'F⁻'}],
    ['fneut','Neutralização • IE',1,3,'machine','Em aberto','Misturador do IE: efluente fluoretado + cal → fluoreto de cálcio.','O mesmo tratamento do efluente da purificação.',{model:'ie_mixer'}],
    ['caf2','Fluoreto de cálcio',0,3,'item','Em aberto','Sai da neutralização do efluente fluoretado.','Pode voltar a ser ácido fluorídrico ou servir de fundente; destino a definir.',{glyph:'CaF₂'}],
    ['tails','Hexafluoreto empobrecido',3,2,'fluid','Previsto','Rejeito do enriquecimento.','Pouco urânio-235. Pode ser guardado, reenriquecido ou desconvertido.',{glyph:'UF₆'}],
    ['deconv','Desconversão',3,3,'machine','Em aberto','Hexafluoreto empobrecido + vapor + hidrogênio → urânio empobrecido + ácido fluorídrico.','Ramificação do tratamento, como a Extratora de Metais na purificação.'],
    ['hfrec','Ácido fluorídrico recuperado',2,3,'fluid','Em aberto','Sai da desconversão.','Volta para a Unidade de Conversão.',{glyph:'HF'}],
    ['du','Urânio empobrecido',4,3,'item','Em aberto','Óxido estável, saída da desconversão.','Material de blindagem contra radiação, ou reserva para reenriquecer.',{glyph:'DU'}]],
    [['yc','conv'],['hf','conv','supply'],['h2','conv','supply'],['conv','uf6n'],['uf6n','enr'],['enr','uf6e'],
     ['conv','res','waste',[[0.87,1.33],[0.87,1.6],[0,1.6],[0,1.68]]],['conv','feff','waste'],['feff','fneut','waste'],['fneut','caf2','recycle'],
     ['enr','tails','waste'],['tails','deconv','waste'],['deconv','hfrec','recycle'],['deconv','du','recycle']])},
  text:[['Ciclo do flúor','A conversão consome ácido fluorídrico. A desconversão do rejeito e a reconversão do combustível devolvem esse ácido, e o flúor que sobra na água vira fluoreto de cálcio, que pode voltar a ser ácido.'],
    ['Urânio empobrecido','O rejeito do enriquecimento não é lixo: desconvertido num óxido estável, pode virar blindagem contra radiação ou ficar guardado para ser reenriquecido.'],
    ['Em aberto','Receitas, quantidades, energia e as fontes do ácido fluorídrico e do hidrogênio. O projeto é uma simulação de jogo: não usa parâmetros reais de enriquecimento.']]},
{id:'combustivel',group:'Próximas etapas',desc:'Pastilhas, varetas e elementos',short:'Combustível',title:'Fabricação de combustível',tag:'previsto',
  lead:'A terceira linha do mod: o hexafluoreto enriquecido volta a ser pó, o pó vira pastilhas cerâmicas e as pastilhas são fechadas em varetas que formam o elemento combustível do reator. Quatro máquinas: Unidade de Reconversão, Prensa de Pastilhas, Forno de Sinterização e Unidade de Montagem de Combustível.',
  graph:{plan:plan([
    ['h2','Hidrogênio',1,0,'fluid','Em aberto','Fonte a definir.','Reduz o urânio na reconversão e forma a atmosfera do forno de sinterização.',{glyph:'H₂'}],
    ['add','Aditivos',3,0,'item','Em aberto','Lubrificante e formador de poros; a definir.','Ajudam a prensar e a controlar a densidade da pastilha.',{glyph:'+'}],
    ['tubes','Tubos de revestimento',6,0,'item','Em aberto','Cadeia auxiliar a definir: tubos, tampões e molas.','Na indústria, liga de zircônio, cheia de hélio e soldada nas pontas.',{glyph:'║'}],
    ['frame','Estrutura do elemento',7,0,'item','Em aberto','Grades e bocais; a definir.','Prende as varetas na posição.',{glyph:'#'}],
    ['uf6e','Hexafluoreto enriquecido',0,1,'fluid','Previsto','Do enriquecimento.','UF₆ com mais urânio-235.',{glyph:'UF₆'}],
    ['reconv','Unidade de Reconversão',1,1,'machine','Previsto','Hexafluoreto enriquecido + vapor + hidrogênio → pó de dióxido de urânio + ácido fluorídrico.','Rota seca: o gás reage com vapor e o pó é reduzido com hidrogênio. Também prepara o pó para a prensa.'],
    ['uo2','Pó de dióxido de urânio',2,1,'item','Previsto','Saída da reconversão.','UO₂ enriquecido, pronto para prensar.',{glyph:'UO₂'}],
    ['press','Prensa de Pastilhas',3,1,'machine','Previsto','Pó de dióxido de urânio + aditivos → pastilhas verdes.','Compacta o pó em cilindros sob alta pressão.'],
    ['green','Pastilhas verdes',4,1,'item','Previsto','Saída da prensa.','Prensadas, mas ainda frágeis: precisam do tratamento cerâmico.',{glyph:'▮'}],
    ['sint','Forno de Sinterização',5,1,'machine','Previsto','Pastilhas verdes + hidrogênio → pastilhas prontas.','Aquece as pastilhas em atmosfera de hidrogênio e as consolida; também retifica e inspeciona.'],
    ['pel','Pastilhas prontas',6,1,'item','Previsto','Saída da sinterização.','Na medida exata e inspecionadas.',{glyph:'▮'}],
    ['mont','Unidade de Montagem de Combustível',7,1,'machine','Previsto','Pastilhas prontas + tubos + estrutura → elemento combustível.','Enche e fecha as varetas e as monta no elemento.'],
    ['elem','Elemento combustível',8,1,'item','Previsto','Saída da montagem.','Conjunto de varetas carregado no reator.',{glyph:'▥'}],
    ['reat','Reator',9,1,'machine','Previsto','Recebe os elementos.','Ver a página do reator.'],
    ['hfrec','Ácido fluorídrico recuperado',1,2,'fluid','Em aberto','Sai da reconversão.','Volta para a Unidade de Conversão, no enriquecimento.',{glyph:'HF'}],
    ['gscrap','Pastilhas verdes rejeitadas',2,2,'item','Em aberto','Quebradas ou fora de medida na prensa.','Moídas e de volta ao pó.',{glyph:'✕'}],
    ['scrap','Sucata de pastilhas',5,2,'item','Em aberto','Pastilhas rejeitadas e borra da retífica.','Vai para a recuperação da sucata.',{glyph:'✕'}],
    ['rodrej','Varetas rejeitadas',7,2,'item','Em aberto','Reprovadas na inspeção da montagem.','Desmontadas: as pastilhas vão para a sucata e o metal para reciclagem.',{glyph:'✕'}],
    ['metal','Aparas metálicas',8,2,'item','Em aberto','Sobras dos tubos e da estrutura.','Reciclagem no Forno de Arco do IE (a definir).',{glyph:'⚙'}],
    ['u3o8','Óxido de urânio reciclado',4,3,'item','Em aberto','Saída da recuperação da sucata.','Volta para a prensa junto com o pó novo, em pouca quantidade.',{glyph:'U₃O₈'}],
    ['oxid','Recuperação da sucata',5,3,'machine','Em aberto','Sucata oxidada ao ar num forno → óxido de urânio reciclado.','A pastilha oxidada se esfarela e vira pó de novo.']],
    [['uf6e','reconv'],['h2','reconv','supply'],['reconv','uo2'],['uo2','press'],['add','press','supply'],['press','green'],['green','sint'],
     ['h2','sint','supply',[[1,-0.27],[1,-0.42],[5,-0.42],[5,0.68]]],['sint','pel'],['pel','mont'],['tubes','mont','supply',[[6,0.33],[6,0.5],[6.84,0.5],[6.84,0.68]]],['frame','mont','supply'],['mont','elem'],['elem','reat'],
     ['reconv','hfrec','waste'],['press','gscrap','waste',[[2.87,1.35],[2.87,2],[2.22,2]]],['gscrap','uo2','recycle'],
     ['sint','scrap','waste'],['scrap','oxid','waste'],['oxid','u3o8','recycle'],['u3o8','press','recycle',[[3.77,3],[3.13,3],[3.13,1.33]]],
     ['mont','rodrej','waste'],['rodrej','scrap','waste'],['mont','metal','waste',[[7.3,1.35],[7.3,1.6],[8,1.6],[8,1.68]]]])},
  text:[['Nada se perde','A sucata de pastilhas é oxidada, vira pó e volta para a prensa; as varetas reprovadas são desmontadas; o ácido fluorídrico da reconversão volta para a conversão.'],
    ['Em aberto','Receitas, quantidades, a cadeia auxiliar dos tubos e da estrutura (o IE não tem zircônio) e as fontes do hidrogênio.']]},
{id:'pastilhas',section:'Etapas',parent:'combustivel',title:'Pastilhas',tag:'previsto',
  lead:'Do hexafluoreto ao pó e do pó à pastilha cerâmica: a reconversão, a prensa e o forno de sinterização, com a sucata voltando para a prensa.',
  graph:{from:'combustivel',ids:['uf6e','h2','reconv','uo2','add','press','green','sint','pel','hfrec','gscrap','scrap','oxid','u3o8']}},
{id:'varetas',section:'Etapas',parent:'combustivel',title:'Varetas e elementos',tag:'previsto',
  lead:'As pastilhas prontas são fechadas em tubos de revestimento, as varetas são montadas na estrutura e formam o elemento combustível. A movimentação do combustível deve poder ser feita por mecanismos físicos controláveis, para que tudo possa ser automatizado.',
  graph:{from:'combustivel',ids:['pel','tubes','frame','mont','elem','reat','rodrej','metal','scrap']}},
{id:'reator',group:'Próximas etapas',desc:'O coração da central',title:'Reator',tag:'previsto',
  lead:'O reator do mod se inspira nas centrais de potência dos anos 60 a 80: canais com o combustível, água fervendo nos próprios canais e separadores de vapor. Fica em aberto o quanto ele segue essa tecnologia e o quanto é uma interpretação de jogo.',
  graph:{plan:plan([
    ['elem','Elementos combustíveis',0,0,'item','Previsto','Da fabricação de combustível.',''],
    ['agua','Água de refrigeração',0,1,'item','Previsto','Circuito de água.',''],
    ['core','Reator de canais',1,0,'machine','Previsto','Montado no mundo.','Modularidade, dimensões e montagem em aberto.'],
    ['sep','Separadores de vapor',2,0,'machine','Em aberto','A água ferve nos canais do reator.',OPEN],
    ['vapor','Vapor',3,0,'item','Em aberto','Vai para a geração de energia.',''],
    ['usado','Combustível usado',1,1,'item','Previsto','Sai do reator.','Ver combustível usado e rejeitos.']],
    [['elem','core','supply'],['agua','core','supply'],['core','sep'],['sep','vapor'],['core','usado','waste']])},
  text:[['Operação','O jogador monta o reator e aprende a monitorar e operar a instalação. A operação manual sempre é possível; a automação é uma conquista feita com os computadores do mod.']]},
{id:'energia',group:'Próximas etapas',desc:'Do vapor à eletricidade',title:'Geração de energia',tag:'previsto',
  lead:'A instalação de geração: trocadores térmicos, condensadores, turbinas de alta e baixa pressão, alternadores e transformadores. Ainda a definir o que é próprio do mod e o que se integra com outros mods.',
  graph:{plan:plan([
    ['vapor','Vapor do reator',0,0,'item','Em aberto','Do reator.',''],
    ['hp','Turbina de alta pressão',1,0,'machine','Previsto','',OPEN],
    ['lp','Turbina de baixa pressão',2,0,'machine','Previsto','',OPEN],
    ['cond','Condensador',3,0,'machine','Previsto','Condensa o vapor.','A água volta ao circuito.'],
    ['alt','Alternador',1.5,1,'machine','Previsto','Movido pelas turbinas.',OPEN],
    ['trafo','Transformador',2.5,1,'machine','Previsto','Entrega a energia.',OPEN],
    ['troc','Trocadores térmicos',0,1,'machine','Previsto','Circuitos auxiliares e recuperação de calor.',OPEN]],
    [['vapor','hp'],['hp','lp'],['lp','cond'],['lp','alt','supply'],['alt','trafo'],['troc','hp','recycle']])}},
{id:'trocadores',section:'Equipamentos',parent:'energia',title:'Trocadores e condensadores',tag:'previsto',
  lead:'Trocadores térmicos para circuitos auxiliares e recuperação de calor; condensadores que devolvem a água ao circuito.',
  graph:{from:'energia',ids:['troc','hp','lp','cond']}},
{id:'turbinas',section:'Equipamentos',short:'Turbinas e alternadores',parent:'energia',title:'Turbinas, alternadores e transformadores',tag:'previsto',
  lead:'Turbinas de alta e baixa pressão movem o alternador; o transformador entrega a energia.',
  graph:{from:'energia',ids:['vapor','hp','lp','alt','trafo']}},
{id:'rejeitos',group:'Próximas etapas',desc:'O que sai do reator',short:'Combustível usado',title:'Combustível usado e rejeitos',tag:'previsto',
  lead:'O tratamento do material depois do uso fecha a cadeia. Os rejeitos da purificação já têm destino (veja Subprodutos); os do reator ainda estão em aberto.',
  graph:{plan:plan([
    ['usado','Combustível usado',0,0,'item','Previsto','Sai do reator.',''],
    ['resf','Resfriamento e armazenamento',1,0,'machine','Em aberto','',OPEN],
    ['trat','Tratamento',2,0,'machine','Em aberto','',OPEN],
    ['dep','Depósito de rejeitos',3,0,'machine','Em aberto','Etapa futura.',OPEN]],
    [['usado','resf'],['resf','trat'],['trat','dep','waste']])},
  links:[['subprodutos','Subprodutos da purificação (no jogo)']]},
{id:'automacao',group:'Sistemas',desc:'Computadores e lógica visual',title:'Controle e automação',tag:'em aberto',
  lead:'Computadores próprios para controle, status, protocolos e automação, com programação visual. Nenhum bloco pronto de "automatizar o reator": o jogador compõe o comportamento com peças de lógica.',
  graph:{plan:plan([
    ['ler','Leitura',0,0,'item','Em aberto','Sensores e estados dos equipamentos.',''],
    ['cmp','Comparação e cálculo',1,0,'item','Em aberto','Limites, diferenças e condições.',''],
    ['mem','Memória',2,1,'item','Em aberto','Valores e etapa de um procedimento.',''],
    ['tmp','Temporização',1,1,'item','Em aberto','Esperas e falta de resposta.',''],
    ['seq','Sequência',2,0,'item','Em aberto','Etapas e condições para avançar.',''],
    ['cmd','Comando',3,0,'item','Em aberto','Aciona equipamentos e ajusta controles.',''],
    ['alarm','Alarme e registro',3,1,'item','Em aberto','Avisos e histórico.','']],
    [['ler','cmp'],['cmp','seq'],['tmp','seq','supply'],['mem','seq','supply'],['seq','cmd'],['seq','alarm','waste']])},
  text:[['Exemplo','Ler o nível de um tanque, comparar com um limite e comandar uma bomba. Comando enviado não é confirmação: ligar uma bomba não prova que ela está funcionando.'],
    ['Em aberto','Editor visual na tela do computador ou circuitos físicos com blocos e cabos no mundo; formato dos programas; integração opcional com o Immersive Intelligence.']]},
{id:'seguranca',group:'Sistemas',desc:'Contaminação e proteções',title:'Radiação e segurança',tag:'em aberto',
  lead:'Quatro tipos de contaminação foram definidos, cada um com os seus subtipos e os materiais e máquinas onde aparece. Por enquanto o mod só mostra avisos no tooltip; nenhum efeito existe no jogo ainda, e nada será anunciado antes de existir.',
  graph:{plan:HZ.plan},hazardTable:HZ.table,noCards:true,
  text:[['Avisos que já existem','Polpa, solução bruta e efluente: corrosivo e radioativo (fraco). Solvente: inflamável. Concentrado e yellowcake: radioativo (fraco) e tóxico se inalado. Torta e aglomerado: traços radioativos.']]},
{id:'catalogo',group:'Referência',desc:'Todos os itens e fluidos',short:'Catálogo',title:'Catálogo de itens e fluidos',catalog:true},
{id:'creditos',group:'Referência',desc:'O mod original e os autores',title:'Créditos',
  lead:'O Immersive Nuclear é um addon: ele só existe por causa do Immersive Engineering, de onde vêm os blocos das estruturas, as máquinas que fazem os insumos, o visual e o jeito de construir multiblocos.',
  refs:[['Immersive Engineering','Mod original, criado por BluSunrize e Damien A.W. Hazard, com os demais colaboradores do projeto. Versão usada como base: 0.12-98, para o Minecraft 1.12.2.',
      [['Código-fonte no GitHub','https://github.com/BluSunrize/ImmersiveEngineering'],['Página no CurseForge','https://www.curseforge.com/minecraft/mc-mods/immersive-engineering']]],
    ['Immersive Nuclear','Addon criado e mantido por FlipThunder2607.',[]]]}
];
return {pages,
  home:{lead:'Um ecossistema nuclear completo no estilo do Immersive Engineering: do minério de urânio ao combustível, do reator à geração de energia, com máquinas multibloco animadas, processos por lotes e automação feita pelo jogador.',
    features:[['Máquinas multibloco','Montadas com blocos do IE e formadas com o martelo, com modelo 3D, sons, animação e interface própria.'],
      ['Processos por lotes','Encher, reagir, decantar, filtrar: cada etapa aparece na interface e no mundo.'],
      ['Subprodutos reaproveitados','Efluentes, rejeitos e lamas têm destino: metais recuperados, água, concreto.'],
      ['Feito para o IE','Os insumos saem das máquinas do IE. Outros mods entram como caminho opcional, nunca obrigatório.'],
      ['Rumo ao reator','Enriquecimento, combustível, reator inspirado nas centrais dos anos 60 a 80 e geração de energia (previstos).'],
      ['Automação do jogador','Computadores com programação visual: do alarme simples à operação completa (em aberto).']]}};
})();
