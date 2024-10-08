import { expect } from '@playwright/test';

class CartPage {
  constructor(page) {
    this.page = page;
    this.selectors = {
      cart: '#dropdownBasket',
      goToCartButton: '//a[contains(@class, "btn-primary") and contains(@href, "/basket")]',
      clearCartButton: '//div[contains(@class, "actionClearBasket")]//a',
      dropdownVisibility: '.dropdown-menu-right.show',
      basketItemCount: '.basket-count-items',
      discountFilterInput: '//input[@name="is-discount"]',
      nonDiscountedProduct: '//div[contains(@class, "note-item") and contains(@class, "card") and not(contains(@class, "hasDiscount"))]',
      discountedProduct: '//div[contains(@class, "note-item") and contains(@class, "card") and contains(@class, "hasDiscount")]',
      product: '//div[contains(@class, "note-item") and contains(@class, "card")]',
      buyButton: '.actionBuyProduct',
      productName: '.product_name',
      productPrice: '.product_price',
      basketItem: '.basket-item',
      basketItemTitle: '.basket-item-title',
      basketItemPrice: '.basket-item-price',
      basketPrice: '.basket_price',
      paginationNextPage: '.page-item:not(.active)',
      quantityInput: '//input[@name="product-enter-count"]',
      productCount: '.product_count',
    };

    this.addedProducts = new Set();
    this.expectedPrices = [];
  }

  async openCart() {
    await this.page.click(this.selectors.cart);
  }

  async goToCart() {
    await this.page.click(this.selectors.goToCartButton);
  }

  async clearCart() {
    await this.page.click(this.selectors.clearCartButton);
    await this.waitForResponse([
      'https://enotes.pointschool.ru/basket/clear',
      'https://enotes.pointschool.ru/basket/get'
    ]);
  }

  async manageCartState() {
    const cartItemCount = await this.getCartItemCount();
    const count = parseInt(cartItemCount, 10);

    if (count === 0) {
      console.log('Ничего не делаем');
      return;
    }

    if (count === 9) {
      console.log('Добавляем ещё один товар, чтоб было 10');
      await this.buyFirstNonDiscountedProduct();
      await this.checkCartItemCount(10);
    }

    console.log('Открываем корзину и чистим её');
    await this.openCart();
    await this.clearCart();
  }


  async waitForResponse(urls) {
    await Promise.all(urls.map(url =>
      this.page.waitForResponse(response => response.url() === url && response.status() === 200)
    ));
  }

  async checkDropdownVisibility() {
    await expect(this.page.locator(this.selectors.dropdownVisibility)).toBeVisible();
  }

  async checkCartItemCount(expectedCount) {
    const cartCount = await this.getCartItemCount();
    expect(cartCount).toBe(expectedCount.toString());
  }

  async verifyCartURL(expectedURL) {
    await expect(this.page).toHaveURL(expectedURL);
  }

  async applyDiscountFilter() {
    await this.page.click(this.selectors.discountFilterInput);
    await this.page.waitForSelector(this.selectors.discountedProduct);
    await this.page.waitForTimeout(5000);
  }

  async buyFirstNonDiscountedProduct() {
    const product = await this.getFirstNonDiscountedProduct();
    return this.buyProduct(product);
  }

  async buyFirstDiscountedProduct() {
    const product = await this.getFirstDiscountedProduct();
    return this.buyProduct(product);
  }

  async buyProduct(product) {
    const productName = await this.getProductName(product);
    const productPrice = await this.getProductPrice(product);

    const buyButton = product.locator(this.selectors.buyButton);
    await buyButton.click();

    this.addedProducts.add(productName);
    this.expectedPrices.push(productPrice);

    return { productName, productPrice };
  }

  async getFirstNonDiscountedProduct() {
    while (true) {
      const productsOnPage = await this.page.locator(this.selectors.nonDiscountedProduct).count();
  
      if (productsOnPage > 0) {
        return await this.page.locator(this.selectors.nonDiscountedProduct).first();
      } else {
        console.log('Нет товаров без скидки на текущей странице.');
        await this.goToNextPageIfNeeded();
        const nextPageButton = this.page.locator(this.selectors.paginationNextPage);
        if (await nextPageButton.count() === 0) {
          console.log('Нет больше страниц с товарами без скидки.');
          return null;
        }
      }
    }
  }
  

  async getFirstDiscountedProduct() {
    await this.page.waitForSelector(this.selectors.discountedProduct);
    return await this.page.locator(this.selectors.discountedProduct).first();
  }

  async getProductName(product) {
    return await product.locator(this.selectors.productName).innerText();
  }

  async getProductPrice(product) {
    const productPrice = await product.locator(this.selectors.productPrice).innerText();
    const priceMatch = productPrice.match(/(\d+\s*р\.)/);
    return priceMatch ? priceMatch[1].trim() : null;
  }

  async buyDiscountedProductWithQuantity(targetQuantity) {
    let totalAddedQuantity = 0;
  
    while (totalAddedQuantity < targetQuantity) {
      const product = await this.getFirstDiscountedProduct();
      const productName = await this.getProductName(product);
      const discountedPrice = await this.getProductPrice(product);
      const availableQuantity = await this.getAvailableProductQuantity(product);
  
      if (availableQuantity < targetQuantity - totalAddedQuantity) {
        console.log(`Недостаточно товара для продукта: ${productName} (доступно: ${availableQuantity}), пропускаем`);
        await this.goToNextPageIfNeeded();
        continue;
      }
  
      const quantityToBuy = Math.min(availableQuantity, targetQuantity - totalAddedQuantity);
      console.log(`Покупаем ${quantityToBuy} единиц товара: ${productName}`);
  
      const quantityInput = product.locator(this.selectors.quantityInput);
      await quantityInput.fill(String(quantityToBuy));
  
      const buyButton = product.locator(this.selectors.buyButton);
      await buyButton.click();
  
      this.addedProducts.add(productName);
      this.expectedPrices.push(discountedPrice);
  
      totalAddedQuantity += quantityToBuy;
      console.log(`Всего добавлено: ${totalAddedQuantity}/${targetQuantity}`);
  
      if (totalAddedQuantity >= targetQuantity) {
        console.log('Достигнуто целевое количество товаров');
        return;
      }
  
      await this.goToNextPageIfNeeded();
    }
  }

  async getAvailableProductQuantity(product) {
    const availableQuantity = await product.locator(this.selectors.productCount).innerText();
    return parseInt(availableQuantity, 10) || 0;
  }

  async buyMultipleProducts(targetCount) {
    while (this.addedProducts.size < targetCount) {
      await this.page.waitForSelector(this.selectors.product);
      console.log(`Добавленное количество продуктов: ${this.addedProducts.size}`);

      const allProducts = await this.page.locator(this.selectors.product).all();
      console.log(`Продукт ${allProducts.length} найден на текущей странице`);

      for (const product of allProducts) {
        const productName = await this.getProductName(product);
        console.log(`Проверка продукта: ${productName}`);

        if (!productName || this.addedProducts.has(productName)) {
          console.log(`Пропустить продукт: ${productName || 'Unnamed product'}`);
          continue;
        }

        await this.buyProduct(product);

        if (this.addedProducts.size >= targetCount) {
          console.log(`Целевое количество достигнуто: ${this.addedProducts.size}`);
          return;
        }
      }

      await this.goToNextPageIfNeeded();
    }
  }

  async goToNextPageIfNeeded() {
    const nextPageButton = this.page.locator(this.selectors.paginationNextPage);
    if (await nextPageButton.count() > 0) {
      console.log('Переход на следующую страницу');
      await nextPageButton.first().click();
      await this.page.waitForTimeout(3000);
      await this.page.evaluate(() => window.scrollTo(0, 0));
    } else {
      console.log('Нет больше страниц');
    }
  }

  async getCartItemCount() {
    const initialCount = await this.page.locator(this.selectors.basketItemCount).innerText();

    await this.page.waitForFunction((initialCount) => {
      const currentCount = document.querySelector('.basket-count-items').innerText;
      return currentCount !== initialCount;
    }, initialCount);

    return await this.page.locator(this.selectors.basketItemCount).innerText();
  }

  async verifyProductsInCart() {
    await this.page.waitForSelector(this.selectors.basketItem);
    const basketItems = await this.page.locator(this.selectors.basketItem);

    for (let i = 0; i < basketItems.length; i++) {
      const cartProductName = await basketItems.nth(i).locator(this.selectors.basketItemTitle).innerText();
      expect(cartProductName.trim()).toBe([...this.addedProducts][i].trim());

      const cartProductPrice = await basketItems.nth(i).locator(this.selectors.basketItemPrice).innerText();
      const expectedPrice = this.expectedPrices[i];

      await this.verifyPrice(cartProductPrice, expectedPrice);
    }

    await this.verifyTotalPrice();
  }

  async verifyProductsInCartPage() {
    await this.page.waitForSelector(this.selectors.basketItem);
    const basketItems = await this.page.locator(this.selectors.basketItem);

    for (let i = 0; i < basketItems.length; i++) {
      const cartProductName = await basketItems.nth(i).locator(this.selectors.basketItemTitle).innerText();
      expect(cartProductName.trim()).toBe([...this.addedProducts][i].trim());

      const cartProductPrice = await basketItems.nth(i).locator(this.selectors.basketItemPrice).innerText();
      const expectedPrice = this.expectedPrices[i];

      await this.verifyPrice(cartProductPrice, expectedPrice);
    }

    await this.verifyTotalPrice();
  }



  async verifyPrice(cartProductPrice, expectedPrice) {
    const isDiscounted = expectedPrice.includes('-');
    if (isDiscounted) {
      expect(cartProductPrice.trim()).toMatch(/-\s*\d+\s*р\.\s*/);
      const discountedPriceMatch = cartProductPrice.match(/(\d+\s*р\.)/);
      const discountedPrice = discountedPriceMatch ? discountedPriceMatch[1].trim() : null;
      expect(discountedPrice).toBe(expectedPrice.trim());
    } else {
      const cleanedCartProductPrice = cartProductPrice.replace(/^\-\s*/, '').trim();
      expect(cleanedCartProductPrice.trim()).toBe(expectedPrice.trim());
    }
  }

  async verifyTotalPrice() {
    const totalCartPrice = await this.page.locator(this.selectors.basketPrice).innerText();
    const cleanedTotalCartPrice = totalCartPrice.replace(/[^0-9]/g, '');
    const total = parseInt(cleanedTotalCartPrice, 10);

    const expectedTotal = this.expectedPrices.reduce((sum, price) => {
      const numericPrice = parseInt(price.replace(/\D/g, ''), 10);
      return sum + numericPrice;
    }, 0);
    console.log("Итоговая цена: " + total)
    console.log("Ожидаемая итоговая цена: " + expectedTotal)
    expect(total).toBe(expectedTotal);
  }
}

export default CartPage;
