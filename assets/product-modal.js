if (!customElements.get('product-modal')) {
    customElements.define(
      'product-modal',
      class ProductModal extends ModalDialog {
        constructor() {
          super();
          this.overlayClickHandler = this.onOverlayClick.bind(this);
        }
  
        hide(event) {
          if (event) {
            const target = event.target;
  
            const clickInsideAllowedZone =
              target.closest('.product-media-modal__wrapper--lightbox') ||
              target.closest('.slider') ||
              target.closest('.slider-button') ||
              target.closest('.image-magnify-full-size');
  
            if (clickInsideAllowedZone) {
              return;
            }
          }
          super.hide();
        }
  
        show(opener) {
          super.show(opener);
          this.modalOverlay = this.querySelector('.product-media-modal__content');

          if (this.modalOverlay) {
            this.modalOverlay.removeEventListener('click', this.overlayClickHandler);
            this.modalOverlay.addEventListener('click', this.overlayClickHandler);
          }
          this.showActiveMedia(opener);
        }

        onOverlayClick(event) {
          this.hide(event);
        }

        showActiveMedia(opener) {
          if (this.querySelector('[id^="Slider-"]')) this.querySelector('[id^="Slider-"]').style.scrollBehavior = 'auto'
          this.querySelectorAll('img').forEach(image => image.removeAttribute('loading'))
          this.querySelectorAll(`[data-media-id]:not([data-media-id="${this.openedBy.getAttribute("data-media-id")}"])`).forEach((element) => {
              element.classList.remove('active');
            }
          )
          this.querySelector('.slider .is-active')?.classList.remove('is-active')
          let activeMedia = this.querySelector(`[data-media-id="${this.openedBy.getAttribute("data-media-id")}"]`);
          let dataMediaAlt = activeMedia.dataset.mediaAlt
          if (opener.closest('.product__media-list.variant-images')) {
            this.querySelectorAll(`[data-media-alt]`).forEach(element => element.classList.remove('product__media-item--variant-alt'))
            this.querySelectorAll(`[data-media-alt="${dataMediaAlt}"]`).forEach(element => element.classList.add('product__media-item--variant-alt'))
          }
          let activeMediaTemplate = activeMedia.querySelector('template');
          let activeMediaContent = activeMediaTemplate ? activeMediaTemplate.content : null;
          
          activeMedia.classList.add('active');
          activeMedia.closest('li')?.classList.add('is-active')
          if (activeMedia.closest('.lazy-image')) activeMedia = activeMedia.closest('.lazy-image')
          setTimeout(() => {activeMedia.scrollIntoView({behavior: 'auto'});}, 10)
          let container = this.querySelector('[role="document"]');
          container.scrollLeft = (activeMedia.width - container.clientWidth) / 2;
    
          if (activeMedia.nodeName == 'DEFERRED-MEDIA' && activeMediaContent && activeMediaContent.querySelector('.js-youtube')) activeMedia.loadContent();
          document.dispatchEvent(new CustomEvent('image:show'));
        }
      }
    );
  }