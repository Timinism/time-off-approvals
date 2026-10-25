export const THEME_STORAGE_KEY = "timeoff-theme";

/** Runs before paint so a saved dark theme does not flash the light page. */
export const themeBootScript = `(function(){try{var dark=localStorage.getItem("${THEME_STORAGE_KEY}")==="dark";document.documentElement.classList.toggle("dark",dark);document.documentElement.style.colorScheme=dark?"dark":"light";var meta=document.querySelector('meta[name="theme-color"]');if(meta&&dark)meta.setAttribute("content","#142624");}catch(e){}})();`;
