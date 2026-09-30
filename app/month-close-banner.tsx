"use client";
import {useEffect,useState} from 'react';
import {CalendarClock} from 'lucide-react';
import {Report,month} from '@/lib/report';
import {monthCloseReminder} from '@/lib/month-close';
export default function MonthCloseBanner({report,reports}:{report:Report;reports:Report[]}){
 const [now,setNow]=useState<Date|null>(null);
 useEffect(()=>{const tick=()=>setNow(new Date());tick();const timer=setInterval(tick,60000);window.addEventListener('focus',tick);return()=>{clearInterval(timer);window.removeEventListener('focus',tick)}},[]);
 const reminder=now?monthCloseReminder(report,reports,now):null;
 if(!reminder)return null;
 return <aside className="notice month-close-banner" role="status"><CalendarClock size={22} aria-hidden="true"/><div><strong>{reminder.remaining===0?'Hoje é o último dia do mês.':`Falta${reminder.remaining===1?'':'m'} ${reminder.remaining} dia${reminder.remaining===1?'':'s'} para o fim do mês.`}</strong><p>O relatório de {month(reminder.period)} da loja {report.store} ainda não está conferido. Prepare os dados e finalize a conferência quando o período estiver completo.</p></div></aside>;
}
