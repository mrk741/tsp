window.theme = window.theme || {};

theme.config = {
  mqlSmall: false,
  mediaQuerySmall: 'screen and (max-width: 749px)',
  isTouch: ('ontouchstart' in window) || window.DocumentTouch && window.document instanceof DocumentTouch || window.navigator.maxTouchPoints || window.navigator.msMaxTouchPoints ? true : false,
  isRTL: document.documentElement.getAttribute('dir') === 'rtl',
};

(() => {
  const style = document.createElement('style');
  style.textContent = `
    html[data-pinch-disable] * {
      scroll-snap-type: none !important;
      scroll-behavior: auto !important;
      filter: none !important;
    }`;
  document.head.append(style);

  let zooming = false;

  const onStart = e => {
    if (e.touches.length > 1 && !zooming) {
      zooming = true;
      document.documentElement.setAttribute('data-pinch-disable', '');
    }
  };

  const onEnd = e => {
    if (zooming && e.touches.length === 0) {
      zooming = false;
      document.documentElement.removeAttribute('data-pinch-disable');
    }
  };

  window.addEventListener('touchstart', onStart, { passive: true });
  window.addEventListener('touchend',   onEnd,   { passive: true });
})();

function configurePageFadeInOnLoad() {
  const fadeInDuration = getComputedStyle(document.documentElement).getPropertyValue('--fade-in-duration').trim();

  if (!fadeInDuration) {
    return;
  }

  if (document.querySelector('.fade-in.fade-in--content')) {
    const lastHeaderGroupElement = [...document.querySelectorAll('.shopify-section-group-header-group')].at(-1);
    const lastHeaderGroupElementRect = lastHeaderGroupElement.getBoundingClientRect();
  
    document.documentElement.style.setProperty('--header-group-height', `${lastHeaderGroupElementRect.bottom + window.scrollY}px`);
  }

  const fadeInDurationMs = parseInt(fadeInDuration) * 1000;
  const delay = 400;

  setTimeout(() => {
    document.body.style.setProperty("--fade-in-element-display", "none");
  }, fadeInDurationMs + delay); 
}

document.addEventListener("DOMContentLoaded", () => {
  configurePageFadeInOnLoad();

  document.body.classList.add("loaded");
});

const PUB_SUB_EVENTS = {
  cartUpdate: 'cart-update',
  quantityUpdate: 'quantity-update',
  variantChange: 'variant-change',
  cartError: 'cart-error',
};

const SECTION_REFRESH_RESOURCE_TYPE = {
  product: 'product',
};

let subscribers = {};

function subscribe(eventName, callback) {
  if (subscribers[eventName] === undefined) {
    subscribers[eventName] = [];
  }

  subscribers[eventName] = [...subscribers[eventName], callback];

  return function unsubscribe() {
    subscribers[eventName] = subscribers[eventName].filter((cb) => {
      return cb !== callback;
    });
  };
}

function publish(eventName, data) {
  if (subscribers[eventName]) {
    subscribers[eventName].forEach((callback) => {
      callback(data);
    });
  }
}

function filterShopifyEvent(event, domElement, callback) {
  let executeCallback = false;
  if (event.type.includes('shopify:section')) {
    if (domElement.hasAttribute('data-section-id') && domElement.getAttribute('data-section-id') === event.detail.sectionId) {
      executeCallback = true;
    }
  }
  else if (event.type.includes('shopify:block') && event.target === domElement) {
    executeCallback = true;
  }
  if (executeCallback) {
    callback(event);
  }
}

// Init section function when it's visible, then disable observer
theme.initWhenVisible = function(options) {
  const threshold = options.threshold ? options.threshold : 0;

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (typeof options.callback === 'function') {
          options.callback();
          observer.unobserve(entry.target);
        }
      }
    });
  }, {rootMargin: `0px 0px ${threshold}px 0px`});

  observer.observe(options.element);
};

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href]:not([tabindex^='-']), button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object:not([tabindex^='-']), iframe, color-swatch"
    )
  );
}

class HTMLUpdateUtility {
  #preProcessCallbacks = [];
  #postProcessCallbacks = [];

  constructor() {}

  addPreProcessCallback(callback) {
    this.#preProcessCallbacks.push(callback);
  }

  addPostProcessCallback(callback) {
    this.#postProcessCallbacks.push(callback);
  }

  /**
    * Used to swap an HTML node with a new node.
    * The new node is inserted as a previous sibling to the old node, the old node is hidden, and then the old node is removed.
    *
    * The function currently uses a double buffer approach, but this should be replaced by a view transition once it is more widely supported https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
    */
  viewTransition(oldNode, newContent) {
    this.#preProcessCallbacks.forEach((callback) => callback(newContent));

    const newNode = oldNode.cloneNode();
    HTMLUpdateUtility.setInnerHTML(newNode, newContent.innerHTML);
    oldNode.parentNode.insertBefore(newNode, oldNode);
    oldNode.style.display = 'none';

    this.#postProcessCallbacks.forEach((callback) => callback(newNode));

    setTimeout(() => oldNode.remove(), 1000);
  }

  // Sets inner HTML and reinjects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
  static setInnerHTML(element, html) {
    element.innerHTML = html;
    element.querySelectorAll('script').forEach((oldScriptTag) => {
      const newScriptTag = document.createElement('script');
      Array.from(oldScriptTag.attributes).forEach((attribute) => {
        newScriptTag.setAttribute(attribute.name, attribute.value);
      });
      newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
      oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
    });
  }
}

if (window.Shopify && window.Shopify.designMode) {
  document.documentElement.style.setProperty(
      "--scrollbar-width",
      `${window.innerWidth - document.documentElement.clientWidth}px`
  );
}

document.addEventListener("DOMContentLoaded", () => {
  const ltrInputs = document.querySelectorAll('input[type="email"], input[type="tel"], input[type="number"], input[type="url"]');

  ltrInputs.forEach(ltrInput => {
    const placeholder = ltrInput.getAttribute('placeholder');

    if (placeholder) {
      const isPlaceholderRTL = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(placeholder); 

      ltrInput.style.setProperty("--placeholder-align", isPlaceholderRTL ? "right" : "left");
    }
  })
});

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute('role', 'button');
  summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));

  if(summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
  });

  if (summary.closest('header-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

document.addEventListener("DOMContentLoaded", function () {
  function animateHighlights() {
      const highlights = document.querySelectorAll(".custom-heading .highlight");

      const observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
              if (entry.intersectionRatio > 0.75) {
                  entry.target.classList.add("visible");
                  const promo = entry.target.closest('.scrolling-promotion') || entry.target.querySelector('.scrolling-promotion');
                  if (promo) {
                    promo.querySelectorAll('.highlight').forEach(text => text.classList.add('visible'));
                  }
              }
          });
      }, { threshold: 0.75 });

      highlights.forEach(highlight => {
        highlight.closest('.section-scrolling-promotion-banner') ? observer.observe(highlight.closest('.section-scrolling-promotion-banner').querySelector('.banner__content-wrapper')) : observer.observe(highlight)
      });
  }

  animateHighlights();

  document.addEventListener("shopify:section:load", function () {
      animateHighlights();
  });
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {

  if(!container) return
  var elements = getFocusableElements(container);
  
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (
      event.target !== container &&
      event.target !== last &&
      event.target !== first
    )
      return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function() {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function(event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if (
      (event.target === container || event.target === first) &&
      event.shiftKey
    ) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  if (elementToFocus) elementToFocus.focus();
}
focusVisiblePolyfill()

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(":focus-visible");
} catch(e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = ['ARROWUP', 'ARROWDOWN', 'ARROWLEFT', 'ARROWRIGHT', 'TAB', 'ENTER', 'SPACE', 'ESCAPE', 'HOME', 'END', 'PAGEUP', 'PAGEDOWN']
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if(event.code && navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener('focus', () => {
    if (currentFocusedElement) {
      currentFocusedElement.classList.remove('focused')
      if(currentFocusedElement.closest('.product_options-hover') && currentFocusedElement.closest('.product_options-hover').className.includes('focused-elements')) currentFocusedElement.closest('.product_options-hover').classList.remove('focused-elements')
    };
    if (mouseClick) return;
    currentFocusedElement = document.activeElement;
    currentFocusedElement.classList.add('focused');
    if(currentFocusedElement.closest('.product_options-hover') && !currentFocusedElement.closest('.product_options-hover').className.includes('focused-elements')) {
      currentFocusedElement.closest('.product_options-hover').classList.add('focused-elements')
    }

  }, true);
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}
  
function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': `application/${type}` }
  };
}

function preloadImages(element) {
  if (!element) element = document;

  element.querySelectorAll('.card-product img').forEach(img => {
    img.addEventListener('load', () => {img.classList.add('loaded')})
    if (img.complete) img.classList.add('loaded')
  })
}
preloadImages()

function areChildrenEmpty(element) {
  return ![...element.children].some(child => {
    const styles = window.getComputedStyle(child);
    const height = child.getBoundingClientRect().height;
    const hasVisibleContent = 
      height > 0 && 
      styles.display !== "none" && 
      styles.visibility !== "hidden" &&
      styles.opacity !== "0" &&
      child.offsetParent !== null;

    return hasVisibleContent || child.textContent.trim() !== "";
  })
}

function hideEmptyBlocks() {
  const blocksToHide = document.querySelectorAll('.hide-if-empty');

  blocksToHide.forEach((element) => {
    element.classList.remove('hide-if-empty--hidden');

    if (areChildrenEmpty(element)) element.classList.add('hide-if-empty--hidden');
  })
}

window.addEventListener('DOMContentLoaded', () => {
  hideEmptyBlocks();
})

window.addEventListener('resize', () => {
  hideEmptyBlocks();
})

document.addEventListener('shopify:section:load', () => {
  hideEmptyBlocks();
})

function getMediaType(media) {
  if (!media) {
    return null;
  }

  const mediaType =
    media.tagName.toUpperCase() === "VIDEO"
      ? "VIDEO"
      : media.tagName.toUpperCase() === "IMG"
      ? "IMAGE"
      : media.classList.contains("js-youtube")
      ? "YOUTUBE"
      : media.classList.contains("js-vimeo")
      ? "VIMEO"
      : media.tagName.toUpperCase() === 'PRODUCT-MODEL'
      ? 'MODEL'
      : null;

  return mediaType;
}

function pauseAllMedia() {
  document.querySelector('body').querySelectorAll('.js-youtube').forEach(video => {
    if(video.closest('main') || video.closest('.shopify-section-group-footer-group') || video.closest('.product-media-modal')) pauseYoutubeVideo(video)
  });
  document.querySelector('body').querySelectorAll('.js-vimeo').forEach(video => {
    if(video.closest('main') || video.closest('.shopify-section-group-footer-group') || video.closest('.product-media-modal')) pauseVimeoVideo(video)
  });
  document.querySelector('body').querySelectorAll('video').forEach(video => {
    if(video.closest('main') || video.closest('.shopify-section-group-footer-group') || video.closest('.product-media-modal')) pauseVideo(video)
  });
  document.querySelector('body').querySelectorAll('product-model').forEach(model => {
    if (model.modelViewerUI) pauseModel(model)
  });
}

function handleMediaAction(media, actions, isAutoplayEnabled = false) {
  if (!media) {
    return;
  }

  const mediaType = getMediaType(media);
  const action = actions[mediaType];

  if (action) {
    action(media, isAutoplayEnabled);
  }
}

function pauseMedia(media, isAutoplayEnabled = false) {
  handleMediaAction(media, {
    'VIDEO': pauseVideo,
    'YOUTUBE': pauseYoutubeVideo,
    'VIMEO': pauseVimeoVideo,
    'MODEL': pauseModel
  }, isAutoplayEnabled);
}

function playMedia(media, isAutoplayEnabled = false, forcePlay = false) {
  if (!forcePlay && media && media.dataset.pausedByScript === 'false' && isAutoplayEnabled) {
    return;
  }

  handleMediaAction(media, {
    'VIDEO': playVideo,
    'YOUTUBE': playYoutubeVideo,
    'VIMEO': playVimeoVideo,
    'MODEL': playModel
  }, isAutoplayEnabled);
}

async function playYoutubeVideo(video, isAutoplayEnabled = false) {
  if (!video || video.tagName !== 'IFRAME') {
    console.warn('Invalid video element provided');
    return;
  }

  try {
    await loadScript('youtube');

    const youtubePlayer = await getYoutubePlayer(video);

    if (isAutoplayEnabled) {
      youtubePlayer.mute();
    }

    youtubePlayer.playVideo();
  } catch (error) {
    console.error('Error handling YouTube video play:', error);
  }
}

async function pauseYoutubeVideo(video, isAutoplayEnabled = false) {
  if (!video || video.tagName !== 'IFRAME') {
    console.warn('Invalid video element provided');
    return;
  }

  try {
    await loadScript('youtube');

    const youtubePlayer = await getYoutubePlayer(video);
    const playerState = youtubePlayer.getPlayerState();

    if (playerState === YT.PlayerState.PAUSED) {
      return; 
    }

    youtubePlayer.pauseVideo();

    if (isAutoplayEnabled) {
      video.setAttribute('data-paused-by-script', 'true');

      // Attach a one-time event listener for the play event
      const handleStateChange = (event) => {
        if (event.data === YT.PlayerState.PLAYING) {
          video.setAttribute('data-paused-by-script', 'false');
          youtubePlayer.removeEventListener('onStateChange', handleStateChange);
        }
      };

      youtubePlayer.addEventListener('onStateChange', handleStateChange);
    }
  } catch (error) {
    console.error('Error handling YouTube video pause:', error);
  }
}

function getYoutubePlayer(video) {
  return new Promise((resolve) => {
    window.YT.ready(() => {
      const existingPlayer = YT.get(video.id);

      if (existingPlayer) {
        resolve(existingPlayer);
      } else {
        const playerInstance = new YT.Player(video, {
          events: {
            onReady: (event) => resolve(event.target),
          },
        });
      }
    });
  });
}

function removeYoutubePlayer(videoId) {
  const existingPlayer = YT.get(videoId);

  if (existingPlayer) {
    existingPlayer.destroy(); 
  }
}

function playVimeoVideo(video, isAutoplayEnabled = false) {
  if (!video || video.tagName !== 'IFRAME') {
    return;
  }

  if (isAutoplayEnabled) {
    video.contentWindow?.postMessage(
      JSON.stringify({ method: 'setmrk', value: 0 }),
      '*'
    );
  }

  video.contentWindow?.postMessage('{"method":"play"}', '*');
}

async function pauseVimeoVideo(video, isAutoplayEnabled = false) {
  if (!video || video.tagName !== 'IFRAME') {
    return;
  }

  try {
    await loadScript('vimeo');

    const vimeoPlayer = new Vimeo.Player(video);
    const isPaused = await vimeoPlayer.getPaused();

    if (isPaused) {
      return; 
    }

    video.contentWindow?.postMessage('{"method":"pause"}', '*');
    
    if (isAutoplayEnabled) { 
      video.setAttribute('data-paused-by-script', 'true');  

      const handlePlay = () => {
        video.setAttribute('data-paused-by-script', 'false');
        vimeoPlayer.off('play', handlePlay);
      };

      vimeoPlayer.on('play', handlePlay);
    }
  } catch (error) {
    console.error('Error handling Vimeo video pause:', error);
  }
}

function playVideo(video, isAutoplayEnabled = false) {
  if (!video || !(video instanceof HTMLVideoElement)) {
    return;
  }

  if (isAutoplayEnabled) {
    video.muted = true;
  }

  video.play();
}

function pauseVideo(video, isAutoplayEnabled = false) {
  if (!video || !(video instanceof HTMLVideoElement)) {
    return;
  }

  if (video.paused) { 
    return;
  } 

  video.pause();
  
  if (isAutoplayEnabled) {  
    video.setAttribute('data-paused-by-script', 'true');  

    video.addEventListener('play', () => { 
      video.setAttribute('data-paused-by-script', 'false');
    }, { once: true })
  }
}

function playModel(model) {
  if (model.modelViewerUI) model.modelViewerUI.play();
}

function pauseModel(model) {
  if (model.modelViewerUI) model.modelViewerUI.pause();
}

function loadScript(mediaType) {
  return new Promise((resolve, reject) => {
    let scriptId;

    switch (mediaType) {
      case 'youtube':
        scriptId = 'youtube-iframe-api';
        break;
      case 'vimeo':
        scriptId = 'vimeo-player-api';
        break;
      default:
        reject();
        return;
    }

    if (document.getElementById(scriptId)) {
      resolve();

      return;
    }

    const script = document.createElement('script');
    script.id = scriptId; 
    document.body.appendChild(script);

    script.onload = resolve;
    script.onerror = reject;
    script.async = true;

    switch (mediaType) {
      case 'youtube':
        script.src = 'https://www.youtube.com/iframe_api';
        break;
      case 'vimeo':
        script.src = '//player.vimeo.com/api/player.js';
        break;
      default:
        reject();
        return;
    }
  });
}

// Play or pause a video/product model if it’s visible or not
setTimeout(() => {
  document.querySelector('body').querySelectorAll('video').forEach((video) => {
    if(!video.closest('.none-autoplay') && (video.closest('main') || video.closest('.shopify-section-group-footer-group') || video.closest('.product-media-modal'))) {
      let isVisible = elemInViewport(video);
      let isPlaying = video.currentTime > 0 && !video.paused && !video.ended && video.readyState > video.HAVE_CURRENT_DATA;
      if(isVisible) {
        if(!isPlaying) video.play()
      } else {
        video.pause()
      }
    }
  })
  document.querySelector('main').querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI) {
      let isVisible = elemInViewport(model);
      isVisible ? model.modelViewerUI.play() : model.modelViewerUI.pause();
    }
  })
}, 10)

document.addEventListener('scroll', () => {
  document.querySelector('body').querySelectorAll('video').forEach((video) => {
    if(!video.closest('.none-autoplay') && (!video.closest('.video-controls-js') || !video.closest('.video-controls-js').querySelector('.button--pause.pause')) && (video.closest('main') || video.closest('.shopify-section-group-footer-group') || video.closest('.product-media-modal'))) {
      let isVisible = elemInViewport(video);
      let isPlaying = video.currentTime > 0 && !video.paused && !video.ended && video.readyState > video.HAVE_CURRENT_DATA;
      if(isVisible) {
        if(!isPlaying) video.play()
      } else {
        video.pause()
      }
    }
  })
})

if (Shopify.designMode) {
  document.addEventListener('shopify:section:load', () => {
    document.querySelector('body').querySelectorAll('video').forEach((video) => {
      if(!video.closest('.none-autoplay') && (video.closest('main') || video.closest('.shopify-section-group-footer-group') || video.closest('.product-media-modal'))) {
        let isVisible = elemInViewport(video);
        let isPlaying = video.currentTime > 0 && !video.paused && !video.ended && video.readyState > video.HAVE_CURRENT_DATA;
        if(isVisible) {
          if(!isPlaying) video.play()
            
        } else {
          video.pause()
        }
      }
    })
  })
}

function elemInViewport(elem) {
  let box = elem.getBoundingClientRect();
  let top = box.top;
  let bottom = box.bottom;
  let height = document.documentElement.clientHeight;
  let maxHeight = 0;
  return Math.min(height,bottom)- Math.max(0,top) >= maxHeight
}

function isStorageSupported (type) {
  if (window.self !== window.top) {
    return false;
  }
  const testKey = 'mrk-theme:test';
  let storage;
  if (type === 'session') {
    storage = window.sessionStorage;
  }
  if (type === 'local') {
    storage = window.localStorage;
  }

  try {
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return true;
  }
  catch (error) {
    // Do nothing, this may happen in Safari in incognito mode
    return false;
  }
}

/*
  * Shopify Common JS
  */
if ((typeof window.Shopify) == 'undefined') {
  window.Shopify = {};
}
Shopify.bind = function(fn, scope) {
  return function() {
    return fn.apply(scope, arguments);
  }
};
  
Shopify.setSelectorByValue = function(selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};
  
Shopify.addListener = function(target, eventName, callback) {
  if(target) target.addEventListener ? target.addEventListener(eventName, callback, false) : target.attachEvent('on'+eventName, callback);
};
  
Shopify.postLink = function(path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};
  var form = document.createElement("form");
  form.setAttribute("method", method);
  form.setAttribute("action", path);

  for(var key in params) {
    var hiddenField = document.createElement("input");
    hiddenField.setAttribute("type", "hidden");
    hiddenField.setAttribute("name", key);
    hiddenField.setAttribute("value", params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};
  
Shopify.CountryProvinceSelector = function(country_domid, province_domid, options) {
  this.countryEl 
  this.provinceEl
  this.provinceContainer

  this.shippingCalculators = document.querySelectorAll('shipping-calculator');

  if (this.shippingCalculators.length > 0) {
    this.shippingCalculators.forEach(shippingCalculator => {
      this.countryEl         = shippingCalculator.querySelector(`#${country_domid}`);
      this.provinceEl        = shippingCalculator.querySelector(`#${province_domid}`);
      this.provinceContainer = shippingCalculator.querySelector(`#${options['hideElement']}` || `#${province_domid}`);

      if(!this.countryEl) return
      Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler,this));
  
      this.initCountry();
      this.initProvince();
    })
  } else {
    this.countryEl         = document.getElementById(country_domid);
    this.provinceEl        = document.getElementById(province_domid);
    this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

    Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler,this));

    this.initCountry();
    this.initProvince();
  }
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function() {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function() {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function(e) {
    var opt       = this.countryEl.options[this.countryEl.selectedIndex];
    var raw       = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }
      this.provinceContainer.style.display = "";
    }
  },

  clearOptions: function(selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function(selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  }
};

document.addEventListener('quickview:loaded', () => {
  window.ProductModel = {
    loadShopifyXR() {
      Shopify.loadFeatures([
        {
          name: 'shopify-xr',
          version: '1.0',
          onLoad: this.setupShopifyXR.bind(this),
        },
      ]);
    },
  
    setupShopifyXR(errors) {
      if (errors) return;
  
      if (!window.ShopifyXR) {
        document.addEventListener('shopify_xr_initialized', () =>
          this.setupShopifyXR()
        );
        return;
      }
  
      document.querySelectorAll('[id^="ProductJSON-"]').forEach((modelJSON) => {
        window.ShopifyXR.addModels(JSON.parse(modelJSON.textContent));
        modelJSON.remove();
      });
      window.ShopifyXR.setupXRElements();
    },
  };
  if (window.ProductModel) {
      window.ProductModel.loadShopifyXR();
  }
});

class MultiSwiper {
  constructor(selector, options) {
    this.swipers = []
    this.selector = selector
    this.options = options
    document.addEventListener('swiper:update', () => {this.initSwipers()})
    this.initSwipers()
    document.addEventListener('shopify:section:load', () => {this.initSwipers()})
  }

  initSwipers() {
    this.destroyAllSwipers();
    document.querySelectorAll(this.selector).forEach(container => {
        const swiper = new Swiper(container, this.options)
        this.swipers.push(swiper)
        this.setupAutoplay(container, swiper)
        this.setupBullets(container, swiper)
        window.addEventListener('resize', () => {
          this.setupAutoplay(container, swiper)
          this.setupBullets(container, swiper)
        })
    })
  }

  removeSlide(index, swiperIndex = 0) {
    const swiper = this.swipers[swiperIndex];

    if (swiper) {
      swiper.removeSlide(index);
      swiper.update();
      swiper.slideTo(0, 0, false); 
    }
  }

  destroyAllSwipers() {
    this.swipers.forEach(swiper => swiper.destroy(true, true));
    this.swipers = [];
  }

  setupAutoplay(container, swiper) {
    if (container.dataset.autoplay === 'true' && container.dataset.hoverAutoplay === 'true') {
          const autoplaySpeed = parseInt(container.dataset.autoplaySpeed, 10) || 5000
          container.addEventListener('mouseenter', () => {
              if (window.innerWidth > 768) {
                  swiper.params.autoplay = {
                      delay: autoplaySpeed,
                      disableOnInteraction: false
                  };
                  swiper.autoplay.start()
              }
          });
          container.addEventListener('mouseleave', () => {
              if (swiper.autoplay.running) {
                  swiper.autoplay.stop()
              }
          })
    } else if (container.dataset.autoplay === 'true') {
      const autoplaySpeed = parseInt(container.dataset.autoplaySpeed, 10) || 5000
      swiper.params.autoplay = {
        delay: autoplaySpeed,
        pauseOnMouseEnter: true
      };
      swiper.autoplay.start()
      container.addEventListener('mouseover', () => {
            if (!swiper.params) return
            swiper.params.autoplay = {
                delay: autoplaySpeed,
                pauseOnMouseEnter: true
            };
            swiper.autoplay.stop()
      });
      container.addEventListener('mouseleave', () => {
            if (!swiper.params) return
            swiper.params.autoplay = {
                delay: autoplaySpeed,
                pauseOnMouseEnter: true
            };
            swiper.autoplay.start()
      });
    }
  }

  setupBullets(container, swiper) {
    if (container.dataset.paginationType === 'bullets') {
        swiper.params.pagination.dynamicBullets = false;
        swiper.pagination.render();
        swiper.pagination.update();
    }
  }
}

function validateFormInput (inputElement) {
  const inputType = inputElement.getAttribute('type');
  let isValid = false;

  switch (inputType) {
    case 'checkbox':
      const fieldWrapper = inputElement.closest('label');
      if (fieldWrapper.dataset.group) {
        const groupWrapper = fieldWrapper.parentElement;
        const minSelection = parseInt(groupWrapper.dataset.min) > 0 ? parseInt(groupWrapper.dataset.min) : 1;
        const checkedElms = groupWrapper.querySelectorAll('input[type=checkbox]:checked');
        const errorMessage = groupWrapper.parentElement.querySelector('.input-error-message');

        if (checkedElms.length < minSelection) {
          isValid = false;
          if (errorMessage) errorMessage.classList.remove('visually-hidden');
          const headerHeight = getComputedStyle(document.documentElement).getPropertyValue('--header-height').trim();
          const headerOffset = parseInt(headerHeight.replace('px', '')) || 0;
          const topOffset = errorMessage.closest('.custom-options').getBoundingClientRect().top + window.pageYOffset - headerOffset;
          window.scrollTo({ top: topOffset, behavior: 'smooth' });

        } else {
          isValid = true;
          if (errorMessage) errorMessage.classList.add('visually-hidden');
        }
      } else {
        isValid = inputElement.checked;
      }

      break;
    case 'file':
      isValid = inputElement.value !== '';
      const dropZone = inputElement.closest('.drop-zone-wrap');
      const errorMessage = dropZone.querySelector('.input-error-message');

      if (dropZone && !isValid) {
        dropZone.classList.add('drop-zone-wrap--error');
        if (errorMessage) {
          errorMessage.textContent = window.variantStrings.fileRequiredError;
          errorMessage.classList.remove('visually-hidden');
          const headerHeight = getComputedStyle(document.documentElement).getPropertyValue('--header-height').trim();
          const headerOffset = parseInt(headerHeight.replace('px', '')) || 0;
          const topOffset = errorMessage.closest('.custom-options').getBoundingClientRect().top + window.pageYOffset - headerOffset;
          window.scrollTo({ top: topOffset, behavior: 'smooth' });
        }
      }

      break;
    default:
      isValid = inputElement.value !== '';

      if ( inputElement.name === 'address[country]' || inputElement.name === 'country') {
        isValid = inputElement.value !== '---';
      }
  }

  if (!isValid) {
    const fieldWrapper = inputElement.parentElement;
    const hasErrorMessage = fieldWrapper.querySelector('.input-error-message');

    if (hasErrorMessage) {
      hasErrorMessage.classList.remove('visually-hidden');
      const headerHeight = getComputedStyle(document.documentElement).getPropertyValue('--header-height').trim();
      const headerOffset = parseInt(headerHeight.replace('px', '')) || 0;
      const topOffset = hasErrorMessage.closest('.custom-options').getBoundingClientRect().top + window.pageYOffset - headerOffset;
      window.scrollTo({ top: topOffset, behavior: 'smooth' });
    }

    inputElement.classList.add('invalid');
    inputElement.setAttribute('aria_invalid', 'true');
    inputElement.setAttribute('aria_describedby', `${inputElement.id}-error`);
  }

  return isValid;
}

function removeErrorStyle (inputElem) {
  const fieldWrapper = inputElem.parentElement;
  const hasErrorMessage = fieldWrapper.querySelector('.input-error-message');


  if (hasErrorMessage) {
    hasErrorMessage.classList.add('visually-hidden');
  }

  inputElem.classList.remove('invalid');
  inputElem.removeAttribute('aria_invalid');
  inputElem.removeAttribute('aria_describedby');
}

class ModalDialog extends HTMLElement {
  static get observedAttributes() { return ['open']; }

  constructor() {
    super();

    this.tpl      = document.getElementById(this.dataset.templateId);
    this.targetSel = this.dataset.target;

    this.overlay = document.body.querySelector('body > .overlay');
    this.originalParent = this.parentElement;

    this.addEventListener('click',  this.#delegateClicks.bind(this));
    this.overlay.addEventListener('click', () => this.hide())
    this.addEventListener('keyup',  e => e.code === 'Escape' && this.hide());
    if (this.classList.contains('media-modal')) {
      this.addEventListener('pointerup', e => {
        if (e.pointerType === 'mouse' &&
            !e.target.closest('deferred-media, product-model'))
          this.hide(e);
      });
    }

    document.addEventListener('shopify:section:load', () => this.hide() );
  }

  attributeChangedCallback(name, _oldVal, newVal) {
    if (name !== 'open') return;

    if (newVal !== null) {                
      if (!this.querySelector('[data-rendered="true"]')) {
        const clone = this.tpl?.content.cloneNode(true);
        clone?.firstElementChild?.setAttribute('data-rendered','true');

        const target = this.targetSel ? this.querySelector(this.targetSel) : this;
        target?.appendChild(clone);
      }
    } else {                             
      setTimeout(() => this.replaceChildren(), 300);
    }
  }

  show(opener) {
    this.openedBy = opener;
    this.overlay?.classList.add('open');

    if (this.parentElement !== document.body) document.body.appendChild(this);

    document.body.classList.add('hidden');
    this.setAttribute('open', '');

    this.querySelector('.modal')?.classList.add('open');
    const closeBtn = this.querySelector('.button-close');
    if (closeBtn) setTimeout(() => trapFocus(closeBtn), 1);
    document.dispatchEvent(new CustomEvent('modal:open'));
  }

  hide() {
    document.body.classList.remove('hidden');
    this.overlay?.classList.remove('open');
    this.removeAttribute('open');
    this.querySelector('.modal')?.classList.remove('open');
    removeTrapFocus(this.openedBy);

    if (this.originalParent && this.parentElement === document.body)
      this.originalParent.appendChild(this);
  }

  #delegateClicks(e) {
    const closeBtn = e.target.closest('[id^="ModalClose-"]');
    if (closeBtn) {
      const slider = closeBtn.closest('.product-media-modal')
                            ?.querySelector('[id^="Slider-"]');
      if (slider) slider.style.scrollBehavior = 'auto';
      this.hide();
      document.dispatchEvent(new CustomEvent('product-modal:close'));
      return;
    }
    if (!this.classList.contains('media-modal') && e.target === this) this.hide();
  }
}
customElements.define('modal-dialog', ModalDialog);

class ModalWindow extends HTMLElement {
    constructor() {
      super();
      this.overlay = document.body.querySelector('body > .overlay')
      this.init()
      if (this.closest('.filters-container')) {
        window.addEventListener('resize', () => {
          this.elements.modal.classList.add('disabled-transition')
          setTimeout(() => this.elements.modal.classList.remove('disabled-transition'), 500)
          if(!this.closest('.drawer-filter')) this.hide()
        })
      }
      document.addEventListener('shopify:section:load', (event) => {
        if (event.target.closest('section') && event.target.closest('section').querySelector('modal-window') && this.closest('body.hidden') && !this.closest('body.quick-view-open')) {
          this.init()
          this.hide(event)
        }
      })

      document.addEventListener('keyup', (event) => {
        if(event.code && event.code.toUpperCase() === 'ESCAPE' && this.elements.modal.className.includes('open')) this.hide()
      });
    }

    init() {
      this.elements = {
        // overlay: this.querySelector('.overlay'),
        modal: this.querySelector('.modal')
      }
      this.classes = {
          hidden: 'hidden',
          open: 'open'
      }

      this.querySelectorAll('[data-modal-toggle]').forEach((button) => {
          button.addEventListener('click', this.show.bind(this));
          if (button.closest('.button-close') || button.closest('.overlay')) button.addEventListener('click', this.hide.bind(this));
      })

      this.overlay?.addEventListener('click', this.hide.bind(this));
      // if (button.closest('.button-close') || button.closest('.overlay')) button.addEventListener('click', this.hide.bind(this))
    }
    
    show(event) {
        if (event) this.setActiveElement(event.target)
        if(!this.elements.modal.closest('localization-form') && !this.elements.modal.closest('.section-menu-dawer')) document.body.classList.add(this.classes.hidden)
        if(this.elements.modal.closest('localization-form')) document.body.classList.add('drawer-is-open')
        this.elements.modal.classList.add(this.classes.open)
        this.overlay?.classList.add(this.classes.open)
        this.elements.modal.setAttribute('tabindex', '-1');
        this.elements.modal.focus();
        setTimeout(() => trapFocus(this.elements.modal, this.elements.modal.querySelector('.button-close')),1)
        if(this.elements.modal.closest('localization-form') && this.querySelector('.localization-search__input')) {
          setTimeout(() => this.querySelector('.localization-search__input').focus(), 300)
        }
        document.dispatchEvent(new CustomEvent('modal:after-show'))
    }
  
    hide(event) {
        if(event && event.target && event.target.closest('a')) event.preventDefault()
        if(!this.elements.modal.closest('localization-form') && !this.elements.modal.closest('.section-menu-dawer')) document.body.classList.remove(this.classes.hidden)
        if(this.elements.modal.closest('localization-form')) document.body.classList.remove('drawer-is-open')
        this.elements.modal.classList.remove(this.classes.open)
        this.overlay?.classList.remove(this.classes.open)
        this.elements.modal.removeAttribute('tabindex');
        removeTrapFocus(this.activeElement);
        document.dispatchEvent(new CustomEvent('modal:after-hide'))
    }

    setActiveElement(element) {
      this.activeElement = element;
    }
}
customElements.define('modal-window', ModalWindow);

class Drawer extends HTMLElement {
  constructor(selector, toggleSelector, openerSelector) {
    super();

    this.selector = selector;
    this.toggleSelector = toggleSelector;
    this.openerSelector = openerSelector;

    document.addEventListener('shopify:section:load', (event) => {
      if (event.target.closest(this.selector) && document.querySelector(`${this.selector} .modal:not(.open)`)) {
        this.init()
        this.alignMenu()
        this.show()
      }
    })
    document.addEventListener('shopify:block:select', (event) => {
      this.init()
    })
    document.addEventListener('shopify:section:select', (event) => {
      if (event.target.closest('.section-menu-drawer') || event.target.closest('.section-store-selector-drawer')) {
        if (Shopify.designMode) {
          document.body.classList.add('disable-scroll-body');
        }
      }
      if (event.target.closest(this.selector)) {
        this.init()
        this.show()
      }
    })

    document.addEventListener('shopify:section:deselect', (event) => {
      if (event.target.closest(this.selector)) {
        this.init()
        this.hide()
      }
    })
    window.addEventListener('resize', this.alignMenu.bind(this))
    document.addEventListener('keyup', (event) => {
        if(event.code && event.code.toUpperCase() === 'ESCAPE' && this.elements.modal.className.includes('open')) {
          this.hide()
        }
    });

    document.querySelector('body > .overlay').addEventListener('click', () => {this.hide()})

    if (!document.querySelector(this.selector)) {
      return;
    }

    this.init()
    this.alignMenu()
  }

  init() {
    this.elements = {
      overlay: document.querySelector('body > .overlay'),
      modal: document.querySelector(`${this.selector} .modal`),
      toggles: document.querySelectorAll(`${this.selector} ${this.toggleSelector}`)
    }
    this.classes = {
        hidden: 'hidden',
        open: 'open'
    }

    document.querySelectorAll(this.toggleSelector).forEach((button) => {
        button.addEventListener('click', this.show.bind(this));

        if (button.closest('.button-close')) {
          button.addEventListener('click', (e) => {
            this.hide();
          })
        } 

        if (button.closest('.overlay')) {
          button.addEventListener('click', (e) => {
            this.hide();
          })
        } 

        button.addEventListener('keydown', (event) => {
          if (event.code.toUpperCase() === 'ENTER') {
            this.setActiveElement(button)
            this.show()
          }
        })
    })

    if (this.querySelector(this.openerSelector)) {
      this.elements.toggles.forEach((button) => {
        button.addEventListener('click', (event) => {
          if (this.elements.modal.classList.contains('open')) {
            this.hide()
          }
        });
      })
    }
  }

  setActiveElement(element) {
    this.activeElement = element;
  }

  alignMenu() {
    if (document.querySelector(`${this.selector} .pinned-block`) && document.querySelector(`${this.selector} .nested-submenu`)) {
      let bottomPadding = document.querySelector(`${this.selector} .pinned-block`).offsetHeight + 16
      if (this.elements.modal) this.elements.modal.setAttribute('style', `--height-pinned-block: ${bottomPadding}px`)
    }
  }
  
  show() {
      document.body.classList.add(this.classes.hidden)
      this.elements.modal.classList.add(this.classes.open)
      this.elements.overlay.classList.add(this.classes.open)
      this.elements.modal.setAttribute('tabindex', '0');
      setTimeout(() => {
        const firstFocusable = this.elements.modal.querySelector(
          'button, a[href], [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable.focus();
        trapFocus(this.elements.modal);
      }, 300);
      document.dispatchEvent(new CustomEvent('modal:after-show', {
        detail: {
          targetTag: this.tagName.toLowerCase()
        }
      }))
  }

  hide() {
      if (Shopify.designMode) {
        document.body.classList.remove('disable-scroll-body');
      }

      document.body.classList.remove(this.classes.hidden)
      this.elements.modal.classList.remove(this.classes.open)
      this.elements.overlay.classList.remove(this.classes.open)
      this.elements.modal.querySelectorAll('[open="true"]').forEach(el => el.setAttribute('open', 'false'))
      this.elements.modal.setAttribute('tabindex', '-1');
      if (this.activeElement) this.activeElement.focus();
      removeTrapFocus();
      document.dispatchEvent(new CustomEvent('modal:after-hide', {
        detail: {
          targetTag: this.tagName.toLowerCase()
        }
      }))
  }
}

class MenuDrawer extends Drawer {
  constructor() {
    super('[id$="__menu-drawer"]', '[data-modal-toggle-menu-dawer]', '.burger-js');
  }

  connectedCallback() {
    this.setEventListeners();
  }

  setEventListeners() {
    document.addEventListener('modal:after-show', (e) => {
      if (e.detail?.targetTag === 'store-selector-drawer' && this.elements.modal.classList.contains('open')) {
        this.hide();
      }
    });
  }
}
customElements.define('menu-drawer', MenuDrawer);

class StoreSelectorDrawer extends Drawer {
  constructor() {
    super('.section-store-selector-drawer', '[data-modal-toggle-store-selector-drawer]', '.store-selector');
  }

  connectedCallback() {
    this.init();
  }

  init() {
    super.init();
    
    this.changeStoreButton = document.querySelector('.store-selector-drawer .change-store-button');
    
    if (!this.changeStoreButton) {
      return;
    }
    
    this.storeCheckboxes = document.querySelectorAll('.store-selector-drawer .store-accordion__checkbox');
    this.currentStore = Array.from(this.storeCheckboxes).find(cb => cb.checked)?.value;

    if (!this.currentStore) {
      this.resetSavedStore();
    }

    this.toggleChangeButtonState();
    this.setEventListeners();
  }

  async resetSavedStore() {
    try {
      await this.updateCartAttribute("store", '');

      const storeSelectorText = this.querySelector('.store-selector__text');
      if (storeSelectorText) {
        storeSelectorText.innerHTML = storeSelectorText.dataset.placeholder;
      }

      const pickUpAvailabilities= document.querySelectorAll('.pickup-availability');
      pickUpAvailabilities.forEach(pickUpAvailability => {
        pickUpAvailability.classList.remove('pickup-availability--available');
        pickUpAvailability.classList.add('pickup-availability--unavailable');

        const text = pickUpAvailability.querySelector('.pickup-availability__text');
        text.innerHTML = text.dataset.placeholder;
      })     
    } catch (error) {
      console.error("Error updating store cart attribute:", error);
    }
  }

  toggleChangeButtonState() {
    const hasChecked = Array.from(this.storeCheckboxes).some(checkbox => checkbox.checked);
    this.changeStoreButton.disabled = !hasChecked;
  }

  setEventListeners() {
    this.storeCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => this.handleCheckboxChange(checkbox));
    });

    this.changeStoreButton.addEventListener('click', () => this.handleChangeStore());

    document.addEventListener('modal:after-hide', (e) => {
      if (e.detail?.targetTag === 'store-selector-drawer') {
        this.restoreCheckedState();
      }
    });

    document.addEventListener('shopify:section:unload', (event) => {
      if (event.target.closest('.section-store-selector-drawer')) {
        this.resetSavedStore();
      }
    })
  }

  handleCheckboxChange(changedCheckbox) {
    if (changedCheckbox.checked) {
      this.storeCheckboxes.forEach((checkbox) => {
        if (checkbox !== changedCheckbox) {
          checkbox.checked = false;
          checkbox.removeAttribute('checked');
        }
      });

      changedCheckbox.setAttribute('checked', 'checked');
      this.changeStoreButton.disabled = false;
    } else {
      changedCheckbox.checked = true;
      changedCheckbox.setAttribute('checked', 'checked');
    }
  }

  async handleChangeStore() {
    const selectedCheckbox = Array.from(this.storeCheckboxes).find(cb => cb.checked);
    if (!selectedCheckbox) return;

    const storeName = selectedCheckbox.value;

    if (storeName === this.currentStore) {
      this.hide();
      return;
    }

    let loader;
    try {
      loader = this.changeStoreButton.querySelector('.change-store-button__loader');
      if (loader) loader.classList.remove('hidden');

      await this.updateCartAttribute("store", storeName);   
      window.location.reload();
    } catch (error) {
      if (loader) loader.classList.add('hidden');
      console.error("Error updating store cart attribute:", error);
    } 
  }

  restoreCheckedState() {
    this.storeCheckboxes.forEach((checkbox) => {
      const isMatch = checkbox.value === this.currentStore;
      checkbox.checked = isMatch;
      checkbox.toggleAttribute('checked', isMatch);
    });

    this.toggleChangeButtonState();
  }

  async updateCartAttribute(attribute, value) {
    return fetch("/cart/update.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attributes: { [attribute]: value } }),
    });
  }
}

customElements.define('store-selector-drawer', StoreSelectorDrawer);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    this.button = this.querySelector('.button--modal-opener');
    this.posX1 
    this.posInit 
    this.posX2
    this.posY1
    this.posY2 
    this.posInitY
    if (this.classList.contains('zoom-disabled')) return
    if (!this.button) return;
    this.button.addEventListener('mousedown', this.mouseDown.bind(this))
    this.button.addEventListener('mousemove', this.mouseMove.bind(this))
    this.button.addEventListener('mouseup', this.mouseUp.bind(this))
    document.addEventListener('shopify:section:load', () => {
      this.button = this.querySelector('.button--modal-opener');
    })
    this.button.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'ENTER') this.mouseUp()
    })
  }

  getEvent (event) {
    return event.type.search('touch') !== -1 ? event.touches[0] : event;
  }

  mouseDown(event) {
    let evt = this.getEvent(event);
    this.posInit = this.posX1 = evt.clientX;
    this.posInitY = this.posY1 = evt.clientY
  }

  mouseMove() {
    let evt = this.getEvent(event)
    this.posX2 = this.posX1 - evt.clientX;
    this.posX1 = evt.clientX;
    this.posY2 = this.posY1 - evt.clientY;
    this.posY1 = evt.clientY;
  }

  mouseUp(event) {
    if ((Math.abs(this.posInit - this.posX1) - Math.abs(this.posInitY - this.posY1) > 5)) return
    const modal = document.querySelector(this.getAttribute('data-modal'));
    if (modal && event.target.closest('.icons_with_text__description') && event.target.closest('a')) return
    if (modal) modal.show(this.button);
  }
}
customElements.define('modal-opener', ModalOpener);

class Breadcrumbs extends HTMLElement {
  constructor() {
    super();

    this.template = this.dataset.currentTemplate
    if (this.template != 'product' && this.template != 'collection') return
    this.cookieName = 'mrk-theme:active-category'
    this.cookieUrl = 'mrk-theme:active-category-url'
    this.storageItem = this.querySelector('.breadcrumbs__item--storage')
    this.metafieldItem = this.querySelector('.breadcrumbs__item--metafield')
    this.menuItems = document.querySelectorAll('.menu__list a')
    this.collectionItem = this.querySelector('.breadcrumbs__item--collection')
    if (this.metafieldItem && this.metafieldItem.dataset.tags) this.tagItems = this.metafieldItem.dataset.tags.split(',')

    this.setMetafieldLink()
    this.setStorageCategory()

    document.addEventListener('shopify:section-load', () => {
      this.setMetafieldLink()
    })
  }

  setMetafieldLink() {
    this.menuItems.forEach(menuItem => {
      let dataTitle = menuItem.dataset.title
      if (dataTitle) dataTitle.toLowerCase()
      if (this.metafieldItem && this.metafieldItem.querySelector('a').innerHTML == dataTitle) this.metafieldItem.querySelector('a').setAttribute('href', `${menuItem.href}`)
      if (this.tagItems && this.tagItems.length > 0) {
        this.tagItems.forEach(tagItem => {
          if (dataTitle && tagItem == dataTitle.toLowerCase()) {
            this.metafieldItem.querySelector('a').setAttribute('href', `${menuItem.href}`)
            this.metafieldItem.querySelector('a').innerHTML = dataTitle
            setTimeout( () => {
              if (this.collectionItem && this.collectionItem.querySelector('a').innerHTML == this.metafieldItem.querySelector('a').innerHTML) this.collectionItem.style.display = 'none'
            }, 10)
          }
        })
      }
    })
  }

  setStorageCategory() {
    if (isStorageSupported('local')) {
      const activeCategory = window.localStorage.getItem(this.cookieName)
      const activeCategoryUrl = window.localStorage.getItem(this.cookieUrl)
      if (this.storageItem && activeCategory && activeCategoryUrl) {
        this.storageItem.querySelector('a').setAttribute('href', `${activeCategoryUrl}`)
        this.storageItem.querySelector('a').innerHTML = `${activeCategory}`
        if (this.collectionItem && this.collectionItem.querySelector('a').innerHTML == activeCategory) this.collectionItem.style.display = 'none'
      }
    }
  }
}

customElements.define('breadcrumbs-component', Breadcrumbs);

class AccordionToggle extends HTMLElement {
  constructor() {
    super();
    
    theme.initWhenVisible({
      element: this,
      callback: this.init.bind(this),
      threshold: 0
    });
  }

  init() {
    this.toggle = this.querySelector('.accordion-toggle')
    this.panel = this.querySelector('.accordion__panel')
    this.toggles = document.querySelectorAll('.accordion-toggle')
    this.links = this.panel.querySelectorAll('a')
    this.textareas = this.panel.querySelectorAll('textarea')
    this.inputs = this.panel.querySelectorAll('input')
    this.selects = this.panel.querySelectorAll('select')
    this.buttons = this.panel.querySelectorAll('button')
    this.arrayOpenCollapsible = []

    if (!this.toggle.classList.contains('is-open')) this.blurElements()

    this.toggle.querySelector('.accordion__summary > input[type="checkbox"]') ? this.toggle = this.querySelector('.accordion__summary > input[type="checkbox"]') : this.toggle = this.querySelector('.accordion-toggle')
    this.toggle.addEventListener('click', this.toggleAccordion.bind(this, event))

    if(this.closest('.filter-form--horizontal')) {
      if(window.innerWidth > 768 && this.toggle.className.includes('open_collapsible')) {
        this.arrayOpenCollapsible.push(this.toggle)
        this.toggle.classList.remove('open_collapsible', 'is-open')
      }
      document.addEventListener('click', (event) => {
        if(window.innerWidth > 768) {
          this.toggles.forEach(toggle => {
            if(toggle.classList.contains('is-open') && (event.target.closest('.accordion-toggle') != toggle || event.target.closest('.facets__save') || event.target.closest('.facets__reset'))) {
              if(event.target.closest('.facets__reset') && event.target.closest('.accordion__panel').querySelectorAll('[checked]').size == 0) event.preventDefault()
              toggle.classList.remove('is-open')
              toggle.querySelector('.accordion__panel').style.maxHeight = 0
              this.blurElements()
            }
          })
        }
      })
    }

    if(this.toggle.classList.contains('js-filter')) {
      if((!this.closest('.filter-form--horizontal') || window.innerWidth < 769) && this.toggle.className.includes('open_collapsible')) {
        this.panel.style.maxHeight = this.panel.scrollHeight + "px"
        this.focusElements()
      }
      document.addEventListener('filters:rerendered', ()=> {
        if(this.closest('.filter-form--horizontal') && window.innerWidth > 768) return
        let filters = this.querySelectorAll('.accordion-toggle')
        filters.forEach((filter) => {
          this.panel = filter.querySelector('.accordion__panel')
          this.panel.style.transitionDuration = '0s'
          !filter.classList.contains('is-open') ? this.panel.style.maxHeight = null : this.panel.style.maxHeight = this.panel.scrollHeight + "px"
          filter.classList.contains('is-open') ? this.focusElements(filter) : this.blurElements(filter)
          setTimeout(() => {this.panel.style.transitionDuration = '0.3s'})
        })
      })
    }

    this.toggle.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'ENTER') {
        this.panel = this.querySelector('.accordion__panel')
        if(this.closest('.filter-form--horizontal') && window.innerWidth > 768) {
          let facets = this.closest('.filter-form--horizontal')
          facets.querySelectorAll('.accordion-toggle').forEach(item => {
            if(item.classList.contains('is-open') && event.target.closest('.accordion-toggle') != item) item.classList.remove('is-open')
          })
        }
        if (event.target.closest('.accordion__panel')) return
        
        this.toggle.classList.toggle('is-open')
        if(this.closest('.filter-form--horizontal') && window.innerWidth > 768) return
        this.panelHeight = this.panel.scrollHeight + "px"
        this.panel.style.setProperty('--max-height', `${this.panelHeight}`)
        !this.toggle.classList.contains('is-open') ? this.panel.style.maxHeight = null : this.panel.style.maxHeight = this.panelHeight
      }
      if (event.code.toUpperCase() === 'ESCAPE') {
        this.toggle.classList.remove('is-open')
        this.panel.style.maxHeight = null
      }
      this.toggle.classList.contains('is-open') ? this.focusElements() : this.blurElements()
    })

    this.querySelectorAll('.store-accordion__toggle-area').forEach(toggle => {
      toggle.addEventListener('click', (event) => {
        const checkbox = toggle.querySelector('.store-accordion__checkbox');

        if (event.target === checkbox) return;

        if (!checkbox.checked) {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });

    window.addEventListener('resize', this.actionHorizontalFilters.bind(this))
  }

  actionHorizontalFilters() {
    if(this.closest('.filter-form--horizontal') && window.innerWidth > 768) {
      if(this.toggle.className.includes('open_collapsible')) this.toggle.classList.remove('open_collapsible')
      this.toggles.forEach(toggle => {
        if(toggle.classList.contains('is-open')) {
          toggle.classList.remove('is-open')
          toggle.querySelector('.accordion__panel').style.maxHeight = 0
          this.blurElements()
        }
      })
    }
    if(this.closest('.filter-form--horizontal') && window.innerWidth < 769 && this.arrayOpenCollapsible.length > 0) {
      this.arrayOpenCollapsible.forEach(item => {
        item.classList.add('open_collapsible', 'is-open')
        item.querySelector('.accordion__panel').style.maxHeight = this.panel.scrollHeight + "px"
      })
    }
  }

  toggleAccordion() {
    if (this.closest('.store-accordion') && !event.target.closest('.icon-accordion')) {
      return;
    }

    if (event.target.closest('.accordion__panel')) return

    !this.toggle.classList.contains('is-open') ? this.toggle.classList.add('is-open') : this.toggle.classList.remove('is-open')
    if(this.closest('.filter-form--horizontal') && window.innerWidth > 768) return
    this.panel = this.querySelector('.accordion__panel')
    !this.toggle.classList.contains('is-open') ? this.panel.style.maxHeight = null : this.panel.style.maxHeight = this.panel.scrollHeight + 1 + "px"
    this.toggle.classList.contains('is-open') ? this.focusElements() : this.blurElements()
  }

  blurElements(rerender = false) {
    if (rerender) {
      this.links = rerender.querySelectorAll('a')
      this.textareas = rerender.querySelectorAll('textarea')
      this.inputs = rerender.querySelectorAll('input')
      this.selects = rerender.querySelectorAll('select')
      this.buttons = rerender.querySelectorAll('button')
    }
    this.links.forEach(link => link.setAttribute('tabindex', '-1'))
    this.textareas.forEach(textarea => textarea.setAttribute('tabindex', '-1'))
    this.inputs.forEach(input => input.setAttribute('tabindex', '-1'))
    this.selects.forEach(select => select.setAttribute('tabindex', '-1'))
    this.buttons.forEach(button => button.setAttribute('tabindex', '-1'))
  }
  focusElements() {
    this.links.forEach(link => link.setAttribute('tabindex', '0'))
    this.textareas.forEach(textarea => textarea.setAttribute('tabindex', '0'))
    this.inputs.forEach(input => input.setAttribute('tabindex', '0'))
    this.selects.forEach(select => select.setAttribute('tabindex', '0'))
    this.buttons.forEach(button => button.setAttribute('tabindex', '0'))
  }
}
customElements.define('accordion-toggle', AccordionToggle);

class FormState extends HTMLElement {
  constructor() {
    super();

    this.formInputs = this.querySelectorAll('input.required, select[required]');
    this.form = this.querySelector('form');
    if (this.form) this.buttonSubmit = this.form.querySelector('button[type="submit"]') || this.form.querySelector('.button--submit');

    this.formInputs.forEach((input) => {
      input.addEventListener('input', this.onInputChange.bind(this));
    });
    if (this.buttonSubmit) this.buttonSubmit.addEventListener('click', this.onSubmitHandler.bind(this));
  }

  onInputChange(event) {
    if(event.target.closest('.invalid')) event.target.classList.remove('invalid');
    event.target.classList.add('valid');
  }

  onSubmitHandler() {
    let formIsValid = true;
    if (!this.form.checkValidity()) {
      this.form.reportValidity();
    }

    this.formInputs.forEach((input) => {
      if (input.hasAttribute('type')) {
        const inputType = input.getAttribute('type');

        if (inputType === 'password' || inputType === 'text') {
          input.value.trim().length === 0 ? this.invalidInput(input) : this.validInput(input)
        }

        if (inputType === 'email') {
          if (!this.isValidEmail(input.value)) {
            this.invalidInput(input);
            formIsValid = false;
            if (this.querySelector('.email-no-valid')) this.querySelector('.email-no-valid').classList.remove('visually-hidden');
          } else {
            this.validInput(input);
            formIsValid = true
            if (this.querySelector('.email-no-valid')) this.querySelector('.email-no-valid').classList.add('visually-hidden');
          }
        }
      } else {
        input.value === input.dataset.empty ? this.invalidInput(input) : this.validInput(input)
      }
    });

    if (!formIsValid) {
      event.preventDefault();
    }
  }

  isValidEmail(email) {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email.trim());
  }

  invalidInput(input) {
    if(input.closest('.valid')) input.classList.remove('valid');
    input.classList.add('invalid');
  }
  validInput(input) {
    if(input.closest('.invalid')) input.classList.remove('invalid');
    input.classList.add('valid');
  }
}
customElements.define('form-state', FormState);  

class ColorSwatch extends HTMLElement {
  constructor() {
    super();

    this.cached = {};
    this.variantId = this.dataset.variantId;
    this.colorsContainer = this.closest('.card__colors')
    this.tooltip = this.querySelector('.color-swatch__title')
    this.productCard = this.closest('.card')
    this.quickViewButton = this.closest('.card-product').querySelector('.quick-view')
    this.image = this.productCard.querySelector('.card__product-image img');
    this.secondImage = this.productCard.querySelector('.card__image--second')
    this.productHref = this.productCard.href
    if(this.image) {
      this.imageSrc = this.image.src
      this.imageSrcset = this.image.srcset
    }
    if (this.secondImage) {
      this.secondImageSrc = this.secondImage.src
      this.secondImageSrcset = this.secondImage.srcset
    }
    this.addEventListener('click', (event) => {
      event.preventDefault()
      if (this.productCard.querySelector('.swiper-wrapper')) {
        this.updateSlider()
      } else {
        this.onClickHandler()
      }
      if (event.target.closest('a')) return false
    });
    this.closest('.color-swatch').addEventListener('mouseenter', () => {this.alignSwatches()}) 
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ENTER') {
        event.preventDefault()
        if (this.productCard.querySelector('.swiper-wrapper')) {
          this.updateSlider()
        } else {
          this.onClickHandler()
        }
        if (event.target.closest('a')) return false
      }
    });
  }

  onClickHandler() {
    if (this.productCard.querySelector('.swiper-wrapper')) {
      this.activeColorSwatch()
      this.updateURL()
      this.updateSlider()
      if(this.closest('.show-selected-value')) this.colorSwatchFetch()
    }
    if(this.closest('.active-swatch')) {
      this.classList.remove('active-swatch');
      this.productCard.href = this.productHref
      
      if (this.image !== null && !this.image.classList.contains('card__image-placeholder')) {
        this.image.src = this.imageSrc;
        this.image.srcset = this.imageSrcset;
      }
      if (this.secondImage != null && this.secondImageSrc) {
        this.secondImage.src = this.secondImageSrc;
        this.secondImage.srcset = this.secondImageSrcset;
      }
      return
    }

    this.activeColorSwatch()
    this.updateURL()
    if (this.image !== null && !this.image.classList.contains('card__image-placeholder')) {
      this.image.src = this.dataset.src;
      this.image.srcset = this.dataset.srcset;
    }
    if (this.secondImage != null && this.dataset.srcSecond) {
      this.secondImage.src = this.dataset.srcSecond;
      this.secondImage.srcset = this.dataset.srcsetSecond;
    }
    if (this.closest('.show-selected-value')) this.colorSwatchFetch()
  }

  updateSlider() {
    let currentAlt = `(${this.dataset.colorName})`;

    if (this.closest('.active-swatch')) {
      this.classList.remove('active-swatch');
      this.productCard.href = this.productHref
      currentAlt = 'all'
    } else {
      this.activeColorSwatch()
    }

    this.updateURL()
    if(this.image.classList.contains('card__image-placeholder')) {
      if (this.closest('.show-selected-value')) this.colorSwatchFetch()
      return
    }
    this.currentIndex = this.dataset.currentImgIndex

    this.productCard.querySelector('.swiper-product-card').dispatchEvent(new CustomEvent('swiper:update', {
      detail: {
        currentAlt: currentAlt,
        index: this.currentIndex
      }
    }));

    if (this.closest('.show-selected-value')) this.colorSwatchFetch()
  }

  colorSwatchFetch() {
    this.productHandle = this.dataset.productHandle;
    this.productUrl = this.dataset.productUrl.split('?')[2]
    if(this.productUrl && this.productHandle != this.productUrl) this.productHandle = this.productUrl
    const collectionHandle = this.dataset.collectionHandle;
    let sectionUrl = `${window.routes.root_url}/products/${this.productHandle}?variant=${this.variantId}&view=card`;

    if (collectionHandle.length > 0) {
      sectionUrl = `${window.routes.root_url}/collections/${collectionHandle}/products/${this.productHandle}?variant=${this.variantId}&view=card`;
    }

    // remove double `/` in case shop might have /en or language in URL
    sectionUrl = sectionUrl.replace('//', '/');

    if (this.cached[sectionUrl]) {
      this.renderProductInfo(this.cached[sectionUrl]);
      return;
    }

    fetch(sectionUrl)
      .then(response => response.text())
      .then(responseText => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        this.cached[sectionUrl] = html;
        this.renderProductInfo(html);
      })
      .catch(e => {
        console.error(e);
      });
  }

  renderProductInfo(html) {
    this.updatePrice(html)
    this.updateSize(html);
    this.updateBadge(html);
    this.updateTitle(html);
  }

  updatePrice(html) {
    const selector = '.price';
    const destination = this.productCard.querySelector(selector);
    const source = html.querySelector('main').querySelector(selector);

    if (source && destination) destination.innerHTML = source.innerHTML;
  }

  updateSize(html) {
    const selector = '.card__sizes';
    const destination = this.productCard.querySelector(selector);
    const source = html.querySelector('main').querySelector(selector);
    if (source && destination) destination.innerHTML = source.innerHTML;
  }

  updateBadge(html) {
    const selector = '.card__badges';
    const destination = this.productCard.querySelector(selector);
    const source = html.querySelector('main').querySelector(selector);
    if (source && destination) destination.innerHTML = source.innerHTML;
  }

  updateTitle(html) {
    const selector = '.card__title-js';
    const destination = this.productCard.querySelector(selector);
    const source = html.querySelector('main').querySelector(selector);
    const name_characters = destination.closest('.card-product__title').dataset.nameCharacters

    let source_innerHTML
    if (source) source_innerHTML = source.innerHTML
    if (name_characters && source.innerHTML.trim().length > name_characters) source_innerHTML = source.innerHTML.trim().slice(0, name_characters) + '...'
    if (source && destination) destination.innerHTML = source_innerHTML;
  }

  activeColorSwatch() {
    const swatches = this.colorsContainer.querySelectorAll('.color-swatch');
    swatches.forEach((swatch) => {
      swatch.classList.remove('active-swatch');
    });
    this.classList.add('active-swatch');
  }

  updateURL() {
    const activeSwatch = this.colorsContainer.querySelector('.active-swatch')
    if(!activeSwatch) return
    const activeVariantURL = activeSwatch.querySelector('.color-swatch__link').getAttribute('href')
    this.productCard.setAttribute('href', activeVariantURL)
    if (this.quickViewButton) this.quickViewButton.dataset.productUrl = activeVariantURL
    if (this.closest('.collection__grid-container') && this.closest('.card-product').querySelector('.quick-view-button')) this.closest('.card-product').querySelector('quick-view-button').dataset.productUrl = activeVariantURL
  }

  alignSwatches() {
    this.tooltip.closest('.slider__viewport') ? this.cardViewport = this.tooltip.closest('.slider__viewport') : this.cardViewport = this.tooltip.closest('.section')
    this.tooltip.removeAttribute('style')

    const overflowsViewport = theme.config.isRTL 
      ? this.cardViewport && this.cardViewport.getBoundingClientRect().right < this.tooltip.getBoundingClientRect().right
      : this.cardViewport && this.cardViewport.getBoundingClientRect().left >= this.tooltip.getBoundingClientRect().left;

    if (overflowsViewport) {
      const tooltipShift = theme.config.isRTL 
        ? Math.abs(this.tooltip.getBoundingClientRect().right - this.cardViewport.getBoundingClientRect().right) * -1
        : Math.abs(this.tooltip.getBoundingClientRect().left - this.cardViewport.getBoundingClientRect().left);

      this.tooltip.setAttribute('style', `right: calc(50% - ${tooltipShift}px);`)
    }
  }
}
customElements.define('color-swatch', ColorSwatch);

class VideoSection extends HTMLElement {
  constructor() {
    super();
    this.overlay = document.body.querySelector('body > .overlay')
    this.init();
  }

  init() {
    this.popup = this.closest('modal-window') || this.closest('modal-dialog')
    if(this.popup) {
      this.buttonClose = this.popup.querySelector('.close-popup')
      
      this.openPopup = this.popup.querySelector('.open-popup')
      if(!this.openPopup) {
        this.modalId = this.popup.id
        this.openPopup = document.querySelector(`[data-modal="#${this.modalId}"]`).querySelector('.button--modal-opener')
      }
      this.buttonClose.addEventListener('click', () => { 
        if(this.player && this.dataset.type == 'youtube') {
          this.player.pauseVideo()
        } else if (this.player) {
          this.player.pause()
        }
      })
      this.buttonClose.addEventListener('keydown', (event) => { 
        if (event.code.toUpperCase() === 'ENTER') {
          if(this.player && this.dataset.type == 'youtube') {
            this.player.pauseVideo()
          } else if (this.player) {
            this.player.pause()
          }
        }
      })
      this.overlay.addEventListener('click', () => {
        if(this.player && this.dataset.type == 'youtube') {
          this.player.pauseVideo()
        } else if (this.player) {
          this.player.pause()
        }
      })
      this.openPopup.addEventListener('click', () => {
        if(this.player && this.dataset.type == 'youtube') {
          this.player.playVideo()
        } else if (this.player) {
          this.player.play()
        }
      })
      this.openPopup.addEventListener('keydown', (event) => {
        if (event.code.toUpperCase() === 'ENTER') {
          if(this.player && this.dataset.type == 'youtube') {
            this.player.playVideo()
          } else if (this.player) {
            this.player.play()
          }
        }
      });
      document.addEventListener('keydown', (event) => {
        if (event.code.toUpperCase() === 'ESCAPE' && this.player) {
          if(this.player && this.dataset.type == 'youtube') {
            this.player.pauseVideo()
          } else if (this.player) {
            this.player.pause()
          }
        }
      })
    }

    this.parentSelector = this.dataset.parent || '.deferred-media';
    this.parent = this.closest(this.parentSelector);
    if(!this.parent) this.parent = this.closest('.popup-video').querySelector(this.parentSelector)

    switch(this.dataset.type) {
      case 'youtube':
        this.initYoutubeVideo();
        break;

      case 'vimeo':
        this.initVimeoVideo();
        break;

      case 'mp4':
        this.initMp4Video();
        break;
    }
  }

  initYoutubeVideo() {
    this.loadScript('youtube').then(this.setupYoutubePlayer.bind(this));
  }

  initVimeoVideo() {
    this.loadScript('vimeo').then(this.setupVimeoPlayer.bind(this));
  }

  initMp4Video() {
    const player = this.querySelector('video');

    if (player) {
      const promise = player.play();

      // Edge does not return a promise (video still plays)
      if (typeof promise !== 'undefined') {
        promise.then(function() {
          // playback normal
        }).catch(function() {
          player.setAttribute('controls', '');
        });
      }
    }
  }

  loadScript(videoType) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      document.body.appendChild(script);
      script.onload = resolve;
      script.onerror = reject;
      script.async = true;
      script.src = videoType === 'youtube' ? 'https://www.youtube.com/iframe_api' : '//player.vimeo.com/api/player.js';
    });
  }

  setAsLoaded() {
    this.parent.setAttribute('loaded', true);
  }

  setupYoutubePlayer() {
    const videoId = this.dataset.videoId;
    
    const playerInterval = setInterval(() => {
      if (window.YT) {
        window.YT.ready(() => {
          const element = document.createElement('div');
          this.appendChild(element);

          this.player = new YT.Player(element, {
            videoId: videoId,
            playerVars: {
              showinfo: 0,
              controls: !this.background,
              fs: !this.background,
              rel: 0,
              height: '100%',
              width: '100%',
              iv_load_policy: 3,
              html5: 1,
              loop: 1,
              playsinline: 1,
              modestbranding: 1,
              disablekb: 1
            },
            events: {
              onReady: this.onYoutubeReady.bind(this),
              onStateChange: this.onYoutubeStateChange.bind(this)
            }
          });
          clearInterval(playerInterval);
        });
      }
    }, 50);
  }

  onYoutubeReady() {
    this.iframe = this.querySelector('iframe'); // iframe once YT loads
    this.iframe.classList.add('js-youtube')
    this.iframe.setAttribute('tabindex', '-1');

    if(theme.config.isTouch) this.player.mute();
    if(this.closest('.video-button-block')) {
      this.youtubePause()
      return
    } 
    if (typeof this.player.playVideo === 'function') this.player.playVideo();

    this.setAsLoaded();

    // pause when out of view
    const observer = new IntersectionObserver((entries, _observer) => {
      entries.forEach(entry => {
        entry.isIntersecting ? this.youtubePlay() : this.youtubePause();
      });
    }, {rootMargin: '0px 0px 50px 0px'});

    observer.observe(this.iframe);
  }

  onYoutubeStateChange(event) {
    switch (event.data) {
      case -1: // unstarted
        // Handle low power state on iOS by checking if
        // video is reset to unplayed after attempting to buffer
        if (this.attemptedToPlay) {
          this.setAsLoaded();
        }
        break;
      case 0: // ended, loop it
        this.youtubePlay();
        break;
      case 1: // playing
        this.setAsLoaded();
        break;
      case 3: // buffering
        this.attemptedToPlay = true;
        break;
    }
  }

  youtubePlay() {
    if (this.background && this.player && typeof this.player.playVideo === 'function') {
      this.player.playVideo();
    }
  }

  youtubePause() {
    if (this.background && this.player && typeof this.player.pauseVideo === 'function') {
      this.player.pauseVideo();
    }
  }

  setupVimeoPlayer() {
    const videoId = this.dataset.videoId;

    const playerInterval = setInterval(() => {
      if (window.Vimeo) {
        this.player = new Vimeo.Player(this, {
          id: videoId,
          autoplay: true,
          autopause: false,
          background: this.background,
          controls: !this.background,
          loop: true,
          height: '100%',
          width: '100%'
        });
        this.player.ready().then(this.onVimeoReady.bind(this));

        clearInterval(playerInterval);
      }
    }, 50);
  }

  onVimeoReady() {
    this.iframe = this.querySelector('iframe');
    this.iframe.classList.add('js-vimeo')
    this.iframe.setAttribute('tabindex', '-1');

    if(theme.config.isTouch) this.player.setMuted(true);
    if(this.closest('.video-button-block')) {
      this.vimeoPause();
      return
    } 
    this.setAsLoaded();

    // pause when out of view
    const observer = new IntersectionObserver((entries, _observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.vimeoPlay();
        } else {
          this.vimeoPause();
        }
      });
    }, {rootMargin: '0px 0px 50px 0px'});

    observer.observe(this.iframe);
  }

  vimeoPlay() {
    if (this.background && this.player && typeof this.player.play === 'function') {
      this.player.play();
    }
  }

  vimeoPause() {
    if (this.background && this.player && typeof this.player.pause === 'function') {
      this.player.pause();
    }
  }
  
}
customElements.define('video-section', VideoSection);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();

    if (this.closest('modal-dialog')) {
      this.init()
    } else {
      theme.initWhenVisible({
        element: this,
        callback: this.init.bind(this),
        threshold: 600
      });
    }
  }

  init() {
    this.poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (this.closest('modal-dialog')) {
      this.modalId = this.closest('modal-dialog').id
      this.poster = this.closest('.video-button-block').querySelector('[id^="Deferred-Poster-"]')
    }
    if (!this.poster) return;
    this.popupVideo = this.querySelector('.popup-video') || this.closest('.popup-video')
    this.enableAutoplay = this.dataset.enableAutoplay === "true";
    this.mediaVisibilityWhenScrollByInMs = 300;
    this.poster.addEventListener('click', this.actionDefferedMedia.bind(this)); 
    this.poster.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'ENTER') this.actionDefferedMedia.bind(this);
    });

    if (this.enableAutoplay) {
      this.autoplayMediaWhenFirstVisible();
    }
  }

  getObserverOptions(targetElement) {
    const isMediaTwiceLargerThanScreen = targetElement.offsetHeight / 2 > window.innerHeight;

    const observerOptions = isMediaTwiceLargerThanScreen
    ? { rootMargin: `-${window.innerHeight / 2}px 0px -${window.innerHeight / 2}px 0px` }
    : { threshold: 0.5 };

    return observerOptions;
  }

  autoplayMediaWhenFirstVisible() {
    const mediaWrapper = this.closest('.product__media-item') || this.closest('.global-media-settings');
 
    if (!mediaWrapper) return;
  
    const observer = new IntersectionObserver((entries, observerInstance) => {
      entries.forEach(entry => {
        const isVisible = entry.isIntersecting;
        const element = entry.target;
  
        if (isVisible) {
          if (!element.intersectTimeout) {
            // Set a timeout to ensure the element remains visible for 500ms before triggering
            element.intersectTimeout = setTimeout(() => {
              if (!element.dataset.intersected) {
                element.dataset.intersected = 'true';
                this.triggerPosterEvents();
                observerInstance.unobserve(mediaWrapper); // Stop observing after the first interaction
              }
            }, 500);
          }
        } else {
          // Clear timeout if the element is no longer visible
          if (element.intersectTimeout) {
            clearTimeout(element.intersectTimeout);
            element.intersectTimeout = null;
          }
        }
      });
    }, this.getObserverOptions(mediaWrapper));
  
    observer.observe(mediaWrapper);
  }
  
  triggerPosterEvents() {
    if (!this.poster) return;
  
    const events = [
      new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      new MouseEvent('mousemove', { bubbles: true, cancelable: true }),
      new MouseEvent('click', { bubbles: true, cancelable: true }),
      new MouseEvent('mouseup', { bubbles: true, cancelable: true }),
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, code: 'Enter' }),
    ];
  
    events.forEach(event => this.poster.dispatchEvent(event));
  }

  setPauseMediaWhenNotVisible(media, mediaWrapperToObserve) {
    const observer = new IntersectionObserver((entries, _observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          media.dataset.visible = true;
        } else if (media.dataset.visible) {         
          window.pauseMedia(media);

          media.dataset.visible = false;
        }
      });
    }, this.getObserverOptions(mediaWrapperToObserve || media));  

    observer.observe(mediaWrapperToObserve || media);
  }

  observeMediaVisibility(media, mediaWrapperToObserve) {
    media.dataset.visible = true;

    const observer = new IntersectionObserver((entries, _observer) => {
      entries.forEach(entry => {
        const element = entry.target;

        if (entry.isIntersecting) {
          if (!element.intersectTimeout) {
            element.intersectTimeout = setTimeout(() => {
              window.playMedia(media, this.enableAutoplay);

              media.dataset.visible = true;
            }, this.mediaVisibilityWhenScrollByInMs); 
          }
        } else {   
          if (element.intersectTimeout) {
            clearTimeout(element.intersectTimeout);
            element.intersectTimeout = null;
          }

          if (media.dataset.visible) {     
            window.pauseMedia(media, this.enableAutoplay);

            media.dataset.visible = false;
          }
        }
      });
    }, this.getObserverOptions(mediaWrapperToObserve || media));  

    observer.observe(mediaWrapperToObserve || media);
  }

  loadContent(focus = true) {
    const isProductOverviewSection = !!this.closest('.product-overview-section') || !!this.closest('.product-media-modal');

    if (!isProductOverviewSection) {
      window.pauseAllMedia(); 
    }
    let thisVideo = this.querySelector('video')
    if(thisVideo && thisVideo.dataset.videoPlay == 'true') {
      thisVideo.dataset.videoPlay = false
      return
    }
    if(thisVideo && thisVideo.dataset.videoPlay == 'false') {
      thisVideo.play()
      thisVideo.dataset.videoPlay = true
    }
    if(this.getAttribute('loaded')) return
    if(this.querySelector('.template-video')) return
    const content = document.createElement('div');
    content.classList.add('template-video')
    const template = this.querySelector('template');
    const media = template.content.firstElementChild.cloneNode(true)
    content.appendChild(media);
    if (content.querySelector('video-section')) {
      this.popupVideo ? this.popupVideo.appendChild(content).focus() : this.appendChild(content).focus();
    } else {
      this.setAttribute('loaded', true);
      const deferredElement = this.appendChild(content.querySelector('video, model-viewer, iframe'));
      if (focus) deferredElement.focus();
    }
    thisVideo = this.querySelector('video')
    if(thisVideo) {
      thisVideo.play();
      thisVideo.dataset.videoPlay = true
    }

    if (isProductOverviewSection && media) {
      const mediaWrapper = template.closest('.product__media-item') || template.closest('.global-media-settings');

      if (this.enableAutoplay) {
        this.observeMediaVisibility(media, mediaWrapper);
      } else {
        this.setPauseMediaWhenNotVisible(media, mediaWrapper);
      }
    }
    
    window.playMedia(media, this.enableAutoplay);
  }

  actionDefferedMedia(event) {
    if(event) event.preventDefault()
    this.loadContent();
  }
}
customElements.define('deferred-media', DeferredMedia);

class QuantityInput extends HTMLElement {
  constructor() {
    super();

    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });
    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.quantityUpdate, this.validateQtyRules.bind(this));
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    event.target.closest('[name="plus"]') ? this.input.stepUp() : this.input.stepDown();
    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const min = parseInt(this.input.min);
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle('disabled', value <= min);
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle('disabled', value >= max);
    }
  }
}
customElements.define('quantity-input', QuantityInput);

class ComponentTabs extends HTMLElement {
  constructor() {
    super();

    theme.initWhenVisible({
      element: this,
      callback: this.init.bind(this),
      threshold: 600
    });

    document.addEventListener('shopify:block:select', (event) => {
      this.blockSelect = true
      this.tabs = this.querySelectorAll('.tab-js')
      this.contents = this.closest('.tabs-container-js').querySelectorAll('.tab-content-js')
      let activeTab = event.target
      let activeElemID = activeTab.getAttribute('id')
      
      if(!this.closest('section').querySelector(`#${activeElemID}`)) return
      this.tabs.forEach(tab => tab.classList.remove('active'))
      activeTab.classList.add('active')
      if(this.contents.length > 0) this.contents.forEach(content => this.hiddenContentPrevActiveTab(content, this.blockSelect))
      if(this.contents.length == 0) return
      this.contents.forEach(content => this.visibleElementActiveTab(content, activeElemID, this.blockSelect))
    })
  }

  init() {
    this.blockSelect = false
    this.tabs = this.querySelectorAll('.tab-js')
    this.contents = this.closest('.tabs-container-js').querySelectorAll('.tab-content-js')
    
    if(!this.querySelector('.active') && this.tabs.length > 0) {
      this.tabs[0].classList.add('active')
      this.contents[0].classList.add('active')
    }

    if (this.closest('.tabs-container-js.predictive-search-results')) { 
      if (this.tabs.length > 0) this.tabs[0].classList.add('active')
      if (this.contents.length > 0) this.contents[0].classList.add('active')
    }
    this.contents.forEach(content => {
      if(!content.closest('.active')) getFocusableElements(content).forEach(link => link.setAttribute('tabindex', '-1'))
    })

    this.addEventListener('click', this.changeActiveTab.bind(this));  
    this.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'ENTER') this.changeActiveTab(event)
    })
  }

  changeActiveTab(event) {
    let eventTarget
    (event.target) ? eventTarget = event.target : eventTarget = event
    let activeElem = eventTarget.closest('.tab-js')
    if (activeElem && !activeElem.classList.contains('disabled')) {
      this.tabs.forEach(tab => tab.classList.remove('active'))
      activeElem.classList.add('active')
      let activeElemID = activeElem.getAttribute('id')
      if(this.contents.length > 0) {
        this.contents.forEach(content => this.hiddenContentPrevActiveTab(content))
        this.contents.forEach(content => this.visibleElementActiveTab(content, activeElemID))
      }
    }
  }

  hiddenContentPrevActiveTab(element, blockSelect = false) {
    if(!blockSelect) getFocusableElements(element).forEach(link => link.setAttribute('tabindex', '-1'))
    element.classList.remove('active');
  }

  visibleElementActiveTab(element, activeElemID, blockSelect = false) {
    let elemID 
    if(element.closest('.tab-content-js')) elemID = element.getAttribute('id').split('content-')[1]
    if(elemID == activeElemID) {
      element.classList.add('active');
      if(!blockSelect) getFocusableElements(element).forEach(link => link.setAttribute('tabindex', '0'))
    }
  }
}
customElements.define('component-tabs', ComponentTabs);

class ScrollingPromotion extends HTMLElement {
  constructor() {
    super();

    this.config = {
      moveTime: parseFloat(this.dataset.speed), // 100px going to move for
      space: 100,  // 100px
    };

    this.promotion = this.querySelector('.promotion');

    theme.initWhenVisible({
      element: this,
      callback: this.init.bind(this),
      threshold: 600
    });
  }

  init() {
    if (this.childElementCount === 1) {
      this.promotion.classList.add('promotion--animated');

      for (let index = 0; index < 10; index++) {
        this.clone = this.promotion.cloneNode(true);
        this.clone.setAttribute('aria-hidden', true);
        if (index > 1) getFocusableElements(this.clone).forEach(link => link.setAttribute('tabindex', '-1'))

        if (theme.config.isRTL) {
          this.insertBefore(this.clone, this.firstChild);
        } else {
          this.appendChild(this.clone);
        }

        let imageWrapper = this.clone.querySelector('.promotion__item');
        if (imageWrapper) imageWrapper.classList.remove('loading');
      }
      let animationTimeFrame = (this.promotion.clientWidth / this.config.space) * this.config.moveTime;
      this.style.setProperty('--duration', `${animationTimeFrame}s`);

      window.addEventListener('resize', () => {
        let animationTimeFrame = (this.promotion.clientWidth / this.config.space) * this.config.moveTime;
        this.style.setProperty('--duration', `${animationTimeFrame}s`);
      })

      // pause when out of view
      const observer = new IntersectionObserver((entries, _observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.scrollingPlay();
          } else {
            this.scrollingPause();
          }
        });
      }, {rootMargin: '0px 0px 50px 0px'});

      observer.observe(this);
    }
  }

  scrollingPlay() {
    this.classList.remove('scrolling-promotion--paused');
  }

  scrollingPause() {
    this.classList.add('scrolling-promotion--paused');
  }
}
customElements.define('scrolling-promotion', ScrollingPromotion);

class ImageComparison extends HTMLElement {
  constructor() {
    super();

    theme.initWhenVisible({
      element: this,
      callback: this.init.bind(this),
      threshold: 600
    });
  }

  init() {
    this.range = this.querySelector('.image-comparison__range');

    this.range.addEventListener('input', (e) => {
      const position = theme.config.isRTL ? 100 - e.target.value : e.target.value;
      this.style.setProperty('--position', `${position}%`);
    });

    this.range.addEventListener('change', (e) => {
      const position = theme.config.isRTL ? 100 - e.target.value : e.target.value;
      this.style.setProperty('--position', `${position}%`);
    });

    this.setValue()
    window.addEventListener('resize', this.setValue.bind(this))
  }

  setValue () {
    this.width = this.offsetWidth;
    this.min = Math.max(Math.ceil(14 * 100 / this.width * 10) / 10, 0)
    this.max = 100 - this.min
    this.range.setAttribute('min', this.min)
    this.range.setAttribute('max', this.max)
  }
}
customElements.define('image-comparison', ImageComparison);

class ImageWithHotspots extends HTMLElement {
  constructor() {
    super();

    theme.initWhenVisible({
      element: this,
      callback: this.init.bind(this),
      threshold: 600
    });
  }

  init() {
    this.timeout
    this.dots = this.querySelectorAll('.image-with-hotspots__dot');
    this.dropdowns = this.querySelectorAll('.image-with-hotspots__dot ~ .image-with-hotspots__content');
    this.dots.forEach(dot => dot.addEventListener('mouseenter', (event) => {
      if(!dot.nextElementSibling) return
      if (event.target.closest('.image-with-hotspots__dot')) this.openDropdown(event.target.closest('.image-with-hotspots__dot')) 
    }))

    this.dots.forEach(dot => dot.addEventListener('mousemove', (event) => {
      if(!dot.nextElementSibling) return
      if (event.target.closest('.image-with-hotspots__dot')) this.openDropdown(event.target.closest('.image-with-hotspots__dot')) 
    }))

    this.dots.forEach(dot => dot.addEventListener('mouseleave', (event) => {
      if(!dot.nextElementSibling) return
      if (event.relatedTarget && !event.relatedTarget.closest('.image-with-hotspots__content')) this.closeDropdown(dot)
    }))

    this.dropdowns.forEach(dropdown => dropdown.addEventListener('mouseleave', (event) => {
      if (event.relatedTarget != dropdown.previousElementSibling) this.closeDropdown(dropdown.previousElementSibling)
    }))

    this.dropdowns.forEach(dropdown => dropdown.addEventListener('click', (event) => {
      if(event.target.closest('quick-view-button') && event.target.closest('quick-view-button').previousElementSibling.closest('.open')) this.closeDropdown(event.target.closest('quick-view-button').previousElementSibling)
    }))
  }

  openDropdown(item) {
    this.stopAnimation()
    this.alignDropdown(item.nextElementSibling)
    item.classList.add('open', 'active')
    item.classList.remove('closing')
    item.closest('.image-with-hotspots__hotspot').style.zIndex = 6
  }

  closeDropdown(item) {
    item.classList.add('closing')
    this.timeout = setTimeout(() => {
      item.classList.remove('closing')
      item.classList.remove('open')
      item.closest('.image-with-hotspots__hotspot').removeAttribute('style')
      this.content = item.nextElementSibling
      this.content.removeAttribute('style')
    }, 300);

    item.classList.remove('active')
  }

  alignDropdown(item) {
    this.itemCoordinate = item.getBoundingClientRect();
    this.itemWidth = item.offsetWidth
    this.viewportWidth = window.innerWidth
    this.dotPosition = Math.round(item.closest('.image-with-hotspots__hotspot').getBoundingClientRect().left)
    if(this.itemCoordinate.left < 0) {
      item.style.left = 0 - this.dotPosition + 'px';
      item.style.right = 'auto';
    } else if (this.itemCoordinate.right  > this.viewportWidth) {
      item.style.right = 'auto';
      item.style.left = this.viewportWidth - this.dotPosition - this.itemWidth + 'px';
    } 
  }

  stopAnimation() {
    clearTimeout(this.timeout)
    this.querySelectorAll('.image-with-hotspots__hotspot').forEach(item => item.removeAttribute('style'))
  }
}
customElements.define('image-with-hotspots', ImageWithHotspots);

class ProductRecentlyViewed extends HTMLElement {
  constructor() {
    super();
    
    // Save the product ID in local storage to be eventually used for recently viewed section
    if (isStorageSupported('local')) {
      const productId = parseInt(this.dataset.productId);
      const cookieName = 'mrk-theme:recently-viewed';
      const items = JSON.parse(window.localStorage.getItem(cookieName) || '[]');

      // Check if the current product already exists, and if it does not, add it at the start
      if (!items.includes(productId)) {
        items.unshift(productId);
      }

      // By keeping only the 10 most recent
      window.localStorage.setItem(cookieName, JSON.stringify(items.slice(0, 10)));
    }
  }
}
customElements.define('product-recently-viewed', ProductRecentlyViewed);

class RecentlyViewedProducts extends HTMLElement {
  constructor() {
    super();

    theme.initWhenVisible({
      element: this,
      callback: this.init.bind(this),
      threshold: 600
    });
  }

  init() {
    if (Shopify.designMode) {
      return;
    }

    fetch(this.dataset.url + this.getQueryString())
      .then(response => response.text())
      .then(text => {
        const html = document.createElement('div');
        html.innerHTML = text; 

        const recentlyViewedSlider = html.querySelector('slider-component');

        if ((recentlyViewedSlider && recentlyViewedSlider.innerHTML.trim().length) || Shopify.designMode) {
          const recommendations = html.querySelector('recently-viewed-products');

          this.innerHTML = recommendations.innerHTML;
        } else {
          this.handleNoRecentlyProductsFound();
        }
        document.dispatchEvent(new CustomEvent('recommendations:loaded'));
      })
      .catch(e => {
        console.error(e);
      });     
  }

  handleNoRecentlyProductsFound() {
    const tabs = this.closest('.tabs-block');

    if (tabs) {
      const placeholder = this.querySelector('.no-viewed-products-placeholder');

      placeholder.removeAttribute('hidden');

      return;
    } 

    this.remove();   
  }

  getQueryString() {
    const cookieName = 'mrk-theme:recently-viewed';
    let items = JSON.parse(window.localStorage.getItem(cookieName) || "[]");
    items = items.filter(item => item != null)
    if (this.dataset.productId && items.includes(parseInt(this.dataset.productId))) {
      items.splice(items.indexOf(parseInt(this.dataset.productId)), 1);
    }
    return items.map((item) => "id:" + item).slice(0, 10).join(" OR ");
  }
}
customElements.define('recently-viewed-products', RecentlyViewedProducts);

class ProductGallery extends HTMLElement {
  constructor() {
    super();
    this.slider = this.querySelector('[id^="Slider-Gallery"]');
    this.sliderItems = this.slider.querySelectorAll('[id^="Slide-"]');
    this.thumbnails = this.querySelector('[id^="Slider-Thumbnails"]'),
    this.pages = this.querySelector('.slider-counter')
    this.sliderViewport = this.querySelector('.slider__viewport')
    this.currentPageElement = this.querySelector('.slider-counter--current');
    this.pageTotal = this.querySelector('.slider-counter--total');
    this.prevButton = this.querySelectorAll('button[name="previous"]');
    this.nextButton = this.querySelectorAll('button[name="next"]');
    this.scrollbar = this.querySelector('.slider-scrollbar')
    this.scrollbarTrack = this.querySelector('.slider-scrollbar__track')
    this.scrollbarThumb = this.querySelector('.slider-scrollbar__thumb')
    this.imgs = this.slider.querySelectorAll('img')
    this.isOnButtonClick = false
    this.gap = 4
    this.scrollValue = this.slider.offsetWidth
    this.lastWindowWidth = window.innerWidth
    if (!this.slider) return;
    this.preloadImages()
    if (this.sliderItems.length < 2) return
    if (this.closest('.product__media-wrapper') && this.slider.classList.contains('organize_images')) this.initProductGallery()
    if (this.slider && this.slider.classList.contains('variant-images') && this.slider.querySelectorAll('.product__media-item-image.product__media-item--variant-alt').length > 0) {
      this.sliderItems = this.querySelectorAll('[id^="Slide-"].product__media-item.product__media-item--variant-alt')
    }
    document.addEventListener('updateVariantMedia', () => {
      if (this.slider && this.slider.classList.contains('variant-images') && this.slider.querySelectorAll('.product__media-item-image.product__media-item--variant-alt').length > 0) {
        this.slider = this.querySelector('[id^="Slider-Gallery"]');
        this.sliderItems = this.querySelectorAll('[id^="Slide-"].product__media-item.product__media-item--variant-alt')
        this.sliderItems.forEach(item => {
          if(item.querySelector('.lazy-image') && !item.querySelector('.lazy-image').classList.contains('.lazyloaded')) item.querySelector('.lazy-image').classList.add('lazyloaded')
        })
      }
      this.initSlider()
      if (this.pages) this.update()
    })
    if (this.slider.classList.contains('product__media-list--alternative_2') && this.slider.classList.contains('media_attached_to_variant')) {
      this.sliderItems = this.slider.querySelectorAll('.product__media-item--variant-alt')
      this.sliderItems.forEach((elem, index) => {
        if (index == 0 || index % 3 === 0) {
          if (!elem.classList.contains('third-el')) elem.classList.add('third-el')
        } else {
          if (elem.classList.contains('third-el')) elem.classList.remove('third-el')
        }
      })
    }
    if (this.pages) {
      this.initPages();
      const resizeObserver = new ResizeObserver(entries => this.initPages());
      resizeObserver.observe(this.slider);
    }
    this.preloadImages()
    if (this.prevButton || this.nextButton) {
      this.prevButton.forEach(button => button.addEventListener('click', this.onButtonClick.bind(this, 'previous', false)));
      this.nextButton.forEach(button => button.addEventListener('click', this.onButtonClick.bind(this, 'next', false)));
      this.disableButtons()
    } 
    if (this.scrollbar && this.slider.offsetWidth < this.slider.scrollWidth && window.innerWidth < 1025) setTimeout(() => this.setScrollBar(), 0)
    this.resizeImage(this.slider.querySelector('.is-active'))
    window.addEventListener('resize', () => {
      this.resizeImage(this.slider.querySelector('.is-active'))
      if (this.scrollbar && window.innerWidth != this.lastWindowWidth) {
        this.scrollbar && this.slider.offsetWidth < this.slider.scrollWidth && window.innerWidth < 1025 ? setTimeout(() => this.setScrollBar(), 0) : this.scrollbar.classList.add('visually-hidden')
        
      }
    })
    document.addEventListener('quickview:loaded', () => {
      setTimeout(() => {
        if (this.scrollbar) {
          if (this.scrollbar && this.slider.offsetWidth < this.slider.scrollWidth && window.innerWidth < 1025) {
            this.setScrollBar()
            const maxCursorWidth = this.scrollbarThumb.offsetWidth;
            const scrollRatio = this.slider.scrollLeft / (this.slider.scrollWidth - this.slider.clientWidth);
            this.scrollbarThumb.style.left = (this.scrollbarTrack.offsetWidth - maxCursorWidth) * scrollRatio + 'px';
          } else {
            this.scrollbar.classList.add('visually-hidden')
          }
        }
      }, 100)
    })
    document.addEventListener('shopify:section:load', () => {
      if (this.closest('.product__media-wrapper') && this.slider.classList.contains('organize_images')) this.initProductGallery()
      setTimeout(() => this.resizeImage(this.slider.querySelector('.is-active')))
      if (this.slider.classList.contains('product__media-list--alternative_2') && this.slider.classList.contains('media_attached_to_variant')) {
        this.sliderItems = this.slider.querySelectorAll('.product__media-item--variant-alt')
        this.sliderItems.forEach((elem, index) => {
          if (index == 0 || index % 3 === 0) {
            if (!elem.classList.contains('third-el')) elem.classList.add('third-el')
          } else {
            if (elem.classList.contains('third-el')) elem.classList.remove('third-el')
          }
        })
      }
    })

    this.slider.addEventListener('scroll', () => {
      if (!this.isOnButtonClick && !this.slider.classList.contains('disable-scroll')) this.changeActiveSlideOnScroll()
    })
    document.addEventListener('variant:change', () => {
      if (this.scrollbar) {
        this.scrollbar && this.slider.offsetWidth < this.slider.scrollWidth && window.innerWidth < 1025 ? setTimeout(() => this.setScrollBar(), 0) : this.scrollbar.classList.add('visually-hidden')
        
      }
    })
  }

  preloadImages() {
    this.imgs.forEach(img => {
      img.addEventListener('load', () => {img.classList.add('loaded')})
      if (img.complete) img.classList.add('loaded')
    })
  }

  resizeImage(activeElem) {
    if (this.slider.classList.contains('product__media-list-desktop-original') && window.innerWidth > 768 || this.slider.classList.contains('product__media-list-mobile-original') && window.innerWidth < 769) {
      let height = activeElem.offsetHeight
      this.slider.style.height = height + 'px'
    } else {
      this.slider.style.height = 'auto'
    }
    if (activeElem && activeElem.dataset.mediaId) {
      this.toggleXrButton(activeElem.dataset.mediaId);
    }
  }

  initSlider() {
    this.slider = this.querySelector('[id^="Slider-"]');
    if (this.slider && this.slider.classList.contains('variant-images') && this.slider.querySelectorAll('.product__media-item-image.product__media-item--variant-alt').length > 0) {
      this.sliderItems = this.querySelectorAll('[id^="Slide-"].product__media-item.product__media-item--variant-alt')
      if (this.prevButton) {
        this.totalItems = this.querySelectorAll('[id^="Slide-"].product__media-item.product__media-item--variant-alt')
        this.totalItems.length <= 2 ? this.prevButton.forEach(btn => btn.classList.add('visually-hidden')) : this.prevButton.forEach(btn => btn.classList.remove('visually-hidden'))
        this.totalItems.length <= 2 ? this.nextButton.forEach(btn => btn.classList.add('visually-hidden')) : this.nextButton.forEach(btn => btn.classList.remove('visually-hidden'))
      }
      if (this.slider.classList.contains('product__media-list--alternative_1')) this.slider.querySelectorAll('.product__media-item--variant-alt')[0].classList.add('first-el')
        if (this.slider.classList.contains('product__media-list--alternative_2') && this.slider.classList.contains('media_attached_to_variant')) {
          this.sliderItems = this.slider.querySelectorAll('.product__media-item--variant-alt')
          this.sliderItems.forEach((elem, index) => {
            if (index == 0 || index % 3 === 0) {
              if (!elem.classList.contains('third-el')) elem.classList.add('third-el')
            } else {
              if (elem.classList.contains('third-el')) elem.classList.remove('third-el')
            }
        })
      }
    }
  }

  initProductGallery() {
    this.slider.style.scrollBehavior = 'unset';
    setTimeout(() => this.slider.scrollLeft = this.slider.querySelector('.is-active').offsetLeft, 10)
    setTimeout(() => this.slider.style.scrollBehavior = 'smooth', 100)
  }

  initPages() {
    this.sliderItemsToShow = Array.from(this.sliderItems).filter(element => element.clientWidth > 0);
    if (this.sliderItemsToShow.length < 2) return;
    this.sliderItemOffset = this.sliderItemsToShow[1].offsetLeft - this.sliderItemsToShow[0].offsetLeft;
    this.slidesPerPage = Math.floor(this.slider.clientWidth / this.sliderItemOffset);
    this.totalPages = this.sliderItemsToShow.length
    this.update();
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.initPages();
  }

  update() {
    if (!this.pages) return
    if (this.slider && this.slider.querySelectorAll('.product__media-item-image.product__media-item--variant-alt').length > 0) this.sliderItems = this.querySelectorAll('[id^="Slide-"].product__media-item.product__media-item--variant-alt')
    this.activeSlide = this.slider.querySelector('.is-active')
    this.totalPages = Array.from(this.sliderItems).filter(element => element.clientWidth > 0).length 
    let activeSlideIndex = Array.from(this.sliderItems).indexOf(this.activeSlide)
    if(this.activeSlide) this.currentPage = Math.round(this.activeSlide.offsetLeft / this.sliderItemOffset) + 1;
    if (this.currentPageElement && this.pageTotal) {
      this.currentPageElement.textContent = this.currentPage;
      this.pageTotal.textContent = this.totalPages;
    }
    this.totalPages == 1 ? this.pages.closest('.slider-buttons').classList.add('visually-hidden') : this.pages.closest('.slider-buttons').classList.remove('visually-hidden')
    if (this.prevButton && this.nextButton) {
      activeSlideIndex == 0 ? this.prevButton.forEach(button => button.setAttribute('disabled', 'disabled')) : this.prevButton.forEach(button => button.removeAttribute('disabled'))
      activeSlideIndex == this.totalPages - 1 ? this.nextButton.forEach(button => button.setAttribute('disabled', 'disabled')) : this.nextButton.forEach(button => button.removeAttribute('disabled'))
    }
  }

  disableButtons() {
    if (!this.prevButton || !this.nextButton) return
    this.activeSlide = this.slider.querySelector('.is-active')
    let activeSlideIndex = Array.from(this.sliderItems).indexOf(this.activeSlide) 
    let dataCount = 1
    let nextActiveSlide = dataCount
    activeSlideIndex > this.sliderItems.length - 1 - nextActiveSlide ? this.nextButton.forEach(button => button.setAttribute('disabled', 'disabled')) : this.nextButton.forEach(button => button.removeAttribute('disabled'))
    activeSlideIndex == 0 ? this.prevButton.forEach(button => button.setAttribute('disabled', 'disabled')) : this.prevButton.forEach(button => button.removeAttribute('disabled'))
  }

  scrollThumbnail() {
    this.mainSlider = this.querySelectorAll('[id^="Slide-"].product__media-item')
    this.sliderThumbnailItems = this.querySelectorAll('[id^="Slide-"].thumbnail-list__item')
    if (this.thumbnails && this.thumbnails.querySelectorAll('.product__media-item--variant-alt').length > 0) {
      this.mainSlider = this.querySelectorAll('[id^="Slide-"].product__media-item.product__media-item--variant-alt')
      this.sliderThumbnailItems = this.querySelectorAll('[id^="Slide-"].thumbnail-list__item.product__media-item--variant-alt')
    }
    this.activeMainSlide = this.slider.querySelector('.is-active')
    let activeSlideIndex = Array.from(this.mainSlider).indexOf(this.activeMainSlide)
    let activeThumb = this.sliderThumbnailItems[activeSlideIndex]
    if(!activeThumb) return
    let prevActiveSlide = this.thumbnails.querySelector('.is-active')
    if (prevActiveSlide) prevActiveSlide.classList.remove('is-active')  
    activeThumb.classList.add('is-active')
    // Check thumbnails gallery position   
    if (this.thumbnails.classList.contains('flex--column')) {
      this.thumbnails.scrollTo({
        top: activeThumb.offsetTop - activeThumb.offsetHeight - this.gap,
        behavior: 'smooth'
      })
    } else {
      this.thumbnails.scrollTo({
        left: activeThumb.offsetLeft - activeThumb.offsetWidth - this.gap,
        behavior: 'smooth'
      })
    }
  }

  changeActiveSlideOnScroll() {
    window.pauseAllMedia()
    let sliderLeft = Math.round(this.slider.closest('.gallery-slider').getBoundingClientRect().left)
    let sliderItemLeft 
    this.sliderItems.forEach((item) => {
      item.classList.remove('is-active')
      sliderItemLeft = Math.round(item.getBoundingClientRect().left)
      if (Math.abs(sliderLeft - sliderItemLeft) < 7) {
        item.classList.add('is-active')
        this.resizeImage(item)
      }
    })
    if(this.thumbnails) {
      this.scrollThumbnail()
    } 
    this.disableButtons()
    this.update() 
    this.activeSlide = this.slider.querySelector('.is-active')
    let activeSlideIndex = Array.from(this.sliderItems).indexOf(this.activeSlide)
    this.setActiveModel(activeSlideIndex)
  }

  setActiveModel(activeSlideIndex) {
    if (!this.classList.contains('product-gallery')) return
    window.pauseAllMedia();
    let activeMediaId
    if (this.sliderItems[activeSlideIndex]) activeMediaId = this.sliderItems[activeSlideIndex].dataset.mediaId
    if (activeMediaId) {
      this.toggleXrButton(activeMediaId);
    }
  }

  onButtonClick(direction) {
      if (this.slider && this.slider.classList.contains('variant-images') && this.slider.querySelectorAll('.product__media-item-image.product__media-item--variant-alt').length > 0) {
        this.sliderItems = this.querySelectorAll('[id^="Slide-"].product__media-item.product__media-item--variant-alt')
      }
      this.activeSlide = this.slider.querySelector('.is-active')
      let activeSlideIndex = Array.from(this.sliderItems).indexOf(this.activeSlide)
      if (this.slider.closest('.product--side_thumbnails') || this.slider.closest('.product--thumbnails_below')) {
        let activeThumb = this.thumbnails.querySelectorAll('[id^="Slide-"]')[activeSlideIndex]
        activeThumb.classList.remove('is-active')
      }
      let dataCount = 1
      let nextActiveSlide
      nextActiveSlide = dataCount
      if (direction == 'next') {
        let sliderItemsLength = this.sliderItems.length - 1
        if (activeSlideIndex + nextActiveSlide >= sliderItemsLength) {
          activeSlideIndex = this.sliderItems.length - nextActiveSlide
        } else {
          activeSlideIndex = activeSlideIndex + nextActiveSlide
        }
        if (this.activeSlide) this.activeSlide.classList.remove('is-active')
        if(this.sliderItems[activeSlideIndex]) this.sliderItems[activeSlideIndex].classList.add('is-active')
        this.resizeImage(this.sliderItems[activeSlideIndex])
        this.slider.scrollLeft = this.sliderItems[activeSlideIndex].offsetLeft
      }
      if (direction == 'previous') {   
        activeSlideIndex - nextActiveSlide < 0 ? activeSlideIndex = 0 : activeSlideIndex = activeSlideIndex - nextActiveSlide
        if(this.activeSlide) this.activeSlide.classList.remove('is-active')  
        this.sliderItems[activeSlideIndex].classList.add('is-active')
        this.resizeImage(this.sliderItems[activeSlideIndex])
        this.slider.scrollLeft = this.sliderItems[activeSlideIndex].offsetLeft      
      }
      
      if(this.thumbnails) {
        this.scrollThumbnail()
      } 
      this.update()
      this.disableButtons()
      this.setActiveModel(activeSlideIndex)
      this.isOnButtonClick = true
      this.slider.addEventListener('wheel', () => this.isOnButtonClick = false)
      this.slider.addEventListener('touchstart', () => this.isOnButtonClick = false)
      this.slider.addEventListener('touchmove', () => this.isOnButtonClick = false)
      this.slider.addEventListener('touchend', () => this.isOnButtonClick = false)
  }

  setScrollBar() {
    this.setScrollbarWidth()
    this.slider.addEventListener('scroll', (e) => {
      this.isDragging = true
      this.cursorMove()
    })
    this.scrollbarTrack.addEventListener('mousedown', (e) => this.onMouseDown(e), false);
    this.scrollbar.addEventListener('click', (e) => this.scrollByClick(e), false);
    document.addEventListener('mouseup', () => this.onMouseUp(), false);
    document.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
  }

  cursorMaxLeft() {
      const maxCursorWidth = this.scrollbarThumb.offsetWidth;
      return this.scrollbarTrack.offsetWidth - maxCursorWidth;
  }

  cursorMove() {
    if (this.isDragging) {
      const scrollRatio = this.slider.scrollLeft / (this.slider.scrollWidth - this.slider.clientWidth);
      this.scrollbarThumb.style.left = this.cursorMaxLeft() * scrollRatio + 'px';
    }
  }

  onMouseDown(e) {
    if (e.target.closest('.slider-scrollbar__thumb')) {
      e.preventDefault();
      this.isDragging = false
      this.isDown = true;
      this.initialLeft = this.scrollbarThumb.offsetLeft;
      this.initialX = e.clientX;
      this.slider.style.scrollBehavior = 'unset';
      this.scrollbarThumb.classList.add('dragging')
    }
  }

  onMouseUp() {
    this.isDown = false;
    this.isDragging = true
    this.slider.style.scrollBehavior = 'smooth';
    this.scrollbarThumb.classList.remove('dragging')
  }

  onMouseMove(e) {
    e.preventDefault();
    if (this.isDown && e.target.closest('.slider__viewport') && this.isDown) {
      const mouseDeltaX = e.clientX - this.initialX;
      let newLeft = mouseDeltaX + this.initialLeft;
      newLeft = Math.min(newLeft, this.cursorMaxLeft());
      newLeft = Math.max(newLeft, 0);
      const scrollRatio = newLeft / this.cursorMaxLeft();
      this.slider.scrollLeft = scrollRatio * (this.slider.scrollWidth - this.slider.clientWidth);
      this.scrollbarThumb.style.left = newLeft + 'px';
    }
  }

  setScrollbarWidth() {
    this.slider.offsetWidth < this.slider.scrollWidth ? this.scrollbar.classList.remove('visually-hidden') : this.scrollbar.classList.add('visually-hidden')
    this.persent = Math.round(this.slider.offsetWidth / this.slider.scrollWidth * 100) 
    this.scrollbarThumb.style.width = this.persent + '%'
  }

  scrollByClick(e) {
    if (e.target == this.scrollbar || e.target == this.scrollbarTrack && !this.isDown) {
      let newLeft = e.clientX - (this.scrollbarThumb.offsetWidth / 2)
      newLeft = Math.min(newLeft, this.cursorMaxLeft());
      newLeft = Math.max(newLeft, 0);
      const scrollRatio = newLeft / this.cursorMaxLeft();
      this.slider.scrollLeft = scrollRatio * (this.slider.scrollWidth - this.slider.clientWidth);
      this.cursorMove()
      this.isOnButtonClick = 0
    }
  }

  toggleXrButton(activeMediaId) {
    const xrButtons = document.querySelectorAll('.gallery-slider > .product__xr-button');
    if (xrButtons.length == 0) return
    xrButtons.forEach(button => {
      if(!button.className.includes('product__xr-button--hidden')) button.classList.add('product__xr-button--hidden');
    });
  
    const activeXrButton = document.querySelector(`.gallery-slider > .product__xr-button[data-media-id="${activeMediaId}"]`);
    if (activeXrButton) {
      activeXrButton.classList.remove('product__xr-button--hidden');
    }
  }
}
customElements.define('product-gallery', ProductGallery);

class ProductRecommendations extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.loadRecommendations();
    document.addEventListener('shopify:section:load', (event) => {
      if (event.target.closest('section.product-recommendations')) this.loadRecommendations();
    });
  }

  loadRecommendations() {
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;

      observer.unobserve(this);

      fetch(this.dataset.url)
        .then(response => response.text())
        .then(text => {
          const html = document.createElement('div');
          html.innerHTML = text;
          const recommendations = html.querySelector('product-recommendations');
          if (recommendations 
            && recommendations.innerHTML.trim().length 
            && (!recommendations.querySelector('.section-container') || recommendations.querySelector('.section-container').innerHTML.trim().length)
          ) {
            this.innerHTML = recommendations.innerHTML;
          } else {
            this.handleNoProductRecommendationsFound();
          }
          document.dispatchEvent(new CustomEvent('recommendations:loaded'));
        })
        .catch(e => {
          console.error(e);
        });
    }
    new IntersectionObserver(handleIntersection.bind(this), {rootMargin: '0px 0px 400px 0px'}).observe(this);
  }

  handleNoProductRecommendationsFound() {
    const tabs = this.closest('.tabs-block');

    if (tabs) {
      return;
    } 

    this.remove();   
  }
}
customElements.define('product-recommendations', ProductRecommendations);

class SliderComponent extends HTMLElement {
  constructor() {
    super();

    this.slider = this.querySelector('[id^="Slider-"]')
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]')
    this.thumbnails = this.querySelector('[id^="Slider-Thumbnails"]')
    this.sliderViewport = this.querySelector('.slider__viewport')
    this.prevButton = this.querySelector('button[name="previous"]')
    this.nextButton = this.querySelector('button[name="next"]')
    this.scrollbar = this.querySelector('.slider-scrollbar')
    this.scrollbarTrack = this.querySelector('.slider-scrollbar__track')
    this.scrollbarThumb = this.querySelector('.slider-scrollbar__thumb')
    this.isOnButtonClick = 0
    this.isDown = false
    this.isDragging = true
    if (this.slider && this.slider.closest('.product-media-modal')) {
      this.slider.style.scrollBehavior = 'auto'
      if (this.slider.querySelectorAll('.product__media-item--variant-alt').length > 0) {
        this.sliderItems = this.querySelectorAll('[id^="Slide-"]:has( .product__media-item--variant-alt)')
      }
      document.addEventListener('image:show', () => {
        if (this.slider.querySelectorAll('.product__media-item--variant-alt').length > 0) {
          this.sliderItems = this.querySelectorAll('[id^="Slide-"]:has( .product__media-item--variant-alt)')
        }
      })
    }

    if (!this.slider) return;

    document.addEventListener('shopify:section:load', () => {
      this.scrollValue = this.slider.offsetWidth
      if (this.prevButton || this.nextButton) this.disableButtons()
      if (this.scrollbar) setTimeout(() => this.setScrollBar(), 0)
      this.init()
    })
    document.addEventListener('recommendations:loaded', this.reinitializeSlider.bind(this))
    if (this.prevButton || this.nextButton) {
      this.prevButton.addEventListener('click', this.onButtonClick.bind(this, 'previous', false));
      this.nextButton.addEventListener('click', this.onButtonClick.bind(this, 'next', false));
      this.disableButtons()
    }
    // If slider made up of section blocks, make selected block active in theme editor
    if(this.closest('.scroll-to-block') && Shopify.designMode) {
      document.addEventListener('shopify:block:select', (event) => {
        let activeBlock = event.target
        if(!this.querySelector(`#${activeBlock.getAttribute('id')}`)) return
        let activeSlide = this.slider.querySelector('.is-active')
        if(!activeSlide) return
        activeSlide.classList.remove('is-active')
        activeBlock.classList.add('is-active')
        let activeSlideIndex = Array.from(this.sliderItems).indexOf(activeBlock) 
        this.disableButtons()
        if(this.sliderItems[activeSlideIndex]) this.slider.scrollLeft = this.sliderItems[activeSlideIndex].offsetLeft
        this.init()
      })
    }
    
    new IntersectionObserver(this.handleIntersection.bind(this), {rootMargin: `400px 0px 0px 0px`}).observe(this);
  }

  reinitializeSlider() {
    this.scrollValue = this.slider.offsetWidth

    if (this.prevButton || this.nextButton) this.disableButtons()
    if (this.scrollbar) setTimeout(() => this.setScrollBar(), 10)

    this.init()
  }

  init() {
    this.scrollValue = this.slider.offsetWidth
    
    if (this.scrollbar && this.slider.offsetWidth < this.slider.scrollWidth) setTimeout(() => this.setScrollBar(), 0)
    window.addEventListener('resize', () => {
      this.scrollValue = this.slider.offsetWidth
      if (this.prevButton || this.nextButton) this.disableButtons()
      if (this.scrollbar) setTimeout(() => this.setScrollBar(), 0)
      this.setMobileCount()
    })
    this.slider.addEventListener('scroll', () => {
      if (this.offsetWidth > 768 && this.isOnButtonClick == 0) this.changeActiveSlideOnScroll()
      if (this.prevButton || this.nextButton) this.disableButtons()

        if (this.slider.closest('.product-media-modal')) {
          if (scrollTimer) clearTimeout(scrollTimer); // Reset the timer every time the user scrolls

          scrollTimer = setTimeout(() => {
            this.onAfterSlideChange(this.activeSlide)
          }, 0); 
        }
        if (this.slider.closest('.product-media-modal')) this.onBeforeSlideChange()
    })
    this.setMobileCount()
  }

  disableButtons() {
    if (this.slider.offsetWidth < this.slider.scrollWidth) {
      this.prevButton.classList.remove('visually-hidden')
      this.nextButton.classList.remove('visually-hidden')
    } else {
      this.prevButton.classList.add('visually-hidden')
      this.nextButton.classList.add('visually-hidden')
    }

    if (theme.config.isRTL) {
      Math.ceil(this.slider.scrollLeft) == 0 
        ? this.prevButton.setAttribute('disabled', 'disabled') 
        : this.prevButton.removeAttribute('disabled');

      Math.abs(Math.round(this.slider.scrollLeft)) + this.slider.offsetWidth + 1 >= this.slider.scrollWidth 
        ? this.nextButton.setAttribute('disabled', 'disabled') 
        : this.nextButton.removeAttribute('disabled');
    } else {
      this.slider.scrollLeft == 0 
        ? this.prevButton.setAttribute('disabled', 'disabled') 
        : this.prevButton.removeAttribute('disabled');

      Math.round(this.slider.scrollLeft) + this.slider.offsetWidth + 1 >= this.slider.scrollWidth 
        ? this.nextButton.setAttribute('disabled', 'disabled') 
        : this.nextButton.removeAttribute('disabled');
    }
  }

  setMobileCount() {
    this.mobileItemWidth = this.slider.dataset.mobileWidth
    this.mobileItems = this.slider.parentElement.offsetWidth / this.mobileItemWidth
    this.gap = window.getComputedStyle(this.slider).getPropertyValue('column-gap').slice(0,-2)
    this.gaps = +this.gap * Math.round(this.mobileItems - 1)
    this.mobileCount = Math.floor((this.slider.parentElement.offsetWidth - this.gaps) / this.mobileItemWidth)   
    if(this.slider.closest('.slider-in-product-modal')) this.mobileCount = this.slider.dataset.countMobile
  }

  changeActiveSlideOnScroll() {
    let sliderLeft = Math.round(this.sliderViewport.getBoundingClientRect().left)
    this.sliderItems.forEach((item) => {
      let sliderItemLeft = Math.round(item.getBoundingClientRect().left)
      item.classList.remove('is-active')
      if (Math.abs(sliderLeft - sliderItemLeft) < (item.offsetWidth / 2)) {
        item.classList.add('is-active')
      }
    })
  }

  onBeforeSlideChange() {
    clearTimeout(this.adaptSlideHeightTimeout); // In case of a recurring click on the button

    const modalContent = this.closest('.product-media-modal__content');
    modalContent.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  onAfterSlideChange(activeSlide) {
    const slideTransitionSpeed = 750; // Approximate value of scroll-behavior: smooth in browsers

    if (typeof activeSlide === 'number') {
      activeSlide = this.sliderItems[activeSlide]
    } 

    this.adaptSlideHeightTimeout = setTimeout(() => {
      this.querySelector('.slider__grid').style.setProperty('height', activeSlide.offsetHeight + 'px');
    }, slideTransitionSpeed)
  }

  onButtonClick(direction) {
    if (this.slider.closest('.product-media-modal')) this.onBeforeSlideChange()
      this.slider.setAttribute('style', 'scroll-behavior: smooth;')
      this.activeSlide = this.slider.querySelector('.is-active')
      let activeSlideIndex = Array.from(this.sliderItems).indexOf(this.activeSlide)
      let dataCount = +this.slider.dataset.count
      if (this.slider.dataset.count == 8 && window.innerWidth < 1601) dataCount = 7
      if ((this.slider.dataset.count >= 7) && window.innerWidth < 1401) dataCount = 6
      if ((this.slider.dataset.count >= 6) && window.innerWidth < 1301) dataCount = 5
      if ((this.slider.dataset.count >= 5) && window.innerWidth < 1101) dataCount = 4
      if (window.innerWidth < 1025) dataCount = this.mobileCount
      let nextActiveSlide = +dataCount
      if (direction == 'next') {
        let sliderItemsLength = this.sliderItems.length - 1
        if (activeSlideIndex + nextActiveSlide > sliderItemsLength  - nextActiveSlide) {
          activeSlideIndex = this.sliderItems.length - nextActiveSlide
        } else {
          activeSlideIndex = activeSlideIndex + nextActiveSlide
        }
        if (this.slider.closest('.product-media-modal')) this.slider.style.scrollBehavior = 'smooth'
        this.activeSlide.classList.remove('is-active')
        if(this.sliderItems[activeSlideIndex]) this.sliderItems[activeSlideIndex].classList.add('is-active')
        setTimeout(() => {
          const scrollPosition  = theme.config.isRTL  
          ? (this.getBoundingClientRect().width - this.sliderItems[activeSlideIndex].offsetLeft - this.sliderItems[activeSlideIndex].offsetWidth) * -1 
          : this.sliderItems[activeSlideIndex].offsetLeft

          this.slider.scrollLeft = scrollPosition;
        }, 1)
      }
      if (direction == 'previous') { 
        activeSlideIndex - nextActiveSlide < 0 ? activeSlideIndex = 0 : activeSlideIndex = activeSlideIndex - nextActiveSlide
        if(this.activeSlide) this.activeSlide.classList.remove('is-active')  
        if (this.slider.closest('.product-media-modal')) this.slider.style.scrollBehavior = 'smooth'
        this.sliderItems[activeSlideIndex].classList.add('is-active')
        const scrollPosition  = theme.config.isRTL 
          ? (this.getBoundingClientRect().width - this.sliderItems[activeSlideIndex].offsetLeft - this.sliderItems[activeSlideIndex].offsetWidth) * -1 
          : this.sliderItems[activeSlideIndex].offsetLeft

        this.slider.scrollLeft = scrollPosition
      }
      this.isOnButtonClick = 'onButtonClick'
      this.slider.addEventListener('wheel', () => {
        this.isOnButtonClick = 0
      })   
      if (this.slider.closest('.product-media-modal')) this.onAfterSlideChange(activeSlideIndex)
  }

  handleIntersection(entries, observer) {
    if (!entries[0].isIntersecting) return;
    observer.unobserve(this);
    this.init()
  }

  setScrollBar() {
    this.setScrollbarWidth()
    if (this.isOnButtonClick == 0) this.slider.addEventListener('scroll', () => this.cursorMove(), false);
    this.scrollbarTrack.addEventListener('mousedown', (e) => this.onMouseDown(e), false);
    this.scrollbar.addEventListener('click', (e) => this.scrollByClick(e), false);
    document.addEventListener('mouseup', () => this.onMouseUp(), false);
    document.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
  }

  cursorMaxLeft() {
      const maxCursorWidth = this.scrollbarThumb.offsetWidth;
      return this.scrollbarTrack.offsetWidth - maxCursorWidth;
  }

  cursorMove() {
    if (this.isDragging) {
      const scrollRatio = this.slider.scrollLeft / (this.slider.scrollWidth - this.slider.clientWidth);

      if (theme.config.isRTL) {
        const scrollbarThumbPosition =  -1 * this.cursorMaxLeft() * scrollRatio;
        this.scrollbarThumb.style.right = scrollbarThumbPosition + 'px';
      } else {
        const scrollbarThumbPosition = this.cursorMaxLeft() * scrollRatio;
        this.scrollbarThumb.style.left = scrollbarThumbPosition + 'px';
      }
    }
  }

  onMouseDown(e) {
    if (e.target.closest('.slider-scrollbar__thumb')) {
      e.preventDefault();

      this.isDragging = false
      this.isDown = true;
      this.initialLeft = this.scrollbarThumb.offsetLeft;
      this.initialX = e.clientX;
      this.slider.setAttribute('style', 'scroll-behavior: unset;')
      this.scrollbarThumb.classList.add('dragging')
    }
  }

  onMouseUp() {
    this.isDown = false;
    this.isDragging = true
    this.slider.setAttribute('style', 'scroll-behavior: smooth;')
    this.scrollbarThumb.classList.remove('dragging')
  }

  onMouseMove(e) {
    if (this.isDown && e.target.closest('.slider__viewport')) {
      e.preventDefault();

      const mouseDeltaX = e.clientX - this.initialX;
      let newLeft = mouseDeltaX + this.initialLeft;
      newLeft = Math.min(newLeft, this.cursorMaxLeft());
      newLeft = Math.max(newLeft, 0);
      const scrollRatio = newLeft / this.cursorMaxLeft();

      if (theme.config.isRTL) {
        this.slider.scrollLeft = - (1 - scrollRatio) * (this.slider.scrollWidth - this.slider.clientWidth);
      } else {
        this.slider.scrollLeft = scrollRatio * (this.slider.scrollWidth - this.slider.clientWidth);
      }

      if (theme.config.isRTL) { 
        this.scrollbarThumb.style.right = this.scrollbarTrack.offsetWidth - this.scrollbarThumb.offsetWidth - newLeft + 'px';
      } else {
        this.scrollbarThumb.style.left = newLeft + 'px';
      }
      
    }
  }

  setScrollbarWidth() {
    this.slider.offsetWidth < this.slider.scrollWidth ? this.scrollbar.classList.remove('visually-hidden') : this.scrollbar.classList.add('visually-hidden')
    this.persent = Math.round(this.slider.offsetWidth / this.slider.scrollWidth * 100) 
    this.scrollbarThumb.style.width = this.persent + '%'
  }

  scrollByClick(e) {
    if (e.target == this.scrollbar || e.target == this.scrollbarTrack && !this.isDown) {
      let newLeft = e.clientX - (this.scrollbarThumb.offsetWidth / 2)
      newLeft = Math.min(newLeft, this.cursorMaxLeft());
      newLeft = Math.max(newLeft, 0);
      const scrollRatio = newLeft / this.cursorMaxLeft();
      
      if (theme.config.isRTL) {
        this.slider.scrollLeft = -1 * (1 - scrollRatio) * (this.slider.scrollWidth - this.slider.clientWidth);
      } else {
        this.slider.scrollLeft = scrollRatio * (this.slider.scrollWidth - this.slider.clientWidth);
      }
      
      this.cursorMove()
      this.isOnButtonClick = 0 
    }
  }
}
customElements.define('slider-component', SliderComponent);

class LocalizationForm extends HTMLElement {
  constructor() {
    super();
    this.elements = {
      input: this.querySelector('input[name="locale_code"], input[name="country_code"]'),
      searchInput: this.querySelector('.localization-search__input'),
      inputLanguage: this.querySelector('input[name="locale_code"]'),
      button: this.querySelector('button'),
      panel: this.querySelector('.disclosure__list-wrapper'),
      listItems: this.querySelectorAll('.disclosure__item'),
      localizations: document.querySelectorAll('.disclosure'),
      clearButton: this.querySelector('.localization-search__button'),
      clearButtonText: this.querySelector('.localization-search__button-text')
    };
    if (!this.className.includes('localization-form-drawer')) {
      this.elements.button.addEventListener('click', this.toggleSelector.bind(this));
      this.addEventListener('keyup', this.onContainerKeyUp.bind(this));
    this.addEventListener('focusout', this.closeSelector.bind(this));
      this.parent = this.elements.button.closest('.shopify-section').querySelector('div')
      if(this.elements.button.closest('.shopify-section').querySelector('.scroll-area')) this.parent = this.elements.button.closest('.shopify-section').querySelector('.scroll-area')
      this.parent.addEventListener('scroll', this.hidePanel.bind(this))
      document.addEventListener('scroll', this.hidePanel.bind(this))
      document.addEventListener('click', (event) => {
        this.elements.localizations.forEach(localization => {
          if(localization.querySelector('button').getAttribute('aria-expanded') == 'true' && (event.target.closest('.disclosure') != localization)) {
              localization.querySelector('button').setAttribute('aria-expanded', 'false');
              localization.querySelector('.disclosure__list-wrapper').style.top = 'auto'
              localization.querySelector('.disclosure__list-wrapper').style.left = 'auto'
              if(document.body.className.includes('localization-opened')) document.body.classList.remove('localization-opened')
          }
        })
      })
    }
    this.querySelectorAll('a').forEach(item => item.addEventListener('click', this.onItemClick.bind(this)));
    if (this.elements.searchInput) this.elements.searchInput.addEventListener('input', this.filterCountries.bind(this));
    
  }

  filterCountries(event) {
    const searchTerm = event.target.value.toLowerCase();
    const spinner = this.querySelector('.loading-overlay__spinner');
    spinner.classList.remove('hidden');

    if(!this.elements.clearButtonText.className.includes('visually-hidden')) this.elements.clearButtonText.classList.add('visually-hidden')

    setTimeout(() => {
      this.elements.listItems.forEach(item => {
        const countryName = item.querySelector('a').dataset.country;
        if (countryName.includes(searchTerm)) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
      spinner.classList.add('hidden');
      if (searchTerm !== '') this.elements.clearButtonText.classList.remove('visually-hidden');
    }, 500);

    this.elements.clearButton.addEventListener('click', this.clearSearch.bind(this));
  }

  clearSearch() {
    const searchInput = this.querySelector('.localization-search__input');
    searchInput.value = '';
    this.elements.clearButtonText.classList.add('visually-hidden');
    this.elements.listItems.forEach(item => item.style.display = '');
  }
  
  alignPanel() {
    this.isOpen = JSON.parse(this.elements.button.getAttribute('aria-expanded'))
    this.buttonCoordinate = this.elements.button.getBoundingClientRect()
    this.viewportHeight = window.innerHeight
    this.viewportWidth = window.innerWidth
    this.elementCoordinate = this.elements.panel.getBoundingClientRect()
    const panelHeight = this.elements.panel.offsetHeight;
    const panelWidth = this.elements.panel.offsetWidth;
    const spaceBelow = this.viewportHeight - this.buttonCoordinate.bottom;
    const spaceAbove = this.buttonCoordinate.top;

    if (this.closest('.header--disable-stick') || this.closest('.footer')) {
      if (theme.config.isRTL) {
        if (this.elementCoordinate.right > this.viewportWidth - 16) this.elements.panel.style.left = this.viewportWidth - this.elementCoordinate.left - panelWidth - 16 + 'px'
      } else {
        if (this.elementCoordinate.left < 0) this.elements.panel.style.right = this.elementCoordinate.left - 16 + 'px'
      }

      if (this.elementCoordinate.bottom > this.viewportHeight) {
        this.elements.panel.style.bottom = '100%'
        this.elements.panel.style.top = 'auto'
      }
    } else {
      if (spaceBelow >= panelHeight) {
        this.elements.panel.style.top = `${this.buttonCoordinate.bottom}px`;
      } else if (spaceAbove >= panelHeight) {
        this.elements.panel.style.top = `${this.buttonCoordinate.top - panelHeight}px`;
      } else {
        this.elements.panel.style.top = spaceBelow > spaceAbove
            ? `${this.buttonCoordinate.bottom}px`
            : `${this.buttonCoordinate.top - panelHeight}px`;
      }

      if (theme.config.isRTL) {
        this.elementCoordinate.right > this.viewportWidth - 30
          ? this.elements.panel.style.left = `${this.viewportWidth - panelWidth  - 24}px`
          : this.elements.panel.style.left = `${this.buttonCoordinate.left}px`;
      } else {
        this.elementCoordinate.left < 30 
          ? this.elements.panel.style.left = 24 + 'px'  
          : this.elements.panel.style.left = this.buttonCoordinate.right - this.elements.panel.offsetWidth + 'px'
      }

      if (this.elementCoordinate.left < 30 && !this.isOpen) {
        this.elements.panel.style.left = '24px'
      }
      
      if (!this.isOpen) {
        this.elements.panel.style.top = 'auto'
        this.elements.panel.style.left = 'auto'
      }
    }
  }

  hidePanel() {
    if (this.elements.button.getAttribute('aria-expanded') == 'false') return
    this.elements.button.setAttribute('aria-expanded', 'false');
    if(document.body.className.includes('localization-opened')) document.body.classList.remove('localization-opened')
  }

  onContainerKeyUp(event) {
    if (event.code.toUpperCase() !== 'ESCAPE') return;
    this.hidePanel();
    this.elements.button.focus();
  }

  onItemClick(event) {
    event.preventDefault();
    const form = this.querySelector('form');
    this.elements.input.value = event.currentTarget.dataset.value;
    if (form) form.submit();
  }

  toggleSelector() {
    if (event.target.closest('.disclosure__list-wrapper')) return
    this.elements.button.focus();
    if(this.elements.button.getAttribute('aria-expanded') == 'false') {
      this.elements.button.setAttribute('aria-expanded', 'true')
      if(this.closest('.header')) document.body.classList.add('localization-opened')
      if (this.elements.searchInput) this.elements.searchInput.focus()
    } else {
      this.elements.button.setAttribute('aria-expanded', 'false')
      if(this.closest('.header')) document.body.classList.remove('localization-opened')
    }
    setTimeout(this.alignPanel(), 20)
  }
  closeSelector(event) {
    if (event.relatedTarget && !event.relatedTarget.closest('.disclosure__list-wrapper')) {
      this.hidePanel();
      this.elements.button.querySelectorAll('.disclosure__button-icon').forEach(item => item.classList.remove('open'));
    }
  }
}
customElements.define('localization-form', LocalizationForm);

const lockDropdownCount = new WeakMap();
class DetailsDropdown extends HTMLElement {
  constructor() {
    super();

    this.summaryElement = this.firstElementChild
    this.contentElement = this.lastElementChild
    this.button = this.contentElement.querySelector('button')
    this.isOpen = this.hasAttribute('open')
    this.summaryElement.addEventListener('click', this.onSummaryClicked.bind(this))
    this.summaryElement.addEventListener('menu-visible', this.onSummaryClicked.bind(this))
    this.summaryElement.addEventListener('keyup', this.onSummaryKeydown.bind(this))
    if (this.summaryElement.querySelector('.dropdown-icon')) this.summaryElement.querySelector('.dropdown-icon').addEventListener('keyup', () => {document.dispatchEvent(new CustomEvent('menu-visible'))})
    if (this.button) this.button.addEventListener('click', this.onSummaryClicked.bind(this))
    this.detectClickOutsideListener = this.detectClickOutside.bind(this)
    this.detectEscKeyboardListener = this.detectEscKeyboard.bind(this)
    this.detectFocusOutListener = this.detectFocusOut.bind(this)
    this.detectHoverListener = this.detectHover.bind(this)
    this.addEventListener('mouseenter', this.detectHoverListener.bind(this))
    this.addEventListener('mouseleave', this.detectHoverListener.bind(this))
    this.lastScrollPos = 0
    this.megaMenu = this.querySelector('.mega-menu')
    this.header = document.querySelector('.shopify-section-header')
    this.cookieName = 'mrk-theme:active-category';
    this.cookieUrl = 'mrk-theme:active-category-url'
    this.hoverTimeout = null;
    this.init()
    window.addEventListener('resize', this.init.bind(this))

    document.addEventListener('shopify:section:load', (event) => {
      if(event.target.closest('.shopify-section-header') ||  event.target.closest('.shopify-section-announcement-bar')) this.init()
    })
    document.addEventListener('shopify:section:unload', (event) => {
      if(event.target.closest('.shopify-section-header') ||  event.target.closest('.shopify-section-announcement-bar')) this.init()
    })
    this.currentLink = document.querySelector('[data-status="parent"] .active-parent-link.link--current')
    if (this.currentLink) {
      this.setActiveCategory(this.currentLink)
    }
    this.initActiveCategory()
  }

  init() {
    this.megaMenu = this.querySelector('.mega-menu')
    if(!this.megaMenu) return
    this.header = document.querySelector('.shopify-section-header')
    if (this.header && this.header.previousElementSibling) this.headerGroup1 = this.header.previousElementSibling
    if (this.headerGroup1 && this.headerGroup1.previousElementSibling) this.headerGroup2 = this.headerGroup1.previousElementSibling
    if (this.headerGroup2 && this.headerGroup2.previousElementSibling) this.headerGroup3 = this.headerGroup2.previousElementSibling
    this.headerGroupHeight = this.header.querySelector('.header').offsetHeight
    if (this.headerGroup1) this.headerGroupHeight = this.headerGroupHeight + this.headerGroup1.offsetHeight
    if (this.headerGroup2) this.headerGroupHeight = this.headerGroupHeight + this.headerGroup2.offsetHeight
    if (this.headerGroup3) this.headerGroupHeight = this.headerGroupHeight + this.headerGroup3.offsetHeight
    if(this.closest('.header--on_scroll-stick') || this.closest('.header--always-stick') && this.contentElement.classList.contains('mega-menu')) {
      this.style.setProperty('--header-sticky-height', `${this.header.querySelector('.header').getBoundingClientRect().bottom}px`);
    }
    if (this.contentElement.classList.contains('mega-menu')) this.alignedMenu()
  }

  set open(value) {
    if (value !== this.isOpen) {
      this.isOpen = value;
      if (this.isConnected) {
        this.transition(value)
      }
      else {
        value ? this.setAttribute('open', '') : this.removeAttribute('open')
      }
    }
  }

  get open() {
    return this.isOpen
  }

  get trigger() {
    return this.hasAttribute('trigger') ? this.getAttribute('trigger') : 'click'
  }

  get level() {
    return this.hasAttribute('level') ? this.getAttribute('level') : 'top'
  }

  onSummaryKeydown(event) {
    if (event.code === 'Enter' && event.target == this.summaryElement || event.code === 'Enter' && event.target.classList.contains('dropdown-icon')) {
      event.preventDefault();
      this.onSummaryClicked(event);
    }
  }

  onSummaryClicked(event) {
    if (!event.target.closest('a')) {
      this.open = !this.open
    }
    this.setActiveCategory(event.target)
  }

  async transition(value, event = null) {
    if (value) {
      lockDropdownCount.set(DetailsDropdown, lockDropdownCount.get(DetailsDropdown) + 1)
      this.setAttribute('open', '')
      
      this.contentElement.classList.contains('mega-menu') ? document.body.classList.add('mega-menu-opened') : document.body.classList.add('menu-opened')
      this.summaryElement.setAttribute('open', '')
      setTimeout(() => this.contentElement.setAttribute('open', ''), 100)
      this.alignedMenu()
      if (this.contentElement.classList.contains('mega-menu')) {
        document.addEventListener('scroll', () => this.alignedMenu())
      }
      document.addEventListener('click', this.detectClickOutsideListener)
      document.addEventListener('keydown', this.detectEscKeyboardListener)
      document.addEventListener('focusout', this.detectFocusOutListener)
      this.shouldAligned()
    }
    else {
      let isInOpenDropdown = false;
      if (event) isInOpenDropdown = event.target.closest('.popover[open]') || event.target.closest('.mega-menu[open]');
      lockDropdownCount.set(DetailsDropdown, lockDropdownCount.get(DetailsDropdown) - 1);
      this.summaryElement.removeAttribute('open');
      this.contentElement.removeAttribute('open');
      if (!isInOpenDropdown) document.body.classList.remove('menu-opened', 'mega-menu-opened');
      document.removeEventListener('click', this.detectClickOutsideListener);
      document.removeEventListener('keydown', this.detectEscKeyboardListener);
      document.removeEventListener('focusout', this.detectFocusOutListener);
      if (!this.open) this.removeAttribute('open');
      this.alignedMenu();
      if (this.contentElement.classList.contains('mega-menu')) document.removeEventListener('scroll', () => this.alignedMenu())
    }
  }

  alignedMenu() {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if(this.closest('.header--on_scroll-stick') || this.closest('.header--always-stick') && this.contentElement.classList.contains('mega-menu')) {
      this.style.setProperty('--header-sticky-height', `${this.header.querySelector('.header').getBoundingClientRect().bottom}px`);
      return
    }
    if (scrollTop > 0 && scrollTop < this.headerGroupHeight) {
      this.megaMenu.classList.add('mega-menu--top')
      this.style.setProperty('--scroll-height', `${this.headerGroupHeight - scrollTop}px`);
    } else if (!this.closest('.header--on_scroll-stick') && scrollTop > this.headerGroupHeight) {
      this.style.setProperty('--scroll-height', `0px`);
    }
    if (!this.closest('.header--on_scroll-stick') && scrollTop == 0 && this.megaMenu && this.megaMenu.closest('.mega-menu--top')) {
      this.megaMenu.classList.remove('mega-menu--top')
    }
  }

  detectClickOutside(event) {
    if (!this.contains(event.target)) {
      this.open = false
    }
  }

  detectEscKeyboard(event) {
    if (event.code === 'Escape' && this.open) {
      this.open = false;
      document.removeEventListener('keydown', this.detectEscKeyboardListener);
      this.summaryElement.focus();
    }
  }

  detectFocusOut(event) {
    if (event.relatedTarget && !this.contains(event.relatedTarget)) {
      this.open = false
    }
  }

  detectHover(event) {
    if (this.trigger !== 'hover') return;
    if (event.type === 'mouseenter') {
      if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
      this.hoverTimeout = setTimeout(() => {
        this.open = true;
      }, 50);
    } else if (event.type === 'mouseleave') {
      if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
      this.hoverTimeout = setTimeout(() => {
        const isHovered = this.matches(':hover') || this.contentElement.matches(':hover');
        if (!isHovered) {
          this.open = false;
        }
      }, 80);
    }
  }

  shouldAligned() {
    const isRTL = theme.config.isRTL;
    const isMegaMenu = this.contentElement.classList.contains('mega-menu');
    const isShortMegaMenu = this.contentElement.classList.contains('mega-menu-short');
    const isSecondNested = this.contentElement.closest('.second-nested__list');
    const listItemRect = this.contentElement.closest('li').getBoundingClientRect();
    const contentWidth = this.contentElement.offsetWidth;
    const contentRightEdge = listItemRect.left + contentWidth;
    const viewportWidth = window.innerWidth;
  
    if (isMegaMenu && this.closest('.shopify-section-header')) {
      if (!this.header.previousElementSibling) {
        this.headerGroupHeight = this.header.querySelector('.header').offsetHeight;
      }
      this.style.setProperty('--header-height', `${this.headerGroupHeight}px`);
    }
  
    if (isMegaMenu && !isShortMegaMenu) {
      const offsetTop = listItemRect.bottom - this.header.querySelector('.header').getBoundingClientRect().bottom;
      this.style.setProperty('--offset-top', `${offsetTop}px`);
      return;
    }
  
    if (isRTL) {
      if (listItemRect.left - contentWidth < 0 || (isShortMegaMenu && listItemRect.left - contentWidth < 0)) {
        this.contentElement.style.right = `${listItemRect.left - contentWidth + 16}px`;
      }
  
      if (isSecondNested && listItemRect.left - contentWidth < 0) {
        this.contentElement.style.right = '-320px';
      }
    } else {
      if (contentRightEdge > viewportWidth || (isShortMegaMenu && contentRightEdge > viewportWidth)) {
        this.contentElement.style.left = `${viewportWidth - contentRightEdge - 16}px`;
      }
  
      const nestedRightEdge = contentRightEdge + contentWidth;
      if (isSecondNested && nestedRightEdge > viewportWidth) {
        this.contentElement.style.left = '-320px';
      }
    }
  }

  setActiveCategory(targetEl) {
    if (this.dataset.status == 'parent') {
      let activeCategory = targetEl.closest('a').dataset.title
      let activeCategoryUrl = targetEl.closest('a').href
      if (isStorageSupported('local')) window.localStorage.setItem(this.cookieName, activeCategory)
      if (isStorageSupported('local')) window.localStorage.setItem(this.cookieUrl, activeCategoryUrl)
    }
  }

  initActiveCategory() {
    if (isStorageSupported('local')) {
      const activeCategory = window.localStorage.getItem(this.cookieName)
      if (activeCategory !== null) {
        let activeLink
        if (this.querySelector(`[data-title="${activeCategory}"]`)) activeLink = this.querySelector(`[data-title="${activeCategory}"]`)
        if (activeLink) activeLink.classList.add('active-parent-link')
      }
    }
  }
}
customElements.define('details-dropdown', DetailsDropdown)
lockDropdownCount.set(DetailsDropdown, 0)

class DrawerMenu extends HTMLElement {
  constructor() {
    super();

    this.summaryElement = this.firstElementChild
    this.contentElement = this.summaryElement.nextElementSibling
    this.isKeyboardNavigation = false
    this.summaryElement.addEventListener('click', this.onSummaryClicked.bind(this))
    if (this.contentElement) this.button = this.contentElement.querySelector('button')
    if (this.button) this.button.addEventListener('click', (event) => {
      event.stopPropagation();
      this.isKeyboardNavigation = false
      this.isOpen = JSON.parse(this.getAttribute('open'))
      if (this.isOpen) {
        this.button.closest('.nested-submenu').previousElementSibling.setAttribute('open', 'false')
        this.button.closest('.nested-submenu').previousElementSibling.closest('drawer-menu').setAttribute('open', 'false')
        this.button.closest('.nested-submenu').previousElementSibling.classList.add('closing') 
        this.updateTabIndex(this.contentElement, false)
        setTimeout(() => {
          this.button.closest('.nested-submenu').previousElementSibling.classList.remove('closing')
        }, 450)
      }
    })

    this.detectClickOutsideListener = this.detectClickOutside.bind(this)
    this.detectEscKeyboardListener = this.detectEscKeyboard.bind(this)
    this.detectFocusOutListener = this.detectFocusOut.bind(this)
    this.addEventListener('keydown', this.onKeyDown.bind(this));
    this.addEventListener('keydown', (event) => {
      if (event.code === 'Enter') this.onSummaryKeydown()
    });
    this.addEventListener('focusout', this.onFocusOut.bind(this));
  }


  onSummaryClicked(event) {
    if (event && event.target && event.target.closest('a')) return
    event.stopPropagation();
    this.isKeyboardNavigation = false
    if (this.summaryElement.closest('.menu--parent')) {
      this.links = this.summaryElement.closest('.menu--parent').querySelectorAll('.menu__item-title a')
      this.links.forEach(link => link.classList.remove('active-item'))
      if (event && event.target && event.target.querySelector('a')) event.target.querySelector('a').classList.add('active-item')
    }
    this.isOpen = JSON.parse(this.summaryElement.getAttribute('open'))

    if (this.isOpen) {
      this.summaryElement.setAttribute('open', 'false')
      this.setAttribute('open', 'false')
      this.updateTabIndex(this.contentElement, false);
      
    } else {
      this.summaryElement.setAttribute('open', 'true')
      this.setAttribute('open', 'true')
      this.updateTabIndex(this.contentElement, true);
    }
  }

  onSummaryKeydown() {
    if (this.summaryElement.closest('.menu--parent')) {
      event.preventDefault()
      this.links = this.summaryElement.closest('.menu--parent').querySelectorAll('.menu__item-title a')
      this.links.forEach(link => link.classList.remove('active-item'))
      document.activeElement.classList.add('active-item')
    }
  }

  detectClickOutside(event) {
    if (!this.contains(event.target) && !(event.target.closest('details') instanceof DetailsDropdown)) this.open = false
  }

  detectEscKeyboard(event) {
    if (event.code === 'Escape') {
      const targetMenu = event.target.closest('details[open]')
      if (targetMenu) {
        targetMenu.open = false
      }
    }
  }

  onKeyDown(event) {
    const currentFocus = document.activeElement;
    this.isKeyboardNavigation = true

    switch (event.code) {
      case 'Enter':
        if (currentFocus === this.summaryElement) {
          event.preventDefault();
          this.onSummaryClicked();
        }
        break;

      case 'Escape':
        this.updateTabIndex(this.contentElement, false)
        break;
    }
  }

  updateTabIndex(menuElement, isOpen) {
    if (!menuElement) return;

    const directFocusableElements = Array.from(
      menuElement.querySelectorAll(
        ':scope > ul > li > drawer-menu > summary > .menu__item-title > a[href], :scope > ul > li > drawer-menu > summary > .menu__item-title > button:not([disabled]), :scope > .menu-drawer__header button, :scope > ul > li > a[href'
      )
    );

    directFocusableElements.forEach(element => {
      isOpen ? element.setAttribute('tabindex', '0') : element.setAttribute('tabindex', '-1')
    });
  }

  closeSubMenu() {
    this.summaryElement.setAttribute('open', 'false');
    this.setAttribute('open', 'false');
    this.updateTabIndex(this.contentElement, false);
  }

  onFocusOut(event) {
    if (!this.isKeyboardNavigation) return
    setTimeout(() => {
      if (!this.contains(document.activeElement)) {
        this.closeSubMenu();
      }
    }, 50);
  }

  getFocusableElements() {
    if (!menuElement) return []
    return Array.from(
      this.contentElement?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) || []
    );
  }

  detectFocusOut(event) {
    if (event.relatedTarget && !this.contains(event.relatedTarget)) {
      this.open = false
    }
  }

  detectHover(event) {
    if (this.trigger !== 'hover') return;

    if (event.type === 'mouseenter') {
      this.open = true
    }
    else {
      this.open = false
    }
  }
}
customElements.define('drawer-menu', DrawerMenu)

class AddToCart extends HTMLElement {
  constructor() {
    super();

    if(document.querySelector('.shopify-section-cart-drawer')) this.cartDrawerID = document.querySelector('.shopify-section-cart-drawer').id.replace('shopify-section-', '')
    this.headerID = document.querySelector('.shopify-section-header').id.replace('shopify-section-', '')
    if (this.classList.contains('cart-drawer')) this.miniCart = document.querySelector('cart-drawer');
    if (this.classList.contains('cart-notification')) this.miniCart = document.querySelector('cart-notification');
    this.addEventListener('click', (event) => {
      event.preventDefault()
      if (this.querySelector('button[disabled]')) return
      if(this.querySelector('.loading-overlay__spinner')) {
        this.querySelector('.loading-overlay__spinner').classList.remove('hidden')
        setTimeout(() => {
          this.querySelector('.loading-overlay__spinner').classList.add('hidden')
        }, 2000)
      }
      this.onClickHandler(this)
    }) 
  }

  onClickHandler() {
    const variantId = this.dataset.variantId;

    if (variantId) {
      if (document.body.classList.contains('template-cart') ) {
        Shopify.postLink(window.routes.cart_add_url, {
          parameters: {
            id: variantId,
            quantity: 1
          },
        });
        return;
      }

      this.setAttribute('disabled', true);
      this.classList.add('loading');
      const sections = this.miniCart ? this.miniCart.getSectionsToRender().map((section) => section.id) : this.getSectionsToRender().map((section) => section.id);

      const body = JSON.stringify({
        id: variantId,
        quantity: 1,
        sections: sections,
        sections_url: window.location.pathname
      });

      fetch(`${window.routes.cart_add_url}`, { ...fetchConfig('javascript'), body })
        .then((response) => response.json())
        .then((parsedState) => {
          if (parsedState.status === 422) {
             document.dispatchEvent(new CustomEvent('ajaxProduct:error', {
                detail: {
                  errorMessage: parsedState.description
                }
              }));
           }
           else {
            this.miniCart && this.miniCart.renderContents(parsedState);
            this.renderContents(parsedState)
             document.dispatchEvent(new CustomEvent('ajaxProduct:added', {
              detail: {
                product: parsedState
              }
            }));
          }
        })
        .catch((e) => {
          console.error(e);
        })
        .finally(() => {
          this.classList.remove('loading');
          this.removeAttribute('disabled');
        });
    }
  }
  getSectionsToRender() {
    let arraySections = []
    arraySections = [
      {
        id: this.cartDrawerID,
          selector: '#CartDrawer'
      },
      {
        id: this.headerID,
        selector: `#cart-icon-bubble-${this.headerID}`
      }
    ];
    return arraySections
  }
  renderContents(parsedState) {
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section => {
      const sectionElements = document.querySelectorAll(section.selector);
      if(sectionElements) {
        Array.from(sectionElements).forEach(sectionElement => {
          sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
        })
      } 
    }));
  }
  getSectionInnerHTML(html, selector) {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector).innerHTML;
  }
}
customElements.define('add-to-cart', AddToCart);

const announcementBarSwiper = new MultiSwiper('.swiper-announcement', {
  a11y: {
    slideRole: 'listitem'
  },
  loop: true,
  navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
  }
})

const tabsSwiper = new MultiSwiper('.swiper-tabs', {
  loop: false,
  slidesPerView: 'auto'
})

class ShowMoreButton extends HTMLElement {
  constructor() {
    super();

    this.debounceTimeout = null;
    this.arrayContainer = this.closest('.section').querySelector('.show-more-array')
    this.arrayElements = this.arrayContainer.querySelectorAll('.show-more-element')
    this.showMoreButton = this
    this.elemOnDesktop = Number(this.dataset.showDesktop)
    this.elemOnMobile = Number(this.dataset.showMobile)
    this.mobileBreakpoint = isNaN(Number(this.dataset.breakpoint)) ? 1024 : Number(this.dataset.breakpoint);
    this.limit = this.elemOnMobile <= this.elemOnDesktop ? this.elemOnMobile : this.elemOnDesktop

    this.lastWindowWidth = window.innerWidth;
    this.truncateElements = this.truncateElements.bind(this);
    this.debouncedResize = this.debounce(this.truncateElements, 200);
    
    if (this.isMobileDevice()) {
      window.addEventListener('orientationchange', this.truncateElements);
    } else {
      window.addEventListener('resize', this.debouncedResize);
    }
    this.truncateElements();
  }

  debounce(func, wait) {
    return (...args) => {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  isMobileDevice() {
    return 'ontouchstart' in document.documentElement && navigator.userAgent.match(/Mobi/);
  }

  truncateElements() {
    if (window.innerWidth <= this.mobileBreakpoint && this.showMoreButton.className.includes('visually-hidden')) {
      if (this.arrayElements.length > this.limit) {
        Array.from(this.arrayElements).slice(this.limit).forEach((el) => el.classList.add('visually-hidden'));
        this.showMoreButton.classList.remove('visually-hidden')
        this.showMoreButton.querySelector('.button').setAttribute('tabindex', '0')
        this.showMoreButton.addEventListener('click', (evt) => {
          evt.preventDefault();
          this.arrayElements.forEach((el) => el.classList.remove('visually-hidden'));
          this.showMoreButton.classList.add('visually-hidden')
        });
      }
    } else {
      if (!this.showMoreButton.className.includes('visually-hidden')) {
        this.arrayElements.forEach((el) => el.classList.remove('visually-hidden'));
        this.showMoreButton.classList.add('visually-hidden')
        this.showMoreButton.querySelector('.button').setAttribute('tabindex', '-1')
      }
    }
  }
}
customElements.define('show-more-button', ShowMoreButton);
class OverlapHeader extends HTMLElement {
  constructor() {
    super();
    this.header = this.querySelector('.shopify-section-header')
    this.passwordHeader = this.querySelector('.shopify-section-password-header')
    this.section = this.querySelectorAll('main .shopify-section')[0]
    this.sectionWrapper = this.querySelector('main .shopify-section:first-child .section')
    this.toggleDesktopOverlap()
    document.addEventListener('shopify:section:load', () => {
      this.header = this.querySelector('.shopify-section-header')
      this.passwordHeader = this.querySelector('.shopify-section-password-header')
      this.sectionWrapper = this.querySelector('main .shopify-section:first-child .section')
      this.toggleDesktopOverlap()
    })
    document.addEventListener('shopify:section:unload', () => {
      setTimeout(() => {
        this.header = this.querySelector('.shopify-section-header')
        this.passwordHeader = this.querySelector('.shopify-section-password-header')
        this.sectionWrapper = this.querySelector('main .shopify-section:first-child .section')
        this.toggleDesktopOverlap()
      }, 10)
    })
    document.addEventListener('shopify:section:reorder', () => {
      this.header = this.querySelector('.shopify-section-header')
      this.passwordHeader = this.querySelector('.shopify-section-password-header')
      this.sectionWrapper = this.querySelector('main .shopify-section:first-child .section')
      this.toggleDesktopOverlap()
    })
  }

  toggleDesktopOverlap() {
    if (this.sectionWrapper) {
      this.sectionWrapper.classList.contains('section-overlap--enable') ? this.header.classList.add('overlap-enable') : this.header.classList.remove('overlap-enable')
      this.sectionWrapper.classList.contains('section-overlap--desktop') ? this.header.classList.add('overlap-desktop') : this.header.classList.remove('overlap-desktop')
      this.sectionWrapper.classList.contains('section-overlap--mobile') ? this.header.classList.add('overlap-mobile') : this.header.classList.remove('overlap-mobile')
      if (this.passwordHeader) {
        this.sectionWrapper.classList.contains('section-overlap--enable') ? this.passwordHeader.classList.add('overlap-enable') : this.passwordHeader.classList.remove('overlap-enable')
        this.sectionWrapper.classList.contains('section-overlap--desktop') ? this.passwordHeader.classList.add('overlap-desktop') : this.passwordHeader.classList.remove('overlap-desktop')
        this.sectionWrapper.classList.contains('section-overlap--mobile') ? this.passwordHeader.classList.add('overlap-mobile') : this.passwordHeader.classList.remove('overlap-mobile')
      }
    }
  }
}
customElements.define('overlap-header', OverlapHeader);
class PromoPopup extends HTMLElement {
  constructor() {
    super();

    // Prevent popup on Shopify robot challenge page
    if (window.location.pathname === '/challenge') {
      return;
    }

    this.cookieName = this.closest('section').getAttribute('id');

    this.classes = {
      bodyClass: 'hidden',
      openClass: 'open',
      closingClass: 'is-closing',
      showImage: 'show-image'
    };

    this.popup = this.querySelector('.popup')
    this.stickyTab = this.querySelector('.promo-sticky-tab')
    this.openTabButton = this.querySelector('.open-sticky-tab')
    this.closeTabButton = this.querySelector('.close-sticky-tab')
    this.overlay = document.body.querySelector('body > .overlay')
    this.hasPopupedUp = false

    this.querySelectorAll('[data-popup-toggle]').forEach((button) => {
      button.addEventListener('click', this.onButtonClick.bind(this));
    });
    this.openStickyTab()
    if (!this.getCookie(this.cookieName)) {
      this.init();
    }

    document.addEventListener('keydown', (event) => {
      if (event.code && event.code.toUpperCase() === 'ESCAPE' && this.querySelector('.popup--popup.open')) this.closePopup()
    })
    
    if (this.closeTabButton) this.closeTabButton.addEventListener('click', this.closeStickyTab.bind(this))
  }

  connectedCallback() {
    if (Shopify.designMode) {
      this.onShopifySectionLoad = this.onSectionLoad.bind(this);
      this.onShopifySectionSelect = this.onSectionSelect.bind(this);
      this.onShopifySectionDeselect = this.onSectionDeselect.bind(this);
      document.addEventListener('shopify:section:load', this.onShopifySectionLoad);
      document.addEventListener('shopify:section:select', this.onShopifySectionSelect);
      document.addEventListener('shopify:section:deselect', this.onShopifySectionDeselect);
    }
  }
  disconnectedCallback() {
    if (Shopify.designMode) {
      document.removeEventListener('shopify:section:load', this.onShopifySectionLoad);
      document.removeEventListener('shopify:section:select', this.onShopifySectionSelect);
      document.removeEventListener('shopify:section:deselect', this.onShopifySectionDeselect);

      document.body.classList.remove(this.classes.bodyClass);
    }
  }
  onSectionLoad(event) {
    filterShopifyEvent(event, this, () => this.openPopup.bind(this));
  }
  onSectionSelect(event) {
    filterShopifyEvent(event, this, () => {
      if (Shopify.designMode && this.closest('.shopify-section-group-overlay-group')) {
        document.body.classList.add('disable-scroll-body');
      }

      this.openPopup.call(this)
    });
  }
  onSectionDeselect(event) {
    filterShopifyEvent(event, this, this.closePopup.bind(this));
  }

  init() {
    if (Shopify && Shopify.designMode) {
      return;
    }

    let delayValue;

    switch (this.dataset.delayType) {
      case 'timer':
        Shopify.designMode ? delayValue = 0 : delayValue = parseInt(this.dataset.delay)

        setTimeout(function() {
          if(!document.body.className.includes('hidden')) {
            this.openPopup()
          } else if (!this.getCookie(this.cookieName)) {
            document.addEventListener('body:visible', () => {
              if(!document.body.className.includes('hidden')) setTimeout(() => this.openPopup(), 1000)
            })
          }
        }.bind(this), delayValue * 1000)

        break
      case 'scroll':
        delayValue = parseInt(this.dataset.delay.slice(10).slice(0, -1), 10)

        const scrollPercent = delayValue / 100;
        let scrollTarget;

        window.addEventListener('load', () => {
          scrollTarget = (document.body.scrollHeight - window.innerHeight) * scrollPercent;
          document.addEventListener('scroll', () => {
            if (window.scrollY >= scrollTarget && !this.hasPopupedUp) this.openPopup()
          })
        })

        break
      case 'cursor-top':
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouchDevice) return;

        const handleMouseOut = (e) => {
          if (
            !this.hasPopupedUp &&
            !this.getCookie(this.cookieName) &&
            e.relatedTarget === null &&
            e.clientY <= 0
          ) {
            this.openPopup();
            this.setCookie(this.cookieName, this.dataset.frequency);
            document.removeEventListener('mouseout', handleMouseOut);
          }
        };

        document.addEventListener('mouseout', handleMouseOut);
        break;
    }
  }

  onButtonClick(event) {
    event.preventDefault();
    this.popup.classList.contains(this.classes.openClass) ? this.closePopup() : this.openPopup();
  }

  openPopup() {
    document.body.classList.remove(this.classes.bodyClass)
    this.popup.classList.add(this.classes.openClass)
    if (!this.popup.classList.contains('flyout') && this.overlay && !this.overlay.classList.contains(this.classes.openClass)) this.overlay.classList.add(this.classes.openClass);

    if (this.popup.dataset.position === 'popup') {
      document.body.classList.add(this.classes.bodyClass);
    }
    if (this.stickyTab) this.closeStickyTab()
    this.hasPopupedUp = true
    document.querySelectorAll('promo-popup').forEach(item => {
      if(!item.querySelector('.popup').closest('.open') && !item.querySelector('.age-verification')) item.closest('section').style.zIndex = '27'
    })
  }

  closePopup() {
    if (Shopify.designMode && this.closest('.shopify-section-group-overlay-group')) {
      document.body.classList.remove('disable-scroll-body');
    }

    this.popup.classList.add(this.classes.closingClass)

    setTimeout(() => {
      this.popup.classList.remove(this.classes.openClass)
      if (this.overlay) this.overlay.classList.remove(this.classes.openClass)
      this.popup.classList.remove(this.classes.closingClass)
      this.popup.classList.remove(this.classes.showImage)
      this.openStickyTab()
      document.querySelectorAll('promo-popup').forEach(item => {
        if(item.closest('section').getAttribute('style')) item.closest('section').removeAttribute('style')
      })
      if (this.popup.dataset.position === 'popup') document.body.classList.remove(this.classes.bodyClass)
      if (this.querySelector('.age-verification')) document.dispatchEvent(new CustomEvent('body:visible'));
    })
    if (Shopify.designMode) {
      this.removeCookie(this.cookieName)
      return;
    }
    this.setCookie(this.cookieName, this.dataset.frequency)
  }

  openStickyTab() {
    if (!this.stickyTab) return
    this.stickyTab.classList.add(this.classes.openClass)
  }

  closeStickyTab() {
    if (!this.stickyTab) return
    this.stickyTab.classList.remove(this.classes.openClass)
  }

  getCookie(name) {
    let match = document.cookie.match(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`);
    return match ? match[2] : null;
  }

  setCookie(name, frequency) {
    document.cookie = `${name}=true; max-age=${(frequency * 60 * 60)}; path=/`;
  }

  removeCookie(name) {
    document.cookie = `${name}=; max-age=0`;
  }
}
customElements.define('promo-popup', PromoPopup);

class VideoControls extends HTMLElement {
  constructor() {
    super();

    this.videoElement = this.closest('.video-controls-js').querySelector('video');
    this.pauseButton = this.querySelector('.button--pause');
    this.muteButton = this.querySelector('.button--mute');
    
    if(this.pauseButton) this.updatePauseButton.bind(this);
    if(this.muteButton) this.updateMuteButton.bind(this);

    if(this.pauseButton) this.pauseButton.addEventListener('click', (event) => this.togglePlayPause(event));
    if(this.muteButton) this.muteButton.addEventListener('click', (event) => this.toggleMuteUnmute(event));

    if(this.videoElement) this.videoElement.muted = true;
  }

  togglePlayPause(event) {
    event.preventDefault()
    if (this.videoElement.paused) {
      this.videoElement.play();
    } else {
      this.videoElement.pause();
    }
    this.updatePauseButton();
  }

  toggleMuteUnmute(event) {
    event.preventDefault()
    this.videoElement.muted = !this.videoElement.muted;
    this.updateMuteButton();
  }

  updatePauseButton() {
    if (this.videoElement.paused) {
      this.pauseButton.classList.add('pause');
      this.pauseButton.classList.remove('play');
      this.pauseButton.setAttribute('aria-label', `${window.accessibilityStrings.play}`)
    } else {
      this.pauseButton.classList.add('play');
      this.pauseButton.classList.remove('pause');
      this.pauseButton.setAttribute('aria-label', `${window.accessibilityStrings.pause}`)
    }
  }

  updateMuteButton() {
    if (this.videoElement.muted) {
      this.muteButton.classList.add('mute');
      this.muteButton.classList.remove('unmute');
      this.muteButton.setAttribute('aria-label', `${window.accessibilityStrings.unmute}`)
    } else {
      this.muteButton.classList.add('unmute');
      this.muteButton.classList.remove('mute');
      this.muteButton.setAttribute('aria-label', `${window.accessibilityStrings.mute}`)
    }
  }
}
customElements.define('video-controls', VideoControls);

class CascadingGrid extends HTMLElement {
  constructor() {
      super();
      this.createGrid()
      document.addEventListener('shopify:section:load', () => {
         setTimeout(() => this.createGrid(), 100) 
      })
    }

    createGrid() {
      var elem = this.querySelector('.grid');
      if (elem) var msnry = new Masonry( elem, {itemSelector: '.grid-item'})
    }
}

customElements.define('cascading-grid', CascadingGrid);

class GridSwitcher extends HTMLElement {
  constructor() {
    super();

    this.gridType = this.dataset.gridType;

    this.addEventListener('click', (e) => this.handleClick(e));
    this.addEventListener('keydown', (e) => this.handleKeyPress(e));

    window.addEventListener('resize', () => this.hideSecondaryOptionOnMobile());
  }

  connectedCallback() {
    this.setSectionElementsRefs();
    this.hideSecondaryOptionOnMobile();

    if (!this.gridTypeOptionExists(this.gridType)) {
      this.updateGridTypeAndReloadSection();
    }
  }

  setSectionElementsRefs() {
    this.section = this.closest('section');
    this.sectionId = this.section.id.split('shopify-section-')[1];
    this.productGrid = document.querySelector(`#product-grid--${this.sectionId}`);
    this.options = Array.from(this.querySelectorAll('.grid-switcher__option:not(.grid-switcher__option--hidden)'));
  }

  gridTypeOptionExists(gridType) {
    return this.options.some(option => option.dataset.gridType === gridType);
  }

  async updateGridTypeAndReloadSection(setGridSwitcherOptionLoader = false) {
    const savedGridType = localStorage.getItem("product-grid-type");
    const gridType = this.gridTypeOptionExists(savedGridType) ? savedGridType : "default";
  
    try {
      await this.updateCartAttribute("grid_type", gridType);
      await this.reloadSection(setGridSwitcherOptionLoader);
    } catch (error) {
      console.error("Error updating grid style:", error);
    }
  }
  
  async updateCartAttribute(attribute, value) {
    return fetch("/cart/update.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attributes: { [attribute]: value } }),
    });
  }
  
  async reloadSection(setGridSwitcherOptionLoader = false) {
    let gridType, nextActiveOption;

    if (setGridSwitcherOptionLoader) {
      gridType = localStorage.getItem("product-grid-type") || "default";
      nextActiveOption = this.querySelector(`.grid-switcher__option:not(.grid-switcher__option--hidden)[data-grid-type='${gridType}']`);

      nextActiveOption.classList.add('grid-switcher__option--loading');
      this.closest('section').classList.add('grid-switcher-loading')
    }

    const url = new URL(window.location.href);
    url.searchParams.set("section_id", this.sectionId);
    if (url.searchParams.has("page")) {
      url.searchParams.delete("page");
    }

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error("Failed to fetch section HTML");
  
    const html = await response.text();
    const dom = new DOMParser().parseFromString(html, "text/html");
    const updatedSection = dom.getElementById(`shopify-section-${this.sectionId}`);
  
    if (!updatedSection) throw new Error("Updated section not found");
  
    if (setGridSwitcherOptionLoader) {
      nextActiveOption.classList.remove('grid-switcher__option--loading');
      this.closest('section').classList.remove('grid-switcher-loading')
    }

    this.section.replaceWith(updatedSection);
    this.removeSearchParam('page');
    preloadImages(updatedSection);
    const newSliders = updatedSection.querySelectorAll('.swiper-product-card');
    newSliders.forEach(initializeSwiper);
  }

  removeSearchParam(param) {
    const url = new URL(window.location.href);

    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      window.history.replaceState({}, "", url.toString());
    }
  }

  getCurrentGridType() {
    const activeOptions = this.querySelectorAll('.grid-switcher__option--active');
    const activeOption = Array.from(activeOptions).at(-1);

    return activeOption.dataset.gridType;
  }

  handleClick() {    
    const currentGridType = this.getCurrentGridType();
    const nextGridType = this.getNextGridType(currentGridType);
    
    localStorage.setItem("product-grid-type", nextGridType);

    this.updateGridTypeAndReloadSection(true);
  }

  handleKeyPress(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.handleClick(); 
    }
  }
  
  hideSecondaryOptionOnMobile() {
    const mobileBreakpoint = 768;
    const isSmallScreen = window.matchMedia(`(max-width: ${mobileBreakpoint}px)`).matches;
    if (this.wasSmallScreen === isSmallScreen) {
      return;
    }

    this.wasSmallScreen = isSmallScreen;

    const secondaryOption = this.querySelector('.grid-switcher__option[data-grid-type="secondary"]');
    if (!secondaryOption) {
      return;
    }
    
    secondaryOption.classList.toggle('grid-switcher__option--hidden', isSmallScreen);
    this.options = Array.from(this.querySelectorAll('.grid-switcher__option:not(.grid-switcher__option--hidden)'));

    if (this.getCurrentGridType() === 'secondary' && isSmallScreen) {
      localStorage.setItem("product-grid-type", 'default');
      this.updateGridTypeAndReloadSection();
    }
  }

  getNextGridType(gridType) {
    const gridTypesSequence = this.options.map(option => option.dataset.gridType);
    const currentGridTypeIndex = gridTypesSequence.indexOf(gridType);
    const isLastInSequence = currentGridTypeIndex === (gridTypesSequence.length - 1);

    return isLastInSequence ? gridTypesSequence[0] : gridTypesSequence[currentGridTypeIndex + 1];
  }
}

customElements.define('grid-switcher', GridSwitcher);

class VariantPicker extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', (event) => this.handleProductUpdate(event));
    this.initializeProductSwapUtility();
    this.priceInsideButton = false
    this.buttonIcon = false
    if(this.closest('.product__info-wrapper').querySelector('.price-inside-button')) this.priceInsideButton = true
    if(document.querySelector('.product-sticky-cart')) this.buttonIcon = true
    this.productWrapper = this.closest('.section') || this.closest('.quick-view')
  }

  initializeProductSwapUtility() {
    this.swapProductUtility = new HTMLUpdateUtility();
    this.swapProductUtility.addPreProcessCallback((html) => {
      return html;
    });
    this.swapProductUtility.addPostProcessCallback((newNode) => {
      window?.Shopify?.PaymentButton?.init();
      window?.ProductModel?.loadShopifyXR();
      publish(PUB_SUB_EVENTS.sectionRefreshed, {
        data: {
          sectionId: this.dataset.section,
          resource: {
            type: SECTION_REFRESH_RESOURCE_TYPE.product,
            id: newNode.querySelector('variant-picker').dataset.productId,
          },
        },
      });
    });
  }

  handleProductUpdate(event) {
    let loader 
    if (this.productWrapper.querySelector('.product-form__submit .loading-overlay__spinner')) loader = this.productWrapper.querySelector('.product-form__submit .loading-overlay__spinner').innerHTML
    const addButton = this.productWrapper.querySelector('.product-form__submit[name="add"]');
    if (addButton) addButton.innerHTML = `<div class="loading-overlay__spinner">${loader}</div>`
    this.handleFunctionProductUpdate(event)
    
    document.dispatchEvent(new CustomEvent('variant:change', {
      detail: {
        variant: this.currentVariant
      }
    }))
  }

  handleFunctionProductUpdate(event) {
    const input = this.getInputForEventTarget(event.target);
    const targetId = input.id;
    let targetUrl = input.dataset.productUrl;
    this.currentVariant = this.getVariantData(targetId);
    const sectionId = this.dataset.originalSection || this.dataset.section;
    this.updateSelectedSwatchValue(event);
    this.toggleAddButton(true, '', false);
    this.removeErrorMessage();

    let callback = () => {};
    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true);
      this.setUnavailable();
      if(this.querySelector('.product-combined-listings')) callback = this.handleSwapProduct(sectionId, true)
    } else if (this.dataset.url !== targetUrl) {
      this.updateMedia();
      this.updateURL(targetUrl);
      this.updateVariantInput();
      this.querySelector('.product-combined-listings') ? callback = this.handleSwapProduct(sectionId) : callback = this.handleUpdateProductInfo(sectionId);
    }

    this.renderProductInfo(sectionId, targetUrl, targetId, callback);
  }

  updateSelectedSwatchValue({ target }) {
    const { value, tagName } = target;
    if (tagName === 'INPUT' && target.type === 'radio') {
      const selectedSwatchValue = target.closest(`.product-form__input`).querySelector('[data-selected-value]');
      if (selectedSwatchValue) selectedSwatchValue.innerHTML = value;
    }
  }

  updateMedia() {
    if (!this.currentVariant) return;
    if (this.currentVariant.featured_media) {
      const mediaGallery = document.getElementById(`MediaGallery-${this.dataset.section}`);
      mediaGallery.setActiveMedia(`${this.dataset.section}-${this.currentVariant.featured_media.id}`, true);
    }
    document.dispatchEvent(new CustomEvent('updateVariantMedia'))
  }

  updateURL(url) {
    if (this.dataset.updateUrl === 'false') return;
    window.history.replaceState({ }, '', `${url}${this.currentVariant?.id ? `?variant=${this.currentVariant.id}` : ''}`);
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(`#product-form-${this.dataset.section}, #product-form-${this.dataset.section}--alt, #product-form-installment`);
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant ? this.currentVariant.id : ''
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector('pickup-availability');
    if (!pickUpAvailability) return;
    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute('available');
      pickUpAvailability.innerHTML = '';
    }
  }

  getInputForEventTarget(target) {
    return target.tagName === 'SELECT' ? target.selectedOptions[0] : target;
  }

  getVariantData(inputId) {
    return JSON.parse(this.getVariantDataElement(inputId).textContent);
  }

  getVariantDataElement(inputId) {
    return this.querySelector(`script[type="application/json"][data-resource="${inputId}"]`);
  }

  removeErrorMessage() {
    const section = this.closest('section');
    if (!section) return;

    const productForm = section.querySelector('product-form');
    if (productForm) productForm.handleErrorMessage();
  }

  getWrappingSection(sectionId) {
    return (
      this.closest(`section[data-section="${sectionId}"]`) || // main-product
      this.closest(`#shopify-section-${sectionId}`) || // featured-product
      null
    );
  }

  handleSwapProduct(sectionId, unavailableProduct = false)  {
    return (html) => {
      const oldContent = this.getWrappingSection(sectionId);
      if (!oldContent) {
        return;
      }
      document.getElementById(`ProductModal-${sectionId}`)?.remove();

      const response =
        html.querySelector(`section[data-section="${sectionId}"]`) /* main/quick-view */ ||
        html.getElementById(`shopify-section-${sectionId}`); /* featured product*/

      this.swapProductUtility.viewTransition(oldContent, response);
      this.updateCurrentVariant(html)
      this.updateVariantImage(html)
      if(unavailableProduct) {
        this.toggleAddButton(true, '', true);
        this.setUnavailable();
      } 
      else {
        if (this.currentVariant) this.toggleAddButton(!this.currentVariant.available, variantStrings.soldOut);
      }
    };
  }

  handleUpdateProductInfo(sectionId) {
    return (html) => {
      this.updatePickupAvailability();
      this.updateSKU(html);
      this.updateStoreLocator(html);
      this.updatePrice(html);
      this.updatePriceAlt(html);
      this.updateCurrentVariant(html);
      this.updateVariantImage(html);
      this.updateColorName(html);
      this.updateInventoryStatus(html);
      if (this.currentVariant) this.toggleAddButton(!this.currentVariant.available, variantStrings.soldOut);
      this.updateOptionValues(html);
      this.updateProductUrl(html);
      publish(PUB_SUB_EVENTS.variantChange, {
        data: {
          sectionId,
          html,
          variant: this.currentVariant,
        },
      });
    };
  }

  updateOptionValues(html) {
    const variantSelects = html.querySelector('variant-picker');
    if (variantSelects) this.innerHTML = variantSelects.innerHTML;
  }

  getSelectedOptionValues() {
    const elements = this.querySelectorAll('select option[selected], .product-form__input input:checked');

    let selectedValues = Array.from(elements).map(
      (element) => element.dataset.optionValueId
    );

    this.optionsSize = this.dataset.optionsSize
    if (selectedValues.length < this.optionsSize) {
      const fieldsets = this.querySelectorAll('.product-form__input');
      fieldsets.forEach((fieldset) => {
        const checkedInput = fieldset.querySelector('input:checked');
        if (!checkedInput) {
          const fallbackInput = fieldset.querySelector('input[checked]');
          if (fallbackInput) {
            const value = fallbackInput.dataset.optionValueId;
            if (value && !selectedValues.includes(value)) selectedValues.push(value);
          }
        }
      });
    }

    return selectedValues;
  }

  renderProductInfo(sectionId, url, targetId, callback) {
    const variantParam = this.currentVariant?.id
    ? `variant=${this.currentVariant.id}`
    : '';
    if(!url) url = this.dataset.url
    const fetchUrl = variantParam
    ? `${url}?${variantParam}&section_id=${sectionId}`
    : `${url}?section_id=${sectionId}`;
    fetch(fetchUrl)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        callback(html);
      })
      .then(() => {
        // set focus to last clicked option value
        document.getElementById(targetId).focus();
      })
  }

  updateSKU(html) {
    const id = `sku-${this.dataset.section}`;
    const destination = document.getElementById(id);
    const source = html.getElementById(id);

    if (source && destination) destination.innerHTML = source.innerHTML;
    if (destination) destination.classList.remove('visually-hidden');
    if (!source && destination) destination.classList.add('visually-hidden')
  }

  updateStoreLocator(html) {
    const id = `store_locator-${this.dataset.section}`;
    const destination = document.getElementById(id);
    const source = html.getElementById(id);

    if (source && destination) destination.innerHTML = source.innerHTML;
    if (destination) destination.classList.remove('visually-hidden');
    if (!source && destination) destination.classList.add('visually-hidden')
  }

  updatePrice(html) {
    const id = `price-${this.dataset.section}`;
    const destination = document.getElementById(id).querySelector('.price-block__price');
    const source = html.getElementById(id).querySelector('.price-block__price');
    if (source && destination) destination.innerHTML = source.innerHTML;
    if (destination) document.getElementById(id).classList.remove('visually-hidden');
  }

  updateCurrentVariant(html) {
    const id = `current-variant-${this.dataset.section}`;
    const destination = document.getElementById(id);
    const source = html.getElementById(id);

    if (source && destination) destination.innerHTML = source.innerHTML;
    if (destination) destination.classList.remove('visually-hidden');
  }

  updateVariantImage(html) {
    const id = `variant-image-${this.dataset.section}`;
    const destination = document.getElementById(id);
    const source = html.getElementById(id);

    if (source && destination) destination.innerHTML = source.innerHTML;
    if (destination) destination.classList.remove('visually-hidden');
  }

  updatePriceAlt(html) {
    const id = `price-${this.dataset.section}--alt`;
    const destination = document.getElementById(id);
    const source = html.getElementById(id);

    if (source && destination) destination.innerHTML = source.innerHTML;
    if (destination) destination.classList.remove('visually-hidden');
  }

  updateColorName(html) {
    const id = `color-${this.dataset.section}`;
    const destination = document.getElementById(id);
    const source = html.getElementById(id);

    if (source && destination) destination.innerHTML = source.innerHTML;
    if (destination) destination.classList.remove('visually-hidden');
  }

  updateInventoryStatus(html) {
    const id = `inventory-${this.dataset.section}`;
    const destination = document.getElementById(id);
    const source = html.getElementById(id);

    if (source && destination) destination.innerHTML = source.innerHTML;
    if (destination) destination.classList.remove('visually-hidden');
  }

  updateProductUrl(html) {
    const currentUrl = window.location.href;
    const id = `#product-url-${this.dataset.section} input`;
    const destination = document.querySelector(id);
    const source = html.querySelector(id);
    if (source && destination) destination.setAttribute('value', `${currentUrl}`);
    if (destination) destination.classList.remove('visually-hidden');
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForms = document.querySelectorAll(`#product-form-${this.dataset.section}, #product-form-${this.dataset.section}--alt`);
    const loader = this.productWrapper.querySelector('.loading-overlay__spinner').innerHTML
    productForms.forEach((productForm) => {
      const addButton = productForm.querySelector('[name="add"]');
      if (!addButton) return;
      let priceContent = ''
      let buttonIcon = ''
      if(this.buttonIcon) buttonIcon = document.querySelector('.product-form__buttons-icon').innerHTML
      if(this.priceInsideButton) priceContent = document.getElementById(`price-${this.dataset.section}`).querySelector('.price-block__price').innerHTML
      if (disable) {
        addButton.setAttribute('disabled', true);
        addButton.setAttribute('data-sold-out', true);
        if (text) addButton.innerHTML = `<span class="price-inside-button">${priceContent}</span><span>${text}</span><span class="product-form__buttons-icon">${buttonIcon}</span> <div class="loading-overlay__spinner hidden">${loader}</div>`;
      }
      else {
        addButton.removeAttribute('disabled');
        addButton.removeAttribute('data-sold-out');
        addButton.innerHTML = addButton.dataset.preOrder === 'true' ? `<span class="price-inside-button">${priceContent}</span><span>${variantStrings.preOrder}</span><span class="product-form__buttons-icon">${buttonIcon}</span> <div class="loading-overlay__spinner hidden">${loader}</div>` : `<span class="price-inside-button">${priceContent}</span><span>${variantStrings.addToCart}</span><span class="product-form__buttons-icon">${buttonIcon}</span> <div class="loading-overlay__spinner hidden">${loader}</div>`;
      }
      if (!modifyClass) return;
    });
  }

  setUnavailable() {
    const productForms = document.querySelectorAll(`#product-form-${this.dataset.section}, #product-form-${this.dataset.section}--alt`);
    const loader = this.productWrapper.querySelector('.loading-overlay__spinner').innerHTML
    productForms.forEach((productForm) => {
      const addButton = productForm.querySelector('[name="add"]');
      if (!addButton) return;
      addButton.removeAttribute('data-sold-out');
      let priceContent = ''
      let buttonIcon = ''
      if(this.buttonIcon) buttonIcon = document.querySelector('.product-form__buttons-icon').innerHTML
      if(this.priceInsideButton) priceContent = document.getElementById(`price-${this.dataset.section}`).querySelector('.price').innerHTML
      addButton.innerHTML = `<span class="price-inside-button">${priceContent}</span><span>${variantStrings.unavailable}</span> <span class="product-form__buttons-icon">${buttonIcon}</span> <div class="loading-overlay__spinner hidden">${loader}</div>`;

      const price = document.getElementById(`price-${this.dataset.section}`);
      if (price) price.classList.add('visually-hidden');

      const priceAlt = document.getElementById(`price-${this.dataset.section}--alt`);
      if (priceAlt) priceAlt.classList.add('visually-hidden');

      const inventory = document.getElementById(`inventory-${this.dataset.section}`);
      if (inventory) inventory.classList.add('visually-hidden');

      const sku = document.getElementById(`sku-${this.dataset.section}`);
      if (sku) sku.classList.add('visually-hidden');
      
      const storeLocator = document.getElementById(`store_locator-${this.dataset.section}`);
      if (storeLocator) storeLocator.classList.add('visually-hidden');
    });
  }
}

customElements.define('variant-picker', VariantPicker);

class CountdownTimer extends HTMLElement {
  constructor() {
    super();

    const endDate = this.getAttribute('end-date'),
          endTime = this.getAttribute('end-time') || "00:00",
          timezoneOffset = this.getAttribute('timezone-offset'),
          expirationAction = this.getAttribute('expiration-action'),
          enableAnimation = this.getAttribute('enable-animation'),
          sectionId = this.getAttribute('section-id'),
          productHandle = this.getAttribute('product-handle');

    this.endDate = endDate;
    this.endTime = endTime;
    this.timezoneOffset = timezoneOffset;
    this.expirationAction = expirationAction;
    this.enableAnimation = enableAnimation === "true";
    this.sectionId = sectionId;
    this.productHandle = productHandle;
    this.animationDuration = 300;

    if (Shopify.designMode) {
      document.addEventListener('shopify:section:load', this.onSectionLoad.bind(this))
    }

    this.init();
  }

  onSectionLoad(e) {
    const sectionsToRerender = ['shopify-section-announcement-bar'];
    const sectionElement = document.getElementById('shopify-section-' + e.detail.sectionId);
    
    if (sectionsToRerender.some(className => sectionElement.classList.contains(className))) {
      this.init();
    }
  }

  disconnectedCallback() {
    if (Shopify.designMode) {
      document.removeEventListener('shopify:section:load', this.init)
    }
  }

  async init() {
    if (!this.endDate && this.productHandle) {
      await this.fetchEndDateTimeAndMessage();
    }

    this.deadlineTimestamp = new Date(`${this.endDate}T${this.endTime}`).getTime();

    const isDateValid = this.isDateValid(this.endDate);
    const isTimeValid = this.isTimeValid(this.endTime);
    const remainingTime = this.getRemainingTime(this.deadlineTimestamp);

    if (!isDateValid || !isTimeValid || !this.deadlineTimestamp || remainingTime.days > 99) {     
      if (Shopify.designMode) {
        this.classList.add('countdown--visible');

        return;
      } 
    
      this.removeCountdownTimer();
      
      return;
    }
    
    this.countdownTimer = this.querySelector('.countdown__timer');
    this.countdownCompleteMessage = this.querySelector('.countdown-complete-message');
    this.daysTens = this.querySelector('.countdown-days-tens');
    this.daysOnes = this.querySelector('.countdown-days-ones');
    this.hoursTens = this.querySelector('.countdown-hours-tens');
    this.hoursOnes = this.querySelector('.countdown-hours-ones');
    this.minutesTens = this.querySelector('.countdown-minutes-tens');
    this.minutesOnes = this.querySelector('.countdown-minutes-ones');
    this.secondsTens = this.querySelector('.countdown-seconds-tens');
    this.secondsOnes = this.querySelector('.countdown-seconds-ones');
    
    if (remainingTime.total > 0) {
      this.updateTimer();
      this.updateTimerIntervalId = setInterval(this.updateTimer.bind(this), 1000);
    } else if (this.productHandle) {
      this.onTimerExpire();
    } else if (this.expirationAction === 'hide_timer' || (this.expirationAction === 'show_message' && !this.countdownCompleteMessage)) {
      this.removeCountdownParent();
    }    

    this.classList.add('countdown--visible');   
  }

  async fetchEndDateTimeAndMessage() {
    await fetch(`/products/${this.productHandle}`)
    .then(response => response.text())
    .then(html => {
      const parser = new DOMParser();
      const timerOnProductPage = parser.parseFromString(html, 'text/html').querySelector('.countdown');

      const endDate = timerOnProductPage.getAttribute('end-date');
      const endTime = timerOnProductPage.getAttribute('end-time');
      
      this.setAttribute('end-date', endDate);
      this.setAttribute('end-time', endTime);
      
      const completeMessage = timerOnProductPage.getAttribute('complete-message');
      const completeMessageElement = this.querySelector('.countdown__complete-message');

      if (completeMessageElement) {
        completeMessageElement.innerHTML = completeMessage;
        this.setAttribute('complete-message', completeMessage);
      }
      
      this.endDate = endDate;
      this.endTime = endTime;

      const timerBlock = document.querySelector(`.countdown`);
      const timerBlockCopy = timerBlock.cloneNode(true);

      timerBlock.replaceWith(timerBlockCopy); // trigger rerender of countdown timer block
    })
    .catch(err => { 
      this.removeCountdownTimer();
    });
  }

  updateTimer() {
    const padWithZero = (num) => num.toString().padStart(2, '0');

    const remainingTime = this.getRemainingTime(this.deadlineTimestamp);
    const [days, hours, minutes, seconds] = [
      padWithZero(remainingTime.days),
      padWithZero(remainingTime.hours),
      padWithZero(remainingTime.minutes),
      padWithZero(remainingTime.seconds)
    ];
  
    const timerPartsMap = [
      { tens: this.daysTens, ones: this.daysOnes, value: days },
      { tens: this.hoursTens, ones: this.hoursOnes, value: hours },
      { tens: this.minutesTens, ones: this.minutesOnes, value: minutes },
      { tens: this.secondsTens, ones: this.secondsOnes, value: seconds }
    ];
  
    timerPartsMap.forEach(({ tens, ones, value }) => {
      this.animateNumberChange(tens, value[0]);
      this.animateNumberChange(ones, value[1]);
    });

    if (remainingTime.total <= 0) {
      setTimeout(() => this.onTimerExpire(), this.animationDuration);
    }
  }
  
  animateNumberChange(wrapper, newValue) {
    const currentNumber = wrapper.querySelector('.countdown__number--current');

    if (!this.enableAnimation) {
      currentNumber.innerText = newValue; 

      return;
    }

    const previousNumber = wrapper.querySelector('.countdown__number--previous');
  
    if (currentNumber.innerText !== newValue) {
      previousNumber.innerText = currentNumber.innerText; 
      currentNumber.innerText = newValue; 
  
      previousNumber.classList.add('countdown__number--animated');
      currentNumber.classList.add('countdown__number--animated');
  
      setTimeout(() => {
        previousNumber.classList.remove('countdown__number--animated');
        currentNumber.classList.remove('countdown__number--animated');
      }, this.animationDuration); 
    }
  }

  removeCountdownParent() {
    const sectionElement = document.getElementById('shopify-section-' + this.sectionId);

    if (!sectionElement) return;
    
    const sectionAssociationsMap = new Map([
      ['media-with-text', {
        contentWrapperClass: '.media-with-text__content-wrapper',
        removalTargetClass: '.section:has(.placeholder-svg)'
      }],
      ['section-image-banner', {
        contentWrapperClass: '.banner__content-wrapper',
        removalTargetClass: '.banner__content-wrapper'
      }],
      ['section-newsletter', {
        contentWrapperClass: '.banner__content-wrapper',
        removalTargetClass: '.banner__content-wrapper'
      }],
      ['section-video-banner', {
        contentWrapperClass: '.banner__content-wrapper',
        removalTargetClass: '.banner__content-wrapper'
      }],    
      ['rich-text', {
        contentWrapperClass: '.section-container',
        removalTargetClass: '.section-container'
      }],
      ['shopify-section-announcement-bar', {
        contentWrapperClass: '.announcement-block',
        removalTargetClass: '.announcement-block',
        sliderInstance: announcementBarSwiper,
        sectionWrapperClass: '.announcement-bar',
      }],
    ]);
    
    const matchingEntry = Array.from(sectionAssociationsMap).find(([sectionClass]) =>
      sectionElement.classList.contains(sectionClass)
    );

    if (matchingEntry) {
      const { contentWrapperClass, removalTargetClass, sliderInstance, sectionWrapperClass } = matchingEntry[1];
      const contentWrapper = sliderInstance ? this.closest(contentWrapperClass) : sectionElement.querySelector(contentWrapperClass);

      if (contentWrapper && this.getElementContentHeight(contentWrapper) === 0) {
        const elementToRemove = sliderInstance ? this.closest(removalTargetClass) : sectionElement.querySelector(removalTargetClass);

        if (!sliderInstance) {
          elementToRemove?.remove();

          return;
        }
        
        const sectionWrapper = sectionElement.querySelector(sectionWrapperClass);
        const isLastSlide = sectionElement.querySelectorAll(contentWrapperClass).length === 1;

        sliderInstance.removeSlide(elementToRemove?.dataset.swiperSlideIndex);

        if (sectionWrapper && this.getElementContentHeight(sectionWrapper) === 0 && isLastSlide) {         
          sectionWrapper.remove();
        }
      }
    }   
  }  

  removeCountdownTimer() {
    const countdownTimer = this.closest('.countdown-timer-wrapper');

    countdownTimer.style.display = 'none';

    this.removeCountdownParent();
    countdownTimer.remove();
  }

  onTimerExpire() {
    switch (this.expirationAction) {
      case "hide_timer":
        this.removeCountdownTimer();

        break;
      case "show_message":
        if (!this.countdownCompleteMessage) {
          this.removeCountdownTimer();

          break;
        }

        this.countdownTimer.remove();
        this.countdownCompleteMessage.removeAttribute('hidden');   
      
        break;
      case "show_zeros_and_message":
        if (this.countdownCompleteMessage) {
          this.countdownCompleteMessage.removeAttribute('hidden');
        }
        
        break;
    }

    clearInterval(this.updateTimerIntervalId);
  }

  getRemainingTime(deadline) {
    const total = deadline - this.getTimestampInStoreTimezone();
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));

    return {
      total,
      days,
      hours,
      minutes,
      seconds
    };
  }

  getTimestampInStoreTimezone() {
    const match = this.timezoneOffset.match(/([+-]?)(\d{2})(\d{2})/);
  
    if (!match) {
      console.error("Invalid timezone format:", this.timezoneOffset);
      return;
    }
  
    const now = new Date();
    const sign = match[1] === "-" ? -1 : 1;
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3], 10);
    const offsetMilliseconds = sign * ((hours * 60 + minutes) * 60000);
    const utcTimestamp = now.getTime() + now.getTimezoneOffset() * 60000; 
  
    return utcTimestamp + offsetMilliseconds;
  }

  getElementContentHeight(element) {
    const style = getComputedStyle(element);
    const paddingTop = parseFloat(style.paddingTop);
    const paddingBottom = parseFloat(style.paddingBottom);

    return element.clientHeight - paddingTop - paddingBottom;
  }

  isDatePatternValid(dateString) {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateString); 
  }

  isTimePatternValid(timeString) {
    return /^\d{2}:\d{2}$/.test(timeString); 
  }

  isDateValid(dateString) {
    if (!this.isDatePatternValid(dateString)) return false;

    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day;
  }

  isTimeValid(timeString) {
    if (!this.isTimePatternValid(timeString)) return false;

    const [hours, minutes] = timeString.split(":").map(Number);

    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  }
}

customElements.define('countdown-timer', CountdownTimer);

let sliders = document.querySelectorAll('.swiper-product-card');

  function initializeSwiper(slider) {
    if (slider.dataset.initialized === 'true') return;
    slider.dataset.initialized = 'true';
    let speed = parseInt(slider.dataset.transitionDuration, 10) || 300;
    let autoplaySpeed = parseInt(slider.dataset.autoplaySpeed, 10) || 5000;
    let autoplay = slider.dataset.autoplay === "true";
    let loop = slider.dataset.loop === "true";
    let slidesLoaded = false;
    let direction
    let isDragging
    let cardSwiper;
    function initSwiper() {
        cardSwiper = new Swiper(slider, {
            a11y: {
              slideRole: 'listitem'
            },
            slidesPerView: 1,
            loop: loop,
            pagination: {
                el: slider.querySelector('.swiper-pagination'),
                type: 'bullets'
            },
            navigation: {
                nextEl: slider.querySelector('.swiper-button-next'),
                prevEl: slider.querySelector('.swiper-button-prev'),
            },
            speed: speed,
            autoplay: autoplay,
            lazy: {
                loadPrevNext: true,
            },
            roundLengths: false, 
            on: {
              touchMove: function () {
                setTimeout(() => {
                  isDragging = true;
                }, 0);
              },
              touchEnd: function () {
                setTimeout(() => {
                    isDragging = false;
                }, 0);
              }
            }
        });
    }
    initSwiper();

    function loadAllSlides(slider, index) {
      if (!slider.classList.contains('swiper-loaded')) slider.classList.add('swiper-loaded')
        const totalSlides = parseInt(slider.dataset.totalSlides, 10);
        const productImages = slider.getAttribute('data-imgs').split(',');
        const productImageAlts = slider.getAttribute('data-img-alts').split(',');
        let imagesLoading = ''
        let preloadImages
        if(slider.hasAttribute('data-images-loading')) {
          imagesLoading = slider.getAttribute('data-images-loading');
          
          preloadImages = slider.getAttribute('data-preload-imgs')?.split(',');
        }
        if (imagesLoading == '' || imagesLoading == 'fade_scale' || imagesLoading == 'loader' || imagesLoading == 'disable') isSlideReady = true;
        for (let i = index; i < totalSlides; i++) {
            let image = productImages[i];
            let alt = productImageAlts[i];
            let preloadImage
            if (imagesLoading !== '' && preloadImages.length > 0) preloadImage = preloadImages[i];
            let newSlide = document.createElement("li");
            newSlide.classList.add('card__product-image', 'swiper-slide', 'aspect-ratio');
            if (imagesLoading != '' && imagesLoading != 'fade_scale') {
              newSlide.innerHTML = `<figure class="lazy-image lazy-image--${ imagesLoading }"><div class="lazy-image__preloader lazy-image__preloader--full lazy-image__preloader-${ imagesLoading }" aria-hidden="true"><img src="${preloadImage}" loading="eager" width="10" height="10" alt="${alt}"></div><img src="${image}" loading="lazy" onload="this.parentNode.classList.add('lazyloaded');" alt="${alt}"></figure>`;
            } else if (imagesLoading == 'fade_scale' ) {
              newSlide.innerHTML = `<figure class="lazy-image lazy-image--${ imagesLoading }"><img src="${image}" loading="lazy" onload="this.parentNode.classList.add('lazyloaded');" alt="${alt}"></figure>`;
            } else {
              newSlide.innerHTML = `<img src="${image}" alt="${alt}">`;
            }
            
            slider.querySelector('.swiper-wrapper').append(newSlide);
            if (imagesLoading !== '' && imagesLoading !== 'fade_scale' && imagesLoading !== 'loader') {
              const preloadImg = newSlide.querySelector('.lazy-image__preloader img');
              if (preloadImg) {
                isSlideReady = false;
                if (preloadImg.complete) {
                  isSlideReady = true;
                  if (pendingSlide === 'next') {
                    cardSwiper.slideNext();
                  } else if (pendingSlide === 'prev') {
                    cardSwiper.slidePrev();
                  }
                  pendingSlide = null;
                } else {
                  preloadImg.addEventListener('load', () => {
                    isSlideReady = true;
                    if (pendingSlide === 'next') {
                      cardSwiper.slideNext();
                    } else if (pendingSlide === 'prev') {
                      cardSwiper.slidePrev();
                    }
                    pendingSlide = null;
                  });
                }
              }
            }
        }
        cardSwiper.update()
        recreateSwiper();

        if (window.innerWidth > 768 && autoplay) {
          slider.addEventListener('mouseenter', () => {
            cardSwiper.params.autoplay = {
              delay: autoplaySpeed,
              disableOnInteraction: false
            };
            cardSwiper.autoplay.start()
          });
          slider.addEventListener('mouseleave', () => {
            if (cardSwiper.autoplay.running) cardSwiper.autoplay.stop()
          })
        }
    }

    if (window.innerWidth > 768 && autoplay) {
      slider.addEventListener('mouseenter', () => {
        cardSwiper.params.autoplay = {
          delay: autoplaySpeed,
          disableOnInteraction: false
        };
        cardSwiper.autoplay.start()
      });
      slider.addEventListener('mouseleave', () => {
        if (cardSwiper.autoplay.running) cardSwiper.autoplay.stop()
      })
    }
    
    function loadAllSlidesByVariant(slider, currentAlt, swatchImageIndex) {
      if (!slider.classList.contains('swiper-loaded')) slider.classList.add('swiper-loaded')
      const sliderWrapper = slider.querySelector('.swiper-wrapper');
      const productImages = slider.getAttribute('data-imgs').split(',');
      const productImageAlts = slider.getAttribute('data-img-alts').split(',');
  
      sliderWrapper.innerHTML = ''; 
  
      const appendSlide = (image, alt = '') => {
          const newSlide = document.createElement("li");
          newSlide.classList.add('card__product-image', 'swiper-slide', 'aspect-ratio');
          newSlide.innerHTML = `<img src="${image}" alt="${alt}"><div class="swiper-lazy-preloader"></div>`;
          sliderWrapper.append(newSlide);
      };
  
      let filteredImages = productImages
          .map((image, index) => ({ image, alt: productImageAlts[index] }))
          .filter(({ alt }) => alt.includes(currentAlt));
  
      if (filteredImages.length === 0) {
          if (swatchImageIndex !== undefined && productImages[swatchImageIndex]) {
              filteredImages = [{ image: productImages[swatchImageIndex], alt: productImageAlts[swatchImageIndex] }];
          } else {
              filteredImages = productImages.map((image, index) => ({ image, alt: productImageAlts[index] }));
          }
      }
  
      filteredImages.forEach(({ image, alt }) => appendSlide(image, alt));
  
      recreateSwiper();
      slider.style.setProperty('--total-slides', sliderWrapper.children.length);
  }
  
    function recreateSwiper() {
        if (cardSwiper) {
            cardSwiper.destroy(true, true); 
        }
        initSwiper();
    }

    if (slider.querySelector('.swiper-button-next')) slider.querySelector('.swiper-button-next').addEventListener('click', () => {
        if (!slidesLoaded) {
            loadAllSlides(slider, index = 1);
            slidesLoaded = true;
        }
        if (isSlideReady) {
          cardSwiper.slideNext();
        } else {
          pendingSlide = 'next';
        }
    });

    if (slider.querySelector('.swiper-button-prev')) slider.querySelector('.swiper-button-prev').addEventListener('click', (e) => {
        e.preventDefault();
        if (!slidesLoaded) {
            loadAllSlides(slider, index = 1);
            slidesLoaded = true;
        }
        if (isSlideReady) {
          cardSwiper.slidePrev();
        } else {
          pendingSlide = 'prev';
        }
    });

    if (slider.querySelector('.swiper-button-next')) slider.querySelector('.swiper-button-next').addEventListener('keyup', (e) => {
      if (e.code.toUpperCase() === 'ENTER') {
        if (!slidesLoaded) {
          loadAllSlides(slider, index = 1);
          slidesLoaded = true;
        }
        if (isSlideReady) {
          cardSwiper.slideNext();
        } else {
          pendingSlide = 'next';
        }
      }
    });

    if (slider.querySelector('.swiper-button-prev')) slider.querySelector('.swiper-button-prev').addEventListener('keyup', (e) => {
      if (e.code.toUpperCase() === 'ENTER') {
        e.preventDefault();
        if (!slidesLoaded) {
          loadAllSlides(slider, index = 1);
          slidesLoaded = true;
        }
        if (isSlideReady) {
          cardSwiper.slidePrev();
        } else {
          pendingSlide = 'prev';
        }
      } 
    });

    cardSwiper.on('sliderFirstMove', () => {
        const diffX = cardSwiper.touches.currentX - cardSwiper.touches.startX;
        const diffY = cardSwiper.touches.currentY - cardSwiper.touches.startY;
        if (Math.abs(diffX) > Math.abs(diffY)) {
            diffX > 0 ? direction = 'right' : direction = 'left'
        }
        if (!slidesLoaded) {
            loadAllSlides(slider, index = 1);
            slidesLoaded = true;
        }

        if (isSlideReady) {
          direction === 'left' ? cardSwiper.slideNext(300) : cardSwiper.slidePrev(300);
        } else {
          pendingSlide = direction === 'left' ? 'next' : 'prev';
        }
    });

    if (autoplay) slider.addEventListener('mouseenter', () => {
        if (!slidesLoaded) {
            loadAllSlides(slider, index = 1);
            slidesLoaded = true;
        }
    });
    slider.closest('.card').addEventListener('click', (e) => {
      if (isDragging) e.preventDefault();
    });
    slider.addEventListener('swiper:update', (event) => {
        const sliderWrapper = slider.querySelector('.swiper-wrapper');

        if (event.detail.currentAlt === 'all') {
            sliderWrapper.innerHTML = ''; 
            loadAllSlides(slider, index = 0);
        } else {
            loadAllSlidesByVariant(slider, event.detail.currentAlt, event.detail.index);
        }

        slidesLoaded = true;

        if (!slider.querySelector('.swiper-wrapper-only-variant')) {
          let variantFirstImageIndex = event.detail.index;

          if (!variantFirstImageIndex) {
            const productImageAlts = slider.getAttribute('data-img-alts').split(',');
            variantFirstImageIndex = productImageAlts.findIndex(alt => alt.includes(event.detail.currentAlt));
          }

          sliderWrapper.innerHTML = ''; 
          loadAllSlides(slider, index = 0);
          cardSwiper.slideTo(variantFirstImageIndex || 0, 0);
        }
    });
}
  sliders.forEach(initializeSwiper);
  document.addEventListener('shopify:section:load', (event) => {
    let sliders = event.target.querySelectorAll('.swiper-product-card');
    sliders.forEach(initializeSwiper)
    preloadImages()
  })
  document.addEventListener('ajax-page-load', (event) => {
    let sliders = document.querySelectorAll(`#shopify-section-${event.detail.sectionId} .swiper-product-card`);
    sliders.forEach(initializeSwiper)
    preloadImages()
  })
  document.addEventListener('filters-ajax-page-load', (event) => {
    let sliders = document.querySelectorAll(`.swiper-product-card`)
    sliders.forEach(initializeSwiper)
    preloadImages()
  })
  document.addEventListener('recommendations:loaded', () => {
    let sliders = document.querySelectorAll('.product-recommendations .swiper-product-card' )
    sliders.forEach(initializeSwiper)
    preloadImages()
  })

  class InfiniteScroll extends HTMLElement {
    constructor() {
      super();
  
      this.sectionId = this.closest('section').id.split('shopify-section-')[1]
      if(this.closest('.section-collection-tabs')) {
        this.sectionId = this.closest('.component-tabs__content').id.split('content-')[1]
      }
      this.querySelector('button').addEventListener('click', this.onClickHandler.bind(this));
      if (this.dataset.trigger == 'infinite') {
        new IntersectionObserver(this.handleIntersection.bind(this), {rootMargin: '0px 0px 200px 0px'}).observe(this);
      }
    }
  
    onClickHandler() {
      if (this.classList.contains('loading') || this.classList.contains('disabled')) return;
      this.classList.add('loading');
      this.classList.add('disabled');
      if (this.querySelector('.loading-overlay__spinner')) {
        this.querySelector('button').appendChild(this.querySelector('.loading-overlay__spinner'))
        this.querySelector('.loading-overlay__spinner').classList.remove('hidden')
      }
      const sections = InfiniteScroll.getSections(this.sectionId);
      sections.forEach(() => {
        const url = this.dataset.url;
        InfiniteScroll.renderSectionFromFetch(url, this.sectionId);
      });
    }
  
    handleIntersection(entries, observer) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          observer.unobserve(entry.target);
          this.onClickHandler();
        }
      });
    }
  
    static getSections(sectionID) {
      return [
        {
          section: document.getElementById(`product-grid--${sectionID}`).dataset.id,
        }
      ]
    }
  
    static renderSectionFromFetch(url, sectionId) {
      fetch(url)
        .then(response => response.text())
        .then((responseText) => {
          const html = responseText;
          InfiniteScroll.renderPagination(html, sectionId);
          InfiniteScroll.renderProductGridContainer(html, sectionId);
        })
        .catch((e) => {
          console.error(e);
        });
    }
  
    static renderPagination(html, sectionId) {
      const container = document.getElementById(`ProductGridContainer--${sectionId}`).querySelector('.pagination-wrapper');
      const pagination = new DOMParser().parseFromString(html, 'text/html').getElementById(`ProductGridContainer--${sectionId}`).querySelector('.pagination-wrapper');
      if (pagination) {
        container.innerHTML = pagination.innerHTML;
      }
      else {
        container.remove();
      }
    }
  
    static renderProductGridContainer(html, sectionId) {
      const container = document.getElementById(`product-grid--${sectionId}`);
      const products = new DOMParser().parseFromString(html, 'text/html').getElementById(`product-grid--${sectionId}`);
      container.insertAdjacentHTML('beforeend', products.innerHTML);
      document.dispatchEvent(new CustomEvent('ajax-page-load', {
        detail: {
          sectionId: sectionId
        }
      }))
    }
  }
  customElements.define('infinite-scroll', InfiniteScroll);  

  class InputCheckbox extends HTMLElement {
    constructor() {
      super();
  
      theme.initWhenVisible({
        element: this,
        callback: this.init.bind(this),
        threshold: 600
      });
    }
  
    init() {
      this.querySelector('input').addEventListener('keydown', (event) => {
        if (event.code.toUpperCase() === 'ENTER') {
          this.querySelector('input').hasAttribute('checked') ? this.querySelector('input').removeAttribute('checked') : this.querySelector('input').setAttribute('checked', 'checked')
        }
      });
    }
  }
  customElements.define('input-checkbox', InputCheckbox);

  class AnimateSticky extends HTMLElement {
    constructor() {
      super();
      this.buttons = this.closest('section').querySelector('.product-form__buttons')
    }
  
    connectedCallback() {
      this.onScrollHandler = this.onScroll.bind(this);
  
      window.addEventListener('scroll', this.onScrollHandler, false);
      this.onScrollHandler();
    }
  
    disconnectedCallback() {
      window.removeEventListener('scroll', this.onScrollHandler);
    }
  
    onScroll() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = document.documentElement.clientHeight;
      const docHeight = document.documentElement.scrollHeight;
      const isNearBottom = scrollTop + windowHeight >= docHeight - 100;
  
      if (scrollTop > this.getOffsetTop(this.buttons) && !isNearBottom) {
        window.requestAnimationFrame(this.reveal.bind(this));
      } else {
        window.requestAnimationFrame(this.reset.bind(this));
      }
    }
  
    reveal() {
      this.setAttribute('animate', '');
    }
  
    reset() {
      this.removeAttribute('animate');
    }
  
    getOffsetTop(element) {
      let offsetTop = 0;
      while(element) {
        offsetTop += element.offsetTop;
        element = element.offsetParent;
      }
      return offsetTop;
    }
  }
  customElements.define('animate-sticky', AnimateSticky);

  // Slideshow
  function initializeSlideshowSwiper(slideshow) {
    let effect = slideshow.dataset.effect;
    let speed = parseInt(slideshow.dataset.transitionDuration, 10) || 300
    let autoplaySpeed = parseInt(slideshow.dataset.autoplaySpeed, 10) || 5000
    let autoplay = slideshow.dataset.autoplay === "true"
    let isAutoplayRunning = !!autoplay;
    let progressCircle = slideshow.querySelector(".autoplay-progress__progress-circle");
    let autoplayProgress = slideshow.querySelector(".autoplay-progress");
    let progressIconPause = autoplayProgress?.querySelector(".autoplay-progress__video-control-icon--pause");
    let progressIconPlay = autoplayProgress?.querySelector(".autoplay-progress__video-control-icon--play");

    const slideshowSwiper = new Swiper(slideshow, {
        loop: true,
        slidesPerView: 1,
        pagination: {
            el: slideshow.querySelector('.swiper-pagination'),
            type: 'bullets',
            clickable: true,
        },
        navigation: {
            nextEl: slideshow.querySelector('.swiper-button-next'),
            prevEl: slideshow.querySelector('.swiper-button-prev'),
        },
        effect: effect,
        speed: speed,
        autoplay: autoplay ? {
            delay: autoplaySpeed,
            disableOnInteraction: false,
        } : false,
        creativeEffect: {
            prev: {
                shadow: true,
                translate: ["-20%", 0, -1],
            },
            next: {
                translate: ["100%", 0, 0],
            },
        },
        cardsEffect: {
            perSlideOffset: 5,
            perSlideRotate: 1
        },
        coverflowEffect: {
            slideShadows: false
        },
        flipEffect: {
            slideShadows: false
        },
        on: {
          autoplayTimeLeft(s, time, progress) {
            progressCircle.style.setProperty("--progress", 1 - progress);
          },
          slideChange() {
            progressIconPlay?.classList.add('hidden');
            progressIconPause?.classList.remove('hidden');
            isAutoplayRunning = true;
          }
        }
    })
    slideshow.querySelectorAll('video').forEach(video => video.load())

    autoplayProgress?.addEventListener("click", () => {
        if (isAutoplayRunning) {
            slideshowSwiper.autoplay.pause();
            progressIconPause?.classList.add('hidden');
            progressIconPlay?.classList.remove('hidden');
        } else {
            slideshowSwiper.autoplay.resume();
            progressIconPlay?.classList.add('hidden');
            progressIconPause?.classList.remove('hidden');
        }

        isAutoplayRunning = !isAutoplayRunning;
    });
  }

  function initAllSlideshowSwipers() {
    document.querySelectorAll('.swiper-slideshow').forEach(initializeSlideshowSwiper);
  }
  
  document.addEventListener('DOMContentLoaded', initAllSlideshowSwipers);
  
  document.addEventListener('shopify:section:load', (event) => {
    const slideshow = event.target.querySelector('.swiper-slideshow');
    if (slideshow) {
      initializeSlideshowSwiper(slideshow);
    }
  });
