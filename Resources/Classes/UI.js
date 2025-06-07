import {
  getUIInstance,
  getGameInstance,
  getPlayerInstance,
} from "../Scripts/Shared.js";
import { i18n } from "./I18n.js";
import { Scene } from "./Scene.js";
import { SubScene } from "./SubScene.js";
// Animations class is now in its own file and typically used directly,
// so it might not need to be imported into UI.js unless UI methods specifically call Animations.method()
// For now, let's assume direct usage in other files is sufficient.
// import { Animations } from "./Animations.js";

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

  // 缓存已渲染内容
  lastRenderContent = {};
  
  // 当前主题
  currentTheme = 'dark';

  // 切换主题的方法
  toggleTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    document.body.classList.remove(isDark ? 'dark-theme' : 'light-theme');
    document.body.classList.add(isDark ? 'light-theme' : 'dark-theme');
    
    // 切换样式表的禁用状态
    document.querySelector('[href="Resources/Styles/dark-theme.css"]').disabled = isDark;
    document.querySelector('[href="Resources/Styles/light-theme.css"]').disabled = !isDark;
    
    this.currentTheme = isDark ? 'light' : 'dark';
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
  // 在需要创建按钮的地方，确保使用正确的事件处理
  createButton(name, content, callback, title = "", isForbid = false) {
    const t = document.createElement("button");
    t.id = name;
    t.innerHTML = content;
    if (title) t.title = title;
    
    // 确保回调函数被正确调用
    if (callback) {
      t.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        callback();
      };
    }
    
    if (isForbid) t.disabled = true;
    return t;
  }
}


