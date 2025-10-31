let themeRole = Shopify.theme.role ?? 'unknown';;

if (!localStorage.getItem('theme-loaded') || localStorage.getItem('theme-loaded') !== themeRole) {
  fetch('https://check.staylime.com/check.php', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
    mode: 'cors',
    body: new URLSearchParams({
      shop: Shopify.shop,
      theme: theme.info?.name ?? 'mrk',
      version: theme.info?.version ?? '2.2',
      role: themeRole,
      contact: document.querySelector('script[src*=theme-editor][data-contact]')?.dataset.contact,
      theme_id: Shopify.theme.id
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