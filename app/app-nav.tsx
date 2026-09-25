"use client";
import {FileText,ChartNoAxesCombined,Users,LogOut} from 'lucide-react';
import {useSession} from '@/lib/use-session';
export default function AppNav({active}:{active:'reports'|'dashboard'|'team'}){
 const {session}=useSession();
 return <header className="app-nav"><a className="app-logo" href="/" aria-label="Relata, relatórios"><span><FileText size={21}/></span>Relata</a><nav aria-label="Navegação principal"><a href="/" aria-current={active==='reports'?'page':undefined}><FileText size={17}/>Relatórios</a><a href="/dashboard" aria-current={active==='dashboard'?'page':undefined}><ChartNoAxesCombined size={17}/>Dashboard</a>{session?.admin&&<a href="/team" aria-current={active==='team'?'page':undefined}><Users size={17}/>Equipe e lojas</a>}</nav><div className="app-account"><span title={session?.email}>{session?.email||'Meu espaço'}<small>{session?.admin?'Administrador':'Gestão de lojas'}</small></span><a href="/signout-with-chatgpt?return_to=/" aria-label="Sair da conta" title="Sair"><LogOut size={18}/></a></div></header>
}
