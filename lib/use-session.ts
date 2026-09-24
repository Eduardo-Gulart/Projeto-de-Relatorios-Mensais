"use client";
import {useEffect,useState} from 'react';
export type Session={owner:string;email:string;team:boolean;admin:boolean;stores:{id:string;name:string;assignee:string|null}[]};
export function useSession(){const [session,setSession]=useState<Session|null>(null),[error,setError]=useState('');useEffect(()=>{let alive=true;async function read(){try{const r=await fetch('/api/session',{cache:'no-store'});const d=await r.json() as Session & {error?:string};if(!r.ok)throw new Error(d.error);if(alive){setSession(d);setError('')}}catch(e){if(alive){setSession(null);setError((e as Error).message)}}}void read();window.addEventListener('focus',read);return()=>{alive=false;window.removeEventListener('focus',read)}},[]);return {session,error};}
