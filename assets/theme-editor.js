let themeRole = Shopify.theme.role ?? 'unknown';;

if (!localStorage.getItem('theme-loaded') || localStorage.getItem('theme-loaded') !== themeRole) {
  fetch('https://check.staylime.com/check.php', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },

    })
  })
    .then((response) => {
      if (response.ok) {
        localStorage.setItem('theme-loaded', themeRole);
      }
    });
}

document.addEventListener('shopify:section:load', () => {
    const zoomOnHoverScript = document.querySelector('[id^=EnableZoomOnHover]')
    if (!zoomOnHoverScript) return
    if (zoomOnHoverScript) {
      const newScriptTag = document.createElement('script')
      newScriptTag.src = zoomOnHoverScript.src
      zoomOnHoverScript.parentNode.replaceChild(newScriptTag, zoomOnHoverScript)
    }
})