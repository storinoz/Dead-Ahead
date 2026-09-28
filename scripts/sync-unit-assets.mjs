import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const charactersPath = path.join(repoRoot, "data", "personagens.json");
const dataPath = path.join(repoRoot, "data", "unit-assets.json");
const outputDir = path.join(repoRoot, "assets", "units");
const cacheDir = path.join(repoRoot, ".tmp", "unit-pages");
const characterData = JSON.parse(await fs.readFile(charactersPath, "utf8"));

const slugify = (value) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("en-US")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

async function fetchText(url, attempts = 6) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const error = new Error(`${response.status} ao carregar ${url}`);
        error.status = response.status;
        error.retryAfter = Number(response.headers.get("retry-after")) || 0;
        throw error;
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const delay = error.status === 429
          ? Math.max(error.retryAfter * 1000, attempt * 5000)
          : attempt * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

function cleanCell(value) {
  return value
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSkins(markdown, characterName) {
  const headingMatch = markdown.match(/^## Skins(?: and Synergies)?\s*$/im);
  if (!headingMatch) throw new Error(`Seção de skins não encontrada para ${characterName}.`);
  const sectionStart = headingMatch.index + headingMatch[0].length;
  const remainder = markdown.slice(sectionStart);
  const nextHeading = remainder.search(/^##\s+/m);
  const section = nextHeading >= 0 ? remainder.slice(0, nextHeading) : remainder;
  const rows = section.split("\n").filter((line) => /^\|.+\|\s*$/.test(line));
  const skins = [];

  for (const row of rows) {
    if (/^\|\s*(Skin|---)/i.test(row)) continue;
    const cells = row.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 2) continue;
    const imageMatch = cells[1].match(/!\[[^\]]*\]\((https?:\/\/deadahead\.wiki\.gg\/images\/[^)]+)\)/i);
    if (!imageMatch) continue;
    const name = cleanCell(cells[0]);
    if (!name || skins.some((skin) => skin.name === name)) continue;
    skins.push({ name, sourceImage: imageMatch[1] });
  }

  if (!skins.length) throw new Error(`Nenhum sprite detectado para ${characterName}.`);
  skins[0].name = characterName;
  return skins;
}

async function downloadImage(sourceUrl, outputPath, attempts = 3) {
  const withoutProtocol = sourceUrl.replace(/^https?:\/\//, "");
  const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(withoutProtocol)}&output=png`;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`${response.status} ao baixar ${sourceUrl}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 100 || bytes[0] !== 0x89 || bytes.toString("ascii", 1, 4) !== "PNG") {
        throw new Error(`Imagem inválida recebida de ${sourceUrl}`);
      }
      await fs.writeFile(outputPath, bytes);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw lastError;
}

async function mapLimit(values, limit, task) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(cacheDir, { recursive: true });

let nextPageRequestAt = 0;
async function getPageMarkdown(character, pageUrl) {
  const cachePath = path.join(cacheDir, `${slugify(character.name)}.md`);
  try {
    return await fs.readFile(cachePath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const wait = Math.max(0, nextPageRequestAt - Date.now());
  nextPageRequestAt = Math.max(nextPageRequestAt, Date.now()) + 1600;
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  const wikiPath = new URL(pageUrl).pathname;
  const markdown = await fetchText(`https://r.jina.ai/http://deadahead.wiki.gg${wikiPath}`);
  await fs.writeFile(cachePath, markdown, "utf8");
  return markdown;
}

const mappedCharacters = await mapLimit(characterData.characters, 2, async (character) => {
  const pageUrl = character.source?.url;
  if (!pageUrl) throw new Error(`Fonte ausente para ${character.name}.`);
  const markdown = await getPageMarkdown(character, pageUrl);
  const skins = parseSkins(markdown, character.name);
  console.log(`${character.name}: ${skins.length} skin(s) encontrada(s)`);
  return { character, pageUrl, skins };
});

const payload = {};
const downloads = [];
for (const { character, pageUrl, skins } of mappedCharacters) {
  const characterSlug = slugify(character.name);
  const characterDir = path.join(outputDir, characterSlug);
  await fs.mkdir(characterDir, { recursive: true });
  payload[character.name] = { source: pageUrl, skins: [] };

  skins.forEach((skin, index) => {
    const skinSlug = slugify(skin.name) || `skin-${index + 1}`;
    const fileName = `${skinSlug}.png`;
    const outputPath = path.join(characterDir, fileName);
    payload[character.name].skins.push({
      name: skin.name,
      image: `assets/units/${characterSlug}/${fileName}`,
      sourceImage: skin.sourceImage,
      primary: index === 0,
    });
    downloads.push({ sourceUrl: skin.sourceImage, outputPath });
  });
}

await mapLimit(downloads, 8, async ({ sourceUrl, outputPath }, index) => {
  await downloadImage(sourceUrl, outputPath);
  if ((index + 1) % 20 === 0 || index + 1 === downloads.length) {
    console.log(`${index + 1}/${downloads.length} sprites baixados`);
  }
});

await fs.writeFile(dataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Concluído: ${Object.keys(payload).length} personagens e ${downloads.length} sprites oficiais.`);
