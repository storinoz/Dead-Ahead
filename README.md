# Dead Ahead — Guia de builds

Versão web da planilha de recomendações de itens e builds para os 52 personagens jogáveis de **Dead Ahead: Zombie Warfare**.

## Acessar o site

Após a publicação pelo GitHub Pages, o endereço será:

`https://storinoz.github.io/Dead-Ahead/`

## Conteúdo

- 52 personagens em ordem alfabética.
- Três árvores recomendadas por personagem.
- Atributos principais e secundários para Cup, Knife, Watch e Book.
- Sprites próprios de cada item, atualizados junto com a árvore selecionada.
- Observação específica para a árvore selecionada.
- Busca rápida, navegação entre personagens e links compartilháveis.
- Planilha Excel original disponível para download.

## Estrutura

- `index.html`: estrutura da página.
- `styles.css`: aparência e layout responsivo.
- `app.js`: busca, seleção de builds e navegação.
- `data/personagens.json`: dados extraídos da planilha.
- `data/item-assets.json`: nomes, imagens e fontes dos itens dos 16 conjuntos.
- `assets/personagens`: ilustrações dos personagens.
- `assets/items`: 64 sprites de itens organizados por conjunto e tipo.
- `assets/branding`: ícone e arte de cabeçalho do jogo.
- `scripts/sync-item-assets.mjs`: sincroniza os sprites a partir da wiki do jogo.
- `downloads`: versão completa da planilha Excel.

## Atualização local

Abra um terminal nesta pasta e execute:

```powershell
git pull
```

Depois das alterações:

```powershell
git add .
git commit -m "Descreva a alteração"
git push
```

O GitHub Pages atualizará o site após o envio para a branch `main`.

## Nota

Projeto de fãs, sem vínculo oficial com os criadores do jogo. As ilustrações dos personagens são interpretações estilizadas; os itens usam sprites de referência de seus conjuntos.
