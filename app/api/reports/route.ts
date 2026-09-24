import {access,visibleReports,allowReport,allowStore,checkImages} from '@/lib/team';

import {reportSchema} from '@/lib/report-schema';

import {issues,Report} from '@/lib/report';

import { database,identity,sameOrigin,fail } from '@/lib/storage';

export async function GET(req:Request){try{const a=await access(req);const rows=await visibleReports(a);return Response.json(rows.map(r=>({...JSON.parse(r.payload),updated:r.updated})),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return fail(e);}}

export async function POST(req:Request){try{sameOrigin(req);const actor=await access(req);const owner=actor.subject;if(Number(req.headers.get('content-length'))>600000)return Response.json({error:'Relatório muito grande.'},{status:413});const parsed=reportSchema.safeParse(await req.json());if(!parsed.success)return Response.json({error:'Verifique os campos do relatório e o nome da loja.'},{status:400});const r=parsed.data;if(r.status==='reviewed'&&issues(r as Report).length)return Response.json({error:'Conclua a conferência dos indicadores antes de finalizar.'},{status:400});const db=database();const existing=await db.prepare('SELECT owner,updated,payload FROM reports WHERE id = ?').bind(r.id).first<{owner:string;updated:string;payload:string}>();if(existing)await allowReport(actor,existing);if(actor.team){const store=await allowStore(actor,r.storeId);if(existing&&JSON.parse(existing.payload).storeId&&JSON.parse(existing.payload).storeId!==store.id)return Response.json({error:'Não é possível mover um relatório para outra loja.'},{status:400});r.store=store.name;await checkImages(actor,r);}

const expected=req.headers.get('X-Report-Version')||'';

const conflict=()=>Response.json({error:'Outra aba atualizou este relatório. Abra a versão salva ou salve suas alterações como uma cópia.'},{status:409});

if(!existing&&expected)return Response.json({error:'Este relatório foi excluído. Salve como cópia se desejar recuperar suas alterações.'},{status:409});

if(existing&&existing.updated!==expected)return conflict();

const updated=new Date(Math.max(Date.now(),existing?Date.parse(existing.updated)+1:0)).toISOString();

const result=existing?await db.prepare('UPDATE reports SET payload=?,updated=? WHERE id=? AND owner=? AND updated=?').bind(JSON.stringify(r),updated,r.id,existing.owner,expected).run():await db.prepare('INSERT INTO reports (id,owner,payload,updated) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(r.id,owner,JSON.stringify(r),updated).run();

if(!result.meta.changes)return conflict();return Response.json({ok:true,id:r.id,updated});}catch(e){return fail(e);}}



export async function DELETE(req:Request){

 try{

  sameOrigin(req);const actor=await access(req);const owner=actor.subject;const id=new URL(req.url).searchParams.get('id');

  if(!id||!reportSchema.shape.id.safeParse(id).success)return Response.json({error:'Selecione um relatório válido.'},{status:400});

  const expected=req.headers.get('X-Report-Version');if(!expected)return Response.json({error:'Atualize o histórico antes de excluir.'},{status:409});

  const db=database();const existing=await db.prepare('SELECT owner,payload,updated FROM reports WHERE id=?').bind(id).first<{owner:string;payload:string;updated:string}>();

  if(!existing)return Response.json({error:'Relatório não encontrado ou já excluído.'},{status:404});await allowReport(actor,existing);

  if(existing.updated!==expected)return Response.json({error:'O relatório mudou em outra aba. Atualize o histórico e confira a versão atual antes de excluir.'},{status:409});

  const result=await db.prepare('DELETE FROM reports WHERE id=? AND owner=? AND updated=?').bind(id,existing.owner,expected).run();

  if(!result.meta.changes)return Response.json({error:'O relatório mudou. Atualize o histórico antes de excluir.'},{status:409});

  // Prints podem ser compartilhados por relatórios do mês seguinte e são preservados.

  return Response.json({ok:true,id});

 }catch(e){return fail(e)}

}

