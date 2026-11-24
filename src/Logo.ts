import './design.css';

/** Shared brand lockup. The icon and favicon use the same original vector asset. */
export function Logo() {
  return `<a class="brand" href="./" aria-label="GeoQuest Bulgaria"><img class="brand-mark" src="${import.meta.env.BASE_URL}logo.svg" width="44" height="44" alt="" aria-hidden="true"><span class="brand-name">GeoQuest <span>Bulgaria</span></span></a>`;
}
