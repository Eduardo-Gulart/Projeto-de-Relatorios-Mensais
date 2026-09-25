const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(':memory:');
for(const file of ['drizzle/0000_watery_living_mummy.sql','drizzle/0001_team.sql'])db.exec(fs.readFileSync(file,'utf8'));
function stmt(sql,args=[]){return {bind(...v){return stmt(sql,v)},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}}}}}
const objects=new Map(),env={RELATA_TEAM_ENABLED:'true',RELATA_ADMIN_EMAIL:'admin@test.com',DB:{prepare:stmt,async batch(s){return Promise.all(s.map(x=>x.run()))}},BUCKET:{async put(k,d,o){objects.set(k,{body:d,httpMetadata:o.httpMetadata})},async get(k){return objects.get(k)},async head(k){return objects.get(k)}}};
const cache=new Map();function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const req=n=>n==='cloudflare:workers'?{env}:n.startsWith('@/')?load(n.slice(2)+'.ts'):n.startsWith('.')?load(path.resolve(path.dirname(file),n)+'.ts'):require(n);vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(req,m,m.exports);return m.exports;}
const selfStores=load('app/api/stores/route.ts');
const reports=load('app/api/reports/route.ts'),uploads=load('app/api/uploads/route.ts'),team=load('app/api/team/route.ts'),restore=load('app/api/backup/restore/route.ts'),session=load('app/api/session/route.ts'),next=load('app/api/reports/next/route.ts'),model=load('lib/report.ts');
function request(email,method='GET',body,extra={}){return new Request('http://localhost/api/test',{method,headers:{'oai-authenticated-user-id':email,'oai-authenticated-user-email':email,...extra},...(body?{body:JSON.stringify(body)}:{})})}
let count=0;async function status(p,n){const r=await p;assert.equal(r.status,n,await r.clone().text());count++;return r}
(async()=>{
 await status(session.GET(request('unknown@test.com')),403);await status(team.GET(request('unknown@test.com')),403);
 for(const email of ['a@test.com','b@test.com'])await status(team.POST(request('admin@test.com','POST',{action:'member',email,name:email,active:true})),200);
 await status(team.POST(request('a@test.com','POST',{action:'member',email:'evil@test.com',name:'Evil',active:true})),403);
 const stores=[crypto.randomUUID(),crypto.randomUUID()];for(let i=0;i<2;i++)await status(team.POST(request('admin@test.com','POST',{action:'store',id:undefined,name:'Loja '+i,assignee:i?'b@test.com':'a@test.com'})),200);
 const ss=db.prepare('SELECT * FROM team_stores ORDER BY name').all();stores[0]=ss[0].id;stores[1]=ss[1].id;
 const a={...model.blank(),store:'Loja 0',storeId:stores[0]},b={...model.blank(),store:'Loja 1',storeId:stores[1]};
 await status(reports.POST(request('a@test.com','POST',a)),200);await status(reports.POST(request('b@test.com','POST',b)),200);
 const list=await (await reports.GET(request('a@test.com'))).json();assert.deepEqual(list.map(x=>x.id),[a.id]);count++;
 await status(reports.POST(request('a@test.com','POST',b)),404);await status(reports.POST(request('a@test.com','POST',{...a,id:crypto.randomUUID(),storeId:stores[1]})),404);
 const br=(await (await reports.GET(request('b@test.com'))).json())[0];const del=request('a@test.com','DELETE',undefined,{'X-Report-Version':br.updated});await status(reports.DELETE(new Request('http://localhost/api/reports?id='+b.id,del)),404);
 await status(next.POST(request('a@test.com','POST',{id:b.id})),404);await status(restore.POST(request('a@test.com','POST',{reports:[a]})),403);
 const form=new FormData();form.append('storeId',stores[0]);form.append('file',new Blob([new Uint8Array([137,80,78,71,13,10,26,10])],{type:'image/png'}),'a.png');const ur=await status(uploads.POST(new Request('http://localhost/api/uploads',{method:'POST',headers:{'oai-authenticated-user-id':'a@test.com','oai-authenticated-user-email':'a@test.com'},body:form})),200);const image=await ur.json();
 const getImage=email=>uploads.GET(new Request('http://localhost'+image.url,{headers:{'oai-authenticated-user-id':email,'oai-authenticated-user-email':email}}));await status(getImage('b@test.com'),404);await status(getImage('admin@test.com'),200);
 await status(reports.POST(request('b@test.com','POST',{...b,id:crypto.randomUUID(),evidence:[{id:'x',name:'image',url:image.url,category:'sales',period:'2026-08',values:{},text:'',confirmed:false}]})),404);
 await status(team.POST(request('admin@test.com','POST',{action:'store',id:stores[0],name:'Loja 0',assignee:'b@test.com'})),200);
 assert.equal((await (await reports.GET(request('a@test.com'))).json()).length,0);count++;await status(getImage('a@test.com'),404);await status(getImage('b@test.com'),200);
 await status(team.POST(request('admin@test.com','POST',{action:'member',email:'b@test.com',name:'B',active:false})),200);await status(reports.GET(request('b@test.com')),403);await status(getImage('b@test.com'),403);
 const cr=await status(selfStores.POST(request('a@test.com','POST',{name:'Minha loja'})),201);const created=(await cr.json()).store;assert.equal(created.assignee,'a@test.com');count++;
 const nr={...model.blank(),store:created.name,storeId:created.id};await status(reports.POST(request('a@test.com','POST',nr)),200);
 assert.ok((await (await session.GET(request('a@test.com'))).json()).stores.some(s=>s.id===created.id));count++;
 assert.ok((await (await reports.GET(request('admin@test.com'))).json()).some(r=>r.id===nr.id));count++;
 await status(team.POST(request('admin@test.com','POST',{action:'member',email:'b@test.com',name:'B',active:true})),200);
 assert.ok(!(await (await session.GET(request('b@test.com'))).json()).stores.some(s=>s.id===created.id));count++;
 await status(reports.POST(request('b@test.com','POST',{...nr,id:crypto.randomUUID()})),404);
 const same=await status(selfStores.POST(request('a@test.com','POST',{name:' Minha loja '})),200);assert.equal((await same.json()).store.id,created.id);count++;
 const separate=await status(selfStores.POST(request('b@test.com','POST',{name:'Minha loja'})),201);assert.notEqual((await separate.json()).store.id,created.id);count++;
 for(const extra of [{assignee:'b@test.com'},{id:created.id},{legacyName:'Minha loja'}])await status(selfStores.POST(request('a@test.com','POST',{name:'X',...extra})),400);
 await status(selfStores.POST(request('a@test.com','POST',{name:'   '})),400);
 await status(selfStores.POST(request('a@test.com','POST',{name:'X'},{origin:'https://other.example'})),401);
 await status(selfStores.POST(request('unknown@test.com','POST',{name:'X'})),403);
 await status(team.POST(request('admin@test.com','POST',{action:'member',email:'b@test.com',name:'B',active:false})),200);
 await status(selfStores.POST(request('b@test.com','POST',{name:'X'})),403);
 env.RELATA_ADMIN_EMAIL='';await status(session.GET(request('admin@test.com')),503);
 env.RELATA_TEAM_ENABLED='false';await status(selfStores.POST(request('a@test.com','POST',{name:'X'})),403);await status(reports.GET(request('a@test.com')),200);await status(reports.DELETE(new Request('http://localhost/api/reports?id='+b.id,del)),404);
 console.log(count+' checks passed: real SQLite authorization, reassignment, suspension, uploads, backups, personal mode.');
})().catch(e=>{console.error(e);process.exitCode=1});
