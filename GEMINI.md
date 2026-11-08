# REGRA PRIORITÁRIA: ECONOMIA SEM PERDA DE QUALIDADE

Economize tokens e recursos computacionais sem comprometer a qualidade final.

- Mantenha o mesmo nível de raciocínio técnico.
- Não pule etapas importantes de implementação.
- Não reduza a qualidade visual, gráfica, física (Zero-GC 60fps) ou das animações.
- Não simplifique sistemas complexos apenas para economizar tokens.
- Não remova testes, validações (`tsc --noEmit`, `tsx --test`, `vite build`) ou verificações necessárias.
- Faça análises profundas somente quando a complexidade da tarefa exigir.
- Prefira soluções localizadas e reutilize estruturas existentes.

## Protocolo Operacional (`tokenleak` + `context-pruning`)
1. **Localizar antes de ler:** Buscar linha/símbolo primeiro e ler apenas o trecho necessário (`StartLine`/`EndLine`); nunca ler arquivos grandes inteiros sem necessidade.
2. **Zero releitura:** Não reler arquivos já carregados no contexto atual, exceto após compactação ou alteração externa.
3. **Lotes paralelos:** Executar leituras, buscas e verificações independentes na mesma rodada.
4. **Edições cirúrgicas:** Usar `edit_file` apenas nos blocos alterados; nunca reescrever arquivos inteiros nem colar código longo já salvo em disco no chat.
5. **Saídas contidas:** Rodar builds/testes enxutos e inspecionar apenas erros relevantes; delegar varreduras amplas (10+ arquivos) ao subagent `research`.
6. **Comunicação direta:** Respostas curtas e objetivas em Português (Brasil), sem introduções genéricas, recapitulações longas ou preenchimento desnecessário — foco 100% no prompt.
