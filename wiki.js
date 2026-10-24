(()=>{'use strict';
// Immersive Nuclear wiki: hash routes (#/page-id), the side menu, and one page at a time. Each page with a graph mounts
// its own map with IN_MAP_MOUNT (progressao/mapa.js); cards and infobox come from the same nodes.
const W=IN_WIKI,BASE='recursos/itens-e-fluidos/',CATALOG=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,'-');
const STATUS=['No jogo','Registrado','Definido','Previsto','Em aberto'];

// The machine numbers (1, 2, 3, 3.5, 4, 5) are the project's internal control: the wiki shows the names only
const MACHINES={'1':['o','processamento químico'],'2':['o','filtro-prensa'],'3':['a','separação química'],'3.5':['a','extratora de metais'],'4':['a','precipitação'],'5':['o','secador industrial']};
const PREP={'':{o:'o',a:'a'},'à':{o:'ao',a:'à'},'na':{o:'no',a:'na'},'da':{o:'do',a:'da'},'das':{o:'do',a:'da'},'pela':{o:'pelo',a:'pela'}};
const cap=(s,up)=>up?s[0].toUpperCase()+s.slice(1):s;
function clean(t){return String(t??'').replace(/\s*Modelo do usuário\./g,'').replace(/^\d+(?:\.\d+)? · /,'').replace(/ \(3\.5\)/g,'')
  .replace(/(?:(à|na|da|das|pela|Na|Da) )?máquinas? (\d(?:\.5)?)(?: e (\d(?:\.5)?))?/g,(m,p='',a,b)=>{const pr=PREP[p.toLowerCase()]||PREP[''],one=n=>{const [g,name]=MACHINES[n]||['a','máquina '+n];return pr[g]+' '+name;};
    return cap(one(a),p&&p[0]!==p[0].toLowerCase())+(b?' e '+one(b):'');});}
const cleanNode=n=>({...n,name:clean(n.name),recipe:clean(n.recipe),info:clean(n.info)});
const G={...IN_GRAPH,nodes:IN_GRAPH.nodes.map(cleanNode)},byId=new Map(G.nodes.map(n=>[n.id,n]));
const pages=W.pages,pageById=new Map(pages.map(p=>[p.id,p])),machinePage=new Map(pages.filter(p=>p.machine).map(p=>[p.machine,p]));

// ---------- graphs ----------
const LANES=[[20,'Insumos e preparo',0,360],[375,'Linha principal · concentrado não enriquecido',360,600],[625,'Subprodutos, recuperação e tratamento',600,1e9]];
// A subset of a graph, moved so its nodes start near the top-left corner; edges kept only between included nodes
function subset(src,ids,lanes=[]){const set=new Set(ids),nodes=src.nodes.filter(n=>set.has(n.id)),edges=src.edges.filter(e=>set.has(e.a)&&set.has(e.b));
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;const grow=(x,y,w,h1,h2)=>{x0=Math.min(x0,x-w);x1=Math.max(x1,x+w);y0=Math.min(y0,y-h1);y1=Math.max(y1,y+h2);};
  nodes.forEach(n=>grow(n.x,n.y,n.kind==='machine'?100:65,n.kind==='machine'?70:55,n.kind==='machine'?95:80));edges.forEach(e=>(e.via||[]).forEach(([x,y])=>grow(x,y,12,12,12)));
  const ls=lanes.filter(([, ,lo,hi])=>nodes.some(n=>n.y>=lo&&n.y<hi));const top=ls.length?40:0;
  const dx=30-x0,dy=30+top-y0,mv=([x,y])=>[x+dx,y+dy];
  return {meta:src.meta,width:Math.ceil(x1-x0+60),height:Math.ceil(y1-y0+60+top),nodes:nodes.map(n=>({...n,x:n.x+dx,y:n.y+dy})),edges:edges.map(e=>({...e,via:e.via&&e.via.map(mv)})),
    lanes:ls.map(([, text,lo,hi])=>[Math.max(8,Math.min(...nodes.filter(n=>n.y>=lo&&n.y<hi).map(n=>n.y))+dy-(nodes.some(n=>n.y>=lo&&n.y<hi&&n.kind==='machine')?112:100)),text])};}
// A machine with what goes in on the left and what comes out on the right
function around(id){const m=byId.get(id),ins=[],outs=[],types=new Map();
  G.edges.forEach(e=>{if(e.b===id&&!ins.includes(e.a)){ins.push(e.a);types.set(e.a,e.type);}});
  G.edges.forEach(e=>{if(e.a===id&&!outs.includes(e.b)&&!ins.includes(e.b)){outs.push(e.b);types.set(e.b,e.type);}});
  const STEP=170,rows=Math.max(1,ins.length,outs.length),H=rows*STEP+40,my=H/2,MX=500,nodes=[{...m,x:MX,y:my}],edges=[];
  const side=(list,x,dir)=>list.forEach((nid,i)=>{const y=my+(i-(list.length-1)/2)*STEP,k=(i-(list.length-1)/2)*Math.min(18,80/list.length),n=byId.get(nid);nodes.push({...n,x,y});
    const near=dir<0?x+(n.kind==='machine'?85:52):x-(n.kind==='machine'?85:52),bend=MX+dir*190,edge=MX+dir*85;
    const via=Math.abs(y-my)<5?[[near,y],[edge,my]]:[[near,y],[bend,y],[bend,my+k],[edge,my+k]];
    edges.push(dir<0?{a:nid,b:id,type:types.get(nid),via}:{a:id,b:nid,type:types.get(nid),via:via.reverse()});});
  side(ins,130,-1);side(outs,870,1);
  return {meta:G.meta,width:1000,height:H,nodes,edges,lanes:[]};}
function graphOf(p){const g=p.graph;if(p.machine)return around(p.machine);if(!g)return null;
  if(g.all)return {...G,lanes:LANES.map(l=>l.slice(0,2)),full:true};
  if(g.plan){const ids=g.plan.nodes.map(n=>n.id);return subset(g.plan,ids);}
  if(g.from){const plan=pageById.get(g.from).graph.plan;return subset(plan,g.ids);}
  return subset(G,g.ids,LANES);}

// ---------- pieces ----------
// Grades 0-4 per material and contamination type (the safety page)
function hazardTable(rows){const cell=v=>`<td class="gr g${v}"><span>${v}</span></td>`;
  return `<h3 class="sec">Graus por material</h3><p class="body">Proposta inicial, de 0 (nenhum) a 4 (máximo). O tooltip deve passar a mostrar só os tipos acima de 0, cada um com o seu grau.</p>
  <div class="tbl"><table class="hz"><tr><th>Material</th><th>☢ Radiológica</th><th>⚗ Química</th><th>☁ Particulada</th><th>⚠ Física</th><th>Observação</th></tr>${rows.map(([name,img,r,q,pa,f,note])=>`<tr><td class="mat">${img?(img.includes('fluidos/')?`<span class="fl" style="background-image:url('${encodeURI(src(img))}')"></span>`:`<img src="${encodeURI(src(img))}" alt="">`):'<span class="q">?</span>'}${esc(name)}</td>${cell(r)}${cell(q)}${cell(pa)}${cell(f)}<td class="note">${esc(note)}</td></tr>`).join('')}</table></div>`;}
const statusChip=s=>`<span class="chip st-${slug(s)}">${esc(s)}</span>`;
const tagChip=t=>t?`<span class="tag tg-${slug(t)}">${esc(t)}</span>`:'';
const src=p=>/^(data:|https?:)/.test(p)?p:BASE+p;
// An image that is gone (file removed from design/) falls back to the empty frame
const gone=`onerror="this.outerHTML='<span class=q>⚙</span>'"`;
function icon(n){if(n.model)return `<canvas width="120" height="80" data-model="${n.model}" aria-label="Modelo 3D de ${esc(n.name)}"></canvas>`;
  if(n.kind==='fluid'&&n.img)return `<span class="fl" style="background-image:url('${encodeURI(src(n.img))}')"></span>`;
  if(n.img||n.concept)return `<img src="${encodeURI(src(n.img||n.concept))}" alt="" ${gone}>`;return `<span class="q">${n.glyph?esc(n.glyph):n.kind==='machine'?'⚙':'?'}</span>`;}
function card(n){const page=n.kind==='machine'&&machinePage.get(n.id),tag=page?'a':'div';
  return `<${tag} class="card${page?' link':''}"${page?` href="#/${page.id}"`:''}><span class="ic">${icon(n)}</span><div><h4>${esc(n.name)}</h4>${statusChip(n.status)}<p>${esc(n.recipe)}</p>${n.info&&n.info!==n.recipe?`<p class="more">${esc(n.info)}</p>`:''}</div></${tag}>`;}
// IE machines (and our recipes run in them, named "... • IE") only show in the organograms, never as cards or in the catalog
const ieMachine=n=>n.kind==='machine'&&(n.status==='IE'||/•\s*IE$/.test(n.name));
function cards(nodes){const groups=[['Máquinas do mod',n=>n.kind==='machine'&&!ieMachine(n)],['Itens',n=>n.kind==='item'&&!n.alias],['Fluidos',n=>n.kind==='fluid']];
  return groups.map(([title,f])=>{const list=nodes.filter(f);return list.length?`<h3 class="sec">${title}</h3><div class="cards">${list.map(card).join('')}</div>`:'';}).join('');}
const figure=f=>f.src?`<figure><img src="${encodeURI(f.src)}" alt="${esc(f.cap)}" loading="lazy"><figcaption>${esc(f.cap)}</figcaption></figure>`:`<figure class="ph"><span>Espaço para imagem</span><figcaption>${esc(f.cap)}</figcaption></figure>`;
function progress(nodes,label){const own=nodes.filter(n=>STATUS.includes(n.status)),done=own.filter(n=>n.status==='No jogo').length;if(!own.length)return '';
  return `<div class="bar" role="img" aria-label="${done} de ${own.length} no jogo">${STATUS.map(s=>{const k=own.filter(n=>n.status===s).length;return k?`<span class="st-${slug(s)}" style="flex:${k}" title="${s}: ${k}"></span>`:''}).join('')}</div><div class="legend">${STATUS.map(s=>{const k=own.filter(n=>n.status===s).length;return k?`<span class="st-${slug(s)}"><i></i>${s}: ${k}</span>`:''}).join('')}<b>${Math.round(100*done/own.length)}% ${esc(label)}</b></div>`;}
const crumb=p=>{const path=[];for(let q=p;q;q=q.parent&&pageById.get(q.parent))path.unshift(q);return `<div class="crumb"><a href="#/inicio">Início</a>${path.filter(q=>!q.home).map((q,i,a)=>' › '+(i<a.length-1?`<a href="#/${q.id}">${esc(q.title)}</a>`:esc(q.title))).join('')}</div>`;};
const text=list=>(list||[]).map(([h,t])=>`<h3 class="sec">${esc(h)}</h3><p class="body">${esc(t)}</p>`).join('');
const refs=list=>(list||[]).map(([h,t,links])=>`<h3 class="sec">${esc(h)}</h3><p class="body">${esc(t)}</p>${links.map(([l,url])=>`<p class="body"><a href="${encodeURI(url)}" target="_blank" rel="noopener">${esc(l)} ↗</a></p>`).join('')}`).join('');
const children=p=>{const kids=pages.filter(q=>q.parent===p.id);return kids.length?`<h3 class="sec">Nesta seção</h3><div class="kids">${kids.map(k=>`<a href="#/${k.id}">${esc(k.title)}${tagChip(k.tag)}</a>`).join('')}</div>`:'';};

// ---------- pages ----------
function home(){const h=W.home,meta=G.meta||{};
  return `<div class="crumb">Início</div><h2 class="title">Immersive Nuclear</h2><p class="lead">${esc(h.lead)}</p>
  <div class="hero">${h.hero.map(figure).join('')}</div>
  <h3 class="sec">Progresso</h3><p class="body">Versão ${esc(meta.version)} · próxima: ${esc(clean(meta.next))} · atualizado em ${esc(meta.updated)}</p>${progress(G.nodes,'da purificação no jogo')}
  <h3 class="sec">O que o mod traz</h3><div class="feat">${h.features.map(([t,d])=>`<div><h4>${esc(t)}</h4>${esc(d)}</div>`).join('')}</div>
  <h3 class="sec">Tópicos</h3><div class="kids">${pages.filter(p=>!p.parent&&!p.home).map(p=>`<a href="#/${p.id}">${esc(p.title)}${tagChip(p.tag)}</a>`).join('')}</div>`;}
function machine(p){const n=byId.get(p.machine);
  return `${crumb(p)}<aside class="infobox"><div class="ib-model">${n.model?`<canvas width="520" height="360" aria-label="Modelo 3D. Arraste para girar."></canvas><button class="turn">Girar 90°</button>`:n.concept?`<img src="${encodeURI(src(n.concept))}" alt="Conceito" ${gone}>`:'<span class="q">⚙</span>'}</div>
    <table><tr><th colspan="2">${esc(p.title)}</th></tr><tr><td>Situação</td><td>${statusChip(n.status)}</td></tr>${(p.facts||[]).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table></aside>
  <h2 class="title">${esc(p.title)}${tagChip(p.tag)}</h2><p class="lead">${esc(p.lead)}</p>
  <h3 class="sec">Receita / lote</h3><p class="body">${esc(n.recipe)}</p><h3 class="sec">Como funciona</h3><p class="body">${esc(n.info)}</p>
  <div class="clear"></div><h3 class="sec">Entradas e saídas</h3><section id="in-progress" data-manual></section>`;}
function topic(p){return `${crumb(p)}<h2 class="title">${esc(p.title)}${tagChip(p.tag)}</h2><p class="lead">${esc(p.lead)}</p><section id="in-progress" data-manual></section>${text(p.text)}${refs(p.refs)}`;}
function catalog(p){return `${crumb(p)}<h2 class="title">${esc(p.title)}</h2><p class="lead">Tudo o que existe ou está previsto na linha de purificação, do mesmo banco de dados do mapa. Valores provisórios até o balanceamento.</p>
  <div class="filters"><input type="search" placeholder="Buscar…" aria-label="Buscar no catálogo"><span>${['Todos',...STATUS,'IE'].map((s,i)=>`<button data-st="${i?s:''}"${i?'':' class="on"'}>${s}</button>`).join('')}</span></div><div id="cat"></div>`;}

let map=null;
function render(){const id=(location.hash.match(/^#\/([\w-]+)/)||[])[1]||'inicio',p=pageById.get(id)||pageById.get('inicio'),main=document.querySelector('main');
  if(map){map.destroy();map=null;}
  main.innerHTML=p.home?home():p.catalog?catalog(p):p.machine?machine(p):topic(p);
  const g=graphOf(p),host=main.querySelector('#in-progress');
  if(g&&host){const fitZoom=Math.min(1,(host.clientWidth-8)/g.width),link=n=>n.kind==='machine'&&machinePage.get(n.id)&&machinePage.get(n.id)!==p?'#/'+machinePage.get(n.id).id:null;
    map=IN_MAP_MOUNT(host,g,g.full?{base:BASE,catalog:CATALOG,title:'Organograma da purificação',lanes:g.lanes,link}:{base:BASE,catalog:CATALOG,title:p.machine?'Entradas e saídas':'Organograma',
      intro:'Passe o mouse para ver a receita; clique para fixar os detalhes.',lanes:g.lanes,views:[],start:null,height:Math.round(Math.min(630,Math.max(230,g.height*fitZoom+6))),link});}
  if(p.machine){const n=byId.get(p.machine),cv=main.querySelector('.infobox canvas');if(cv)IN_SPIN_MODEL(cv,n.model,main.querySelector('.turn'));}
  if(g&&!p.home)main.insertAdjacentHTML('beforeend',(p.hazardTable?hazardTable(p.hazardTable):'')+(p.noCards?'':cards(g.nodes))+(p.links||[]).map(([to,t])=>`<p class="body"><a href="#/${to}">${esc(t)} →</a></p>`).join('')+children(p));
  if(p.catalog)catalogFilter(main);
  main.querySelectorAll('.card canvas').forEach(c=>IN_RENDER_MODEL(c,c.dataset.model));
  menu(p);
  document.title=(p.home?'':p.title+' · ')+'Immersive Nuclear wiki';window.scrollTo(0,0);document.body.classList.remove('menu');}
function catalogFilter(main){const out=main.querySelector('#cat'),input=main.querySelector('input');let st='';
  const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const draw=()=>{const q=norm(input.value);const list=G.nodes.filter(n=>!ieMachine(n)&&!n.alias&&(!st||n.status===st||(st==='IE'&&n.status==='Vanilla'))&&norm(n.name+' '+n.recipe+' '+n.info).includes(q));
    out.innerHTML=list.length?cards(list):'<p class="body">Nada encontrado.</p>';out.querySelectorAll('canvas').forEach(c=>IN_RENDER_MODEL(c,c.dataset.model));};
  input.oninput=draw;main.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{st=b.dataset.st;main.querySelectorAll('[data-st]').forEach(x=>x.classList.toggle('on',x===b));draw();});draw();}

// ---------- side menu ----------
// Grouped by 'group' (top-level topics), each topic with its one-line 'desc'; inside a topic the pages are grouped by
// 'section'. A coloured square tells the status, an icon the kind of page (machine, overview). The current branch opens.
const TAG_STATUS={'em produção':'No jogo','previsto':'Previsto','em aberto':'Em aberto'},opened=new Set();
const pageStatus=p=>p.machine?byId.get(p.machine).status:p.tag?TAG_STATUS[p.tag]:p.parent?pageStatus(pageById.get(p.parent)):null;
const dot=p=>{const st=pageStatus(p);return st?`<span class="dot st-${slug(st)}" title="${esc(st)}"></span>`:'';};
const label=p=>esc(p.short||p.title);
function menu(cur){const nav=document.querySelector('nav.side'),root=q=>q.parent?root(pageById.get(q.parent)):q;if(cur&&cur!==menu.last){opened.add(root(cur).id);menu.last=cur;}
  const kid=k=>`<a class="k${k===cur?' on':''}" href="#/${k.id}" title="${esc(k.title)}"><span class="ico">${k.machine?'⚙':'◇'}</span><span class="k-txt">${label(k)}</span>${dot(k)}</a>`;
  const topic=t=>{const kids=pages.filter(q=>q.parent===t.id),open=opened.has(t.id),secs=[...new Set(kids.map(k=>k.section||''))];
    return `<div class="topic${open?' open':''}${t===cur?' on':''}"><div class="t-row"><a class="t-link" href="#/${t.id}">${dot(t)}<span class="t-txt"><b>${label(t)}</b>${t.desc?`<small>${esc(t.desc)}</small>`:''}</span></a>${kids.length?`<button class="tog" type="button" data-id="${t.id}" aria-expanded="${open}" aria-label="${open?'Fechar':'Abrir'} ${esc(t.title)}">${open?'▾':'▸'}</button>`:''}</div>
      ${kids.length&&open?`<div class="t-kids">${secs.map(sec=>`${sec?`<div class="sub">${esc(sec)}</div>`:''}${kids.filter(k=>(k.section||'')===sec).map(kid).join('')}`).join('')}</div>`:''}</div>`;};
  const groups=[...new Set(pages.filter(q=>q.group).map(q=>q.group))];
  nav.innerHTML=`<a class="brand" href="#/inicio"><h1>Immersive Nuclear</h1></a><div class="ver">Addon do Immersive Engineering · ${esc(G.meta.version)}</div>
    <a class="home${cur&&cur.home?' on':''}" href="#/inicio"><span class="ico">⌂</span>Início</a>
    ${groups.map(g=>`<div class="grp">${esc(g)}</div>${pages.filter(q=>q.group===g).map(topic).join('')}`).join('')}
    <div class="side-key">${['No jogo','Previsto','Em aberto'].map(st=>`<span><span class="dot st-${slug(st)}"></span>${st}</span>`).join('')}<span><span class="ico">⚙</span>máquina</span><span><span class="ico">◇</span>visão geral</span></div>`;
  nav.querySelectorAll('.tog').forEach(b=>b.onclick=()=>{const id=b.dataset.id;opened.has(id)?opened.delete(id):opened.add(id);menu(cur);});}
document.querySelector('.menu-btn').onclick=()=>document.body.classList.toggle('menu');
addEventListener('hashchange',render);render();
})();
