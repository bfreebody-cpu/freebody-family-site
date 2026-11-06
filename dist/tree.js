"use strict";

const SVG_NS = "http://www.w3.org/2000/svg";
const NODE_WIDTH = 188;
const NODE_HEIGHT = 78;
const COLUMN_GAP = 42;
const ROW_GAP = 116;
const PADDING = 70;

const svg = document.querySelector("#family-tree");
const viewport = document.querySelector("#tree-viewport");
const status = document.querySelector("#tree-status");
const personInput = document.querySelector("#tree-person");
const personOptions = document.querySelector("#tree-person-options");
const showPerson = document.querySelector("#tree-show-person");
const generations = document.querySelector("#tree-generations");
const focusName = document.querySelector("#tree-focus-name");
const focusLife = document.querySelector("#tree-focus-life");
const recordLink = document.querySelector("#tree-record-link");
const visibleList = document.querySelector("#tree-visible-list");
const zoomOut = document.querySelector("#tree-zoom-out");
const zoomReset = document.querySelector("#tree-zoom-reset");
const zoomIn = document.querySelector("#tree-zoom-in");

let peopleById = new Map();
let families = [];
let parentFamilies = new Map();
let partnerFamilies = new Map();
let searchValues = new Map();
let focusId = "";
let naturalWidth = 900;
let naturalHeight = 520;
let zoom = 1;

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

function addToIndex(index, id, family) {
  if (!index.has(id)) index.set(id, []);
  index.get(id).push(family);
}

function selectedMode() {
  return document.querySelector('input[name="tree-mode"]:checked').value;
}

function includePerson(generationMap, id, generation) {
  if (!peopleById.has(id)) return false;
  if (!generationMap.has(id)) {
    generationMap.set(id, generation);
    return true;
  }
  return false;
}

function collectVisible() {
  const mode = selectedMode();
  const depth = Number(generations.value);
  const generationMap = new Map([[focusId, 0]]);

  if (mode === "ancestors" || mode === "both") {
    let frontier = [focusId];
    for (let level = 1; level <= depth; level += 1) {
      const next = [];
      frontier.forEach((childId) => {
        (parentFamilies.get(childId) || []).forEach((family) => {
          family.partners.forEach((parentId) => {
            if (includePerson(generationMap, parentId, -level)) next.push(parentId);
          });
        });
      });
      frontier = next;
    }
  }

  if (mode === "descendants" || mode === "both") {
    let frontier = [focusId];
    for (let level = 1; level <= depth; level += 1) {
      const next = [];
      frontier.forEach((parentId) => {
        (partnerFamilies.get(parentId) || []).forEach((family) => {
          family.partners.forEach((partnerId) => includePerson(generationMap, partnerId, level - 1));
          family.children.forEach((childId) => {
            if (includePerson(generationMap, childId, level)) next.push(childId);
          });
        });
      });
      frontier = next;
    }
  }

  const visibleFamilies = families.filter((family) => {
    const visibleMembers = [...family.partners, ...family.children].filter((id) => generationMap.has(id));
    return new Set(visibleMembers).size >= 2;
  });
  return { generationMap, visibleFamilies };
}

function keepPartnersTogether(row, visibleFamilies) {
  const rowSet = new Set(row);
  const parent = new Map(row.map((id) => [id, id]));
  function find(id) {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root);
    let current = id;
    while (parent.get(current) !== current) {
      const next = parent.get(current);
      parent.set(current, root);
      current = next;
    }
    return root;
  }
  function union(first, second) {
    const firstRoot = find(first);
    const secondRoot = find(second);
    if (firstRoot !== secondRoot) parent.set(secondRoot, firstRoot);
  }
  visibleFamilies.forEach((family) => {
    const partners = family.partners.filter((id) => rowSet.has(id));
    partners.slice(1).forEach((id) => union(partners[0], id));
  });
  const components = new Map();
  row.forEach((id, index) => {
    const root = find(id);
    if (!components.has(root)) components.set(root, { firstIndex: index, people: [] });
    components.get(root).people.push(id);
  });
  return [...components.values()]
    .sort((a, b) => a.firstIndex - b.firstIndex)
    .flatMap((component) => component.people);
}

function layoutPeople(generationMap, visibleFamilies) {
  const rows = new Map();
  generationMap.forEach((generation, id) => {
    if (!rows.has(generation)) rows.set(generation, []);
    rows.get(generation).push(id);
  });
  const orderedGenerations = [...rows.keys()].sort((a, b) => a - b);
  rows.forEach((row, generation) => rows.set(generation, keepPartnersTogether(row, visibleFamilies)));
  const maxInRow = Math.max(...[...rows.values()].map((row) => row.length), 1);
  naturalWidth = Math.max(900, maxInRow * (NODE_WIDTH + COLUMN_GAP) - COLUMN_GAP + PADDING * 2);
  naturalHeight = orderedGenerations.length * (NODE_HEIGHT + ROW_GAP) - ROW_GAP + PADDING * 2;
  const positions = new Map();
  orderedGenerations.forEach((generation, rowIndex) => {
    const row = rows.get(generation);
    const rowWidth = row.length * (NODE_WIDTH + COLUMN_GAP) - COLUMN_GAP;
    const startX = (naturalWidth - rowWidth) / 2;
    row.forEach((id, columnIndex) => {
      positions.set(id, {
        x: startX + columnIndex * (NODE_WIDTH + COLUMN_GAP),
        y: PADDING + rowIndex * (NODE_HEIGHT + ROW_GAP),
        generation,
      });
    });
  });
  return { positions, rows, orderedGenerations };
}

function drawLine(layer, x1, y1, x2, y2) {
  layer.append(svgElement("line", { x1, y1, x2, y2, class: "tree-connector" }));
}

function drawJunction(layer, x, y) {
  layer.append(svgElement("circle", { cx: x, cy: y, r: 3.5, class: "tree-junction" }));
}

function drawFamilies(layer, visibleFamilies, positions) {
  visibleFamilies.forEach((family) => {
    const partners = family.partners.filter((id) => positions.has(id)).map((id) => positions.get(id));
    const children = family.children.filter((id) => positions.has(id)).map((id) => positions.get(id));
    if (!partners.length) return;
    const sortedPartners = [...partners].sort((a, b) => a.x - b.x);
    const partnerCenters = sortedPartners.map((position) => ({ x: position.x + NODE_WIDTH / 2, y: position.y + NODE_HEIGHT / 2 }));
    let unionX = partnerCenters[0].x;
    let unionY = sortedPartners[0].y + NODE_HEIGHT;
    if (partnerCenters.length > 1) {
      const leftEdge = sortedPartners[0].x + NODE_WIDTH;
      const rightEdge = sortedPartners[sortedPartners.length - 1].x;
      unionX = leftEdge + (rightEdge - leftEdge) / 2;
      unionY = partnerCenters[0].y;
      drawLine(layer, leftEdge, unionY, rightEdge, unionY);
      drawJunction(layer, unionX, unionY);
    }
    if (!children.length) return;
    const childCenters = children.map((position) => ({ x: position.x + NODE_WIDTH / 2, y: position.y }));
    const childTop = Math.min(...childCenters.map((position) => position.y));
    const midpointY = unionY + (childTop - unionY) / 2;
    drawLine(layer, unionX, unionY, unionX, midpointY);
    drawJunction(layer, unionX, midpointY);
    const branchXs = [unionX, ...childCenters.map((position) => position.x)];
    const branchLeft = Math.min(...branchXs);
    const branchRight = Math.max(...branchXs);
    if (branchRight > branchLeft) {
      drawLine(layer, branchLeft, midpointY, branchRight, midpointY);
    }
    childCenters.forEach((position) => drawLine(layer, position.x, midpointY, position.x, position.y));
  });
}

function nameLines(name) {
  const words = name.split(/\s+/);
  const lines = [""];
  words.forEach((word) => {
    const candidate = `${lines[lines.length - 1]} ${word}`.trim();
    if (candidate.length <= 24 || lines[lines.length - 1] === "") {
      lines[lines.length - 1] = candidate;
    } else if (lines.length === 1) {
      lines.push(word);
    } else {
      lines[1] = `${lines[1]} ${word}`;
    }
  });
  if (lines[1] && lines[1].length > 25) lines[1] = `${lines[1].slice(0, 24)}…`;
  return lines.slice(0, 2);
}

function choosePerson(id) {
  if (!peopleById.has(id)) return;
  focusId = id;
  render();
}

function drawPeople(layer, positions) {
  positions.forEach((position, id) => {
    const person = peopleById.get(id);
    const group = svgElement("g", {
      class: `tree-node${id === focusId ? " is-focus" : ""}`,
      transform: `translate(${position.x} ${position.y})`,
      tabindex: "0",
      role: "button",
      "aria-label": `Centre tree on ${person.name}, ${person.lifespan || "dates not recorded"}`,
    });
    group.append(svgElement("rect", { width: NODE_WIDTH, height: NODE_HEIGHT, rx: 4 }));
    const name = svgElement("text", { x: NODE_WIDTH / 2, y: 24, class: "tree-node-name", "text-anchor": "middle" });
    nameLines(person.name).forEach((line, index) => {
      const tspan = svgElement("tspan", { x: NODE_WIDTH / 2, dy: index === 0 ? 0 : 17 });
      tspan.textContent = line;
      name.append(tspan);
    });
    group.append(name);
    const lifespan = svgElement("text", { x: NODE_WIDTH / 2, y: 65, class: "tree-node-life", "text-anchor": "middle" });
    lifespan.textContent = person.lifespan || "Dates not recorded";
    group.append(lifespan);
    group.addEventListener("click", () => choosePerson(id));
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        choosePerson(id);
      }
    });
    layer.append(group);
  });
}

function generationLabel(generation) {
  if (generation === 0) return "Current generation";
  if (generation === -1) return "Parents";
  if (generation === 1) return "Children";
  return generation < 0 ? `${Math.abs(generation)} generations before` : `${generation} generations after`;
}

function renderAccessibleList(rows, orderedGenerations) {
  visibleList.replaceChildren();
  orderedGenerations.forEach((generation) => {
    const heading = document.createElement("h3");
    const list = document.createElement("ul");
    heading.textContent = generationLabel(generation);
    rows.get(generation).forEach((id) => {
      const person = peopleById.get(id);
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `../people/${encodeURIComponent(id)}/`;
      link.textContent = `${person.name} ${person.lifespan}`.trim();
      item.append(link);
      list.append(item);
    });
    visibleList.append(heading, list);
  });
}

function applyZoom() {
  svg.style.width = `${naturalWidth * zoom}px`;
  svg.style.height = `${naturalHeight * zoom}px`;
}

function centreFocus() {
  const focusNode = svg.querySelector(".tree-node.is-focus");
  if (!focusNode) return;
  const transform = focusNode.getAttribute("transform").match(/[\d.]+/g).map(Number);
  const centreX = (transform[0] + NODE_WIDTH / 2) * zoom;
  const centreY = (transform[1] + NODE_HEIGHT / 2) * zoom;
  viewport.scrollLeft = Math.max(0, centreX - viewport.clientWidth / 2);
  viewport.scrollTop = Math.max(0, centreY - viewport.clientHeight / 2);
}

function render() {
  if (!peopleById.size || !focusId) return;
  const person = peopleById.get(focusId);
  const { generationMap, visibleFamilies } = collectVisible();
  const { positions, rows, orderedGenerations } = layoutPeople(generationMap, visibleFamilies);
  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${naturalWidth} ${naturalHeight}`);
  const title = svgElement("title", { id: "tree-diagram-title" });
  title.textContent = `Family lineage centred on ${person.name}`;
  const description = svgElement("desc", { id: "tree-diagram-description" });
  description.textContent = `${generationMap.size} approved public people shown. Click any person to recentre the tree.`;
  const connectorLayer = svgElement("g", { class: "tree-connectors", "aria-hidden": "true" });
  const nodeLayer = svgElement("g", { class: "tree-nodes" });
  svg.append(title, description, connectorLayer, nodeLayer);
  drawFamilies(connectorLayer, visibleFamilies, positions);
  drawPeople(nodeLayer, positions);
  focusName.textContent = person.name;
  focusLife.textContent = person.lifespan || "Dates not recorded";
  recordLink.href = `../people/${encodeURIComponent(person.id)}/`;
  status.textContent = `${generationMap.size} public person record${generationMap.size === 1 ? "" : "s"} shown across ${orderedGenerations.length} generation${orderedGenerations.length === 1 ? "" : "s"}.`;
  personInput.value = `${person.name} — ${person.lifespan}`;
  renderAccessibleList(rows, orderedGenerations);
  const url = new URL(window.location.href);
  url.searchParams.set("person", focusId);
  url.searchParams.set("mode", selectedMode());
  url.searchParams.set("generations", generations.value);
  window.history.replaceState({}, "", url);
  applyZoom();
  window.requestAnimationFrame(centreFocus);
}

function findRequestedPerson() {
  const direct = searchValues.get(personInput.value.trim().toLocaleLowerCase());
  if (direct) return direct;
  const query = personInput.value.trim().toLocaleLowerCase();
  const match = [...peopleById.values()].find((person) => person.name.toLocaleLowerCase() === query);
  return match ? match.id : "";
}

fetch("../assets/tree-data.json", { credentials: "same-origin" })
  .then((response) => {
    if (!response.ok) throw new Error(`Tree data returned ${response.status}`);
    return response.json();
  })
  .then((data) => {
    peopleById = new Map(data.people.map((person) => [person.id, person]));
    families = data.families;
    families.forEach((family) => {
      family.partners.forEach((id) => addToIndex(partnerFamilies, id, family));
      family.children.forEach((id) => addToIndex(parentFamilies, id, family));
    });
    [...peopleById.values()].sort((a, b) => a.name.localeCompare(b.name)).forEach((person) => {
      const value = `${person.name} — ${person.lifespan}`;
      const option = document.createElement("option");
      option.value = value;
      personOptions.append(option);
      searchValues.set(value.toLocaleLowerCase(), person.id);
    });
    const params = new URL(window.location.href).searchParams;
    const requestedPerson = params.get("person");
    const requestedMode = params.get("mode");
    const requestedDepth = params.get("generations");
    focusId = peopleById.has(requestedPerson) ? requestedPerson : data.default_person_id;
    if (["ancestors", "both", "descendants"].includes(requestedMode)) {
      document.querySelector(`input[name="tree-mode"][value="${requestedMode}"]`).checked = true;
    }
    if (["2", "3", "4"].includes(requestedDepth)) generations.value = requestedDepth;
    personInput.disabled = false;
    showPerson.disabled = false;
    render();
  })
  .catch(() => {
    status.textContent = "The public family-tree data could not be loaded.";
    focusName.textContent = "Family tree unavailable";
  });

showPerson.addEventListener("click", () => {
  const id = findRequestedPerson();
  if (id) choosePerson(id);
  else status.textContent = "Choose a person from the suggested names.";
});
personInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    showPerson.click();
  }
});
document.querySelectorAll('input[name="tree-mode"]').forEach((control) => control.addEventListener("change", render));
generations.addEventListener("change", render);
zoomOut.addEventListener("click", () => { zoom = Math.max(0.6, zoom - 0.15); applyZoom(); centreFocus(); });
zoomReset.addEventListener("click", () => { zoom = 1; applyZoom(); centreFocus(); });
zoomIn.addEventListener("click", () => { zoom = Math.min(1.75, zoom + 0.15); applyZoom(); centreFocus(); });
