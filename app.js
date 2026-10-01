const state = {
  data: null,
  itemAssets: null,
  unitAssets: null,
  unitProfiles: null,
  characterIndex: 0,
  buildIndex: 0,
  skinIndex: 0,
};

const elements = {
  loading: document.querySelector("#loadingState"),
  error: document.querySelector("#errorState"),
  content: document.querySelector("#appContent"),
  search: document.querySelector("#characterSearch"),
  list: document.querySelector("#characterList"),
  resultCount: document.querySelector("#resultCount"),
  characterSelect: document.querySelector("#characterSelect"),
  characterCount: document.querySelector("#characterCount"),
  name: document.querySelector("#characterName"),
  image: document.querySelector("#characterImage"),
  portraitIndex: document.querySelector("#portraitIndex"),
  skinSelector: document.querySelector("#skinSelector"),
  classIcon: document.querySelector("#classIcon"),
  className: document.querySelector("#className"),
  perkList: document.querySelector("#perkList"),
  unitTagline: document.querySelector("#unitTagline"),
  unitSummary: document.querySelector("#unitSummary"),
  buildSelect: document.querySelector("#buildSelect"),
  buildTier: document.querySelector("#buildTier"),
  buildCounter: document.querySelector("#buildCounter"),
  source: document.querySelector("#characterSource"),
  observation: document.querySelector("#observationText"),
  criterion: document.querySelector("#criterionText"),
  scope: document.querySelector("#scopeText"),
  previous: document.querySelector("#previousCharacter"),
  next: document.querySelector("#nextCharacter"),
  copyLink: document.querySelector("#copyLink"),
  toast: document.querySelector("#toast"),
  sources: document.querySelector("#generalSources"),
};

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .trim();
}

function getRequestedState() {
  const params = new URLSearchParams(window.location.search);
  return {
    character: params.get("character") ?? params.get("personagem"),
    set: params.get("set"),
    skin: params.get("skin"),
  };
}

function getCharacterSkins(character) {
  return state.unitAssets?.[character.name]?.skins ?? [{
    name: character.name,
    image: character.image,
    primary: true,
  }];
}

function updateUrl() {
  const character = state.data.characters[state.characterIndex];
  const build = character.builds[state.buildIndex];
  const params = new URLSearchParams();
  params.set("character", character.name);
  params.set("set", build.set);
  const skin = getCharacterSkins(character)[state.skinIndex];
  if (skin && !skin.primary) params.set("skin", skin.name);
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => elements.toast.classList.remove("visible"), 2200);
}

function buildCharacterControls() {
  elements.characterSelect.innerHTML = state.data.characters
    .map((character, index) => `<option value="${index}">${character.name}</option>`)
    .join("");
  renderCharacterList();
}

function renderCharacterList(query = "") {
  const filtered = state.data.characters
    .map((character, index) => ({ character, index }))
    .filter(({ character }) => {
      const searchableNames = [character.name, ...getCharacterSkins(character).map((skin) => skin.name)];
      return searchableNames.some((name) => normalize(name).includes(normalize(query)));
    });

  elements.list.innerHTML = filtered.map(({ character, index }) => `
    <button class="character-button${index === state.characterIndex ? " active" : ""}" type="button" data-index="${index}" aria-current="${index === state.characterIndex ? "true" : "false"}">
      <img src="${getCharacterSkins(character)[0].image}" alt="" width="42" height="42" loading="lazy">
      <span>${character.name}</span>
      <b aria-hidden="true">›</b>
    </button>
  `).join("");

  elements.resultCount.textContent = query
    ? `${filtered.length} result${filtered.length === 1 ? "" : "s"}`
    : `${state.data.characters.length} in alphabetical order`;

  elements.list.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => selectCharacter(Number(button.dataset.index), 0, true));
  });
}

function renderCharacterHero(character) {
  const skins = getCharacterSkins(character);
  const skin = skins[state.skinIndex] ?? skins[0];
  elements.image.classList.add("changing");
  elements.image.onload = () => elements.image.classList.remove("changing");
  elements.image.onerror = () => elements.image.classList.remove("changing");
  elements.image.src = skin.image;
  elements.image.alt = `${skin.name} sprite`;
  elements.name.textContent = skin.name;

  elements.skinSelector.innerHTML = skins.map((option, index) => `
    <button class="skin-button${index === state.skinIndex ? " active" : ""}" type="button" data-skin-index="${index}" aria-label="Use ${option.name} skin" title="${option.name}" aria-pressed="${index === state.skinIndex}">
      <img src="${option.image}" alt="" width="38" height="38" loading="lazy">
    </button>
  `).join("");
  elements.skinSelector.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.skinIndex = Number(button.dataset.skinIndex);
      renderCharacterHero(character);
      updateUrl();
    });
  });
}

function renderUnitProfile(character) {
  const profile = state.unitProfiles?.[character.name];
  if (!profile) return;
  elements.classIcon.src = profile.classIcon;
  elements.classIcon.alt = `${profile.class} class shield`;
  elements.className.textContent = profile.class;
  elements.unitTagline.textContent = profile.tagline;
  elements.unitSummary.textContent = profile.summary;
  elements.perkList.innerHTML = profile.perks.length
    ? profile.perks.map((perk) => `
      <span class="perk-badge" title="${perk.name}">
        <img src="${perk.image}" alt="${perk.name}" width="36" height="36">
      </span>
    `).join("")
    : '<span class="no-perks">No innate perks</span>';
}

function selectCharacter(index, requestedBuild = 0, focusHeading = false, requestedSkin = 0) {
  const total = state.data.characters.length;
  state.characterIndex = (index + total) % total;
  state.buildIndex = Math.max(0, Math.min(requestedBuild, 2));

  const character = state.data.characters[state.characterIndex];
  const skins = getCharacterSkins(character);
  state.skinIndex = Math.max(0, Math.min(requestedSkin, skins.length - 1));
  renderCharacterHero(character);
  renderUnitProfile(character);
  elements.portraitIndex.textContent = String(state.characterIndex + 1).padStart(2, "0");
  elements.characterSelect.value = String(state.characterIndex);
  elements.buildSelect.innerHTML = character.builds.map((build, buildIndex) =>
    `<option value="${buildIndex}">${build.label} — ${build.set}</option>`
  ).join("");
  elements.buildSelect.value = String(state.buildIndex);

  if (character.source) {
    elements.source.href = character.source.url;
    elements.source.hidden = false;
  } else {
    elements.source.hidden = true;
  }

  renderBuild();
  renderCharacterList(elements.search.value);
  updateNavigation();
  updateUrl();

  const activeListItem = elements.list.querySelector(".character-button.active");
  activeListItem?.scrollIntoView({ block: "nearest" });
  if (focusHeading) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function renderBuild() {
  const character = state.data.characters[state.characterIndex];
  const build = character.builds[state.buildIndex];
  elements.buildTier.textContent = build.label;
  elements.buildCounter.textContent = `${state.buildIndex + 1} / ${character.builds.length}`;
  elements.observation.textContent = build.observation;
  elements.criterion.textContent = build.criterion;
  elements.scope.textContent = state.data.scope;

  Object.entries(build.items).forEach(([itemName, item]) => {
    const card = document.querySelector(`[data-item="${itemName}"]`);
    const itemAsset = state.itemAssets?.[build.set]?.items?.[itemName];
    card.querySelector('[data-field="primary"]').textContent = item.primary;
    card.querySelector('[data-field="secondary"]').textContent = item.secondary;
    card.querySelector('[data-field="itemName"]').textContent = itemAsset?.name ?? build.set;
    const image = card.querySelector("[data-item-image]");
    image.src = itemAsset?.image ?? "";
    image.alt = itemAsset ? `${itemAsset.name}, ${itemName} from the ${build.set} set` : "";
  });

  updateUrl();
}

function updateNavigation() {
  const characters = state.data.characters;
  const previous = characters[(state.characterIndex - 1 + characters.length) % characters.length];
  const next = characters[(state.characterIndex + 1) % characters.length];
  elements.previous.querySelector("strong").textContent = previous.name;
  elements.next.querySelector("strong").textContent = next.name;
}

function renderSources() {
  elements.sources.innerHTML = state.data.generalSources.map((source) => `
    <li><a href="${source.url}" target="_blank" rel="noreferrer">${source.name}</a> — ${source.usage}</li>
  `).join("");
}

function connectEvents() {
  elements.search.addEventListener("input", (event) => renderCharacterList(event.target.value));
  elements.characterSelect.addEventListener("change", (event) => selectCharacter(Number(event.target.value), 0, true));
  elements.buildSelect.addEventListener("change", (event) => {
    state.buildIndex = Number(event.target.value);
    renderBuild();
  });
  elements.previous.addEventListener("click", () => selectCharacter(state.characterIndex - 1, 0, true));
  elements.next.addEventListener("click", () => selectCharacter(state.characterIndex + 1, 0, true));
  elements.copyLink.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Build link copied.");
    } catch {
      showToast("Copy the address shown in your browser.");
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
      event.preventDefault();
      elements.search.focus();
    }
  });
}

async function init() {
  try {
    const [dataResponse, itemAssetsResponse, unitAssetsResponse, unitProfilesResponse] = await Promise.all([
      fetch("data/personagens.json?v=6"),
      fetch("data/item-assets.json?v=6"),
      fetch("data/unit-assets.json?v=6"),
      fetch("data/unit-profiles.json?v=6"),
    ]);
    if (!dataResponse.ok || !itemAssetsResponse.ok || !unitAssetsResponse.ok || !unitProfilesResponse.ok) {
      throw new Error(`HTTP failure ${dataResponse.status}/${itemAssetsResponse.status}/${unitAssetsResponse.status}/${unitProfilesResponse.status}`);
    }
    [state.data, state.itemAssets, state.unitAssets, state.unitProfiles] = await Promise.all([
      dataResponse.json(),
      itemAssetsResponse.json(),
      unitAssetsResponse.json(),
      unitProfilesResponse.json(),
    ]);

    elements.characterCount.textContent = `${state.data.characterCount} characters`;
    buildCharacterControls();
    renderSources();
    connectEvents();

    const requested = getRequestedState();
    const characterIndex = Math.max(0, state.data.characters.findIndex(
      (character) => normalize(character.name) === normalize(requested.character),
    ));
    const character = state.data.characters[characterIndex];
    const buildIndex = Math.max(0, character.builds.findIndex(
      (build) => normalize(build.set) === normalize(requested.set),
    ));
    const skinIndex = Math.max(0, getCharacterSkins(character).findIndex(
      (skin) => normalize(skin.name) === normalize(requested.skin),
    ));
    selectCharacter(characterIndex, buildIndex, false, skinIndex);

    elements.loading.hidden = true;
    elements.content.hidden = false;
  } catch (error) {
    console.error(error);
    elements.loading.hidden = true;
    elements.error.hidden = false;
  }
}

init();
