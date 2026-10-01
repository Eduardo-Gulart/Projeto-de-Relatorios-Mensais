# Relatório editorial

O modelo editorial é o padrão para relatórios sem preferência salva. Em Prévia do PDF, o seletor permite retornar ao clássico. A prévia e a exportação usam os mesmos componentes; alterações de preferência passam pelo fluxo existente de revisão.

## Etapas

- A: fontes locais licenciadas, identidade e componentes A4.
- B: capa original, resumo executivo, funil e encerramento.
- C: histórico, vendas, qualidade, custos e textos editáveis opcionais.
- D: integração ao relatório, plano de ação paginado e anexo opcional dos prints.
- E: verificação visual, compressão adaptativa e testes de regressão.

Os campos opcionais são summary, notes, actions, nextSteps, layout e includeEvidence. Registros antigos continuam válidos. Sugestões preenchem apenas campos vazios. O histórico é filtrado por identificador da loja e relatórios revisados; dados ausentes não viram zeros. A oportunidade é uma simulação, explicitamente identificada, não uma previsão.

## Validação

Build e TypeScript aprovados. Os 12 testes Vitest passaram, assim como scripts/test-features.cjs (OCR, CSV, qualidade de imagem, histórico, fechamento, plano e gráficos). ESLint dos componentes editoriais e utilitários novos passou. O lint global tem erros anteriores fora deste escopo.

Três cenários fictícios em /report-v2/demo foram exportados e rasterizados para inspeção: completo (9 páginas, 2.039.392 bytes), sem histórico/metas (8 páginas, 1.689.389 bytes), textos longos e anexo (23 páginas, 2.905.526 bytes). Cada página editorial foi renderizada em 1588 × 2246 pixels e inserida em A4. O clássico também foi exportado como teste de regressão.

Para repetir: executar npm run build, npx tsc --noEmit, npx vitest run e node scripts/test-features.cjs. Na demonstração, exportar cada cenário e conferir o PDF, não apenas a prévia HTML. A exportação aguarda fontes e imagens, detecta transbordamento e ajusta a qualidade JPEG por página; anexos particularmente extensos podem aumentar o tamanho final.

A referência visual e os PDFs de QA ficam fora do controle de versão. A marca da referência não é reutilizada.
