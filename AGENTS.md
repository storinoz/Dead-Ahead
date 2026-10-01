# Projeto Dead Ahead — versão web

Este repositório contém o site estático publicado no GitHub Pages a partir da planilha `Planilha_completa_builds rev02.xlsx`.

## Arquivos canônicos

- `data/personagens.json`: dados exibidos pelo site, com 52 personagens e 156 builds.
- `data/item-assets.json`: catálogo dos 16 conjuntos, com nome, imagem local e fonte dos 64 itens.
- `data/unit-assets.json`: catálogo de 52 personagens e 162 sprites entre aparências principais e skins.
- `data/unit-profiles.json`: classe, resumo e vantagens das 52 unidades.
- `assets/units/<personagem>/*.png`: sprites exatos dos personagens e suas skins.
- `assets/classes/*.png` e `assets/perks/*.png`: ícones exibidos no perfil da unidade.
- `assets/items/*.png`: sprites dos quatro itens de cada conjunto; nomes seguem `<set>-<tipo>.png`.
- `assets/branding/*`: identidade visual e arte oficial usadas no cabeçalho.
- `downloads/Planilha_completa_builds_rev02.xlsx`: planilha completa oferecida para download.
- `index.html`, `styles.css` e `app.js`: aplicação web sem dependências de execução.
- `scripts/sync-item-assets.mjs`: baixa novamente os sprites e recria `data/item-assets.json`.
- `scripts/sync-unit-assets.mjs`: baixa personagens e skins e recria `data/unit-assets.json`.
- `scripts/sync-unit-profiles.mjs`: baixa classes, vantagens e textos e recria `data/unit-profiles.json`.
- `scripts/translate-builds-to-english.mjs`: traduz e padroniza todos os dados de builds para inglês.

## Regras

1. Preserve os personagens em ordem alfabética.
2. Cada personagem deve possuir exatamente três builds.
3. Mantenha a correspondência entre nome, imagem, fonte e builds.
4. Não substitua a aparência principal por skins.
5. Recomendações alteradas devem ser verificadas em fontes atuais.
6. O site deve continuar funcionando como conteúdo estático no GitHub Pages.
7. Teste layouts de computador e celular antes de publicar.
8. Ao adicionar um conjunto, inclua Cup, Knife, Watch e Book em `data/item-assets.json` e `assets/items`.
9. Preserve o layout dos quatro itens em uma coluna e os textos explicativos na coluna adjacente em telas grandes.
10. A lista lateral deve usar somente a aparência principal; skins são selecionadas apenas no painel do personagem.
11. Não use imagens geradas por IA para personagens ou skins.
12. A interface e todo conteúdo exibido pelo site devem permanecer em inglês.
13. A busca deve encontrar nomes de skins, mas o resultado lateral deve continuar sendo a unidade principal.
14. Preserve os modos claro e escuro, a preferência salva pelo navegador e os balões explicativos das vantagens.

## Publicação

O GitHub Pages deve publicar a branch `main` a partir da raiz `/`. Não há etapa de compilação.
