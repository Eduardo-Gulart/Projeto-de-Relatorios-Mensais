import { z } from "zod";
export const diagnosticSections = [
  {
    id: "profile",
    title: "Perfil da loja",
    hint: "Primeira impressão, identidade e condições de compra",
    checks: [
      "Capa da loja pouco atrativa",
      "Descrição da loja incompleta",
      "Pedido mínimo elevado",
      "Horários de funcionamento incorretos",
    ],
    action:
      "Revisar capa, descrição e condições de compra para tornar a proposta da loja clara.",
  },
  {
    id: "menu",
    title: "Cardápio",
    hint: "Categorias, fotos, descrições, preços e complementos",
    checks: [
      "Produtos sem foto",
      "Descrições dos produtos incompletas",
      "Produtos sem preço ou com preço zerado",
      "Preço somente nos complementos obrigatórios",
      "Faltam adicionais para aumentar o ticket médio",
      "Categorias do cardápio desorganizadas",
    ],
    action:
      "Priorizar os produtos mais acessados, revisar preços e descrições e testar complementos coerentes.",
  },
  {
    id: "conversion",
    title: "Conversão do cardápio",
    hint: "Visitas, visualizações, sacola e pedidos concluídos",
    checks: [
      "Muitas visitas e poucos pedidos concluídos",
      "Abandono ao adicionar produtos à sacola",
      "Abandono na revisão do pedido",
      "Investimento em anúncios sem conversão suficiente",
    ],
    action:
      "Identificar a etapa de maior abandono e testar ajustes de oferta, fotos e condições de entrega.",
  },
  {
    id: "quality",
    title: "Qualidade e Super Restaurantes",
    hint: "Avaliações, chamados e experiência do cliente",
    checks: [
      "Nota de avaliação abaixo da meta",
      "Muitos pedidos com chamados",
      "Reclamações sobre a qualidade dos produtos",
      "Reclamações sobre atrasos",
    ],
    action:
      "Agrupar os motivos de reclamação e definir uma rotina de conferência na produção e expedição.",
  },
  {
    id: "sales",
    title: "Vendas",
    hint: "Volume de pedidos, valor vendido e ticket médio",
    checks: [
      "Queda na quantidade de pedidos",
      "Queda no valor das vendas",
      "Ticket médio baixo",
      "Poucos novos clientes",
    ],
    action:
      "Comparar períodos equivalentes e identificar produtos, horários e canais que explicam a variação.",
  },
  {
    id: "cancellations",
    title: "Cancelamentos",
    hint: "Frequência, motivos e responsabilidade",
    checks: [
      "Taxa de cancelamento elevada",
      "Cancelamentos por atraso",
      "Cancelamentos por falta de produto",
      "Cancelamentos por erro no pedido",
    ],
    action:
      "Revisar motivos de cancelamento, disponibilidade do cardápio e capacidade operacional nos horários de pico.",
  },
  {
    id: "finance",
    title: "Financeiro",
    hint: "Vendas brutas, descontos, taxas e repasse líquido",
    checks: [
      "Repasse líquido baixo em relação às vendas",
      "Descontos de promoções elevados",
      "Taxas e comissões precisam de conferência",
      "Custos e margem dos produtos não calculados",
    ],
    action:
      "Conciliar vendas e descontos e calcular a margem dos produtos com custos operacionais antes de ampliar incentivos.",
  },
  {
    id: "campaigns",
    title: "Promoções e anúncios",
    hint: "Investimento, retorno e sobreposição de incentivos",
    checks: [
      "Custo dos anúncios alto para o retorno observado",
      "Desconto em itens comprometendo a margem",
      "Campanha inteligente com investimento inadequado",
      "Investimento em Hits precisa de revisão",
      "Cupons insuficientes ou mal configurados",
      "Promoções com descontos sobrepostos",
    ],
    action:
      "Avaliar o custo e a contribuição de cada campanha; testar mudanças graduais e acompanhar o resultado.",
  },
  {
    id: "services",
    title: "Serviços iFood",
    hint: "Agendamento, disponibilidade e modalidades habilitadas",
    checks: [
      "Pedidos agendados incompatíveis com a operação",
      "Anúncios gerando demanda fora do horário de atendimento",
      "Entrega Flex indisponível ou não habilitada",
      "Serviços ativos sem acompanhamento",
    ],
    action:
      "Revisar os serviços disponíveis e alinhar horários e modalidades à capacidade real da loja.",
  },
  {
    id: "delivery",
    title: "Entrega e tempo de atendimento",
    hint: "Raio, prazo informado, logística e capacidade",
    checks: [
      "Raio de entrega muito alto",
      "Tempo de entrega elevado nos primeiros quilômetros",
      "Entregadores demoram a retornar à loja",
      "Taxa de entrega pouco competitiva",
      "Capacidade de entrega insuficiente nos horários de pico",
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
  checks: z.array(z.string().max(150)).max(16),
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

export function toggleDiagnosticProblem(
  section: Diagnostic["sections"][number],
  text: string,
  checked: boolean,
) {
  const checks = checked
    ? [...new Set([...section.checks, text])]
    : section.checks.filter((t) => t !== text);
  return {
    ...section,
    checks,
    status: checks.length
      ? section.status === "critical"
        ? "critical"
        : "attention"
      : "pending",
  } as Diagnostic["sections"][number];
}
