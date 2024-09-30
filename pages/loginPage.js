class LoginPage {
    constructor(page) {
      this.page = page;
      this.usernameInput = '#loginform-username';
      this.passwordInput = '#loginform-password';
      this.loginButton = 'button[name="login-button"]';
    }
  
    async login(username, password) {
      await this.page.click(this.usernameInput);
      await this.page.keyboard.type(username);
      await this.page.click(this.passwordInput);
      await this.page.keyboard.type(password);

      const isEnabled = await this.page.isEnabled(this.loginButton);
      if (isEnabled) {
        await this.page.click(this.loginButton);
      } else {
        throw new Error('Login button is disabled.');
      }
    }
  }
  
  export default LoginPage;
  