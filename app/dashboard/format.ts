// Presentation only: indicator calculations stay in lib/report and lib/dashboard.
export const decimal=(value:number)=>value.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
export const percent=(value:number|null|undefined)=>value==null?'—':decimal(value)+'%';
