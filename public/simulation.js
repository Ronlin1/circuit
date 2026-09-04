const cards=[...document.querySelectorAll('[data-scenario]')];
const resultRoot=document.querySelector('#simulation-result');
const historyRoot=document.querySelector('#simulation-history');
const clearButton=document.querySelector('#clear-simulation-history');
const history=[];

function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]))}

async function runScenario(card){
  const id=card.dataset.scenario;
  const expected=card.dataset.expected;
  cards.forEach(item=>item.disabled=true);
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
    history.unshift({id,expected,actual,matched,reasons,traceId:trace.traceId});
    renderHistory();
  }catch(error){
    resultRoot.innerHTML=`<div class="result-verdict error">ERROR</div><strong>Scenario could not complete</strong><p>${escapeHtml(error.message)}</p>`;
  }finally{
    card.classList.remove('is-running');
    cards.forEach(item=>item.disabled=false);
  }
}

function renderHistory(){
  if(!history.length){historyRoot.innerHTML='<small>No scenarios run yet.</small>';return}
  historyRoot.innerHTML=history.slice(0,8).map(item=>`<div class="history-row"><span><strong>${escapeHtml(item.id.replaceAll('-',' '))}</strong><small>${escapeHtml(item.reasons[0])}</small></span><b data-match="${item.matched}">${escapeHtml(item.actual)}</b></div>`).join('');
}

cards.forEach(card=>card.addEventListener('click',()=>runScenario(card)));
clearButton?.addEventListener('click',()=>{history.length=0;renderHistory();resultRoot.innerHTML='<span class="result-icon">◇</span><strong>Select a scenario</strong><p>CIRCUIT will evaluate it through the same policy and runtime pipeline and show the expected versus actual verdict.</p>'});
