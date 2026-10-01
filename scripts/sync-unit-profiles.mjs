import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const characterData = JSON.parse(await fs.readFile(path.join(repoRoot, "data", "personagens.json"), "utf8"));
const outputPath = path.join(repoRoot, "data", "unit-profiles.json");
const classDir = path.join(repoRoot, "assets", "classes");
const perkDir = path.join(repoRoot, "assets", "perks");
const cacheDir = path.join(repoRoot, ".tmp", "unit-profile-pages");

const classes = {
  Fighter: {
    icon: "http://deadahead.wiki.gg/images/Fighter_Logo.png?345cc3",
    units: ["Redneck", "Jailer", "Mechanic", "Glenn", "Private Rodriguez", "Carol", "Rogue", "Berserker", "Saw", "Cashier", "Sarah"],
  },
  Damager: {
    icon: "http://deadahead.wiki.gg/images/Damager_Logo.png?8d838a",
    units: ["Builder", "Firefighter", "Grenadier", "Guard", "Builder Abby", "Light Soldier", "Turbo", "Haruko"],
  },
  Heavyweight: {
    icon: "http://deadahead.wiki.gg/images/Heavyweight_Logo.png?36224b",
    units: ["Chopper", "Soldier", "Willy", "Juggernaut", "Lionheart", "Red Hood"],
  },
  Shooter: {
    icon: "http://deadahead.wiki.gg/images/Shooter_Logo.png?22833c",
    units: ["SpecOps", "Gunslinger", "Carlos", "Swat", "Sonya", "Dr. Kane", "Hero"],
  },
  Shotgunner: {
    icon: "http://deadahead.wiki.gg/images/Shotgunner_Logo.png?184733",
    units: ["Farmer", "Lester", "Policeman Diaz", "Ranger", "Flamethrower", "Dr. Norman"],
  },
  Sniper: {
    icon: "http://deadahead.wiki.gg/images/Sniper_Logo.png?7a95d8",
    units: ["Sheriff Charlotte", "Sniper Polina", "Andrea"],
  },
  Support: {
    icon: "http://deadahead.wiki.gg/images/Support_Logo.png?aba42d",
    units: ["Pepper", "Welder", "Medic", "Cap", "Austin", "Agents", "Paramedic Nancy", "Queen", "Dr. Miller", "Maria", "Demolitionist"],
  },
};

const slugify = (value) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("en-US")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

function plainText(value) {
  return value
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[*_`#]/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceFileName(sourceUrl) {
  const segments = new URL(sourceUrl).pathname.split("/").filter(Boolean);
  const thumbIndex = segments.indexOf("thumb");
  return decodeURIComponent(thumbIndex >= 0 ? segments[thumbIndex + 1] : segments.at(-1));
}

async function fetchText(url, attempts = 6) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const error = new Error(`${response.status} while loading ${url}`);
        error.status = response.status;
        error.retryAfter = Number(response.headers.get("retry-after")) || 0;
        throw error;
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const delay = error.status === 429 ? Math.max(error.retryAfter * 1000, attempt * 5000) : attempt * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

async function downloadImage(sourceUrl, targetPath) {
  const withoutProtocol = sourceUrl.replace(/^https?:\/\//, "");
  const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(withoutProtocol)}&output=png`;
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error(`${response.status} while downloading ${sourceUrl}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 100 || bytes[0] !== 0x89 || bytes.toString("ascii", 1, 4) !== "PNG") {
    throw new Error(`Invalid image received from ${sourceUrl}`);
  }
  await fs.writeFile(targetPath, bytes);
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

function parsePerkCatalog(markdown) {
  const catalog = new Map();
  for (const row of markdown.split("\n").filter((line) => /^\|\s*!\[Image/i.test(line))) {
    const cells = row.split("|").slice(1, -1).map((cell) => cell.trim());
    const match = cells[0]?.match(/!\[[^\]]*\]\((https?:\/\/deadahead\.wiki\.gg\/images\/[^)]+)\)/i);
    if (!match || !cells[1]) continue;
    const fileName = sourceFileName(match[1]);
    catalog.set(fileName.toLocaleLowerCase("en-US"), {
      name: plainText(cells[1]),
      info: plainText(cells[2] ?? ""),
      sourceImage: match[1],
    });
  }
  return catalog;
}

function extractOverview(markdown) {
  const match = markdown.match(/^## (?:Overview|Functionality)\s*$/im);
  if (!match) return "";
  const remainder = markdown.slice(match.index + match[0].length);
  const nextHeading = remainder.search(/^##\s+/m);
  const section = nextHeading >= 0 ? remainder.slice(0, nextHeading) : remainder;
  const paragraphs = section.split(/\n\s*\n/)
    .map(plainText)
    .filter((text) => text && !text.startsWith("Special Ability") && !text.startsWith("Overview"));
  return paragraphs[0] ?? "";
}

function extractTagline(markdown) {
  const beforeStats = markdown.slice(0, markdown.indexOf("Main Stats"));
  const candidates = beforeStats.split(/\n\s*\n/)
    .map(plainText)
    .filter((text) => text && !text.startsWith("Title:") && !text.startsWith("URL Source:") && !text.startsWith("Published Time:") && text !== "Markdown Content:");
  return candidates.at(-1) ?? "";
}

function extractPerks(markdown, perkCatalog) {
  const abilitiesStart = markdown.search(/^Abilities\s*$/im);
  if (abilitiesStart < 0) return [];
  const afterAbilities = markdown.slice(abilitiesStart);
  const end = afterAbilities.search(/^Unlock Requirements\s*$/im);
  const section = end >= 0 ? afterAbilities.slice(0, end) : afterAbilities.slice(0, 2500);
  const imageMatches = [...section.matchAll(/!\[[^\]]*\]\((https?:\/\/deadahead\.wiki\.gg\/images\/[^)]+)\)/gi)];
  const perks = [];
  for (const match of imageMatches) {
    const fileName = sourceFileName(match[1]).toLocaleLowerCase("en-US");
    const perk = perkCatalog.get(fileName);
    if (!perk || perks.some((item) => item.name === perk.name)) continue;
    perks.push(perk);
  }
  return perks;
}

const manualPerksByUnit = {
  Agents: ["AvailableFromStart.png", "Silent.png", "TwoAtOnce.png"],
  Andrea: ["HighAccuracy_Icon.png", "Silent.png"],
  Austin: ["ExtraMoneyLoot.png"],
  Berserker: ["FearInspiration.png"],
  Cap: ["AlliesBuff.png", "NoZombieChance.png"],
  Carol: ["SuperFastMelee.png"],
  Chopper: ["ManualAbility.png"],
  "Dr. Kane": ["Mark.png"],
  "Dr. Miller": ["Mine.png"],
  "Dr. Norman": ["StunAbility.png"],
  Glenn: ["Revival.png"],
  Grenadier: ["ManualAbility.png", "NoZombieChance.png"],
  Hero: ["AdditionalDamage.png", "Piercing.png"],
  Jailer: ["StunAbility.png"],
  Juggernaut: ["ExtraHealth.png", "NoZombieChance.png"],
  Lionheart: ["ManualAbility.png"],
  Maria: ["DoubleTarget.png", "HighAccuracy_Icon.png"],
  Mechanic: ["AdditionalDamage.png"],
  Medic: ["AlliesHealing.png"],
  "Paramedic Nancy": ["AlliesHealing.png", "Revive.png"],
  Pepper: ["DodgeChance.png", "Knockback.png"],
  Queen: ["FearInspiration.png", "ManualAbility.png"],
  Ranger: ["DodgeChance.png"],
  "Red Hood": ["WaveLeash.png"],
  Rogue: ["StunAbility.png", "NoZombieChance.png"],
  Saw: ["FearInspiration.png"],
  "Sheriff Charlotte": ["HighAccuracy_Icon.png"],
  "Sniper Polina": ["HighAccuracy_Icon.png"],
  Soldier: ["NoZombieChance.png"],
  SpecOps: ["DropOnBattlefield.png", "NoZombieChance.png"],
  Swat: ["NoZombieChance.png"],
  Welder: ["TargetBlockadeOnly.png", "Repairs.png", "NoZombieChance.png"],
  Willy: ["StunAbility.png", "ExtraHealth.png"],
  "Builder Abby": ["Transform.png"],
  Flamethrower: ["NoZombieChance.png"],
};

function addCatalogPerk(perks, perkCatalog, fileName) {
  const perk = perkCatalog.get(fileName.toLocaleLowerCase("en-US"));
  if (perk && !perks.some((item) => item.name === perk.name)) perks.push(perk);
}

function addInferredPerks(markdown, characterName, className, perks, perkCatalog) {
  for (const fileName of manualPerksByUnit[characterName] ?? []) addCatalogPerk(perks, perkCatalog, fileName);
  if (className === "Damager") addCatalogPerk(perks, perkCatalog, "MeleeResistance.png");
  if (className === "Sniper") addCatalogPerk(perks, perkCatalog, "HighAccuracy_Icon.png");
  if (className === "Shooter" && characterName !== "Hero") addCatalogPerk(perks, perkCatalog, "HighFireRate.png");

  const resistanceFiles = {
    Ranged: "ResistanceBullets.png",
    Bullet: "ResistanceBullets.png",
    Melee: "MeleeResistance.png",
    Fire: "ResistanceFire.png",
    Explosion: "ExplosionResist.png",
    Stun: "FreezeResist.png",
    Poison: "ResistancePoison.png",
  };
  const resistanceStart = markdown.search(/^Resistances\s*$/im);
  if (resistanceStart >= 0) {
    const remainder = markdown.slice(resistanceStart);
    const end = remainder.search(/^Unlock Requirements\s*$/im);
    const lines = (end >= 0 ? remainder.slice(0, end) : remainder.slice(0, 2500)).split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const label = plainText(lines[index]);
      const perkFile = resistanceFiles[label];
      if (!perkFile) continue;
      let value = "";
      for (let offset = index + 1; offset < Math.min(lines.length, index + 5); offset += 1) {
        value = plainText(lines[offset]);
        if (value) break;
      }
      if (/^(?:[1-9]\d*%|immune|immunity)$/i.test(value)) addCatalogPerk(perks, perkCatalog, perkFile);
    }
  }

  const knockbackMatch = markdown.match(/^Knockback Strength\s*\n\s*\n\s*(\d+)/im);
  if (knockbackMatch && Number(knockbackMatch[1]) > 0) addCatalogPerk(perks, perkCatalog, "Knockback.png");
}

await Promise.all([classDir, perkDir, cacheDir].map((directory) => fs.mkdir(directory, { recursive: true })));

const perksMarkdown = await fetchText("https://r.jina.ai/http://deadahead.wiki.gg/wiki/Perks");
const perkCatalog = parsePerkCatalog(perksMarkdown);
if (perkCatalog.size < 30) throw new Error(`Only ${perkCatalog.size} perks were parsed.`);

const classByUnit = new Map();
for (const [className, value] of Object.entries(classes)) {
  for (const unit of value.units) classByUnit.set(unit, className);
  value.localIcon = `assets/classes/${slugify(className)}.png`;
}

let nextPageRequestAt = 0;
async function getPage(character) {
  const cachePath = path.join(cacheDir, `${slugify(character.name)}.md`);
  try {
    return await fs.readFile(cachePath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const wait = Math.max(0, nextPageRequestAt - Date.now());
  nextPageRequestAt = Math.max(nextPageRequestAt, Date.now()) + 1600;
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  const wikiPath = new URL(character.source.url).pathname;
  const markdown = await fetchText(`https://r.jina.ai/http://deadahead.wiki.gg${wikiPath}`);
  await fs.writeFile(cachePath, markdown, "utf8");
  return markdown;
}

const profiles = {};
const usedPerks = new Map();
await mapLimit(characterData.characters, 2, async (character) => {
  const markdown = await getPage(character);
  const className = classByUnit.get(character.name);
  if (!className) throw new Error(`Class not mapped for ${character.name}.`);
  const detectedPerks = extractPerks(markdown, perkCatalog);
  addInferredPerks(markdown, character.name, className, detectedPerks, perkCatalog);
  const perks = detectedPerks.map((perk) => {
    const fileName = `${slugify(perk.name)}.png`;
    const localPerk = { ...perk, image: `assets/perks/${fileName}` };
    usedPerks.set(fileName, localPerk);
    return localPerk;
  });
  const summary = extractOverview(markdown);
  if (!summary) throw new Error(`Overview not found for ${character.name}.`);
  profiles[character.name] = {
    class: className,
    classIcon: classes[className].localIcon,
    tagline: extractTagline(markdown),
    summary,
    perks,
    source: character.source.url,
  };
  console.log(`${character.name}: ${className}, ${perks.length} perk(s)`);
});

await mapLimit(Object.entries(classes), 5, async ([className, value]) => {
  await downloadImage(value.icon, path.join(classDir, `${slugify(className)}.png`));
});
await mapLimit([...usedPerks.entries()], 8, async ([fileName, perk]) => {
  await downloadImage(perk.sourceImage, path.join(perkDir, fileName));
});

await fs.writeFile(outputPath, `${JSON.stringify(profiles, null, 2)}\n`, "utf8");
console.log(`Completed: ${Object.keys(profiles).length} profiles, ${Object.keys(classes).length} classes and ${usedPerks.size} perk icons.`);
