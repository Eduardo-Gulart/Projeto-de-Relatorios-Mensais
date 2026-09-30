import {Report} from './report';
import {reportStoreKey} from './dashboard';
export function monthCloseReminder(current:Report,reports:Report[],now:Date){
 if(!current.store.trim()||current.store==='Loja demonstrativa')return null;
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=(name:string)=>parts.find(p=>p.type===name)!.value;
 const period=part('year')+'-'+part('month');
 const remaining=new Date(Date.UTC(Number(part('year')),Number(part('month')),0)).getUTCDate()-Number(part('day'));
 if(remaining>5)return null;
 const effective=[current,...reports.filter(r=>r.id!==current.id)];
 if(effective.some(r=>reportStoreKey(r)===reportStoreKey(current)&&r.current===period&&r.status==='reviewed'))return null;
 return {period,remaining};
}
