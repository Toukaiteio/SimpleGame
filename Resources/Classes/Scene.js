import { getPlayerInstance, getGameInstance } from "../Scripts/Shared.js";
import { i18n } from "./I18n.js";

/**
 * 场景类，管理场景的基本功能和组件。
 *
 * @class Scene
 */
export class Scene {
  /**
   * 构造函数，初始化Scene类的属性
   * @param {string} id - 场景的唯一标识符
   */
  constructor(id) {
    this.id = id;
    this.hasRoadTo = [];
    /**
     * 场景内的组件列表
     * @type {Object<string, HTMLElement>}
     */
    this.components = {};
  }
  /**
   * 获取自身ID
   */
  getId() {
    return this.id;
  }
  /**
   * 创建并添加组件到场景内
   * @param {string} componentId - 组件的唯一标识符
   * @param {string} type - 组件的类型（如"button", "input", "text"等）
   * @param {Object} options - 组件的配置选项（如样式、文本、事件等）
   */
  createComponent(componentId, type, options = {}) {
    let component;

    switch (type) {
      case "button":
        component = document.createElement("button");
        component.textContent = options.text || i18n.t(componentId);
        if (options.onClick) {
          component.addEventListener("click", options.onClick);
        }
        break;
      case "input":
        component = document.createElement("input");
        component.type = options.inputType || "text";
        break;
      case "text":
        component = document.createElement("span");
        component.textContent = options.text || i18n.t(componentId);
        break;
      // 其他类型组件的创建逻辑...
    }

    // 应用样式
    if (options.style) {
      Object.assign(component.style, options.style);
    }
    if (component && options.i18n)
      component.setAttribute("data-i18n", options.i18n);
    this.components[componentId] = component;
  }
  /**
   * 获取指定组件
   * @param {string} componentId - 组件的唯一标识符
   * @param {HTMLElement } component - 返回组件的DOM对象
   */
  addComponent(componentId, component) {
    this.components[componentId] = component;
  }
  /**
   * 获取指定组件
   * @param {string} componentId - 组件的唯一标识符
   * @returns {HTMLElement | undefined} - 返回组件的DOM对象
   */
  getComponent(componentId) {
    return this.components[componentId];
  }
  /**
   * 生成移动组件，用于处理场景间的移动
   * @param {string} sceneName - 目标场景
   * @returns {HTMLElement | undefined} - 返回组件的DOM对象
   */
  createMoveToComponent(sceneName) {
    const moveToFunction = () => {
      getPlayerInstance().moveTo(sceneName);
    };
    const moveToElement = document.createElement("button");
    moveToElement.onclick = moveToFunction;
    moveToElement.innerHTML = i18n.t(
      "moveTo",
      sceneName.startsWith("#") ? sceneName.replace("#", "") : sceneName
    );
    return moveToElement;
  }
  /**
   * 渲染场景内的所有组件到指定的容器
   * @param {HTMLElement} container - 要渲染到的容器元素
   */
  render(container) {
    const game = getGameInstance();
    const event = game.createEvent(
      game.eventWrapper(
        "renderScene",
        { rederingScene: this, container: container },
        {
          after: async (self, game) => {
            const container = self.data.container;
            const scene = self.data.rederingScene;

            // 使用文档片段减少重绘
            const fragment = document.createDocumentFragment();

            // 添加卡片容器
            const cardContainer = document.createElement("div");
            cardContainer.className = "scene-card";

            for (const componentId in scene.components) {
              cardContainer.appendChild(scene.components[componentId]);
            }

            for (const road of scene.hasRoadTo) {
              cardContainer.appendChild(scene.createMoveToComponent(road));
            }

            fragment.appendChild(cardContainer);
            container.innerHTML = ""; // 清空容器
            container.appendChild(fragment);
          },
        }
      )
    );
    event.allowInsertion = false;
    return event
  }
  updateSelf() {
    return;
  }
}
