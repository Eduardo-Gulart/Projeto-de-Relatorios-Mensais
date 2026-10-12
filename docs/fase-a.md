# Fase A: fundação do relatório editorial

## Escopo
- Demonstração isolada em `/report-v2/demo`, com dados fictícios.
- Nenhum campo novo em Report ou no banco. O PDF clássico continua sendo o padrão da edição até a integração das próximas fases.
- Tokens e fontes restritos ao documento editorial; sem mudanças no OCR, permissões, salvamento ou recuperação.
- Barlow Condensed 800: desenho condensado e peso próximo à referência. IBM Plex Sans 400/500/600 e Mono 400 para textos e rótulos.
- WOFF2 Latin de @fontsource via jsDelivr, arquivos locais; licenças OFL do repositório google/fonts. Nenhuma chamada a CDN no aplicativo.
- header.png preservado byte a byte. Selos recortados com máscara circular nas caixas (1012,104,1258,350) e (1298,104,1544,350).
- Cor da capa amostrada na borda esquerda: #FAF2E8.

## Validação
1. Abrir `/report-v2/demo` e baixar o PDF demonstrativo.
2. Conferir títulos, grade 3x2, marcas, rodapé e ausência de cortes.
3. Comparação local: `docs/referencia/comparacao-fase-a.png` (ignorada no Git, contém referência privada).
4. Executar `npx vitest run`, `npx tsc --noEmit`, `npm run build`.
5. Executar `npm run lint`: há pendências preexistentes em telas, hooks, scripts CJS e arquivos distribuídos do Tesseract. O lint direcionado aos arquivos desta fase passa.

## Resultado
PDF demonstrativo: uma imagem JPEG de 1588x2246, A4, aproximadamente 211 KB. Exportação editorial usa escala 2, JPEG 0,92, FAST, fundo por página, carregamento explícito das fontes e imagens. O pipeline clássico mantém a composição e o tratamento dos cabeçalhos existentes.

## Limites desta fase
As páginas restantes, campos opcionais, integração de histórico, seletor classic/editorial e testes de três relatórios completos são fases B–E. A meta de 3 MB do documento completo ainda não foi validada. Ações e diagnósticos da demonstração não usam dados reais.
