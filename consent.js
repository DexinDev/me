/* Consent-first analytics.
 * Google Analytics is never loaded until the visitor opts in. The choice is
 * remembered and can be changed later via the "Cookies" control in the footer. */
(() => {
  const ID = "G-PMCR649KB2";
  const KEY = "consent.analytics";

  const banner = document.getElementById("cookie-banner");
  if (!banner) return;

  let loaded = false;
  function loadAnalytics() {
    if (loaded) return;
    loaded = true;

    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + ID;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", ID);
  }

  const stored = localStorage.getItem(KEY);
  if (stored === "granted") loadAnalytics();
  else if (stored !== "denied") banner.hidden = false;

  banner.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-consent]");
    if (!btn) return;
    const choice = btn.dataset.consent;
    localStorage.setItem(KEY, choice);
    banner.hidden = true;
    if (choice === "granted") loadAnalytics();
  });

  const manage = document.getElementById("cookie-manage");
  if (manage) manage.addEventListener("click", () => { banner.hidden = false; });
})();
