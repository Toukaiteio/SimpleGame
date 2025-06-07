import { i18n } from "./I18n.js";

/**
 * 子场景类，包含文字展示内容和交互内容。
 *
 * @class SubScene
 */
export class SubScene {
  constructor(id) {
    this.id = id; // 子场景ID
    this.isSub = true;
    this.hasRoadTo = [];
    this.parentScene = null;
    this.isHiddenMoveButton = false;
    this.isAllowSave = true;
    this.isFinal = false;
    this.textContent = ""; // 文本内容 // this.textContent = i18n.t(this.id); // Example if it were to use i18n directly
    this.interactiveElements = []; // 交互内容（例如按钮）
  }

  /**
   * 设置子场景的文本内容。
   * @param {string} text - 要显示的文本内容。
   */
  setTextContent(text) {
    this.textContent = text;
  }

  /**
   * 添加一个交互内容到子场景中。
   * @param {HTMLElement[]} elements - 交互内容对象，例如按钮或输入框。
   */
  addInteractiveElement(...elements) {
    this.interactiveElements = this.interactiveElements.concat(elements);
  }
  /**
   * 移除一个交互内容。
   * @param {HTMLElement} element - 交互内容对象，例如按钮或输入框。
   */
  removeInteractiveElement(element, isRemove = true) {
    const inters = this.interactiveElements;
    const loc = inters.indexOf(element);
    if (loc !== -1) {
      this.interactiveElements = inters
        .slice(0, loc)
        .concat(inters.slice(loc + 1));
    }
    if (isRemove) element.remove();
  }
  /**
   * 更新子场景的状态。
   * 在调用此方法时，先执行子场景更新操作，再进行其他操作。
   */
  updateSelf() {
    // 执行子场景更新逻辑
    // 例如，更新文本内容和交互元素
  }
  /**
   * 获取自身ID
   */
  getId() {
    return "#" + this.id;
  }
  /**
   * 子场景被渲染后的回调
   */
  onRendered() {
    return;
  }
  /** 子场景被渲染前的回调
   * @param {Scene} scene - 负责渲染该子场景的场景
   */
  beforeRendered(scene) {
    return;
  }
}
