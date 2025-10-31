class CartDrawer extends HTMLElement {
    constructor() {
      super();
  
      this.cartDrawerSidePanelBreakpoint = 1024;
      this.cartDrawerID = document.querySelector('.shopify-section-cart-drawer').id.replace('shopify-section-', '')
      this.headerID = document.querySelector('.shopify-section-header').id.replace('shopify-section-', '')
      this.CartDrawer = this.closest('.cart-drawer')
      this.sidePanel = this.CartDrawer.querySelector('.drawer-recommendations--side-panel')
      this.drawerRecommendations = this.CartDrawer.querySelector('.drawer-recommendations')
      this.recommendationsBlockHasDifferentBg = this.dataset.recommendationsBlockHasDifferentBg === 'true';
      this.enableShadow = this.dataset.enableShadow === 'true';
      this.enableBorder = this.dataset.enableBorder === 'true';
      this.cartLinks = document.querySelectorAll('#cart-link');
      this.drawer = this.CartDrawer.querySelector('.drawer')
      this.overlay = document.body.querySelector('body > .overlay')
      document.addEventListener('keyup', (event) => {
        if(event.code && event.code.toUpperCase() === 'ESCAPE' && this.drawer.closest('.open')) this.close()
      })

      this.setHeaderCartIconAccessibility();

      document.addEventListener('shopify:section:load', (event) => {
        if(event.target.closest('.shopify-section-cart-drawer')) this.open()
      });

      document.addEventListener('shopify:section:select', (event) => {
        if (event.target.closest('.shopify-section-cart-drawer')) {
          if (Shopify.designMode) {
            document.body.classList.add('disable-scroll-body');
          }

          this.sectionSelect()
        }
      });

      document.addEventListener('shopify:section:deselect', (event) => {
        if(event.target.closest('.shopify-section-cart-drawer')) this.close()
      });

      this.overlay.addEventListener('click', () => {this.close()})

      if (this.sidePanel) {
        this.adjustSidePanelForScreenSize();

        window.addEventListener('resize', this.adjustSidePanelForScreenSize.bind(this));
      }
    }

    adjustSidePanelForScreenSize() {
      const drawerRecommendationsHeader = this.drawerRecommendations.querySelector('.js-cart-drawer-header');
      const drawerRecommendationsTabsResult = this.drawerRecommendations.querySelector('.tabs-block__results');

      const isSmallScreen = window.matchMedia(`(max-width: ${this.cartDrawerSidePanelBreakpoint}px)`).matches;
  
      const toggleClass = (element, className, toAdd) => {
        if (element) {
          element.classList.toggle(className, toAdd);
        }
      };

      toggleClass(this.drawerRecommendations, 'drawer-recommendations--side-panel', !isSmallScreen);
      toggleClass(this.drawerRecommendations, 'scroll-area', !isSmallScreen);
      toggleClass(this.drawerRecommendations, 'hide-scrollbar', !isSmallScreen);
      toggleClass(this.drawerRecommendations, 'full-width-block', isSmallScreen && this.recommendationsBlockHasDifferentBg);
      toggleClass(this.drawerRecommendations, 'modal--shadow', !isSmallScreen && this.enableShadow);
      toggleClass(this.drawerRecommendations, 'modal--border', !isSmallScreen && this.enableBorder);
      toggleClass(drawerRecommendationsHeader, 'cart-drawer__header', !isSmallScreen);
      toggleClass(drawerRecommendationsTabsResult, 'tabs-block__results--allow-height-change', !isSmallScreen);
    }
  
    setHeaderCartIconAccessibility() {
      this.cartLinks = document.querySelectorAll('#cart-link');
      Array.from(this.cartLinks).forEach(cartLink => {
        cartLink.setAttribute('role', 'button');
        cartLink.setAttribute('aria-haspopup', 'dialog');
        cartLink.addEventListener('click', (event) => {
          event.preventDefault();
          this.open(cartLink)
        });
        cartLink.addEventListener('keydown', (event) => {
          if (event.code.toUpperCase() === 'ENTER') {
            event.preventDefault();
            this.open(cartLink);
          }
        });
      })
    }
  
    sectionSelect() {
      this.cartLink = document.querySelector('#cart-link')
      this.open(this.cartLink)
    }
  
    open(triggeredBy) {
      if (triggeredBy) this.setActiveElement(triggeredBy);
      if(document.body.classList.contains('quick-view-open')) {
        document.body.classList.remove('hidden', 'quick-view-open', 'quick-view-load')
        let openedQuickView = document.querySelector('.popup-wrapper__quick-view.open')
        if(openedQuickView) {
          openedQuickView.closest('details').removeAttribute('open')
          openedQuickView.closest('.quick-view__content').classList.remove('hide-cover');
          document.querySelector('body > .quick-view-overlay').classList.remove('open')
          openedQuickView.classList.remove('open')
          openedQuickView.closest('.quick-view__content').innerHTML = '';
        }
      }
      setTimeout(() => {
        this.classList.add('animate', 'open')
        this.drawer.classList.add('open')
        this.overlay.classList.add('open')
        document.body.classList.add('hidden');
        this.CartDrawer.setAttribute('tabindex', '-1');
        requestAnimationFrame(() => {
          setTimeout(() => {
            this.CartDrawer.querySelector('.button-close').focus()
            trapFocus(this.CartDrawer, this.CartDrawer.querySelector('.button-close'))
          }, 10);
        });
      }, 10);
    }
  
    close() {
      if (Shopify.designMode) {
        document.body.classList.remove('disable-scroll-body');
      }

      this.classList.remove('open');
      this.drawer.classList.remove('open')
      this.overlay.classList.remove('open')
      removeTrapFocus(this.activeElement);
      document.body.classList.remove('hidden')
      document.dispatchEvent(new CustomEvent('body:visible'));
    }
  
    renderContents(parsedState) {
      if (!parsedState || !parsedState.sections) {
        return;
      }

      if(this.classList.contains('is-empty')) this.classList.remove('is-empty');
      this.productId = parsedState.id;
      this.getSectionsToRender().forEach((section => {
        const sectionElements = document.querySelectorAll(section.selector);
        const sectionHtml = parsedState.sections[section.id];
        if (!sectionHtml) return;

        if (sectionElements) {
          Array.from(sectionElements).forEach(sectionElement => {
            const newHtml = this.getSectionInnerHTML(sectionHtml, section.selector);
            sectionElement.innerHTML = newHtml;
          });
        }
      }));

      if (this.classList.contains('open-after-adding')) {
        setTimeout(() => {
          this.querySelector('#CartDrawer-Overlay')?.addEventListener('click', this.close.bind(this));
          this.open();
        });
      }
    }
  
    getSectionInnerHTML(html, selector = '.shopify-section') {
      return new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector(selector).innerHTML;
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
  
    getSectionDOM(html, selector = '.shopify-section') {
      return new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector(selector);
    }
  
    setActiveElement(element) {
      this.activeElement = element;
      if (element.closest('.cart-icon') && element.querySelector('a.cart')) this.activeElement = element.querySelector('a.cart')
      if (element.closest('.popup-wrapper__quick-view') && element.closest('.card-product')) this.activeElement = element.closest('.card-product').querySelector('.card-quick-view')
    }
  }
  
  customElements.define('cart-drawer', CartDrawer);
  