import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
import fs from 'fs';
const P = {
  classic: { bg:'#FFF9EE', ink:'#1F2A1C', muted:'#6B7466', primary:'#2F7A22', band:'linear-gradient(135deg,#63C14A,#43A62F 48%,#2F7A22)', bandInk:'#fff', line:'#E7E0CF', card:'#FFFFFF' },
  notebook:{ bg:'#FFF9EE', ink:'#3A2A1C', muted:'#8A7560', primary:'#D9620F', band:'linear-gradient(135deg,#F5A05A,#E7792A 50%,#D9620F)', bandInk:'#fff', line:'#E8D9BE', card:'#FFFDF6', ruled:true },
  sport:   { bg:'#111411', ink:'#F2F5EC', muted:'#9AA495', primary:'#C6F432', band:'linear-gradient(135deg,#DDFF5C,#C6F432 50%,#A6D11A)', bandInk:'#111411', line:'#2B322B', card:'#1B201B', upper:true },
  waves:   { bg:'#EEF4FB', ink:'#0F2C4A', muted:'#5C7690', primary:'#174F8C', band:'linear-gradient(135deg,#4FA3E0,#2A78C2 45%,#174F8C)', bandInk:'#fff', line:'#D3E1F0', card:'#FFFFFF', waves:true },
};
const items = [
  { file:'Inicio-General', theme:'classic', tag:'SANO REWARDS', eyebrow:'¿Ya tienes tu tarjeta?', title:'Escanea y entra a', hl:'tu tarjeta', perks:['Entra con Google o con tu correo','Mira tus visitas y tus premios','Dicta tu código al pagar'], label:'Entrar a mi tarjeta' },
  { file:'Registro-Cliente-Consentido', theme:'classic', tag:'CLIENTE CONSENTIDO', eyebrow:'Programa Cliente Consentido', title:'Regístrate y conviértete en', hl:'Cliente Consentido', perks:['1 visita por día que nos visites','En tu visita 8 te consentimos con un premio','Tu tarjeta se reinicia cada mes'], label:'Registro · Cliente Consentido' },
  { file:'Registro-Estudiantes', theme:'notebook', tag:'ESTUDIANTES', eyebrow:'Tarjeta para estudiantes', title:'Estudia con buen café y', hl:'gana premios', perks:['Tu tarea: venir 8 veces al mes','1 visita por día, cualquier día','Muestra tu código al pagar y listo'], label:'Registro · Estudiantes' },
  { file:'Registro-GYM', theme:'sport', tag:'GYM', eyebrow:'Tarjeta GYM', title:'Después del entreno,', hl:'recarga y gana', perks:['Suma 1 visita por día','8 visitas = premio para tu recuperación','Tu tarjeta se reinicia cada mes'], label:'Registro · GYM' },
  { file:'Registro-OZON', theme:'waves', tag:'OZON', eyebrow:'Beneficio para colaboradores', title:'Un beneficio exclusivo para', hl:'el equipo OZON', perks:['1 visita por día en tu descanso','En tu visita 8 te consentimos con un premio','Tu tarjeta se reinicia cada mes'], label:'Registro · OZON' },
];
const leaf = (c) => `<svg width="64" height="64" viewBox="0 0 24 24"><path fill="${c}" d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15 2-4 5-7 9-10-5 2-8 5-10 9z"/></svg>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
for (const it of items) {
  const t = P[it.theme];
  let svg = fs.readFileSync(`${it.file}.svg`, 'utf8').replace(/<\?xml[^>]*>/, '').replace(/width="[^"]*" height="[^"]*"/, 'width="100%" height="100%" shape-rendering="crispEdges"');
  const upper = t.upper ? 'text-transform:uppercase;letter-spacing:.01em;' : '';
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  body{width:1920px;height:1080px;background:${t.bg};color:${t.ink};font-family:Inter,'DejaVu Sans',sans-serif;position:relative;overflow:hidden}
  ${t.ruled?`body{background-image:repeating-linear-gradient(${t.bg} 0 46px,#F0DCC0 46px 48px)}`:''}
  ${t.waves?`body:before{content:'';position:absolute;left:-10%;right:-10%;bottom:-120px;height:420px;background:radial-gradient(120% 60% at 50% 100%,#4FA3E033,transparent 70%)}`:''}
  .band{position:absolute;top:0;right:0;width:840px;height:100%;background:${t.band}}
  .left{position:absolute;left:120px;top:96px;width:860px}
  .logo{display:flex;align-items:center;gap:18px}
  .logo b{font-family:'DejaVu Serif',Georgia,serif;font-size:58px;line-height:.86;font-weight:800;letter-spacing:-.02em}
  .logo small{display:block;font-size:20px;letter-spacing:.5em;margin-top:10px;font-weight:600;color:${t.muted}}
  .tag{display:inline-block;margin-top:56px;background:${t.primary};color:${t.theme==='sport'?'#111411':'#fff'};font-weight:800;font-size:24px;letter-spacing:.16em;padding:10px 22px;border-radius:999px}
  .eyebrow{margin-top:30px;font-size:28px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${t.primary}}
  h1{margin-top:18px;font-size:92px;line-height:1.02;font-weight:800;letter-spacing:-.02em;${upper}}
  h1 em{font-style:normal;color:${t.primary}}
  ul{list-style:none;padding:0;margin-top:44px;display:grid;gap:18px}
  li{font-size:32px;color:${t.ink};display:flex;gap:18px;align-items:center}
  li:before{content:'';width:18px;height:18px;border-radius:50%;background:${t.primary};flex:none}
  .foot{position:absolute;left:120px;bottom:70px;font-size:26px;color:${t.muted};font-weight:600}
  .qrbox{position:absolute;right:150px;top:50%;transform:translateY(-50%);width:540px;background:#fff;border-radius:40px;padding:44px 44px 34px;box-shadow:0 40px 80px -30px rgba(0,0,0,.45);text-align:center;color:#151515}
  .qr{width:452px;height:452px}
  .scan{margin-top:26px;font-size:34px;font-weight:800}
  .lbl{margin-top:8px;font-size:22px;color:#555;font-weight:600}
  </style></head><body>
  <div class="band"></div>
  <div class="left">
    <div class="logo">${leaf(t.primary)}<div><b>sano<br>bistro</b><small>CAFÉ</small></div></div>
    <span class="tag">${it.tag}</span>
    <p class="eyebrow">${it.eyebrow}</p>
    <h1>${it.title} <em>${it.hl}</em></h1>
    <ul>${it.perks.map(p=>`<li>${p}</li>`).join('')}</ul>
  </div>
  <p class="foot">Sano Bistro Café · @sanobistro · 999 530 5545</p>
  <div class="qrbox"><div class="qr">${svg}</div><p class="scan">Escanea con tu cámara</p><p class="lbl">${it.label}</p></div>
  </body></html>`;
  await page.setContent(html); await page.waitForTimeout(150);
  await page.screenshot({ path: `out/QR_${it.file}.png` });
  console.log('png', it.file);
}
await browser.close();
