if (!customElements.get('product-form')) {
  customElements.define('product-form', class ProductForm extends HTMLElement {
    constructor() {
      super();
      if (this.closest('.popup-wrapper__quick-view') && !document.body.classList.contains('hidden')) document.body.classList.add('hidden');

      this.form = this.querySelector('form');
      this.cart = document.querySelector('cart-drawer');
      this.submitButton = this.querySelector('[type="submit"]');
      this.hideErrors = this.dataset.hideErrors === 'true';

      this.form.querySelector('[name=id]').disabled = false;
      this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
    }

    async onSubmitHandler(evt) {
      evt.preventDefault();
      if (this.submitButton.getAttribute('aria-disabled') === 'true') return;
    
      this.handleErrorMessage();

      if (!this.validateCustomProperties()) {
        this.handleErrorMessage(`${window.variantStrings.customPropertyError}`, true);
        return false;
      }

      this.submitButton.setAttribute('aria-disabled', true);
      this.submitButton.classList.add('loading');
      this.querySelector('.loading-overlay__spinner')?.classList.remove('hidden');
    
      const formData = new FormData(this.form);
      formData.append('sections_url', window.location.pathname);
    
      const cartDrawer = document.querySelector('cart-drawer');
      const cartNotification = document.querySelector('cart-notification');
      const drawerSections = cartDrawer?.getSectionsToRender?.() || [];
      const notificationSections = cartNotification?.getSectionsToRender?.() || [];
      const allSections = [...drawerSections, ...notificationSections];
      const uniqueSectionIds = [...new Set(allSections.map((s) => s.id))];
      formData.append('sections', uniqueSectionIds.join(','));
    
      const config = {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: formData
      };
    
      try {
        const res = await fetch(`${routes.cart_add_url}`, config);
        const contentType = res.headers.get('content-type');
        let data;
    
        if (contentType && contentType.includes('application/json')) {
          data = await res.json();
        } else {
          const fallbackHtml = await res.text();
          const fallbackRes = await fetch(
            `/?sections=${uniqueSectionIds.join(',')}&sections_url=${window.location.pathname}`
          );
          const fallbackSections = await fallbackRes.json();
          data = {
            sections: fallbackSections,
            fallback: true
          };
        }
    
        const isPartialAdd = data?.description?.includes('available');
        const isError = data.status && !isPartialAdd;
    
        if (isError) {
          this.handleErrorMessage(data.message || data.description);
          this.showSoldOutState();
          return;
        }
    
        const shouldOpenDrawer = cartDrawer?.classList.contains('open-after-adding');
        const shouldOpenNotification = !shouldOpenDrawer && cartNotification;
    
        if (cartDrawer?.renderContents) cartDrawer.renderContents(data);
    
        if (shouldOpenNotification && cartNotification?.renderContents) {
          const addedVariantId = this.form.querySelector('[name="id"]')?.value;
          try {
            const cartJson = await fetch('/cart.js').then(res => res.json());
            const items = cartJson.items || [];
            let addedItemKey = null;

            for (const item of items) {
              if (item.variant_id?.toString() === addedVariantId?.toString()) {
                addedItemKey = item.key;
                break;
              }
            }
            cartNotification.renderContents({
              ...data,
              key: addedItemKey
            });
          } catch (err) {
            cartNotification.renderContents(data); // fallback
          }
        }
    
        if (isPartialAdd) {
          this.handleErrorMessage(data.description);
        }
    
      } catch (error) {
        console.error('Cart add error:', error);
        this.handleErrorMessage('An error occurred while adding to the cart.');
      } finally {
        this.submitButton.classList.remove('loading');
        this.submitButton.removeAttribute('aria-disabled');
        this.querySelector('.loading-overlay__spinner')?.classList.add('hidden');
      }
    }

    showSoldOutState() {
      const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
      if (soldOutMessage) {
        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.querySelector('span')?.classList.add('hidden');
        soldOutMessage.classList.remove('hidden');
      }
    }

    validateCustomProperties() {
      let checker = arr => arr.every(v => v === true);
      const productSection = this.form.closest('.main-product');
      const customInputs = productSection ? Array.from(productSection.querySelectorAll(`.custom-options [aria-required]`)) : [];

      if (customInputs.length === 0) {
        return true;
      }

      const validationArray = customInputs.map((customInput) => {
        if (customInput.required) {
          return validateFormInput(customInput);
        }
      });

      return checker(validationArray);
    }

    handleErrorMessage(errorMessage = false) {
      if (this.hideErrors) return;
      this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
      if (!this.errorMessageWrapper) return;
      this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

      this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);
      if (errorMessage) this.errorMessage.textContent = errorMessage;
    }
  });
}

if (!customElements.get('custom-options')) {
  customElements.define('custom-options', class CustomOptions extends HTMLElement {
    constructor() {
      super();

      this.requiredInputs = this.querySelectorAll('[aria-required]');
      if (this.requiredInputs.length > 0) Array.from(this.requiredInputs).forEach(requiredInput => this.validateError(requiredInput));
      this.output = this.querySelector('[data-selected-custom-option]');
      if (!this.output) return;

      this.inputs = Array.from(
        this.querySelectorAll('input[type="radio"], input[type="checkbox"], select')
      );
  
      this.handleChange = this.handleChange.bind(this);
    }


    connectedCallback() {
      if(this.inputs && this.inputs.length > 0) this.addEventListener('change', this.handleChange);
      this.optionType = this.dataset.type;
      if (this.optionType && this.optionType === 'color-picker') this.setColorPicker();
      if (this.optionType && this.optionType === 'image-upload') this.setDragAndDrop();
    }

    disconnectedCallback() {
      if(this.inputs && this.inputs.length > 0) this.removeEventListener('change', this.handleChange);
    }

    handleChange() {
      if(this.inputs && this.inputs.length > 0) this.updateOutput();
    }

    setColorPicker() {
      const colorInput = this.querySelector('input[type="color"]');
  
      colorInput.addEventListener('change', (evt) => {
        const currentInput = evt.currentTarget;
        const selectedColorStatus = this.querySelector('.selected-color-label');
        const customField = this.querySelector('.color__swatch--color');
        if (selectedColorStatus) selectedColorStatus.textContent = currentInput.value;
        if (customField) {
          customField.style.setProperty('--swatch-background', currentInput.value);
          customField.style.setProperty('--swatch-background-color', currentInput.value);
        } 
      });
    }

    validateError(requiredInput) {
      const productSection = requiredInput.closest('.main-product');
      let eventName = 'keyup';
  
      if (requiredInput.tagName === 'SELECT' || requiredInput.type === 'checkbox' || requiredInput.type === 'file' ) {
        eventName = 'change';
      }

      this.productForm = productSection.querySelector('product-form');
      this.dynamicCheckoutWrap = productSection.querySelector('.shopify-payment-button');

      requiredInput.addEventListener(eventName, (event) => {
        let currentInput = requiredInput;

        if (currentInput.value == '' || (currentInput.type == 'checkbox' && !currentInput.checked)) {
          this.dynamicCheckoutWrap.classList.add('shopify-payment-button--disable');
        }

        if (currentInput.classList.contains('invalid')) {
          if (currentInput.classList.contains('checkbox-group__input')) return;
          if (currentInput.type == 'checkbox' && !currentInput.checked) return;
          removeErrorStyle(currentInput);
          let activeErrors = productSection.querySelectorAll('.invalid');

          if (activeErrors.length === 0) {
            this.dynamicCheckoutWrap.classList.remove('shopify-payment-button--disable');
            this.productForm.handleErrorMessage();
          }
        }
      });
    }

    updateOutput() {
      const selected = [];

      this.inputs.forEach(input => {
        if (input.tagName === 'SELECT') {
          const selectedOption = input.options[input.selectedIndex];
          if (selectedOption && selectedOption.value) {
            selected.push(selectedOption.textContent.trim());
          }
        } else if (input.type === 'checkbox' && input.checked) {
          selected.push(input.value.trim());
        } else if (input.type === 'radio' && input.checked) {
          selected.push(input.value.trim());
        }
      });

      this.output.textContent = selected.length > 0 ? '\u2014' + ' ' + selected.join(', ') : '';
    }

    formatFileType(file) {
      const type = file.type;
      const splitType = type.split('/');
      const subtype = splitType[1];
      let formattedType = subtype;
      let handleSubtype = subtype.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '').replace(/^-/, '');
      const applicationType = {
        'pdf': subtype.toUpperCase(),
        'vnd-ms-excel': 'Excel',
        'vnd-openxmlformats-officedocument-spreadsheetml-sheet': 'Excel',
        'vnd-ms-powerpoint': 'PowerPoint',
        'vnd-openxmlformats-officedocument-presentationml-presentation': 'PowerPoint',
        'x-msvideo': 'AVI',
        'html': 'HTML',
        'msword': 'Word',
        'vnd-openxmlformats-officedocument-wordprocessingml-document': 'Word',
        'csv': 'CSV',
        'mpeg': 'MP3 Audio',
        'webm': 'WEBM Audio',
        'mp4-video': 'MP4 Video',
        'mpeg-video': 'MPEG Video',
        'webm-video': 'WEBM Video',
        'vnd-rar': 'RAR archive',
        'rtf': 'RTF',
        'plain': 'Text',
        'wav': 'WAV',
        'vnd-adobe-photoshop': 'Adobe Photoshop',
        'postscript': 'Adobe Illustrator'
      };
  
      if (type.startsWith('image/')) {
        if (applicationType[handleSubtype]) {
          formattedType = applicationType[handleSubtype];
        } else {
          formattedType = splitType[1].toUpperCase();
          formattedType = `${formattedType} Image`;
        }
      } else if (type.startsWith('video/')) {
        const handleVideoSubtype = `${handleSubtype}-video`
        if (applicationType[handleVideoSubtype]) formattedType = applicationType[handleVideoSubtype];
      } else {
        if (applicationType[handleSubtype]) formattedType = applicationType[handleSubtype];
      }
  
      return formattedType;
    }
  
    calculateSize(file) {
      let numberOfBytes = file.size;
      if (numberOfBytes === 0) return 0;
  
      const units = [
        "B",
        "KB",
        "MB",
        "GB",
        "TB",
        "PB",
        "EB",
        "ZB",
        "YB"
      ];
  
      const exponent = Math.min(
        Math.floor(Math.log(numberOfBytes) / Math.log(1024)),
        units.length - 1,
      );
      const approx = numberOfBytes / 1024 ** exponent;
      const output =
        exponent === 0
          ? `${numberOfBytes} bytes`
          : `${approx.toFixed(2)} ${units[exponent]}`;
  
      return output;
    }
  
    getIconName(file) {
      const fileName = file.name;
      const type = file.type;
      let iconName = '';
  
      //excel
      if ( /\.(xls?x|csv)$/i.test(fileName) ) {
        iconName = 'icon--file';
      }
      //word
      if ( /\.(doc?x)$/i.test(fileName) ) {
        iconName = 'icon--file';
      }
      //ppt
      if ( /\.(ppt?x)$/i.test(fileName) ) {
        iconName = 'icon--file';
      }
      //txt
      if ( /\.(txt)$/i.test(fileName) ) {
        iconName = 'icon--file';
      }
      //pdf
      if ( /\.(pdf)$/i.test(fileName) ) {
        iconName = 'icon--file';
      }
      //video
      if (type.startsWith('video/')) {
        iconName = 'icon--video';
      }
      //audio
      if (type.startsWith('audio/')) {
        iconName = 'icon--audio';
      }
  
      return iconName;
    }
  
    preview(dropZoneWrapElm, file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const inputElm = dropZoneWrapElm.querySelector('.drop-zone__input');
        let thumbnailElement = dropZoneWrapElm.querySelector('.drop-zone__thumb');
        let preview = dropZoneWrapElm.querySelector('.dd-thumbnail');
        let fileInfo = dropZoneWrapElm.querySelector('.dd-file-info');
        if (!thumbnailElement) {
          thumbnailElement = document.createElement('div');
          thumbnailElement.classList.add('drop-zone__thumb');
          preview = document.createElement('div');
          fileInfo = document.createElement('div');
          fileInfo.setAttribute('class','dd-file-info');
          preview.setAttribute('class','dd-thumbnail');
  
          const fileInfoText = document.createElement('div');
          fileInfoText.setAttribute('class','dd-file-info__text flex--column');
          const spanTitle = document.createElement('span');
          const spanFileType = document.createElement('span');
          spanTitle.setAttribute('class','dd-file-info__title');
          spanFileType.setAttribute('class','dd-file-info__type caption-font');
  
          const btnRemove = document.createElement('button');
          const btnText = this.querySelector('.file-upload__remove').innerHTML;
          
          btnRemove.setAttribute('class','button link-button button--secondary');
          
          btnRemove.innerHTML = btnText
          
          btnRemove.addEventListener('click', (evt) => {
            evt.preventDefault();
            inputElm.value = '';
            dropZoneWrapElm.classList.remove('drop-zone-wrap--inactive');
            thumbnailElement.parentNode.removeChild(thumbnailElement);
          }, false);
  
          
          fileInfoText.appendChild(spanTitle);
          fileInfoText.appendChild(spanFileType);
          fileInfo.appendChild(fileInfoText);
          fileInfo.appendChild(btnRemove);
          thumbnailElement.appendChild(fileInfo);
          thumbnailElement.appendChild(preview);
          dropZoneWrapElm.classList.add('drop-zone-wrap--inactive');
          dropZoneWrapElm.appendChild(thumbnailElement);
        }
  
        const spanFileName = fileInfo.querySelector('.dd-file-info__title');
        const fileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        spanFileName.textContent = fileName;
        const spanFileType = fileInfo.querySelector('.dd-file-info__type');
        spanFileType.textContent = `${this.calculateSize(file)}, ${this.formatFileType(file)}`;
  
        preview.innerHTML = '';
        preview.removeAttribute('style');
  
        if ( /\.(jpe?g|png|gif|webp)$/i.test(file.name) ) {
          preview.setAttribute('style',`background-image:url("${reader.result}"); width: 60px;`);
        } else {
          const icon = this.querySelector(`.${this.getIconName(file)}`);
          preview.appendChild(icon);
        }
  
        thumbnailElement.setAttribute('data-ts-file', file.name);
      }, false);
  
      reader.readAsDataURL(file);
    }
  
    setDragAndDrop() {
      const inputElement = this.querySelector('.drop-zone__input');
      const dropZoneWrapElm = this.querySelector('.drop-zone-wrap');
      const dropZoneElement = this.querySelector('.drop-zone');
  
      inputElement.addEventListener('change', (e) => {
        if (inputElement.files.length) {
          const dropZone = this.querySelector('.drop-zone-wrap');
          const errorMessage = dropZone.querySelector('.input-error-message');
          const file = inputElement.files[0];
          const filesize = ((file.size/1024)/1024).toFixed(4);
  
          dropZone.classList.remove('drop-zone-wrap--error');
          if (errorMessage) errorMessage.classList.add('visually-hidden');
  
          if (filesize > 5) {
            inputElement.value = '';
            dropZone.classList.add('drop-zone-wrap--error');
            if (errorMessage) {
              errorMessage.classList.remove('visually-hidden');
              errorMessage.textContent = window.variantStrings.fileSizeError;
            }
            return;
          }
  
          this.preview(dropZoneWrapElm, file);
        }
      });
  
      dropZoneElement.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZoneElement.classList.add('drop-zone--over');
      });
  
      ["dragleave", "dragend"].forEach((type) => {
        dropZoneElement.addEventListener(type, (e) => {
          dropZoneElement.classList.remove('drop-zone--over');
        });
      });
  
      dropZoneElement.addEventListener('drop', (e) => {
        e.preventDefault();
  
        if (e.dataTransfer.files.length) {
          inputElement.files = e.dataTransfer.files;
          this.preview(dropZoneWrapElm, e.dataTransfer.files[0]);
        }
  
        dropZoneElement.classList.remove('drop-zone--over');
      });
    }
  });
}

if (!customElements.get('product-checkbox-group')) {
  customElements.define('product-checkbox-group', class ProductCheckboxGroup extends HTMLElement {
  constructor() {
    super();
    const productSection = this.closest('.main-product');
    this.productForm = productSection.querySelector('product-form');
    this.dynamicCheckoutWrap = productSection.querySelector('.shopify-payment-button');
    const customOptionElm = this.parentElement;
    const errorMessage = customOptionElm.querySelector('.input-error-message');
    const inputElms = this.querySelectorAll('input[type=checkbox]');
    const mainInputELm = this.querySelector('input[type=hidden]');
    const minLimit = this.dataset.min ? parseInt(this.dataset.min) : null;
    const maxLimit = this.dataset.max ? parseInt(this.dataset.max) : null;

    inputElms.forEach((inputElm) => {
      inputElm.addEventListener('change', (evt) => {
        const checkedInputs = this.querySelectorAll('input[type=checkbox]:checked');
        let checkedString = '';

        if (minLimit && checkedInputs.length >= minLimit) {
          const inputError = this.querySelector('.invalid');
          if (errorMessage) errorMessage.classList.add('visually-hidden');
          if (inputError) inputError.classList.remove('invalid');
          let activeErrors = productSection.querySelectorAll('.invalid');

          if (activeErrors.length === 0) {
            this.productForm.handleErrorMessage();
          }

          const requiredInputs = Array.from(productSection.querySelectorAll('input[aria-required]:not(.checkbox-group__input)'));
          let checker = arr => arr.every(v => v === true);
          const checkValues = requiredInputs.map((requiredInput) => {
            if (requiredInput.value == '' || (requiredInput.type == 'checkbox' && !requiredInput.checked)) {
              return false;
            }
            return true;
          });
          const areValidInputs = checker(checkValues);
          if (areValidInputs && this.dynamicCheckoutWrap) {
            this.dynamicCheckoutWrap.classList.remove('shopify-payment-button--disable');
          } else if (this.dynamicCheckoutWrap) {
            this.dynamicCheckoutWrap.classList.add('shopify-payment-button--disable');
          }
        } else if (minLimit && checkedInputs.length < minLimit && this.dynamicCheckoutWrap) {
          this.dynamicCheckoutWrap.classList.add('shopify-payment-button--disable');
        }

        if (maxLimit) {
          const disableInput = checkedInputs.length >= maxLimit;
          const uncheckedInputs = this.querySelectorAll('input[type=checkbox]:not(:checked)');
          uncheckedInputs.forEach((uncheckedInput) => {
            uncheckedInput.disabled = disableInput;
          });
        }

        checkedInputs.forEach((checkedInput) => {
          if (checkedString.length > 0) {
            checkedString += ',';
          }

          checkedString += checkedInput.value;
        });

        mainInputELm.value = checkedString;
      });
    });

  }
})
}