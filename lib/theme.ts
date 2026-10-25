export const THEME_STORAGE_KEY = "timeoff-theme";

/** Runs before paint so a saved dark theme does not flash the light page. */
export const themeBootScript = `(function(){try{var stored=localStorage.getItem("${THEME_STORAGE_KEY}");var dark=stored?stored==="dark":true;document.documentElement.classList.toggle("dark",dark);document.documentElement.style.colorScheme=dark?"dark":"light";var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute("content",dark?"#100e16":"#f6f2fb");}catch(e){}})();`;
