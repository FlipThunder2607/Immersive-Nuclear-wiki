(()=>{'use strict';
// Immersive Nuclear wiki: hash routes (#/page-id), the side menu, and one page at a time. Each page with a graph mounts
// its own map with IN_MAP_MOUNT (progressao/mapa.js); cards and infobox come from the same nodes.
// Two languages: Portuguese (the source texts) and English (en.js); the switch sits in the top right corner.
const W=IN_WIKI,EN=window.IN_WIKI_EN||{},BASE='recursos/itens-e-fluidos/',CATALOG=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,'-');
const STATUS=['A refazer','No jogo','Em produção','Registrado','Definido','Previsto','Em aberto'];
// What each colour means (the user, 16/11/2026): green only when it works in the game; blue exists in the game but does not
// work yet; yellow decided but not in the game; grey a possibility; red nothing decided
const MEANING={'No jogo':'Funciona no jogo','A refazer':'Funciona no jogo, mas vai ser refeito','Em produção':'Sendo feito agora','Registrado':'Existe no jogo, mas ainda não funciona','Definido':'Já decidido, mas ainda não está no jogo','Previsto':'Uma possibilidade, ainda não decidida','Em aberto':'Nada definido ainda'};

// ---------- language ----------
const store={get(){try{return localStorage.getItem('in-wiki-lang')}catch(e){return null}},set(v){try{localStorage.setItem('in-wiki-lang',v)}catch(e){}}};
let LANG=store.get()||((navigator.language||'pt').toLowerCase().startsWith('pt')?'pt':'en');
// Interface strings are looked up by their Portuguese text; anything without a translation stays in Portuguese
const T=s=>LANG==='en'&&EN.ui&&EN.ui[s]!=null?EN.ui[s]:s;

// The machine numbers (1, 2, 3, 3.5, 4, 5) are the project's internal control: the wiki shows the names only
const MACHINES={'1':['o','processamento químico'],'2':['o','filtro-prensa'],'3':['a','separação química'],'3.5':['a','extratora de metais'],'4':['a','precipitação'],'5':['o','secador industrial']};
const PREP={'':{o:'o',a:'a'},'à':{o:'ao',a:'à'},'na':{o:'no',a:'na'},'da':{o:'do',a:'da'},'das':{o:'do',a:'da'},'pela':{o:'pelo',a:'pela'}};
const cap=(s,up)=>up?s[0].toUpperCase()+s.slice(1):s;
function clean(t){return String(t??'').replace(/\s*Modelo do usuário\./g,'').replace(/^\d+(?:\.\d+)? · /,'').replace(/ \(3\.5\)/g,'')
  .replace(/(?:(à|na|da|das|pela|Na|Da) )?máquinas? (\d(?:\.5)?)(?: e (\d(?:\.5)?))?/g,(m,p='',a,b)=>{const pr=PREP[p.toLowerCase()]||PREP[''],one=n=>{const [g,name]=MACHINES[n]||['a','máquina '+n];return pr[g]+' '+name;};
    return cap(one(a),p&&p[0]!==p[0].toLowerCase())+(b?' e '+one(b):'');});}
// A node in the current language: English from en.js ([name, recipe, info]), else the Portuguese texts
const tr=(n,en)=>LANG==='en'?{...n,name:en&&en[0]||T(n.name),recipe:en&&en[1]!=null?en[1]:T(n.recipe),info:en&&en[2]!=null?en[2]:T(n.info)}:n;
const cleanNode=n=>({...n,name:clean(n.name),recipe:clean(n.recipe),info:clean(n.info)});

// Data of the current language, rebuilt when it changes
let G,byId,pages,pageById,machinePage;
function build(){
  G={...IN_GRAPH,nodes:IN_GRAPH.nodes.map(n=>tr(cleanNode(n),(EN.nodes||{})[n.id]))};byId=new Map(G.nodes.map(n=>[n.id,n]));
  pages=W.pages.map(p=>{const en=LANG==='en'?(EN.pages||{})[p.id]||{}:{},q={...p,...en};
    if(p.graph&&p.graph.plan){const pe=(EN.plan||{})[p.id]||{};q.graph={...p.graph,plan:{...p.graph.plan,nodes:p.graph.plan.nodes.map(n=>tr(n,pe[n.id]))}};}
    if(p.hazardTable&&LANG==='en'&&EN.hzTable)q.hazardTable=p.hazardTable.map((r,i)=>EN.hzTable[i]?[EN.hzTable[i][0],...r.slice(1,6),EN.hzTable[i][1]]:r);
    return q;});
  pageById=new Map(pages.map(p=>[p.id,p]));machinePage=new Map(pages.filter(p=>p.machine).map(p=>[p.machine,p]));
  pages.filter(p=>p.stationOf).forEach(p=>p.stationOf.forEach(id=>machinePage.set(id,p)));}

// ---------- graphs ----------
// Shortcuts of the purification map (as in the guide)
const VIEWS=[{id:'line',label:'Linha principal',zoom:.8,center:[1050,475]},{id:'supply',label:'Insumos',zoom:.85,center:[750,230]},{id:'waste',label:'Resíduos',zoom:.75,center:[1260,1010]}];
const LANES=[[20,'Insumos e preparo',0,360],[375,'Linha principal · concentrado não enriquecido',360,600],[625,'Subprodutos, recuperação e tratamento',600,1400]];
// A subset of a graph, moved so its nodes start near the top-left corner; edges kept only between included nodes
function subset(src,ids,lanes=[]){const set=new Set(ids),nodes=src.nodes.filter(n=>set.has(n.id)),edges=src.edges.filter(e=>set.has(e.a)&&set.has(e.b));
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;const grow=(x,y,w,h1,h2)=>{x0=Math.min(x0,x-w);x1=Math.max(x1,x+w);y0=Math.min(y0,y-h1);y1=Math.max(y1,y+h2);};
  nodes.forEach(n=>grow(n.x,n.y,n.kind==='machine'?100:65,n.kind==='machine'?70:55,n.kind==='machine'?95:80));edges.forEach(e=>(e.via||[]).forEach(([x,y])=>grow(x,y,12,12,12)));
  const ls=lanes.filter(([, ,lo,hi])=>nodes.some(n=>n.y>=lo&&n.y<hi));const top=ls.length?40:0;
  const dx=30-x0,dy=30+top-y0,mv=([x,y])=>[x+dx,y+dy];
  return {meta:src.meta,width:Math.ceil(x1-x0+60),height:Math.ceil(y1-y0+60+top),nodes:nodes.map(n=>({...n,x:n.x+dx,y:n.y+dy})),edges:edges.map(e=>({...e,via:e.via&&e.via.map(mv)})),
    lanes:ls.map(([, text,lo,hi])=>[Math.max(8,Math.min(...nodes.filter(n=>n.y>=lo&&n.y<hi).map(n=>n.y))+dy-(nodes.some(n=>n.y>=lo&&n.y<hi&&n.kind==='machine')?112:100)),T(text)])};}
// A machine with what goes in on the left and what comes out on the right
// A machine's node: in the graph of the topic that draws it (the line 2 topics have their own, with the machines not in
// the game yet), or else in the progress map
function srcOf(id){const q=pages.find(q=>q.graph&&q.graph.plan&&q.graph.plan.nodes.some(n=>n.id===id));return q?q.graph.plan:G;}
const nodeOf=id=>srcOf(id).nodes.find(n=>n.id===id)||byId.get(id);
function around(id){const src=srcOf(id),bi=new Map(src.nodes.map(n=>[n.id,n])),m=bi.get(id),ins=[],outs=[],types=new Map();
  src.edges.forEach(e=>{if(e.b===id&&!ins.includes(e.a)){ins.push(e.a);types.set(e.a,e.type);}});
  src.edges.forEach(e=>{if(e.a===id&&!outs.includes(e.b)&&!ins.includes(e.b)){outs.push(e.b);types.set(e.b,e.type);}});
  const STEP=170,rows=Math.max(1,ins.length,outs.length),H=rows*STEP+40,my=H/2,MX=500,nodes=[{...m,x:MX,y:my}],edges=[];
  const side=(list,x,dir)=>list.forEach((nid,i)=>{const y=my+(i-(list.length-1)/2)*STEP,k=(i-(list.length-1)/2)*Math.min(18,80/list.length),n=bi.get(nid);nodes.push({...n,x,y});
    const near=dir<0?x+(n.kind==='machine'?85:52):x-(n.kind==='machine'?85:52),bend=MX+dir*190,edge=MX+dir*85;
    const via=Math.abs(y-my)<5?[[near,y],[edge,my]]:[[near,y],[bend,y],[bend,my+k],[edge,my+k]];
    edges.push(dir<0?{a:nid,b:id,type:types.get(nid),via}:{a:id,b:nid,type:types.get(nid),via:via.reverse()});});
  side(ins,130,-1);side(outs,870,1);
  return {meta:G.meta,width:1000,height:H,nodes,edges,lanes:[]};}
function graphOf(p){const g=p.graph;if(p.machine&&!g)return around(p.machine);if(!g||p.noChart)return null;
  // The purification chart: the whole map but the start of line 2 (line:2), which has its own pages
  if(g.all){const keep=new Set(G.nodes.filter(n=>n.line!==2).map(n=>n.id));
    return {...G,height:1420,nodes:G.nodes.filter(n=>keep.has(n.id)),edges:G.edges.filter(e=>keep.has(e.a)&&keep.has(e.b)),lanes:LANES.map(l=>[l[0],T(l[1])]),full:true};}
  if(g.plan){const ids=g.plan.nodes.map(n=>n.id);return subset(g.plan,ids);}
  if(g.from){const plan=pageById.get(g.from).graph.plan;return subset(plan,g.ids);}
  return subset(G,g.ids,LANES);}

// ---------- pieces ----------
// Grades 0-4 per material and contamination type (the safety page)
function hazardTable(rows){const cell=v=>`<td class="gr g${v}"><span>${v}</span></td>`;
  return `<h3 class="sec">${T('Graus por material')}</h3><p class="body">${T('Proposta inicial, de 0 (nenhum) a 4 (máximo). O tooltip deve passar a mostrar só os tipos acima de 0, cada um com o seu grau.')}</p>
  <div class="tbl"><table class="hz"><tr>${['Material','☢ Radiológica','⚗ Química','☁ Particulada','⚠ Física','Observação'].map(h=>`<th>${T(h)}</th>`).join('')}</tr>${rows.map(([name,img,r,q,pa,f,note])=>`<tr><td class="mat">${img?(img.includes('fluidos/')?`<span class="fl" style="background-image:url('${encodeURI(src(img))}')"></span>`:`<img src="${encodeURI(src(img))}" alt="">`):'<span class="q">?</span>'}${esc(name)}</td>${cell(r)}${cell(q)}${cell(pa)}${cell(f)}<td class="note">${esc(note)}</td></tr>`).join('')}</table></div>`;}
const statusChip=s=>`<span class="chip st-${slug(s)}">${esc(T(s))}</span>`;
const tagChip=t=>t?`<span class="tag tg-${slug(t)}">${esc(T(t))}</span>`:'';
const src=p=>/^(data:|https?:)/.test(p)?p:BASE+p;
// An image that is gone (file removed from design/) falls back to the empty frame
const gone=`onerror="this.outerHTML='<span class=q>⚙</span>'"`;
function icon(n){if(n.model)return `<canvas width="120" height="80" data-model="${n.model}" aria-label="${T('Modelo 3D de')} ${esc(n.name)}"></canvas>`;
  if(n.kind==='fluid'&&n.img)return `<span class="fl" style="background-image:url('${encodeURI(src(n.img))}')"></span>`;
  if(n.img||n.concept)return `<img src="${encodeURI(src(n.img||n.concept))}" alt="" ${gone}>`;return `<span class="q">${n.glyph?esc(n.glyph):n.kind==='machine'?'⚙':'?'}</span>`;}
// The first sentence of a text (the catalog's machines: one short line each, the user 15/11/2026)
const firstSentence=t=>{const s=String(t||'').trim(),m=s.match(/^.*?[.!?](\s|$)/);return m?m[0].trim():s;};
function card(n,short){const page=n.kind==='machine'&&machinePage.get(n.id),tag=page?'a':'div';
  if(short&&n.kind==='machine')return `<${tag} class="card${page?' link':''}"${page?` href="#/${page.id}"`:''}><span class="ic">${icon(n)}</span><div><h4>${esc(n.name)}</h4>${statusChip(n.status)}<p>${esc(firstSentence(page&&page.lead||n.info||n.recipe))}</p></div></${tag}>`;
  return `<${tag} class="card${page?' link':''}"${page?` href="#/${page.id}"`:''}><span class="ic">${icon(n)}</span><div><h4>${esc(n.name)}</h4>${statusChip(n.status)}<p>${esc(n.recipe)}</p>${n.info&&n.info!==n.recipe?`<p class="more">${esc(n.info)}</p>`:''}</div></${tag}>`;}
// IE machines (and our recipes run in them, named "... • IE") only show in the organograms, never as cards or in the catalog
const ieMachine=n=>n.kind==='machine'&&(n.status==='IE'||/•\s*IE$/.test(n.name));
function cards(nodes,short){const groups=[['Máquinas do mod',n=>n.kind==='machine'&&!ieMachine(n)],['Itens',n=>n.kind==='item'&&!n.alias],['Fluidos',n=>n.kind==='fluid']];
  return groups.map(([title,f])=>{let list=nodes.filter(f);
    // the catalog: one card per machine (the same machine drawn twice on the map, as the filter press, shows once)
    if(short){const seen=new Set();list=list.filter(n=>{if(n.kind!=='machine')return true;const k=n.model||n.img||n.concept||n.name;if(seen.has(k))return false;seen.add(k);return true;});}
    return list.length?`<h3 class="sec">${T(title)}</h3><div class="cards">${list.map(n=>card(n,short)).join('')}</div>`:'';}).join('');}
// A status bar with its legend: how many steps are in each status, and the share already in the game
function bar(own,cls='bar'){const done=own.filter(n=>n.status==='No jogo').length;
  return `<div class="${cls}" role="img" aria-label="${done} / ${own.length}">${STATUS.map(s=>{const k=own.filter(n=>n.status===s).length;return k?`<span class="st-${slug(s)}" style="flex:${k}" title="${esc(T(s))}: ${k}"></span>`:''}).join('')}</div>`;}
const pct=own=>own.length?Math.round(100*own.filter(n=>n.status==='No jogo'||n.status==='A refazer').length/own.length):0;
// Every topic's own steps: the nodes of its graphs (the purification's from the map, the others from their plans).
// IE and vanilla are left out, and so are the contamination leaves, which only point at materials counted elsewhere.
// A step that shows up in two topics (the yellowcake, the reactor...) counts once, in the first.
function topicSteps(){const seen=new Set(),out=[];
  // the purification's chart is the map without the start of line 2 (line:2), which the enrichment's plan counts
  pages.filter(p=>!p.parent&&!p.home&&p.graph&&!p.noProgress).forEach(p=>{const g=p.graph.all?{nodes:G.nodes.filter(n=>n.line!==2)}:p.graph.plan;if(!g)return;
    const own=g.nodes.filter(n=>STATUS.includes(n.status)&&!n.alias&&!/_\d+$/.test(n.id)).filter(n=>{const k=n.name.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;});
    if(own.length)out.push([p,own]);});
  return out.sort((a,b)=>lineOf(a[0])-lineOf(b[0]));}
const LINE={suprimentos:0,purificacao:1,enriquecimento:2,combustivel:3,reator:4,energia:5,automacao:6,rejeitos:7,seguranca:8};
const lineOf=p=>p.id in LINE?LINE[p.id]:99;
function progress(){const topics=topicSteps(),all=topics.flatMap(([,own])=>own);
  return `${bar(all)}<div class="legend">${STATUS.map(s=>{const k=all.filter(n=>n.status===s).length;return k?`<span class="st-${slug(s)}"><i></i>${esc(T(s))}: ${k}</span>`:''}).join('')}<b>${pct(all)}% ${T('do mod no jogo')}</b></div>
  <h4 class="sub-sec">${T('Progresso por tópico')}</h4><div class="per-topic">${topics.map(([p,own])=>`<a href="#/${p.id}"><span class="pt-name">${esc(p.short||p.title)}</span>${bar(own,'bar mini')}<span class="pt-pct">${pct(own)}%</span></a>`).join('')}</div>`;}
const crumb=p=>{const path=[];for(let q=p;q;q=q.parent&&pageById.get(q.parent))path.unshift(q);return `<div class="crumb"><a href="#/inicio">${T('Início')}</a>${path.filter(q=>!q.home).map((q,i,a)=>' › '+(i<a.length-1?`<a href="#/${q.id}">${esc(q.title)}</a>`:esc(q.title))).join('')}</div>`;};
const text=list=>(list||[]).map(([h,t])=>`<h3 class="sec">${esc(h)}</h3><p class="body">${esc(t)}</p>`).join('');
const refs=list=>(list||[]).map(([h,t,links])=>`<h3 class="sec">${esc(h)}</h3><p class="body">${esc(t)}</p>${links.map(([l,url])=>`<p class="body"><a href="${encodeURI(url)}" target="_blank" rel="noopener">${esc(l)} ↗</a></p>`).join('')}`).join('');
const children=p=>{const kids=pages.filter(q=>q.parent===p.id);return kids.length?`<h3 class="sec">${T('Nesta seção')}</h3><div class="kids">${kids.map(k=>`<a href="#/${k.id}">${esc(k.title)}${tagChip(k.tag)}</a>`).join('')}</div>`:'';};

// ---------- pages ----------
function home(){const h=LANG==='en'&&EN.home?{...W.home,...EN.home}:W.home,meta=G.meta||{};
  return `<div class="crumb">${T('Início')}</div><h2 class="title">Immersive Nuclear</h2><p class="lead">${esc(h.lead)}</p>
  <h3 class="sec">${T('Progresso')}</h3><p class="body">${T('Versão')} ${esc(meta.version)} · ${T('próxima')}: ${esc(LANG==='en'?T(meta.next):clean(meta.next))} · ${T('atualizado em')} ${esc(meta.updated)}</p>${progress()}
  <h3 class="sec">${T('O que o mod traz')}</h3><div class="feat">${h.features.map(([t,d])=>`<div><h4>${esc(t)}</h4>${esc(d)}</div>`).join('')}</div>
  <h3 class="sec">${T('Tópicos')}</h3><div class="kids">${pages.filter(p=>!p.parent&&!p.home).sort((a,b)=>lineOf(a)-lineOf(b)).map(p=>`<a href="#/${p.id}">${esc(p.title)}${tagChip(p.tag)}</a>`).join('')}</div>`;}
function machine(p){const n=nodeOf(p.machine);
  return `${crumb(p)}<aside class="infobox"><div class="ib-model">${n.model?`<canvas width="520" height="360" aria-label="${T('Modelo 3D. Arraste para girar.')}"></canvas><button class="turn">${T('Girar 90°')}</button>`:n.concept?`<img src="${encodeURI(src(n.concept))}" alt="${T('Conceito')}" ${gone}>`:'<span class="q">⚙</span>'}</div>
    <table><tr><th colspan="2">${esc(p.title)}</th></tr><tr><td>${T('Situação')}</td><td>${statusChip(n.status)}</td></tr>${(p.facts||[]).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table></aside>
  <h2 class="title">${esc(p.title)}${tagChip(p.tag)}</h2><p class="lead">${esc(p.lead)}</p>
  <h3 class="sec">${T('Receita / lote')}</h3><p class="body">${esc(n.recipe)}</p><h3 class="sec">${T('Como funciona')}</h3><p class="body">${esc(n.info)}</p>
  <div class="clear"></div><h3 class="sec">${T('Entradas e saídas')}</h3><section id="in-progress" data-manual></section>`;}
function topic(p){return `${crumb(p)}<h2 class="title">${esc(p.title)}${tagChip(p.tag)}</h2><p class="lead">${esc(p.lead)}</p><section id="in-progress" data-manual></section>${text(p.text)}${refs(p.refs)}`;}
function catalog(p){return `${crumb(p)}<h2 class="title">${esc(p.title)}</h2><p class="lead">${T('Tudo o que existe ou está previsto, do mesmo banco de dados dos mapas. Valores provisórios até o balanceamento.')}</p>
  <div class="filters"><input type="search" placeholder="${T('Buscar…')}" aria-label="${T('Buscar no catálogo')}"><span>${['Todos',...STATUS].map((s,i)=>`<button data-st="${i?s:''}"${i?'':' class="on"'}>${esc(T(s))}</button>`).join('')}</span></div><div id="cat"></div>`;}

let map=null;
function render(){const id=(location.hash.match(/^#\/([\w-]+)/)||[])[1]||'inicio',p=pageById.get(id)||pageById.get('inicio'),main=document.querySelector('main');
  if(map){map.destroy();map=null;}
  main.innerHTML=p.home?home():p.catalog?catalog(p):p.machine?machine(p):topic(p);
  const g=graphOf(p),host=main.querySelector('#in-progress');
  if(g&&host){const fitZoom=Math.min(1,(host.clientWidth-8)/g.width),link=n=>n.kind==='machine'&&machinePage.get(n.id)&&machinePage.get(n.id)!==p?'#/'+machinePage.get(n.id).id:null;
    map=IN_MAP_MOUNT(host,g,g.full?{base:BASE,catalog:CATALOG,t:T,title:T('Organograma da purificação'),intro:T('Explore os processos do Immersive Nuclear. Passe o mouse para ver a receita; clique para fixar os detalhes.'),lanes:g.lanes,views:VIEWS.map(v=>({...v,label:T(v.label)})),link}:{base:BASE,catalog:CATALOG,t:T,title:T(p.machine?'Entradas e saídas':'Organograma'),
      intro:T('Passe o mouse para ver a receita; clique para fixar os detalhes.'),lanes:g.lanes,views:[],start:null,height:Math.round(Math.min(630,Math.max(230,g.height*fitZoom+6))),link});}
  if(p.machine){const n=nodeOf(p.machine),cv=main.querySelector('.infobox canvas');if(cv)IN_SPIN_MODEL(cv,n.model,main.querySelector('.turn'));}
  if(g&&!p.home)main.insertAdjacentHTML('beforeend',(p.hazardTable?hazardTable(p.hazardTable):'')+(p.noCards?'':cards(g.nodes))+(p.links||[]).map(([to,t])=>`<p class="body"><a href="#/${to}">${esc(t)} →</a></p>`).join('')+children(p));
  if(!g&&!p.home&&!p.catalog&&!p.machine)main.insertAdjacentHTML('beforeend',children(p));   // a topic with no chart of its own still lists its pages
  if(p.catalog)catalogFilter(main);
  main.querySelectorAll('.card canvas').forEach(c=>IN_RENDER_MODEL(c,c.dataset.model));
  menu(p);langSwitch();document.querySelector('.menu-btn').textContent='☰ '+T('Tópicos');
  document.documentElement.lang=LANG==='en'?'en':'pt-BR';
  document.title=(p.home?'':p.title+' · ')+'Immersive Nuclear wiki';window.scrollTo(0,0);document.body.classList.remove('menu');}
function catalogFilter(main){const out=main.querySelector('#cat'),input=main.querySelector('input');let st='';
  const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  // the planned topics' own things (not IE's, not the map's), each name once
  const seenName=new Set(G.nodes.map(n=>n.name.toLowerCase()));
  const wip=['automacao','modulos','enriquecimento','suprimentos','combustivel','reator'].flatMap(id=>pageById.get(id).graph.plan.nodes)
    .filter(n=>['Em produção','Definido','No jogo','A refazer','Registrado'].includes(n.status)&&n.id!=='pmod'&&!byId.has(n.id)&&!n.alias)
    .filter(n=>{const k=n.name.toLowerCase();if(seenName.has(k))return false;seenName.add(k);return true;});
  const draw=()=>{const q=norm(input.value);const ours=n=>n.status!=='IE'&&n.status!=='Vanilla'&&!/•\s*(IE|Vanilla)$/i.test(n.name);
    const list=[...G.nodes,...wip].filter(n=>ours(n)&&!ieMachine(n)&&!n.alias&&(!st||n.status===st)&&norm(n.name+' '+n.recipe+' '+n.info).includes(q));
    out.innerHTML=list.length?cards(list,true):`<p class="body">${T('Nada encontrado.')}</p>`;out.querySelectorAll('canvas').forEach(c=>IN_RENDER_MODEL(c,c.dataset.model));};
  input.oninput=draw;main.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{st=b.dataset.st;main.querySelectorAll('[data-st]').forEach(x=>x.classList.toggle('on',x===b));draw();});draw();}

// ---------- language switch (top right corner) ----------
function langSwitch(){let box=document.querySelector('.lang');
  if(!box){box=document.createElement('div');box.className='lang';document.body.append(box);}
  box.setAttribute('role','group');box.setAttribute('aria-label',T('Idioma'));
  box.innerHTML=[['pt','PT-BR'],['en','EN']].map(([k,l])=>`<button type="button" data-lang="${k}"${k===LANG?' class="on" aria-pressed="true"':' aria-pressed="false"'}>${l}</button>`).join('');
  box.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(b.dataset.lang===LANG)return;LANG=b.dataset.lang;store.set(LANG);build();render();});}

// ---------- side menu ----------
// Grouped by 'group' (top-level topics), each topic with its one-line 'desc'; inside a topic the pages are grouped by
// 'section'. A coloured square tells the status, an icon the kind of page (machine, overview). The current branch opens.
const TAG_STATUS={'concluída':'No jogo','em produção':'No jogo','em desenvolvimento':'Definido','definido':'Definido','previsto':'Previsto','em aberto':'Em aberto'},opened=new Set();
// The dot (16/11/2026, the user): the LEAST developed status in the page's chart (green only when all of it works in the
// game). A topic without a chart sums up its subpages the same way; a page without a progress bar keeps its own tag.
const RANK=['No jogo','A refazer','Em produção','Registrado','Definido','Previsto','Em aberto'],chartStatus=new Map();
// except work in progress (purple), which wins over everything
const sumUp=list=>{list=list.filter(s=>RANK.includes(s));return !list.length?null:list.includes('Em produção')?'Em produção':RANK[Math.max(...list.map(s=>RANK.indexOf(s)))];};
const bestOf=p=>{if(!chartStatus.has(p.id)){let st=null;if(!p.noProgress){try{const g=p.noChart?null:graphOf(p);if(g)st=sumUp(g.nodes.map(n=>n.status));}catch(e){}
    if(st===null)st=sumUp(pages.filter(q=>q.parent===p.id).map(q=>pageStatus(q)));}chartStatus.set(p.id,st);}return chartStatus.get(p.id);};
const pageStatus=p=>p.status?p.status:bestOf(p)||(p.machine?nodeOf(p.machine).status:null)||(p.tag?TAG_STATUS[p.tag]:p.parent?pageStatus(pageById.get(p.parent)):null);
const dot=p=>{const st=pageStatus(p);return st?`<span class="dot st-${slug(st)}" title="${esc(T(st))}"></span>`:'';};
const label=p=>esc(p.short||p.title);
function menu(cur){const nav=document.querySelector('nav.side'),root=q=>q.parent?root(pageById.get(q.parent)):q;if(cur&&cur.id!==menu.last){opened.add(root(cur).id);menu.last=cur.id;}
  const kid=k=>`<a class="k${k===cur?' on':''}" href="#/${k.id}" title="${esc(k.title)}"><span class="ico">${k.machine||k.icon==='machine'?'⚙':'◇'}</span><span class="k-txt">${label(k)}</span>${dot(k)}</a>`;
  const topic=t=>{const kids=pages.filter(q=>q.parent===t.id),open=opened.has(t.id),secs=[...new Set(kids.map(k=>k.section||''))];
    return `<div class="topic${open?' open':''}${t===cur?' on':''}"><div class="t-row"><a class="t-link" href="#/${t.id}">${dot(t)}<span class="t-txt"><b>${label(t)}</b>${t.desc?`<small>${esc(t.desc)}</small>`:''}</span></a>${kids.length?`<button class="tog" type="button" data-id="${t.id}" aria-expanded="${open}" aria-label="${T(open?'Fechar':'Abrir')} ${esc(t.title)}">${open?'▾':'▸'}</button>`:''}</div>
      ${kids.length&&open?`<div class="t-kids">${secs.map(sec=>`${sec?`<div class="sub">${esc(T(sec))}</div>`:''}${kids.filter(k=>(k.section||'')===sec).map(kid).join('')}`).join('')}</div>`:''}</div>`;};
  const groups=[...new Set(pages.filter(q=>q.group).map(q=>q.group))];
  nav.innerHTML=`<a class="brand" href="#/inicio"><h1>Immersive Nuclear</h1></a><div class="ver">${T('Addon do Immersive Engineering')} · ${esc(G.meta.version)}</div>
    <a class="home${cur&&cur.home?' on':''}" href="#/inicio"><span class="ico">⌂</span>${T('Início')}</a>
    ${groups.map(g=>`<div class="grp">${esc(T(g))}</div>${pages.filter(q=>q.group===g).map(topic).join('')}`).join('')}
    <div class="side-key">${STATUS.map(st=>`<span title="${esc(T(MEANING[st]))}"><span class="dot st-${slug(st)}"></span>${esc(T(st))}</span>`).join('')}<span><span class="ico">⚙</span>${T('máquina')}</span><span><span class="ico">◇</span>${T('visão geral')}</span></div>`;
  nav.querySelectorAll('.tog').forEach(b=>b.onclick=()=>{const id=b.dataset.id;opened.has(id)?opened.delete(id):opened.add(id);menu(cur);});}
document.querySelector('.menu-btn').onclick=()=>document.body.classList.toggle('menu');
// The side menu's width: drag its right edge (the user: with many topics open it got narrow); kept for the next visit
(()=>{const layout=document.querySelector('.layout'),grip=document.createElement('div');grip.className='side-grip';grip.title=T('Arraste para ajustar');
  const setW=w=>{w=Math.max(220,Math.min(560,w));layout.style.setProperty('--side-w',w+'px');try{localStorage.setItem('in-wiki-side',w)}catch(e){}};
  try{const w=+localStorage.getItem('in-wiki-side');if(w)setW(w);}catch(e){}
  layout.append(grip);let x0=null,w0=0;
  grip.onpointerdown=e=>{x0=e.clientX;w0=document.querySelector('nav.side').getBoundingClientRect().width;grip.setPointerCapture(e.pointerId);document.body.classList.add('resizing');};
  grip.onpointermove=e=>{if(x0!==null)setW(w0+e.clientX-x0);};
  grip.onpointerup=grip.onpointercancel=()=>{x0=null;document.body.classList.remove('resizing');};})();
build();
addEventListener('hashchange',render);render();
})();
