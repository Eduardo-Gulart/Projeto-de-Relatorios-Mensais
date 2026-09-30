export function qualityWarnings(width:number,height:number,pixels:Uint8ClampedArray){
 const warnings:string[]=[];
 if(width<640||height<160)warnings.push(`Resolução pequena (${width} × ${height} pixels).`);
 let sum=0,square=0;const count=pixels.length/4;
 for(let i=0;i<pixels.length;i+=4){const y=.299*pixels[i]+.587*pixels[i+1]+.114*pixels[i+2];sum+=y;square+=y*y;}
 if(count&&Math.sqrt(Math.max(0,square/count-(sum/count)**2))<12)warnings.push('Contraste muito baixo ou imagem quase uniforme.');
 return warnings;
}
export class ImageQualityCancelled extends Error{constructor(){super('Leitura cancelada. Envie um print com melhor qualidade.');this.name='ImageQualityCancelled'}}
export type QualityConfirmation=(warnings:string[],filename:string)=>Promise<boolean>;
