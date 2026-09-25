import {z} from 'zod';
import {access,AccessError,TeamStore} from '@/lib/team';
import {database,sameOrigin,fail} from '@/lib/storage';
const creation=z.object({name:z.string().trim().min(1).max(200)}).strict();
export async function POST(req:Request){
 try{
  sameOrigin(req);
  const a=await access(req);
  if(!a.team)throw new AccessError(403,'O cadastro de lojas está disponível no espaço da equipe.');
  const {name}=creation.parse(await req.json()),db=database();
  // The authenticated account always owns new stores. Never accept an assignee or existing ID.
  const existing=await db.prepare('SELECT id,name,assignee FROM team_stores WHERE assignee=? AND name=? COLLATE NOCASE').bind(a.email,name).first<TeamStore>();
  if(existing)return Response.json({store:existing,existing:true},{headers:{'Cache-Control':'no-store'}});
  const store={id:crypto.randomUUID(),name,assignee:a.email};
  await db.prepare('INSERT INTO team_stores(id,name,assignee) VALUES (?,?,?)').bind(store.id,store.name,store.assignee).run();
  return Response.json({store,existing:false},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch(e){if(e instanceof z.ZodError)return Response.json({error:'Informe somente o nome da loja, com até 200 caracteres.'},{status:400});return fail(e)}
}
