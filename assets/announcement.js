  /* JavaScript implementation for AnnouncementBar */
  class AnnouncementBar extends HTMLElement {
    constructor() {
      super();

      this.slider = this.querySelector('[data-slider]');
      this.slidesCount = this.querySelectorAll('.announcement__slide').length;
      this.sliderOptions = this.slider?.dataset.options ? JSON.parse(this.slider.dataset.options) : {};
    }

    connectedCallback() {
      if (this.slider && this.slidesCount > 1) {
        // Initialize slider immediately if we have multiple slides
        this.initSlider();
      }

      this.addEventListener('theme:block:select', (e) => {
        this.onBlockSelect(e);
      });

      this.addEventListener('theme:block:deselect', (e) => {
        this.onBlockDeselect(e);
      });

      this.addEventListener('theme:countdown:hide', (e) => {
        if (window.Shopify && window.Shopify.designMode) return;

        const isMarquee = e.target.closest('.announcement__bar-holder--marquee');

        if (this.slidesCount === 1) {
          const tickerBar = this.querySelector('ticker-bar');
          tickerBar.style.display = 'none';
        }

        if (isMarquee) {
          const tickerText = e.target.closest('.announcement__slide');
          this.removeTickerText(tickerText);
        } else {
          const slide = e.target.closest('[data-slide]');
          this.removeSlide(slide);
        }
      });

      this.addEventListener('theme:countdown:expire', () => {
        this.querySelectorAll('ticker-bar')?.forEach((ticker) => {
          ticker.dispatchEvent(new CustomEvent('theme:ticker:refresh'));
        });
      });

      document.dispatchEvent(new CustomEvent('theme:announcement:init', {bubbles: true}));
    }

    initSlider() {
      if (!this.slider || this.slidesCount <= 1) return;

      // Use Flickity directly without any conditional logic
      if (Flickity) {
        if (this.slider.flkty) {
          this.slider.flkty.destroy();
        }

        this.slider.flkty = new Flickity(this.slider, {
          fade: true,
          pageDots: false,
          adaptiveHeight: false,
          autoPlay: this.sliderOptions.autoPlay,
          prevNextButtons: this.sliderOptions.prevNextButtons,
          draggable: false
        });
      } else {
        console.error('Flickity not found. Slider will not function properly.');
      }
    }

    removeSlide(slide) {
      if (this.slider.flkty) {
        this.slider.flkty.remove(slide);

        if (this.slider.flkty.cells.length === 0) {
          this.closest('.announcement__wrapper').classList.add('hidden');
        }
      }
    }

    removeTickerText(tickerText) {
      const ticker = tickerText.closest('ticker-bar');
      tickerText.remove();
      ticker.dispatchEvent(new CustomEvent('theme:ticker:refresh'));
    }

    onBlockSelect(e) {
      if (this.slider && this.slider.flkty) {
        const index = parseInt(e.detail.blockId.split('-').pop()) - 1;
        this.slider.flkty.select(index);
        this.slider.flkty.pausePlayer();
      }
    }

    onBlockDeselect(e) {
      if (this.slider && this.slider.flkty) {
        if ({{ section.settings.slider_speed }} > 0) {
          this.slider.flkty.playPlayer();
        }
      }
    }

    disconnectedCallback() {
      if (this.slider && this.slider.flkty) {
        this.slider.flkty.destroy();
      }
    }
  }

  if (!customElements.get('announcement-bar')) {
    customElements.define('announcement-bar', AnnouncementBar);
  }

  // Force initialization when page loads
  document.addEventListener('DOMContentLoaded', function() {
    // Initialize all announcement bars with sliders
    document.querySelectorAll('announcement-bar').forEach(bar => {
      // Force slider initialization
      if (typeof bar.initSlider === 'function') {
        bar.initSlider();

        // Add backup initialization with a delay to ensure Flickity is loaded
        setTimeout(() => {
          if (typeof Flickity !== 'undefined') {
            const slider = bar.querySelector('[data-slider]');
            if (slider && !slider.classList.contains('flickity-enabled') && slider.children.length > 1) {
              bar.initSlider();
            }
          }
        }, 500);
      }

      // Force refresh ticker bars
      bar.querySelectorAll('ticker-bar')?.forEach(ticker => {
        ticker.dispatchEvent(new CustomEvent('theme:ticker:refresh'));
      });
    });
  });