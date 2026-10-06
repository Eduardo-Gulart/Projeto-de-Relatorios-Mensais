import { z } from "zod";
export const diagnosticSections = [
  {
    id: "profile",
    title: "Perfil da loja",
    hint: "Primeira impressão, identidade e condições de compra",
    checks: [
      "Capa e identidade visual precisam de revisão",
      "Pedido mínimo precisa ser reavaliado",
      "Informações da loja incompletas",
    ],
    action:
      "Revisar capa, descrição e condições de compra para tornar a proposta da loja clara.",
  },
  {
    id: "menu",
    title: "Cardápio",
    hint: "Categorias, fotos, descrições, preços e complementos",
    checks: [
      "Fotos ou descrições incompletas",
      "Produtos sem preço base claro",
      "Faltam complementos e combinações",
    ],
    action:
      "Priorizar os produtos mais acessados, revisar preços e descrições e testar complementos coerentes.",
  },
  {
    id: "conversion",
    title: "Conversão do cardápio",
    hint: "Visitas, visualizações, sacola e pedidos concluídos",
    checks: [
      "Abandono relevante entre etapas",
      "Tráfego não se transforma em pedidos",
      "Oferta precisa ser revisada",
    ],
    action:
      "Identificar a etapa de maior abandono e testar ajustes de oferta, fotos e condições de entrega.",
  },
  {
    id: "quality",
    title: "Qualidade e Super Restaurantes",
    hint: "Avaliações, chamados e experiência do cliente",
    checks: [
      "Avaliações exigem atenção",
      "Chamados recorrentes",
      "Reclamações sobre qualidade ou atraso",
    ],
    action:
      "Agrupar os motivos de reclamação e definir uma rotina de conferência na produção e expedição.",
  },
  {
    id: "sales",
    title: "Vendas",
    hint: "Volume de pedidos, valor vendido e ticket médio",
    checks: [
      "Queda no volume de pedidos",
      "Ticket médio exige revisão",
      "Oscilação nas vendas",
    ],
    action:
      "Comparar períodos equivalentes e identificar produtos, horários e canais que explicam a variação.",
  },
  {
    id: "cancellations",
    title: "Cancelamentos",
    hint: "Frequência, motivos e responsabilidade",
    checks: [
      "Cancelamentos frequentes",
      "Indisponibilidade de produtos",
      "Atrasos ou falhas de expedição",
    ],
    action:
      "Revisar motivos de cancelamento, disponibilidade do cardápio e capacidade operacional nos horários de pico.",
  },
  {
    id: "finance",
    title: "Financeiro",
    hint: "Vendas brutas, descontos, taxas e repasse líquido",
    checks: [
      "Descontos comprometem o repasse",
      "Taxas precisam de conciliação",
      "Margem dos produtos não validada",
    ],
    action:
      "Conciliar vendas e descontos e calcular a margem dos produtos com custos operacionais antes de ampliar incentivos.",
  },
  {
    id: "campaigns",
    title: "Promoções e anúncios",
    hint: "Investimento, retorno e sobreposição de incentivos",
    checks: [
      "Campanhas sem retorno avaliado",
      "Descontos sobrepostos",
      "Orçamento precisa ser reavaliado",
    ],
    action:
      "Avaliar o custo e a contribuição de cada campanha; testar mudanças graduais e acompanhar o resultado.",
  },
  {
    id: "services",
    title: "Serviços iFood",
    hint: "Agendamento, disponibilidade e modalidades habilitadas",
    checks: [
      "Configurações não acompanham a operação",
      "Pedidos agendados precisam de revisão",
      "Modalidades de entrega precisam ser avaliadas",
    ],
    action:
      "Revisar os serviços disponíveis e alinhar horários e modalidades à capacidade real da loja.",
  },
  {
    id: "delivery",
    title: "Entrega e tempo de atendimento",
    hint: "Raio, prazo informado, logística e capacidade",
    checks: [
      "Raio de entrega elevado",
      "Prazo de entrega pouco competitivo",
      "Capacidade logística insuficiente",
    ],
    action:
      "Avaliar prazo e custo por distância e ajustar o raio à capacidade logística antes de expandir a cobertura.",
  },
] as const;
export const diagnosticStatus = {
  pending: "Não avaliado",
  good: "Adequado",
  attention: "Precisa de atenção",
  critical: "Prioridade alta",
} as const;
const section = z.object({
  id: z.string().max(30),
  status: z.enum(["pending", "good", "attention", "critical"]),
  checks: z.array(z.string().max(150)).max(8),
  notes: z.string().max(900),
  recommendation: z.string().max(600),
  images: z
    .array(
      z.object({
        url: z
          .string()
          .regex(/^\/api\/diagnostic-uploads\?id=[a-zA-Z0-9-]{36}$/),
        caption: z.string().max(160),
      }),
    )
    .max(3),
});
export const diagnosticSchema = z.object({
  id: z.string().uuid(),
  store: z.string().trim().min(1).max(100),
  manager: z.string().max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period: z.string().max(100),
  summary: z.string().max(700),
  sections: z
    .array(section)
    .length(10)
    .refine(
      (rows) =>
        new Set(rows.map((s) => s.id)).size === 10 &&
        rows.every((s) => diagnosticSections.some((d) => d.id === s.id)),
    ),
  actions: z
    .array(
      z.object({
        title: z.string().max(140),
        description: z.string().max(500),
        priority: z.enum(["high", "medium", "low"]),
        owner: z.string().max(100),
        deadline: z.string().max(60),
      }),
    )
    .max(20),
  reviewed: z.boolean(),
});
export type Diagnostic = z.infer<typeof diagnosticSchema>;
export type SavedDiagnostic = Diagnostic & { updated: string };
export function newDiagnostic(): Diagnostic {
  return {
    id: crypto.randomUUID(),
    store: "",
    manager: "",
    date: new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    }),
    period: "",
    summary: "",
    sections: diagnosticSections.map((s) => ({
      id: s.id,
      status: "pending",
      checks: [],
      notes: "",
      recommendation: "",
      images: [],
    })),
    actions: [],
    reviewed: false,
  };
}
export function activeSections(d: Diagnostic) {
  return d.sections.filter(
    (s) =>
      s.status !== "pending" ||
      s.notes.trim() ||
      s.recommendation.trim() ||
      s.checks.length ||
      s.images.length,
  );
}
export function suggestedDiagnosticActions(
  d: Diagnostic,
): Diagnostic["actions"] {
  return d.sections
    .filter(
      (s) =>
        s.status === "critical" || s.status === "attention" || s.checks.length,
    )
    .sort(
      (a, b) =>
        Number(b.status === "critical") - Number(a.status === "critical"),
    )
    .map((s) => ({
      title: diagnosticSections.find((c) => c.id === s.id)!.title,
      description:
        s.recommendation ||
        diagnosticSections.find((c) => c.id === s.id)!.action,
      priority: s.status === "critical" ? "high" : "medium",
      owner: d.manager,
      deadline: "Primeiros 30 dias",
    }));
}
export function diagnosticReady(d: Diagnostic) {
  return Boolean(
    d.store.trim() &&
    d.manager.trim() &&
    d.date &&
    activeSections(d).length &&
    d.reviewed,
  );
}
