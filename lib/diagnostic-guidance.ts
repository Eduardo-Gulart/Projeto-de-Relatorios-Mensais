import { diagnosticSections } from "./diagnostic";

// Editorial suggestions, never new observations or inferred numerical results.
const actions: Record<string, readonly string[]> = {
  profile: [
    "Substituir a capa por uma foto nítida do produto principal e conferir o enquadramento na versão mobile.",
    "Completar a descrição com especialidade, diferenciais e proposta da loja, evitando promessas que a operação não atende.",
    "Comparar o mínimo com o preço de uma compra individual e testar um valor viável após conferir margem e custo de entrega.",
    "Conferir os horários publicados com a escala da equipe e corrigir dias e faixas em que a loja não consegue atender.",
  ],
  menu: [
    "Fotografar primeiro os itens mais visitados ou vendidos, com boa luz, proporção real e padrão visual consistente.",
    "Informar ingredientes, tamanho, quantidade e acompanhamentos; esclarecer o que está ou não incluído no preço.",
    "Auditar os preços dos itens ativos, corrigir valores zerados e simular a compra antes de republicar o cardápio.",
    "Exibir um preço base compreensível e revisar complementos obrigatórios para evitar surpresa no valor final.",
    "Criar adicionais compatíveis com os produtos principais, com preço e margem conferidos, sem dificultar a compra.",
    "Agrupar itens por ocasião de consumo e categoria; colocar os produtos prioritários em posições fáceis de encontrar.",
  ],
  conversion: [
    "Localizar a etapa de maior perda no funil e testar uma mudança de oferta por vez, comparando períodos equivalentes.",
    "Simular a escolha de opções e adicionais dos produtos mais acessados; corrigir exigências confusas e revisar o preço final.",
    "Conferir frete, pedido mínimo, prazo e formas de pagamento na revisão; testar condições compatíveis com a margem.",
    "Separar visitas e pedidos atribuídos aos anúncios; revisar a oferta de destino antes de ampliar o orçamento.",
  ],
  quality: [
    "Ler as avaliações recentes, classificar os motivos recorrentes e atribuir um responsável por corrigir cada causa.",
    "Agrupar chamados por motivo e implementar conferência de itens, embalagem e identificação antes da saída.",
    "Revisar receita, porção, temperatura e embalagem dos itens citados nas reclamações; validar o padrão com a produção.",
    "Separar atrasos de preparo e transporte e ajustar a capacidade ou o prazo informado em cada faixa de horário.",
  ],
  sales: [
    "Comparar dias e horários equivalentes e conferir disponibilidade, visitas e conversão antes de definir a ação comercial.",
    "Separar o efeito de volume de pedidos do efeito de ticket médio; revisar os produtos e horários com maior variação.",
    "Testar combinações e adicionais úteis, com margem validada, e acompanhar se o ticket cresce sem reduzir a conversão.",
    "Revisar a oferta de entrada e testar aquisição com orçamento limitado, acompanhando custo por novo cliente e recompra.",
  ],
  cancellations: [
    "Classificar cancelamentos por motivo e responsabilidade, priorizar a causa mais recorrente e acompanhar sua evolução.",
    "Conferir tempos de preparo e expedição no pico; adequar capacidade e prazo publicado antes de aceitar mais demanda.",
    "Atualizar a disponibilidade dos itens durante o turno e definir quem pausa produtos antes de esgotarem.",
    "Adotar dupla conferência de itens e complementos, com identificação do pedido na embalagem antes da expedição.",
  ],
  finance: [
    "Conciliar vendas, taxas, incentivos e ajustes no mesmo período; distinguir repasse recebido de lucro da operação.",
    "Separar descontos custeados pela loja dos custeados pela plataforma e revisar a contribuição dos produtos promovidos.",
    "Conferir o extrato e as condições contratadas, documentando divergências para solicitar esclarecimento.",
    "Montar a ficha de custo por produto, incluindo ingredientes, embalagem, taxas e custos operacionais antes de precificar.",
  ],
  campaigns: [
    "Comparar gasto, pedidos atribuídos e contribuição estimada por campanha; ajustar orçamento gradualmente com base no resultado.",
    "Recalcular a contribuição do item após todos os descontos e custos; ajustar o incentivo quando a margem não sustentar a oferta.",
    "Conferir objetivo, limite de gasto e produtos envolvidos; testar orçamento menor e acompanhar o retorno antes de ampliar.",
    "Verificar itens e custos envolvidos em Hits e comparar a contribuição dos pedidos antes e depois da participação.",
    "Conferir público, validade, mínimo de compra e custo dos cupons; simular seu uso antes de ativar a oferta.",
    "Simular pedidos com os incentivos ativos e retirar combinações que gerem desconto maior que o planejado.",
  ],
  services: [
    "Alinhar janelas de agendamento à produção e à escala, desabilitando faixas que a equipe não consegue cumprir.",
    "Conferir programação dos anúncios e horários de atendimento, evitando gasto em faixas sem capacidade de receber pedidos.",
    "Verificar disponibilidade e condições da modalidade para a loja; habilitar apenas se houver viabilidade operacional e financeira.",
    "Listar serviços ativos, custos e responsáveis; estabelecer conferência periódica do uso e do resultado de cada um.",
  ],
  delivery: [
    "Comparar prazo e custo por faixa de distância; testar redução das áreas com serviço insustentável antes de expandir novamente.",
    "Separar tempo de preparo, espera e transporte nos pedidos próximos e atuar na etapa que concentra o atraso.",
    "Revisar rotas, agrupamento de pedidos e tempo de retorno; ajustar a escala à demanda de cada faixa horária.",
    "Comparar frete por distância e custo real da rota; testar subsídio somente quando a contribuição do pedido o comportar.",
    "Mapear pedidos por horário e disponibilidade de entregadores; reforçar escala ou limitar cobertura nos picos.",
  ],
};
const monitoring: Record<string, string> = {
  profile:
    "Acompanhar visitas, conversão e dúvidas dos clientes após a atualização do perfil.",
  menu: "Comparar visualizações, adições à sacola, conversão e ticket dos itens alterados.",
  conversion:
    "Comparar a taxa de passagem entre as etapas do funil, usando períodos de duração equivalente.",
  quality:
    "Acompanhar nota, frequência dos motivos de reclamação e percentual de pedidos com chamados.",
  sales:
    "Comparar pedidos, vendas, ticket médio e novos clientes em dias e horários equivalentes.",
  cancellations:
    "Acompanhar taxa e quantidade de cancelamentos, detalhando motivo e horário.",
  finance:
    "Conferir repasse sobre vendas e contribuição por produto após taxas, incentivos e custos.",
  campaigns:
    "Acompanhar gasto, pedidos atribuídos e contribuição após os incentivos de cada campanha.",
  services:
    "Conferir utilização, custo e ocorrências operacionais de cada serviço habilitado.",
  delivery:
    "Acompanhar prazo real, atrasos, cancelamentos e custo de entrega por faixa de distância.",
};
export function guidanceForProblem(sectionId: string, problem: string) {
  const section = diagnosticSections.find((s) => s.id === sectionId);
  const index = section?.checks.findIndex((check) => check === problem) ?? -1;
  return index >= 0
    ? actions[sectionId]?.[index] || section!.action
    : "Validar a causa com a equipe, definir uma correção específica e registrar o resultado após a mudança.";
}
export function monitoringForSection(sectionId: string) {
  return (
    monitoring[sectionId] ||
    "Definir o indicador de acompanhamento com a gestão."
  );
}
