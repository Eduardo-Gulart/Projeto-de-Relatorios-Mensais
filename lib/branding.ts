export const defaultBranding = {
  name: "Will × iFood",
  coverEyebrow: "ACOMPANHAMENTO MENSAL",
  confidentiality: "CONFIDENCIAL",
  header: "/report/header.png",
  marks: [
    { src: "/report/mark-will.png", alt: "Will" },
    { src: "/report/mark-ifood.png", alt: "iFood" },
  ],
  closing: { text: "TODO MÊS, UMA OPERAÇÃO", highlight: "MELHOR." },
  source: "Prints do Portal do Parceiro iFood",
};
export type ReportBranding = typeof defaultBranding;
