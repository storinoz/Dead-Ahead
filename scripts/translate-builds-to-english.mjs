import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const dataPath = path.join(repoRoot, "data", "personagens.json");
const data = JSON.parse(await fs.readFile(dataPath, "utf8"));

const termMap = new Map([
  ["Dano à distância", "Ranged Damage"],
  ["Tempo de preparação", "Preparation Time"],
  ["Chance crítica", "Critical Chance"],
  ["Dano crítico", "Critical Damage"],
  ["Dano corpo a corpo", "Melee Damage"],
  ["HP plano", "Flat HP"],
  ["Preparação", "Preparation"],
  ["Agilidade", "Agility"],
  ["Alcance", "Range"],
  ["Custo", "Cost"],
]);

const observationMap = {
  Hunter: "The bonus scales with the distance traveled by the attack. Prioritize range, damage, and safe positioning.",
  Gentleman: "Damage increases after a critical hit. Prioritize critical chance and critical damage to maintain the bonus.",
  Chef: "Strengthens allies while the unit remains alive. Prioritize cost reduction, preparation, and survivability.",
  Tactical: "Ignores part of the enemy's bullet resistance. Use this build against armored or bullet-resistant enemies.",
  Military: "The chance of an extra attack increases overall damage output. Prioritize damage, preparation, and a strong fire rate.",
  Gambling: "Critical chance increases at low health. This is a risk-oriented critical build.",
  Fitness: "Removes pauses between attacks. Prioritize main damage, preparation, and agility to maintain constant pressure.",
  Surgery: "Doubles damage below 50% health. Prioritize HP to remain in the activation range longer.",
  "Lucky Guy": "Prevents one fatal hit and leaves the unit at 1 HP. Prioritize HP, cost reduction, and preparation.",
  "Big Boy": "Converts high HP into additional damage. Prioritize percentage HP before offensive attributes.",
  Pincushion: "Takes advantage of the unit's large health pool while absorbing damage. Prioritize HP and survivability.",
  "Ice Breaker": "Increases damage against stunned or frozen enemies. Prioritize damage and frequent crowd control.",
  SwissMade: "Directly increases main damage without requiring a condition. Prioritize damage and preparation.",
  Firefighter: "Increases damage against burning enemies. Works best with frequent fire application.",
  Boss: "Temporarily increases the whole team's damage when deployed. Prioritize cost reduction and preparation to refresh the bonus.",
  Builder: "Can completely block incoming damage. Prioritize HP and preparation to extend its battlefield presence.",
};

function translateStats(value) {
  let translated = value;
  for (const [source, target] of termMap) translated = translated.replaceAll(source, target);
  return translated;
}

data.title = "Dead Ahead Zombie Warfare Guide";
data.scope = "Recommendations are primarily aimed at the campaign. Skirmish, events, team synergies, and balance changes may require adjustments.";
data.generalSources = [
  { name: "General reference — items", url: "https://deadahead.wiki.gg/wiki/Item_set", usage: "Item slots, primary attributes, and set bonuses." },
  { name: "General reference — units", url: "https://deadahead.wiki.gg/wiki/Units", usage: "Current roster of 52 playable human units." },
  { name: "Community — recommendations", url: "https://www.reddit.com/r/DeadAhead/comments/1hzapb7/sets_recommendations/", usage: "Cross-checking general recommendations by role." },
  { name: "Update 4.4.3", url: "https://deadahead.zone/news/news-post-9", usage: "Demolitionist and Haruko release; initial recommendations." },
];

for (const character of data.characters) {
  if (character.source) character.source.usage = "Unit page: role, range, attributes, and Item Sets section when available.";
  for (const [index, build] of character.builds.entries()) {
    build.label = index === 0 ? "Primary" : `Alternative ${index}`;
    for (const item of Object.values(build.items)) {
      item.primary = translateStats(item.primary);
      item.secondary = translateStats(item.secondary);
    }
    const observation = observationMap[build.set];
    if (!observation) throw new Error(`Observation not mapped for ${build.set}.`);
    build.observation = `${build.set} on ${character.name}: ${observation}`;
    build.criterion = index === 0
      ? "Primary recommendation from revision 01; notes adjusted for the selected set."
      : "Recommended alternative based on the unit's role, range, and mechanics.";
  }
}

await fs.writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`Translated ${data.characters.length} characters and ${data.characters.length * 3} builds to English.`);
