import {Report,values,variation,num} from './report';
export const storeKey=(s:string)=>s.trim().toLocaleLowerCase('pt-BR');
export const ratio=(a:number|null|undefined,b:number|null|undefined)=>a==null||b==null||b<=0?null:a/b*100;
export function latestPerStore(reports:Report[],period:string,drafts=false){
 const found=new Map<string,Report>();
 const sorted=[...reports].filter(r=>(drafts||r.status==='reviewed')&&r.current===period).sort((a,b)=>(b.updated||'').localeCompare(a.updated||''));
 for(const r of sorted)if(!found.has(storeKey(r.store)))found.set(storeKey(r.store),r);
 return [...found.values()];
}
export function historyFor(reports:Report[],store:string){
 const found=new Map<string,{period:string;net:number|null;orders:number|null;ticket:number|null;conversion:number|null}>();
 for(const r of [...reports].filter(r=>r.status==='reviewed'&&storeKey(r.store)===storeKey(store)).sort((a,b)=>(b.updated||'').localeCompare(a.updated||'')))for(const p of [r.current,r.previous]){
  if(found.has(p))continue;const f=values(r,'finance',p),s=values(r,'sales',p),v=values(r,'funnel',p);
  found.set(p,{period:p,net:f.net??null,orders:s.orders??null,ticket:s.ticket??null,conversion:ratio(v.completed,v.visits)});
 }
 return [...found.values()].sort((a,b)=>a.period.localeCompare(b.period));
}
export function alertsFor(r:Report){
 const alerts:{title:string;detail:string}[]=[];const q=r.evidence.find(e=>e.category==='quality')?.values||{};
 for(const [key,label] of [['rating','Avaliação abaixo da meta'],['cancellations','Cancelamentos acima da meta'],['calls','Chamados acima da meta']])if(q[key]!=null&&r.targets[key]!=null&&(key==='rating'?q[key]!<r.targets[key]:q[key]!>r.targets[key]))alerts.push({title:label,detail:`${num(q[key])}${key==='rating'?' estrelas':'%'} · meta ${num(r.targets[key])}${key==='rating'?' estrelas':'%'} · ${r.qualityPeriod||'período da qualidade não informado'}`});
 const a=values(r,'finance',r.previous),b=values(r,'finance',r.current),d=variation(a.net,b.net);if(d!=null&&d<0)alerts.push({title:'Faturamento líquido em queda',detail:`Redução de ${Math.abs(d).toLocaleString('pt-BR',{maximumFractionDigits:2})}% entre os meses comparados.`});
 const f=values(r,'funnel',r.current),c=ratio(f.completed,f.visits);if(c!=null&&r.targets.completed!=null&&c<r.targets.completed)alerts.push({title:'Conversão abaixo da meta',detail:`${c.toLocaleString('pt-BR',{maximumFractionDigits:2})}% das visitas concluíram o pedido · meta ${r.targets.completed}%.`});
 return alerts;
}
