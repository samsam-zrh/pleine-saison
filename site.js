'use strict';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const byId = Object.fromEntries(produce.map(item => [item.id, item]));
const regionById = Object.fromEntries(regions.map(region => [region.id, region]));
const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const shortMonths = ['Jan.', 'Fév.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
const currentMonth = Number(new Intl.DateTimeFormat('fr-FR', { month: 'numeric', timeZone: 'Europe/Paris' }).format(new Date()));
const storageKey = 'pleine-saison.favoris.v1';
const pageName = document.body.dataset.page;
const params = new URLSearchParams(window.location.search);
const savedMonth = Number(params.get('mois') ?? sessionValue('mois'));
const savedRegion = params.get('region') ?? sessionValue('region');
const state = {
  month: Number.isInteger(savedMonth) && savedMonth >= 1 && savedMonth <= 12 ? savedMonth : currentMonth,
  category: 'all', search: '', region: Object.hasOwn(regionById, savedRegion) ? savedRegion : '53',
  expanded: false, recipesExpanded: false,
};

function sessionValue(key, value) {
  try {
    const storage = `pleine-saison.${key}`;
    if (value !== undefined) sessionStorage.setItem(storage, value);
    return sessionStorage.getItem(storage);
  } catch {
    return null;
  }
}

function calendarUrl() {
  return state.month === currentMonth ? 'calendrier.html' : `calendrier.html?mois=${state.month}`;
}

function updateCalendarLinks() {
  $$('[data-calendar-link]').forEach(link => { link.href = calendarUrl(); });
}

function recordPageSelection(key, value) {
  sessionValue(key, value);
  const url = new URL(window.location.href);
  if (key === 'mois' && Number(value) === currentMonth) url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  try {
    history.replaceState(null, '', url);
  } catch {
    // Some browsers restrict history changes on local file URLs.
  }
}

const legacyPages = {'#calendrier': calendarUrl(), '#terroirs': 'terroirs.html', '#cuisine': 'cuisine.html', '#guide': 'marche.html'};
if (pageName === 'accueil' && Object.hasOwn(legacyPages, window.location.hash)) {
  window.location.replace(legacyPages[window.location.hash]);
}
const images = 'assets/';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const motion = window.gsap;
const canAnimate = () => motion && !reducedMotion.matches;
const seasons = {
  printemps: { name: 'Printemps', months: [3,4,5], month: 4, featured: ['asperge','fraise','petit-pois','rhubarbe'], photo: 'hero-printemps', alt: 'Asperges, petits pois, fraises et tiges de rhubarbe' },
  ete: { name: 'Été', months: [6,7,8], month: 7, featured: ['tomate','peche','melon','courgette'], photo: 'hero-ete', alt: 'Tomates, poivrons, melon, courgettes et fruits à noyau' },
  automne: { name: 'Automne', months: [9,10,11], month: 10, featured: ['potimarron','poire','poireau','clementine'], photo: 'hero', alt: 'Potimarron ouvert, chou rouge, poires, raisin et carottes' },
  hiver: { name: 'Hiver', months: [12,1,2], month: 1, featured: ['chou-fleur','clementine','poireau','kiwi'], photo: 'hero-hiver', alt: 'Poireaux, chou-fleur, betteraves, clémentines et kiwis' },
};
const keyForMonth = month => Object.keys(seasons).find(key => seasons[key].months.includes(month));
const dialog = $('#dialog');
const dialogContent = $('#dialog-content');

const icons = {
  heart: '<path d="M20.8 4.8a5.6 5.6 0 0 0-7.9 0L12 5.7l-.9-.9a5.6 5.6 0 0 0-7.9 7.9l.9.9 7.9 7.9 7.9-7.9.9-.9a5.6 5.6 0 0 0 0-7.9Z"/>',
  arrow: '<path d="M3 12h17m-6-6 6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.4 4.4"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="8.8"/><path d="M12 7v5l3.1 2"/>',
  shuffle: '<path d="M3 6h3c4.1 0 5.9 12 10 12h5m-4-4 4 4-4 4M3 18h3c1.5 0 2.7-1.7 3.6-3.5m4.8-5C15.3 7.7 16.5 6 18 6h3m-4-4 4 4-4 4"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icons[name]}</svg>`;
$$('[data-icon]').forEach(element => { element.innerHTML = icon(element.dataset.icon); });

function readFavorites() {
  try {
    const list = JSON.parse(localStorage.getItem(storageKey));
    return new Set(Array.isArray(list) ? list.filter(id => Object.hasOwn(byId, id)) : []);
  } catch {
    return new Set();
  }
}

const favorites = readFavorites();

function syncFavorites() {
  const count = $('#favorite-count');
  count.textContent = favorites.size;
  count.hidden = favorites.size === 0;
  $$('[data-action="save"]').forEach(button => {
    const item = byId[button.dataset.id];
    const saved = favorites.has(item.id);
    const action = saved ? 'Retirer des favoris' : 'Ajouter aux favoris';
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', `${action} · ${item.name}`);
    const label = $('.save-label', button);
    if (label) label.textContent = action;
  });
}

function toggleFavorite(id) {
  const wasSaved = favorites.delete(id);
  if (!wasSaved) favorites.add(id);
  try {
    localStorage.setItem(storageKey, JSON.stringify([...favorites]));
  } catch {
    // The current page still retains the selection when storage is unavailable.
  }
  syncFavorites();
  $('#announcement').textContent = `${byId[id].name} ${wasSaved ? 'retiré des favoris' : 'ajouté aux favoris'}.`;
}

function monthLabel(month) {
  return months[month - 1];
}

function period(item) {
  const start = item.months[0];
  const end = item.months.at(-1);
  return item.months.length === 12 ? 'Toute l’année' : `${monthLabel(start)[0].toUpperCase()}${monthLabel(start).slice(1)} à ${monthLabel(end)}`;
}

function seasonStatus(item) {
  if (item.peak.includes(state.month)) return 'Cœur de saison';
  if (item.months.includes(state.month)) return 'De saison';
  return 'Hors saison';
}

function normalize(text) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function image(name, { alt = '', lazy = true, width = 360, height = 360 } = {}) {
  return `<img src="${images}${name}.webp" alt="${alt}" width="${width}" height="${height}" ${lazy ? 'loading="lazy"' : ''} decoding="async">`;
}

function card(item, index) {
  const status = seasonStatus(item);
  return `<article class="card" style="--item-index:${index}">
    <button class="card-link" data-action="product" data-id="${item.id}" aria-label="Voir la fiche de ${item.name}">
      <span class="card-media">${image(item.id, { lazy: index > 3 })}</span>
      <span class="card-content">
        <span class="card-meta">${item.type} <i aria-hidden="true"></i> <span class="${status === 'Cœur de saison' ? 'peak' : ''}">${status}</span></span>
        <span class="card-product">${item.name}</span>
        <span class="card-period">${period(item)}</span>
        <span class="card-summary"><span>${item.note}</span><span class="card-arrow">${icon('arrow')}</span></span>
      </span>
    </button>
    <button class="heart" data-action="save" data-id="${item.id}" aria-label="Ajouter aux favoris · ${item.name}">${icon('heart')}</button>
  </article>`;
}

function renderMonthButtons() {
  $('#months').innerHTML = shortMonths.map((label, index) => {
    const month = index + 1;
    return `<button type="button" data-month="${month}" aria-label="${monthLabel(month)}${month === currentMonth ? ', mois actuel' : ''}" ${month === currentMonth ? 'data-current' : ''}>${label}</button>`;
  }).join('');
}

function renderCalendar() {
  const query = normalize(state.search);
  const matchType = item => state.category === 'all' || item.type === state.category;
  const matchMonth = item => item.months.includes(state.month);
  const filtered = produce.filter(item => matchType(item) && (query ? normalize(item.name).includes(query) : matchMonth(item)));
  if (query) filtered.sort((a,b) => Number(matchMonth(b)) - Number(matchMonth(a)));
  else {
    const featured = seasons[keyForMonth(state.month)].featured;
    const rank = item => featured.includes(item.id) ? featured.indexOf(item.id) : featured.length;
    filtered.sort((a,b) => rank(a) - rank(b) || Number(b.peak.includes(state.month)) - Number(a.peak.includes(state.month)));
  }
  const visible = state.expanded || query ? filtered : filtered.slice(0, 4);
  const noun = `produit${filtered.length === 1 ? '' : 's'}`;
  $('#results').innerHTML = `<strong>${filtered.length} ${noun}</strong> · ${query ? 'Recherche dans le catalogue' : monthLabel(state.month)[0].toUpperCase() + monthLabel(state.month).slice(1)}`;
  $('#produce-grid').innerHTML = visible.length ? visible.map(card).join('') : `<div class="empty">
    <h3>Aucun produit trouvé</h3><p>Essayez un autre mois ou élargissez votre recherche.</p>
    <button data-action="reset-filters" class="outline">Réinitialiser les filtres</button>
  </div>`;
  $$('#months button').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.month) === state.month)));
  $$('.categories button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === state.category)));
  $('#today').hidden = state.month === currentMonth;
  $('#surprise').hidden = Boolean(query) || !filtered.length;
  const more = $('#show-more');
  more.hidden = Boolean(query) || filtered.length <= 4;
  more.textContent = state.expanded ? 'Afficher moins de produits' : `Voir les ${filtered.length} produits`;
  more.setAttribute('aria-expanded', String(state.expanded));
  more.setAttribute('aria-controls', 'produce-grid');
  syncFavorites();
  window.ScrollTrigger?.refresh(true);
}

let calendarTransition;

function transitionCalendar(update) {
  if (reducedMotion.matches || !document.startViewTransition) {
    update();
    return;
  }
  calendarTransition?.skipTransition();
  document.documentElement.classList.add('calendar-transition');
  const transition = document.startViewTransition(update);
  calendarTransition = transition;
  transition.finished.finally(() => {
    if (calendarTransition !== transition) return;
    calendarTransition = null;
    document.documentElement.classList.remove('calendar-transition');
  }).catch(() => {});
}

function updateMonth(month, animate = true) {
  if (state.month === month) return;
  state.month = month;
  state.expanded = false;
  updateCalendarLinks();
  if (pageName === 'accueil') {
    sessionValue('mois', month);
    showSeason(month);
  }
  if (pageName === 'calendrier') {
    recordPageSelection('mois', month);
    if (animate) transitionCalendar(renderCalendar);
    else renderCalendar();
  }
}

function regionItem(item, showSeason = false) {
  const status = seasonStatus(item);
  return `<button class="region-item" data-action="product" data-id="${item.id}">
    ${image(item.id)}<span><strong>${item.name}</strong>${showSeason && status !== 'Hors saison' ? `<small>${status}</small>` : ''}</span>${icon('arrow')}
  </button>`;
}

function renderMap() {
  $('#regions').innerHTML = regions.map(region => `<option value="${region.id}">${region.name}</option>`).join('');
  $('#region-map').innerHTML = `<svg viewBox="11 5 365 389" role="group" aria-label="Carte interactive des 13 régions de France métropolitaine">
    ${regions.map(region => `<path class="region-shape" data-region="${region.id}" d="${region.path}" fill-rule="evenodd" role="button" tabindex="0" aria-label="${region.name}"><title>${region.name}</title></path>`).join('')}
  </svg>`;
}

const featuredByRegion = {
  11: ['pomme','poireau','betterave'], 24: ['poireau','pomme','carotte'], 27: ['carotte','pomme','poire'],
  28: ['carotte','poireau','chou-fleur'], 32: ['rhubarbe','betterave','petit-pois'], 44: ['prune','coing','pomme'],
  52: ['pomme','poire','poireau'], 53: ['chou-fleur','poireau','carotte'], 75: ['kiwi','fraise','carotte'],
  76: ['melon','raisin','peche'], 84: ['abricot','potimarron','poire'], 93: ['figue','raisin','potimarron'], 94: ['clementine','kiwi','fraise'],
};
function regionProducts(id) {
  const featured = featuredByRegion[id];
  return produce.filter(item => origins[item.id].regions.includes(id)).sort((a, b) => {
    const place = item => featured.includes(item.id) ? featured.indexOf(item.id) : featured.length;
    return place(a) - place(b) || Number(b.months.includes(state.month)) - Number(a.months.includes(state.month));
  });
}

function renderRegion(animate = false) {
  const region = regionById[state.region];
  const items = regionProducts(region.id);
  $('#regions').value = region.id;
  $$('.region-shape').forEach(shape => shape.setAttribute('aria-pressed', String(shape.dataset.region === region.id)));
  const regionDetail = $('#region-detail');
  regionDetail.innerHTML = `<h3 class="region-title">${region.name}</h3>
    <p class="region-note">${region.note}</p>
    <div class="region-products">${items.slice(0,3).map(item => regionItem(item, true)).join('')}</div>
    ${items.length > 3 ? `<button class="text-link region-show" data-action="region-products">Voir les ${items.length} produits référencés ${icon('arrow')}</button>` : ''}`;
  if (animate && canAnimate()) {
    motion.timeline()
      .from($('.region-title', regionDetail), {opacity:.1, y:15, duration:.39, ease:'power3.out'})
      .from($$('.region-item', regionDetail), {opacity:0, x:12, duration:.32, stagger:.045, ease:'power2.out'}, '-=.27');
  }
}

function changeRegion(id) {
  if (!Object.hasOwn(regionById, id) || state.region === id) return;
  state.region = id;
  recordPageSelection('region', id);
  renderRegion(true);
  $('#announcement').textContent = `Région sélectionnée : ${regionById[id].name}.`;
}

function inSeason(recipe) {
  return recipe.produce.every(id => byId[id].months.includes(state.month));
}

function renderRecipes() {
  const ordered = [...recipes].sort((a, b) => Number(inSeason(b)) - Number(inSeason(a)));
  const [feature, ...more] = ordered;
  const chosen = state.recipesExpanded ? more : more.slice(0, 2);
  $('#recipe-feature').innerHTML = `<article class="recipe-feature">
    <button class="recipe-feature-link" data-id="${feature.id}" data-action="recipe">
      <span class="recipe-feature-media">${image(feature.image, { lazy:false, width:760, height:505 })}</span>
      <span class="recipe-feature-copy">
        <span class="recipe-kicker">${inSeason(feature) ? 'Recette de saison' : 'À découvrir'}</span>
        <span class="recipe-feature-title">${feature.title}</span>
        <span class="recipe-feature-note">${feature.description}</span>
        <span class="recipe-feature-meta">${icon('clock')} ${feature.duration} <span>·</span> ${feature.servings} personnes</span>
        <span class="recipe-feature-cta">Ouvrir la recette ${icon('arrow')}</span>
      </span>
    </button>
  </article>`;
  $('#recipe-grid').innerHTML = chosen.map(recipe => `<article class="recipe">
    <button class="recipe-link" data-id="${recipe.id}" data-action="recipe">
      <span class="recipe-media">${image(recipe.image, { width:760, height:505 })}</span>
      <span class="recipe-title">${recipe.title}</span>
      <span class="recipe-meta">${icon('clock')} ${recipe.duration}${inSeason(recipe) ? ' · De saison' : ''}<span class="recipe-arrow">${icon('arrow')}</span></span>
    </button>
  </article>`).join('');
  $('#recipe-more').textContent = state.recipesExpanded ? 'Afficher moins de recettes' : 'Voir toutes les recettes';
  $('#recipe-more').setAttribute('aria-expanded', String(state.recipesExpanded));
  window.ScrollTrigger?.refresh(true);
}

const nutritionFields = {
  kcal: ['Énergie', 'kcal'], fiber: ['Fibres', 'g'], vitc: ['Vitamine C', 'mg'],
  folate: ['Vitamine B9', 'µg'], potassium: ['Potassium', 'mg'], carotene: ['Bêta-carotène', 'µg'],
};

function detailProduct(item) {
  const origin = origins[item.id];
  const stats = nutrition[item.id];
  const nutrient = nutrientNotes[item.nutrient];
  const keys = [...new Set(['kcal', 'fiber', item.nutrient, 'vitc'])].slice(0, 3);
  const recipe = recipes.find(entry => entry.produce.includes(item.id));
  const monthsMarkup = shortMonths.map((month,index) => {
    const status = item.peak.includes(index+1) ? 'peak-season' : item.months.includes(index+1) ? 'in-season' : 'out-season';
    const label = status === 'peak-season' ? 'cœur de saison' : status === 'in-season' ? 'de saison' : 'hors saison';
    return `<div class="month-cell ${status}" title="${months[index]} · ${label}">
      <span aria-hidden="true">${month}</span><i class="month-mark" aria-hidden="true"></i>
      <span class="visually-hidden">${months[index]}, ${label}</span>
    </div>`;
  }).join('');
  openDialog(`<div class="detail-top">
    ${image(item.id, { alt: item.name, lazy: false })}
    <div class="detail-title">
      <span class="card-meta">${item.type} <i aria-hidden="true"></i> ${seasonStatus(item)}</span>
      <h2 id="dialog-title">${item.name}</h2><p>${item.note}</p>
      <button class="outline saved" data-action="save" data-id="${item.id}">${icon('heart')} <span class="save-label">Ajouter aux favoris</span></button>
    </div>
  </div>
  <nav class="detail-index" aria-label="Dans cette fiche">
    <button class="quiet-button" data-action="detail-section" data-id="detail-season">Saisonnalité ${icon('down')}</button>
    <button class="quiet-button" data-action="detail-section" data-id="detail-origin">Origine ${icon('down')}</button>
    <button class="quiet-button" data-action="detail-section" data-id="detail-nutrition">Nutrition ${icon('down')}</button>
    <button class="quiet-button" data-action="detail-section" data-id="detail-guide">En cuisine ${icon('down')}</button>
  </nav>
  <section class="dialog-section" id="detail-season"><h3>Quand en profiter&nbsp;?</h3>
    <p>${period(item)}. Les mois varient selon la variété et la météo.</p>
    <div class="details-months">${monthsMarkup}</div>
    <ul class="season-legend" aria-label="Légende de la frise">
      <li class="peak-season"><i class="month-mark" aria-hidden="true"></i> Cœur de saison</li>
      <li class="in-season"><i class="month-mark" aria-hidden="true"></i> De saison</li>
      <li class="out-season"><i class="month-mark" aria-hidden="true"></i> Hors saison</li>
    </ul>
  </section>
  <section class="dialog-section" id="detail-origin"><h3>Où cultive-t-on ce produit&nbsp;?</h3>
    <p>Exemples de régions de production. Sélectionnez-en une pour l’explorer.</p>
    <div class="region-tags">${origin.regions.map(id => `<button data-action="jump-region" data-id="${id}">${regionById[id].name}</button>`).join('')}</div>
    <p class="note">${origin.note ? origin.note + ' ' : ''}<a href="${origin.url}" target="_blank" rel="noopener">Voir la source de production</a></p>
  </section>
  <section class="dialog-section" id="detail-nutrition"><h3>Le point nutrition</h3><p>Pour 100 g de partie comestible</p>
    <div class="nutrition-grid">${keys.map(key => {
      const [label, unit] = nutritionFields[key];
      const value = stats.values[key];
      return `<div><b>${value ? value + ' ' + unit : '—'}</b><span>${label}</span></div>`;
    }).join('')}</div>
    <p><strong>${nutrient[0]}.</strong> ${nutrient[1]}</p>
    <p class="note">${stats.label} · <a href="https://doi.org/10.57745/RDMHWY" target="_blank" rel="noopener">Anses, Ciqual 2025 · n° ${item.ciqual}</a></p>
  </section>
  <section class="dialog-section" id="detail-guide"><h3>Du marché à la cuisine</h3>
    <dl class="practical-list">
      <div><dt>Bien choisir</dt><dd>${item.buy}</dd></div>
      <div><dt>Conserver</dt><dd>${item.keep}</dd></div>
      <div><dt>Cuisiner</dt><dd>${item.cook}</dd></div>
    </dl>
    ${recipe ? `<button class="text-link" data-action="recipe" data-id="${recipe.id}">Voir la recette ${icon('arrow')}</button>` : ''}
  </section>`);
}

const quantityFormat = new Intl.NumberFormat('fr-FR', {maximumFractionDigits:2});
let recipeView;

function ingredientText(entry, servings, base) {
  const [quantity, name] = entry;
  return quantity === null ? name : `${quantityFormat.format(quantity * servings / base)} ${name}`;
}

function detailRecipe(recipe) {
  recipeView = {recipe, servings:recipe.servings, step:0};
  openDialog(`<div class="recipe-detail-hero">
    ${image(recipe.image, { alt:'', lazy:false, width:760, height:505 })}
    <div class="recipe-detail-heading">
      <span class="recipe-detail-time">${icon('clock')} ${recipe.duration}</span>
      <h2 id="dialog-title">${recipe.title}</h2><p>${recipe.description}</p>
    </div>
  </div>
  <div class="recipe-workspace">
    <section class="recipe-ingredients" aria-labelledby="ingredients-title">
      <h3 id="ingredients-title">Les ingrédients</h3>
      <div class="servings-control" role="group" aria-label="Nombre de portions">
        <button class="step-icon" data-action="recipe-servings" data-id="-1" aria-label="Une portion de moins">${icon('minus')}</button>
        <output id="servings-count" aria-live="polite">${recipe.servings} personnes</output>
        <button class="step-icon" data-action="recipe-servings" data-id="1" aria-label="Une portion de plus">${icon('plus')}</button>
      </div>
      <p class="ingredient-count" id="ingredient-count" role="status">0 / ${recipe.ingredients.length} prêts</p>
      <ul class="ingredient-list">${recipe.ingredients.map((entry,index) => `<li><label>
        <input type="checkbox" class="ingredient-check">
        <span class="ingredient-label" data-ingredient="${index}">${ingredientText(entry, recipe.servings, recipe.servings)}</span>
      </label></li>`).join('')}</ul>
    </section>
    <section class="recipe-preparation" aria-labelledby="steps-title">
      <h3 id="steps-title">La préparation</h3>
      <div class="recipe-step-nav" role="group" aria-label="Choisir une étape">
        ${recipe.steps.map((_,index) => `<button type="button" data-action="recipe-step" data-id="${index}" aria-label="Étape ${index+1}">${index+1}</button>`).join('')}
      </div>
      <div id="recipe-step-copy" class="recipe-step-copy" role="status"></div>
      <div class="step-controls">
        <button class="outline" id="recipe-back" data-action="recipe-back">Précédente</button>
        <button class="primary" id="recipe-next" data-action="recipe-next">Suivante ${icon('arrow')}</button>
      </div>
    </section>
  </div>
  <section class="dialog-section"><h3>Les produits à découvrir</h3><div class="dialog-list">${recipe.produce.map(id => regionItem(byId[id])).join('')}</div></section>`);
  renderRecipeStep();
}

function adjustServings(delta) {
  const {recipe} = recipeView;
  const servings = Math.max(1, Math.min(12, recipeView.servings + delta));
  recipeView.servings = servings;
  $('#servings-count').textContent = `${servings} personne${servings > 1 ? 's' : ''}`;
  $$('[data-ingredient]').forEach(label => {
    label.textContent = ingredientText(recipe.ingredients[label.dataset.ingredient], servings, recipe.servings);
  });
  $('[data-action="recipe-servings"][data-id="-1"]').disabled = servings === 1;
  $('[data-action="recipe-servings"][data-id="1"]').disabled = servings === 12;
}

function renderRecipeStep(animate = false) {
  const {recipe,step} = recipeView;
  const total = recipe.steps.length;
  const done = step === total;
  const copy = $('#recipe-step-copy');
  copy.innerHTML = done ? '<h4>À table&nbsp;!</h4><p>Bon appétit. Vous pouvez revenir à une étape depuis les numéros ci-dessus.</p>' :
    `<span class="step-label">Étape ${step+1} sur ${total}</span><p>${recipe.steps[step]}</p>`;
  $$('.recipe-step-nav button').forEach(button => {
    const selected = Number(button.dataset.id) === step;
    button.classList.toggle('step-seen', Number(button.dataset.id) < step);
    if (selected) button.setAttribute('aria-current','step');
    else button.removeAttribute('aria-current');
  });
  $('#recipe-back').disabled = step === 0;
  $('#recipe-next').innerHTML = done ? 'Recommencer' : `${step === total-1 ? 'Terminer' : 'Suivante'} ${icon(step===total-1 ? 'check' : 'arrow')}`;
  if (animate && canAnimate()) motion.fromTo(copy, {opacity:.18,x:13}, {opacity:1,x:0,duration:.38,ease:'power3.out', overwrite:'auto'});
}

function setRecipeStep(step) {
  recipeView.step = step;
  renderRecipeStep(true);
}

function openDialog(content) {
  const alreadyOpen = dialog.open;
  dialogContent.innerHTML = content;
  syncFavorites();
  if (!alreadyOpen) dialog.showModal();
  else {
    const title = $('#dialog-title');
    title.tabIndex = -1;
    title.focus({ preventScroll: true });
  }
  dialog.scrollTop = 0;
  const photo = $('.detail-top img, .recipe-detail-hero img', dialog);
  if (photo && canAnimate()) {
    motion.fromTo(photo, {clipPath:'inset(0 0 0 20%)', opacity:.4}, {clipPath:'inset(0)', opacity:1, duration:.56, ease:'power3.out'});
  }
}

function showFavorites() {
  const list = [...favorites].map(id => regionItem(byId[id])).join('');
  openDialog(`<section class="dialog-section">
    <h2 id="dialog-title">Mes favoris</h2>
    <p>${list ? `${favorites.size} ${favorites.size === 1 ? 'produit enregistré' : 'produits enregistrés'} sur cet appareil.` : 'Ajoutez un produit avec le cœur qui figure sur sa carte.'}</p>
    ${list ? `<div class="dialog-list">${list}</div>` : '<button class="text-link" data-action="go-calendar">Parcourir le calendrier</button>'}
  </section>`);
}

function showSources() {
  openDialog(`<section class="dialog-section">
    <h2 id="dialog-title">Sources et crédits</h2>
    <ul class="source-list">
      <li><strong>Saisonnalité.</strong> Une sélection de 24 produits à partir du <a href="https://www.lesfruitsetlegumesfrais.com/app/uploads/2025/09/calendrier-de-saison-fruits-legumes.pdf" target="_blank" rel="noopener">calendrier Interfel et CTIFL</a>. Les saisons sont des repères de consommation, parfois après conservation. Pour la tomate et le poivron, le site privilégie le cœur de saison.</li>
      <li><strong>Production.</strong> <a href="https://www.lesfruitsetlegumesfrais.com/filiere-des-fruits-et-legumes/production-en-france" target="_blank" rel="noopener">Carte Interfel fondée sur Agreste</a> et références publiques indiquées dans chaque fiche. Les régions sont des exemples de territoire, avec des volumes variables.</li>
      <li><strong>Apports.</strong> <a href="https://doi.org/10.57745/RDMHWY" target="_blank" rel="noopener">Anses. Table de composition nutritionnelle des aliments Ciqual 2025</a>, version 1, Licence Ouverte Etalab 2.0. <a href="https://www.anses.fr/system/files/NUT2018SA0238Ra.pdf" target="_blank" rel="noopener">Rapport Anses sur les fonctions des vitamines et minéraux</a>.</li>
      <li><strong>Cartographie.</strong> IGN Admin Express, Licence Ouverte Etalab, contours simplifiés via <a href="https://github.com/gregoiredavid/france-geojson" target="_blank" rel="noopener">Grégoire David</a>, puis adaptés pour Pleine Saison.</li>
      <li><strong>Images et typographies.</strong> Images d’illustration créées avec ImageGen. Instrument Serif et DM Sans, licences SIL Open Font License. Animations avec <a href="https://gsap.com/standard-license/" target="_blank" rel="noopener">GSAP et ScrollTrigger</a>.</li>
    </ul>
  </section>`);
}

let lastSurprise;
function showSurprise() {
  const candidates = produce.filter(item => item.months.includes(state.month) && (state.category === 'all' || item.type === state.category));
  const choices = candidates.length > 1 ? candidates.filter(item => item.id !== lastSurprise) : candidates;
  if (!choices.length) return;
  const item = choices[Math.floor(Math.random() * choices.length)];
  lastSurprise = item.id;
  detailProduct(item);
}

function renderStorageProduct(id, animate = false) {
  const item = byId[id];
  const panel = $('#storage-detail');
  panel.innerHTML = `<article class="storage-product">
    ${image(item.id, {alt:item.name})}
    <div class="storage-copy">
      <h3>${item.name}</h3>
      <dl class="practical-list">
        <div><dt>Bien choisir</dt><dd>${item.buy}</dd></div>
        <div><dt>Conserver</dt><dd>${item.keep}</dd></div>
        <div><dt>Cuisiner</dt><dd>${item.cook}</dd></div>
      </dl>
      <button class="text-link" data-action="product" data-id="${item.id}">Ouvrir la fiche complète ${icon('arrow')}</button>
    </div>
  </article>`;
  if (animate && canAnimate()) {
    motion.from(panel.firstElementChild, {opacity:.15,y:11,duration:.48,ease:'power3.out'});
  }
}

function initMarket() {
  const select = $('#storage-product');
  const alphabetic = [...produce].sort((a,b) => a.name.localeCompare(b.name,'fr'));
  const featured = seasons[keyForMonth(state.month)].featured.find(id => byId[id].months.includes(state.month));
  select.innerHTML = alphabetic.map(item => `<option value="${item.id}">${item.name}</option>`).join('');
  select.value = featured ?? alphabetic[0].id;
  renderStorageProduct(select.value);
  select.addEventListener('change', () => renderStorageProduct(select.value,true));
}

const actions = {
  product: id => detailProduct(byId[id]),
  save: toggleFavorite,
  recipe: id => detailRecipe(recipes.find(recipe => recipe.id === id)),
  'recipe-servings': delta => adjustServings(Number(delta)),
  'recipe-step': step => setRecipeStep(Number(step)),
  'recipe-back': () => setRecipeStep(Math.max(0, recipeView.step - 1)),
  'recipe-next': () => setRecipeStep(recipeView.step === recipeView.recipe.steps.length ? 0 : recipeView.step + 1),
  favorites: showFavorites,
  sources: showSources,
  surprise: showSurprise,
  'detail-section': id => {
    const section = document.getElementById(id);
    section.scrollIntoView({behavior: reducedMotion.matches ? 'instant' : 'smooth', block:'start'});
    const heading = $('h3', section);
    heading.tabIndex = -1;
    heading.focus({preventScroll:true});
  },
  'region-products': () => openDialog(`<section class="dialog-section">
    <h2 id="dialog-title">${regionById[state.region].name}</h2>
    <p>Fruits et légumes de notre sélection cultivés dans la région.</p>
    <div class="dialog-list">${regionProducts(state.region).map(item => regionItem(item, true)).join('')}</div>
  </section>`),
  'portrait-region': id => {
    changeRegion(id);
    $('#terroirs').scrollIntoView();
    $('#regions').focus({preventScroll:true});
  },
  'jump-region': id => {
    dialog.close();
    if (pageName === 'terroirs') {
      changeRegion(id);
      $('#regions').focus({ preventScroll: true });
    } else window.location.assign(`terroirs.html?region=${id}`);
  },
  'go-calendar': () => {
    dialog.close();
    if (pageName === 'calendrier') $('#months [aria-pressed=true]').focus();
    else window.location.assign(calendarUrl());
  },
  'reset-filters': () => {
    state.category = 'all';
    state.expanded = false;
    state.search = '';
    $('#search').value = '';
    renderCalendar();
    $('#search').focus({ preventScroll: true });
  },
};

document.addEventListener('click', event => {
  const control = event.target.closest('[data-action]');
  if (control) actions[control.dataset.action](control.dataset.id);
});
$('#season-selector')?.addEventListener('click', event => {
  const control = event.target.closest('[data-season]');
  if (control && control.getAttribute('aria-pressed') !== 'true') updateMonth(seasons[control.dataset.season].month, false);
});
$('#months')?.addEventListener('click', event => {
  const control = event.target.closest('[data-month]');
  if (control) updateMonth(Number(control.dataset.month));
});
$('#months')?.addEventListener('keydown', event => {
  const control = event.target.closest('[data-month]');
  const directions = { ArrowRight: 1, ArrowLeft: -1 };
  if (!control || !Object.hasOwn(directions, event.key)) return;
  event.preventDefault();
  const month = (Number(control.dataset.month) - 1 + directions[event.key] + 12) % 12 + 1;
  updateMonth(month);
  $(`[data-month="${month}"]`).focus();
});
$('.categories')?.addEventListener('click', event => {
  const control = event.target.closest('[data-category]');
  if (!control || control.dataset.category === state.category) return;
  state.category = control.dataset.category;
  state.expanded = false;
  transitionCalendar(renderCalendar);
});
$('#search')?.addEventListener('input', event => {
  state.search = event.target.value;
  state.expanded = false;
  renderCalendar();
});
$('#today')?.addEventListener('click', () => {
  updateMonth(currentMonth);
  $(`[data-month="${currentMonth}"]`).focus({ preventScroll: true });
});
$('#show-more')?.addEventListener('click', () => {
  state.expanded = !state.expanded;
  renderCalendar();
  const target = state.expanded ? $$('#produce-grid .card-link')[4] : $('#months [aria-pressed=true]');
  target?.focus();
});
$('#recipe-more')?.addEventListener('click', () => {
  state.recipesExpanded = !state.recipesExpanded;
  renderRecipes();
});
$('#regions')?.addEventListener('change', event => changeRegion(event.target.value));
$('#region-map')?.addEventListener('click', event => {
  if (event.target.dataset.region) changeRegion(event.target.dataset.region);
});
$('#region-map')?.addEventListener('keydown', event => {
  if (event.target.dataset.region && ['Enter', ' '].includes(event.key)) {
    event.preventDefault();
    changeRegion(event.target.dataset.region);
  }
});
dialog.addEventListener('change', event => {
  if (!event.target.matches('.ingredient-check')) return;
  const ingredients = $$('.ingredient-check',dialog);
  $('#ingredient-count').textContent = `${ingredients.filter(input => input.checked).length} / ${ingredients.length} prêts`;
});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});

const gallery = $('#hero-gallery');
let requestedSeason = 'automne';
let seasonRequest = 0;
let seasonTween;

async function showSeason(month, animate = true) {
  const key = keyForMonth(month);
  $$('#season-selector button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.season === key)));
  if (key === requestedSeason) return;
  requestedSeason = key;
  const request = ++seasonRequest;
  if ($('[data-hero-current]', gallery).dataset.season === key) return;
  const season = seasons[key];
  const photo = new Image();
  photo.alt = season.alt;
  photo.src = `${images}${season.photo}.webp`;
  try {
    await photo.decode();
  } catch {
    if (request === seasonRequest) requestedSeason = null;
    return;
  }
  if (request !== seasonRequest) return;
  seasonTween?.progress(1);
  const previous = $('[data-hero-current]', gallery);
  previous.removeAttribute('data-hero-current');
  previous.setAttribute('aria-hidden','true');
  gallery.append(photo);
  photo.dataset.heroCurrent = '';
  photo.dataset.season = key;
  $('#hero-season-name').textContent = season.name;
  if (animate && canAnimate()) {
    const start = 'polygon(0 0, 0 0, 0 100%, 0 100%)';
    const end = 'polygon(0 0, 122% 0, 100% 100%, 0 100%)';
    seasonTween = motion.fromTo(photo, {clipPath:start, scale:1.09}, {
      clipPath:end, scale:1, duration:.83, ease:'power3.inOut', clearProps:'clipPath,transform',
      onComplete: () => { previous.remove(); seasonTween = null; },
    });
  } else previous.remove();
}

function setupMotion() {
  if (!motion || !window.ScrollTrigger) return;
  motion.registerPlugin(ScrollTrigger);
  const media = motion.matchMedia();
  const hero = $('.hero-image');
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const reveal = (selector, trigger, stagger = .09) => {
      if (!$(trigger)) return;
      motion.from(selector, { y:28, opacity:.12, duration:.75, stagger, ease:'power3.out',
        scrollTrigger:{trigger,start:'top 84%',once:true},
      });
    };
    reveal('.atlas-intro, .map-panel, .region-panel', '.atlas');
    reveal('.recipe-feature, .recipe', '.kitchen');
    reveal('.guide-copy > *', '.guide', .07);
    reveal('.portrait-item', '.portrait-grid', .10);
    reveal('.storage-panel', '.market-storage');
    reveal('.leftovers-copy, .market-leftovers img', '.market-leftovers');
    if ($('.guide-image')) {
      motion.fromTo('.guide-image img', {yPercent:-3,scale:1.12}, {
        yPercent:3, ease:'none', scrollTrigger:{trigger:'.guide-image',start:'top bottom',end:'bottom top',scrub:.6},
      });
    }
    if (!hero) return;
    motion.timeline()
      .from('.hero-line > *', { yPercent:60, opacity:0, duration:.85, stagger:.10, ease:'power4.out' })
      .from('.hero-copy > p, .hero-actions', { y:15, opacity:0, duration:.62, stagger:.095, ease:'power3.out' }, '-=.56');
    motion.to(gallery, {
      yPercent:2.8, ease:'none', scrollTrigger:{trigger:hero,start:'top top',end:'bottom top',scrub:.5},
    });
    const panX = motion.quickTo(gallery,'x',{duration:.56,ease:'power3.out'});
    const panY = motion.quickTo(gallery,'y',{duration:.56,ease:'power3.out'});
    const onMove = event => {
      if (!finePointer.matches || event.pointerType !== 'mouse') return;
      const box = hero.getBoundingClientRect();
      panX(((event.clientX - box.left) / box.width - .5) * -22);
      panY(((event.clientY - box.top) / box.height - .5) * -16);
    };
    const onLeave = () => { panX(0); panY(0); };
    hero.addEventListener('pointermove', onMove);
    hero.addEventListener('pointerleave', onLeave);
    return () => {
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
      if (seasonTween) seasonTween.progress(1);
    };
  });
}

sessionValue('mois',state.month);
if (pageName === 'terroirs') sessionValue('region',state.region);
updateCalendarLinks();
syncFavorites();
if (pageName === 'calendrier') {
  renderMonthButtons();
  renderCalendar();
}
if (pageName === 'terroirs') {
  renderMap();
  renderRegion();
}
if (pageName === 'cuisine') renderRecipes();
if (pageName === 'marche') initMarket();
if (pageName === 'accueil') showSeason(state.month, false);
window.addEventListener('pageshow', event => {
  if (!event.persisted) return;
  favorites.clear();
  readFavorites().forEach(id => favorites.add(id));
  syncFavorites();
});
setupMotion();
