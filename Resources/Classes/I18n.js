/**
 * 国际化类
 *
 * 为游戏提供国际化支持
 *
 * @class I18n
 */
class I18n {
  constructor(defaultLanguage = "cn") {
    this.currentLanguage = defaultLanguage;
    this.translations = {};
  }

  /**
   * 加载指定语言的 JSON 资源文件。
   * @param {string} language - 语言代码，如 'en' 或 'zh'。
   * @returns {Promise<void>}
   */
  async loadLanguage(language) {
    try {
      const response = await fetch(`./Resources/I18n/${language}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load language file: ${language}`);
      }
      this.translations = await response.json();
      this.currentLanguage = language;
      this.updateUI();
    } catch (error) {
      console.error(error);
    }
  }
  m(key, text){
    this.translations[key] = text;
  }
  /** 获取字符串中所有<#与#>之间的文本内容 */
  getInnerText(str) {
    const regex = /<#(.*?)#>/g;
    let matches = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
      matches.push(match[1]);
    }

    return matches;
  }
  getTranslation(key) {
    if(!key) return '';
    const text = this.translations[key] || key;
    const innerText = this.getInnerText(text);
    let result = text;
    if (innerText.length > 0) {
      for (const inner of innerText) {
        result = result.replace(`<#${inner}#>`, this.t(inner));
      }
    }
    return result;
  }
  /**
   * 根据键名获取翻译内容。
   * @param {string[]} keys - 要获取的翻译键名。
   * @returns {string} - 翻译后的文本。
   */
  t(...keys) {
    return keys
      .map((key) => this.getTranslation(key))
      .join("");
  }
  /**
   * 根据键名获取翻译内容。
   * @param {string[]} keys - 要获取的翻译键名。
   * @returns {string} - 翻译后的文本。
   */
  th(...keys) {
    return keys
      .map((key) => this.getTranslation(key).replaceAll("\n", "<br/>"))
      .join(" ");
  }
  /**
   * 根据键名获取翻译内容并格式化。
   * @param {string} key - 要获取的翻译键名。
   * @param {Object<string|string>} fmt - 格式化需要用到的各种数据
   * @returns {string} - 翻译后的文本。
   */
  f(key, fmt) {
    let result = this.getTranslation(key).replaceAll("\n", "<br/>");
    for (const i in fmt) {
      result = result.replaceAll(`<%${i}%>`, fmt[i]);
    }
    return result;
  }
  /**
   * 更新UI中的所有可翻译元素。
   */
  updateUI() {
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      element.innerText = this.t(key);
    });
  }
}

// 导出一个单例模式的 I18n 实例
export const i18n = new I18n();
