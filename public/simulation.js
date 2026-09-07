const cards=[...document.querySelectorAll('[data-scenario]')];
const resultRoot=document.querySelector('#simulation-result');
const historyRoot=document.querySelector('#simulation-history');
const clearButton=document.querySelector('#clear-simulation-history');
const judgeButton=document.querySelector('#run-judge-mode');
const judgeSummary=document.querySelector('#judge-mode-summary');
const history=[];

function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]))}
function setCardsDisabled(disabled){cards.forEach(item=>item.disabled=disabled)}

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
clearButton?.addEventListener('click',()=>{history.length=0;renderHistory();resultRoot.innerHTML='<span class="result-icon">◇</span><strong>Select a scenario</strong><p>CIRCUIT will evaluate it through the same policy and runtime pipeline and show the expected versus actual verdict.</p>';if(judgeSummary){judgeSummary.dataset.state='idle';judgeSummary.innerHTML='<strong>Ready for Judge Mode</strong><p>Run all eight deterministic scenarios in sequence and compare actual versus expected verdicts.</p>'}});
