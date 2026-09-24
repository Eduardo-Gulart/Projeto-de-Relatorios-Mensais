import {access,allowReport,visibleReports} from '@/lib/team';

import {database,identity,sameOrigin,fail} from '@/lib/storage';

import {Report,issues} from '@/lib/report';

import {nextMonth,storeKey} from '@/lib/next-month';

export async function POST(req:Request){try{sameOrigin(req);const actor=await access(req),owner=actor.subject,{id}=await req.json() as {id?:unknown};if(typeof id!=='string')return Response.json({error:'Selecione um relatório.'},{status:400});const db=database();const source=await db.prepare('SELECT owner,payload FROM reports WHERE id=?').bind(id).first<{owner:string;payload:string}>();if(!source)return Response.json({error:'Relatório não encontrado.'},{status:404});await allowReport(actor,source);const r=JSON.parse(source.payload) as Report;if(r.status!=='reviewed'||issues(r).length)return Response.json({error:'Finalize a conferência antes de criar o próximo mês.'},{status:400});const next=nextMonth(r);const results=await visibleReports(actor);const existing=results.map(x=>({...JSON.parse(x.payload),updated:x.updated} as Report)).find(x=>(r.storeId?x.storeId===r.storeId:storeKey(x.store)===storeKey(r.store))&&x.current===next.current);if(existing)return Response.json({report:existing,existing:true});

const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([actor.team?'team':owner,r.storeId||storeKey(r.store),next.current]))));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=Array.from(bytes.slice(0,16),x=>x.toString(16).padStart(2,'0')).join('');next.id=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;const updated=new Date().toISOString();const result=await db.prepare('INSERT INTO reports (id,owner,payload,updated) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(next.id,owner,JSON.stringify(next),updated).run();const saved=await db.prepare('SELECT owner,payload,updated FROM reports WHERE id=?').bind(next.id).first<{owner:string;payload:string;updated:string}>();if(!saved)throw new Error('Falha ao criar mês');await allowReport(actor,saved);return Response.json({report:{...JSON.parse(saved.payload),updated:saved.updated},existing:!result.meta.changes});}catch(e){return fail(e)}}

