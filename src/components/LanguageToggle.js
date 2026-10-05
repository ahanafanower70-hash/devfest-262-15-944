/**
 * LanguageToggle Component
 * Provides immediate dynamic switching between English and Bangla
 */

export class LanguageToggle {
  constructor(container, onLanguageChange, initialLang = 'en') {
    this.container = container;
    this.onLanguageChange = onLanguageChange;
    this.currentLang = initialLang;
    this.render();
  }

  setLanguage(lang) {
    this.currentLang = lang;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="flex items-center rounded-lg bg-slate-900 border border-slate-700 p-0.5">
        <button id="langEnBtn" class="px-2 py-1 text-xs font-semibold rounded transition ${
          this.currentLang === 'en' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
        }">
          EN
        </button>
        <button id="langBnBtn" class="px-2 py-1 text-xs font-semibold rounded transition ${
          this.currentLang === 'bn' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
        }">
          বাংলা
        </button>
      </div>
    `;

    this.container.querySelector('#langEnBtn').onclick = () => {
      this.currentLang = 'en';
      this.render();
      this.onLanguageChange('en');
    };

    this.container.querySelector('#langBnBtn').onclick = () => {
      this.currentLang = 'bn';
      this.render();
      this.onLanguageChange('bn');
    };
  }
}
