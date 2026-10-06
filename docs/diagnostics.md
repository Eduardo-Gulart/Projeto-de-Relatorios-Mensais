# Diagnósticos de entrada

A nova aba Diagnósticos reúne identificação da loja, visão executiva, dez áreas de avaliação, seleção rápida de pontos de atenção, comentários, recomendações e plano inicial. Não exige cadastrar a loja na base mensal. Sugestões só preenchem campos vazios; a análise deve ser conferida pelo gestor.

Cada diagnóstico e seus prints pertencem ao usuário autenticado que os criou. O servidor valida acesso à equipe, propriedade, versão de edição e propriedade dos anexos. Administradores também veem apenas seus próprios diagnósticos nesta primeira versão. O histórico permite editar, salvar cópia e excluir. Trocar de aba preserva o formulário; sair da página avisa sobre alterações não salvas.

Os prints são anexos visuais, sem OCR automático nesta aba. O OCR e os relatórios mensais permanecem no fluxo original. O backup de relatórios mensais não inclui diagnósticos. Os diagnósticos são salvos no banco da aplicação.

## PDF

Layout A4 branco, tipografia local, roxo, estados textuais e coloridos, capa, visão executiva, páginas por área, duas ações por página e prints com legenda no anexo. Seções vazias não aparecem. O exportador existente recebe um seletor opcional; a chamada mensal mantém seu padrão. Fontes, imagens e transbordamento são verificados antes da exportação.

## Armazenamento

A migração aditiva 0002_diagnostics.sql cria somente diagnostics e seu índice owner/updated. Foi gerada pela API do Drizzle; o estado anterior foi reconstruído a partir das tabelas existentes porque a migração histórica 0001_team não possui snapshot. Nenhuma migração aplicada foi alterada. Uploads usam o namespace R2 diagnostics/usuario/id, separado dos prints mensais.

O limite multipart do vinext foi ajustado para 12 MB; os dois endpoints de upload continuam limitando imagens a 10 MB. Nenhum serviço externo ou leitura automática adicional foi adicionado.

## Verificação

18 testes Vitest, TypeScript, build e scripts/test-features.cjs. Testes incluem isolamento entre usuários, conflitos de versão, exclusão e rejeição de anexos de outra conta. Fluxo local testado no navegador: preencher, conferir, salvar, reabrir e exportar. Tela de 390 px sem transbordamento horizontal. PDFs curto e longo foram renderizados e inspecionados.
