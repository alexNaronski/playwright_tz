import { test } from '@playwright/test';
import LoginPage from '../pages/loginPage';
import CartPage from '../pages/cartPage';

test.describe('Cart tests', () => {
  let loginPage, cartPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    cartPage = new CartPage(page);

    await page.goto('/login');
    await loginPage.login('test', 'test');
    await cartPage.manageCartState();
  });

  test('Переход в пустую корзину', async ({ }) => {
    await cartPage.openCart();
    await cartPage.checkDropdownVisibility();
    await cartPage.goToCart();
    await cartPage.verifyCartURL('/basket');
  });

  test('Переход в корзину с 1 неакционным товаром', async ({ }) => {
    await cartPage.buyFirstNonDiscountedProduct();
    await cartPage.checkCartItemCount(1);
    await cartPage.openCart();
    await cartPage.verifyProductsInCart();
    await cartPage.goToCart();
    await cartPage.verifyCartURL('/basket');
    await cartPage.verifyProductsInCartPage();
  });

  test('Переход в корзину с 1 акционным товаром', async ({ }) => {
    await cartPage.applyDiscountFilter();
    await cartPage.buyFirstDiscountedProduct();
    await cartPage.checkCartItemCount(1);
    await cartPage.openCart();
    await cartPage.verifyProductsInCart();
    await cartPage.goToCart();
    await cartPage.verifyCartURL('/basket');
    await cartPage.verifyProductsInCartPage();
  });

  test('Переход в корзину с 9 разными товарами', async ({ }) => {
    await cartPage.applyDiscountFilter();
    await cartPage.buyFirstDiscountedProduct();
    await cartPage.checkCartItemCount(1);
    await cartPage.applyDiscountFilter();
    await cartPage.buyMultipleProducts(9);
    await cartPage.checkCartItemCount(9);
    await cartPage.openCart();
    await cartPage.verifyProductsInCart();
    await cartPage.goToCart();
    await cartPage.verifyCartURL('/basket');
    await cartPage.verifyProductsInCartPage();
  });

  test('Переход в корзину с 9 акционными товарами одного наименования', async ({ }) => {
    await cartPage.buyDiscountedProductWithQuantity(9);
    await cartPage.checkCartItemCount(9);
    await cartPage.openCart();
    await cartPage.verifyProductsInCart();
    await cartPage.goToCart();
    await cartPage.verifyCartURL('/basket');
    await cartPage.verifyProductsInCartPage();
  });
});
