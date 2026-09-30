"use client";
import {useEffect,useRef,useState} from 'react';
import {AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel} from '@/components/ui/alert-dialog';
import type {QualityConfirmation} from '@/lib/image-quality';
export function useQualityPrompt(){
 const [warning,setWarning]=useState<{warnings:string[];filename:string}|null>(null);
 const resolver=useRef<((yes:boolean)=>void)|null>(null);
 useEffect(()=>()=>{resolver.current?.(false);resolver.current=null},[]);
 const confirm:QualityConfirmation=(warnings,filename)=>new Promise(resolve=>{resolver.current=resolve;setWarning({warnings,filename})});
 function finish(yes:boolean){resolver.current?.(yes);resolver.current=null;setWarning(null)}
 const dialog=<AlertDialog open={!!warning} onOpenChange={open=>{if(!open)finish(false)}}><AlertDialogContent className="new-store-dialog"><AlertDialogTitle>Este print pode ser difícil de ler</AlertDialogTitle><AlertDialogDescription>{warning?.filename}: {warning?.warnings.join(' ')} Sugerimos tirar outro print, com os indicadores maiores e sem compressão. Você também pode continuar e conferir os valores manualmente.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel className="secondary" onClick={()=>finish(false)}>Trocar o print</AlertDialogCancel><button onClick={()=>finish(true)}>Continuar leitura</button></AlertDialogFooter></AlertDialogContent></AlertDialog>;
 return {confirm,dialog};
}
