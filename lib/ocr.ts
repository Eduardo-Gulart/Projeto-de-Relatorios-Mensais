import {Category} from './report';
import {extractIndicators,OCRWorker} from './ocr-engine';
export {parseOCR} from './ocr-engine';
export async function readImage(file:File,category:Category,onProgress:(s:string)=>void){
 const bitmap=await createImageBitmap(file);
 if(bitmap.width*bitmap.height>16000000){bitmap.close();throw new Error('A imagem é muito grande. Use um recorte de até 16 megapixels.');}
 const scale=Math.min(3,6000/bitmap.width,Math.sqrt(24000000/(bitmap.width*bitmap.height)));
 const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
 const context=canvas.getContext('2d')!;context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const {createWorker}=await import('tesseract.js');onProgress('Preparando leitura dos indicadores…');
 const worker=await createWorker('eng',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr',langPath:'/ocr',gzip:false});
 try{return await extractIndicators(worker as unknown as OCRWorker,canvas,category,canvas.width,canvas.height,onProgress,async (rect,mode)=>{
 const crop=document.createElement('canvas');crop.width=Math.round(rect.width*(mode==='wide'?1.5:1));crop.height=rect.height;const c=crop.getContext('2d')!;c.drawImage(canvas,rect.left,rect.top,rect.width,rect.height,0,0,crop.width,crop.height);if(mode==='wide')return crop;const pixels=c.getImageData(0,0,crop.width,crop.height);for(let i=0;i<pixels.data.length;i+=4){const level=.299*pixels.data[i]+.587*pixels.data[i+1]+.114*pixels.data[i+2]<180?0:255;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=level;}c.putImageData(pixels,0,0);return crop;
 });}finally{await worker.terminate();canvas.width=0;canvas.height=0;}
}
