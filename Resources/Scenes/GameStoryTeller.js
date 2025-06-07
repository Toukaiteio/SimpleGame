import { Scene, SubScene } from "../Classes/UI.js";
import {
  getUIInstance,
  getPlayerInstance,
  getGameInstance,
} from "../Scripts/Shared.js";
import { log } from "../Classes/Game.js";
import { SaveController } from "../Classes/Save.js";
import { i18n } from "../Classes/I18n.js";
import { Animations } from "../Classes/UI.js";
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

    // 玩家背包、状态、装备栏
    this.playerBag = this.createPlayerBag();
    this.playerStatus = this.createPlayerStatus();
    this.playerEquipment = this.createPlayerEquipment();

    // 监听全局触发器以自动刷新UI
    this.registerGlobalTriggers();
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
    return funcsContainer;
  }

  /**
   * 创建玩家背包区域
   */
  createPlayerBag() {
    const playerBag = document.createElement("div");
    playerBag.setAttribute("id", "player_bag");
    playerBag.classList.add("status-card", "player-section");

    playerBag.updateSelf = (player) => {
      const playerInventory = player.inventory;
      const game = getGameInstance();
      const allItems = Object.keys(playerInventory).map((i) =>
        player.findItem(i)
      );

      game.createEvent(
        game.eventWrapper(
          "updatePlayerBag",
          {
            player,
            allItems,
            playerBag,
          },
          {
            during: async (self) => {
              while (playerBag.firstChild)
                playerBag.removeChild(playerBag.firstChild);
              const domBuffer = document.createDocumentFragment();

              // 背包标题
              const bagTitle = document.createElement("div");
              bagTitle.innerHTML = i18n.f("player_bag", {
                PlayerCoins: self.data.player.carrying_coins,
              });
              bagTitle.classList.add("boxTitle");
              domBuffer.appendChild(bagTitle);

              // 背包物品
              for (const i of self.data.allItems) {
                const { item } = i;
                const item_id = item.item_id;
                const item_count = i.count;
                if (item_count <= 0) continue;
                const item_name = i18n.t(`item_${item_id}_name`);
                const item_dom = document.createElement("div");
                item_dom.classList.add("bag_item");
                item_dom.innerHTML = `${item_name} x ${item_count}`;
                item_dom.updateSelf = () => {
                  const newCount = item.use_time;
                  if (newCount > 0) {
                    item_dom.innerHTML = `${item_name} x ${newCount}`;
                  } else {
                    item_dom.remove();
                  }
                };
                item_dom.onclick = () => {
                  if (item.is_usable) {
                    item.use(self.data.player);
                  } else if (item.is_equipable) {
                    item.equip(self.data.player);
                  }
                };
                domBuffer.appendChild(item_dom);
              }

              // 金币显示
              const coin_name = i18n.t(`info_status_coin`);
              const coin_count = self.data.player.carrying_coins;
              const coin_dom = document.createElement("div");
              coin_dom.classList.add("bag_item", "nohover");
              coin_dom.innerHTML = `${coin_name} x ${coin_count}`;
              domBuffer.appendChild(coin_dom);

              self.data.playerBag.appendChild(domBuffer);
            },
          }
        )
      );
    };

    return playerBag;
  }

  /**
   * 创建玩家状态区域
   */
  createPlayerStatus() {
    const playerStatus = document.createElement("div");
    playerStatus.classList.add("status-card", "player-section");
    playerStatus.setAttribute("id", "player_status");
    playerStatus.updateLock = false;

    playerStatus.updateSelf = async (player) => {
      if (playerStatus.updateLock) return;
      playerStatus.updateLock = true;
      const domBuffer = document.createDocumentFragment();
      while (playerStatus.firstChild)
        playerStatus.removeChild(playerStatus.firstChild);

      // 状态标题
      const Title = document.createElement("div");
      Title.innerHTML = i18n.t("player_status");
      Title.classList.add("boxTitle");
      domBuffer.appendChild(Title);

      // 状态属性
      const player_status = {};
      for (const i in player.status) {
        player_status[i] = await player.getNextAttribute(i);
      }
      for (const i in player_status) {
        if (["buffList", "skillPoints"].includes(i)) continue;
        const status_item = document.createElement("div");
        status_item.classList.add("status_item");
        status_item.innerHTML = `${i18n.t(
          `status_${i}`
        )}: <span class="${i}_value">${player_status[i]}</span>`;
        domBuffer.appendChild(status_item);
      }

      playerStatus.appendChild(domBuffer);
      playerStatus.updateLock = false;
    };

    return playerStatus;
  }

  /**
   * 创建玩家装备栏区域
   */
  createPlayerEquipment() {
    const playerEquipment = document.createElement("div");
    playerEquipment.setAttribute("id", "player_equipment");
    playerEquipment.classList.add("status-card", "player-section");

    playerEquipment.updateSelf = (player) => {
      const domBuffer = document.createDocumentFragment();
      while (playerEquipment.firstChild)
        playerEquipment.removeChild(playerEquipment.firstChild);

      // 装备标题
      const Title = document.createElement("div");
      Title.innerHTML = i18n.t("player_equipment");
      Title.classList.add("boxTitle");
      domBuffer.appendChild(Title);

      // 装备物品
      for (const i in player.equipment) {
        const item = player.equipment[i];
        if (!item) continue;
        const item_id = item.item_id;
        const part = item.equip_slot;
        const item_name = i18n.f(`info_arm_at_body`, {
          EquipName: i18n.t(`item_${item_id}_name`),
          PartName: i18n.t(`part_${part}`),
        });
        const item_dom = document.createElement("div");
        item_dom.classList.add("bag_item");
        item_dom.innerHTML = `${item_name}`;
        item_dom.onclick = () => {
          item.unwield(player);
          item_dom.remove();
        };
        domBuffer.appendChild(item_dom);
      }

      playerEquipment.appendChild(domBuffer);
      this.playerStatus.updateSelf(player);
    };

    return playerEquipment;
  }

  /**
   * 注册全局触发器以自动刷新背包、状态、装备栏
   */
  registerGlobalTriggers() {
    const game = getGameInstance();
    const playerBag = this.playerBag;
    const playerStatus = this.playerStatus;
    const playerEquipment = this.playerEquipment;

    // 背包相关
    [
      "giveItem",
      "addUseTime",
      "costUseTime",
      "addCoins",
      "deductCoins",
    ].forEach((event) => {
      game.addGlobalTrigger(event, "after", async () => {
        if (playerBag.isConnected && getPlayerInstance())
          playerBag.updateSelf(getPlayerInstance());
      });
    });

    // 状态相关
    game.addGlobalTrigger("statusUpdate", "after", async () => {
      if (playerStatus.isConnected && getPlayerInstance())
        playerStatus.updateSelf(getPlayerInstance());
    });

    // 装备相关
    ["equip", "unwield"].forEach((event) => {
      game.addGlobalTrigger(event, "after", async () => {
        if (playerEquipment.isConnected && getPlayerInstance())
          playerEquipment.updateSelf(getPlayerInstance());
      });
    });
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
        this.playerBag.updateSelf(getPlayerInstance());
        this.playerStatus.updateSelf(getPlayerInstance());
        this.playerEquipment.updateSelf(getPlayerInstance());
        // 初始化玩家信息容器
        const playerInfoContainer = document.createElement("div");
        playerInfoContainer.classList.add("player-info-section");
        playerInfoContainer.appendChild(this.playerBag);
        playerInfoContainer.appendChild(this.playerStatus);
        playerInfoContainer.appendChild(this.playerEquipment);

        mainContentContainer.appendChild(playerInfoContainer);

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
