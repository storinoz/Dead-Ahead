# Dead Ahead — Guia de builds

Versão web da planilha de recomendações de itens e builds para os 52 personagens jogáveis de **Dead Ahead: Zombie Warfare**.

## Acessar o site

Após a publicação pelo GitHub Pages, o endereço será:

`https://storinoz.github.io/Dead-Ahead/`

## Conteúdo

- 52 personagens em ordem alfabética.
- Três árvores recomendadas por personagem.
- Atributos principais e secundários para Cup, Knife, Watch e Book.
- Observação específica para a árvore selecionada.
- Busca rápida, navegação entre personagens e links compartilháveis.
- Planilha Excel original disponível para download.

## Estrutura

- `index.html`: estrutura da página.
- `styles.css`: aparência e layout responsivo.
- `app.js`: busca, seleção de builds e navegação.
- `data/personagens.json`: dados extraídos da planilha.
- `assets/personagens`: ilustrações dos personagens.
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

Projeto de fãs, sem vínculo oficial com os criadores do jogo. As ilustrações são interpretações estilizadas geradas por IA e não são sprites oficiais.
