import { Scene } from "../Classes/Scene.js";
import { SubScene } from "../Classes/SubScene.js";
import {
  getUIInstance,
  getPlayerInstance,
  getGameInstance,
} from "../Scripts/Shared.js";
import { log } from "../Classes/Utils.js";
import { SaveController } from "../Classes/SaveController.js";
import { i18n } from "../Classes/I18n.js";
import { Animations } from "../Classes/Animations.js";
import { FastComponent } from "../Classes/FastCompoent.js"; // Corrected filename
/**
 * GameStoryTeller 子场景列表
 */
export let subSceneList = {};
/**
 * GameStoryTeller 场景类
 * 用于展示剧情并提供与子场景的交互功能。
 */
class GameStoryTeller extends Scene {
  static setSubSceneList(list) {
    subSceneList = list;
  }
  static instance = null;
  static getInstance() {
    if (!GameStoryTeller.instance) {
      GameStoryTeller.instance = new GameStoryTeller();
    }
    return GameStoryTeller.instance;
  }
  constructor() {
    super("GameStoryTeller"); // 设置场景ID

    // 子场景相关属性
    this.subScenes = {};
    this.currentSubScene = null;
    this.hasSubScene = true;

    // 保存按钮与功能区
    this.funcsContainer = this.createFuncsContainer();

    // 监听全局触发器以自动刷新UI // This is removed as per plan
    // this.registerGlobalTriggers(); // Removed
  }

  /**
   * 创建功能按钮区域（如保存按钮）
   */
  createFuncsContainer() {
    const funcsContainer = document.createElement("div");
    funcsContainer.setAttribute("id", "funcs_container");
    const saveButton = document.createElement("button");
    saveButton.addEventListener("click", () => {
      if (getGameInstance().allowSave) {
        Animations.displayMessage(
          "info",
          i18n.f("info_message_successfully_saved", {
            SaveName: SaveController.getInstance().runningSave.saveName,
          })
        );
        SaveController.updateSave().then(() => {
          SaveController.getInstance().runningSave.save();
        });
      } else {
        Animations.displayMessage(
          "error",
          i18n.t("info_error_message_save_not_allowed")
        );
      }
    });
    this.saveButton = saveButton;
    funcsContainer.appendChild(saveButton);

    // Add Character Info Button
    const characterInfoButton = document.createElement("button");
    characterInfoButton.setAttribute("id", "character_info_button");
    characterInfoButton.innerHTML = i18n.t("character_info_button_text"); // Ensure this i18n key is added
    characterInfoButton.onclick = () => {
        const player = getPlayerInstance();
        // Assuming i18n instance is already available in this file's scope
        const dialogElement = FastComponent.createPlayerInfoDialog(player, i18n);
        document.body.appendChild(dialogElement);
    };
    funcsContainer.appendChild(characterInfoButton);

    return funcsContainer;
  }

  /**
   * 添加一个子场景。
   * @param {string} id - 子场景的唯一标识符。
   * @param {SubScene} subScene - 子场景实例。
   */
  addSubScene(id, subScene) {
    this.subScenes[id] = subScene;
    log(`Sub scene [${id}] added to GameStoryTeller.`);
  }

  /**
   * 删除一个子场景。
   * @param {string} id - 子场景的唯一标识符。
   */
  removeSubScene(id) {
    if (this.subScenes[id]) {
      delete this.subScenes[id];
      log(`Sub scene [${id}] removed from GameStoryTeller.`);
    } else {
      log(`Sub scene [${id}] does not exist.`);
    }
  }

  /**
   * 切换到指定的子场景。
   * @param {string} id - 子场景的唯一标识符。
   */
  switchToSubScene(id) {
    if (this.subScenes[id]) {
      this.currentSubScene = id;
      this.render(getUIInstance().getContainer());
      log(`Switched to sub scene [${id}].`);
    } else {
      if (subSceneList[id]) {
        this.subScenes[id] = new subSceneList[id]();
        this.switchToSubScene(id);
      } else {
        log(`Sub scene [${id}] does not exist.`);
      }
    }
  }

  /**
   * 获取当前显示的子场景ID。
   * @returns {string|null} - 当前子场景的ID，如果没有子场景显示则为 null。
   */
  getCurrentSubScene() {
    return this.currentSubScene;
  }
  /**
   * 获取指定ID的子场景
   * @param {string} subSceneId - 目标子场景ID。
   * @returns {SubScene|null} - 子场景，如果没有显示则为 null。
   */
  getSubScene(subSceneId) {
    return this.subScenes[subSceneId] || null;
  }
  /**
   * 渲染场景，显示当前子场景的内容。
   */
  render(container = null, RenderSelf = false) {
    if (this.components && this.components instanceof Array)
      for (const i of this.components) {
        i.remove();
      }
    this.components = [];

    if (!RenderSelf) {
      if (this.currentSubScene && this.subScenes[this.currentSubScene]) {
        this.subScenes[this.currentSubScene].parentScene = this;
        this.subScenes[this.currentSubScene].updateSelf();
        this.subScenes[this.currentSubScene].beforeRendered();

        // 创建剧情内容容器
        const storyContainer = document.createElement("div");
        storyContainer.classList.add("story-section");

        // location_container
        const TextContainer = document.createElement("div");
        TextContainer.setAttribute("id", "location_container");
        TextContainer.innerHTML =
          this.subScenes[this.currentSubScene].textContent;
        storyContainer.appendChild(TextContainer);

        // interactiveElements
        for (const i in this.subScenes[this.currentSubScene].interactiveElements) {
          storyContainer.appendChild(
            this.subScenes[this.currentSubScene].interactiveElements[i]
          );
        }

        // 保存按钮
        if (this.subScenes[this.currentSubScene].isAllowSave)
          this.addComponent("general_funcs", this.funcsContainer);

        // 整合剧情内容和玩家信息
        const mainContentContainer = document.createElement("div");
        mainContentContainer.classList.add("main-content-container");
        mainContentContainer.appendChild(storyContainer);
        // Removed playerBag, playerStatus, playerEquipment updates and appends from here

        // 初始化玩家信息容器 - this might be repurposed or removed if not needed for other elements
        const playerInfoContainer = document.createElement("div");
        playerInfoContainer.classList.add("player-info-section");
        // playerInfoContainer.appendChild(this.playerBag); // Removed
        // playerInfoContainer.appendChild(this.playerStatus); // Removed
        // playerInfoContainer.appendChild(this.playerEquipment); // Removed

        mainContentContainer.appendChild(playerInfoContainer); // playerInfoContainer is kept, but now empty or for other uses

        // 创建场景布局容器
        const sceneLayoutContainer = document.createElement("div");
        sceneLayoutContainer.classList.add("scene-layout-container");

        // 将主内容容器添加到布局中
        sceneLayoutContainer.appendChild(mainContentContainer);

        // 将新布局添加回场景
        this.addComponent("scene_layout_container", sceneLayoutContainer);
      }
    }

    getGameInstance().allowSave = true;
    this.saveButton.innerHTML = i18n.t("quicksave");

    const render = super.render(container);
    if (
      !RenderSelf &&
      this.currentSubScene &&
      this.subScenes[this.currentSubScene]
    ) {
      render.addHook("after", async () => {
        this.subScenes[this.currentSubScene].onRendered();
      });
    }
  }

  /**
   * 清除所有子场景。
   */
  clearAllSubScenes() {
    this.subScenes = {};
    this.currentSubScene = null;
    log("All sub scenes have been cleared.");
  }
}

// 导出 GameStoryTeller 类作为默认模块
export default GameStoryTeller;
