
/* ASSEFAZ — Distribuição Geográfica V9 | BAIRRO, CIDADE, ESTADO */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const norm = v => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toUpperCase().replace(/\s+/g,' ');
const fmt = n => Number(n || 0).toLocaleString('pt-BR');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const METRO = new Set('RIO DE JANEIRO|NITEROI|SAO GONCALO|DUQUE DE CAXIAS|NOVA IGUACU|SAO JOAO DE MERITI|BELFORD ROXO|NILOPOLIS|MESQUITA|QUEIMADOS|JAPERI|SEROPEDICA|ITAGUAI|MAGE|GUAPIMIRIM|ITABORAI|TANGUA|MARICA|CACHOEIRAS DE MACACU|RIO BONITO|PARACAMBI|PETROPOLIS'.split('|'));
const GEO_URL = 'https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-33-mun.json';
const A = {data:null,geo:null,maps:{},boundaries:{},heats:{},bubbles:{},labels:{},points:{},mode:{metro:'calor',estado:'calor'},modal:null,cache:new Map(),queue:Promise.resolve(),request:0};
const put=(id,v)=>{if($(id))$(id).textContent=v;};
function status(msg,ok=false){put('statusBase',msg);const dot=$('statusDot');if(dot){dot.classList.toggle('ativo',ok);dot.classList.toggle('erro',!ok&&msg.startsWith('Erro'));}}
function script(url,test){if(test())return Promise.resolve();return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=()=>test()?resolve():reject(Error('Falha na biblioteca'));s.onerror=()=>reject(Error('Não foi possível carregar '+url));document.head.appendChild(s);});}
async function libraries(){
 if(!document.querySelector('link[href*="leaflet.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(l);}
 await script('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',()=>!!window.L);
 await script('https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js',()=>!!window.L?.heatLayer);
 await script('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',()=>!!window.XLSX);
}
function readExcel(book){for(const sheet of book.SheetNames){const rows=XLSX.utils.sheet_to_json(book.Sheets[sheet],{header:1,defval:'',raw:false,blankrows:false});for(let i=0;i<Math.min(30,rows.length);i++){const h=rows[i].map(norm),b=h.indexOf('BAIRRO'),c=h.findIndex(x=>x==='CIDADE'||x==='MUNICIPIO'),u=h.findIndex(x=>x==='ESTADO'||x==='UF');if(b<0||c<0||u<0)continue;return rows.slice(i+1).filter(r=>r.some(x=>String(x??'').trim())).map(r=>({bairro:norm(r[b]),cidade:norm(r[c]),uf:norm(r[u])}));}}throw Error('Não encontrei as colunas BAIRRO, CIDADE e ESTADO.');}
function aggregate(rows){const cities=new Map(),bairros=new Map();let rj=0,metro=0;for(const r of rows){if(!['RJ','RIO DE JANEIRO'].includes(r.uf))continue;rj++;if(r.cidade)cities.set(r.cidade,(cities.get(r.cidade)||0)+1);if(METRO.has(r.cidade))metro++;if(r.cidade&&r.bairro){const k=r.cidade+'|'+r.bairro;bairros.set(k,(bairros.get(k)||0)+1);}}return {total:rows.length,rj,metro,cities,bairros};}
function indicators(d){put('totalVidas',fmt(d.total));put('vidasRJ',fmt(d.rj));put('vidasMetropolitana',fmt(d.metro));put('totalMunicipios',fmt(d.cities.size));put('totalMapaMetropolitano',fmt(d.metro));put('totalMapaEstado',fmt(d.rj));put('totalBairrosMetro',fmt([...d.bairros.keys()].filter(k=>METRO.has(k.split('|')[0])).length));put('municipiosMapaEstado',fmt(d.cities.size));}
function cityName(f){const p=f.properties||{};for(const k of ['name','nome','NM_MUN','NM_MUNICIP','municipio','MUNICIPIO','NOME'])if(p[k])return norm(p[k]);return '';}
function popup(name,n,metro,estado=false){return `<div class="v9-tip"><strong>${esc(name)}</strong><span>${fmt(n)} vidas</span>${metro&&['RIO DE JANEIRO','NITEROI'].includes(name)?'<small>Clique para explorar os bairros</small>':''}${estado&&name==='RIO DE JANEIRO'?'<small>Clique para explorar os bairros do estado</small>':''}</div>`;}
/* Mapa 02: só o município do Rio abre a janela, e ela traz os bairros de todas as cidades da planilha */
const abreEstado=(metro,name)=>!metro&&name==='RIO DE JANEIRO';
function initMaps(){if(A.maps.metro)return;for(const [k,id] of [['metro','mapaMetropolitano'],['estado','mapaEstado']]){
 const map=L.map(id,{preferCanvas:true,zoomControl:true,attributionControl:false,zoomSnap:.25}).setView(k==='metro'?[-22.85,-43.3]:[-22.65,-42.8],k==='metro'?9:8);
 map.getContainer().style.background='radial-gradient(ellipse at center,#102444,#08152b)';
 map.createPane('v9heat');map.getPane('v9heat').style.zIndex='350';map.getPane('v9heat').style.pointerEvents='none';
 map.createPane('v9borders');map.getPane('v9borders').style.zIndex='410';
 map.createPane('v9labels');map.getPane('v9labels').style.zIndex='650';map.getPane('v9labels').style.pointerEvents='none';
 A.maps[k]=map;map.on('moveend zoomend resize',()=>drawLabels(k));if(k==='estado')map.on('zoomend resize',()=>drawProviders('estado'));
 }}
function clear(k){for(const dict of [A.boundaries,A.heats,A.bubbles,A.labels])if(dict[k]){A.maps[k].removeLayer(dict[k]);dict[k]=null;}}
function heatIntensity(n,max){if(n<=0)return 0;return Math.max(.12,Math.pow(n/max,.42));}
function heatGradient(){return {0:'#1946c8',.15:'#1677ed',.30:'#00c9f5',.47:'#25e68e',.60:'#d9f53a',.72:'#ffe132',.84:'#ff8b20',.94:'#f04425',1:'#f20d22'};}
function draw(k,fit=false){const map=A.maps[k],d=A.data||aggregate([]);if(!map||!A.geo)return;clear(k);
 const metro=k==='metro',features=A.geo.features.filter(f=>!metro||METRO.has(cityName(f)));
 const max=Math.max(1,...features.map(f=>d.cities.get(cityName(f))||0));
 const points=[];
 A.boundaries[k]=L.geoJSON({type:'FeatureCollection',features},{pane:'v9borders',style:f=>{const n=d.cities.get(cityName(f))||0;return {color:n?'#44647c':'#283d57',weight:n?.95:.6,fillColor:'#10213d',fillOpacity:.035,interactive:true};},onEachFeature:(f,layer)=>{
  const name=cityName(f),n=d.cities.get(name)||0;
  layer.bindTooltip(popup(name,n,metro,!metro),{sticky:true,direction:'top',opacity:.98,className:'v9-tooltip'});
  layer.on('click',e=>{if(metro&&['RIO DE JANEIRO','NITEROI'].includes(name))openBairros(name);else if(abreEstado(metro,name))openBairrosEstado();else L.popup({maxWidth:230}).setLatLng(e.latlng).setContent(popup(name,n,false)).openOn(map);});
  if((metro&&['RIO DE JANEIRO','NITEROI'].includes(name))||abreEstado(metro,name))layer.on('mouseover',()=>layer.setStyle({weight:2.5,color:'#39d8f5'}));
  layer.on('mouseout',()=>A.boundaries[k]?.resetStyle(layer));
  if(n){const center=layer.getBounds().getCenter();points.push({name,n,center});}
 }}).addTo(map);
 A.points[k]=points;
 if(A.mode[k]!=='bolhas'&&points.length){
  A.heats[k]=L.heatLayer(points.map(p=>[p.center.lat,p.center.lng,heatIntensity(p.n,max)]),{
   pane:'v9heat',radius:metro?42:34,blur:metro?19:17,max:.68,maxZoom:12,minOpacity:.40,gradient:heatGradient()
  }).addTo(map);
 }
 if(A.mode[k]!=='calor'){
  A.bubbles[k]=L.layerGroup().addTo(map);
  for(const p of points)L.circleMarker(p.center,{pane:'v9borders',radius:Math.max(5,Math.min(23,4+18*Math.sqrt(p.n/max))),color:'#fff',weight:1,fillColor:p.n===max?'#ff243a':'#00c9f5',fillOpacity:.8}).bindTooltip(popup(p.name,p.n,metro,!metro),{className:'v9-tooltip'}).on('click',e=>{L.DomEvent.stopPropagation(e);if(metro&&['RIO DE JANEIRO','NITEROI'].includes(p.name))openBairros(p.name);else if(abreEstado(metro,p.name))openBairrosEstado();else L.popup().setLatLng(e.latlng).setContent(popup(p.name,p.n,false)).openOn(map);}).addTo(A.bubbles[k]);
 }
 if(fit){const b=A.boundaries[k].getBounds();if(b.isValid())map.fitBounds(b,{padding:[20,20],animate:false});}
 $(metro?'placeholderMetro':'placeholderEstado')?.classList.add('oculto');
 drawProviders(k);applyBenefVisibility();requestAnimationFrame(()=>{map.invalidateSize();drawLabels(k);applyBenefVisibility();});
}
function drawLabels(k){const map=A.maps[k];if(!map)return;if(A.labels[k]){map.removeLayer(A.labels[k]);A.labels[k]=null;}
 if(k==='estado'||!A.points[k])return;
 const chosen=A.points[k].filter(p=>['RIO DE JANEIRO','NITEROI'].includes(p.name));if(!chosen.length)return;
 const size=map.getSize(),g=L.layerGroup().addTo(map);A.labels[k]=g;
 for(const p of chosen){const rio=p.name==='RIO DE JANEIRO',w=142,h=44,x=rio?Math.min(size.x-75,100):Math.max(75,size.x-100),y=40;
  const center=L.point(x,y),edge=L.point(rio?x+w/2:x-w/2,y);
  const color=rio?'#20ddf5':'#ff6478';
  L.polyline([p.center,map.containerPointToLatLng(edge)],{pane:'v9labels',color,weight:1.4,opacity:.9,dashArray:'4,4',interactive:false}).addTo(g);
  L.circleMarker(p.center,{pane:'v9labels',radius:3,fillColor:color,fillOpacity:1,color:'#fff',weight:1,interactive:false}).addTo(g);
  const html=`<div class="v9-label" style="--accent:${color}"><span>${esc(p.name)}</span><strong>${fmt(p.n)} vidas</strong></div>`;
  L.marker(map.containerPointToLatLng(center),{pane:'v9labels',interactive:false,keyboard:false,icon:L.divIcon({className:'v9-label-icon',html,iconSize:[w,h],iconAnchor:[w/2,h/2]})}).addTo(g);
 }
}
function closeModal(){if(!A.modal)return;A.modal.closed=true;A.modal.map?.remove();A.modal.element.remove();A.modal=null;}
function geocode(bairro,city){const key=city+'|'+bairro;if(A.cache.has(key))return Promise.resolve(A.cache.get(key));
 const task=A.queue.then(async()=>{await new Promise(r=>setTimeout(r,1150));try{
  /* Rio e Niterói como antes; as outras cidades (janela do mapa 02) vão com o próprio nome */
  const cidade=city==='NITEROI'?'Niterói':city==='RIO DE JANEIRO'?'Rio de Janeiro':city;
  const q=encodeURIComponent(bairro+', '+cidade+', RJ, Brasil');
  const res=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+q,{headers:{'Accept-Language':'pt-BR'}});
  if(!res.ok)return null;const result=await res.json();if(!result.length)return null;
  const lat=Number(result[0].lat),lng=Number(result[0].lon);
  if(city==='RIO DE JANEIRO'&&(lat< -23.15||lat> -22.65||lng< -43.85||lng> -43.05))return null;
  if(city==='NITEROI'&&(lat< -23.15||lat> -22.75||lng< -43.20||lng> -42.75))return null;
  /* demais cidades: só aceita resultado dentro do estado do RJ */
  if(city!=='RIO DE JANEIRO'&&city!=='NITEROI'&&(lat< -23.40||lat> -20.70||lng< -45.00||lng> -40.90))return null;
  const pos=[lat,lng];A.cache.set(key,pos);return pos;
 }catch{return null;}});A.queue=task.catch(()=>null);return task;
}
/* Mapa 01: bairros do Rio ou de Niterói (como sempre foi) */
function openBairros(city){if(!A.data)return;
 const list=[...A.data.bairros].filter(([key])=>key.startsWith(city+'|')).map(([key,n])=>({bairro:key.split('|')[1],city,label:key.split('|')[1],n}));
 janelaBairros(city,list,city==='NITEROI'?[-22.90,-43.10]:[-22.93,-43.35],11);
}
/* Mapa 02: bairros de todas as cidades da planilha, com a cidade junto ao nome
   ("CENTRO — NITEROI", "CENTRO — PETROPOLIS"), porque há nomes repetidos */
function openBairrosEstado(){if(!A.data)return;
 const list=[...A.data.bairros].map(([key,n])=>{const [city,bairro]=key.split('|');return {bairro,city,label:bairro+' — '+city,n};});
 janelaBairros('ESTADO DO RIO DE JANEIRO',list,[-22.45,-42.85],8);
}
/* A janela (igual para os dois mapas; só muda o título e a lista) */
function janelaBairros(titulo,list,center,zoom){closeModal();
 list.sort((a,b)=>b.n-a.n);
 const total=list.reduce((s,p)=>s+p.n,0),element=document.createElement('div');element.className='v9-overlay';
 element.innerHTML=`<div class="v9-dialog" role="dialog" aria-modal="true"><header><div><strong>${esc(titulo)} — CONCENTRAÇÃO POR BAIRRO</strong><small>${fmt(total)} vidas com bairro informado · ${fmt(list.length)} bairros</small></div><button class="v9-close" type="button">Fechar ×</button></header><p>Mapa aproximado por bairro, utilizando referências públicas. Não representa endereços individuais.</p><div class="v9-grid"><div id="v9-detail-map"></div><aside><strong>BAIRROS COM MAIS VIDAS</strong><div class="v9-progress">Preparando localização...</div><div class="v9-rank">${list.map(p=>`<div><span>${esc(p.label)}</span><b>${fmt(p.n)}</b></div>`).join('')}</div></aside></div></div>`;
 document.body.appendChild(element);const modal={element,map:null,closed:false};A.modal=modal;
 element.querySelector('.v9-close').onclick=closeModal;element.onclick=e=>{if(e.target===element)closeModal();};
 const map=L.map(element.querySelector('#v9-detail-map'),{zoomControl:true}).setView(center,zoom);modal.map=map;
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(map);
 setTimeout(()=>map.invalidateSize(),100);
 if(!list.length){element.querySelector('.v9-progress').textContent='Nenhum bairro informado para este município.';return;}
 const heatPoints=[],bounds=[];let found=0;
 (async()=>{for(let i=0;i<list.length;i++){if(modal.closed)return;const p=list[i],pos=await geocode(p.bairro,p.city);if(modal.closed)return;
  if(pos){found++;bounds.push(pos);heatPoints.push([...pos,heatIntensity(p.n,list[0].n)]);
   L.circleMarker(pos,{radius:4,color:'#fff',weight:1,fillColor:'#ff3045',fillOpacity:1}).bindTooltip(popup(p.label,p.n,false)).addTo(map);
   if(modal.heat)map.removeLayer(modal.heat);
   modal.heat=L.heatLayer(heatPoints,{radius:42,blur:18,max:.68,minOpacity:.40,gradient:heatGradient()}).addTo(map);
  }
  element.querySelector('.v9-progress').textContent=`Localizados ${found} de ${i+1} bairros consultados (${list.length} no total)`;
  if(i===Math.min(list.length-1,14)&&bounds.length>1)map.fitBounds(bounds,{padding:[35,35],maxZoom:12});
 }
 if(bounds.length>1)map.fitBounds(bounds,{padding:[35,35],maxZoom:12});
 element.querySelector('.v9-progress').textContent=`${found} de ${list.length} bairros localizados. Todos os valores permanecem na lista.`;
 })();
}
function setMode(k,mode){A.mode[k]=mode;const suffix=k==='metro'?'Metro':'Estado';for(const m of ['Calor','Bolhas','Ambos']){const b=$('btn'+m+suffix);if(b){const active=m.toLowerCase()===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}}draw(k);}
// Configuração: caminhos relativos ao HTML, respeitando maiúsculas/minúsculas.
const FONTES = {
 beneficiarios: '../dados/familia-saude.xlsx',
 rede: '../dados/rede-rj.xls'
};
const R = {rows:[],loaded:false,layers:{},request:0,benefRequest:0};
const clean = v => ['NAN','NULL','UNDEFINED'].includes(norm(v)) ? '' : String(v ?? '').trim();
const field = v => norm(v).replace(/[^A-Z0-9]/g,'');
const valueId = v => typeof v === 'number' ? String(Math.trunc(v)) : clean(v).replace(/\D/g,'');
function sourceStatus(kind,msg){put(kind==='rede'?'statusRede':'statusBeneficiarios',msg);}
function sheetRows(book,required){
 for(const sheet of book.SheetNames){
  const rows=XLSX.utils.sheet_to_json(book.Sheets[sheet],{header:1,defval:'',raw:true,blankrows:false});
  for(let i=0;i<Math.min(30,rows.length);i++){
   const headers=rows[i].map(field);
   if(required.every(names=>names.some(n=>headers.includes(field(n)))))
    return rows.slice(i+1).filter(r=>r.some(v=>clean(v))).map(r=>Object.fromEntries(headers.map((h,j)=>[h,r[j]??''])));
  }
 }
 throw Error('Colunas obrigatórias não encontradas: '+required.map(n=>n.join('/')).join(', '));
}
const get=(row,...names)=>{for(const n of names){const v=row[field(n)];if(clean(v))return v;}return '';};
function readBeneficiarios(book){return sheetRows(book,[['Bairro'],['Cidade','Municipio'],['Estado','UF']]).map(r=>({bairro:norm(get(r,'Bairro')),cidade:norm(get(r,'Cidade','Municipio')),uf:norm(get(r,'Estado','UF'))}));}
function readRede(book){
 return sheetRows(book,[['NmeMunicipio'],['TpoContratualizacao'],['Urgencia'],['ClasseCadastro']]).map(r=>{
  const nome=clean(get(r,'NmeFantasia','RazaoSocial'))||'Prestador sem nome';
  const cidade=norm(get(r,'NmeMunicipio')),uf=norm(get(r,'UF','UFPrestador'));
  const bairro=clean(get(r,'Bairro')),endereco=clean(get(r,'Endereco')),numero=clean(get(r,'NroEndereco'));
  const rawContrato=norm(get(r,'TpoContratualizacao'));
  const contrato=rawContrato.includes('INDIRETA')?'INDIRETA':rawContrato.includes('DIRETA')?'DIRETA':'NAO INFORMADO';
  const u=norm(get(r,'Urgencia')),urgencia=['S','SIM','1','1=SIM'].includes(u)?'SIM':['N','NAO','0','2=NAO'].includes(u)?'NAO':'NAO INFORMADO';
  const classe=norm(get(r,'ClasseCadastro'))||'NAO INFORMADA';
  const tipo=norm(get(r,'TpoPrestador')),est=norm(get(r,'TpoEstabelecimento'));
  const categoria=classe.includes('HOSPITAL')||tipo.includes('HOSPITAL')||est.includes('HOSPITAL')?'Hospitais':classe.includes('LABORATOR')||tipo.includes('LABORATOR')?'Laboratórios':classe.includes('CLINIC')||tipo.includes('CLINIC')?'Clínicas':'Outros';
  const documento=valueId(get(r,'CNPJ/CPF','CNPJ_CPF'));
  // Uma unidade = documento (ou razão social), município e endereço. Especialidade e plano não criam novas unidades.
  const key=[documento||norm(get(r,'RazaoSocial'))||norm(nome),cidade,norm(endereco),norm(numero),norm(get(r,'Complemento'))].join('|');
  return {key,nome,cidade,uf,bairro,endereco,numero,contrato,urgencia,classe,categoria,especialidade:clean(get(r,'Especialidade')),plano:clean(get(r,'Plano'))};
 }).filter(r=>r.nome!=='Prestador sem nome'||r.endereco||r.cidade);
}
function matchedRows(){
 const contratos=[...document.querySelectorAll('[name="contrato"]:checked')].map(e=>e.value);
 const classe=$('filtroClasse').value,especialidade=$('filtroEspecialidade').value;
 const cidade=$('filtroMunicipio').value,urgencia=$('filtroUrgencia').value;
 return R.rows.filter(r=>['RJ','RIO DE JANEIRO'].includes(r.uf)&&contratos.includes(r.contrato)&&(!urgencia||r.urgencia===urgencia)&&(!classe||r.classe===classe)&&(!especialidade||norm(r.especialidade)===especialidade)&&(!cidade||r.cidade===cidade));
}
function uniqueUnits(rows){
 const units=new Map();
 for(const r of rows){
  if(!units.has(r.key))units.set(r.key,{...r,contratos:new Set(),urgencias:new Set(),classes:new Set(),categorias:new Set(),especialidades:new Set(),planos:new Set()});
  const u=units.get(r.key);u.contratos.add(r.contrato);u.urgencias.add(r.urgencia);u.classes.add(r.classe);u.categorias.add(r.categoria);if(r.especialidade)u.especialidades.add(r.especialidade);if(r.plano)u.planos.add(r.plano);
 }
 // Uma unidade com classificações diferentes recebe uma categoria única para reconciliar os cartões.
 return [...units.values()].map(u=>({...u,categoria:['Hospitais','Laboratórios','Clínicas','Outros'].find(c=>u.categorias.has(c))}));
}
function fillFilters(){
 const options=(id,values,all)=>{const select=$(id),old=new Set([...select.selectedOptions].map(o=>o.value));select.replaceChildren();if(all){const o=document.createElement('option');o.value='';o.textContent=all;select.append(o);}for(const v of values){const o=document.createElement('option');o.value=v;o.textContent=v;o.selected=old.has(v);select.append(o);}};
 const rows=R.rows.filter(r=>['RJ','RIO DE JANEIRO'].includes(r.uf));
 options('filtroClasse',[...new Set(rows.map(r=>r.classe))].sort(),'Todas');
 options('filtroEspecialidade',[...new Set(rows.map(r=>norm(r.especialidade)).filter(Boolean))].sort(),'Todas');
 options('filtroMunicipio',[...new Set(rows.map(r=>r.cidade).filter(Boolean))].sort(),'Todos os municípios');
}
function renderRede(){
 const units=uniqueUnits(matchedRows());R.filtered=units;
 put('totalPrestadores',fmt(units.length));
 for(const [id,cat] of [['totalHospitais','Hospitais'],['totalClinicas','Clínicas'],['totalLaboratorios','Laboratórios'],['totalOutros','Outros']])put(id,fmt(units.filter(u=>u.categoria===cat).length));
 const selected=[...document.querySelectorAll('[name="contrato"]:checked')].map(e=>e.value);
 const labels={DIRETA:'Direta',INDIRETA:'Indireta','NAO INFORMADO':'Não informada'};
 put('resumoContrato',selected.length===3?'Todas as contratações':selected.length?selected.map(v=>labels[v]).join(' + '):'Nenhuma selecionada');
 put('resumoRede',`${fmt(units.length)} unidades da rede nos filtros selecionados. Clique nos marcadores para consultar os prestadores.`);
 drawProviders('estado');
}

// Agrupamento por proximidade e categoria; todas as unidades permanecem nos detalhes.
function clusterNetwork(units,centers,project,cell){
 const buckets=new Map();
 for(const u of units){const anchor=centers.get(u.cidade);if(!anchor)continue;const point=project(anchor);const key=[u.categoria,Math.floor(point.x/cell),Math.floor(point.y/cell)].join('|');
  if(!buckets.has(key))buckets.set(key,{categoria:u.categoria,anchor,units:[],cities:new Set()});
  const group=buckets.get(key);group.units.push(u);group.cities.add(u.cidade);
 }
 return [...buckets.values()];
}
function drawProviders(k){
 if(k!=='estado')return;
 const map=A.maps[k];if(!map)return;
 if(R.layers[k])map.removeLayer(R.layers[k]);R.layers[k]=L.layerGroup().addTo(map);
 if(!R.loaded||!A.geo)return;
 const selected=[...document.querySelectorAll('[name="camadaRede"]:checked')].map(e=>e.value);
 const units=R.filtered||[],centers=new Map();
 for(const f of A.geo.features)centers.set(cityName(f),L.geoJSON(f).getBounds().getCenter());
 const unmapped=units.filter(u=>!centers.has(u.cidade)).length;
 put('avisoLocalizacao',`Rede agrupada por proximidade e categoria • Localização aproximada • ${fmt(unmapped)} unidades sem município reconhecido`);
 const zoom=map.getZoom(),cell=zoom<=8?180:zoom<=9?110:64;
 const groups=clusterNetwork(units.filter(u=>selected.includes(u.categoria)),centers,p=>map.project(p,zoom),cell);
 put('modoRede',zoom<=8?'Rede resumida • amplie para detalhar':'Rede detalhada por proximidade');
 const colors={'Hospitais':'#168bff','Clínicas':'#33c95a','Laboratórios':'#ad64ed','Outros':'#ffae38'};
 const symbols={'Hospitais':'H','Clínicas':'C','Laboratórios':'L','Outros':'O'};
 const positions=[];
 for(const group of groups){
  const {categoria:cat,anchor:center,units:list,cities}=group;
  const origin=map.latLngToContainerPoint(center);let dx=0,dy=-28;
  // Pequenos deslocamentos com conector até a âncora evitam sobrepor as gotas.
  const candidates=[[0,-28],[-26,-28],[26,-28],[-52,-28],[52,-28],[0,-57],[-26,-57],[26,-57],[-52,-57],[52,-57],[0,-86],[-26,-86],[26,-86]];
  for(const offset of candidates){dx=offset[0];dy=offset[1];if(positions.every(p=>Math.hypot(p.x-origin.x-dx,p.y-origin.y-dy)>25))break;}
  positions.push({x:origin.x+dx,y:origin.y+dy});
  const raised=map.containerPointToLatLng(L.point(origin.x+dx,origin.y+dy));
  L.circleMarker(center,{radius:2,color:'#b9cde0',weight:0,fillColor:'#b9cde0',fillOpacity:.7,interactive:false}).addTo(R.layers[k]);
  L.polyline([center,raised],{color:'#b9cde0',weight:1,opacity:.6,interactive:false}).addTo(R.layers[k]);
  const html=`<div class="rede-pin-small" style="--pin:${colors[cat]}"><b>${symbols[cat]}</b></div>`;
  const locality=cities.size===1?[...cities][0]:`${fmt(cities.size)} municípios próximos`;
  const details=list.slice(0,100).map(u=>`<li><strong>${esc(u.nome)}</strong><br>${esc(u.cidade)} — ${esc([u.endereco,u.numero,u.bairro].filter(Boolean).join(', ')||'Endereço não informado')}<br><small>${esc([...u.contratos].join(' / '))} · Urgência: ${esc([...u.urgencias].join(' / '))}<br>Planos: ${esc([...u.planos].join(', ')||'Não informado')}</small></li>`).join('');
  const marker=L.marker(raised,{icon:L.divIcon({className:'rede-marker-small',html,iconSize:[20,25],iconAnchor:[10,25]}),zIndexOffset:400,keyboard:true,title:`${cat}: ${fmt(list.length)} unidades em ${locality}`});
  marker.bindTooltip(`${esc(cat)} • ${esc(locality)}<br>${fmt(list.length)} unidades • clique para consultar`,{direction:'top',offset:[0,-23]});
  marker.bindPopup(`<div class="rede-popup"><strong>${esc(cat)} — ${esc(locality)}</strong><p>${fmt(list.length)} unidades agrupadas. Posição aproximada; amplie para separar os grupos.</p><ul>${details}</ul>${list.length>100?'<p>Exibindo as primeiras 100 unidades. Refine os filtros ou amplie o mapa para detalhar.</p>':''}</div>`,{maxWidth:370,autoPan:false}).addTo(R.layers[k]);
 }
}
function applyBenefVisibility(){for(const k of ['estado']){const visible=$('exibirBeneficiarios').checked;for(const dict of [A.heats,A.bubbles,A.labels]){const layer=dict[k],map=A.maps[k];if(!layer||!map)continue;if(visible&&!map.hasLayer(layer))layer.addTo(map);if(!visible&&map.hasLayer(layer))map.removeLayer(layer);}}}
async function loadBook(kind,file){
 if(file)return XLSX.read(await file.arrayBuffer(),{type:'array'});
 const url=new URL(FONTES[kind],document.baseURI);url.searchParams.set('atualizacao',Date.now());
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
 try{const response=await fetch(url,{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error(`Arquivo não encontrado (${response.status}). Confira ${FONTES[kind]} ou importe manualmente.`);if((response.headers.get('content-type')||'').includes('text/html'))throw Error('O endereço retornou uma página HTML, em vez da planilha.');return XLSX.read(await response.arrayBuffer(),{type:'array'});}finally{clearTimeout(timer);}
}
async function ensureMaps(){initMaps();if(!A.geo){const res=await fetch(GEO_URL);if(!res.ok)throw Error('Não foi possível carregar a malha municipal.');const geo=await res.json();if(!Array.isArray(geo.features))throw Error('Malha municipal inválida.');A.geo=geo;}}
async function loadSource(kind,file){
 const token=kind==='rede'?++R.request:++R.benefRequest;
 const current=()=>token===(kind==='rede'?R.request:R.benefRequest);
 sourceStatus(kind,'Carregando…');
 try{
  await libraries();if(!current())return;
  const book=await loadBook(kind,file);if(!current())return;
  const rows=kind==='rede'?readRede(book):readBeneficiarios(book);if(!rows.length)throw Error('Planilha sem registros.');
  if(kind==='rede'){R.rows=rows;R.loaded=true;fillFilters();renderRede();}
  else{closeModal();A.data=aggregate(rows);indicators(A.data);put('nomeArquivo',file?.name||'familia-saude.xlsx');put('ultimaAtualizacao',new Date().toLocaleString('pt-BR'));}
  sourceStatus(kind,`${file?'Importação manual':'Arquivo do site'}: ${file?.name||(kind==='rede'?'rede-rj.xls':'familia-saude.xlsx')} • lido em ${new Date().toLocaleString('pt-BR')}`);
  status('Dados carregados; preparando mapas…');
  try{await ensureMaps();if(!current())return;draw('metro',true);draw('estado',true);for(const k of ['metro','estado'])drawProviders(k);applyBenefVisibility();status(A.data&&R.loaded?'Beneficiários e rede carregados':'Uma base carregada; confira o status da outra',true);}
  catch(error){if(current())status('Erro no mapa: '+error.message+' Os dados foram carregados.');}
 }catch(error){if(!current())return;console.error(error);sourceStatus(kind,'Erro: '+(error.name==='AbortError'?'Tempo de leitura excedido. Tente novamente ou importe manualmente.':error.message)+(kind==='rede'&&R.loaded||kind!=='rede'&&A.data?' A base anterior foi mantida.':''));status('Erro ao carregar uma base. Confira os avisos ou importe manualmente.');}
}
async function importExcel(e){const file=e.target.files?.[0];if(!file)return;try{await loadSource('beneficiarios',file);}finally{e.target.value='';}}
function initRede(){
 $('arquivoRede').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{await loadSource('rede',file);}finally{e.target.value='';}});
 $('btnAtualizarBases').addEventListener('click',()=>{void loadSource('beneficiarios');void loadSource('rede');});
 for(const e of document.querySelectorAll('[name="contrato"], [name="camadaRede"], #filtroClasse, #filtroUrgencia, #filtroMunicipio, #filtroEspecialidade'))e.addEventListener('change',renderRede);
 $('exibirBeneficiarios').addEventListener('change',()=>{draw('estado');applyBenefVisibility();});
 $('limparFiltros').addEventListener('click',()=>{document.querySelectorAll('[name="contrato"]').forEach(e=>e.checked=true);$('filtroUrgencia').value='';$('filtroMunicipio').value='';$('filtroClasse').value='';$('filtroEspecialidade').value='';renderRede();});
 document.addEventListener('click',e=>{for(const id of ['contratoMenu','camadasMenu']){const menu=$(id);if(menu&&!menu.contains(e.target))menu.open=false;}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const id of ['contratoMenu','camadasMenu'])$(id).open=false;});
 void loadSource('beneficiarios');void loadSource('rede');
}

function styles(){if($('v9-styles'))return;const s=document.createElement('style');s.id='v9-styles';s.textContent=`
.map-panel-footer,.assefaz-legend{display:none!important}
.leaflet-pane.leaflet-v9heat-pane,.leaflet-pane.leaflet-v9labels-pane{pointer-events:none!important}
.leaflet-v9heat-pane canvas,.leaflet-v9labels-pane *{pointer-events:none!important}
.v9-tooltip{background:#101c34!important;border:1px solid #466783!important;color:#fff!important;border-radius:7px!important;box-shadow:0 5px 15px #0009!important}
.v9-tip{display:flex;flex-direction:column;gap:5px;font:12px Arial,sans-serif;color:#fff}.v9-tip strong{font-size:13px}.v9-tip span{color:#33e2fa;font-weight:700;font-size:16px}.v9-tip small{color:#b7c8dd}
.v9-label-icon{background:none!important;border:0!important;pointer-events:none!important}
.v9-label{width:142px;height:44px;border:1px solid var(--accent);border-radius:7px;background:rgba(8,16,35,.97);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font:700 10px Arial,sans-serif;box-sizing:border-box;white-space:nowrap;box-shadow:0 3px 12px #0008}
.v9-label strong{font-size:14px;color:var(--accent);margin-top:3px}
.v9-overlay{position:fixed;inset:0;z-index:99999;background:#020714e8;display:flex;align-items:center;justify-content:center;padding:15px;box-sizing:border-box}
.v9-dialog{width:min(1150px,98vw);height:min(780px,95vh);background:#101a31;border:1px solid #345170;border-radius:12px;color:#fff;display:flex;flex-direction:column;overflow:hidden;font:13px Arial,sans-serif}
.v9-dialog header{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:16px;border-bottom:1px solid #34435c}
.v9-dialog header strong{display:block;font-size:17px}.v9-dialog header small{display:block;color:#a9c2dc;margin-top:5px}
.v9-dialog header button{border:1px solid #426484;border-radius:7px;padding:9px 13px;background:#1c3653;color:#fff;cursor:pointer}
.v9-dialog>p{color:#b8cce1;padding:10px 16px;margin:0}
.v9-grid{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:10px;min-height:0;flex:1;padding:10px}
#v9-detail-map{min-height:300px;border-radius:8px;overflow:hidden}
.v9-grid aside{min-height:0;overflow:auto;padding:12px;border-radius:8px;background:#152540}
.v9-progress{font-size:11px;color:#9cc4e1;margin:10px 0}.v9-rank>div{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #30405b;padding:8px 0}.v9-rank b{color:#35ddf5}
@media(max-width:700px){.v9-grid{grid-template-columns:1fr;grid-template-rows:minmax(250px,1fr) 180px}}
`;document.head.appendChild(s);}
function init(){styles();document.querySelectorAll('.map-panel-footer').forEach(e=>e.remove());
 const input=$('arquivoExcel');if(!input){console.error('Não encontrei #arquivoExcel');return;}input.addEventListener('change',importExcel);
 for(const k of ['metro','estado']){const suffix=k==='metro'?'Metro':'Estado';for(const m of ['Calor','Bolhas','Ambos'])$('btn'+m+suffix)?.addEventListener('click',()=>setMode(k,m.toLowerCase()));$('btnReset'+suffix)?.addEventListener('click',()=>draw(k,true));}
 status('Lendo arquivos do site…');initRede();
 // Leaflet precisa atualizar a área visível quando o iframe/menu global muda de largura.
 const recalc=()=>{for(const map of Object.values(A.maps)){if(map){map.invalidateSize({pan:false});}}};
 if(typeof ResizeObserver!=='undefined'){
   const observer=new ResizeObserver(()=>{requestAnimationFrame(recalc);});
   for(const id of ['mapaMetropolitano','mapaEstado']){const el=$(id);if(el)observer.observe(el);}
 }
 window.addEventListener('resize',recalc);
 window.addEventListener('pageshow',recalc);
 }
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
