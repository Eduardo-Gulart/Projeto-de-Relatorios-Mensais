// Frozen v1 labels for lossless import. Do not rename.
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
