/*
Usage Notes: 

The following web component can be dropped into any standard Shopify theme (i.e. non-headless), using Liquid to pass product data:

  {% assign skioSellingPlanGroups = product.selling_plan_groups | where: 'app_id', 'SKIO' %}
  {% if skioSellingPlanGroups.size > 0 %}
    <skio-plan-picker 
      product='{{ product | json | escape }}'
      selectedVariant='{{ product.selected_or_first_available_variant | json | escape }}'
      formId='{{ product_form_id }}'
      currency='{{ cart.currency.iso_code }}'
      useVariantInputClickEvents='false'
      variantInputSelector=''
      >
    </skio-plan-picker>
    <input type="hidden" aria-hidden="true" name="selling_plan" value="">
    <script src="{{ 'skio-plan-picker-component.js' | asset_url }}" type="module"></script>
  {% endif %}

  Note: formId not required if element is inside of a form already

  Example variantChanged event dispatch:
  document.dispatchEvent( new CustomEvent("variantChanged", { detail: { variantId: variant.id } }) );
*/

import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';

const skioStyles = css`
  .skio-plan-picker {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 0;
    border: 0;
    max-width: 500px;
  }
  .skio-onetime-second {
    order: 2;
  }
  
  .skio-group-container {
    display: none;
  }
  .skio-group-container--available {
    display: block;
    position: relative;
    box-shadow: 0 0 5px rgba(23, 24, 24, 0.05), 0 1px 2px rgba(0, 0, 0, 0.07);
    border-radius: 5px;
    border-width: 1px;
    border-color: transparent;
    border-style: solid; 
    transition: border-color 0.2s ease;
  }
  .skio-group-container--selected {
    border-color: #000;
  }
  
  .skio-group-input {
    position: absolute;
    width: 0px;
    height: 0px;
    opacity: 0;
  }
  .skio-group-input:focus-visible ~ .skio-group-label {
    outline: 2px #ccc solid;
    outline-offset: 4px;
    border-radius: 5px;
  }
  
  .skio-group-label {
    display: flex;
    flex-direction: column;
    cursor: pointer;
    padding: 10px;
    overflow: hidden;
  }
  
  .skio-group-topline {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    width: 100%;
    font-size: 16px;
  }
  
  .skio-radio__container {
    display: flex;
    margin-right: 10px;
  }
  
  .skio-radio {
    transition: transform 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.25s cubic-bezier(0.4,0,0.2,1);
    transform-origin: center;
    transform: scale(0);
    opacity: 0;
  }
  .skio-group-label:hover .skio-radio {
    transform: scale(1);
    opacity: 0.75;
  }
  .skio-group-container--selected .skio-group-label .skio-radio {
    transform: scale(1);
    opacity: 1;
  }
  
  .skio-price {
    margin-left: auto;
  }
  
  .skio-group-content {
    width: auto;
    margin-left: 30px;
    transition: max-height 0.25s cubic-bezier(0.4,0,0.2,1),
                opacity 0.25s cubic-bezier(0.4,0,0.2,1);
    max-height: 38px;
    opacity: 1;
  }
  
  /* Hide frequency if not selected */
  .skio-group-container:not(.skio-group-container--selected) .skio-group-content {
    max-height: 0;
    opacity: 0;
    pointer-events: none;
  }
  
  .skio-group-title {
    min-width: max-content;
  }
  
  .skio-save {
    color: #0fa573;
    border: 1px #0fa573 solid; 
    padding: 0px 8px;
    border-radius: 20px;
    white-space: nowrap;
  }
  
  .skio-frequency {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 8px 30px 8px 10px;
    margin-top: 5px;
    border-radius: 5px;
    background-color: #f7f7f7;
    width: 100%;
    border: 0;
    font-size: 14px;
    font-family: inherit;
    white-space: nowrap;
    text-overflow: ellipsis;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' class='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E");
    background-position: right 10px top 50%;
    background-size: 18px;
    background-repeat: no-repeat;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
  }
  .skio-frequency.skio-frequency--one {
    background-image: none;
    pointer-events: none;
  }
  
  .skio-frequency span {
    text-transform: lowercase;
  }

  button.add-to-cart {
    justify-content: center;
    font-weight: 400;
    text-transform: capitalize;
    letter-spacing: 0;
    font-style: normal;
    font-size: 16px;
    text-decoration: none;
    box-shadow: 0 0 #0000004d inset;
    width: 100%;
    color: #fff;
    background-color: #000;
    border-radius: 5px;
    transition-duration: .3s;
    padding: 10px 32px;
    text-transform: uppercase;
    cursor: pointer;
    font-family: 'FK Grotesk Neue Trial';
    transition: border-color 0.25s ease, background-color 0.25s ease, color 0.25s ease;

    border: solid 2px rgba(0,0,0,0);
  }
  button.add-to-cart:hover {
    background-color: rgba(0,0,0,0);
    color: #000;
    border-color: #000;
  }

  .skio-details {
    --text-color: #333;
    --text-color-secondary: #888; 
    
    user-select: none;
    -webkit-user-select: none;
    margin-bottom: 20px;
    order: 3;
    max-width: max-content;
  }

  .skio-details summary::-webkit-details-marker,
  .skio-details summary::marker,
  .skio-details slot {
    color: rgba(0,0,0,0) !important;
  }

  .skio-details summary {
    margin-top: 15px;
  }

  .skio-details summary span {
    font-size: 0.9em;
    display: flex;
    padding: .5em 0;
    cursor: pointer;
    align-items: center;
    gap: 10px;
    text-decoration: underline;

    margin-top: -40px;
    color: #000;
  }

  @keyframes fadeInDown {
    0% {
      opacity: 0;
      transform: translateY(-15px);
    }
    100% {
      opacity: 1;
      transform: translateY(0px);
    }
  }
  .skio-details[open] > .skio-details--content {
    animation-name: fadeInDown;
    animation-duration: 0.3s;
  }

  .skio-details--content {
    position: absolute;
    z-index: 1020;
    padding: 1em;
    width: fit-content;
    border-radius: 5px;
    background: white;
    box-shadow: 0 0 5px rgb(23 24 24 / 5%), 0 1px 2px rgb(0 0 0 / 7%);
  }

  .skio-details ul {
    margin: 0;
    padding: 0;
  }

  .skio-details ul li {
    display: flex;
    align-items: flex-start;
    gap: .75em;

    margin-bottom: 1em;
  }

  .skio-details .skio-content {
    display: flex;
    flex-direction: column;
  }

  .skio-details .skio-content p {
    font-size: 0.9em;

    margin-top: 0;
    margin-bottom: 0;

    letter-spacing: 0;
    line-height: 1.5;

    color: var(--text-color);
  }

  .skio-details ul li small {
    font-size: 0.7em;
    color: var(--text-color-secondary);
  }

  .skio-details .skio-icon {
    display: flex;

    width: 2.25em;
    height: 2.25em;

    color: var(--text-color);
    background: #f8f8f8;
    border-radius: 100%;

    flex-shrink: 0;
    align-items: center;
    justify-content: center;
  }

  .skio-details .skio-icon svg {
    width: 1.25em;
    height: 1.25em;

    color: inherit;
  }

  .skio-details--footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.9em;
  }

  .skio-details--footer a {
    color: var(--text-color);
  }

  .skio-manage-link {
    text-decoration: underline;
  }

  .powered-by-skio {
    font-size: 0.8em;

    display: flex;
    text-decoration: none;
    
    align-items: center;
    gap: 3px;
  }

`;

export class SkioPlanPickerComponent extends LitElement {
  static properties = {
    product: { type: Object },            //required
    productHandle: { type: String },      //optional (unless product isn't passed, then required)
    key: { type: String },                //optional, defaults to product.id; identifier for this instance of the Skio plan picker
    
    formId: { type: String },             //optional; if passed, used to connect input fields to form
    needsFormId: { type: Boolean },       //optional, defaults to false; if true, element needs to be passed a formId, else it searches for a form

    subscriptionFirst: { type: Boolean }, //optional, defaults to false; if true, shows subscription option above onetime
    startSubscription: { type: Boolean }, //optional, defaults to false; if true, auto-selects subscription on page load
    discountFormat: { type: String },     //optional, defaults to percent; can also pass "fixed"
    
    currency: { type: String },           //optional, defaults to 'USD', but can pass any 3 char identifier
    language: { type: String },           //optional, defaults to 'en-US', but can pass any similarly formatted language identifier
    moneyFormatter: {},                   //placeholder for object

    externalPriceSelector: { type: String },      //optional, used to update the external price

    externalPriceSelectorWithCurrency: { type: String },      //optional, used to update the external price
  
    selectedVariant: { type: Object },    //placeholder for data
    skioSellingPlanGroups: {},            //placeholder for data
    availableSellingPlanGroups: {},       //placeholder for data
    selectedSellingPlanGroup: {},         //placeholder for data
    selectedSellingPlan: {},              //placeholder for data

    defaultFrequency: {},                 //placeholder for data

    showAddToCartButton: { type: Boolean },

    meta: {},

    useVariantInputClickEvents: {type: Boolean}, // optional, allows use of variant input click events to update skio's selectedVariant
    variantInputSelector: {}
  };

  static styles = skioStyles;

  constructor() {
    super();
    this.product = null;
    this.selectedVariant = null;

    this.productHandle = null;

    this.purchaseOption = 'onetime';

    this.key = null;
    this.formId = null;
    this.needsFormId = false;

    this.skioSellingPlanGroups = [];
    this.availableSellingPlanGroups = [];

    this.selectedSellingPlanGroup = null;
    this.selectedSellingPlan = null;

    this.startSubscription = false;
    this.subscriptionFirst = false;

    this.skioMainProduct = true;

    this.discountFormat = 'percent';

    this.externalPriceSelector = '[skio-external-price]';

    this.externalPriceSelectorWithCurrency = '[skio-external-price-with-currency]';

    this.currency = Shopify.currency.active;
    this.language = 'en-US';
    this.moneyFormatter = new Intl.NumberFormat(this.language, {
      style: 'currency',
      currency: this.currency,
    });

    this.defaultFrequency = null;

    this.showAddToCartButton = false;

    this.meta = '';

    this.lastSellingPlanName = '';

    this.showDetailsHover = false;

    this.useVariantInputClickEvents = null;
    this.variantInputSelector = null;

  }

  connectedCallback() {
    super.connectedCallback();

    if (this.startSubscription == true) {
      this.purchaseOption = 'subscription';
    }

    if(!this.product && this.productHandle) {
      this.fetchProduct(this.productHandle);
    }

    if (this.needsFormId && this.formId == null) {
      let forms = document.querySelectorAll('form[action="/cart/add"]');
      if (forms.length > 0) {
        let form;
        forms.forEach((el) => {
          if (el.hasAttribute('skio-key')) {
            if (el.getAttribute('skio-key') == this.key) form = el;
          }
        });
        if (!form) form = forms[0];
        this.formId = form.id;
        this.requestUpdate();
      }
    }
    let skio = this;
    document.addEventListener("variantChanged", function(e) {
      //update variant id
      let variantId = e.detail.variantId;
      let variant = skio.product.variants.find(x => x.id == variantId);
      if (variant) skio.selectedVariant = variant;
      else skio.log("Unable to find variant with id: ", variantId);
      skio.requestUpdate();
    });

    this.moneyFormatter = new Intl.NumberFormat(this.language, {
      style: 'currency',
      currency: skio.currency,
    });

    if (this.meta !== '') this.meta = JSON.parse(this.meta);

    if (this.useVariantInputClickEvents) {
      document.addEventListener('load', skio.addVariantClickEventListeners)
    }

  }

  render() {
    if(!this.product || !this.selectedVariant || this.skioSellingPlanGroups.length == 0 || !this.product?.available) return;
    
    return html`
      <fieldset class="skio-plan-picker" skio-plan-picker="${ this.key }">
        <input ${ this.formId !== null ? html`form="${ this.formId }"` : '' } name="selling_plan" type="hidden" value="${ this.selectedSellingPlan !== null ? this.selectedSellingPlan?.id : ''}" />
        <input ${ this.formId !== null ? html`form="${ this.formId }"` : '' } name="properties[Discount]" type="hidden" value="${ this.selectedSellingPlan !== null ? this.discount(this.selectedSellingPlan).percent : '' }" 
          ?disabled="${ this.selectedSellingPlan == null ? true : false }" />
        
        <div class="skio-group-container ${ this.product.requires_selling_plan == false ? 'skio-group-container--available' : '' } ${ this.selectedSellingPlanGroup == null ? 'skio-group-container--selected' : '' } ${ this.subscriptionFirst ? 'skio-onetime-second' : ''}" skio-group-container  skio-group-container--onetime
          @click=${() => this.selectSellingPlanGroup(null) } >
        
          <input id="skio-one-time-${ this.key }" class="skio-group-input" name="skio-group-${ this.key }" type="radio" value="" 
            skio-one-time ?checked=${ this.startSubscription == false && this.product.requires_selling_plan == false ? true : false }>
          <label class="skio-group-label" for="skio-one-time-${ this.key }">
            <div class="skio-group-topline">
              <div class="skio-radio__container">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"></circle>
                  <circle class="skio-radio" cx="12" cy="12" r="7" fill="currentColor"></circle>
                </svg>
              </div>
              <div class="skio-group-title">
                One-time
              </div>
              <div class="skio-price">
                <span skio-onetime-price>${ this.moneyFormatter.format(this.selectedVariant.price / 100) }</span>
              </div>
            </div>
          </label>
        </div>
        ${ this.availableSellingPlanGroups ? this.availableSellingPlanGroups.map((group, index) => 
          html`
            <div class="skio-group-container skio-group-container--available ${ this.selectedSellingPlanGroup == group ? 'skio-group-container--selected' : '' }" skio-group-container skio-group-container--subscription
              @click=${() => this.selectSellingPlanGroup(group) }>
              <input id="skio-selling-plan-group-${ index }-${ this.key }" class="skio-group-input" name="skio-group-${ this.key }"
                type="radio" value="${ group.id }" skio-selling-plan-group="${ group.id }" ?checked=${ this.selectedSellingPlanGroup == group ? true : false } >
              <label class="skio-group-label" for="skio-selling-plan-group-${ index }-${ this.key }">
                <div class="skio-group-topline">
                  <div class="skio-radio__container">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"></circle>
                      <circle class="skio-radio" cx="12" cy="12" r="7" fill="currentColor"></circle>
                    </svg>
                  </div>
                  <div class="skio-group-title">
                  ${ group.name == 'Subscription' ? 'Subscribe & Save' : group.name }
                    ${ this.discount(group.selected_selling_plan).percent !== '0%' ? html`
                      <span class="skio-save">Save <span skio-discount>${ this.discountFormat == 'percent' ? this.discount(group.selected_selling_plan).percent : this.money(this.discount(group.selected_selling_plan).amount) }</span></span>
                    ` : html`` }
                  </div>
                  <div class="skio-price">
                    ${ this.selectedVariant.price > this.selectedVariant.price - this.discount(group.selected_selling_plan).amount ? html`
                      <del>${ this.moneyFormatter.format(this.selectedVariant.price / 100) }</del>
                    ` : html`` }
                    <span skio-subscription-price>${ this.price(group.selected_selling_plan) }</span>
                  </div>
                </div>
                <div class="skio-group-content">
                  <select skio-selling-plans="${ group.id }" class="skio-frequency${ group.selling_plans.length == 1 ? ' skio-frequency--one' : '' }"
                    @change=${ (e) => this.selectSellingPlan(e.target, group) }>
                    ${ group ? group.selling_plans.map((selling_plan) => 
                      html`
                      <option value="${ selling_plan.id }" ?selected=${group.selected_selling_plan == selling_plan }>
                        ${ group.name == 'Subscription' ? `Deliver ${ selling_plan.name.toLowerCase() }` : `${ selling_plan.name }` }
                      </option>
                      `
                    ): ''}
                  </select>
                </div>
              </label>
            </div>
          `
        ): ''}

            <details class="skio-details" @mouseover=${ (e) => this.detailsMouseover() } @mouseleave=${ (e) => this.detailsMouseleave() }>
              <summary>
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ai ai-ArrowRepeat"><path d="M18 2l3 3-3 3"/><path d="M6 22l-3-3 3-3"/><path d="M21 5H10a7 7 0 0 0-7 7"/><path d="M3 19h11a7 7 0 0 0 7-7"/></svg>
                
                  How do subscriptions work?
                </span>
              </summary>
              <div class="skio-details--content">
                <ul>
                  <li>
                    <div class="skio-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div class="skio-content">
                      <p>Get exclusive deals</p>
                      <small>Subscribe for unique discounts</small>
                    </div>
                  </li>
                  <li>
                    <div class="skio-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </div>
                    <div class="skio-content">
                      <p>Edit your subscription anytime</p>
                      <small>Edit products, delivery schedule and more</small>
                    </div>
                  </li>
                  <li>
                    <div class="skio-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    
                    <div class="skio-content">
                      <p>No commitment</p>
                      <small>Easy to cancel if it’s not for you</small>
                    </div>
                  </li>
                </ul>
                <div class="skio-details--footer">
                  <a class="skio-manage-link" href="/a/account/login">Manage subscriptions</a> 
                  
                  <a style="letter-spacing: 0" class="powered-by-skio" href="https://skio.com/?utm_source=eonsincshop.myshopify.com&utm_medium=details_popover" target="_blank" rel="noopener">
                    Powered by
                    <svg width="24" height="11" viewBox="0 0 24 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4.28399 5.78801C4.12399 5.63601 3.93599 5.50801 3.71999 5.40401C3.50399 5.30001 3.27599 5.24801 3.03599 5.24801C2.85199 5.24801 2.67999 5.28401 2.51999 5.35601C2.36799 5.42801 2.29199 5.55201 2.29199 5.72801C2.29199 5.89601 2.37599 6.01601 2.54399 6.08801C2.71999 6.16001 2.99999 6.24001 3.38399 6.32801C3.60799 6.37601 3.83199 6.44401 4.05599 6.53201C4.28799 6.62001 4.49599 6.73601 4.67999 6.88001C4.86399 7.02401 5.01199 7.20001 5.12399 7.40801C5.23599 7.61601 5.29199 7.86401 5.29199 8.15201C5.29199 8.52801 5.21599 8.84801 5.06399 9.11201C4.91199 9.36801 4.71199 9.57601 4.46399 9.73601C4.22399 9.89601 3.95199 10.012 3.64799 10.084C3.34399 10.156 3.03999 10.192 2.73599 10.192C2.24799 10.192 1.76799 10.116 1.29599 9.96401C0.831989 9.80401 0.443989 9.57201 0.131989 9.26801L1.23599 8.10401C1.41199 8.29601 1.62799 8.45601 1.88399 8.58401C2.13999 8.71201 2.41199 8.77601 2.69999 8.77601C2.85999 8.77601 3.01599 8.74001 3.16799 8.66801C3.32799 8.58801 3.40799 8.45201 3.40799 8.26001C3.40799 8.07601 3.31199 7.94001 3.11999 7.85201C2.92799 7.76401 2.62799 7.67201 2.21999 7.57601C2.01199 7.52801 1.80399 7.46401 1.59599 7.38401C1.38799 7.30401 1.19999 7.19601 1.03199 7.06001C0.871989 6.92401 0.739989 6.75601 0.635989 6.55601C0.531989 6.35601 0.479989 6.11601 0.479989 5.83601C0.479989 5.47601 0.555989 5.17201 0.707989 4.92401C0.859989 4.66801 1.05599 4.46001 1.29599 4.30001C1.53599 4.14001 1.79999 4.02401 2.08799 3.95201C2.38399 3.87201 2.67599 3.83201 2.96399 3.83201C3.41199 3.83201 3.84799 3.90401 4.27199 4.04801C4.70399 4.18401 5.06799 4.39201 5.36399 4.67201L4.28399 5.78801Z" fill="black"/>
                      <path d="M12.8481 10H10.4121L8.45615 7.13201H8.42015V10H6.44015V0.928009H8.42015V6.44801H8.45615L10.3641 4.02401H12.7521L10.4481 6.72401L12.8481 10Z" fill="black"/>
                      <path d="M15.7009 2.11601C15.7009 2.26801 15.6689 2.41201 15.6049 2.54801C15.5489 2.67601 15.4689 2.78801 15.3649 2.88401C15.2689 2.98001 15.1489 3.05601 15.0049 3.11201C14.8689 3.16801 14.7249 3.19601 14.5729 3.19601C14.2529 3.19601 13.9849 3.09201 13.7689 2.88401C13.5529 2.66801 13.4449 2.41201 13.4449 2.11601C13.4449 1.97201 13.4729 1.83601 13.5289 1.70801C13.5849 1.57201 13.6649 1.45601 13.7689 1.36001C13.8729 1.26401 13.9929 1.18801 14.1289 1.13201C14.2649 1.06801 14.4129 1.03601 14.5729 1.03601C14.7249 1.03601 14.8689 1.06401 15.0049 1.12001C15.1489 1.17601 15.2689 1.25201 15.3649 1.34801C15.4689 1.44401 15.5489 1.56001 15.6049 1.69601C15.6689 1.82401 15.7009 1.96401 15.7009 2.11601ZM13.5889 10V4.02401H15.5569V10H13.5889Z" fill="black"/>
                      <path d="M23.4516 6.98801C23.4516 7.47601 23.3636 7.92001 23.1876 8.32001C23.0116 8.71201 22.7716 9.04801 22.4676 9.32801C22.1636 9.60001 21.8116 9.81201 21.4116 9.96401C21.0116 10.116 20.5836 10.192 20.1276 10.192C19.6796 10.192 19.2516 10.116 18.8436 9.96401C18.4436 9.81201 18.0916 9.60001 17.7876 9.32801C17.4916 9.04801 17.2556 8.71201 17.0796 8.32001C16.9036 7.92001 16.8156 7.47601 16.8156 6.98801C16.8156 6.50001 16.9036 6.06001 17.0796 5.66801C17.2556 5.27601 17.4916 4.94401 17.7876 4.67201C18.0916 4.40001 18.4436 4.19201 18.8436 4.04801C19.2516 3.90401 19.6796 3.83201 20.1276 3.83201C20.5836 3.83201 21.0116 3.90401 21.4116 4.04801C21.8116 4.19201 22.1636 4.40001 22.4676 4.67201C22.7716 4.94401 23.0116 5.27601 23.1876 5.66801C23.3636 6.06001 23.4516 6.50001 23.4516 6.98801ZM21.5556 6.98801C21.5556 6.79601 21.5236 6.60801 21.4596 6.42401C21.3956 6.24001 21.3036 6.08001 21.1836 5.94401C21.0636 5.80001 20.9156 5.68401 20.7396 5.59601C20.5636 5.50801 20.3596 5.46401 20.1276 5.46401C19.8956 5.46401 19.6916 5.50801 19.5156 5.59601C19.3396 5.68401 19.1916 5.80001 19.0716 5.94401C18.9596 6.08001 18.8716 6.24001 18.8076 6.42401C18.7516 6.60801 18.7236 6.79601 18.7236 6.98801C18.7236 7.18001 18.7516 7.36801 18.8076 7.55201C18.8716 7.73601 18.9636 7.90401 19.0836 8.05601C19.2036 8.20001 19.3516 8.31601 19.5276 8.40401C19.7036 8.49201 19.9076 8.53601 20.1396 8.53601C20.3716 8.53601 20.5756 8.49201 20.7516 8.40401C20.9276 8.31601 21.0756 8.20001 21.1956 8.05601C21.3156 7.90401 21.4036 7.73601 21.4596 7.55201C21.5236 7.36801 21.5556 7.18001 21.5556 6.98801Z" fill="black"/>
                    </svg>
                  </a>
                  
                </div>
              </div>
            </details>

            ${ this.showAddToCartButton ? html`
              <button @click=${() => this.addToCart() } class="add-to-cart">Add to Cart</button>
            ` : html``}

      </fieldset>`
  }

  updated = (changed) => {
    if(changed.has('product') && this.product) {
      //update key
      this.key = this.key ? this.key : this.product.id;

      //update skioSellingPlanGroups
      this.skioSellingPlanGroups = this.product.selling_plan_groups.filter(
        selling_plan_group => selling_plan_group.app_id === 'SKIO'
      )

      this.skioSellingPlanGroups.forEach((group) => {
        group.selling_plans.sort(function(a,b){
          if (parseInt(a.name.replace(/\D/g, "")) < parseInt(b.name.replace(/\D/g, ""))) return -1;
          if (parseInt(a.name.replace(/\D/g, "")) > parseInt(b.name.replace(/\D/g, ""))) return 1;
          if (parseInt(a.name.replace(/\D/g, "")) == parseInt(b.name.replace(/\D/g, ""))) return 0;
        })
      });

    }

    if(changed.has('selectedVariant') && this.selectedVariant) {
      //update availableSellingPlanGroups based on skioSellingPlanGroups and selectedVariant.id
      let skioSellingPlanGroups = JSON.parse(JSON.stringify(this.skioSellingPlanGroups));
      this.availableSellingPlanGroups = skioSellingPlanGroups.filter(selling_plan_group =>
        selling_plan_group.selling_plans.some(selling_plan =>
          this.selectedVariant.selling_plan_allocations.some(
            selling_plan_allocation => selling_plan_allocation.selling_plan_id === selling_plan.id
          )
        )
      )

      //update selectedSellingPlan value
      if (this.availableSellingPlanGroups?.length > 0) {
        //update each group with a default selected_selling_plan

        this.availableSellingPlanGroups.forEach((group) => {
          group.selling_plans = group.selling_plans.filter(x => this.selectedVariant.selling_plan_allocations.find(y => y.selling_plan_id == x.id) );
        })

        this.availableSellingPlanGroups.forEach((group => {
          if (this.defaultFrequency) {
            let selling_plan = group.selling_plans.find(x => x.name.toLowerCase().includes(this.defaultFrequency.toLowerCase()));
            if (selling_plan) group.selected_selling_plan = selling_plan;
            else group.selected_selling_plan = group.selling_plans[0];
          } else {
            group.selected_selling_plan = group.selling_plans[0];
          }
       }));

        if (this.startSubscription == true || this.product.requires_selling_plan == true || this.purchaseOption == 'subscription') {
          //find a matching selling plan, or choose first available

          if (this.selectedSellingPlan == null || this.selectedSellingPlan == undefined) {
            this.selectSellingPlanGroup(this.availableSellingPlanGroups[0]);
          }

          let sellingPlanName = this.selectedSellingPlan?.name;

          let sellingPlanGroup = this.availableSellingPlanGroups.find(x => x.selling_plans.find(y => y.name == sellingPlanName));
          let sellingPlan = sellingPlanGroup?.selling_plans.find(y => y.name == sellingPlanName);
          if (sellingPlanName == sellingPlan.name) {
            this.selectedSellingPlanGroup = sellingPlanGroup;
            this.selectedSellingPlan = sellingPlan;
          } else {
          this.selectedSellingPlanGroup = this.availableSellingPlanGroups[0];
          this.selectedSellingPlan = this.availableSellingPlanGroups[0].selling_plans[0];
          }

        } else {
          this.selectedSellingPlan, this.selectedSellingPlanGroup = null
        }
      } else {
        this.selectedSellingPlan, this.selectedSellingPlanGroup = null
      }

      //update the form that was passed, if any
      this.updateForm();

    }

    if(changed.has('selectedSellingPlan')) {
      //update price of price elements if applicable
      document.querySelectorAll(`[skio-price][skio-key="${ this.key }"]`).forEach((el) => {
        el.innerHTML = this.price(this.selectedSellingPlan);
      });

      //update display of external content elements
      document.querySelectorAll(`[skio-onetime-content][skio-key="${ this.key }"]`).forEach((el) => {
        this.selectedSellingPlan !== null ? el.style.display = "none" : el.style.removeProperty('display');
      });

      document.querySelectorAll(`[skio-subscription-content][skio-key="${ this.key }"]`).forEach((el) => {
        this.selectedSellingPlan == null ? el.style.display = "none" : el.style.removeProperty('display');
      });

      //dispatch CustomEvent to tell that this specific plan picker was updated, and pass the selectedSellingPlan
      const event = new CustomEvent(`skio::update-selling-plan`, {
        bubbles: true, 
        composed: true, 
        detail: {
          sellingPlan: this.selectedSellingPlan,
          key: this.key
        }
      });

      this.dispatchEvent(event);

      //update the form that was passed, if any
      this.updateForm();
      this.updateExternalPrice();

      //update external selling_plan input value
      let sellingPlanInput = document.querySelector('input[name="selling_plan"]')
      this.selectedSellingPlan != null ? sellingPlanInput.value = this.selectedSellingPlan.id : sellingPlanInput.value = ''

    }

    if(changed.has('formId')) {
      //update the form that was passed, if any
      this.updateForm();
    }

  }

  log = (...args) => {
    args.unshift('%c[skio]', 'color: #8770f2;');
    console.log.apply(console, args);
  }

  error = (...args) =>  {
    args.unshift('%c [skio]', 'color: #ff0000');
    console.error.apply(console, args);
  }

  detailsMouseover() {
    let details = this.renderRoot.querySelector('.skio-details');
    let summary = this.renderRoot.querySelector('.skio-details summary');
    if (!details.hasAttribute('open') && this.showDetailsHover == false) {
      summary.click();
      this.showDetailsHover = true;
    }
  }

  detailsMouseleave() {
    let details = this.renderRoot.querySelector('.skio-details');
    let summary = this.renderRoot.querySelector('.skio-details summary');
    if (details.hasAttribute('open') && this.showDetailsHover == true) {
      summary.click();
      this.showDetailsHover = false;
    }
  }

  updatePriceElement() {
    let priceEl = document.querySelector(`[data-skio-price="${ this.product.id }"]`);
    if (priceEl) {
      //add formatted price here
      let high = 0;
      this.product.variants.forEach((variant) => {
        if (variant.price > high) high = variant.price;
      });
      let content = '';
      if (!this.selectedSellingPlan) {
        content = this.moneyFormatter.format(this.selectedVariant.price / 100).replaceAll('A', '');
      } else {
        content = `<del>${this.moneyFormatter.format(high / 100).replaceAll('A', '')}</del>${this.price(this.selectedSellingPlan).replaceAll('A', '')}`;
      }
      priceEl.innerHTML = content;
    }
  }

  getMetadata(field) {
    let meta = this.meta;
    if (meta !== {}){
      let fieldData = meta[field];
      if (fieldData) return fieldData;
      else return '';
    }
  }

  getVariantMetadata(variantId, field) {
    let meta = this.meta;
    if (meta !== {}){
      let variantData = meta[variantId];
      if (variantData) {
        let fieldData = variantData[field];
        if (fieldData) return fieldData;
        else return '';
      }
    }
  }

  updateExternalPrice() {
    document.querySelectorAll(this.externalPriceSelector).forEach((el) => {
      this.selectedSellingPlan ? el.innerHTML = this.price(this.selectedSellingPlan) : el.innerHTML = this.money( this.selectedVariant.price);
    })
    document.querySelectorAll(this.externalPriceSelectorWithCurrency).forEach((el) => {
      this.selectedSellingPlan ? el.innerHTML = this.price(this.selectedSellingPlan) + ' ' + this.currency : el.innerHTML = this.money( this.selectedVariant.price) + ' ' + this.currency;
    })
  }
  
  // Update selected selling plan group; called on click of skio-group-container element
  selectSellingPlanGroup(group) {
    this.selectedSellingPlanGroup = group;
    this.selectedSellingPlan = group?.selected_selling_plan;
    if (this.selectedSellingPlan) this.lastSellingPlanName = this.selectedSellingPlan.name;
    if (group) this.purchaseOption = 'subscription'
    else this.purchaseOption = 'onetime'

    //update the form that was passed, if any
    this.updateForm();
  }

  // Update selected selling plan; called on change of skio-frequency select element
  selectSellingPlan(element, group) {
    let selling_plan = group.selling_plans.find(x => x.id == element.value);
    if (selling_plan) {
      group.selected_selling_plan = selling_plan;
      this.selectedSellingPlanGroup = group;
      this.selectedSellingPlan = selling_plan;
      this.lastSellingPlanName = this.selectedSellingPlan.name;
    }
    else this.log("Error: couldn't find selling plan with id " + element.value + " for variant " + this.selectedVariant.id + " from product " + this.product.id + " : " + this.product.handle);
  }

  // Update selected selling plan; called on change of skio-frequency select element
  selectSellingPlanButton(plan, group) {
    let selling_plan = group.selling_plans.find(x => x.id == plan.id);
    if (selling_plan) {
      group.selected_selling_plan = selling_plan;
      this.selectedSellingPlanGroup = group;
      this.selectedSellingPlan = selling_plan;
      this.lastSellingPlanName = this.selectedSellingPlan.name;
    }
    else this.log("Error: couldn't find selling plan with id " + element.value + " for variant " + this.selectedVariant.id + " from product " + this.product.id + " : " + this.product.handle);
  }

  // Formats integer value into money value
  money(price) {
    return this.moneyFormatter.format(price / 100.0)
  }

  // Calculates discount based on selling_plan.price_adjustments, returns { percent, amount } of selling plan discount
  discount(selling_plan) {

    if (!selling_plan)
      return { percent: '0%', amount: 0 }

    if (selling_plan.name.includes('prepaid')) {

      let option = selling_plan.options[0]['value'];

      var numberPattern = /\d+/g;
      let result = parseInt(option.match( numberPattern ).join(''));

      const price_adjustment = selling_plan.price_adjustments[0]
      const discount = { percent: '0%', amount: 0 }
      const price = this.selectedVariant.price * result;
      
      switch (price_adjustment.value_type) {
        case 'percentage':
          discount.percent = `${price_adjustment.value}%`
          discount.amount = Math.round(
            (price * price_adjustment.value) / 100.0
          )
          break
        case 'fixed_amount':
          discount.percent = `${Math.round(
            ((price_adjustment.value * 1.0) / price) * 100.0
          )}%`
          discount.amount = price - price_adjustment.value
          break
        case 'price':
          discount.percent = `${Math.round(
            (((price - price_adjustment.value) * 1.0) /
              price) *
              100.0
          )}%`
          discount.amount = price - price_adjustment.value
          break
      }
      
      return discount

    } else {

      const price_adjustment = selling_plan.price_adjustments[0]
      const discount = { percent: '0%', amount: 0 }
      const price = this.selectedVariant.price;
      
      switch (price_adjustment.value_type) {
        case 'percentage':
          discount.percent = `${price_adjustment.value}%`
          discount.amount = Math.round(
            (price * price_adjustment.value) / 100.0
          )
          break
        case 'fixed_amount':
          discount.percent = `${Math.round(
            ((price_adjustment.value * 1.0) / price) * 100.0
          )}%`
          discount.amount = price_adjustment.value
          break
        case 'price':
          discount.percent = `${Math.round(
            (((price - price_adjustment.value) * 1.0) /
              price) *
              100.0
          )}%`
          discount.amount = price - price_adjustment.value
          break
      }
      
      return discount

    }
    
  }

  // Calculates the variant's price for the given selling plan, returns a formatted money value (if desired)
  price(selling_plan, formatted = true) {

    if (selling_plan.name.includes('prepaid')) {

      let option = selling_plan.options[0]['value'];
      var numberPattern = /\d+/g;
      let result = parseInt(option.match( numberPattern ).join(''));

      return formatted
        ? this.money( (this.selectedVariant.price * result) - this.discount(selling_plan).amount)
        :  (this.selectedVariant.price * result) - this.discount(selling_plan).amount

    } else {

      return formatted
        ? this.money( this.selectedVariant.price - this.discount(selling_plan).amount)
        :  this.selectedVariant.price - this.discount(selling_plan).amount

    }

    
  }

  // If a formId was passed, appends the necessary <input> elements to the form
  updateForm() {
    if (this.formId) {
      let form = document.querySelector(`#${this.formId}`);

      if (form) {
        let selling_plan_input = form.querySelector('[name="selling_plan"]');
        if (selling_plan_input) {
          selling_plan_input.value = this.selectedSellingPlan?.id !== undefined ? this.selectedSellingPlan?.id : null;
          selling_plan_input.disabled = this.selectedSellingPlan?.id !== undefined ? false : true;
        } else {
          selling_plan_input = document.createElement('input');
          selling_plan_input.type = "hidden";
          selling_plan_input.name = "selling_plan";
          selling_plan_input.value = this.selectedSellingPlan?.id !== undefined ? this.selectedSellingPlan?.id : null;
          selling_plan_input.disabled = this.selectedSellingPlan?.id !== undefined ? false : true;
          form.append(selling_plan_input);
        }

        let discountValue = this.selectedSellingPlan?.id !== undefined ? this.discount(this.selectedSellingPlan).percent : null;
        if (discountValue == '0%') discountValue = null;
        if (discountValue !== null && this.discountFormat !== 'percent') discountValue = this.money(this.discount(this.selectedSellingPlan).amount);

        let discount_input = form.querySelector('[name="properties[Discount]"]');
        if (discount_input) {
          discount_input.value = this.selectedSellingPlan?.id !== undefined ? this.discount(this.selectedSellingPlan).percent : null;
          discount_input.disabled = this.selectedSellingPlan?.id !== undefined ? false : true;
          if (discountValue == null) discount_input.disabled = true;
        } else {
          discount_input = document.createElement('input');
          discount_input.type = "hidden";
          discount_input.name = "properties[Discount]";
          discount_input.value = discountValue;
          discount_input.disabled = this.selectedSellingPlan?.id !== undefined ? false : true;
          if (discountValue == null) discount_input.disabled = true;
          form.append(discount_input);
        }

      } else {
        console.log(`Skio error: form ID is ${ this.formId }, but no form with that ID was found.`);
      }
    }
  }

  addVariantClickEventListeners() {
    let variantInputs = document.querySelectorAll(this.variantInputSelector)
    let skio = this
    for (let el of variantInputs) {
      el.addEventListener('click', function(e) {
        // may need to replace with ID / e.target depending on client setup
        // may need to use different attribute depending on ^^
        let variantTitle = e.currentTarget.value
        skio.selectedVariant = skio.product.variants.find(variant => variant.title == variantTitle)
      })
    }
  }

  // Optional functions keep if necessary 

  /**
   *   
   * 
   */
  
  // Runs a fetch request to add the selectedVariant to the cart with the passed quantity and selectedSellingPlan
  addToCart(quantity = 1) {
    const items = [
      {
        id: this.selectedVariant.id,
        quantity: quantity,
        ...(this.selectedSellingPlan && { selling_plan: this.selectedSellingPlan?.id })
      }
    ];

    fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ items })
    })
    .then((response) => response.json())
    .then((response) => {
      this.log("SKIO added item to cart: ", response);
      //dispatch CustomEvent to tell document that an item was added to cart
      const event = new CustomEvent(`skio::added-to-cart`, {
        bubbles: true, 
        composed: true, 
        detail: {
          response,
          key: this.key
        }
      });

      this.dispatchEvent(event);
    })
    .catch((error) => {
      this.error(`SKIO ${ this.key } error adding item to cart: `, error);
    });
  } 

  fetchProduct = (handle) => {
    return fetch(`/products/${ handle }.js`)
    .then((response) => response.json())
    .then((product) => {
      this.product = product;
      this.selectedVariant = product.variants[0];

      return product;
    });
  }
}

customElements.define('skio-plan-picker', SkioPlanPickerComponent);

//Mutation observer to hide / remove widget of old app
// document.addEventListener("DOMContentLoaded", function() {
//   if (document.querySelectorAll(".shopify-product-form").length > 0) {
//     let rechargeObserver = 
//       new MutationObserver(function(mutationsList, observer) {
//         for(const mutation of mutationsList) {
//           document.querySelectorAll(".rc-container-wrapper").forEach((el) => el.remove())
//         }
//       }).observe(document.querySelector(".shopify-product-form"), { childList: true, subtree: true });
//   }
// })