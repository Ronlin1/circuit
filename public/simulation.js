const cards=[...document.querySelectorAll('[data-scenario]')];
const resultRoot=document.querySelector('#simulation-result');
const historyRoot=document.querySelector('#simulation-history');
const clearButton=document.querySelector('#clear-simulation-history');
const judgeButton=document.querySelector('#run-judge-mode');
const judgeSummary=document.querySelector('#judge-mode-summary');
const history=[];

const livePrice=document.querySelector('#live-market-price');
const liveBid=document.querySelector('#live-market-bid');
const liveAsk=document.querySelector('#live-market-ask');
const liveSpread=document.querySelector('#live-market-spread');
const liveAge=document.querySelector('#live-market-age');
const liveSource=document.querySelector('#live-market-source');
const liveStatus=document.querySelector('#live-stream-status');
const liveAmount=document.querySelector('#live-intent-usd');
const liveEvaluate=document.querySelector('#evaluate-live-intent');
const liveResult=document.querySelector('#live-simulation-result');

const PRIMARY_STREAM='wss://data-stream.binance.vision:443/stream?streams=bnbusdt@trade/bnbusdt@bookTicker';
const FALLBACK_STREAM='wss://stream.binance.com:9443/stream?streams=bnbusdt@trade/bnbusdt@bookTicker';
let visualMarket={price:null,bidPrice:null,askPrice:null,spreadBps:null,observedAt:null};
let restTimer=null;
let fallbackStarted=false;

function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]))}
function setCardsDisabled(disabled){cards.forEach(item=>item.disabled=disabled)}
function priceText(value){return Number.isFinite(Number(value))?Number(value).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:4}):'—'}
function spreadText(value){return Number.isFinite(Number(value))?`${Number(value).toFixed(4)} bps`:'—'}
function evidenceAgeText(observedAt){const ms=Date.parse(observedAt??'');if(!Number.isFinite(ms))return '—';const delta=Date.now()-ms;if(delta<0)return 'FUTURE';return `${(delta/1000).toFixed(1)} s`}

function updateLiveStatus(state,label){if(!liveStatus)return;liveStatus.dataset.state=state;const labelNode=liveStatus.querySelector('b');if(labelNode)labelNode.textContent=label}
function deriveSpread(){const bid=Number(visualMarket.bidPrice),ask=Number(visualMarket.askPrice);if(bid>0&&ask>=bid)visualMarket.spreadBps=((ask-bid)/((ask+bid)/2))*10_000}
function renderVisualMarket(sourceLabel='BINANCE PUBLIC SPOT'){
  if(!livePrice)return;
  livePrice.textContent=priceText(visualMarket.price);
  liveBid.textContent=priceText(visualMarket.bidPrice);
  liveAsk.textContent=priceText(visualMarket.askPrice);
  liveSpread.textContent=spreadText(visualMarket.spreadBps);
  liveAge.textContent=evidenceAgeText(visualMarket.observedAt);
  liveSource.textContent=sourceLabel;
}

async function loadRestMarket(){
  try{
    const response=await fetch('/api/market/live?symbol=BNBUSDT',{cache:'no-store'});
    const payload=await response.json();
    if(!response.ok||payload?.ok!==true)throw new Error(payload?.error?.message||'Market request failed');
    visualMarket={...visualMarket,...payload.data};
    renderVisualMarket('BINANCE PUBLIC REST');
    if(!window.__circuitMarketSocketOpen)updateLiveStatus('fallback','REST FALLBACK');
  }catch{if(!window.__circuitMarketSocketOpen)updateLiveStatus('error','MARKET OFFLINE')}
}

function startRestFallback(){
  if(restTimer)return;
  loadRestMarket();
  restTimer=setInterval(loadRestMarket,4000);
}
function stopRestFallback(){if(restTimer){clearInterval(restTimer);restTimer=null}}

function applyStreamMessage(message){
  const stream=String(message?.stream??'');
  const data=message?.data??{};
  const receivedAt=new Date().toISOString();
  if(stream.endsWith('@trade')){
    const price=Number(data.p);
    if(Number.isFinite(price)&&price>0)visualMarket.price=price;
    const tradeMs=Number(data.T??data.E);
    visualMarket.observedAt=Number.isFinite(tradeMs)?new Date(tradeMs).toISOString():receivedAt;
  }
  if(stream.endsWith('@bookTicker')){
    const bid=Number(data.b),ask=Number(data.a);
    if(Number.isFinite(bid)&&bid>0)visualMarket.bidPrice=bid;
    if(Number.isFinite(ask)&&ask>=bid)visualMarket.askPrice=ask;
    visualMarket.observedAt=receivedAt;
    deriveSpread();
  }
  renderVisualMarket('BINANCE PUBLIC WS');
}

function connectMarketStream(url,isFallback=false){
  if(typeof WebSocket==='undefined'){startRestFallback();return}
  let socket;
  try{socket=new WebSocket(url)}catch{startRestFallback();return}
  socket.addEventListener('open',()=>{window.__circuitMarketSocketOpen=true;stopRestFallback();updateLiveStatus('live',isFallback?'LIVE · WS FALLBACK':'LIVE · MARKET-ONLY WS')});
  socket.addEventListener('message',event=>{try{applyStreamMessage(JSON.parse(event.data))}catch{}});
  socket.addEventListener('error',()=>{try{socket.close()}catch{}});
  socket.addEventListener('close',()=>{
    window.__circuitMarketSocketOpen=false;
    if(!isFallback&&!fallbackStarted){fallbackStarted=true;updateLiveStatus('connecting','RECONNECTING');setTimeout(()=>connectMarketStream(FALLBACK_STREAM,true),800)}else startRestFallback();
  });
}

function traceEvidenceAge(trace){const decision=Date.parse(trace?.timestamp??''),observed=Date.parse(trace?.evidence?.observedAt??'');if(!Number.isFinite(decision)||!Number.isFinite(observed))return '—';const delta=decision-observed;return delta<0?'FUTURE':`${(delta/1000).toFixed(3)} s`}
function renderLiveEvaluation(data){
  const {market,trace,accountState,binanceWrites,executionAttempted}=data;
  visualMarket={...visualMarket,...market};
  renderVisualMarket('BINANCE PUBLIC REST · EVALUATED');
  const reasons=trace.reasonCodes?.length?trace.reasonCodes:['ALL_CHECKS_PASSED'];
  const verdict=escapeHtml(trace.decision);
  liveResult.dataset.state=trace.decision.toLowerCase();
  liveResult.innerHTML=`<div class="result-verdict ${escapeHtml(trace.decision.toLowerCase())}">${verdict}</div><strong>${trace.decision==='ALLOW'?'Inside the active mandate':'CIRCUIT contained the proposal'}</strong><div class="reason-stack">${reasons.map(code=>`<code>${escapeHtml(code)}</code>`).join('')}</div><div class="live-result-grid"><span>Binance evidence <b>${escapeHtml(priceText(market.price))} USDT</b></span><span>CIRCUIT evidence <b>${escapeHtml(priceText(trace.evidence?.ticker?.price))} USDT</b></span><span>Evidence age <b>${escapeHtml(traceEvidenceAge(trace))}</b></span><span>Trace <b>${escapeHtml(trace.traceId)}</b></span><span>Account state <b>${escapeHtml(accountState)}</b></span><span>Binance writes <b>${escapeHtml(binanceWrites)}</b></span></div><p>${executionAttempted?'Execution was attempted.':'Evaluation stopped before execution. No Binance trading or mutation call was made.'}</p>`;
}

async function evaluateLiveIntent(){
  const requestedUsd=Number(liveAmount?.value);
  if(!Number.isFinite(requestedUsd)||requestedUsd<=0){liveResult.dataset.state='error';liveResult.innerHTML='<div class="result-verdict error">ERROR</div><strong>Enter a positive USD amount</strong><p>Try $8 or $100.</p>';return}
  liveEvaluate.disabled=true;
  liveResult.dataset.state='running';
  liveResult.innerHTML='<span class="result-spinner" aria-hidden="true"></span><strong>Fetching fresh Binance evidence…</strong><p>Server-side public market snapshot → CIRCUIT policy → Flight Recorder. No execution.</p>';
  try{
    const response=await fetch('/api/live-simulation/evaluate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({requestedUsd})});
    const payload=await response.json();
    if(!response.ok||payload?.ok!==true)throw new Error(payload?.error?.message||'Live evaluation failed');
    renderLiveEvaluation(payload.data);
  }catch(error){liveResult.dataset.state='error';liveResult.innerHTML=`<div class="result-verdict error">ERROR</div><strong>Live evaluation could not complete</strong><p>${escapeHtml(error.message)}</p>`}finally{liveEvaluate.disabled=false}
}

async function runScenario(card,{manageBusy=true}={}){
  const id=card.dataset.scenario;
  const expected=card.dataset.expected;
  if(manageBusy)setCardsDisabled(true);
  card.classList.add('is-running');
  resultRoot.innerHTML=`<span class="result-spinner" aria-hidden="true"></span><strong>Evaluating ${escapeHtml(id)}…</strong><p>Intent → policy → drift → verdict → Flight Recorder</p>`;
  try{
    const response=await fetch(`/api/scenarios/${id}/run`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
    const payload=await response.json();
    if(!response.ok||payload?.ok!==true) throw new Error(payload?.error?.message||'Scenario request failed');
    const trace=payload.data.trace;
    const actual=trace.decision;
    const matched=actual===expected;
    const reasons=trace.reasonCodes?.length?trace.reasonCodes:['ALL_CHECKS_PASSED'];
    resultRoot.innerHTML=`<div class="result-verdict ${escapeHtml(actual.toLowerCase())}">${escapeHtml(actual)}</div><strong>${matched?'Expected control response':'Unexpected control response'}</strong><p><span>Expected</span> ${escapeHtml(expected)} · <span>Actual</span> ${escapeHtml(actual)}</p><div class="reason-stack">${reasons.map(reason=>`<code>${escapeHtml(reason)}</code>`).join('')}</div><small>Trace ${escapeHtml(trace.traceId)} · runtime ${escapeHtml(trace.runtimeBefore)} → ${escapeHtml(trace.runtimeAfter)}</small>`;
    const item={id,expected,actual,matched,reasons,traceId:trace.traceId};
    history.unshift(item);
    renderHistory();
    return item;
  }catch(error){
    resultRoot.innerHTML=`<div class="result-verdict error">ERROR</div><strong>Scenario could not complete</strong><p>${escapeHtml(error.message)}</p>`;
    const item={id,expected,actual:'ERROR',matched:false,reasons:[error.message],traceId:null};
    history.unshift(item);
    renderHistory();
    return item;
  }finally{
    card.classList.remove('is-running');
    if(manageBusy)setCardsDisabled(false);
  }
}

function renderHistory(){
  if(!history.length){historyRoot.innerHTML='<small>No scenarios run yet.</small>';return}
  historyRoot.innerHTML=history.slice(0,8).map(item=>`<div class="history-row"><span><strong>${escapeHtml(item.id.replaceAll('-',' '))}</strong><small>${escapeHtml(item.reasons[0])}</small></span><b data-match="${item.matched}">${escapeHtml(item.actual)}</b></div>`).join('');
}

async function runJudgeMode(){
  if(!judgeButton||!judgeSummary)return;
  judgeButton.disabled=true;
  setCardsDisabled(true);
  judgeSummary.dataset.state='running';
  judgeSummary.innerHTML='<strong>Judge Mode running…</strong><p>Executing all eight deterministic scenarios through the live CIRCUIT simulation API.</p>';
  const results=[];
  try{
    for(const card of cards) results.push(await runScenario(card,{manageBusy:false}));
    const matchedCount=results.filter(item=>item.matched).length;
    const allMatched=matchedCount===cards.length;
    judgeSummary.dataset.state=allMatched?'pass':'fail';
    judgeSummary.innerHTML=`<strong>${matchedCount} / ${cards.length} controls matched expected verdicts</strong><p>${allMatched?'All canonical containment scenarios reproduced successfully.':'One or more scenarios did not match the canonical verdict; inspect the results before relying on this demo.'}</p><div class="judge-grid">${results.map(item=>`<span class="judge-chip" data-match="${item.matched}"><span>${escapeHtml(item.id.replaceAll('-',' '))}</span><b>${escapeHtml(item.actual)}</b></span>`).join('')}</div>`;
  }finally{
    setCardsDisabled(false);
    judgeButton.disabled=false;
  }
}

cards.forEach(card=>card.addEventListener('click',()=>runScenario(card)));
judgeButton?.addEventListener('click',runJudgeMode);
liveEvaluate?.addEventListener('click',evaluateLiveIntent);
clearButton?.addEventListener('click',()=>{history.length=0;renderHistory();resultRoot.innerHTML='<span class="result-icon">◇</span><strong>Select a scenario</strong><p>CIRCUIT will evaluate it through the same policy and runtime pipeline and show the expected versus actual verdict.</p>';if(judgeSummary){judgeSummary.dataset.state='idle';judgeSummary.innerHTML='<strong>Ready for Judge Mode</strong><p>Run all eight deterministic scenarios in sequence and compare actual versus expected verdicts.</p>'}});

if(livePrice){
  loadRestMarket();
  connectMarketStream(PRIMARY_STREAM);
  setInterval(()=>{if(visualMarket.observedAt)liveAge.textContent=evidenceAgeText(visualMarket.observedAt)},500);
}
