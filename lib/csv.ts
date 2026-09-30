import {Category,Report,fields,labels,values} from './report';
function cell(value:string|number|null|undefined){
 if(value==null)return '""';
 if(typeof value==='number')return '"'+String(value).replace('.',',')+'"';
 // Spreadsheet applications must not execute names or other user-entered text.
 const safe=/^[\s\u0000-\u001f]*[=+@-]/.test(value)?"'"+value:value;
 return '"'+safe.replaceAll('"','""')+'"';
}
export function reportCSV(r:Report){
 const rows:(string|number|null|undefined)[][]=[['Loja','Período','Seção','Indicador','Valor','Unidade','Status']];
 for(const category of Object.keys(fields) as Category[]){
  for(const period of category==='quality'?[r.qualityPeriod||'Período não informado']:[r.previous,r.current]){
   const data=category==='quality'?r.evidence.find(e=>e.category==='quality')?.values||{}:values(r,category,period);
   for(const [key,label] of fields[category])rows.push([r.store,period,labels[category],label,data[key],category==='finance'||['salesValue','ticket'].includes(key)?'BRL':category==='quality'?(key==='rating'?'Estrelas':'%'):'Quantidade',r.status==='reviewed'?'Conferido':'Rascunho']);
  }
 }
 return '\uFEFF'+rows.map(row=>row.map(cell).join(';')).join('\r\n')+'\r\n';
}
export function downloadCSV(r:Report){
 const url=URL.createObjectURL(new Blob([reportCSV(r)],{type:'text/csv;charset=utf-8;'}));
 const a=document.createElement('a');a.href=url;a.download=`${r.store.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_')||'relatorio'}_${r.previous}_${r.current}.csv`;
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
