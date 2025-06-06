import {
  getUIInstance,
  getGameInstance,
  getPlayerInstance,
} from "../Scripts/Shared.js";
import { i18n } from "./I18n.js";
import { SeededRandom } from "./Random.js";
import { SaveController } from "../Classes/Save.js";

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
    this.textContent = ""; // 文本内容
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
    return game.createEvent(
      game.eventWrapper(
        "renderScene",
        { rederingScene: this, container: container },
        {
          after: async (self, game) => {
            const container = self.data.container;
            const scene = self.data.rederingScene;
            container.innerHTML = ""; // 清空容器
            const fragment = document.createDocumentFragment();
            for (const componentId in scene.components) {
              fragment.appendChild(scene.components[componentId]);
            }
            for (const road of scene.hasRoadTo) {
              fragment.appendChild(scene.createMoveToComponent(road));
            }
            container.appendChild(fragment);
          },
        }
      )
    );
  }
  updateSelf() {
    return;
  }
}

/**
 * UI类，控制游戏UI的渲染和场景调度。
 *
 * @class UI
 */
export class UI {
  static instance = null;
  static getInstance() {
    if (!UI.instance) {
      throw new Error("UI instance not found.");
    }
    return UI.instance;
  }
  /**
   * 构造函数，初始化UI类的属性
   * @param {HTMLElement} gameContainer - 游戏容器DOM元素
   */
  constructor(gameContainer) {
    if (UI.instance) {
      throw new Error("UI instance already exists.");
    }
    this.gameContainer = gameContainer;
    this.gameContainer.classList.add("GameView");
    gameContainer.addEventListener("click", (e) => {
      const game = getGameInstance();
      const current = getUIInstance().getCurrentScene();
      game.insertEvent(
        game.eventWrapper(
          "sceneClicked",
          { rederingScene: current, container: gameContainer, clickEvent: e },
          {
            after: async (self, game) => {
              return;
            },
          }
        )
      );
    });
    /**
     * 存储所有加载的场景
     * @type {Object<string, Scene>}
     */
    this.scenes = {};

    /**
     * 场景栈，用于管理当前的场景切换
     * @type {Scene[]}
     */
    this.sceneStack = [];

    /**
     * 当前正在显示的场景
     * @type {Scene | null}
     */
    this.currentScene = null;
    UI.instance = this;
  }

  /**
   * 加载场景并存储
   * @param {string} sceneId - 场景的唯一标识符
   * @param {Scene} scene - 要加载的Scene对象
   */
  loadScene(sceneId, scene) {
    this.scenes[sceneId] = scene;
  }

  /**
   * 切换场景，将新场景压入场景栈并显示
   * @param {Scene} scene - 要切换到的Scene对象
   */
  changeScene(scene) {
    if (this.currentScene) {
      this.sceneStack.push(this.currentScene);
    }
    scene.updateSelf();
    this.currentScene = scene;
    this.currentScene.render(this.gameContainer);
  }
  /**
   * 获取当前的场景
   * @returns {Scene | SubScene}
   */
  getCurrentScene() {
    if (this.currentScene.hasSubScene || this.currentScene.subScenes) {
      return this.currentScene.currentSubScene
        ? this.currentScene.subScenes[this.currentScene.currentSubScene]
        : this.currentScene;
    }
    return this.currentScene;
  }
  /**
   * 通过SceneID显示并更新场景，清除该场景后的场景栈
   * @param {string} sceneId - 要显示的场景ID
   */
  displayScene(sceneId) {
    const scene = this.scenes[sceneId];
    if (!scene) {
      console.error(`Scene with ID ${sceneId} not found.`);
      return;
    }

    // 在场景栈中寻找该场景的位置
    const sceneIndex = this.sceneStack.findIndex((s) => s.id === sceneId);

    if (sceneIndex !== -1) {
      // 如果找到，将该场景后的所有场景从栈中移除
      this.sceneStack = this.sceneStack.slice(0, sceneIndex + 1);
    } else {
      // 如果未找到，将当前场景压入栈中
      if (this.currentScene) {
        this.sceneStack.push(this.currentScene);
      }
    }

    // 更新当前场景并渲染
    scene.updateSelf();
    this.currentScene = scene;
    this.gameContainer.setAttribute("id", sceneId);

    this.currentScene.render(this.gameContainer);
  }

  /**
   * 获取场景栈中的最后一个场景
   * @returns {Scene | null} - 返回最后一个场景对象，如果栈为空则返回null
   */
  getLastScene() {
    return this.sceneStack.length > 0
      ? this.sceneStack[this.sceneStack.length - 1]
      : null;
  }
  /**
   * 获取指定ID的场景
   * @param {string} sceneId - 要获取的场景ID
   * @returns {Scene | null} - 返回最后一个场景对象，如果栈为空则返回null
   */
  getScene(sceneId) {
    const scene = this.scenes[sceneId];
    return scene || null;
  }
  /**
   * 获取游戏容器
   * @returns {HTMLElement | null} - 返回游戏所在容器
   */
  getContainer() {
    return this.gameContainer;
  }
  /**
   * 刷新场景
   */
  update() {
    const current = this.getCurrentScene();
    if (current.isSub) {
      current.parentScene.render(this.gameContainer);
    } else {
      current.render(this.gameContainer);
    }
  }

  /** 根据传入的参数创建一系列用于执行参数中方法的按钮
   *  @param {Object<String, Function>} methods - 包含方法的对象
   */
  static createButtons(methods) {
    const buttons = [];
    for (const method in methods) {
      const button = document.createElement("button");
      button.innerHTML = i18n.t(method);
      button.addEventListener("click", methods[method]);
      buttons.push(button);
    }
    return buttons;
  }
}

/**
 * Animations类，提供一些动画函数
 *
 * @class Animations
 */
export class Animations {
  static appendUsingDocumentFragment(parentElement, htmlString) {
    const fragment = document.createDocumentFragment();
    const tempContainer = document.createElement("div");
    tempContainer.innerHTML = htmlString;
    while (tempContainer.firstChild) {
      fragment.appendChild(tempContainer.firstChild);
    }
    parentElement.appendChild(fragment);
  }
  static write(element, text) {
    Animations.appendUsingDocumentFragment(element, `<div>${text}</div>`);
  }
  static writeWithHTML(element, htmlString) {
    Animations.appendUsingDocumentFragment(element, htmlString);
  }

  static attachHoverDescription(element, title, desc) {
    let timer;
    let tooltip;
    let isInsideTooltip = false;
    element.hasTooltip = true;
    const updateTooltipPosition = (e) => {
      tooltip.style.left = `${e.pageX}px`;
      tooltip.style.top = `${e.pageY}px`;
    };

    const showTooltip = (e) => {
      if (tooltip) return; // 防止重复创建 tooltip

      try {
        tooltip = document.createElement("div");
        tooltip.style.all = "initial";
        tooltip.style.position = "absolute";
        tooltip.style.background = "rgba(0, 0, 0, 0.8)";
        tooltip.style.color = "#fff";
        tooltip.style.padding = "10px";
        tooltip.style.borderRadius = "5px";
        tooltip.style.transition = "opacity 0.4s ease-in-out";
        tooltip.style.opacity = "0";
        tooltip.style.pointerEvents = "none";
        tooltip.classList.add("Tooltip", "DYSTooltip");
        // 使用 textContent 替代 innerHTML 提升安全性
        const strongElement = document.createElement("strong");
        strongElement.textContent = title;
        tooltip.appendChild(strongElement);
        tooltip.appendChild(document.createElement("br"));
        const descElement = document.createElement("div");
        descElement.innerHTML = desc;
        tooltip.appendChild(descElement);

        element.appendChild(tooltip);

        updateTooltipPosition(e);
        tooltip.style.opacity = "1";
        element.addEventListener("mousemove", updateTooltipPosition, {
          once: true,
        });

        // 添加事件监听器以处理子 Tooltip 的情况
        tooltip.addEventListener("mouseenter", () => {
          isInsideTooltip = true;
        });

        tooltip.addEventListener("mouseleave", () => {
          isInsideTooltip = false;
          hideTooltip();
        });
        if (!element.isConnected) {
          isInsideTooltip = false;
          hideTooltip(true);
        }
      } catch (error) {
        console.error("Failed to create tooltip:", error);
      }
    };
    const hideTooltip = (isForced = false) => {

      if (tooltip) {
        if(isForced) {
          tooltip.remove();
          tooltip = null;
        } else {
          tooltip.style.opacity = "0";
          setTimeout(() => {
            if (tooltip && !isInsideTooltip) {
              try {
                tooltip.remove();
                tooltip = null;
              } catch (error) {
                console.error("Failed to remove tooltip:", error);
              }
            }
          }, 400);
        }

      }
    };
    const handleMouseEnter = (e) => {
      clearTimeout(timer); // 清除之前的计时器
      timer = setTimeout(() => showTooltip(e), 1000);
    };

    const handleMouseLeave = () => {
      clearTimeout(timer);
      if (!isInsideTooltip) hideTooltip();
    };

    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("mouseleave", handleMouseLeave);
  }
  static clearAllTooltips() {
    const ExsitingTooltips = document.querySelectorAll(
      "div.Tooltip.DYSTooltip"
    );
    for (const tooltip of ExsitingTooltips) {
      tooltip.remove();
    }
  }
  static displayMessage(type = "info", msg, duration = 3000) {
    const containerId = "message-container";
    let container = document.getElementById(containerId);

    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      container.style.position = "fixed";
      container.style.top = "10px";
      container.style.right = "10px";
      container.style.zIndex = "1000";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.alignItems = "flex-end";
      container.style.gap = "10px";
      document.body.appendChild(container);
    }

    const message = document.createElement("div");
    message.style.position = "relative";
    message.style.padding = "10px 20px";
    message.style.width = "fit-content";
    message.style.borderRadius = "5px";
    message.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
    message.style.transition = "transform 0.3s ease, opacity 0.3s ease";
    message.style.transform = "translateX(100%)";
    message.style.opacity = "0";
    message.innerHTML = msg;

    switch (type) {
      case "warning":
        message.style.backgroundColor = "#f0ad4e";
        message.style.color = "#fff";
        break;
      case "error":
        message.style.backgroundColor = "#d9534f";
        message.style.color = "#fff";
        break;
      case "info":
      default:
        message.style.backgroundColor = "#5bc0de";
        message.style.color = "#fff";
        break;
    }

    container.insertBefore(message, container.firstChild);

    requestAnimationFrame(() => {
      message.style.transform = "translateX(0)";
      message.style.opacity = "1";
    });

    setTimeout(() => {
      message.style.transform = "translateX(100%)";
      message.style.opacity = "0";
      message.addEventListener("transitionend", () => {
        message.remove();
        if (container.children.length === 0) {
          container.remove();
        }
      });
    }, duration);
  }
}


export class FastComponent {
  /**
   * 创建一个按钮样式的单选框组
   * @param {string} title 标题
   * @param {Array<{content: string, onSelect: function(FastComponent): void, onCancel: function(FastComponent): void}>} choices 选项数组
   * @param {number} [defaultIndex=0] 默认选中项索引
   * @param {function(number): void} [onChange] 选中变化回调，返回所选索引
   * @returns {HTMLElement} 包含RadioGroup的DOM元素，可通过.value获取当前选中索引，未选中返回-1
   */
  static RadioGroup(title, choices, defaultIndex = 0, onChange = () => {}) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("radio-group", "card");
    const buttonWrapper = document.createElement("div");
    buttonWrapper.style.display = "flex";
    buttonWrapper.style.flexWrap = "wrap";
    buttonWrapper.style.gap = "8px";
    buttonWrapper.style.width = "100%";
    const titleEl = document.createElement("div");
    titleEl.classList.add("primaryTitle");
    titleEl.textContent = title;
    wrapper.appendChild(titleEl);

    let selected = defaultIndex;

    const buttonsFragment = document.createDocumentFragment();
    const buttons = choices.map((choice, i) => {
      const btn = document.createElement("button");
      btn.classList.add("primaryButton");
      btn.textContent = choice.content;
      if (i === defaultIndex) btn.classList.add("active");

      btn.addEventListener("click", () => {
        // Need to access buttons array for forEach, so map still needed for the array.
        // Or, querySelectorAll on buttonWrapper if fragment wasn't used for buttons array.
        buttonWrapper.querySelectorAll('.primaryButton').forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        if (selected !== i) {
          if (choices[selected]?.onCancel) choices[selected].onCancel(wrapper);
          if (choice.onSelect) choice.onSelect(wrapper);
          selected = i;
          wrapper.value = selected; // Update wrapper value
          onChange(i);
        }
      });
      // onChange(selected); // Call onChange initially or after loop
      buttonsFragment.appendChild(btn);
      return btn; // Still return btn to potentially build 'buttons' array if needed elsewhere, though direct DOM manipulation is via fragment
    });
    onChange(selected); // Initial call

    buttonWrapper.appendChild(buttonsFragment);
    wrapper.appendChild(buttonWrapper);
    wrapper.value = selected; // Ensure wrapper.value is set initially
    wrapper.setWarning = (msg) => {
      wrapper.title = msg;
    };

    return wrapper;
  }

  /**
   * 创建一个按钮样式的多选框组
   * @param {string} title 标题
   * @param {string} desc 描述
   * @param {Array<{content: string, onSelect: function(FastComponent): void, onCancel: function(FastComponent): void}>} selections 选项数组
   * @param {Array<number>} [defaultIndices=[]] 默认选中项索引数组
   * @param {function(Array<number>): void} [onChange] 选中变化回调，返回所选索引数组
   * @returns {HTMLElement} 包含CheckboxGroup的DOM元素，可通过.value获取当前选中索引数组
   */
  static CheckboxGroup(title, desc, selections, defaultIndices = [], onChange = () => {}) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("checkbox-group", "card");
    wrapper.style.display = "flex";
    wrapper.style.flexWrap = "wrap";
    wrapper.style.justifyContent = "space-around";

    const titleEl = document.createElement("div");
    titleEl.classList.add("primaryTitle");
    titleEl.textContent = title;
    wrapper.appendChild(titleEl);

    const descEl = document.createElement("div");
    descEl.classList.add("primaryDesc");
    descEl.textContent = desc;
    wrapper.appendChild(descEl);

    const selected = new Set(defaultIndices);

    const buttonsFragment = document.createDocumentFragment();
    const buttons = selections.map((choice, i) => {
      const btn = document.createElement("button");
      btn.classList.add("primaryButton");
      btn.textContent = choice.content;
      
      btn.addEventListener("click", () => {
        if (selected.has(i)) {
          selected.delete(i);
          btn.classList.remove("active");
          choice.onCancel?.(wrapper);
        } else {
          selected.add(i);
          btn.classList.add("active");
          choice.onSelect?.(wrapper);
        }
        wrapper.value = [...selected]; // Update wrapper value
        onChange([...selected]);
      });
      if (selected.has(i)) {
        // Simulate click after element is in DOM or ensure active class is set
         btn.classList.add("active"); // Set active class directly
      }
      buttonsFragment.appendChild(btn);
      return btn; // Still return btn if array needed
    });

    wrapper.appendChild(buttonsFragment);
    // Initial onChange call after all buttons potentially processed by `btn.click()` or class set
    onChange([...selected]);


    wrapper.value = [...selected]; // Ensure wrapper.value is set initially
    wrapper.setWarning = (msg) => {
      wrapper.title = msg;
    };

    return wrapper;
  }

  /**
   * 创建一个滑动条和输入框联动组件
   * @param {string} title 标题
   * @param {string} desc 描述
   * @param {number} min 最小值
   * @param {number} max 最大值
   * @param {number} step 步长
   * @param {number} defaultVal 默认值
   * @param {function(number): void} [onChange] 值变化回调
   * @returns {HTMLElement} DOM元素，可通过.value获取当前值
   */
  static RangedSlide(title, desc, min = 0, max = 100, step = 1, defaultVal = 15, onChange = () => {}) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("card");
    const titleEl = document.createElement("div");
    titleEl.classList.add("primaryTitle");
    titleEl.textContent = title;
    wrapper.appendChild(titleEl);

    const descEl = document.createElement("div");
    descEl.classList.add("primaryDesc");
    descEl.textContent = desc;
    wrapper.appendChild(descEl);

    const input = document.createElement("input");
    input.type = "range";
    input.classList.add("primaryRange");
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = defaultVal;

    const number = document.createElement("input");
    number.type = "number";
    number.classList.add("primaryInputText");
    number.min = min;
    number.max = max;
    number.step = step;
    number.value = defaultVal;

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.appendChild(input);
    container.appendChild(number);
    wrapper.appendChild(container);

    function sync(val) {
      input.value = val;
      number.value = val;
      wrapper.value = parseFloat(val);
      onChange(wrapper.value);
    }

    input.addEventListener("input", () => sync(input.value));
    number.addEventListener("input", () => sync(number.value));
    if(defaultVal != null) {
      wrapper.value = defaultVal;
      onChange(wrapper.value);
    }
    wrapper.setWarning = (msg) => {
      wrapper.title = msg;
    };

    return wrapper;
  }

  /**
   * 创建一个带标签的文本输入框
   * @param {string} title 标题
   * @param {string} desc 描述
   * @param {string} label 输入框标签
   * @param {string} placeholder 占位符
   * @param {string} [defaultVal=""] 默认值
   * @param {function(string): void} [onChange] 值变化回调
   * @returns {HTMLElement} DOM元素，可通过.value获取当前输入内容
   */
  static TextInput(title, desc, label, placeholder, defaultVal = "", onChange = () => {}) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("text-input", "card");
    if(title != null) {
      const titleEl = document.createElement("div");
      titleEl.classList.add("primaryTitle");
      titleEl.textContent = title;
      wrapper.appendChild(titleEl);
    }
    

    if(desc != null) {
      const descEl = document.createElement("div");
      descEl.classList.add("primaryDesc");
      descEl.textContent = desc;
      wrapper.appendChild(descEl);
    }

    const labelEl = document.createElement("label");
    if(label != null) {
      labelEl.classList.add("primaryLabel");
      labelEl.textContent = label;
    }
    

    const input = document.createElement("input");
    input.classList.add("primaryInputText");
    input.placeholder = placeholder;
    if(defaultVal != null) {
      input.value = defaultVal;
      onChange(input.value);
    }

    if(label != null) {
      labelEl.appendChild(input);
      wrapper.appendChild(labelEl);
    } else {
      wrapper.appendChild(input);
    }
    

    input.addEventListener("input", () => {
      wrapper.value = input.value;
      onChange(input.value);
    });

    wrapper.value = defaultVal;
    wrapper.setWarning = (msg) => {
      wrapper.title = msg;
    };

    return wrapper;
  }

  /**
   * 创建一个下拉菜单（支持嵌套）
   * @param {string} title 标题
   * @param {string} desc 描述
   * @param {Array<{content: string, value: any, sub: object|null}>} items 下拉项数组
   * @param {any} [defaultVal=""] 默认值
   * @param {function(any): void} [onChange] 值变化回调
   * @returns {HTMLElement} DOM元素，可通过.value获取当前选中值
   */
  static DropMenu(title, desc, items, defaultVal = "", onChange = () => {}) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("card");
    const titleEl = document.createElement("div");
    titleEl.classList.add("primaryTitle");
    titleEl.textContent = title;
    wrapper.appendChild(titleEl);

    const descEl = document.createElement("div");
    descEl.classList.add("primaryDesc");
    descEl.textContent = desc;
    wrapper.appendChild(descEl);

    const select = document.createElement("select");
    select.classList.add("primaryInputText");

    function appendOption(item, depth = 0) {
      const option = document.createElement("option");
      option.textContent = "—".repeat(depth) + item.content;
      option.value = item.value;
      select.appendChild(option);
      if (item.sub) appendOption(item.sub, depth + 1);
    }

    items.forEach(item => appendOption(item));

    if(defaultVal != null) {
      select.value = defaultVal;
      onChange(select.value);
    }
    

    select.addEventListener("change", () => {
      wrapper.value = select.value;
      onChange(wrapper.value);
    });

    wrapper.value = defaultVal;
    wrapper.setWarning = (msg) => {
      wrapper.title = msg;
    };

    wrapper.appendChild(select);
    return wrapper;
  }
}
