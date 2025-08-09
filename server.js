// Extended WebSocket backend with: progress, chat, spectators, password, global ghost, daily, season, leagues.
// Run: npm install express ws && node server.js
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const fs = require('fs');
const PERSIST_PATH = './server_state.json';

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.static(__dirname));
app.get('/health', (_,res)=> res.json({ok:true}));
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Stores
const lobbies = new Map(); // code -> lobby
const clients = new Map(); // ws -> {id,name,lobby}
let globalGhost = null; // {text,wpm,secs}
const season = { points: new Map(), leaderboard(){ return [...this.points.entries()].map(([id,pts])=>({id,pts})).sort((a,b)=> b.pts-a.pts).slice(0,100); } };

// Basit persist (sunucu restartında hafızayı geri yüklemek için)
function loadState(){
  try{ const raw=fs.readFileSync(PERSIST_PATH,'utf8'); const json=JSON.parse(raw);
    if(json.season){ for(const [id,pts] of Object.entries(json.season)) season.points.set(id,pts); }
    if(json.globalGhost) globalGhost=json.globalGhost;
  }catch{}
}
function saveState(){
  try{ const out={ season:Object.fromEntries(season.points), globalGhost }; fs.writeFileSync(PERSIST_PATH, JSON.stringify(out,null,2)); }catch{}
}
loadState();

const PARAS = [
  'Hızlı kahverengi tilki tembel köpeğin üzerinden atladı.',
  'Typing speed race multiplayer deneme paragrafı.',
  'Code example: function sum(a,b){ return a+b; }'
];
function dailyParagraph(){ const day=new Date().toISOString().slice(0,10); const h=crypto.createHash('md5').update(day).digest('hex'); const idx=parseInt(h.slice(0,8),16)%PARAS.length; return PARAS[idx]; }
function genCode(){ return 'TSR-'+crypto.randomBytes(3).toString('hex').toUpperCase().slice(0,4); }
function league(points){ if(points>=2000) return 'gold'; if(points>=800) return 'silver'; if(points>=200) return 'bronze'; return 'rookie'; }
function broadcastLobby(code,msg){ const l=lobbies.get(code); if(!l) return; for(const m of l.members.values()){ if(m.ws && m.ws.readyState===1) m.ws.send(JSON.stringify(msg)); } for(const sid of l.spectators){ const s=[...clients.entries()].find(([w,c])=> c.id===sid); if(s && s[0].readyState===1) s[0].send(JSON.stringify(msg)); } }
function lobbyState(l){ return { code:l.code, host:l.host, name:l.name, duration:l.duration, lastPara:l.lastPara, members:[...l.members.values()].map(m=>({id:m.id,name:m.name,status:m.status,role:m.role,league:m.league, wpm:m.wpm||0, progress:m.progress||0})), createdAt:l.createdAt, chat:l.chat.slice(-30), scores:l.scores.slice(-20) }; }
function ensureGhost(run){ if(!globalGhost || (run && run.wpm>globalGhost.wpm)){ globalGhost = run; } }

wss.on('connection', (ws)=>{
  clients.set(ws,{id:null,name:null,lobby:null});
  ws.on('message', data=>{ let msg; try{ msg=JSON.parse(data);}catch{return;} const client=clients.get(ws); if(!client) return;
    switch(msg.type){
      case 'AUTH':{ client.id= msg.id || crypto.randomUUID(); client.name=(msg.name||'User').slice(0,32); ws.send(JSON.stringify({type:'AUTH_OK', id:client.id, name:client.name})); break; }
      case 'CREATE_LOBBY':{ const code=genCode(); const para= msg.text||PARAS[Math.floor(Math.random()*PARAS.length)]; const lob={ code, host:client.id, name:(msg.name||'Lobi'), passwordHash: msg.password? crypto.createHash('sha256').update(String(msg.password)).digest('hex'): null, duration: msg.duration||30, lastPara: para, members:new Map(), spectators:new Set(), chat:[], scores:[], createdAt:Date.now() }; lob.members.set(client.id,{id:client.id,name:client.name,status:'hazır',role:'player',league:league(season.points.get(client.id)||0), ws}); lobbies.set(code,lob); client.lobby=code; ws.send(JSON.stringify({type:'LOBBY_CREATED', lobby:lobbyState(lob), role:'player'})); break; }
      case 'JOIN_LOBBY':{ const code=(msg.code||'').toUpperCase(); const lob=lobbies.get(code); if(!lob){ ws.send(JSON.stringify({type:'ERROR', error:'LOBBY_NOT_FOUND'})); break; } if(lob.passwordHash){ const h=crypto.createHash('sha256').update(String(msg.password||'')).digest('hex'); if(h!==lob.passwordHash){ ws.send(JSON.stringify({type:'ERROR', error:'BAD_PASSWORD'})); break; } } let role='player'; if(lob.members.size>=10){ role='spectator'; lob.spectators.add(client.id); } else { lob.members.set(client.id,{id:client.id,name:client.name,status:'hazır',role:'player',league:league(season.points.get(client.id)||0), ws}); } client.lobby=code; broadcastLobby(code,{type:'LOBBY_STATE', lobby:lobbyState(lob)}); ws.send(JSON.stringify({type:'JOINED', lobby:lobbyState(lob), role})); break; }
      case 'LEAVE_LOBBY':{ const code=client.lobby; const lob=lobbies.get(code); if(lob){ lob.members.delete(client.id); lob.spectators.delete(client.id); broadcastLobby(code,{type:'LOBBY_STATE', lobby:lobbyState(lob)}); if(!lob.members.size) lobbies.delete(code); } client.lobby=null; break; }
      case 'SET_PARA':{ const lob=lobbies.get(client.lobby); if(!lob||lob.host!==client.id) break; lob.lastPara= msg.text||lob.lastPara; lob.duration= msg.duration||lob.duration; broadcastLobby(lob.code,{type:'SYNC', text:lob.lastPara, duration:lob.duration}); break; }
      case 'START':{ const lob=lobbies.get(client.lobby); if(!lob||lob.host!==client.id) break; const ts=Date.now()+400; broadcastLobby(lob.code,{type:'START', text:lob.lastPara, duration:lob.duration, ts, cfg: msg.cfg||null}); break; }
      case 'PROGRESS':{ const lob=lobbies.get(client.lobby); if(!lob) break; const m=lob.members.get(client.id); if(!m) break; m.progress=msg.progress; m.wpm=msg.wpm; broadcastLobby(lob.code,{type:'PROGRESS', id:client.id, progress:msg.progress, wpm:msg.wpm}); if(msg.wpm>300){ ws.send(JSON.stringify({type:'WARNING', code:'WPM_HIGH', msg:'Aşırı yüksek WPM algılandı.'})); } break; }
      case 'CHAT':{ const lob=lobbies.get(client.lobby); if(!lob) break; const text=(msg.text||'').trim().slice(0,160); if(!text) break; const entry={id:client.id,name:client.name,text,at:Date.now()}; lob.chat.push(entry); broadcastLobby(lob.code,{type:'CHAT', ...entry}); break; }
      case 'SCORE':{ const lob=lobbies.get(client.lobby); if(!lob) break; const rec={id:client.id,name:client.name,wpm:msg.wpm||0,acc:msg.acc||0,at:Date.now()}; lob.scores.push(rec); lob.scores=lob.scores.slice(-100); ensureGhost({text:lob.lastPara,wpm:rec.wpm,secs:lob.duration}); const cur=season.points.get(client.id)||0; season.points.set(client.id, cur + Math.max(0,rec.wpm)); broadcastLobby(lob.code,{type:'SCOREBOARD', scores: lob.scores.slice(-20)}); ws.send(JSON.stringify({type:'SEASON', you:{points:season.points.get(client.id), league:league(season.points.get(client.id))}, leaderboard:season.leaderboard()})); break; }
      case 'REQ_GHOST':{ if(globalGhost){ ws.send(JSON.stringify({type:'GHOST', ghost:globalGhost})); } break; }
      case 'REQ_DAILY':{ ws.send(JSON.stringify({type:'DAILY', text: dailyParagraph()})); break; }
      case 'REQ_SEASON':{ ws.send(JSON.stringify({type:'SEASON', you:{points:season.points.get(client.id)||0, league:league(season.points.get(client.id)||0)}, leaderboard:season.leaderboard()})); break; }
      case 'STATUS':{ const lob=lobbies.get(client.lobby); if(!lob) break; const m=lob.members.get(client.id); if(m){ m.status=msg.status||m.status; broadcastLobby(lob.code,{type:'LOBBY_STATE', lobby:lobbyState(lob)}); } break; }
      case 'PING':{ // latency ölçümü
        try{ ws.send(JSON.stringify({type:'PONG', t: msg.t || Date.now()})); }catch{}
        break; }
      case 'LIST_LOBBIES':{
        const list=[...lobbies.values()].map(l=>({code:l.code, host:l.host, hostName:l.members.get(l.host)?.name||'—', count:l.members.size, max:10, duration:l.duration, state:'waiting'}));
        ws.send(JSON.stringify({type:'LOBBIES', lobbies:list}));
        break; }
      default: ws.send(JSON.stringify({type:'ERROR', error:'UNKNOWN_TYPE'}));
    }
  });
  ws.on('close', ()=>{ const c=clients.get(ws); if(!c){ return; } if(c.lobby){ const lob=lobbies.get(c.lobby); if(lob){ lob.members.delete(c.id); lob.spectators.delete(c.id); broadcastLobby(c.lobby,{type:'LOBBY_STATE', lobby:lobbyState(lob)}); if(!lob.members.size) lobbies.delete(c.lobby); } } clients.delete(ws); });
  setImmediate(saveState);
});

server.listen(PORT, ()=> console.log('Server listening on http://localhost:'+PORT));
process.on('SIGINT',()=>{ saveState(); process.exit(0); });
process.on('SIGTERM',()=>{ saveState(); process.exit(0); });
