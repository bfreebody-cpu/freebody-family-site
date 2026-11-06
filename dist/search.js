"use strict";

const query = document.querySelector("#person-search");
const summary = document.querySelector("#search-summary");
const results = document.querySelector("#search-results");

function makeResult(person) {
  const item = document.createElement("li");
  const link = document.createElement("a");
  const name = document.createElement("strong");
  const details = document.createElement("span");
  link.href = `../people/${encodeURIComponent(person.id)}/`;
  name.textContent = person.name;
  details.textContent = [person.lifespan, ...person.places.slice(0, 2)].filter(Boolean).join(" · ");
  link.append(name, details);
  item.append(link);
  return item;
}

fetch("../assets/search-index.json", { credentials: "same-origin" })
  .then((response) => {
    if (!response.ok) throw new Error(`Search index returned ${response.status}`);
    return response.json();
  })
  .then((people) => {
    function render() {
      const value = query.value.trim().toLocaleLowerCase();
      results.replaceChildren();
      if (value.length < 2) {
        summary.textContent = "Enter at least two letters, a year, or a place.";
        return;
      }
      const matches = people.filter((person) => person.search.includes(value)).slice(0, 100);
      summary.textContent = `${matches.length}${matches.length === 100 ? "+" : ""} matching record${matches.length === 1 ? "" : "s"}.`;
      results.append(...matches.map(makeResult));
    }
    query.disabled = false;
    query.addEventListener("input", render);
    query.focus();
    summary.textContent = `Ready to search ${people.length} public records.`;
  })
  .catch(() => {
    summary.textContent = "The public search index could not be loaded.";
  });
