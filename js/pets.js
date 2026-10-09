document.addEventListener("DOMContentLoaded", () => {
  // Collections
  const panel = document.getElementById("pets");
  const sheet = document.getElementById("pet-sheet");
  const simpleInputs = sheet.querySelectorAll("[data-field]");
  const customData = sheet.querySelectorAll("[data-pet-type]");
  const previousButton = document.getElementById("pet-previous");
  const nextButton = document.getElementById("pet-next");
  const addButton = document.getElementById("pet-add");
  const removeButton = document.getElementById("pet-delete");
  const openButton = panel.querySelector("summary");
  const modal = document.getElementById("modal");
  const pages = document.querySelectorAll(".page");
  let pets = [];
  let active = 0;

  // Event Listeners
  simpleInputs.forEach((input) => {
    input.addEventListener("input", handleSimpleInput);
  });
  customData.forEach((custom) => {
    custom.addEventListener("input", handleCustomInput);
  });
  previousButton.addEventListener("click", changeSheet);
  nextButton.addEventListener("click", changeSheet);
  addButton.addEventListener("click", addPet);
  removeButton.addEventListener("click", removePet);
  document.addEventListener("pets:reload", fillFromStorage);
  document.addEventListener("pets:encumbrance", updateTotalEncumbrance);

  // Fill the sheet with stored data
  fillFromStorage();

  // Panel
  openButton.addEventListener("click", (event) => {
    if (!panel.open) return;
    event.preventDefault();
    closePanel();
  });
  document.getElementById("pet-close").addEventListener("click", closePanel);
  document.getElementById("open-modal").addEventListener("click", closePanel);
  panel.querySelector(".pets-backdrop").addEventListener("click", closePanel);
  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePanel();
  });
  panel.addEventListener("toggle", () => {
    pages.forEach((page) => {
      page.toggleAttribute("inert", panel.open || modal.classList.contains("open"));
    });
    document.getElementById("app-form").classList.toggle("pets-open", panel.open);
  });

  // Methods
  // --------------------
  function fillFromStorage(event) {
    try {
      pets = JSON.parse(localStorage.getItem("pets-mounts") ?? "[]");
    } catch (error) {
      console.error(error);
      pets = [];
    }
    if (event) active = 0;
    active = Math.max(0, Math.min(active, pets.length - 1));
    const pet = pets[active];
    previousButton.disabled = pets.length < 2;
    nextButton.disabled = pets.length < 2;
    removeButton.disabled = !pet;
    sheet.hidden = !pet;
    document.getElementById("pet-empty").hidden = !!pet;
    panel.querySelector(".pets-panel").classList.toggle("has-sheets", !!pet);
    document.getElementById("pet-position").textContent = pet ? `${active + 1} / ${pets.length}` : "";
    if (!pet) return;

    // Generate custom rows.
    customData.forEach((custom) => {
      const tbody = custom.querySelector("tbody");
      const type = custom.dataset.petType;
      pet[type] = pet[type] ?? [];
      tbody.replaceChildren();
      pet[type].forEach((item, index) => addNewRow(tbody, index));
      addNewRow(tbody, pet[type].length);
    });

    // Fill inputs and update outputs.
    simpleInputs.forEach((input) => {
      const item = pet[input.dataset.field];
      if (input.type === "checkbox") input.checked = item === true;
      else input.value = item ?? "";
    });
    updateOutputs();
  }

  function saveData() {
    localStorage.setItem("pets-mounts", JSON.stringify(pets));
  }

  function handleSimpleInput(event) {
    const input = event.target;
    pets[active][input.dataset.field] = input.type === "checkbox" ? input.checked : input.value;
    saveData();
    updateOutputs();
  }

  function addNewRow(tbody, index) {
    const custom = tbody.closest("[data-pet-type]");
    const item = pets[active][custom.dataset.petType][index] ?? {};
    const row = custom.querySelector("template").content.firstElementChild.cloneNode(true);
    row.dataset.number = index;
    row.querySelectorAll("[data-column]").forEach((input) => {
      const value = item[input.dataset.column];
      if (input.hasAttribute("contenteditable")) input.textContent = value ?? "";
      else if (input.type === "checkbox") input.checked = value === true;
      else input.value = value ?? "";
    });
    const remove = row.querySelector(".remove");
    remove.disabled = index === pets[active][custom.dataset.petType].length;
    remove.addEventListener("click", removeCustomItem);
    tbody.append(row);
  }

  function handleCustomInput(event) {
    const input = event.target;
    if (!input.dataset.column) return;
    const custom = event.currentTarget;
    const tbody = custom.querySelector("tbody");
    const row = input.closest("tr");
    const items = pets[active][custom.dataset.petType];
    items[row.dataset.number] = items[row.dataset.number] ?? {};
    items[row.dataset.number][input.dataset.column] = input.hasAttribute("contenteditable")
      ? input.innerText
      : input.type === "checkbox" ? input.checked : input.value;
    if (row === tbody.lastElementChild) {
      row.querySelector(".remove").disabled = false;
      addNewRow(tbody, items.length);
    }
    saveData();
    updateTotalEncumbrance();
  }

  function removeCustomItem(event) {
    const row = event.currentTarget.closest("tr");
    const custom = row.closest("[data-pet-type]");
    pets[active][custom.dataset.petType].splice(Number(row.dataset.number), 1);
    saveData();
    fillFromStorage();
    custom.querySelector("[contenteditable]").focus();
  }

  function updateOutputs() {
    const movement = Number(pets[active].movement) || 0;
    document.getElementById("pet-walk").value = movement * 2;
    document.getElementById("pet-run").value = movement * 4;
    updateTotalEncumbrance();
  }

  function updateTotalEncumbrance() {
    const pet = pets[active];
    if (!pet) return;
    let trappings = 0;
    pet.inventory.forEach((item) => {
      trappings += Math.max(0, (Number(item.enc) || 0) - (item.worn ? 1 : 0));
    });
    const mounted = pet.mounted ? Number(document.getElementById("encumbrance-total").value) || 0 : 0;
    document.getElementById("pet-trappings-total").value = trappings;
    document.getElementById("pet-mounted-total").value = mounted;
    const total = document.getElementById("pet-total");
    total.value = trappings + mounted;
    total.classList.toggle("error", pet.max !== "" && pet.max != null && Number(total.value) > Number(pet.max));
  }

  function changeSheet(event) {
    const direction = event.currentTarget === previousButton ? -1 : 1;
    active = (active + direction + pets.length) % pets.length;
    fillFromStorage();
  }

  function addPet() {
    pets.push({ id: crypto.randomUUID(), inventory: [], traits: [] });
    active = pets.length - 1;
    saveData();
    fillFromStorage();
    document.getElementById("pet-name").focus();
  }

  function removePet() {
    const message = document.getElementById("pet-labels").dataset.confirm;
    if (!pets[active] || !window.confirm(message)) return;
    pets.splice(active, 1);
    saveData();
    fillFromStorage();
    addButton.focus();
  }

  async function closePanel() {
    if (!panel.open || panel.classList.contains("closing")) return;
    panel.classList.add("closing");
    const animations = panel.querySelector(".pets-panel").getAnimations();
    await Promise.allSettled(animations.map((animation) => animation.finished));
    panel.open = false;
    panel.classList.remove("closing");
    if (!modal.classList.contains("open")) openButton.focus();
  }
});
