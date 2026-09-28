const state = {
  data: null,
  itemAssets: null,
  characterIndex: 0,
  buildIndex: 0,
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
  buildSelect: document.querySelector("#buildSelect"),
  buildTier: document.querySelector("#buildTier"),
  buildTitle: document.querySelector("#buildTitle"),
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
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function getRequestedState() {
  const params = new URLSearchParams(window.location.search);
  return {
    character: params.get("personagem"),
    set: params.get("set"),
  };
}

function updateUrl() {
  const character = state.data.characters[state.characterIndex];
  const build = character.builds[state.buildIndex];
  const params = new URLSearchParams();
  params.set("personagem", character.name);
  params.set("set", build.set);
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
    .filter(({ character }) => normalize(character.name).includes(normalize(query)));

  elements.list.innerHTML = filtered.map(({ character, index }) => `
    <button class="character-button${index === state.characterIndex ? " active" : ""}" type="button" data-index="${index}" aria-current="${index === state.characterIndex ? "true" : "false"}">
      <img src="${character.image}" alt="" width="42" height="42" loading="lazy">
      <span>${character.name}</span>
      <b aria-hidden="true">›</b>
    </button>
  `).join("");

  elements.resultCount.textContent = query
    ? `${filtered.length} resultado${filtered.length === 1 ? "" : "s"}`
    : `${state.data.characters.length} em ordem alfabética`;

  elements.list.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => selectCharacter(Number(button.dataset.index), 0, true));
  });
}

function selectCharacter(index, requestedBuild = 0, focusHeading = false) {
  const total = state.data.characters.length;
  state.characterIndex = (index + total) % total;
  state.buildIndex = Math.max(0, Math.min(requestedBuild, 2));

  const character = state.data.characters[state.characterIndex];
  const imageReady = new Image();
  elements.image.classList.add("changing");
  imageReady.onload = () => {
    elements.image.src = character.image;
    elements.image.alt = `Ilustração de ${character.name}`;
    elements.image.classList.remove("changing");
  };
  imageReady.src = character.image;

  elements.name.textContent = character.name;
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
    document.querySelector("#conteudo").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderBuild() {
  const character = state.data.characters[state.characterIndex];
  const build = character.builds[state.buildIndex];
  elements.buildTier.textContent = build.label;
  elements.buildTitle.textContent = build.set;
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
    image.alt = itemAsset ? `${itemAsset.name}, item ${itemName} do conjunto ${build.set}` : "";
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
      showToast("Link desta build copiado.");
    } catch {
      showToast("Copie o endereço exibido no navegador.");
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
    const [dataResponse, itemAssetsResponse] = await Promise.all([
      fetch("data/personagens.json"),
      fetch("data/item-assets.json"),
    ]);
    if (!dataResponse.ok || !itemAssetsResponse.ok) {
      throw new Error(`Falha HTTP ${dataResponse.status}/${itemAssetsResponse.status}`);
    }
    [state.data, state.itemAssets] = await Promise.all([
      dataResponse.json(),
      itemAssetsResponse.json(),
    ]);

    elements.characterCount.textContent = `${state.data.characterCount} personagens`;
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
    selectCharacter(characterIndex, buildIndex);

    elements.loading.hidden = true;
    elements.content.hidden = false;
  } catch (error) {
    console.error(error);
    elements.loading.hidden = true;
    elements.error.hidden = false;
  }
}

init();
