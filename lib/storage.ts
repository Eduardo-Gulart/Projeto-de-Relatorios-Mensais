import { env } from 'cloudflare:workers';

export function database(){const db=(env as unknown as {DB:D1Database}).DB;if(!db)throw new Error('Banco indisponível');return db;}

export function bucket(){const b=(env as unknown as {BUCKET:R2Bucket}).BUCKET;if(!b)throw new Error('Armazenamento indisponível');return b;}

export function identity(req:Request){const id=req.headers.get('oai-authenticated-user-id');if(!id)throw new Error('AUTH');return id;}

export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(req.headers.get('sec-fetch-site')==='cross-site'||(origin&&origin!==new URL(req.url).origin))throw new Error('AUTH');}

export function fail(error:unknown){if(error instanceof Error&&'status' in error&&typeof error.status==='number')return Response.json({error:error.message},{status:error.status});if(error instanceof Error&&error.message==='AUTH')return Response.json({error:'Entre na sua conta para acessar seus relatórios.'},{status:401});console.error('Falha no armazenamento do relatório',error);return Response.json({error:'Não foi possível acessar o armazenamento. Seus dados na tela foram preservados. Tente novamente.'},{status:503});}

