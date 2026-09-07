const navToggle=document.querySelector('[data-nav-toggle]');
const header=document.querySelector('.site-header');
const liveIndicator=document.querySelector('[data-live-indicator]');

function normalizePath(value){
  if(!value) return '/';
  const path=value.split(/[?#]/,1)[0]||'/';
  return path==='/'?'/':`${path.replace(/\/+$/,'')}/`;
}

function ensureProofNavigation(){
  const nav=document.querySelector('.site-nav');
  if(!nav||nav.querySelector('a[href="/proof/"]')) return;
  const link=document.createElement('a');
  link.href='/proof/';
  link.textContent='Proof';
  const before=nav.querySelector('a[href="/how-it-works/"]');
  nav.insertBefore(link,before??null);
}

function markActiveNavigation(){
  const current=normalizePath(window.location.pathname);
  document.querySelectorAll('.site-nav a').forEach(link=>{
    if(normalizePath(link.getAttribute('href'))===current) link.setAttribute('aria-current','page');
  });
}

function setupMobileNavigation(){
  if(!navToggle||!header) return;
  navToggle.addEventListener('click',()=>{
    const open=navToggle.getAttribute('aria-expanded')==='true';
    navToggle.setAttribute('aria-expanded',String(!open));
    header.classList.toggle('nav-open',!open);
  });
}

function setLiveState(state,label){
  if(!liveIndicator) return;
  liveIndicator.classList.remove('is-live','is-degraded','is-checking');
  liveIndicator.classList.add(state);
  const text=liveIndicator.querySelector('b');
  if(text) text.textContent=label;
}

async function checkHealth(){
  setLiveState('is-checking','CHECKING');
  try{
    const response=await fetch('/api/health',{headers:{accept:'application/json'},cache:'no-store'});
    const payload=await response.json();
    if(!response.ok||payload?.ok!==true) throw new Error('health check failed');
    setLiveState('is-live','LIVE DEMO');
  }catch{
    setLiveState('is-degraded','DEGRADED');
  }
}

ensureProofNavigation();
markActiveNavigation();
setupMobileNavigation();
checkHealth();
