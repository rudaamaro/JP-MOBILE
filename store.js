<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no" />
<meta name="mobile-web-app-capable" content="yes" />
<link rel="manifest" href="manifest.json"><!-- opcional; falha segura se ausente -->
<title>Flashcards (Romaji ↔ PT)</title>
<script type="module" src="./firebase-config.js"></script>
<script type="module" src="./auth.js"></script>
<script type="module" src="./store.js"></script>
<style>
  :root{
    color-scheme: dark;
    --bg:#0b0f14; --card:#111827; --muted:#9fb3c8; --text:#e7eef7;
    --accent:#43b6ff; --accent2:#7cffad; --danger:#ff6b6b; --warn:#ffd166; --stroke:#223047;
    --radius:16px; --maxw:860px;
    --duo:#2bd463;
    --pill:#0f1422;
  }
  *{box-sizing:border-box}
  html,body{
    height:100%;
    margin:0;
    background:var(--bg);
    font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;
    overflow:hidden;
  }
  .app{
    height:100svh;
    display:flex; flex-direction:column; align-items:center; gap:12px;
    padding:env(safe-area-inset-top) 12px calc(12px + env(safe-area-inset-bottom)) 12px;
    overflow:auto; overscroll-behavior:contain;
  }
  header,.card,.tabs,.section{width:100%; max-width:var(--maxw)}
  header{display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 4px}
  .brand{font-weight:800; color:var(--text); font-size:18px}
  .account{display:flex; align-items:center; gap:8px; color:var(--muted); font-weight:700}

  .tabs{display:grid; grid-template-columns:repeat(5,1fr); gap:8px}
  .tab{padding:10px 12px; text-align:center; background:var(--pill); color:var(--text);
    border-radius:999px; border:1px solid rgba(255,255,255,.06); font-weight:700}
  .tab.active{background:var(--duo); color:#05121d; border-color:transparent}

  .card{background:var(--card); border:1px solid rgba(255,255,255,.08); border-radius:var(--radius);
    padding:18px; display:flex; flex-direction:column; gap:16px; box-shadow:0 10px 30px rgba(0,0,0,.25)}
  .row{display:flex; gap:8px; flex-wrap:wrap; align-items:center; justify-content:space-between}

  .seg{display:inline-flex; padding:4px; gap:4px; border-radius:999px; background:var(--pill); border:1px solid rgba(255,255,255,.06)}
  .seg input{display:none}
  .seg label{padding:10px 14px; border-radius:999px; font-weight:800; color:var(--text); cursor:pointer}
  .seg input:checked + label{background:var(--accent); color:#05121d}

  .prompt{text-align:center; color:var(--muted); font-weight:700; letter-spacing:.3px}
  .question{text-align:center; color:var(--text); font-weight:900; font-size:clamp(20px,6.5vw,40px); word-break:break-word}
  .qRow{display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap}

  .audioBtn{height:38px; min-width:58px; padding:0 12px; border-radius:999px; background:var(--pill); color:var(--text);
    border:1px solid rgba(255,255,255,.08); font-weight:800; display:inline-flex; align-items:center; justify-content:center; gap:6px; cursor:pointer}

  .inputRow{display:flex; gap:8px; flex-wrap:wrap; align-items:center; justify-content:center}
  input.answer{flex:1 1 320px; max-width:560px; height:52px; background:#0f1422; border:2px solid var(--stroke);
    border-radius:14px; padding:0 14px; color:#e7eef7; font-size:18px; font-weight:700; outline:none}
  input.answer:focus{border-color:var(--accent)}
  input.answer.correct{border-color:var(--accent2); box-shadow:0 0 0 3px rgba(124,255,173,.15)}
  input.answer.wrong{border-color:var(--danger); box-shadow:0 0 0 3px rgba(255,107,107,.15)}
  select.select{height:44px; padding:0 12px; border-radius:12px; background:var(--pill); color:#e7eef7; border:2px solid var(--stroke); font-weight:700}

  .btn{height:52px; padding:0 16px; border-radius:14px; font-weight:800; border:1px solid rgba(255,255,255,.08); background:var(--duo); color:#05121d; cursor:pointer}
  .btn.secondary{background:#1f2937; color:#e7eef7}
  .btn.small{height:32px; padding:0 12px;}
  .btn:disabled{opacity:.5; cursor:not-allowed}
  .btn:focus, .choice:focus, .audioBtn:focus {outline:3px solid rgba(67,182,255,.6); outline-offset:2px}

  .center{display:flex; justify-content:center; gap:10px; flex-wrap:wrap}
  .helper{color:var(--muted); text-align:center; font-size:13px}
  .okText{color:var(--accent2); font-weight:800}
  .section{display:none}
  .section.active{display:block}

  .flash{padding:8px 12px; border-radius:10px; font-weight:800; text-align:center}
  .flash.ok{background:#063; color:#c6ffde}
  .flash.err{background:#4a1212; color:#ffc6c6}

  .tableWrap{max-width:100%; overflow:auto; border-radius:12px; overscroll-behavior:contain}
  table.list{width:100%; border-collapse:separate; border-spacing:0 6px; table-layout:fixed}
  table.list th,table.list td{padding:10px 12px; text-align:left; font-size:14px; word-break:break-word; white-space:normal}
  table.list th{color:var(--muted); font-weight:800}
  table.list tr{background:#0f1422; border:1px solid rgba(255,255,255,.08)}
  table.list tr td:first-child{border-radius:12px 0 0 12px}
  table.list tr td:last-child{border-radius:0 12px 12px 0}
  .col-idx{width:48px; min-width:48px}
  .col-romaji{width:28%}
  .col-kana{width:22%}
  .col-pt{width:32%; overflow-wrap:anywhere}
  .col-cat{width:12%}
  .col-ok,.col-err{width:48px; text-align:right}

  .choices{display:grid; grid-template-columns:repeat(2,minmax(160px,1fr)); gap:10px}
  .choice{padding:12px; border-radius:14px; border:2px solid var(--stroke); background:#0f1422; color:#e7eef7; font-weight:800; cursor:pointer}
  .choice:hover{border-color:var(--accent)}
  .choice.correct{border-color:var(--accent2)}
  .choice.wrong{border-color:var(--danger)}

  .kudos{position:fixed; right:10px; bottom:10px; color:#5b708a; font-weight:800; font-size:12px}
  .msg{position:fixed; left:50%; bottom:18px; transform:translateX(-50%); background:#0f1422; color:#e7eef7; padding:10px 14px; border:1px solid rgba(255,255,255,.12); border-radius:12px; font-weight:800}

  @media (max-width:600px){
    .brand{font-size:16px}
    .tab{padding:8px 10px}
    .card{padding:14px}
    table.list th,table.list td{font-size:12px; padding:8px 10px}
    .col-idx,.col-kana{display:none}
    .col-romaji{width:36%}
    .col-pt{width:42%}
    .col-cat{width:14%}
    .col-ok,.col-err{width:40px}
    .choices{grid-template-columns:1fr}
  }
  textarea.bulk{min-height:140px; width:100%; background:#0f1422; color:#e7eef7; border:2px solid var(--stroke); border-radius:14px; padding:10px; font-weight:700}
</style>
</head>
<body>
<div class="app" id="app">
  <header>
    <div class="brand">Flashcards — Romaji ↔ PT</div>
    <div class="account">
      <div class="helper" id="streak">Streak: 0</div>
      <span id="userEmail"></span>
      <button id="btnSignOut" class="btn secondary small">Sair</button>
    </div>
  </header>

  <div class="tabs">
    <button class="tab active" data-tab="study">Estudar</button>
    <button class="tab" data-tab="quiz">Quiz</button>
    <button class="tab" data-tab="reinforce">Reforço</button>
    <button class="tab" data-tab="add">+</button>
    <button class="tab" data-tab="list">Lista</button>
  </div>

  <section class="section active" id="study">
    <div class="card">
      <div class="row">
        <div class="seg" aria-label="Direção">
          <input id="d1" type="radio" name="dir" value="PT2ROMAJI" checked><label for="d1">PT → Romaji</label>
          <input id="d2" type="radio" name="dir" value="ROMAJI2PT"><label for="d2">Romaji → PT</label>
          <input id="d3" type="radio" name="dir" value="HIRA2PT"><label for="d3">Hiragana → PT</label>
        </div>
        <div class="row" style="gap:6px">
          <label class="helper" for="catFilter">Categoria:&nbsp;</label>
          <select id="catFilter" class="select"><option value="todas">todas</option></select>
        </div>
      </div>

      <div class="prompt" id="promptLbl">Tradução (PT-BR)</div>
      <div class="qRow">
        <button title="Ouvir Japonês" class="audioBtn" id="speakJP">JP</button>
        <div class="question" id="qMain">—</div>
        <button title="Ouvir Português" class="audioBtn" id="speakPT">PT</button>
      </div>
      <div class="center helper" id="helperLbl">Digite o <b>romaji</b> e pressione Verificar</div>

      <div class="inputRow">
        <input id="answer" class="answer" placeholder="ex.: konnichiwa"
          autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false"
          inputmode="latin" enterkeyhint="done">
        <button class="btn" id="btnCheck" disabled>Verificar</button>
        <button class="btn secondary" id="btnSkip">Pular</button>
      </div>

      <div class="center helper" id="accepted" style="display:none" aria-live="polite"></div>
    </div>
  </section>

  <section class="section" id="quiz">
    <div class="card">
      <div class="row">
        <div class="seg" aria-label="Direção quiz">
          <input id="q1" type="radio" name="qdir" value="PT2ROMAJI" checked><label for="q1">PT → Romaji</label>
          <input id="q2" type="radio" name="qdir" value="ROMAJI2PT"><label for="q2">Romaji → PT</label>
          <input id="q3" type="radio" name="qdir" value="HIRA2PT"><label for="q3">Hiragana → PT</label>
        </div>
        <div class="row" style="gap:6px">
          <label class="helper" for="qCat">Categoria:&nbsp;</label>
          <select id="qCat" class="select"><option value="todas">todas</option></select>
        </div>
      </div>

      <div class="prompt" id="qPrompt">Pergunta</div>
      <div class="qRow">
        <button title="Ouvir Japonês" class="audioBtn" id="qSpeakJP">JP</button>
        <div class="question" id="qQuestion">—</div>
        <button title="Ouvir Português" class="audioBtn" id="qSpeakPT">PT</button>
      </div>

      <div class="choices" id="choices"></div>
      <div class="quizActions">
        <button class="btn secondary" id="qNext">Próximo</button>
      </div>
      <div class="center helper" id="qFeedback" style="display:none" aria-live="polite"></div>
    </div>
  </section>

 <!-- REFORÇO 2.0 -->
<section class="section" id="reinforce">
  <div class="card">
    <div class="row">
      <div class="seg" aria-label="Direção reforço">
        <input id="r1" type="radio" name="rdir" value="PT2ROMAJI" checked><label for="r1">PT → Romaji</label>
        <input id="r2" type="radio" name="rdir" value="ROMAJI2PT"><label for="r2">Romaji → PT</label>
        <input id="r3" type="radio" name="rdir" value="HIRA2PT"><label for="r3">Hiragana → PT</label>
      </div>

      <div class="row" style="gap:6px">
        <label class="helper" for="rPool">Foco:&nbsp;</label>
        <select id="rPool" class="select">
          <option value="rf">Só Reforço</option>
          <option value="due">Vencidos</option>
          <option value="trouble">Com dificuldade</option>
          <option value="mix" selected>Mix</option>
        </select>

        <label class="helper" for="rCat">Cat:&nbsp;</label>
        <select id="rCat" class="select"><option value="todas">todas</option></select>

        <label class="helper" for="rLen">Sessão:&nbsp;</label>
        <select id="rLen" class="select">
          <option>10</option><option selected>20</option><option>40</option><option value="all">todas</option>
        </select>

        <label class="helper"><input type="checkbox" id="rAutoSpeak" style="vertical-align:middle"> auto-voz</label>
        <label class="helper"><input type="checkbox" id="rHints" style="vertical-align:middle"> dicas</label>
      </div>
    </div>

    <div class="prompt" id="rPrompt">Reforço</div>
    <div class="qRow">
      <button title="Ouvir Japonês" class="audioBtn" id="rSpeakJP">JP</button>
      <div class="question" id="rQuestion">—</div>
      <button title="Ouvir Português" class="audioBtn" id="rSpeakPT">PT</button>
    </div>

    <div class="center helper" id="rHint" style="display:none"></div>

    <div class="inputRow">
      <input id="rAnswer" class="answer" placeholder="sua resposta…" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" inputmode="latin" enterkeyhint="done">
      <button class="btn" id="rCheck" disabled>Verificar</button>
      <button class="btn secondary" id="rReveal">Mostrar</button>
      <button class="btn secondary" id="rSkip">Pular</button>
      <button class="btn" id="rLearned" title="Remover do reforço">Aprendido</button>
    </div>

    <div class="center" style="gap:6px">
      <button class="btn secondary small" id="rAgain" title="Errado / repetir já">Again</button>
      <button class="btn secondary small" id="rHard"  title="Aumenta pouco o intervalo">Hard</button>
      <button class="btn secondary small" id="rGood"  title="Intervalo normal">Good</button>
      <button class="btn secondary small" id="rEasy"  title="Pula para frente">Easy</button>
    </div>

    <div class="center helper">
      <span id="rfInfo">—</span> · <span id="rProg">0/0</span>
    </div>

    <div class="center helper" id="rAccepted" style="display:none" aria-live="polite"></div>
  </div>
</section>

  <section class="section" id="add">
    <div class="card">
      <div class="prompt">Adicionar novo card</div>
      <div class="inputRow">
        <input id="inRomaji" class="answer" placeholder="romaji (ex.: arigatou)" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false">
        <input id="inPT"     class="answer" placeholder="traduções PT (ex.: obrigado; obrigada)">
        <input id="inKana"   class="answer" placeholder="hiragana (opcional) ex.: ありがとう">
        <input id="inCat"    class="answer" placeholder="categoria (ex.: saudacao)">
        <button class="btn" id="btnAdd">Adicionar</button>
      </div>
      <div class="helper">No bulk: <code>romaji ; pt1 ; pt2 ; #categoria ; ひらがな(opcional)</code></div>
    </div>

    <div class="card">
      <div class="prompt">Importar em massa (colar lista)</div>
      <textarea class="bulk" id="bulk" placeholder="konnichiwa ; olá ; boa tarde ; #saudacao ; こんにちは&#10;arigatou ; obrigado ; obrigada ; #saudacao ; ありがとう"></textarea>
      <div class="center">
        <button class="btn secondary" id="btnParse">Pré-visualizar</button>
        <button class="btn" id="btnImport">Adicionar tudo</button>
      </div>
      <div id="preview" class="helper"></div>
    </div>

    <div class="card">
      <div class="prompt">Backup (JSON)</div>
      <div class="center">
        <button class="btn secondary" id="btnExport">Exportar</button>
        <input type="file" id="fileImport" accept="application/json" style="display:none">
        <button class="btn" id="btnLoad">Importar JSON</button>
      </div>
      <div class="helper">Use para salvar/restaurar suas cartas e progresso (ok/err/SRS).</div>
    </div>
  </section>

  <section class="section" id="list">
    <div class="card">
      <div class="prompt">Cartas (toque para remover)</div>

      <!-- Controles de pendências -->
      <div class="row" style="justify-content:flex-end;gap:8px;margin:6px 0">
        <span class="helper" id="pendingLbl" style="margin-right:auto">Alterações pendentes: 0</span>
        <button class="btn secondary small" id="btnDiscard" title="Descartar alterações locais">Descartar</button>
        <button class="btn small" id="btnSync" title="Enviar alterações ao servidor">Atualizar</button>
      </div>

      <div class="tableWrap">
        <table class="list" id="table"></table>
      </div>
    </div>
  </section>

  <div class="kudos">JP-PT</div>
  <div class="msg" id="msg" style="display:none"></div>
</div>

<script type="module">
import { onAuthState, signOutUser } from './auth.js';
import {
  loadUserDeck,
  saveUserDeck,
  migrateFromLocalStorage,
  getDeletedRomajiSet,
  upsertMany,
  cacheDeck,
  deleteMany,
  markDeletedRomajiMany
} from './store.js';

  // ===== CONFIG =====
  const DATA_URL = './anime_romaji.json';

  // ===== HELPERS / STORAGE =====
  const LS_DECK = 'romajiDeck_v8';
  const defaultDeck = [
    ["konnichiwa","olá; boa tarde","geral","こんにちは"],
    ["ohayou","bom dia","geral","おはよう"],
    ["konbanwa","boa noite (cumprimento)","geral","こんばんは"]
  ];
  const normBasic = s => (s||'').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/\([^)]*\)/g,' ')
    .replace(/[\p{P}\p{S}]/gu,' ').replace(/\s+/g,' ').trim();
  const parsePT = pt => (pt||'').split(/[|;,\n]/).map(normBasic).filter(Boolean);
  const isKana = s => /[\u3040-\u309f\u30a0-\u30ff]/.test(s||'');

  // Levenshtein
  function lev(a,b){
    const m=a.length, n=b.length;
    if(m===0) return n; if(n===0) return m;
    const dp=Array.from({length:m+1},(_,i)=>Array(n+1).fill(0));
    for(let i=0;i<=m;i++) dp[i][0]=i;
    for(let j=0;j<=n;j++) dp[0][j]=j;
    for(let i=1;i<=m;i++){
      for(let j=1;j<=n;j++){
        dp[i][j]=Math.min(
          dp[i-1][j]+1,
          dp[i][j-1]+1,
          dp[i-1][j-1] + (a[i-1]===b[j-1]?0:1)
        );
      }
    }
    return dp[m][n];
  }
  const roughlyEquals = (a,b) => lev(a,b) <= 1;

  function seed(list){
    const now = Date.now();
    return list.map(([romaji,pt,cat='geral',kana=''],i)=>({
      id:String(now+i),
      romaji:String(romaji||'').toLowerCase().trim(),
      pt:String(pt||'').toLowerCase().trim(),
      cat:String(cat||'geral').toLowerCase().trim(),
      kana:String(kana||'').trim(),
      ok:0,err:0,
      ease:2.5, interval:0, due:now,
      rf:false, rfLast:0
    }));
  }
  function migrate(arr){
    const now = Date.now();
    return arr.map(c=>({
      id:c.id||String(now+Math.random()),
      romaji:String(c.romaji||'').toLowerCase().trim(),
      pt:String(c.pt||'').toLowerCase().trim(),
      cat:String(c.cat||'geral').toLowerCase().trim(),
      kana:String(c.kana||c.hiragana||'').trim(),
      ok:c.ok||0, err:c.err||0,
      ease: (typeof c.ease==='number' && c.ease>0) ? c.ease : 2.5,
      interval: (typeof c.interval==='number') ? c.interval : 0,
      due: (typeof c.due==='number') ? c.due : now,
      rf: !!c.rf, rfLast: (typeof c.rfLast==='number') ? c.rfLast : 0
    }));
  }
  function loadDeckLS(){ try{ const raw=JSON.parse(localStorage.getItem(LS_DECK)); if(Array.isArray(raw)) return migrate(raw);}catch(e){} return null;}
  function saveDeck(){ localStorage.setItem(LS_DECK, JSON.stringify(deck)); } // (só local)
  function toast(t,ms=1400){ const el=document.querySelector('#msg'); el.textContent=t; el.style.display='block'; clearTimeout(toast._t); toast._t=setTimeout(()=>el.style.display='none',ms);}

  function flash(msg, ok=true){
    const card = document.querySelector('#study .card');
    const n = document.createElement('div');
    n.className = 'flash ' + (ok?'ok':'err');
    n.textContent = msg;
    card.prepend(n);
    setTimeout(()=>n.remove(), 1200);
  }

  // ===== SONS =====
  let ACTX = null, SFX_BUS = null;
  async function ensureAudio(){
    if(!ACTX){
      ACTX = new (window.AudioContext || window.webkitAudioContext)();
      SFX_BUS = ACTX.createGain();
      SFX_BUS.gain.value = 1.0;
      SFX_BUS.connect(ACTX.destination);
    }
    if(ACTX.state === 'suspended'){
      try{ await ACTX.resume(); }catch(_){}
    }
  }
  function blip(freq, t0, dur, type='sine', gain=0.06){
    if(!ACTX) return;
    const o = ACTX.createOscillator();
    const g = ACTX.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    o.connect(g); g.connect(SFX_BUS);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  function vibrateOk(){ navigator.vibrate?.(15); }
  function vibrateErr(){ navigator.vibrate?.([10,40,10]); }
  function playSFX(kind, delayMs=0){
    ensureAudio().then(()=>{
      const base = ACTX.currentTime + (delayMs/1000);
      if(kind === 'ok'){
        blip(880,  base + 0.00, 0.10, 'triangle', 0.06);
        blip(1320, base + 0.09, 0.10, 'triangle', 0.05);
      }else{
        blip(300, base + 0.00, 0.12, 'sawtooth', 0.07);
        blip(220, base + 0.10, 0.12, 'sawtooth', 0.06);
      }
    });
    if(kind==='ok') vibrateOk(); else vibrateErr();
  }
  window.addEventListener('pointerdown', ensureAudio, {once:true});

  // ===== TTS =====
  let voices = [];
  function refreshVoices(){
    try{ voices = window.speechSynthesis ? (speechSynthesis.getVoices()||[]) : []; }catch(_){ voices=[]; }
  }
  refreshVoices();
  if('speechSynthesis' in window){ speechSynthesis.onvoiceschanged = refreshVoices; }
  function pickVoice(prefList){
    const lower = v => (v.lang||'').toLowerCase();
    for(const pref of prefList){
      const chosen = voices.find(v=> lower(v).startsWith(pref));
      if(chosen) return chosen;
    }
    return voices.find(v=> prefList.some(p=>lower(v).startsWith(p.slice(0,2)))) || null;
  }
  function speak(text, prefs, rate=1.0, pitch=1.0){
    if(!('speechSynthesis' in window) || !text) return;
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(prefs);
    if(v) u.voice = v;
    u.lang = (v && v.lang) ? v.lang : (prefs[0] || 'en-US');
    u.rate = rate; u.pitch = pitch;
    try{ speechSynthesis.cancel(); }catch(_){}
    clearTimeout(speak._t);
    speak._t = setTimeout(()=>speechSynthesis.speak(u), 120);
  }
  function romajiToHiragana(input){
    if(!input) return '';
    let s = String(input).toLowerCase().trim()
      .replace(/[^a-z0-9 ?!.,-]/g,' ')
      .replace(/\s+/g,' ')
      .trim()
      .replace(/nn/g,'n')
      .replace(/n'(?=[^aeiouy])/g,'n');
    const yo = {
      'kya':'きゃ','kyu':'きゅ','kyo':'きょ','gya':'ぎゃ','gyu':'ぎゅ','gyo':'ぎょ',
      'sha':'しゃ','shu':'しゅ','sho':'しょ','ja':'じゃ','ju':'じゅ','jo':'じょ',
      'jya':'じゃ','jyu':'じゅ','jyo':'じょ','cha':'ちゃ','chu':'ちゅ','cho':'ちょ',
      'nya':'にゃ','nyu':'にゅ','nyo':'にょ','hya':'ひゃ','hyu':'ひゅ','hyo':'ひょ',
      'bya':'びゃ','byu':'びゅ','byo':'びょ','pya':'ぴゃ','pyu':'ぴゅ','pyo':'ぴょ',
      'mya':'みゃ','myu':'みゅ','myo':'みょ','rya':'りゃ','ryu':'りゅ','ryo':'りょ'
    };
    const mp = {
      'a':'あ','i':'い','u':'う','e':'え','o':'お',
      'ka':'か','ki':'き','ku':'く','ke':'け','ko':'こ',
      'ga':'が','gi':'ぎ','gu':'ぐ','ge':'げ','go':'ご',
      'sa':'さ','shi':'し','si':'し','su':'す','se':'せ','so':'そ',
      'za':'ざ','ji':'じ','zi':'じ','zu':'ず','ze':'ぜ','zo':'ぞ',
      'ta':'た','chi':'ち','ti':'ち','tsu':'つ','tu':'つ','te':'て','to':'と',
      'da':'だ','di':'ぢ','du':'づ','de':'で','do':'ど',
      'na':'な','ni':'に','nu':'ぬ','ne':'ね','no':'の',
      'ha':'は','hi':'ひ','fu':'ふ','hu':'ふ','he':'へ','ho':'ほ',
      'ba':'ば','bi':'び','bu':'ぶ','be':'べ','bo':'ぼ',
      'pa':'ぱ','pi':'ぴ','pu':'ぷ','pe':'ぺ','po':'ぽ',
      'ma':'ま','mi':'み','mu':'む','me':'め','mo':'も',
      'ya':'や','yu':'ゆ','yo':'よ',
      'ra':'ら','ri':'り','ru':'る','re':'れ','ro':'ろ',
      'wa':'わ','wo':'を',
      'che':'ちぇ','she':'しぇ','je':'じぇ'
    };
    let out = '';
    let i = 0;
    const vow = c => /[aeiou]/.test(c);
    const cons = c => /[bcdfghjklmnpqrstvwxyz]/.test(c);

    while(i < s.length){
      if(/\s/.test(s[i])){ out += ' '; i++; continue; }
      if(/[?!.,-]/.test(s[i])){ out += s[i]; i++; continue; }
      if(i+1 < s.length && s[i] === s[i+1] && cons(s[i]) && s[i] !== 'n'){ out += 'っ'; i++; continue; }
      if(s[i] === 'n'){
        const nx = s[i+1] || '';
        if(!nx || (!vow(nx) && nx !== 'y')){ out += 'ん'; i++; continue; }
      }
      const tri = s.slice(i, i+3);
      if(yo[tri]){ out += yo[tri]; i += 3; continue; }
      const triM = mp[tri];
      if(triM){ out += triM; i += 3; continue; }
      const bi = s.slice(i, i+2);
      const biM = mp[bi];
      if(biM){ out += biM; i += 2; continue; }
      const one = s[i];
      const oneM = mp[one];
      if(oneM){ out += oneM; i++; continue; }
      out += s[i]; i++;
    }
    out = out.replace(/ou/g,'おう').replace(/oo/g,'おお');
    out = out.replace(/\bha\b/g,'は').replace(/\bhe\b/g,'へ').replace(/\bwo\b/g,'を');
    return out.replace(/\s{2,}/g,' ').trim();
  }
  function speakJP(text){
    const kana = isKana(text) ? text : romajiToHiragana(text);
    if(!kana) return;
    speak(kana, ['ja-jp','ja'], 0.95, 1.0);
  }
  function speakPT(text){
    speak(text, ['pt-br','pt-pt','pt'], 1.0, 1.0);
  }

  // ===== STATE =====
  let deck = [];
  const State = { modeTab:'study', direction:'PT2ROMAJI', catFilter:'todas', current:null, lastCorrect:false };
  const Quiz = { direction:'PT2ROMAJI', cat:'todas', current:null, choices:[] };

  // ===== Pending queue (para Atualizar) =====
  const Pending = {
    deletions: new Set(),  // ids a deletar
    tombs: new Set(),      // romaji normalizado
    upserts: new Set()     // ids modificados/novos
  };
  function refreshPending(){
    const n = Pending.deletions.size + Pending.tombs.size + Pending.upserts.size;
    const lbl = document.getElementById('pendingLbl');
    if(lbl) lbl.textContent = `Alterações pendentes: ${n}`;
  }
  function queueUpsert(id){
    if(id!=null) Pending.upserts.add(String(id));
    // marca que há alterações locais não sincronizadas
    try{ localStorage.setItem('unsynced','1'); }catch(_){}
    refreshPending();
  }

  // ===== UI helpers =====
  const el = s => document.querySelector(s);
  const els = s => [...document.querySelectorAll(s)];
  function refreshCategoriesUI(){
    const cats = new Set(deck.map(c=>c.cat||'geral')); cats.add('todas');
    const sels = [el('#catFilter'), el('#qCat'), el('#rCat')];
    sels.forEach(sel=>{
      const cur=sel?.value; if(!sel) return;
      sel.innerHTML='';
      [...cats].sort().forEach(c=>{
        const o=document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o);
      });
      sel.value=cats.has(cur)?cur:'todas';
    });
  }
  function filteredByCategory(list, cat){ const k = cat || State.catFilter; if(k==='todas') return list; return list.filter(c=>(c.cat||'geral')===k); }
  function shuffle(a){ const arr=a.slice(); for(let i=arr.length-1;i>0;i++){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }

  // ===== SRS =====
  function rateCard(card, correct){
    if(!correct){
      card.interval = 0;
      card.due = Date.now();
      card.rf = true;
      card.rfLast = Date.now();
      return;
    }
    card.ease = Math.max(1.3, (card.ease||2.5) + 0.1);
    if(card.interval === 0){ card.interval = 1; }
    else if(card.interval === 1){ card.interval = 3; }
    else { card.interval = Math.round(card.interval * card.ease); }
    const ONE_DAY = 86400000;
    card.due = Date.now() + card.interval * ONE_DAY;
  }

  // Ciclos
  const Cycles = {
    study: { key:'todas', order:[], idx:0, last:null },
    quiz:  { key:'todas', order:[], idx:0, last:null }
  };
  function buildOrder(cat){
    const now = Date.now();
    const list = filteredByCategory(deck, cat);
    const due = list.filter(c => (c.due||0) <= now);
    const notDue = list.filter(c => (c.due||0) >  now);
    const order = [...due.sort((a,b)=>(a.due||0)-(b.due||0)), ...shuffle(notDue)];
    return order.map(c=>c.id);
  }
  function rebuildCycle(kind, cat){
    const order = shuffle(buildOrder(cat));
    Cycles[kind] = { key:cat, order, idx:0, last: Cycles[kind]?.last || null };
  }
  function nextFromCycle(kind, cat){
    const cy = Cycles[kind];
    if (cy.key !== cat) rebuildCycle(kind, cat);
    if (cy.order.length === 0) rebuildCycle(kind, cat);
    if (cy.idx >= cy.order.length){
      let order = shuffle(buildOrder(cat));
      if (order.length > 1 && cy.last && order[0] === cy.last){ order.push(order.shift()); }
      cy.order = order;
      cy.idx = 0;
    }
    const id = cy.order[cy.idx++];
    cy.last = id;
    return deck.find(c=>c.id===id) || null;
  }
  function invalidateCycles(){
    Cycles.study.order = [];
    Cycles.quiz.order  = [];
  }

  // ===== STUDY =====
  const answer = () => el('#answer');
  const btnCheck = () => el('#btnCheck');
  const btnSkip = () => el('#btnSkip');

  function preventFocusScroll(input){
    if(!input) return;
    input.addEventListener('touchstart', () => {
      if(input !== document.activeElement){
        try { input.focus({ preventScroll: true }); }
        catch(_){ input.focus(); }
      }
    }, { passive: true });
    input.addEventListener('focus', () => {
      requestAnimationFrame(() => {
        document.scrollingElement && (document.scrollingElement.scrollTop = 0);
        window.scrollTo(0, 0);
      });
    });
  }
  [ answer(), el('#rAnswer'), el('#inRomaji'), el('#inPT'), el('#inKana'), el('#inCat'), el('#bulk') ].forEach(preventFocusScroll);

  function setLocked(lock){
    answer().readOnly = lock;
    btnCheck().disabled = lock || !answer().value.trim();
  }
  function adjustInputMode(){
    const dir = State.direction;
    answer().setAttribute('inputmode', (dir==='PT2ROMAJI') ? 'latin' : 'text');
  }
  function renderAccepted(ok, detailsArr){
    const box = el('#accepted'); box.innerHTML='';
    if(!detailsArr || !detailsArr.length){ box.style.display='none'; return; }
    const span = document.createElement('span'); span.className='okText';
    span.textContent = ok ? 'Correto: ' : 'Aceitas: ';
    const small = document.createElement('small'); small.className='okText';
    small.textContent = detailsArr.join(' / ');
    box.append(span, small); box.style.display='block';
  }

  function renderQuestion(){
    const c=State.current; if(!c){ el('#qMain').textContent='Sem cartas nesta categoria.'; return; }
    const dir=State.direction;
    if(dir==='PT2ROMAJI'){ el('#promptLbl').textContent='Tradução (PT-BR)'; el('#helperLbl').innerHTML='Digite o <b>romaji</b> e pressione Verificar'; el('#qMain').textContent=(parsePT(c.pt)[0]||c.pt); }
    if(dir==='ROMAJI2PT'){ el('#promptLbl').textContent='Romaji'; el('#helperLbl').innerHTML='Digite uma tradução em <b>PT-BR</b> que sirva'; el('#qMain').textContent=c.romaji; }
    if(dir==='HIRA2PT'){ el('#promptLbl').textContent='Hiragana'; el('#helperLbl').innerHTML='Digite uma tradução em <b>PT-BR</b> que sirva'; el('#qMain').textContent=c.kana||romajiToHiragana(c.romaji); }
    answer().value=''; answer().classList.remove('correct','wrong'); renderAccepted(false, []);
    btnSkip().textContent='Pular'; State.lastCorrect=false;
    adjustInputMode(); setLocked(false);
  }
  function pickNext(){
    State.current = nextFromCycle('study', State.catFilter);
    renderQuestion();
  }

  // tabs
  els('.tab').forEach(b=>{
    b.addEventListener('click',()=>{
      els('.tab').forEach(x=>x.classList.remove('active')); b.classList.add('active');
      const tab=b.dataset.tab; els('.section').forEach(s=>s.classList.remove('active')); el('#'+tab).classList.add('active');
      State.modeTab=tab;
      if(tab==='study'){ if(!State.current) pickNext(); else renderQuestion(); }
      if(tab==='quiz'){ startQuizRound(); }
      if(tab==='reinforce'){ startReinforceRound(); }
      if(tab==='list') renderTable();
    });
  });

  els('input[name="dir"]').forEach(r=>{ r.addEventListener('change',()=>{ State.direction=r.value; renderQuestion(); }); });
  el('#catFilter').addEventListener('change',()=>{ State.catFilter = el('#catFilter').value; pickNext(); });
  answer().addEventListener('input', ()=> btnCheck().disabled = !answer().value.trim());

  function checkAnswer(){
    const c = State.current;
    if(!c) return;

    const user = normBasic(answer().value);
    let ok = false, details = [];

    if (State.direction === 'PT2ROMAJI') {
      ok = !!user && roughlyEquals(user, normBasic(c.romaji));
      details = [c.romaji, 'PT: '+parsePT(c.pt).join(' / ')];
    } else {
      const acc = new Set(parsePT(c.pt));
      ok = !!user && [...acc].some(t => roughlyEquals(user, t));
      details = [...acc];
    }

    answer().classList.remove('correct','wrong');
    answer().classList.add(ok ? 'correct' : 'wrong');
    renderAccepted(ok, details);

    ensureAudio().then(() => playSFX(ok ? 'ok' : 'err', 280));

    if (ok) {
      c.ok++; State.lastCorrect = true; btnSkip().textContent = 'Próximo'; setLocked(true);
      rateCard(c, true); toast('✔ Correto!'); flash('Correto!', true);
    } else {
      c.err++; State.lastCorrect = false; btnSkip().textContent = 'Pular';
      rateCard(c, false); toast('✘ Quase!'); flash('Quase...', false);
    }

    cacheDeck(window.CURRENT_UID, deck);
    queueUpsert(c.id);
  }

  btnCheck().addEventListener('click', checkAnswer);
  answer().addEventListener('keydown', e=>{
    if(e.key==='Enter'){ e.preventDefault(); if(State.lastCorrect) pickNext(); else checkAnswer(); }
  });
  btnSkip().addEventListener('click', pickNext);

  el('#speakJP').addEventListener('click', ()=>{ const c=State.current; if(!c) return; const text=c.kana && isKana(c.kana) ? c.kana : c.romaji; speakJP(text); });
  el('#speakPT').addEventListener('click', ()=>{ const c=State.current; if(!c) return; const txt=(parsePT(c.pt)[0]||c.pt); speakPT(txt); });

  // ===== QUIZ =====
  function valFor(card, dir){ return dir==='PT2ROMAJI' ? card.romaji : (parsePT(card.pt)[0]||card.pt); }
  function buildChoices(card, dir, cat){
    let pool = filteredByCategory(deck,cat).filter(c=>c.id!==card.id);
    if(pool.length < 3) pool = deck.filter(c=>c.id!==card.id);
    const correct = valFor(card, dir);
    const used=new Set([correct]); const opts=[];
    while(opts.length<3 && pool.length){
      const it=pool[Math.floor(Math.random()*pool.length)];
      const k=valFor(it, dir);
      if(!used.has(k)){ used.add(k); opts.push(k); }
    }
    const all=[...opts, correct].sort(()=>Math.random()-0.5);
    return {options:all, correct};
  }
  function renderQuiz(){
    const c=Quiz.current; if(!c){ el('#qQuestion').textContent='Sem cartas nesta categoria.'; el('#choices').innerHTML=''; return;}
    const dir=Quiz.direction, cat=Quiz.cat;
    if(dir==='PT2ROMAJI'){ el('#qPrompt').textContent='Tradução (PT-BR)'; el('#qQuestion').textContent=(parsePT(c.pt)[0]||c.pt); }
    if(dir==='ROMAJI2PT'){ el('#qPrompt').textContent='Romaji'; el('#qQuestion').textContent=c.romaji; }
    if(dir==='HIRA2PT'){ el('#qPrompt').textContent='Hiragana'; el('#qQuestion').textContent=c.kana||romajiToHiragana(c.romaji); }

    const {options, correct}=buildChoices(c, dir, cat);
    const wrap=el('#choices'); wrap.innerHTML='';
    options.forEach(text=>{
      const b=document.createElement('button'); b.className='choice'; b.textContent=text; b.setAttribute('tabindex','0');
      b.addEventListener('click', ()=>{
        if(b.disabled) return;

        if(dir==='ROMAJI2PT'){ speakPT(text); }
        else { const jp = c.kana && isKana(c.kana) ? c.kana : c.romaji; speakJP(jp); }

        const isCorrect = text===correct;
        b.classList.add(isCorrect?'correct':'wrong');
        playSFX(isCorrect ? 'ok' : 'err', 280);

        if(isCorrect){
          c.ok++; rateCard(c,true); toast('✔ Correto!'); flash('Correto!',true);
        } else {
          c.err++; rateCard(c,false); toast('✘ Quase!');  flash('Quase...',false);
        }

        cacheDeck(window.CURRENT_UID, deck);
        queueUpsert(c.id);

        [...wrap.children].forEach(btn=>{
          btn.disabled = true;
          if(btn.textContent===correct) btn.classList.add('correct');
        });
      });
      wrap.appendChild(b);
    });
    el('#qFeedback').style.display='none';
  }
  function startQuizRound(){
    Quiz.current = nextFromCycle('quiz', Quiz.cat);
    renderQuiz();
  }
  els('input[name="qdir"]').forEach(r=>{ r.addEventListener('change',()=>{ Quiz.direction=r.value; renderQuiz(); }); });
  el('#qCat').addEventListener('change',()=>{ Quiz.cat=el('#qCat').value; startQuizRound(); });
  el('#qNext').addEventListener('click', startQuizRound);

  // ===== REFORÇO 2.0 (corrigido) =====
  const Reinforce = {
    direction:'PT2ROMAJI',
    pool:'mix',       // rf | due | trouble | mix
    cat:'todas',
    order:[],
    idx:0,
    sessionMax:20,
    autoSpeak:false,
    showHints:false,
    done:0,
    total:0
  };

  function rSetInputMode(){
    el('#rAnswer').setAttribute('inputmode', (Reinforce.direction==='PT2ROMAJI') ? 'latin' : 'text');
  }

  function rBuildPool(){
    const now = Date.now();
    let list = filteredByCategory(deck, Reinforce.cat);

    const isRF      = c => !!c.rf;
    const isDue     = c => (c.due||0) <= now;
    const isTrouble = c => (c.err||0) >= Math.max(2, (c.ok||0)); // mais erros que acertos (mín. 2)

    if(Reinforce.pool === 'rf')       list = list.filter(isRF);
    else if(Reinforce.pool === 'due') list = list.filter(isDue);
    else if(Reinforce.pool === 'trouble') list = list.filter(isTrouble);
    else { // mix
      const set = new Set();
      list.forEach(c => { if(isRF(c)||isDue(c)||isTrouble(c)) set.add(c.id); });
      list = list.filter(c=>set.has(c.id));
    }

    return list;
  }

  function rStartSession(){
    const pool = rBuildPool();
    Reinforce.order = shuffle(pool).map(c=>c.id);
    Reinforce.idx = 0;
    Reinforce.done = 0;
    Reinforce.total = (el('#rLen').value==='all') ? Reinforce.order.length
                   : Math.min(parseInt(el('#rLen').value||20,10), Reinforce.order.length);
    RCurrent = null;            // não avance até pontuar
    rRender();
  }

  function rNext(){
    if(Reinforce.done >= Reinforce.total || Reinforce.idx >= Reinforce.order.length){
      // acabou → reiniciar com novo pool
      rStartSession();
      return;
    }
    const id = Reinforce.order[Reinforce.idx++];
    return deck.find(c=>c.id===id) || null;
  }

  let RCurrent = null;

  function rHintFor(c){
    if(!c) return '';
    const dir = Reinforce.direction;
    if(dir==='PT2ROMAJI'){
      const syl = (c.romaji.match(/[aeiou]+/g)||[]).length;
      return `Dica: ${c.romaji[0]}… · ${syl} sílaba(s)`;
    }
    if(dir==='ROMAJI2PT'){
      const first = (parsePT(c.pt)[0]||c.pt);
      return `Dica: “${first?.[0]||'?'}…” (${first?.split(' ')?.[0]?.length||'?'} letras)`;
    }
    const first = (parsePT(c.pt)[0]||c.pt);
    return `Dica: começa com “${first?.[0]||'?'}”`;
  }

  function rRenderAccepted(ok, detailsArr){
    const box = el('#rAccepted'); box.innerHTML='';
    if(!detailsArr || !detailsArr.length){ box.style.display='none'; return; }
    const span = document.createElement('span'); span.className='okText';
    span.textContent = ok ? 'Correto: ' : 'Aceitas: ';
    const small = document.createElement('small'); small.className='okText';
    small.textContent = detailsArr.join(' / ');
    box.append(span, small); box.style.display='block';
  }

  function rRender(){
    const pool = rBuildPool();
    el('#rfInfo').textContent = pool.length ? `No foco: ${pool.length}` : 'Sem itens no foco 🎉';

    if(Reinforce.done >= Reinforce.total || pool.length===0){
      el('#rQuestion').textContent = pool.length ? 'Concluído! Reiniciando…' : 'Não há itens 🎉';
      el('#rAnswer').value=''; el('#rCheck').disabled=true;
      el('#rProg').textContent = `${Reinforce.done}/${Reinforce.total}`;
      rRenderAccepted(false, []);
      el('#rHint').style.display='none';
      return;
    }

    if(!RCurrent) RCurrent = rNext();     // só busca próxima quando precisa
    if(!RCurrent){ rStartSession(); return; }

    const dir=Reinforce.direction;
    if(dir==='PT2ROMAJI'){ el('#rPrompt').textContent='Reforço — Tradução (PT-BR)'; el('#rQuestion').textContent=(parsePT(RCurrent.pt)[0]||RCurrent.pt); }
    if(dir==='ROMAJI2PT'){ el('#rPrompt').textContent='Reforço — Romaji'; el('#rQuestion').textContent=RCurrent.romaji; }
    if(dir==='HIRA2PT'){ el('#rPrompt').textContent='Reforço — Hiragana'; el('#rQuestion').textContent=RCurrent.kana||romajiToHiragana(RCurrent.romaji); }

    el('#rAnswer').value=''; el('#rAnswer').classList.remove('correct','wrong');
    rRenderAccepted(false, []);
    rSetInputMode();
    el('#rCheck').disabled=true;
    el('#rProg').textContent = `${Reinforce.done}/${Reinforce.total}`;

    const hint = Reinforce.showHints ? rHintFor(RCurrent) : '';
    el('#rHint').textContent = hint;
    el('#rHint').style.display = hint ? 'block' : 'none';

    if(Reinforce.autoSpeak){
      if(dir==='ROMAJI2PT'){ const txt=(parsePT(RCurrent.pt)[0]||RCurrent.pt); speakPT(txt); }
      else { const text=RCurrent.kana && isKana(RCurrent.kana) ? RCurrent.kana : RCurrent.romaji; speakJP(text); }
    }
  }

  function rValFor(card, dir){ return dir==='PT2ROMAJI' ? card.romaji : (parsePT(card.pt)[0]||card.pt); }

  function rateCardReinforce(card, quality){
    // quality: 0 again, 1 hard, 2 good, 3 easy
    const DAY = 86400000;
    if(quality===0){
      card.err++; // erro forte
      card.interval = 0;
      card.due = Date.now();
      card.rf = true;
      card.rfLast = Date.now();
      // coloca de novo daqui a 3 itens (se houver espaço)
      const pos = Math.min(Reinforce.idx + 3, Reinforce.order.length);
      Reinforce.order.splice(pos, 0, card.id);
      return;
    }
    // acertos
    card.ok++;
    if(quality===1){ // hard
      card.ease = Math.max(1.3, (card.ease||2.5) - 0.05);
      card.interval = Math.max(1, Math.round((card.interval||1) * 1.2));
    }else if(quality===2){ // good
      card.ease = Math.max(1.3, (card.ease||2.5) + 0.05);
      card.interval = (card.interval===0) ? 1 : (card.interval===1 ? 3 : Math.round(card.interval * card.ease));
    }else{ // easy
      card.ease = Math.max(1.3, (card.ease||2.5) + 0.15);
      card.interval = (card.interval===0) ? 3 : Math.round(Math.max(3, card.interval * 1.7));
    }
    card.due = Date.now() + card.interval * DAY;
    if(quality>=2){ card.rf = false; card.rfLast = Date.now(); }
  }

  function rScore({forceWrong=false, showDetails=true} = {}){
    if(!RCurrent) return;
    const dir = Reinforce.direction;
    const user = normBasic(el('#rAnswer').value);
    let correct=false, details=[];

    if (dir === 'PT2ROMAJI') {
      correct = !!user && (lev(user, normBasic(RCurrent.romaji))<=1);
      details = [RCurrent.romaji, 'PT: '+parsePT(RCurrent.pt).join(' / ')];
    } else {
      const acc = new Set(parsePT(RCurrent.pt));
      correct = !!user && [...acc].some(t=>lev(user, t)<=1);
      details = [...acc];
    }

    if (forceWrong) correct = false;

    const input = el('#rAnswer');
    input.classList.remove('correct','wrong');
    input.classList.add(correct?'correct':'wrong');

    if(showDetails) rRenderAccepted(correct, details);

    ensureAudio().then(()=> playSFX(correct?'ok':'err', 280));

    if(correct) rateCardReinforce(RCurrent, 2); // Good
    else        rateCardReinforce(RCurrent, 0); // Again (erro)

    cacheDeck(window.CURRENT_UID, deck);
    queueUpsert(RCurrent.id);

    Reinforce.done++;
    RCurrent = null;   // libera para a próxima só agora
    rRender();
  }

  // listeners UI (REFORÇO)
  els('input[name="rdir"]').forEach(r=>{
    r.addEventListener('change',()=>{
      Reinforce.direction=r.value;
      rSetInputMode();
      rRender();              // não avança
    });
  });
  el('#rAnswer').addEventListener('input', ()=> el('#rCheck').disabled = !el('#rAnswer').value.trim());

  el('#rSpeakJP').addEventListener('click', ()=>{ const c=RCurrent; if(!c) return; const text=c.kana && isKana(c.kana) ? c.kana : c.romaji; speakJP(text); });
  el('#rSpeakPT').addEventListener('click', ()=>{ const c=RCurrent; if(!c) return; const txt=(parsePT(c.pt)[0]||c.pt); speakPT(txt); });

  el('#rCheck').addEventListener('click', ()=> rScore());
  el('#rAnswer').addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); rScore(); } });

  el('#rReveal').addEventListener('click', ()=>{
    if(!RCurrent) return;
    const dir = Reinforce.direction;
    el('#rAnswer').value = rValFor(RCurrent, dir);
    rScore({forceWrong:true, showDetails:false}); // Mostrar = erro
  });

  el('#rSkip').addEventListener('click', ()=>{
    if(!RCurrent) return;
    Reinforce.order.push(RCurrent.id);
    Reinforce.done++;
    RCurrent = null;
    rRender();
  });

  el('#rLearned').addEventListener('click', ()=>{
    if(!RCurrent) return;
    RCurrent.rf = false; RCurrent.rfLast = Date.now();
    cacheDeck(window.CURRENT_UID, deck);
    queueUpsert(RCurrent.id);
    Reinforce.done++;
    RCurrent = null;
    toast('Removido do reforço!');
    rRender();
  });

  // rating buttons
  el('#rAgain').addEventListener('click', ()=>{
    if(!RCurrent) return;
    rateCardReinforce(RCurrent,0); cacheDeck(window.CURRENT_UID, deck); queueUpsert(RCurrent.id);
    Reinforce.done++; RCurrent=null; rRender();
  });
  el('#rHard').addEventListener('click', ()=>{
    if(!RCurrent) return;
    rateCardReinforce(RCurrent,1); cacheDeck(window.CURRENT_UID, deck); queueUpsert(RCurrent.id);
    Reinforce.done++; RCurrent=null; rRender();
  });
  el('#rGood').addEventListener('click', ()=>{
    if(!RCurrent) return;
    rateCardReinforce(RCurrent,2); cacheDeck(window.CURRENT_UID, deck); queueUpsert(RCurrent.id);
    Reinforce.done++; RCurrent=null; rRender();
  });
  el('#rEasy').addEventListener('click', ()=>{
    if(!RCurrent) return;
    rateCardReinforce(RCurrent,3); cacheDeck(window.CURRENT_UID, deck); queueUpsert(RCurrent.id);
    Reinforce.done++; RCurrent=null; rRender();
  });

  // filtros e opções
  el('#rPool').addEventListener('change', ()=>{ Reinforce.pool = el('#rPool').value; rStartSession(); });
  el('#rCat').addEventListener('change', ()=>{ Reinforce.cat = el('#rCat').value; rStartSession(); });
  el('#rLen').addEventListener('change', ()=>{ rStartSession(); });
  el('#rAutoSpeak').addEventListener('change', ()=>{ Reinforce.autoSpeak = el('#rAutoSpeak').checked; });
  el('#rHints').addEventListener('change', ()=>{ Reinforce.showHints = el('#rHints').checked; rRender(); });

  // bootstrap do reforço ao entrar na aba
  function startReinforceRound(){ rStartSession(); }

  // ===== ADD / BULK =====
  function parseBulk(text){
    const out=[]; (text||'').split(/\r?\n/).forEach(line=>{
      line=line.trim(); if(!line) return;
      const parts=line.split(/\t|\s*;\s*/).map(s=>s.trim()).filter(Boolean);
      let cat='', kana='';
      if(parts.length && /[\u3040-\u309f]/.test(parts[parts.length-1])) kana=parts.pop();
      if(parts.length && parts[parts.length-1].startsWith('#')) cat=parts.pop().slice(1);
      if(parts.length<2) return;
      const [romaji,...rest]=parts; out.push({romaji,pt:rest.join(';'),cat,kana});
    }); return out;
  }
  function addCard(r,p,cat,kana){
    const rom=normBasic(r), pt=normBasic(p), c=(cat||'geral').toLowerCase().trim()||'geral', k=String(kana||'').trim();
    if(!rom||!pt) return false; if(deck.some(x=>normBasic(x.romaji)===rom)) return false;
    deck.push({id:String(Date.now()+Math.random()*9999), romaji:rom, pt:pt, cat:c, kana:k, ok:0, err:0, ease:2.5, interval:0, due:Date.now(), rf:false, rfLast:0}); return true;
  }
  el('#btnAdd').addEventListener('click', ()=>{
    const ok = addCard(el('#inRomaji').value, el('#inPT').value, el('#inCat').value, el('#inKana').value);
    if(!ok){toast('Preencha corretamente ou evite duplicar romaji'); return;}
    cacheDeck(window.CURRENT_UID, deck);
    queueUpsert(deck[deck.length - 1].id);
    ['#inRomaji','#inPT','#inKana','#inCat'].forEach(s=>el(s).value='');
    refreshCategoriesUI(); toast('Card adicionado!'); invalidateCycles();
  });
  el('#btnParse').addEventListener('click', ()=>{ const arr=parseBulk(el('#bulk').value); el('#preview').innerHTML = arr.length?'Pronto para importar: <b>'+arr.length+'</b> linha(s).':'Nada válido.'; });
  el('#btnImport').addEventListener('click', ()=>{
    const arr=parseBulk(el('#bulk').value); if(!arr.length){toast('Nada válido'); return;}
    let added=0,skipped=0; const newIds=[];
    for(const it of arr){
      if(addCard(it.romaji,it.pt,it.cat,it.kana)){ added++; newIds.push(deck[deck.length-1].id); }
      else skipped++;
    }
    newIds.forEach(id=>queueUpsert(id));
    cacheDeck(window.CURRENT_UID, deck);
    refreshCategoriesUI(); toast('Importados: '+added+'. Ignorados: '+skipped+'.'); el('#bulk').value=''; el('#preview').textContent=''; invalidateCycles();
  });

  // ===== LISTA =====
  function renderTable(){
    const t=el('#table'); t.innerHTML='';
    t.insertAdjacentHTML('beforeend',
      '<tr>\
        <th class="col-idx">#</th>\
        <th class="col-romaji">Romaji</th>\
        <th class="col-kana">Hiragana</th>\
        <th class="col-pt">Traduções</th>\
        <th class="col-cat">Cat</th>\
        <th class="col-ok">✓</th>\
        <th class="col-err">✗</th>\
      </tr>');
    deck.slice().sort((a,b)=>a.romaji>b.romaji?1:-1).forEach((c,i)=>{
      const tr=document.createElement('tr');
      tr.innerHTML =
        '<td class="col-idx">'+(i+1)+'</td>\
         <td class="col-romaji">'+c.romaji+'</td>\
         <td class="col-kana">'+(c.kana||'')+'</td>\
         <td class="col-pt">'+c.pt+'</td>\
         <td class="col-cat">'+(c.cat||'geral')+'</td>\
         <td class="col-ok" style="text-align:right">'+(c.ok||0)+'</td>\
         <td class="col-err" style="text-align:right">'+(c.err||0)+'</td>';
      tr.title='Toque para remover';
      tr.addEventListener('click', () => {
        const uid = window.CURRENT_UID;
        Pending.deletions.add(c.id);
        Pending.tombs.add(normBasic(c.romaji));
        refreshPending();
        deck = deck.filter(x => x.id !== c.id);
        cacheDeck(uid, deck);
        renderTable();
        refreshCategoriesUI();
        toast('Marcado para remover. Clique em Atualizar para enviar.');
        invalidateCycles();
      });
      t.appendChild(tr);
    });
  }

  // ===== JSON remoto opcional =====
  async function hydrateFromJson(){
    try{
      const uid = window.CURRENT_UID || null;
      const deleted = uid ? await getDeletedRomajiSet(uid) : new Set();

      const res = await fetch(DATA_URL,{cache:'no-store'});
      if(!res.ok) return;
      const data = await res.json();
      if(!Array.isArray(data)) return;

      let added=0;
      const have = new Set(deck.map(c => normBasic(c.romaji)));
      const now = Date.now();

      for(const obj of data){
        const r = normBasic(obj.romaji);
        if(!r) continue;
        if(have.has(r)) continue;
        if(deleted.has(r)) continue;
        const p = Array.isArray(obj.pt) ? obj.pt.join(';') : String(obj.pt||'');
        const c = String(obj.cat||'geral').toLowerCase();
        const k = String(obj.kana||obj.hiragana||'').trim();

        const card = {
          id:String(now + Math.random()*100000),
          romaji:r, pt:parsePT(p).join('; '), cat:c, kana:k,
          ok:0, err:0, ease:2.5, interval:0, due:now, rf:false, rfLast:0
        };
        deck.push(card);
        queueUpsert(card.id);
        have.add(r);
        added++;
      }
      if(added){
        cacheDeck(uid, deck);
        refreshCategoriesUI();
        invalidateCycles();
      }
    }catch(e){}
  }

  // ===== INIT =====
  (async function init(){
    onAuthState(async user=>{
      if(!user){ window.location.href = './login.html'; return; }
      const uid = user.uid;
      window.CURRENT_UID = uid;

      const shortEmail = (user.email||'').split('@')[0];
      document.getElementById('userEmail').textContent = 'Olá, ' + shortEmail;
      document.getElementById('btnSignOut').addEventListener('click', async ()=>{
        await signOutUser();
        window.location.href='./login.html';
      });

      await migrateFromLocalStorage(uid);
      deck = await loadUserDeck(uid);
      if(!deck.length){
        deck = seed(defaultDeck);
        await saveUserDeck(uid, deck); // seed inicial (uma vez)
      }

      await hydrateFromJson();
      refreshCategoriesUI();
      State.current = nextFromCycle('study', State.catFilter);
      renderQuestion();
      Quiz.cat='todas'; startQuizRound();
      startReinforceRound();
      refreshPending();
    });
  })();

  // ===== SYNC (Atualizar / Descartar) =====
  document.getElementById('btnSync').addEventListener('click', async ()=>{
    const uid = window.CURRENT_UID;
    if(!uid){ toast('Você precisa estar logado.'); return; }
    try{
      const upsertList = deck.filter(c => Pending.upserts.has(String(c.id)));
      if (upsertList.length) await upsertMany(uid, upsertList);

      const delIds = [...Pending.deletions];
      if (delIds.length) await deleteMany(uid, delIds);

      const tombs = [...Pending.tombs];
      if (tombs.length) await markDeletedRomajiMany(uid, tombs);

      Pending.deletions.clear();
      Pending.tombs.clear();
      Pending.upserts.clear();
      refreshPending();
      try{ localStorage.removeItem('unsynced'); }catch(_){}
      toast('Sincronizado com o servidor!');
    }catch(e){
      console.error(e);
      toast('Erro ao sincronizar: ' + (e.code || e.message || 'desconhecido'));
    }
  });

  document.getElementById('btnDiscard').addEventListener('click', ()=>{
    Pending.deletions.clear();
    Pending.tombs.clear();
    Pending.upserts.clear();
    refreshPending();
    toast('Alterações pendentes descartadas.');
  });

  // ===== PWA (opcional, falha segura) =====
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>{ /* ok se não existir */ });
  }
</script>

<!--
Modelos opcionais para PWA:

manifest.json
{
  "name": "Flashcards JP↔PT",
  "short_name": "JP-PT",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#0b0f14",
  "theme_color": "#0b0f14",
  "icons": [{ "src": "icon-192.png", "sizes": "192x192", "type": "image/png" }]
}

sw.js
const CACHE='jppt-v1';
const ASSETS=['.', 'index.html','manifest.json','icon-192.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
-->
</body>
</html>
