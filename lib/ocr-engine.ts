import {Category,fields} from './report';
export type Box={x0:number;y0:number;x1:number;y1:number};
type Word={text:string;bbox:Box;confidence?:number};
type Line={words?:Word[];text?:string;bbox:Box};
type OCRData={text:string;blocks?:{paragraphs?:{lines?:Line[]}[]}[]|null};
export type OCRWorker={setParameters:(params:Record<string,string|number>)=>Promise<unknown>;recognize:(image:unknown,options?:unknown,output?:unknown)=>Promise<{data:OCRData}>};
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const patterns:Record<string,RegExp>={gross:/^valor das vendas$/,fees:/^taxas e/,promotions:/^servi.os e promo/,adjustments:/^ajustes$/,net:/^total faturamento$/,orders:/^total de vendas realizadas$/,salesValue:/^valor total das vendas$/,ticket:/^ticket m.dio$/,newCustomers:/^novos clientes$/,visits:/^visitas$/,views:/^visualiza/,bag:/^sacola$/,review:/^revis.o$/,completed:/^conclu/,rating:/^avalia/,cancellations:/^cancelamentos$/,calls:/^pedidos com chamados$/};
export function parseField(text:string,category:Category,key:string):number|null{
 const clean=text.replace(/[−–—]/g,'-').replace(/R\s*\$/g,'R$');
 const monetary=category==='finance'||(category==='sales'&&['salesValue','ticket'].includes(key));
 if(monetary){const m=clean.trim().match(/^[^0-9R+\-]*([+-]?\s*(?:R\$\s*)?)(\d[\d. ]*[,]\d{2})(?![\d%])/);if(!m)return null;const n=Number(m[2].replace(/[. ]/g,'').replace(',','.'));return Number.isFinite(n)?(m[1].includes('-')?-n:n):null;}
 if(category==='quality'){const m=clean.trim().match(/^(?:\d+[,.]\d{1,2}|0)(?=\s*%?\s*$)/);if(!m)return null;const n=Number(m[0].replace(',','.'));return n<0||n>(key==='rating'?5:100)?null:n;}
 const m=clean.trim().match(/^[^\d+-]*([\d]+(?:[. ]\d{3})*)(?![\d,.%])/);if(!m)return null;return Number(m[1].replace(/[. ]/g,''));
}
// Each currency slot is independent: a missing comma cannot erase the other cards.
export function parseOCR(text:string,category:Category){
 const result:Record<string,number|null>=Object.fromEntries(fields[category].map(([k])=>[k,null]));
 const lines=text.split('\n').map(s=>s.trim()).filter(Boolean);
 if(category==='finance'){
  const normalized=text.replace(/[−–—]/g,'-');const starts=[...normalized.matchAll(/[+-]?\s*R\s*\$/g)].map(m=>m.index!);
  const segments=starts.map((start,i)=>normalized.slice(start,starts[i+1]));
  // Duplicate currency mentions are ambiguous; leave those to spatial extraction.
  if(segments.length===5)segments.forEach((s,i)=>result[fields.finance[i][0]]=parseField(s,category,fields.finance[i][0]));
 }else if(category==='sales'){
  const row=lines.find(s=>(s.match(/R\s*\$/g)||[]).length===2);
  if(row){const slots=row.split(/R\s*\$/);result.orders=parseField(slots[0],category,'orders');result.salesValue=parseField(slots[1],category,'salesValue');result.ticket=parseField(slots[2],category,'ticket');const after=slots[2].split('%')[1];if(after)result.newCustomers=parseField(after,category,'newCustomers');}
 }else if(category==='funnel'){
  const row=lines.find(s=>/^\d[\d.]*\s+\d[\d.]*\s+\d[\d.]*\s+\d[\d.]*\s+\d[\d.]*$/.test(s));if(row)row.split(/\s+/).forEach((n,i)=>result[fields.funnel[i][0]]=Number(n.replace(/\./g,'')));
 }else{const row=lines.find(s=>(s.match(/\d+[,.]\d+/g)||[]).length===3&&s.includes('%'));if(row){const nums=[...row.matchAll(/\d+[,.]\d+/g)];fields.quality.forEach(([k],i)=>result[k]=parseField(nums[i][0],category,k));}}
 return result;
}
export function locateFields(data:OCRData,category:Category,width:number,height:number){
 const lines=data.blocks?.flatMap(b=>b.paragraphs?.flatMap(p=>p.lines||[])||[])||[];
 const words=lines.flatMap(l=>l.words||[]);
 const anchors:Record<string,Box>={};const options:Record<string,Box[]>={};
 for(const [key] of fields[category]){
  const candidates:Box[]=[];
  for(const line of lines){const row=line.words||[];for(let i=0;i<row.length;i++)for(let count=1;count<=5&&i+count<=row.length;count++){
    const span=row.slice(i,i+count);if(!normalize(span[0].text))continue;if(patterns[key].test(normalize(span.map(w=>w.text).join(' ')))){candidates.push({x0:span[0].bbox.x0,y0:Math.min(...span.map(w=>w.bbox.y0)),x1:span.at(-1)!.bbox.x1,y1:Math.max(...span.map(w=>w.bbox.y1))});break;}
  }}
  if(candidates.length){options[key]=candidates;anchors[key]=candidates.sort((a,b)=>a.y0-b.y0||a.x0-b.x0)[0];}
 }
 // Prefer the shared indicator heading row over mentions in alerts or help text.
 if(category==='quality')for(const [key,candidates] of Object.entries(options)){
 const support=(a:Box)=>Object.values(options).filter(list=>list.some(b=>Math.abs(b.y0-a.y0)<Math.max(a.y1-a.y0,b.y1-b.y0)*1.5)).length;
 anchors[key]=[...candidates].sort((a,b)=>support(b)-support(a)||a.y0-b.y0||a.x0-b.x0)[0];
 }
 const sorted=Object.entries(anchors).sort((a,b)=>a[1].x0-b[1].x0);
 const gaps=sorted.slice(1).map(([,a],i)=>a.x0-sorted[i][1].x0).filter(x=>x>width*.05).sort((a,b)=>a-b);
 const typical=gaps[Math.floor(gaps.length/2)]||width/fields[category].length;
 const regions:Record<string,{left:number;top:number;width:number;height:number}>={};
 for(const [key,a] of sorted){const font=Math.max(10,a.y1-a.y0);const next=sorted.find(([,b])=>b.x0>a.x0+font*2&&Math.abs(b.y0-a.y0)<font*3)?.[1];
  const left=Math.max(0,Math.floor(a.x0-font*.7)),right=Math.min(width,Math.floor(next?next.x0-font*.7:a.x0+typical-font*.7));
  const candidates=words.filter(w=>/\d/.test(w.text)&&w.bbox.x0>=left&&w.bbox.x0<right&&w.bbox.y0>a.y1&&w.bbox.y0<a.y1+font*(category==='quality'?15:5)&&(!w.text.includes('%')||category==='quality'));
  const first=candidates.sort((x,y)=>x.bbox.y0-y.bbox.y0||x.bbox.x0-y.bbox.x0)[0];if(!first||right-left<20)continue;
  const sameRow=candidates.filter(w=>Math.abs(w.bbox.y0-first.bbox.y0)<font*.65);const top=Math.max(0,Math.floor(Math.min(...sameRow.map(w=>w.bbox.y0))-font*.45));const bottom=Math.min(height,Math.ceil(Math.max(...sameRow.map(w=>w.bbox.y1))+font*.5));
  regions[key]={left,top,width:right-left,height:bottom-top};
 }
 const all=Object.values(regions);if(all.length>=2){const ordered=all.map(r=>r.top).sort((a,b)=>a-b);const median=ordered[Math.floor(ordered.length/2)];const peers=all.filter(r=>Math.abs(r.top-median)<r.height);if(peers.length>=2){const commonTop=Math.min(...peers.map(r=>r.top)),commonBottom=Math.max(...peers.map(r=>r.top+r.height));for(const r of all)if(Math.abs(r.top-median)>r.height*1.5){r.top=commonTop;r.height=commonBottom-commonTop;}}}
 return regions;
}
export async function extractIndicators(worker:OCRWorker,image:unknown,category:Category,width:number,height:number,progress:(s:string)=>void=()=>{},enhance?:(r:{left:number;top:number;width:number;height:number},mode?:"contrast"|"wide")=>Promise<unknown>){
 await worker.setParameters({tessedit_pageseg_mode:'3',tessedit_char_whitelist:''});
 const {data}=await worker.recognize(image,{}, {text:true,blocks:true});const values=parseOCR(data.text,category);let regions=locateFields(data,category,width,height);const detail:string[]=[];if(Object.keys(regions).length<fields[category].length){await worker.setParameters({tessedit_pageseg_mode:'11'});const extra=await worker.recognize(image,{}, {text:true,blocks:true});regions={...locateFields(extra.data,category,width,height),...regions};}
 await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'0123456789.,-+%R$ '});
 for(const [key,label] of fields[category]){const rectangle=regions[key];if(!rectangle)continue;progress('Lendo '+label.toLowerCase()+'…');const read=await worker.recognize(image,{rectangle},{text:true});let n=parseField(read.data.text,category,key);detail.push(label+': '+read.data.text.trim());if(n==null){await worker.setParameters({tessedit_pageseg_mode:'13'});const retry=await worker.recognize(image,{rectangle},{text:true});n=parseField(retry.data.text,category,key);detail.push(label+' (segunda leitura): '+retry.data.text.trim());await worker.setParameters({tessedit_pageseg_mode:'7'});}if(n==null&&enhance){const enhanced=await enhance(rectangle);const retry=await worker.recognize(enhanced,{}, {text:true});n=parseField(retry.data.text,category,key);detail.push(label+' (contraste): '+retry.data.text.trim());}if(n==null&&enhance&&category==='quality'){const wide=await enhance(rectangle,'wide');const retry=await worker.recognize(wide,{}, {text:true});n=parseField(retry.data.text,category,key);detail.push(label+' (espaçamento): '+retry.data.text.trim());}if(n!=null)values[key]=n;}
 return {text:data.text+'\n\nLEITURA POR INDICADOR\n'+detail.join('\n'),values,regions};
}
