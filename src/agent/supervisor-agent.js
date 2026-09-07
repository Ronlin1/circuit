import { createActionIntent } from '../domain/intent.js';

const EXECUTABLE_DECISIONS=new Set(['ALLOW','RESIZE']);

export class CircuitSupervisorAgent {
  constructor({planner,services,approvalGate=async()=>false,agentId='circuit-supervisor-agent'}={}){
    if(!planner||typeof planner.plan!=='function') throw new TypeError('planner.plan is required');
    if(!services?.gateway||typeof services.getCurrentMandate!=='function') throw new TypeError('CIRCUIT services are required');
    if(typeof approvalGate!=='function') throw new TypeError('approvalGate must be a function');
    this.planner=planner;
    this.services=services;
    this.approvalGate=approvalGate;
    this.agentId=String(agentId).trim()||'circuit-supervisor-agent';
  }

  async run({goal,execute=false}={}){
    const normalizedGoal=String(goal??'').trim();
    if(!normalizedGoal) throw new TypeError('goal is required');
    const mandate=this.services.getCurrentMandate();
    if(!mandate) throw new Error('ACTIVE_MANDATE_REQUIRED');

    const proposal=await this.planner.plan({goal:normalizedGoal,mandate,agentId:this.agentId});
    const intent=createActionIntent({...proposal,agentId:this.agentId});
    const trace=await this.services.gateway.evaluate(intent,{mandate,now:this.services.currentTime()});

    if(!EXECUTABLE_DECISIONS.has(trace.decision)){
      return Object.freeze({status:'CONTAINED',proposal:intent,trace,approved:false});
    }
    if(!execute){
      return Object.freeze({status:'AWAITING_APPROVAL',proposal:intent,trace,approved:false});
    }

    const approved=Boolean(await this.approvalGate({goal:normalizedGoal,intent,trace}));
    if(!approved){
      return Object.freeze({status:'APPROVAL_DECLINED',proposal:intent,trace,approved:false});
    }

    const execution=await this.services.gateway.executeEvaluated(trace.traceId);
    return Object.freeze({status:'EXECUTED',proposal:intent,trace,approved:true,execution});
  }
}
