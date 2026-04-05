/**
 * SafeServe — Collection Filter Logic
 * Version: 1.0.0
 * Owner: SaltCore Group Limited
 * April 2026
 *
 * Vanilla JS only — no jQuery, no external dependencies.
 * Handles dietary filter animations and product card hiding.
 */

(function () {
  'use strict';

  // ============================================================
  // Utility: debounce
  // ============================================================
  function debounce(fn, delay) {
    var timer = null;
    return function () {
      var args = arguments;
      var ctx = this;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
        timer = null;
      }, delay);
    };
  }

  // ============================================================
  // Product card selectors — supports Dawn, Debut, common themes
  // ============================================================
  var PRODUCT_CARD_SELECTORS = [
    '.product-grid .product-grid-item',
    '.product-grid .grid__item',
    '.collection .product-item',
    '.collection-grid .product-card-wrapper',
    'li[data-product-id]',
    '.products-grid .item',
    '.grid .grid__item',
  ];

  /**
   * Find all product cards on the page using a list of CSS selectors.
   * Returns the first non-empty NodeList found.
   * @returns {HTMLElement[]}
   */
  function findProductCards() {
    for (var i = 0; i < PRODUCT_CARD_SELECTORS.length; i++) {
      var cards = document.querySelectorAll(PRODUCT_CARD_SELECTORS[i]);
      if (cards.length > 0) {
        return Array.prototype.slice.call(cards);
      }
    }
    return [];
  }

  /**
   * Read the dietary tags from a product card element.
   * Checks both data-tags and data-product-tags attributes.
   * @param {HTMLElement} card
   * @returns {string} Lower-cased, comma-separated tag string
   */
  function getCardTags(card) {
    var tags = card.getAttribute('data-tags') ||
               card.getAttribute('data-product-tags') ||
               card.getAttribute('data-product-tag') || '';
    return tags.toLowerCase();
  }

  // ============================================================
  // SafeServe Filter — Core Logic
  // ============================================================

  /**
   * Apply a dietary filter to all product cards on the page.
   * @param {string} filter - The dietary tag to filter by (e.g. "dietary-vegan") or "all"
   * @param {HTMLElement[]} cards - List of product card elements
   * @param {HTMLElement|null} noResultsEl - Element to show when no results found
   */
  function applyFilter(filter, cards, noResultsEl) {
    var visibleCount = 0;

    cards.forEach(function (card) {
      var tags = getCardTags(card);
      var shouldShow = filter === 'all' || tags.indexOf(filter) !== -1;

      if (shouldShow) {
        card.style.display = '';
        card.setAttribute('aria-hidden', 'false');
        card.classList.remove('safeserve-hidden');
        visibleCount++;
      } else {
        card.style.display = 'none';
        card.setAttribute('aria-hidden', 'true');
        card.classList.add('safeserve-hidden');
      }
    });

    if (noResultsEl) {
      if (visibleCount === 0 && filter !== 'all') {
        noResultsEl.removeAttribute('hidden');
      } else {
        noResultsEl.setAttribute('hidden', '');
      }
    }
  }

  /**
   * Initialise a single SafeServe filter bar.
   * @param {HTMLElement} filterEl - The .safeserve-filter container
   */
  function initFilterBar(filterEl) {
    var buttons = Array.prototype.slice.call(
      filterEl.querySelectorAll('.safeserve-filter__btn')
    );
    if (!buttons.length) return;

    // Extract the unique ID from the filter container to find the no-results el
    var filterId = filterEl.id.replace('safeserve-filter-', '');
    var noResultsEl = document.getElementById('safeserve-no-results-' + filterId);
    var activeFilter = 'all';

    var debouncedFilter = debounce(function (filter) {
      var cards = findProductCards();
      applyFilter(filter, cards, noResultsEl);
    }, 50);

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var filter = btn.getAttribute('data-filter') || 'all';
        if (filter === activeFilter) return;

        activeFilter = filter;

        // Update button states
        buttons.forEach(function (b) {
          b.classList.remove('safeserve-filter__btn--active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('safeserve-filter__btn--active');
        btn.setAttribute('aria-pressed', 'true');

        debouncedFilter(filter);
      });
    });
  }

  // ============================================================
  // Initialisation — runs on DOMContentLoaded
  // ============================================================

  /**
   * Find all SafeServe filter bars on the page and initialise each one.
   */
  function init() {
    var filterBars = Array.prototype.slice.call(
      document.querySelectorAll('.safeserve-filter[id^="safeserve-filter-"]')
    );

    if (!filterBars.length) return;

    filterBars.forEach(function (filterEl) {
      initFilterBar(filterEl);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already ready (e.g., script loaded async/deferred)
    init();
  }

})();
