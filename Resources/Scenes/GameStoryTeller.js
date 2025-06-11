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
import { FastComponent } from "../Classes/FastCompoent.js";

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
    super("GameStoryTeller");

    this.subScenes = {};
    this.currentSubScene = null;
    this.hasSubScene = true;
    this.funcsContainer = this.createFuncsContainer();

    // 存储当前打开的玩家信息对话框引用
    this.playerInfoDialog = null;
  }

  /**
   * 创建功能按钮区域
   */
  createFuncsContainer() {
    const funcsContainer = document.createElement("div");
    funcsContainer.setAttribute("id", "funcs_container");

    // 保存按钮
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

    // 角色信息按钮
    const characterInfoButton = document.createElement("button");
    characterInfoButton.setAttribute("id", "character_info_button");
    characterInfoButton.innerHTML = i18n.t("character_info_button_text");
    characterInfoButton.onclick = () => this.showPlayerInfoDialog();
    funcsContainer.appendChild(characterInfoButton);

    return funcsContainer;
  }

  /**
   * 创建物品网格
   * @private
   * @param {HTMLElement} container - 容器元素
   * @param {Object} inventory - 物品清单
   * @param {Function} onItemClick - 物品点击回调
   */
  createInventoryGrid(container, inventory, onItemClick) {
    const grid = document.createElement("div");
    grid.className = "item-grid";

    // 获取所有物品
    const items = getPlayerInstance().getItems();
    
    for (const item of items) {
      const card = document.createElement("div");
      card.className = "item-card";
      
      // 根据物品类型添加额外的类名
      if (item.is_equipable) card.classList.add("equipable");
      if (item.is_usable) card.classList.add("usable");
      if (item.is_enhanceable) card.classList.add("enhanceable");

      const icon = document.createElement("div");
      icon.className = "item-icon";
      icon.textContent = "📦"; // 可以根据物品类型设置不同的图标

      const name = document.createElement("div");
      name.className = "item-name";
      name.textContent = item.getName(); // 使用新的getName方法

      const countText = document.createElement("div");
      countText.className = "item-count";
      countText.textContent = `x${item.use_time}`;

      // 添加物品状态指示器
      if (Object.keys(item.item_status).length > 0) {
        const statusIndicator = document.createElement("div");
        statusIndicator.className = "item-status-indicator";
        
        // 显示重要的状态属性
        const importantStats = ["strength", "charm", "heal_hp", "heal_mp"];
        for (const stat of importantStats) {
          if (item.item_status[stat]) {
            const statDiv = document.createElement("div");
            statDiv.className = "stat-indicator";
            statDiv.textContent = `${i18n.t(`status_${stat}`)}: +${item.item_status[stat]}`;
            statusIndicator.appendChild(statDiv);
          }
        }
        
        if (statusIndicator.children.length > 0) {
          card.appendChild(statusIndicator);
        }
      }

      card.appendChild(icon);
      card.appendChild(name);
      card.appendChild(countText);

      // 使用新的tooltip系统
      card.addEventListener("mouseenter", (e) => {
        item.showTooltip(e);
      });

      card.onclick = () => onItemClick(item);

      grid.appendChild(card);
    }

    container.appendChild(grid);
  }

  /**
   * 创建属性列表
   * @private
   * @param {HTMLElement} container - 容器元素
   * @param {Object} status - 状态对象
   */
  // 检查是否已存在 createAttributesList，避免重复定义
  // 如果没有则定义
  async createAttributesList(container, status) {
    // 清空容器，确保不会重复创建元素
    container.innerHTML = '';
    
    // 创建新的属性列表元素
    const list = document.createElement("div");
    list.className = "attributes-list";

    for (const attrKey in status) {
      if (
        attrKey === "buffList" ||
        attrKey === "skillPoints" ||
        attrKey.startsWith("max") ||
        !status.hasOwnProperty(attrKey)
      )
        continue;

      const item = document.createElement("div");
      item.className = "attribute-item";

      const name = document.createElement("div");
      name.className = "attribute-name";
      name.textContent = i18n.t(`status_${attrKey}`) || attrKey;

      const value = document.createElement("div");
      value.className = "attribute-value";

      const attrValue = await getPlayerInstance().getNextAttribute(attrKey);
      const maxAttrKey =
        "max" + attrKey.charAt(0).toUpperCase() + attrKey.slice(1);

      if (status.hasOwnProperty(maxAttrKey)) {
        const maxValue = await getPlayerInstance().getNextAttribute(maxAttrKey);
        value.textContent = `${attrValue} / ${maxValue}`;

        const bar = document.createElement("div");
        bar.className = "attribute-bar";

        const fill = document.createElement("div");
        fill.className = "attribute-bar-fill";
        fill.style.width = `${(attrValue / maxValue) * 100}%`;

        bar.appendChild(fill);
        item.appendChild(bar);
      } else {
        value.textContent = attrValue;
      }

      item.appendChild(name);
      item.appendChild(value);
      list.appendChild(item);
    }

    // 添加Buff列表
    if (status.buffList && status.buffList.length > 0) {
      const buffsTitle = document.createElement("h3");
      buffsTitle.textContent = i18n.t("dialog_buffs_title") || "Active Buffs";
      list.appendChild(buffsTitle);

      status.buffList.forEach((buff) => {
        const buffItem = document.createElement("div");
        buffItem.className = "attribute-item";
        buffItem.textContent = `${
          i18n.t(`buff_${buff.buff}_name`) || buff.buff
        }: ${buff.remainRound} rounds`;
        list.appendChild(buffItem);
      });
    }

    container.appendChild(list);
  }

  /**
   * 创建装备槽位
   * @private
   * @param {HTMLElement} container - 容器元素
   * @param {Object} equipment - 装备对象
   * @param {Function} onUnequip - 卸下装备回调
   */
  createEquipmentSlots(container, equipment, onUnequip) {
    const slots = document.createElement("div");
    slots.className = "equipment-slots";

    // 定义装备槽位顺序
    const slotOrder = [
      "head", 
      "upper_outer_body", 
      "upper_inner_body", 
      "lower_outer_body", 
      "lower_inner_body", 
      "hand", 
      "feet", 
      "accessory"
    ];
    
    // 按顺序创建槽位
    for (const slot of slotOrder) {
      const slotDiv = document.createElement("div");
      slotDiv.className = "equipment-slot";
      
      // 如果是已装备的槽位，添加特殊样式
      if (equipment[slot]) {
        slotDiv.classList.add("equipped");
      }

      const slotName = document.createElement("div");
      slotName.className = "slot-name";
      slotName.textContent = i18n.t(`part_${slot}`) || slot;

      const equippedItem = document.createElement("div");
      equippedItem.className = "equipped-item";

      if (equipment[slot]) {
        const item = equipment[slot];
        equippedItem.textContent = item.getName(); // 使用新的getName方法
        
        // 添加装备属性显示
        if (Object.keys(item.item_status).length > 0) {
          const statsDiv = document.createElement("div");
          statsDiv.className = "equipment-stats";
          
          for (const [stat, value] of Object.entries(item.item_status)) {
            if (stat !== "sell" && stat !== "buy" && stat !== "gender_offset") {
              const statDiv = document.createElement("div");
              statDiv.className = "stat-bonus";
              statDiv.textContent = `${i18n.t(`status_${stat}`) || stat}: +${value}`;
              statsDiv.appendChild(statDiv);
            }
          }
          
          if (statsDiv.children.length > 0) {
            equippedItem.appendChild(statsDiv);
          }
        }
        
        equippedItem.onclick = () => onUnequip(item);

        // 使用新的tooltip系统
        equippedItem.addEventListener("mouseenter", (e) => {
          item.showTooltip(e);
        });
      } else {
        equippedItem.textContent = i18n.t("equipment_slot_empty") || "Empty";
        equippedItem.style.color = "#999";
      }

      slotDiv.appendChild(slotName);
      slotDiv.appendChild(equippedItem);
      slots.appendChild(slotDiv);
    }

    container.appendChild(slots);
  }

  /**
   * 显示物品操作菜单
   * @private
   * @param {Item} item - 物品对象
   * @param {Event} event - 点击事件
   */
  showItemActions(item, event) {
    const menu = document.createElement("div");
    menu.className = "item-actions-menu";
    menu.style.position = "absolute";
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;

    // 使用物品按钮
    if (item.is_usable) {
      const useBtn = document.createElement("button");
      useBtn.textContent = i18n.t("action_use") || "Use";
      useBtn.onclick = () => {
        this.useItem(item);
        menu.remove();
      };
      menu.appendChild(useBtn);
    }

    // 装备物品按钮
    if (item.is_equipable) {
      const equipBtn = document.createElement("button");
      equipBtn.textContent = i18n.t("action_equip") || "Equip";
      equipBtn.onclick = () => {
        this.equipItem(item);
        menu.remove();
      };
      menu.appendChild(equipBtn);
    }

    // 强化物品按钮
    if (item.is_enhanceable) {
      const enhanceBtn = document.createElement("button");
      enhanceBtn.textContent = i18n.t("action_enhance") || "Enhance";
      enhanceBtn.onclick = () => {
        this.showEnhanceDialog(item);
        menu.remove();
      };
      menu.appendChild(enhanceBtn);
    }

    // 丢弃物品按钮
    const dropBtn = document.createElement("button");
    dropBtn.textContent = i18n.t("action_drop") || "Drop";
    dropBtn.onclick = () => {
      this.dropItem(item);
      menu.remove();
    };
    menu.appendChild(dropBtn);

    document.body.appendChild(menu);

    // 点击其他地方关闭菜单
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener("click", closeMenu);
      }
    };
    setTimeout(() => {
      document.addEventListener("click", closeMenu);
    }, 0);
  }

  /**
   * 使用物品
   * @private
   * @param {Item} item - 物品对象
   */
  async useItem(item) {
    const player = getPlayerInstance();
    await player.useItem(item);
    this.updatePlayerInfo();
  }

  /**
   * 装备物品
   * @private
   * @param {Item} item - 物品对象
   */
  async equipItem(item) {
    const player = getPlayerInstance();
    await player.equipItem(item);
    this.updatePlayerInfo();
  }

  /**
   * 卸下装备
   * @private
   * @param {Item} item - 物品对象
   */
  async unequipItem(item) {
    const player = getPlayerInstance();
    await player.unequipItem(item);
    this.updatePlayerInfo();
  }

  /**
   * 丢弃物品
   * @private
   * @param {Item} item - 物品对象
   */
  async dropItem(item) {
    const player = getPlayerInstance();
    await player.removeItem(item);
    this.updatePlayerInfo();
  }

  /**
   * 显示物品强化对话框
   * @private
   * @param {Item} item - 物品对象
   */
  showEnhanceDialog(item) {
    const dialog = document.createElement("div");
    dialog.className = "enhance-dialog";
    
    const title = document.createElement("h2");
    title.textContent = i18n.t("enhance_dialog_title") || "Enhance Item";
    dialog.appendChild(title);
    
    // 显示当前属性
    const currentStats = document.createElement("div");
    currentStats.className = "current-stats";
    currentStats.innerHTML = `<h3>${i18n.t("current_stats") || "Current Stats"}</h3>`;
    
    for (const [stat, value] of Object.entries(item.item_status)) {
      if (stat !== "sell" && stat !== "buy") {
        const statDiv = document.createElement("div");
        statDiv.textContent = `${i18n.t(`status_${stat}`) || stat}: ${value}`;
        currentStats.appendChild(statDiv);
      }
    }
    dialog.appendChild(currentStats);
    
    // 强化选项
    const enhanceOptions = document.createElement("div");
    enhanceOptions.className = "enhance-options";
    enhanceOptions.innerHTML = `<h3>${i18n.t("enhance_options") || "Enhance Options"}</h3>`;
    
    // 添加强化选项按钮
    const enhanceBtn = document.createElement("button");
    enhanceBtn.textContent = i18n.t("action_enhance_confirm") || "Enhance";
    enhanceBtn.onclick = async () => {
      const player = getPlayerInstance();
      const result = await itemManager.enhanceItem(item, player);
      if (result.success) {
        Animations.displayMessage("success", i18n.t("enhance_success") || "Enhancement successful!");
        this.updatePlayerInfo();
      } else {
        Animations.displayMessage("error", result.message || (i18n.t("enhance_failed") || "Enhancement failed!"));
      }
      dialog.remove();
    };
    enhanceOptions.appendChild(enhanceBtn);
    
    dialog.appendChild(enhanceOptions);
    
    // 关闭按钮
    const closeBtn = document.createElement("button");
    closeBtn.className = "close-btn";
    closeBtn.textContent = "×";
    closeBtn.onclick = () => dialog.remove();
    dialog.appendChild(closeBtn);
    
    document.body.appendChild(dialog);
  }
  
  /**
   * 更新玩家信息对话框
   */
  updatePlayerInfo() {
    if (this.playerInfoDialog && document.body.contains(this.playerInfoDialog)) {
      this.playerInfoDialog.querySelector(".dialog-content").refresh();
    }
  }

  /**
   * 显示玩家信息对话框
   */
  showPlayerInfoDialog() {
    const player = getPlayerInstance();
    const game = getGameInstance();

    // 如果已经有对话框打开，就刷新它
    if (
      this.playerInfoDialog &&
      document.body.contains(this.playerInfoDialog)
    ) {
      this.playerInfoDialog.querySelector(".dialog-content").refresh();
      return;
    }

    // 创建对话框
    this.playerInfoDialog = FastComponent.createDialog({
      title: i18n.t("player_info_dialog_title") || "Character Information",
      onClose: () => {
        this.playerInfoDialog = null;
      },
      tabs: [
        {
          id: "inventory",
          label: i18n.t("dialog_tab_inventory") || "Inventory",
          content: (container) => {
            this.createInventoryGrid(
              container,
              player.inventory,
              (item) => this.showItemActions(item, event)
            );
          },
        },
        {
          id: "attributes",
          label: i18n.t("dialog_tab_attributes") || "Attributes",
          content: (container) => {
            this.createAttributesList(container, player.status);
          },
        },
        {
          id: "equipment",
          label: i18n.t("dialog_tab_equipment") || "Equipment",
          content: (container) => {
            this.createEquipmentSlots(
              container,
              player.equipment,
              async (item) => {
                await this.unequipItem(item);
              }
            );
          },
        },
      ],
    });

    // 添加事件监听，使用更持久的监听器
    const refreshDialog = () => {
      if (this.playerInfoDialog) {
        this.playerInfoDialog.querySelector(".dialog-content").refresh();
      }
    };

    // const eventTypes = ["use", "equip", "unwield"];
    // const triggers = eventTypes.map((eventType) =>
    //   game.addTempGlobalTrigger(eventType, "after", refreshDialog, 1)
    // );

    // 在对话框关闭时移除监听器
    const originalOnClose = this.playerInfoDialog.onclose;
    this.playerInfoDialog.onclose = () => {
      // triggers.forEach((trigger) => game.removeTrigger(trigger));
      if (originalOnClose) originalOnClose();
      this.playerInfoDialog = null;
    };

    document.body.appendChild(this.playerInfoDialog);
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
        for (const i in this.subScenes[this.currentSubScene]
          .interactiveElements) {
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

export default GameStoryTeller;