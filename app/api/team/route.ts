import {z} from 'zod';
import {access,requireAdmin,storesFor,AccessError} from '@/lib/team';
import {database,sameOrigin,fail} from '@/lib/storage';
const email=z.string().trim().toLowerCase().email().max(200);
const change=z.discriminatedUnion('action',[
 z.object({action:z.literal('member'),email,name:z.string().trim().min(1).max(200),active:z.boolean()}),
 z.object({action:z.literal('store'),id:z.string().uuid().optional(),name:z.string().trim().min(1).max(200),assignee:email.nullable(),legacyName:z.string().max(200).optional()})
]);
export async function GET(req:Request){try{const a=await access(req);requireAdmin(a);const db=database();const members=(await db.prepare('SELECT email,name,active FROM team_members ORDER BY name').all()).results;const legacy=(await db.prepare("SELECT DISTINCT json_extract(payload,'$.store') AS name FROM reports WHERE json_extract(payload,'$.storeId') IS NULL ORDER BY name").all()).results;return Response.json({members,stores:await storesFor(a),legacy},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return fail(e)}}
export async function POST(req:Request){try{sameOrigin(req);const a=await access(req);requireAdmin(a);const c=change.parse(await req.json()),db=database();
 if(c.action==='member'){if(c.email===a.email)throw new AccessError(400,'A conta administradora não pode ser alterada aqui.');await db.prepare('INSERT INTO team_members(email,name,active) VALUES (?,?,?) ON CONFLICT(email) DO UPDATE SET name=excluded.name,active=excluded.active').bind(c.email,c.name,c.active?1:0).run();}
 else{if(c.assignee&&c.assignee!==a.email&&!await db.prepare('SELECT email FROM team_members WHERE email=? AND active=1').bind(c.assignee).first())throw new AccessError(400,'Cadastre e ative o responsável primeiro.');const id=c.id||crypto.randomUUID();if(c.id&&!await db.prepare('SELECT id FROM team_stores WHERE id=?').bind(id).first())throw new AccessError(404,'Loja não encontrada.');
 const statements=[db.prepare('INSERT INTO team_stores(id,name,assignee) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,assignee=excluded.assignee').bind(id,c.name,c.assignee)];
 if(c.legacyName)statements.push(db.prepare("UPDATE reports SET payload=json_set(payload,'$.storeId',?,'$.store',?),updated=? WHERE json_extract(payload,'$.storeId') IS NULL AND json_extract(payload,'$.store')=?").bind(id,c.name,new Date().toISOString(),c.legacyName));
 statements.push(db.prepare("UPDATE reports SET payload=json_set(payload,'$.store',?),updated=? WHERE json_extract(payload,'$.storeId')=?").bind(c.name,new Date().toISOString(),id));await db.batch(statements);}
 return Response.json({ok:true});}catch(e){if(e instanceof z.ZodError)return Response.json({error:'Confira o nome, o e-mail e a loja.'},{status:400});return fail(e)}}
