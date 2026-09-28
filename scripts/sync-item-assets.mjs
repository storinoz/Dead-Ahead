import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(repoRoot, "assets", "items");
const dataPath = path.join(repoRoot, "data", "item-assets.json");
const slots = ["cup", "knife", "watch", "book"];

const sets = [
  ["Big Boy", "Big_Boy"],
  ["Boss", "Boss"],
  ["Builder", "Builder"],
  ["Chef", "Chef"],
  ["Firefighter", "Firefighter"],
  ["Fitness", "Fitness"],
  ["Gambling", "Gambling"],
  ["Gentleman", "Gentleman"],
  ["Hunter", "Hunter"],
  ["Ice Breaker", "Ice_Breaker"],
  ["Lucky Guy", "Lucky_Guy"],
  ["Military", "Military"],
  ["Pincushion", "Pincushion"],
  ["Surgery", "Surgery"],
  ["SwissMade", "SwissMade"],
  ["Tactical", "Tactical"],
];

const slugify = (value) => value.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ao carregar ${url}`);
  return response.text();
}

async function downloadImage(sourceUrl, outputPath) {
  const withoutProtocol = sourceUrl.replace(/^https?:\/\//, "");
  const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(withoutProtocol)}&output=png`;
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error(`${response.status} ao baixar ${sourceUrl}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("image/png")) throw new Error(`Resposta inesperada para ${sourceUrl}: ${contentType}`);
  await fs.writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
}

await fs.mkdir(outputDir, { recursive: true });
const payload = {};

for (const [setName, pageSlug] of sets) {
  const pageUrl = `https://deadahead.wiki.gg/wiki/${pageSlug}_(Item_Set)`;
  const markdown = await fetchText(`https://r.jina.ai/http://deadahead.wiki.gg/wiki/${pageSlug}_(Item_Set)`);
  const spriteStart = markdown.indexOf("| Sprite |");
  const nameStart = markdown.indexOf("| Name |", spriteStart);
  if (spriteStart < 0 || nameStart < 0) throw new Error(`Tabela de itens não encontrada para ${setName}.`);

  const spriteRow = markdown.slice(spriteStart, nameStart);
  const imageMatches = [...spriteRow.matchAll(/!\[Image \d+: ([^\]]+\.png)\]\((https?:\/\/deadahead\.wiki\.gg\/images\/[^)]+)\)/gi)];
  const uniqueImages = [];
  for (const match of imageMatches) {
    if (!uniqueImages.some((item) => item.url === match[2])) uniqueImages.push({ label: match[1], url: match[2] });
  }
  if (uniqueImages.length < 4) throw new Error(`${setName} possui apenas ${uniqueImages.length} sprites detectados.`);

  const nameLine = markdown.slice(nameStart, markdown.indexOf("\n", nameStart));
  const itemNames = nameLine.split("|").slice(2, 6).map((value) => value.trim());
  if (itemNames.length !== 4 || itemNames.some((name) => !name)) throw new Error(`Nomes de itens incompletos para ${setName}.`);

  payload[setName] = { source: pageUrl, items: {} };
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index];
    const fileName = `${slugify(setName)}-${slot}.png`;
    await downloadImage(uniqueImages[index].url, path.join(outputDir, fileName));
    payload[setName].items[slot] = {
      name: itemNames[index],
      image: `assets/items/${fileName}`,
      sourceImage: uniqueImages[index].url,
    };
  }
  console.log(`${setName}: 4 itens`);
}

await fs.writeFile(dataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Concluído: ${Object.keys(payload).length} sets e ${Object.keys(payload).length * 4} sprites.`);
