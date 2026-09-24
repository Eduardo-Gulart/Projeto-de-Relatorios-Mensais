import {env} from 'cloudflare:workers';
import {database,identity} from './storage';
export class AccessError extends Error { constructor(public status:number,message:string){super(message)} }
export type Access={subject:string;email:string;team:boolean;admin:boolean};
export type TeamStore={id:string;name:string;assignee:string|null};
export function teamEnabled(){return (env as unknown as Record<string,string>).RELATA_TEAM_ENABLED==='true'}
export async function access(req:Request):Promise<Access>{
 const subject=identity(req),email=(req.headers.get('oai-authenticated-user-email')||'').trim().toLowerCase();
 if(!teamEnabled())return {subject,email,team:false,admin:false};
 const adminEmail=(env as unknown as Record<string,string>).RELATA_ADMIN_EMAIL?.trim().toLowerCase();
 if(!adminEmail)throw new AccessError(503,'O administrador ainda precisa configurar o acesso da equipe.');
 if(email===adminEmail)return {subject,email,team:true,admin:true};
 const member=await database().prepare('SELECT subject,active FROM team_members WHERE email=?').bind(email).first<{subject:string|null;active:number}>();
 if(!member?.active||(member.subject&&member.subject!==subject))throw new AccessError(403,'Seu acesso não foi liberado. Fale com o administrador.');
 if(!member.subject){await database().prepare('UPDATE team_members SET subject=? WHERE email=? AND subject IS NULL AND active=1').bind(subject,email).run();const bound=await database().prepare('SELECT subject,active FROM team_members WHERE email=?').bind(email).first<{subject:string;active:number}>();if(bound?.subject!==subject||!bound.active)throw new AccessError(403,'Acesso não autorizado.');}
 return {subject,email,team:true,admin:false};
}
export function requireAdmin(a:Access){if(!a.team||!a.admin)throw new AccessError(403,'Somente o administrador pode gerenciar a equipe.');}
export async function storesFor(a:Access):Promise<TeamStore[]>{if(!a.team)return [];const q=a.admin?database().prepare('SELECT id,name,assignee FROM team_stores ORDER BY name'):database().prepare('SELECT id,name,assignee FROM team_stores WHERE assignee=? ORDER BY name').bind(a.email);return (await q.all<TeamStore>()).results;}
export async function allowStore(a:Access,id:unknown){if(typeof id!=='string'||!id)throw new AccessError(400,'Selecione uma loja cadastrada.');const s=await database().prepare('SELECT id,name,assignee FROM team_stores WHERE id=?').bind(id).first<TeamStore>();if(!s||(!a.admin&&s.assignee!==a.email))throw new AccessError(404,'Loja não encontrada.');return s;}
export async function allowReport(a:Access,row:{owner:string;payload:string}){if(!a.team){if(row.owner!==a.subject)throw new AccessError(404,'Relatório não encontrado.');return}const r=JSON.parse(row.payload);if(a.admin&&!r.storeId)return;await allowStore(a,r.storeId);}
export async function visibleReports(a:Access){const q=!a.team?database().prepare('SELECT owner,payload,updated FROM reports WHERE owner=? ORDER BY updated DESC LIMIT 1001').bind(a.subject):a.admin?database().prepare('SELECT owner,payload,updated FROM reports ORDER BY updated DESC LIMIT 1001'):database().prepare("SELECT r.owner,r.payload,r.updated FROM reports r JOIN team_stores s ON s.id=json_extract(r.payload,'$.storeId') WHERE s.assignee=? ORDER BY r.updated DESC LIMIT 1001").bind(a.email);return (await q.all<{owner:string;payload:string;updated:string}>()).results;}
export async function imageKey(a:Access,id:string,storeId?:string){
 if(!a.team)return encodeURIComponent(a.subject)+'/'+id;
 const asset=await database().prepare('SELECT owner,store_id FROM team_assets WHERE id=?').bind(id).first<{owner:string;store_id:string}>();
 if(asset){await allowStore(a,asset.store_id);if(storeId&&asset.store_id!==storeId)throw new AccessError(400,'O print pertence a outra loja.');return encodeURIComponent(asset.owner)+'/'+id;}
 const rows=await database().prepare("SELECT DISTINCT r.owner,r.payload FROM reports r,json_each(r.payload,'$.evidence') e WHERE json_extract(e.value,'$.url')=?").bind('/api/uploads?id='+id).all<{owner:string;payload:string}>();
 for(const row of rows.results){try{await allowReport(a,row);if(storeId&&JSON.parse(row.payload).storeId!==storeId)continue;return encodeURIComponent(row.owner)+'/'+id;}catch{}}
 throw new AccessError(404,'Print não encontrado.');
}
export async function checkImages(a:Access,r:{storeId?:string;evidence:{url:string}[]}){if(!a.team)return;for(const e of r.evidence){const m=/^\/api\/uploads\?id=([a-zA-Z0-9-]+)$/.exec(e.url);if(!m)throw new AccessError(400,'Envie os prints da loja antes de salvar.');await imageKey(a,m[1],r.storeId);}}
