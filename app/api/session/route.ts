import {fail} from '@/lib/storage';
import {access,storesFor} from '@/lib/team';
export async function GET(req:Request){try{const a=await access(req),stores=await storesFor(a);return Response.json({owner:a.subject+(a.team?':team:'+stores.map(s=>s.id).sort().join(','):''),email:a.email,team:a.team,admin:a.admin,stores},{headers:{'Cache-Control':'private, no-store'}})}catch(e){return fail(e)}}
