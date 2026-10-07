/* Сцена Forma 96: mountForma96(view, ui) — view: контейнер под canvas, ui: элемент с кнопками .views button */
window.mountForma96=function(view,ui){
'use strict';
/* Система координат: метры. X — на восток, Y — вверх, Z — на юг.
   Начало — северо-западный угол дома. Участок и парковка — из файла «Юсупово Парк 220»
   (центральный участок): X = (sx − 3702,6)/1000, Z = (23720 − sy)/1000. */
if(!window.THREE){const l=view.querySelector('.loading');if(l)l.textContent='3D не загрузилось. Обновите страницу.';return null}
const T=THREE;
const renderer=new T.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.outputEncoding=T.sRGBEncoding;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
view.prepend(renderer.domElement);
const scene=new T.Scene();
scene.fog=new T.Fog(0xdfe7ef,70,170);
const camera=new T.PerspectiveCamera(38,16/9,0.3,400);
const controls=new T.OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.08;controls.maxPolarAngle=Math.PI*0.49;controls.minDistance=5;controls.maxDistance=110;

/* ---------- небо ---------- */
{const c=document.createElement('canvas');c.width=4;c.height=256;const g=c.getContext('2d');const gr=g.createLinearGradient(0,0,0,256);
gr.addColorStop(0,'#8fb3d9');gr.addColorStop(.55,'#cfe0ee');gr.addColorStop(1,'#eef2f4');g.fillStyle=gr;g.fillRect(0,0,4,256);
const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;scene.background=t}

/* ---------- свет ---------- */
scene.add(new T.HemisphereLight(0xe8f0f8,0x5d6b48,.72));
const sun=new T.DirectionalLight(0xfff1dc,1.45);
sun.position.set(-22,30,34);sun.target.position.set(6,0,10);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:1,far:110});sun.shadow.bias=-.0004;sun.shadow.normalBias=.02;
scene.add(sun,sun.target);
// окружение (RoomEnvironment): мягкий рассеянный свет и отражения в стёклах и металле
let envTex=null;if(T.RoomEnvironment){const pm=new T.PMREMGenerator(renderer);envTex=pm.fromScene(new T.RoomEnvironment(),.04).texture;pm.dispose()}

/* ---------- процедурные текстуры ---------- */
function canvasTex(w,h,draw,tile){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
 const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.encoding=T.sRGBEncoding;t.anisotropy=8;t.repeat.set(1/tile[0],1/tile[1]);return t}
const rnd=(()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647})();
function noise(g,w,h,base,amp,n){g.fillStyle=base;g.fillRect(0,0,w,h);for(let i=0;i<n;i++){const v=(rnd()-.5)*amp;g.fillStyle=v>0?`rgba(255,255,255,${v})`:`rgba(0,0,0,${-v})`;g.fillRect(rnd()*w,rnd()*h,1+rnd()*2,1+rnd()*2)}}
const texBrick=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#3e4146';g.fillRect(0,0,w,h);const bh=h/8,bw=w/2;
 for(let r=0;r<8;r++)for(let k=-1;k<3;k++){const x=k*bw+(r%2?bw/2:0);const l=46+rnd()*14|0;g.fillStyle=`rgb(${l+28},${l+31},${l+36})`;g.fillRect(x+3,r*bh+3,bw-6,bh-6)}
 for(let i=0;i<2500;i++){g.fillStyle=`rgba(0,0,0,${rnd()*.12})`;g.fillRect(rnd()*w,rnd()*h,1,1)}},[0.5,0.52]);
const texPlaster=canvasTex(256,256,(g,w,h)=>noise(g,w,h,'#f0ece4',.07,9000),[1.6,1.6]);
// натуральный камень плитняком: ряды плоских камней разной высоты и длины, беж-серый с рыжиной
function stoneTex(pal,mortar,k=1){return canvasTex(512,512,(g,w,h)=>{g.fillStyle=mortar;g.fillRect(0,0,w,h);let y=0;
 while(y<h){const rh=12+rnd()*30|0;let x=-rnd()*60;while(x<w){const len=40+rnd()*130|0,c=pal[rnd()*pal.length|0];
  g.fillStyle=c;g.fillRect(x+2,y+2,len-4,rh-4);g.fillStyle='rgba(255,255,255,.18)';g.fillRect(x+2,y+2,len-4,2);g.fillStyle='rgba(0,0,0,.22)';g.fillRect(x+2,y+rh-4,len-4,2);
  for(let i=0;i<len*rh/40;i++){g.fillStyle=`rgba(${rnd()>.5?255:0},${rnd()>.5?255:0},${rnd()>.5?255:0},${.05+rnd()*.07})`;g.fillRect(x+2+rnd()*(len-4),y+2+rnd()*(rh-4),1.5,1.5)}
  x+=len}y+=rh}
 if(k!==1){g.fillStyle=`rgba(20,18,16,${1-k})`;g.fillRect(0,0,w,h)}},[1.2,1.2])}
const texStone=stoneTex(['#cdbb9a','#bfb39c','#a99f8f','#c9a27a','#b8ab92','#d6c7a6','#9d968a','#c08a5e','#d8cbb0'],'#8e8475');
const texStoneDark=stoneTex(['#7d766c','#6e685f','#8a8073','#655f57','#776d60'],'#4c4741');
const texDarkWood=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#34373b';g.fillRect(0,0,w,h);for(let i=0;i<700;i++){g.strokeStyle=`rgba(${rnd()>.5?90:10},${rnd()>.5?94:12},${rnd()>.5?100:14},${.15+rnd()*.25})`;const y=rnd()*h;g.beginPath();g.moveTo(0,y);g.bezierCurveTo(w*.3,y+rnd()*5-2.5,w*.6,y+rnd()*5-2.5,w,y+rnd()*4-2);g.stroke()}},[1.5,1.5]);
// металлочерепица: ступенька ряда 350 мм, волна 185 мм
const texTile=canvasTex(256,128,(g,w,h)=>{for(let y=0;y<h;y++){const k=y/h;const l=52+(1-k)*22;g.fillStyle=`rgb(${l-5},${l-2},${l+4})`;g.fillRect(0,y,w,1)}
 g.fillStyle='#1b1d21';g.fillRect(0,h-10,w,10);g.fillStyle='rgba(255,255,255,.12)';g.fillRect(0,h-12,w,2);
 for(let x=0;x<w;x++){const v=Math.cos(x/w*6*Math.PI*2);g.fillStyle=v>0?`rgba(255,255,255,${v*.10})`:`rgba(0,0,0,${-v*.22})`;g.fillRect(x,0,1,h-10)}},[1.1,.35]);
const texSlab=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#8f9294';g.fillRect(0,0,w,h);for(let r=0;r<2;r++)for(let c=0;c<2;c++){const l=rnd()*14;g.fillStyle=`rgb(${176+l},${178+l},${178+l})`;g.fillRect(c*w/2+2,r*h/2+2,w/2-4,h/2-4)}
 for(let i=0;i<6000;i++){g.fillStyle=`rgba(0,0,0,${rnd()*.06})`;g.fillRect(rnd()*w,rnd()*h,1,1)}},[1.2,1.2]);
const texWood=canvasTex(256,256,(g,w,h)=>{for(let i=0;i<8;i++){const l=rnd()*18;g.fillStyle=`rgb(${160+l},${112+l*.7},${70+l*.5})`;g.fillRect(0,i*h/8,w,h/8-3);g.fillStyle='rgba(60,35,15,.55)';g.fillRect(0,i*h/8+h/8-3,w,3)}
 for(let i=0;i<500;i++){g.strokeStyle=`rgba(90,55,25,${rnd()*.25})`;const y=rnd()*h;g.beginPath();g.moveTo(0,y);g.bezierCurveTo(w*.3,y+rnd()*4-2,w*.6,y+rnd()*4-2,w,y+rnd()*3-1.5);g.stroke()}},[1.2,1.2]);
const texGrass=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#6f8f4a';g.fillRect(0,0,w,h);for(let i=0;i<14000;i++){const l=rnd();g.fillStyle=`rgba(${l>.5?150:60},${l>.5?175:95},${l>.5?90:40},${.18+rnd()*.25})`;g.fillRect(rnd()*w,rnd()*h,1,2+rnd()*2)}},[4,4]);
const texMeadow=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#7f9257';g.fillRect(0,0,w,h);for(let i=0;i<9000;i++){g.fillStyle=`rgba(${rnd()>.5?175:70},${rnd()>.5?170:100},${70},${.15+rnd()*.2})`;g.fillRect(rnd()*w,rnd()*h,2,2)}},[8,8]);
const texPaving=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#8e9095';g.fillRect(0,0,w,h);for(let r=0;r<4;r++)for(let c=0;c<2;c++){const l=rnd()*16;g.fillStyle=`rgb(${168+l},${170+l},${172+l})`;g.fillRect(c*w/2+(r%2?w/4:0)+2,r*h/4+2,w/2-4,h/4-4);g.fillRect(c*w/2+(r%2?w/4:0)-w+2,r*h/4+2,w/2-4,h/4-4)}},[0.8,0.8]);
const texGravel=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#a8a49b';g.fillRect(0,0,w,h);for(let i=0;i<9000;i++){const l=120+rnd()*110|0;g.fillStyle=`rgb(${l},${l-4},${l-12})`;g.beginPath();g.arc(rnd()*w,rnd()*h,.8+rnd()*1.6,0,7);g.fill()}},[1.5,1.5]);
const texAsphalt=canvasTex(256,256,(g,w,h)=>noise(g,w,h,'#55585c',.18,16000),[3,3]);

/* ---------- материалы ---------- */
const M=(o)=>new T.MeshStandardMaterial(Object.assign({roughness:.9,metalness:0},o));
const mat={
 brick:M({map:texBrick,roughness:.95}), plaster:M({map:texPlaster}),
 graphite:M({color:0x2e3236,roughness:.55,metalness:.15}), frame:M({color:0x30343a,roughness:.4,metalness:.25}),
 glass:new T.MeshStandardMaterial({color:0x3a4c5e,roughness:.04,metalness:.9,transparent:true,opacity:.82,envMapIntensity:1.4}),
 roof:M({map:texTile,roughness:.5,metalness:.35,side:T.DoubleSide}), roofTrim:M({color:0x3f4248,roughness:.6,metalness:.15}),
 wood:M({map:texWood,roughness:.8}), woodPost:M({color:0x9b6b40,roughness:.75}), woodWall:M({map:texWood,roughness:.75}),
 stone:M({map:texStone,roughness:.95}), stoneDark:M({map:texStoneDark,roughness:.95}),
 darkWood:M({map:texDarkWood,roughness:.7}), darkWoodCeil:M({map:texDarkWood,roughness:.7,side:T.DoubleSide}),
 glulam:M({map:texWood,color:0xffe2c2,roughness:.6}), slab:M({map:texSlab,roughness:.85}),
 glassMatt:M({color:0xa9b6c0,roughness:.35,metalness:.2}), planter:M({color:0x9c9c97,roughness:.9}),
 lamp:new T.MeshStandardMaterial({color:0xffe2b0,emissive:0xffc98a,emissiveIntensity:1.4,roughness:.4}),
 interior:M({color:0xe9e3d8}), floor:M({color:0xb99a76}), ceiling:M({color:0xf4f1ec,side:T.DoubleSide}),
 soffit:M({color:0x474a51,roughness:.5,metalness:.35,side:T.DoubleSide}), woodCeil:M({map:texWood,roughness:.8,side:T.DoubleSide}),
 paving:M({map:texPaving}), gravel:M({map:texGravel}), grass:M({map:texGrass}), meadow:M({map:texMeadow}), asphalt:M({map:texAsphalt}),
 tile:M({color:0x8b8e93,roughness:.8}), steel:M({color:0xb9bcc0,roughness:.3,metalness:.8}), door:M({color:0x2b2f33,roughness:.5,metalness:.2}),
 fence:M({color:0x2a2d31,roughness:.75,metalness:.1}), soil:M({color:0x5b4636}),
 sofa:M({color:0xcfc7ba}), cushion:M({color:0x8697ad}), dark:M({color:0x222428,roughness:.4,metalness:.5}),
 car:M({color:0x3b4552,roughness:.25,metalness:.7}), tyre:M({color:0x151617,roughness:.9}),
 pine:M({color:0x2f4a2e,roughness:1}), pineTrunk:M({color:0x6b4a33}), birchTrunk:M({color:0xe8e4dc}), birch:M({color:0x5f8a3c,roughness:1}),
 shrub:M({color:0x46663a,roughness:1}), hedge:M({color:0x3f5f35,roughness:1}), flower:M({color:0xc9a2c4,roughness:1}), flower2:M({color:0xe8d27a,roughness:1})
};

// отражения окружения — только стёклам, металлу и кровле, чтобы не пересвечивать фасады и газон
if(envTex){[mat.glass,mat.steel,mat.frame,mat.roof,mat.car].forEach(m=>{m.envMap=envTex});
 mat.roof.envMapIntensity=.3;mat.frame.envMapIntensity=.5;mat.glass.envMapIntensity=1.2}

/* ---------- геометрия ---------- */
const root=new T.Group();scene.add(root);
function box(x0,x1,y0,y1,z0,z1,m,o={}){
 const w=Math.abs(x1-x0),h=Math.abs(y1-y0),d=Math.abs(z1-z0);if(w<1e-4||h<1e-4||d<1e-4)return null;
 const geo=new T.BoxGeometry(w,h,d);const uv=geo.attributes.uv;
 for(let i=0;i<24;i++){const f=Math.floor(i/4);let su,sv;if(f<2){su=d;sv=h}else if(f<4){su=w;sv=d}else{su=w;sv=h}uv.setXY(i,uv.getX(i)*su,uv.getY(i)*sv)}
 const mesh=new T.Mesh(geo,m);mesh.position.set((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);
 mesh.castShadow=o.cast!==false;mesh.receiveShadow=true;(o.parent||root).add(mesh);return mesh}
function flat(points,y,m,o={}){ // многоугольник на высоте y, points: [[x,z]...]
 const s=new T.Shape(points.map(p=>new T.Vector2(p[0],-p[1])));const geo=new T.ShapeGeometry(s);geo.rotateX(-Math.PI/2);
 const mesh=new T.Mesh(geo,m);mesh.position.y=y;mesh.receiveShadow=true;mesh.castShadow=!!o.cast;(o.parent||root).add(mesh);return mesh}
function flatUV(points,y,m){const mesh=flat(points,y,m);const uv=mesh.geometry.attributes.uv,p=mesh.geometry.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,p.getX(i),p.getZ(i));return mesh}
function cyl(x,z,y0,y1,r,m,seg=12,r2){const g=new T.CylinderGeometry(r2??r,r,y1-y0,seg);const mesh=new T.Mesh(g,m);mesh.position.set(x,(y0+y1)/2,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh}

/* ---------- дом: размеры по чертежу ---------- */
const FL=.45, WT=3.45, t=.375;           // уровень пола, верх стен, наружная стена 375 мм
const W=11.875, D=11.875, WX=9.375, WING=4.375; // габариты; нижняя часть 9,375; северное крыло 4,375
const TOP=2.4;                            // верх окон и дверей от пола
// цоколь из тёмного натурального камня по всему периметру
[[-.04,W+.04,-.04,WING+.04],[-.04,WX+.04,WING,D+.04]].forEach(([a,b,c,d])=>box(a,b,0,FL,c,d,mat.stoneDark));
// пол и потолок внутри (видны через окна)
flat([[t,t],[W-t,t],[W-t,WING],[WX-t,WING],[WX-t,D-t],[t,D-t]],FL+.005,mat.floor);
flat([[t,t],[W-t,t],[W-t,WING],[WX-t,WING],[WX-t,D-t],[t,D-t]],3.2,mat.ceiling);

/* Фасад: стена толщиной t, outer — координата наружной плоскости, dir — наружу (+1/−1).
   Проёмы: s0..s1 вдоль стены; sill — низ от пола; kind: win | glassdoor | door.
   Каждый проём выделен графитом от пола до карниза. */
function facade(axis,outer,dir,a0,a1,openings,wallMat,accents=[]){
 const inner=outer-dir*t, o0=Math.min(inner,outer), o1=Math.max(inner,outer);
 const B=(s0,s1,y0,y1,m,depth0,depth1)=>axis==='x'?box(s0,s1,y0,y1,depth0,depth1,m):box(depth0,depth1,y0,y1,s0,s1,m);
 const jamb=.08;let cur=a0;
 // сплошной участок стены: внутри акцентных зон — облицовочный кирпич с выносом 2 см, вне — штукатурка
 const solid=(p,q)=>{let cuts=[p,q];accents.forEach(([u,v])=>{if(u>p&&u<q)cuts.push(u);if(v>p&&v<q)cuts.push(v)});cuts=[...new Set(cuts)].sort((x,y)=>x-y);
  for(let k=0;k<cuts.length-1;k++){const m0=cuts[k],m1=cuts[k+1],mid=(m0+m1)/2;
   const ac=accents.find(([u,v])=>mid>u&&mid<v);
   if(ac){const pr=ac[2]==='wood'?.02:.035;B(m0,m1,FL,WT,ac[2]==='wood'?mat.woodWall:mat.stone,Math.min(o0,outer+dir*pr),Math.max(o1,outer+dir*pr))}else B(m0,m1,FL,WT,wallMat,o0,o1)}};
 openings.sort((p,q)=>p.s0-q.s0).forEach(op=>{
  const g0=op.s0-jamb,g1=op.s1+jamb;
  if(g0>cur)solid(cur,g0);
  cur=g1;
  const pr0=Math.min(outer,outer+dir*.03),pr1=Math.max(outer,outer+dir*.03); // графит выступает на 3 см
  const gd0=Math.min(o0,pr0),gd1=Math.max(o1,pr1);
  // графитовая полоса: рамка по бокам на всю высоту, под окном и над ним
  B(g0,op.s0,FL,WT,mat.graphite,gd0,gd1);B(op.s1,g1,FL,WT,mat.graphite,gd0,gd1);
  const sill=op.kind==='win'?op.sill:0;
  if(sill>0)B(op.s0,op.s1,FL,FL+sill,mat.graphite,gd0,gd1);
  B(op.s0,op.s1,FL+TOP,WT,mat.graphite,gd0,gd1);
  // заполнение: рама + стекло или дверное полотно, утоплено на 12 см
  const f=outer-dir*.12, f0=Math.min(f,f-dir*.07), f1=Math.max(f,f-dir*.07);
  const y0=FL+sill,y1=FL+TOP,fw=.06;
  B(op.s0,op.s1,y0,y0+fw,mat.frame,f0,f1);B(op.s0,op.s1,y1-fw,y1,mat.frame,f0,f1);
  B(op.s0,op.s0+fw,y0,y1,mat.frame,f0,f1);B(op.s1-fw,op.s1,y0,y1,mat.frame,f0,f1);
  if(op.kind==='door'){B(op.s0+fw,op.s1-fw,y0+fw,y1-fw,mat.door,f0,f1);
    // входная дверь: графит, узкая вертикальная вставка из матового стекла, длинная ручка
    const gs0=op.s0+fw+.17;B(gs0,gs0+.14,y0+.35,y1-.35,mat.glassMatt,Math.min(f,f+dir*.005),Math.max(f,f+dir*.005));
    const hx=op.s1-fw-.13;B(hx-.015,hx+.015,FL+.55,FL+1.55,mat.steel,Math.min(f,f+dir*.06),Math.max(f,f+dir*.06))}
  else{const g=B(op.s0+fw,op.s1-fw,y0+fw,y1-fw,mat.glass,(f0+f1)/2-.008,(f0+f1)/2+.008);if(g){g.castShadow=false}
    // створки: окна от 1,2 м и портал на террасу — две створки, остальное — одна
    const wdt=op.s1-op.s0, n=op.kind==='glassdoor'?(wdt>1.5?2:1):(wdt>1.2?2:1);
    for(let i=1;i<n;i++){const s=op.s0+wdt*i/n;B(s-.045,s+.045,y0,y1,mat.frame,f0,f1)}
    // шпросы — классическая раскладка: 2 столбца в створке шире 0,6 м, ряды ~0,55 м
    const mo=outer-dir*.115,mm0=Math.min(mo,mo+dir*.02),mm1=Math.max(mo,mo+dir*.02);
    const sw=wdt/n,cols=sw>.6?2:1,rows=Math.max(1,Math.round((y1-y0)/.55));
    for(let i=0;i<n;i++){const a=op.s0+sw*i,b=a+sw;
     for(let c=1;c<cols;c++){const sx=a+(b-a)*c/cols;B(sx-.0125,sx+.0125,y0+fw,y1-fw,mat.frame,mm0,mm1)}
     for(let r=1;r<rows;r++){const yy=y0+(y1-y0)*r/rows;B(a+.03,b-.03,yy-.0125,yy+.0125,mat.frame,mm0,mm1)}}}
  // отлив / порог
  if(sill>0)B(op.s0-.02,op.s1+.02,FL+sill-.03,FL+sill,mat.graphite,Math.min(outer,outer+dir*.08),Math.max(outer,outer+dir*.08));
 });
 if(a1>cur)solid(cur,a1);
}
// северный фасад — глухой
facade('x',0,-1,0,W,[],mat.plaster,[[0,.7,'stone'],[W-.7,W,'stone']]);
// западный фасад: спальня, кабинет, санузел (подоконник 1,6)
facade('z',0,-1,t,D-t,[{s0:1.88,s1:3.27,kind:'win',sill:.8},{s0:5.15,s1:6.10,kind:'win',sill:.8},{s0:7.07,s1:7.63,kind:'win',sill:1.6}],mat.plaster,[[t,.7,'stone'],[D-.7,D-t,'stone']]);
// восточный фасад крыла: мастер-спальня
facade('z',W,1,t,WING,[{s0:1.88,s1:3.27,kind:'win',sill:.8}],mat.plaster,[[t,.7,'stone'],[WING-.7,WING,'stone']]);
// южная стена крыла над террасой
facade('x',WING,1,WX-t,W,[],mat.plaster,[[WX-t,W-.7,'wood'],[W-.7,W,'stone']]);   // дерево за диваном, камень на углу
// восток гостиной (терраса): большое окно в пол и дверь кухни в пол
facade('z',WX,1,WING,D-t,[{s0:5.08,s1:7.23,kind:'glassdoor'},{s0:9.72,s1:10.62,kind:'glassdoor'}],mat.plaster,[[7.31,9.64,'wood'],[D-.7,D-t,'stone']]); // дерево между выходами, камень на углу
// южный фасад (вход): дверь котельной в пол, входная дверь, окно кухни; камень — угол и вся входная группа под крыльцом
facade('x',D,1,0,WX,[{s0:1.06,s1:1.96,kind:'glassdoor'},{s0:4.14,s1:5.14,kind:'door'},{s0:6.73,s1:8.13,kind:'win',sill:.8}],mat.plaster,[[0,4.06,'stone'],[WX-.7,WX,'stone']]);

/* ---------- вальмовая крыша над домом и террасой, RAL 7024 ---------- */
const OV=.5, TERR_X=12.375, slope=Math.tan(25*Math.PI/180);
const rx0=-OV,rx1=TERR_X+OV,rz0=-OV,rz1=D+OV, ye=WT-OV*slope;
const half=(rz1-rz0)/2, yr=ye+half*slope, zc=(rz0+rz1)/2;
const R1=[rx0+half,yr,zc],R2=[rx1-half,yr,zc];
const A=[rx0,ye,rz0],B_=[rx1,ye,rz0],C=[rx1,ye,rz1],Dd=[rx0,ye,rz1];
function roofFace(pts,uvs){{const a=new T.Vector3(...pts[0]),b=new T.Vector3(...pts[1]),c=new T.Vector3(...pts[2]);if(b.sub(a).cross(c.sub(a)).y<0){pts=pts.slice();uvs=uvs.slice();for(let i=0;i<pts.length;i+=3){[pts[i+1],pts[i+2]]=[pts[i+2],pts[i+1]];[uvs[i+1],uvs[i+2]]=[uvs[i+2],uvs[i+1]]}}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts.flat(),3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs.flat(),2));g.computeVertexNormals();
 const m=new T.Mesh(g,mat.roof);m.castShadow=true;m.receiveShadow=true;root.add(m)}
const sl=half/Math.cos(25*Math.PI/180);
roofFace([A,R2,B_, A,R1,R2],[[rx0,0],[R2[0],sl],[rx1,0],[rx0,0],[R1[0],sl],[R2[0],sl]]);             // север
roofFace([Dd,C,R2, Dd,R2,R1],[[rx0,0],[rx1,0],[R2[0],sl],[rx0,0],[R2[0],sl],[R1[0],sl]]);           // юг
roofFace([A,Dd,R1],[[rz0,0],[rz1,0],[zc,sl]]);                                                     // запад
roofFace([B_,R2,C],[[rz0,0],[zc,sl],[rz1,0]]);                                                     // восток
function beam(p,q,w,h,m){const a=new T.Vector3(...p),b=new T.Vector3(...q);const len=a.distanceTo(b);const mesh=new T.Mesh(new T.BoxGeometry(w,len,h),m);
 mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh}
// конёк и рёбра
function bar(p,q,r,m){const a=new T.Vector3(...p),b=new T.Vector3(...q);const len=a.distanceTo(b);const g=new T.CylinderGeometry(r,r,len,8);const mesh=new T.Mesh(g,m);
 mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());mesh.castShadow=true;root.add(mesh);return mesh}
[[R1,R2],[A,R1],[Dd,R1],[B_,R2],[C,R2]].forEach(([p,q])=>bar([p[0],p[1]+.03,p[2]],[q[0],q[1]+.03,q[2]],.06,mat.roofTrim));
// лобовая доска и подшивка свесов в цвет кровли
const PXa=.35,PXb=5.85;   // выступ кровли над крыльцом (крыльцо 0,85–5,35 + свес 0,5)
box(rx0,rx1,ye-.2,ye,rz0-.02,rz0,mat.roofTrim);box(rx0,PXa,ye-.2,ye,rz1,rz1+.02,mat.roofTrim);box(PXb,rx1,ye-.2,ye,rz1,rz1+.02,mat.roofTrim);
box(rx0-.02,rx0,ye-.2,ye,rz0,rz1,mat.roofTrim);box(rx1,rx1+.02,ye-.2,ye,rz0,rz1,mat.roofTrim);
flat([[rx0,rz0],[rx1,rz0],[rx1,rz1],[rx0,rz1]],ye-.2,mat.soffit);
// водосточные желоба и трубы
const gut=(p,q)=>bar(p,q,.07,mat.roofTrim);
gut([rx0-.08,ye-.12,rz0-.08],[rx1+.08,ye-.12,rz0-.08]);gut([rx0-.08,ye-.12,rz1+.08],[PXa,ye-.12,rz1+.08]);gut([PXb,ye-.12,rz1+.08],[rx1+.08,ye-.12,rz1+.08]);
gut([rx0-.08,ye-.12,rz0-.08],[rx0-.08,ye-.12,rz1+.08]);gut([rx1+.08,ye-.12,rz0-.08],[rx1+.08,ye-.12,rz1+.08]);
[[-.08,-.08,rx0-.08,rz0-.08],[W+.08,-.08,rx1+.08,rz0-.08],[-.08,D+.08,rx0-.08,rz1+.08],[TERR_X+.1,D-1.05,rx1+.08,rz1+.08]].forEach(([x,z,gx,gz])=>{
 cyl(x,z,.15,ye-.4,.045,mat.roofTrim,10);bar([x,ye-.4,z],[gx,ye-.14,gz],.045,mat.roofTrim)});

/* ---------- терраса: деревянный настил, потолок, опоры ---------- */
const TZ0=WING, TZ1=10.875;
box(WX,TERR_X,0,FL-.03,TZ0,TZ1,mat.wood);
flatUV([[WX,WING],[rx1,WING],[rx1,rz1],[WX,rz1]],ye-.21,mat.woodCeil);
{const PX=TERR_X-.1, yC=ye-.21, BH=.4, posts=[TZ0+.45,D-.45];
 // прогон из клеёного бруса 200×400 на двух клеёных стойках 200×200, без промежуточных опор
 box(PX-.1,PX+.1,yC-BH,yC,TZ0,D+.1,mat.glulam);
 box(WX,WX+.1,yC-.22,yC,TZ0,D,mat.glulam);                                    // опорная доска на стене
 posts.forEach(z=>{box(PX-.1,PX+.1,FL-.03,yC-BH,z-.1,z+.1,mat.glulam);box(PX-.12,PX+.12,FL-.03,FL+.06,z-.12,z+.12,mat.graphite)});
 for(let z=TZ0+.6;z<D;z+=.6)box(WX+.1,PX-.1,yC-.14,yC,z-.04,z+.04,mat.glulam)}  // балки потолка
// мебель на террасе (из плана): диван, стол, два кресла, газовый гриль
const ty=FL-.03;
box(10.07,11.67,ty,ty+.42,4.49,5.34,mat.sofa);box(10.07,11.67,ty+.42,ty+.8,4.49,4.72,mat.sofa);box(10.25,10.85,ty+.42,ty+.55,4.75,5.3,mat.cushion);box(10.89,11.49,ty+.42,ty+.55,4.75,5.3,mat.cushion);
box(10.17,11.57,ty+.38,ty+.44,5.86,6.57,mat.wood);box(10.25,11.49,ty,ty+.38,5.95,6.48,mat.dark);
[[9.94,10.74],[11.0,11.8]].forEach(([a,b])=>{box(a,b,ty,ty+.4,7.0,7.8,mat.sofa);box(a,b,ty+.4,ty+.75,7.6,7.8,mat.sofa)});
box(11.74,12.31,ty,ty+.9,9.63,10.84,mat.steel);box(11.76,12.29,ty+.9,ty+1.2,9.65,10.82,mat.dark);

/* ---------- крыльцо 1,5 м под общей вальмовой крышей ----------
   Выступ кровли над крыльцом — вальма того же уклона 25°, карниз на одной высоте с домом, свесы 0,5 м.
   Конструкция: две стойки из тёмного дерева, передняя и боковые балки, подкосы; одна ступень. */
const PZ=D+1.5;
{const PZe=PZ+OV,PW=(PXb-PXa)/2,PXc=(PXa+PXb)/2,pyr=ye+PW*slope,Zap=PZe-PW,Zv=rz1-PW,psl=PW/Math.cos(25*Math.PI/180);
 const Pa=[PXa,ye,PZe],Pb=[PXb,ye,PZe],Pap=[PXc,pyr,Zap],Pv=[PXc,pyr,Zv],Va=[PXa,ye,rz1],Vb=[PXb,ye,rz1];
 roofFace([Pa,Pb,Pap],[[PXa,0],[PXb,0],[PXc,psl]]);
 roofFace([Va,Pa,Pap, Va,Pap,Pv],[[rz1,0],[PZe,0],[Zap,psl], [rz1,0],[Zap,psl],[Zv,psl]]);
 roofFace([Pb,Vb,Pv, Pb,Pv,Pap],[[PZe,0],[rz1,0],[Zv,psl], [PZe,0],[Zv,psl],[Zap,psl]]);
 [[Pap,Pv],[Pa,Pap],[Pb,Pap],[Va,Pv],[Vb,Pv]].forEach(([p,q])=>bar([p[0],p[1]+.03,p[2]],[q[0],q[1]+.03,q[2]],.055,mat.roofTrim));
 box(PXa,PXb,ye-.2,ye,PZe,PZe+.02,mat.roofTrim);box(PXa-.02,PXa,ye-.2,ye,rz1,PZe,mat.roofTrim);box(PXb,PXb+.02,ye-.2,ye,rz1,PZe,mat.roofTrim);
 gut([PXa-.08,ye-.12,PZe+.08],[PXb+.08,ye-.12,PZe+.08]);gut([PXa-.08,ye-.12,rz1+.08],[PXa-.08,ye-.12,PZe+.08]);gut([PXb+.08,ye-.12,rz1+.08],[PXb+.08,ye-.12,PZe+.08]);
 cyl(PXb+.08,PZe+.08,.3,ye-.14,.045,mat.roofTrim,10);
 // потолок крыльца — тёмное дерево
 flatUV([[PXa,D],[PXb,D],[PXb,PZe],[PXa,PZe]],ye-.205,mat.darkWoodCeil);
 // площадка из каменных плит на 0,43 м, перед ней площадка из плитки на 0,25 м — одна ступень
 box(.85,5.35,0,FL-.02,D,PZ,mat.slab);box(.6,5.6,0,.25,PZ,PZ+1.2,mat.paving);
 box(4.24,5.04,FL-.02,FL-.005,D+.05,D+.65,mat.dark);                                          // коврик
 // стойки 180×180, передняя балка, боковые балки к стене, подкосы — тёмное дерево
 const yb=ye-.2, bh=.25, posts=[1.0,5.2], zp=PZ-.15;
 posts.forEach(x=>{box(x-.09,x+.09,FL-.02,yb-bh,zp-.09,zp+.09,mat.darkWood);box(x-.09,x+.09,yb-bh,yb,D,zp+.09,mat.darkWood)});
 box(PXa+.15,PXb-.15,yb-bh,yb,zp-.09,zp+.09,mat.darkWood);
 posts.forEach(x=>{const sgn=x<PXc?1:-1;beam([x,yb-bh-.75,zp],[x+sgn*.7,yb-bh-.02,zp],.11,.11,mat.darkWood);beam([x,yb-bh-.75,zp-.02],[x,yb-bh-.02,zp-.75],.11,.11,mat.darkWood)});
 // ламели сбоку со стороны котельной
 box(.86,.94,FL-.02,yb-bh,D+.05,D+.11,mat.darkWood);
 for(let y=FL+.1;y<yb-bh-.05;y+=.13)box(.87,.93,y,y+.07,D+.11,zp-.09,mat.darkWood);
 // бра у двери, кашпо с самшитом
 [3.86,5.42].forEach(x=>{box(x-.07,x+.07,FL+1.78,FL+2.1,D,D+.12,mat.graphite);box(x-.05,x+.05,FL+1.82,FL+2.06,D+.12,D+.13,mat.lamp)});
 [[3.72,D+.45],[5.05,D+1.0]].forEach(([x,z])=>{cyl(x,z,FL-.02,FL+.55,.2,mat.planter,16,.24);const b=new T.Mesh(new T.SphereGeometry(.27,14,10),mat.shrub);b.position.set(x,FL+.8,z);b.castShadow=true;root.add(b)});
 // подсветка у входа (тёплый свет)
 const pl=new T.PointLight(0xffc98a,.6,4);pl.position.set(4.64,FL+2.2,D+.6);root.add(pl)}

/* ---------- дымоход котла: нержавеющая сэндвич-труба по западной стене котельной ---------- */
bar([0,FL+1.9,9.0],[-.35,FL+1.9,9.0],.1,mat.steel);
cyl(-.35,9.0,FL+1.75,ye+1.25,.1,mat.steel,16);cyl(-.35,9.0,ye+1.25,ye+1.35,.14,mat.steel,16);
[1.2,2.4].forEach(h=>box(-.35,-.02,FL+h,FL+h+.04,8.98,9.02,mat.steel));

/* ---------- участок ---------- */
const S=(sx,sy)=>[(sx-3702.6)/1000,(23720-sy)/1000];
const plot=[S(0,0),S(20000,-7780),S(20000,35720),S(0,35720)];
// окружающий луг
{const g=new T.PlaneGeometry(260,260);g.rotateX(-Math.PI/2);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*260,uv.getY(i)*260);
 const m=new T.Mesh(g,mat.meadow);m.position.set(6,-.02,10);m.receiveShadow=true;root.add(m)}
// газон участка
{const m=flat(plot,0,mat.grass);const uv=m.geometry.attributes.uv,p=m.geometry.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,p.getX(i),p.getZ(i))}
// улица вдоль южной границы
{const p0=new T.Vector2(...plot[0]),p1=new T.Vector2(...plot[1]);const d=p1.clone().sub(p0).normalize(),n=new T.Vector2(-d.y,d.x);if(n.y<0)n.negate();
 const P=(p,a,b)=>[p.x+d.x*a+n.x*b,p.y+d.y*a+n.y*b];
 flatUV([P(p0,-60,1.5),P(p1,60,1.5),P(p1,60,7.5),P(p0,-60,7.5)],.01,mat.asphalt);
 // въезд на парковку
 flatUV([S(14100,-4628),S(19000,-6534),[...P(p1,-1,1.6)],[...P(p1,-5.9,1.6)]].map((q,i)=>q),.012,mat.gravel);
 root.userData.street={p0,p1,d,n}}
// парковка на одну машину — как в файле участка
flatUV([S(14100,-4628),S(19000,-6534),S(19000,1366),S(14100,1366)],.015,mat.gravel);
// дорожки из плитки: от парковки к крыльцу и к террасе
// пологий спуск с площадки крыльца (0,25 м) к дорожке
{const x0=5.6,x1=7.6,z0=PZ,z1=PZ+1.2,g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([x0,.25,z0, x0,.25,z1, x1,.02,z1, x0,.25,z0, x1,.02,z1, x1,.02,z0],3));
 g.setAttribute('uv',new T.Float32BufferAttribute([x0,z0,x0,z1,x1,z1, x0,z0,x1,z1,x1,z0],2));g.computeVertexNormals();const m=new T.Mesh(g,mat.paving);m.receiveShadow=true;root.add(m)}
flatUV([[7.6,PZ],[7.6,PZ+1.2],[10.3,PZ+1.2],[10.3,PZ]],.02,mat.paving);
flatUV([[9.1,PZ],[10.3,PZ],[10.3,29.15],[9.1,28.68]],.02,mat.paving);
flatUV([[10.3,19.9],[10.8,19.9],[10.8,20.9],[10.3,20.9]],.02,mat.paving);
flatUV([[WX+.2,TZ1],[TERR_X+.4,TZ1],[TERR_X+.4,PZ],[WX+.2,PZ]],.02,mat.paving);
// отмостка вокруг дома
flatUV([[-.6,-.6],[W+.6,-.6],[W+.6,WING],[TERR_X,WING],[TERR_X,TZ1],[WX+.2,TZ1],[WX+.2,D+.6],[-.6,D+.6]],.008,mat.paving);

/* ---------- забор: евроштакетник 1,8 м, графит; калитка и распашные ворота у парковки ---------- */
const STREET_L=Math.hypot(plot[1][0]-plot[0][0],plot[1][1]-plot[0][1]);
const SP=s=>[plot[0][0]+(plot[1][0]-plot[0][0])*s/STREET_L,plot[0][1]+(plot[1][1]-plot[0][1])*s/STREET_L]; // точка на улице по расстоянию от угла
const GATE={s0:13.85,s1:14.95,s2:17.65,s3:20.35};   // калитка s0–s1, ворота s1–s3 (две створки)
{const slat=new T.BoxGeometry(.1,1.8,.02);const edges=[[plot[1],plot[2]],[plot[2],plot[3]],[plot[3],plot[0]],[plot[0],plot[1]]];
 const pos=[];
 edges.forEach(([a,b],ei)=>{const ax=a[0],az=a[1],bx=b[0],bz=b[1];const L=Math.hypot(bx-ax,bz-az),n=Math.floor(L/.14),ang=Math.atan2(bz-az,bx-ax);
  for(let i=0;i<=n;i++){const k=i/n,x=ax+(bx-ax)*k,z=az+(bz-az)*k;
   if(ei===3){const sAlong=k*L;if(sAlong>GATE.s0-.05&&sAlong<GATE.s3+.05)continue}
   pos.push([x,z,ang])}});
 const inst=new T.InstancedMesh(slat,mat.fence,pos.length);const o=new T.Object3D();
 pos.forEach(([x,z,ang],i)=>{o.position.set(x,.95,z);o.rotation.set(0,-ang,0);o.updateMatrix();inst.setMatrixAt(i,o.matrix)});inst.castShadow=true;inst.receiveShadow=true;root.add(inst);
 edges.forEach(([a,b],ei)=>{[.35,1.55].forEach(h=>{if(ei===3){const A=SP(0),Bq=SP(GATE.s0),C2=SP(GATE.s3),E=SP(STREET_L);bar([A[0],h,A[1]],[Bq[0],h,Bq[1]],.025,mat.fence);bar([C2[0],h,C2[1]],[E[0],h,E[1]],.025,mat.fence)}else bar([a[0],h,a[1]],[b[0],h,b[1]],.025,mat.fence)})});
 // столбы 100×100: калитка 1,0 м и распашные ворота 5,2 м в цвет забора
 [GATE.s0,GATE.s1,GATE.s3].forEach(s=>{const p=SP(s);box(p[0]-.05,p[0]+.05,0,2.0,p[1]-.05,p[1]+.05,mat.fence)});
 const ang=Math.atan2(plot[1][1]-plot[0][1],plot[1][0]-plot[0][0]);
 const leaf=(sa,sb)=>{const a=SP(sa+.04),b=SP(sb-.04);[.12,.95,1.82].forEach(h=>bar([a[0],h,a[1]],[b[0],h,b[1]],.03,mat.fence));
  [a,b].forEach(p=>box(p[0]-.03,p[0]+.03,.1,1.85,p[1]-.03,p[1]+.03,mat.fence));
  const L=sb-sa-.08,n=Math.floor(L/.14),g=new T.InstancedMesh(slat,mat.fence,n),o=new T.Object3D();
  for(let i=0;i<n;i++){const p=SP(sa+.04+(i+.5)*L/n);o.position.set(p[0],1.0,p[1]);o.rotation.set(0,-ang,0);o.updateMatrix();g.setMatrixAt(i,o.matrix)}g.castShadow=true;root.add(g)};
 leaf(GATE.s0,GATE.s1);leaf(GATE.s1+.1,GATE.s2);leaf(GATE.s2,GATE.s3);}

/* ---------- растения ---------- */
function pine(x,z,h){cyl(x,z,0,h*.35,.14*h/9,mat.pineTrunk,8);for(let i=0;i<4;i++){const y0=h*(.22+i*.18),r=h*(.22-i*.045);const c=new T.Mesh(new T.ConeGeometry(r,h*.32,10),mat.pine);c.position.set(x,y0+h*.16,z);c.castShadow=true;root.add(c)}}
function birch(x,z,h){cyl(x,z,0,h*.6,.11,mat.birchTrunk,8);for(let i=0;i<3;i++){const s=new T.Mesh(new T.SphereGeometry(h*(.11+rnd()*.04),10,8),mat.birch);s.position.set(x+(rnd()-.5)*1.0,h*(.62+i*.11),z+(rnd()-.5)*1.0);s.scale.y=1.35;s.castShadow=true;root.add(s)}}
function shrub(x,z,r,m=mat.shrub){const s=new T.Mesh(new T.SphereGeometry(r,10,8),m);s.position.set(x,r*.7,z);s.scale.y=.8;s.castShadow=true;s.receiveShadow=true;root.add(s)}
// сосны вдоль северной границы, берёзы по западу и востоку
[[-2.4,-10.5,11],[1,-10.8,13],[4.6,-10.2,10],[8.4,-10.9,12.5],[12,-10.4,11],[15,-10.8,13.5],[-2.6,-6.5,9.5],[15.1,-6.8,10]].forEach(a=>pine(...a));
[[-2.4,0,8],[-2.6,6,9],[-2.3,13,8.5],[15.2,-3.5,8.5],[15.3,1.2,8],[-2.5,21,7.5]].forEach(a=>birch(...a));
// кусты вдоль фасада и у террасы, клумба у крыльца
[[.3,12.55],[6.3,12.5],[7.2,12.6],[8.2,12.5],[9.0,12.6]].forEach(([x,z])=>shrub(x,z,.38));
[[-1,1],[-1,3],[-1,5],[-1,7],[-1,9.5]].forEach(([x,z])=>shrub(x,z,.45));
[[12.9,5],[12.95,6.4],[12.9,8.6]].forEach(([x,z])=>shrub(x,z,.42));
for(let i=0;i<14;i++)shrub(-.45+rnd()*.95,13.5+rnd()*1.2,.14,rnd()>.5?mat.flower:mat.flower2);
// живая изгородь вдоль улицы до парковки
for(let x=-3;x<8.3;x+=.7){const p0=plot[0],p1=plot[1];const k=(x-p0[0])/(p1[0]-p0[0]);shrub(x,p0[1]+(p1[1]-p0[1])*k-1.2,.55,mat.hedge)}
// лес за участком
for(let i=0;i<70;i++){const a=rnd()*Math.PI*2,r=48+rnd()*35;const x=6+Math.cos(a)*r,z=10+Math.sin(a)*r;if(z>34&&z<60&&Math.abs(Math.sin(a))>.3)continue;rnd()>.35?pine(x,z,10+rnd()*8):birch(x,z,8+rnd()*4)}

/* ---------- навес для машины и хозблок 4375×3125 под единой односкатной кровлей RAL 7024 ---------- */
{const X0=10.55,X1=15.45,Z0=18.65,Z1=28.2,yW=3.0,yE=2.6, ry=x=>yW+(x-X0)*(yE-yW)/(X1-X0);
 const SX0=10.8,SX1=15.175,SZ0=18.9,SZ1=22.025;
 // хозблок: штукатурка, каменный цоколь и углы, графитовая дверь к дорожке
 const prof=new T.Shape([new T.Vector2(SX0,0),new T.Vector2(SX1,0),new T.Vector2(SX1,ry(SX1)-.2),new T.Vector2(SX0,ry(SX0)-.2)]);
 const eg=new T.ExtrudeGeometry(prof,{depth:SZ1-SZ0,bevelEnabled:false});eg.translate(0,0,SZ0);
 const uv=eg.attributes.uv,ps=eg.attributes.position;for(let i=0;i<uv.count;i++){const n=Math.abs(eg.attributes.normal.getX(i))>.5;uv.setXY(i,n?ps.getZ(i):ps.getX(i),ps.getY(i))}
 const shed=new T.Mesh(eg,mat.plaster);shed.castShadow=shed.receiveShadow=true;root.add(shed);
 box(SX0-.03,SX1+.03,0,.3,SZ0-.03,SZ1+.03,mat.stoneDark);
 // каменные углы хозблока, как у дома
 [[SX0,SZ0,1,1],[SX1,SZ0,-1,1],[SX0,SZ1,1,-1],[SX1,SZ1,-1,-1]].forEach(([x,z,sx,sz])=>{const yt=ry(x)-.22;
  box(Math.min(x,x+sx*.5),Math.max(x,x+sx*.5),.3,yt,Math.min(z,z-sz*.035),Math.max(z,z-sz*.035),mat.stone);
  box(Math.min(x,x-sx*.035),Math.max(x,x-sx*.035),.3,yt,Math.min(z,z+sz*.5),Math.max(z,z+sz*.5),mat.stone)});
 box(SX0-.04,SX0,0,2.1,19.9,20.9,mat.door);box(SX0-.06,SX0-.04,.95,1.1,20.7,20.74,mat.steel);
 box(SX0-.03,SX0,2.1,ry(SX0)-.2,19.9,20.9,mat.graphite);                      // графит над дверью до кровли
 // стойки 100×100 и продольные балки
 [[SX0+.08,25.0],[SX0+.08,27.9],[SX1-.08,25.0],[SX1-.08,27.9]].forEach(([x,z])=>{box(x-.08,x+.08,0,ry(x)-.26,z-.08,z+.08,mat.glulam);box(x-.1,x+.1,0,.08,z-.1,z+.1,mat.graphite)});
 [SX0+.08,SX1-.08].forEach(x=>box(x-.08,x+.08,ry(x)-.26,ry(x)-.04,SZ1,Z1-.1,mat.glulam));
 for(let z=SZ1+.6;z<Z1;z+=.9)beam([SX0,ry(SX0)-.06,z],[SX1,ry(SX1)-.06,z],.06,.1,mat.glulam);
 // кровля
 const g=new T.BufferGeometry();const v=[X0,yW,Z0, X0,yW,Z1, X1,yE,Z1, X0,yW,Z0, X1,yE,Z1, X1,yE,Z0];
 g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute([Z0,0,Z1,0,Z1,X1-X0, Z0,0,Z1,X1-X0,Z0,X1-X0],2));g.computeVertexNormals();
 const roofM=new T.Mesh(g,mat.roof);roofM.castShadow=roofM.receiveShadow=true;root.add(roofM);
 beam([X0,yW-.08,Z0],[X0,yW-.08,Z1],.04,.18,mat.roofTrim);beam([X1,yE-.08,Z0],[X1,yE-.08,Z1],.04,.18,mat.roofTrim);
 beam([X0,yW-.08,Z0],[X1,yE-.08,Z0],.04,.18,mat.roofTrim);beam([X0,yW-.08,Z1],[X1,yE-.08,Z1],.04,.18,mat.roofTrim);
 bar([X1+.08,yE-.14,Z0],[X1+.08,yE-.14,Z1],.06,mat.roofTrim);cyl(X1+.08,Z0+.1,.1,yE-.14,.04,mat.roofTrim,10)}

/* ---------- машина под навесом ---------- */
{const g=new T.Group();const cx=12.95,cz=25.0;const ang=Math.atan2(-(plot[1][1]-plot[0][1]),plot[1][0]-plot[0][0]);
 const add=(geo,m,x,y,z)=>{const mm=new T.Mesh(geo,m);mm.position.set(x,y,z);mm.castShadow=true;g.add(mm);return mm};
 add(new T.BoxGeometry(1.85,.62,4.6),mat.car,0,.62,0);add(new T.BoxGeometry(1.62,.5,2.5),mat.glass,0,1.16,.15);add(new T.BoxGeometry(1.6,.06,2.3),mat.car,0,1.43,.2);
 [[-.82,1.45],[.82,1.45],[-.82,-1.45],[.82,-1.45]].forEach(([x,z])=>{const w=add(new T.CylinderGeometry(.34,.34,.24,16),mat.tyre,x,.34,z);w.rotation.z=Math.PI/2});
 g.position.set(cx,0,cz);g.rotation.y=ang*.0;root.add(g)}

/* ---------- компас ---------- */
{const g=new T.Group();const arrow=new T.Mesh(new T.ConeGeometry(.35,1.2,3),mat.graphite);arrow.rotation.x=-Math.PI/2;arrow.position.z=-.6;g.add(arrow);g.position.set(-1.6,.05,-8);root.add(g)}

/* ---------- ракурсы ---------- */
const VIEWS={
 hero:{p:[25,10,19],t:[6,1.6,6.5]},
 front:{p:[3.2,2.2,24],t:[5.2,2.4,7]},
 terrace:{p:[7.9,2.3,19.2],t:[10.9,1.7,7.6]},
 gate:{p:[5.5,2.3,37],t:[12.6,1.5,24.5]},
 plot:{p:[6.3,64,17],t:[6.3,0,9.7]}
};
let tween=null;
function go(name,instant){const v=VIEWS[name];const from={p:camera.position.clone(),t:controls.target.clone()},to={p:new T.Vector3(...v.p),t:new T.Vector3(...v.t)};
 if(instant){camera.position.copy(to.p);controls.target.copy(to.t);controls.update();return}
 tween={from,to,t0:performance.now(),dur:1100};wake()}
ui.querySelectorAll('.views button').forEach(b=>b.addEventListener('click',()=>{ui.querySelectorAll('.views button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));go(b.dataset.v)}));

/* ---------- рендер по требованию ---------- */
let running=false;
function resize(){const w=view.clientWidth,h=view.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=camera.aspect<1?56:38;camera.updateProjectionMatrix();wake()}
function frame(now){
 if(tween){const k=Math.min(1,(now-tween.t0)/tween.dur),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
  camera.position.lerpVectors(tween.from.p,tween.to.p,e);controls.target.lerpVectors(tween.from.t,tween.to.t,e);if(k>=1)tween=null}
 const moving=controls.update();renderer.render(scene,camera);
 if(tween||moving||idle<20){idle=(tween||moving)?0:idle+1;requestAnimationFrame(frame)}else running=false}
let idle=0;function wake(){idle=0;if(!running){running=true;requestAnimationFrame(frame)}}
controls.addEventListener('change',wake);
new ResizeObserver(resize).observe(view);
go('hero',true);resize();
{const l=view.querySelector('.loading');if(l)l.remove()}
return {go,resize,wake,renderer,scene,camera};

};
