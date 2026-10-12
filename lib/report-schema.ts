import { z } from "zod";

const evidence = z.object({
  id: z.string().max(80),
  name: z.string().max(300),
  url: z
    .string()
    .max(500)
    .regex(/^\/(?:exemplo\/\d\.png|api\/uploads\?id=[a-zA-Z0-9-]+)$/),
  category: z.enum(["finance", "sales", "funnel", "quality"]),
  period: z.string().max(50),
  values: z.record(z.number().finite().nullable()),
  text: z.string().max(50000),
  confirmed: z.boolean(),
  example: z.boolean().optional(),
});

const action = z.object({
  title: z.string().max(120),
  description: z.string().max(1200),
  indicator: z.string().max(120).optional(),
  target: z.string().max(120).optional(),
});
const note = z.object({
  DADO: z.string().max(220).optional(),
  LEITURA: z.string().max(220).optional(),
  IMPACTO: z.string().max(220).optional(),
  AÇÃO: z.string().max(220).optional(),
});
export const reportSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  store: z.string().min(1).max(200),
  client: z.string().max(200),
  manager: z.string().max(200),
  started: z.string().max(20),
  previous: z.string().regex(/^\d{4}-\d{2}$/),
  current: z.string().regex(/^\d{4}-\d{2}$/),
  qualityPeriod: z.string().max(200),
  strategies: z.string().max(15000),
  classification: z.string().max(200),
  evidence: z.array(evidence).max(12),
  targets: z.record(z.number().finite()),
  status: z.enum(["draft", "reviewed"]),
  summary: z.string().max(700).optional(),
  notes: z
    .object({
      sales: note.optional(),
      funnel: note.optional(),
      quality: note.optional(),
      costs: note.optional(),
    })
    .optional(),
  actions: z.array(action).max(30).optional(),
  nextSteps: z.array(action).max(30).optional(),
  layout: z.enum(["classic", "editorial"]).optional(),
  includeEvidence: z.boolean().optional(),
});
