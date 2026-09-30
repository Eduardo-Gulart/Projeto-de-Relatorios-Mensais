import {Report,values,variation,num} from './report';
export const storeKey=(s:string)=>s.trim().toLocaleLowerCase('pt-BR');
export const reportStoreKey=(r:Pick<Report,'store'|'storeId'>)=>r.storeId||storeKey(r.store);
export const ratio=(a:number|null|undefined,b:number|null|undefined)=>a==null||b==null||b<=0?null:a/b*100;
export function latestPerStore(reports:Report[],period:string,drafts=false){
 const found=new Map<string,Report>();
 const sorted=[...reports].filter(r=>(drafts||r.status==='reviewed')&&r.current===period).sort((a,b)=>(b.updated||'').localeCompare(a.updated||''));
 for(const r of sorted)if(!found.has(reportStoreKey(r)))found.set(reportStoreKey(r),r);
 return [...found.values()];
}
export type HistoryPoint={period:string;net:number|null;orders:number|null;ticket:number|null;conversion:number|null;status:Report['status']|null};
export function historyFor(reports:Report[],store:string|Pick<Report,'store'|'storeId'>,drafts=false){
 const found=new Map<string,HistoryPoint>();
 const key=typeof store==='string'?storeKey(store):reportStoreKey(store);
 const matching=reports.filter(r=>(drafts||r.status==='reviewed')&&(typeof store==='string'?storeKey(r.store):reportStoreKey(r))===key).sort((a,b)=>(b.updated||'').localeCompare(a.updated||'')||a.id.localeCompare(b.id));
 for(const r of matching)for(const p of [r.current,r.previous]){
  if(found.has(p)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(p))continue;const f=values(r,'finance',p),s=values(r,'sales',p),v=values(r,'funnel',p);
  found.set(p,{period:p,net:f.net??null,orders:s.orders??null,ticket:s.ticket??null,conversion:ratio(v.completed,v.visits),status:r.status});
 }
 const sorted=[...found.values()].sort((a,b)=>a.period.localeCompare(b.period));if(!sorted.length)return [];
 // A missing calendar month is a gap, not an interpolated observation.
 const index=(p:string)=>Number(p.slice(0,4))*12+Number(p.slice(5))-1;
 const first=index(sorted[0].period),last=index(sorted.at(-1)!.period);
 if(last-first>1200)return sorted;
 const timeline:HistoryPoint[]=[];
 for(let n=first;n<=last;n++){const period=String(Math.floor(n/12)).padStart(4,'0')+'-'+String(n%12+1).padStart(2,'0');timeline.push(found.get(period)||{period,net:null,orders:null,ticket:null,conversion:null,status:null});}
 return timeline;
}
export type AlertKind='net'|'conversion'|'cancellations'|'calls'|'rating';
export type DashboardAlert={kind:AlertKind;title:string;detail:string};
const actionRules:Record<AlertKind,{priority:'alta'|'média';order:number;action:string}>={
 net:{priority:'alta',order:0,action:'Compare pedidos, ticket médio, taxas e promoções com o mês anterior. Identifique o que mais reduziu o líquido e revise os descontos dos produtos envolvidos antes de ampliar campanhas.'},
 conversion:{priority:'alta',order:1,action:'Localize a maior perda entre as etapas do funil. Revise fotos e descrições dos itens mais visitados e teste ajustes de preço ou promoção nos produtos com maior abandono.'},
 cancellations:{priority:'média',order:2,action:'Confira os motivos dos cancelamentos. Atualize a disponibilidade dos itens, ajuste o tempo de preparo e confirme a capacidade da equipe nos horários de pico.'},
 calls:{priority:'média',order:3,action:'Revise os motivos dos chamados e adote uma conferência de itens, adicionais, embalagem e identificação do pedido antes da entrega.'},
 rating:{priority:'média',order:4,action:'Leia as avaliações recentes, identifique reclamações recorrentes e combine uma correção com a equipe. Responda aos clientes e acompanhe as novas avaliações.'}
};
export function alertsFor(r:Report):DashboardAlert[]{
 const alerts:DashboardAlert[]=[];const q=r.evidence.find(e=>e.category==='quality')?.values||{};
 for(const [key,label] of [['rating','Avaliação abaixo da meta'],['cancellations','Cancelamentos acima da meta'],['calls','Chamados acima da meta']] as const)if(q[key]!=null&&r.targets[key]!=null&&(key==='rating'?q[key]!<r.targets[key]:q[key]!>r.targets[key]))alerts.push({kind:key,title:label,detail:`${num(q[key])}${key==='rating'?' estrelas':'%'} · meta ${num(r.targets[key])}${key==='rating'?' estrelas':'%'} · ${r.qualityPeriod||'período da qualidade não informado'}`});
 const a=values(r,'finance',r.previous),b=values(r,'finance',r.current),d=variation(a.net,b.net);if(d!=null&&d<0)alerts.push({kind:'net',title:'Faturamento líquido em queda',detail:`Redução de ${Math.abs(d).toLocaleString('pt-BR',{maximumFractionDigits:2})}% entre os meses comparados.`});
 const f=values(r,'funnel',r.current),c=ratio(f.completed,f.visits);if(c!=null&&r.targets.completed!=null&&c<r.targets.completed)alerts.push({kind:'conversion',title:'Conversão abaixo da meta',detail:`${c.toLocaleString('pt-BR',{maximumFractionDigits:2})}% das visitas concluíram o pedido · meta ${r.targets.completed}%.`});
 return alerts.sort((a,b)=>actionRules[a.kind].order-actionRules[b.kind].order);
}
export function actionPlanFor(r:Report){return alertsFor(r).map(alert=>({...alert,priority:actionRules[alert.kind].priority,action:actionRules[alert.kind].action}));}

export function chartScale(values:number[]){
 const valid=values.filter(Number.isFinite),min=Math.min(0,...valid),max=Math.max(1,...valid);
 const raw=(max-min)/4,power=10**Math.floor(Math.log10(raw)),fraction=raw/power;
 const step=(fraction<=1?1:fraction<=2?2:fraction<=2.5?2.5:fraction<=5?5:10)*power;
 const low=Math.floor(min/step)*step,high=Math.ceil(max/step)*step;
 const ticks=Array.from({length:Math.round((high-low)/step)+1},(_,i)=>Number((low+i*step).toPrecision(12)));
 return {low,high,ticks};
}
export function funnelLoss(previous:number|null|undefined,current:number|null|undefined){
 return previous==null||current==null||previous<=0||current<0?null:(previous-current)/previous*100;
}
