# Diagnósticos de entrada v2

## Fluxo
1. Abra **Diagnósticos** e crie um diagnóstico pessoal.
2. Preencha a ficha e marque problemas nas 13 áreas. Sem problemas: use **Conferi, sem problemas**. O status é calculado; uma área com pontos nunca fica adequada.
3. Se houver valor, use o campo numérico ou uma faixa. As faixas são referências editáveis da gestão, não limites oficiais do iFood. Elas não alteram a severidade da opção.
4. Anexe o print. Antes do envio, recorte a área útil e cubra IDs/e-mails com tarjas opacas. Só o PNG editado é enviado. Cada print fica vinculado aos pontos da área. Para texto adicional, use **Outro (opcional)**.
5. Revise o resumo e o plano automático: A = 7 dias, M = 30 e B = 60. Ações, responsável e prazo podem ser ajustados. Os avisos destacam pontos sem ação e expansão de incentivos com risco de margem/ROAS.
6. Confira as informações, salve e abra a prévia. **Imprimir / salvar PDF** usa texto selecionável: escolha Salvar como PDF, tamanho A4 e desative cabeçalhos/rodapés do navegador. **Baixar PDF compatível** oferece a alternativa em imagem, escala 2 e JPEG 0,96, com arquivo potencialmente maior.

## Dados e compatibilidade
- Catálogo versionado em `lib/diagnostic-catalog.ts`: IDs estáveis, aliases dos 45 textos antigos e 109 opções em 13 áreas. Alterar texto não deve alterar ID.
- A versão 1 é normalizada em memória na leitura. Encaminhamentos, notas, imagens, ações e prazos anteriores são preservados; registros contraditórios viram pontos para conferência. A próxima gravação explícita armazena schemaVersion 2.
- D1 já guarda o documento em payload JSON. **Nenhuma migração SQL é necessária.** Controle de proprietário, versão concorrente e acesso aos prints continuam na API.
- Prints já existentes no armazenamento não são apagados ao criar uma versão com tarjas. Os novos pixels exportados são achatados; o arquivo anterior continua sujeito ao acesso privado já existente.
- Nenhum arquivo de relatório mensal, OCR, dashboard, backup, login ou equipe foi alterado. `lib/download.ts` permanece intacto: os diagnósticos usam um exportador separado.

## PDF e paginação
A capa reúne ficha, placar e prioridades. Cada área apresenta todos os prints antes da tabela de evidência, encaminhamento, KPI, linha de base e meta. Áreas adequadas têm um resumo único; seus prints permanecem em anexo, em largura total. O plano usa colunas de 7/30/60 dias e termina com KPIs e revisão em 30 dias.

O empacotador mede o conteúdo e preserva áreas inteiras quando cabem em uma folha. Prints altos são divididos em partes consecutivas em largura total, sem omitir pixels. Títulos ficam acompanhados de conteúdo. O preenchimento de aproximadamente 70% é um objetivo, não uma garantia matemática para qualquer combinação: preservar uma área inteira ou um print legível pode deixar espaço na página anterior. Não se ampliam imagens ou margens artificialmente para simular conteúdo.

## Verificação
```sh
node node_modules/vitest/vitest.mjs run
node scripts/test-features.cjs
npm run build
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Testes atualizados substituem status/recomendações manuais por pontos do catálogo e busca por ID. A paginação prioriza ocupar folhas anteriores, em vez de redistribuir conteúdo para preencher a última. Novos testes cobrem migração dos 45 textos e encaminhamentos, contradições, status automático, vínculos de prints/ações, plano 7/30/60, avisos de margem, preservação de edição e cortes de prints altos.

A prova privada de QA usa a referência da Ra’ah Açaí. As três áreas sem dados na referência são explicitamente simuladas; o documento não representa uma nova avaliação final da loja. PDFs e imagens privadas de QA ficam fora do Git e da publicação.

## Limites
- Tarjas dependem da seleção feita pelo gestor; não há detecção automática de dados pessoais.
- A impressão usa o mecanismo do navegador. O fallback mantém compatibilidade se a impressão local não estiver disponível.
- Metas e linhas de base não são inventadas: valores ausentes ficam identificados para definição pela gestão.
