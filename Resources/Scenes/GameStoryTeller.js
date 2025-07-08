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
import { FastComponent } from "../Classes/FastComponent.js";
import { html, render } from "../ThirdParty/lit-html.js";

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

    // 存档管理按钮
    const saveManagerButton = document.createElement("button");
    saveManagerButton.innerHTML = i18n.t("save_manager_button") || "存档";
    saveManagerButton.onclick = () => this.showSaveDialog();
    funcsContainer.appendChild(saveManagerButton);

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
  createInventoryGrid(inventory, onItemClick) {
    const items = getPlayerInstance().getItems().filter(item => item.use_time > 0);
    console.log(items);
    console.log(inventory);
    const gridTemplate = html`
      <div class="item-grid">
        ${items.map(item => html`
          <div class="item-card"
            @click=${() => onItemClick(item)}
            @mouseenter=${(e) => item.showTooltip(e)}
            class="item-card ${item.is_equipable ? 'equipable' : ''} ${item.is_usable ? 'usable' : ''} ${item.is_enhanceable ? 'enhanceable' : ''}"
          >
            <div class="item-icon">📦</div>
            <div class="item-name">${FastComponent.noHtml(item.getName())}</div>
            <div class="item-count">x${item.use_time}</div>
            ${Object.keys(item.item_status).length > 0 ? html`
              <div class="item-status-indicator">
                ${['strength', 'charm', 'heal_hp', 'heal_mp'].map(stat => item.item_status[stat] ? html`
                  <div class="stat-indicator">${i18n.t(`status_${stat}`)}: +${item.item_status[stat]}</div>
                ` : '')}
              </div>
            ` : ''}
          </div>
        `)}
      </div>
    `;

    const wrapper = document.createElement('div');
    render(gridTemplate, wrapper);
    return wrapper.firstElementChild;
  }

  /**
   * 创建属性列表
   * @private
   * @param {HTMLElement} container - 容器元素
   * @param {Object} status - 状态对象
   */
  // 检查是否已存在 createAttributesList，避免重复定义
  // 如果没有则定义
  createAttributesList(status) {
    return FastComponent.AttributeList(status, getPlayerInstance, i18n);
  }

  /**
   * 创建装备槽位
   * @private
   * @param {HTMLElement} container - 容器元素
   * @param {Object} equipment - 装备对象
   * @param {Function} onUnequip - 卸下装备回调
   */
  createEquipmentSlots(equipment, onUnequip) {
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

    const slotsTemplate = html`
      <div class="equipment-slots">
        ${slotOrder.map(slot => {
          const item = equipment[slot];
          return html`
            <div class="equipment-slot ${item ? 'equipped' : ''}">
              <div class="slot-name">${i18n.t(`part_${slot}`) || slot}</div>
              <div class="equipped-item" @click=${() => item && onUnequip(item)} @mouseenter=${(e) => item && item.showTooltip(e)}>
                ${item ? html`
                  ${item.getName()}
                  ${Object.keys(item.item_status).length > 0 ? html`
                    <div class="equipment-stats">
                      ${Object.entries(item.item_status).map(([stat, value]) => {
                        if (stat !== "sell" && stat !== "buy" && stat !== "gender_offset") {
                          return html`<div class="stat-bonus">${i18n.t(`status_${stat}`) || stat}: +${value}</div>`;
                        }
                        return '';
                      })}
                    </div>
                  ` : ''}
                ` : html`<span style="color: #999;">${i18n.t("equipment_slot_empty") || "Empty"}</span>`}
              </div>
            </div>
          `;
        })}
      </div>
    `;

    const wrapper = document.createElement('div');
    render(slotsTemplate, wrapper);
    return wrapper.firstElementChild;
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
    const player = getPlayerInstance();

    const renderEnhanceDialog = (itemToEnhance,self) => {
      const cost = itemToEnhance.getEnhancementCost();
      const nextStats = itemToEnhance.getNextEnhancementStats();
      const allItems = player.getItems();
      let canEnhance = true;

      const costList = Object.entries(cost).map(([materialId, amount]) => {
        let hasAmount, name;
        if (materialId === 'gold') {
            hasAmount = player.carrying_coins || 0;
            name = i18n.t('gold') || 'Gold';
        } else {
            hasAmount = allItems.filter(i => i.item_id === materialId).reduce((sum, i) => sum + i.use_time, 0);
            name = i18n.t(`item_${materialId}_name`) || materialId;
        }
        const hasEnough = hasAmount >= amount;
        if (!hasEnough) canEnhance = false;
        return { name, hasEnough, amount, hasAmount };
      });

      const dialogTemplate = html`
        <div class="enhance-dialog-top">
          <div class="enhance-stats-card stats-current">
            <h4>${i18n.t("current_stats") || "Current Stats"}</h4>
            <ul>
              ${Object.entries(itemToEnhance.item_status).map(([stat, value]) => 
                html`<li>${i18n.t(`status_${stat}`) || stat}: ${value}</li>`
              )}
            </ul>
          </div>
          <i class="material-icons arrow-icon">arrow_forward</i>
          <div class="enhance-stats-card stats-next">
            <h4>${i18n.t("next_stats") || "Next Level Stats"}</h4>
            ${nextStats ? html`
              <ul>
                ${Object.entries(nextStats).map(([stat, value]) => 
                  html`<li>${i18n.t(`status_${stat}`) || stat}: ${value}</li>`
                )}
              </ul>
            ` : html`<p>${i18n.t("max_level") || "Max Level"}</p>`}
          </div>
        </div>

        <div class="enhance-cost-card">
            <h4>${i18n.t("enhancement_cost") || "Enhancement Cost"}</h4>
            <ul>
                ${costList.map(c => html`<li class="${c.hasEnough ? 'sufficient' : 'insufficient'}">${c.name}: ${c.amount} (${i18n.t('you_have')||'You have'}: ${c.hasAmount})</li>`)}
            </ul>
        </div>

        <div class="dialog-actions">
            <button @click=${async () => {
              const result = await itemToEnhance.enhance();
              if (result.success) {
                Animations.displayMessage("success", result.message);
                self.refresh();
                this.updatePlayerInfo();
              } else {
                Animations.displayMessage("error", result.message);
              }
            }} .disabled=${!canEnhance}>${i18n.t("action_enhance_confirm") || "Enhance"}</button>
            <button @click=${() => dialog.closeDialog()}>${i18n.t("close") || "Close"}</button>
        </div>
      `;
      return dialogTemplate;
    }

    const dialog = FastComponent.createDialog({
        title: i18n.t("enhance_dialog_title") || "Enhance Item",
        content: (dialogWrapper) => {
            dialogWrapper.classList.add('enhance-dialog-content');
            return renderEnhanceDialog(item, dialogWrapper);
        },
        onClose: () => {}
    });

    document.body.appendChild(dialog);
  }
  
  /**
   * 更新玩家信息对话框
   */
  updatePlayerInfo() {
    if (this.playerInfoDialog && document.body.contains(this.playerInfoDialog)) {
      this.playerInfoDialog.refresh();
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
      this.playerInfoDialog.refresh();
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
          content: () => this.createInventoryGrid(
            player.inventory,
            (item) => this.showItemActions(item, event)
          ),
        },
        {
          id: "attributes",
          label: i18n.t("dialog_tab_attributes") || "Attributes",
          content: () => this.createAttributesList(player.status),
        },
        {
          id: "equipment",
          label: i18n.t("dialog_tab_equipment") || "Equipment",
          content: () => this.createEquipmentSlots(
            player.equipment,
            async (item) => {
              await this.unequipItem(item);
            }
          ),
        },
      ],
    });


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

        // 根据是否允许存档，设置按钮的 disabled 状态
        const allowSave = this.subScenes[this.currentSubScene].isAllowSave;
        // 保存按钮
        this.saveButton.disabled = !allowSave;
        // 存档管理按钮
        const saveManagerButton = this.funcsContainer.querySelector("button:nth-child(2)");
        if (saveManagerButton) saveManagerButton.disabled = !allowSave;
        // 添加功能按钮区域
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

  showSaveDialog() {
    const saves = SaveController.getSaveSlots();
    const dialog = document.createElement("div");
    dialog.className = "dialog-overlay";
    dialog.innerHTML = `
      <div class="dialog-content">
        <div class="dialog-title-bar">
          <h2>${i18n.t("save_manager_title") || "选择存档栏"}</h2>
          <button class="dialog-close-button">×</button>
        </div>
        <div class="save-slot-grid">
          ${[1,2,3,4,5,6].map(i => {
            const slot = saves[`slot${i}`];
            let title = i === 1 ? (i18n.t("quick_save") || "快速存档") : `${i18n.t("save_slot") || "存档栏"} ${i}`;
            if (slot) {
              return `<div class='save-slot-card${i===1?" quick-save":""}'>
                <div class='save-slot-title'>${title}</div>
                <div class='save-slot-meta'>
                  <div>${i18n.t("save_time") || "时间"}: ${new Date(slot.meta.time).toLocaleString()}</div>
                  <div>${i18n.t("character_name") || "主角"}: ${slot.meta.characterName || "-"}</div>
                  <div>${i18n.t("mode") || "模式"}: ${slot.meta.mode || "-"}</div>
                </div>
                <button class='save-slot-overwrite' data-slot='${i}'>${i18n.t("overwrite") || "覆盖"}</button>
              </div>`;
            } else {
              return `<div class='save-slot-card${i===1?" quick-save":""}'>
                <div class='save-slot-title'>${title}</div>
                <div class='save-slot-meta empty'>${i18n.t("empty_slot") || "空"}</div>
                <button class='save-slot-new' data-slot='${i}'>${i18n.t("new_save") || "新建存档"}</button>
              </div>`;
            }
          }).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(dialog);
    dialog.querySelector(".dialog-close-button").onclick = () => dialog.remove();
    // 绑定按钮事件
    dialog.querySelectorAll(".save-slot-overwrite").forEach(btn => {
      btn.onclick = async () => {
        const slot = btn.getAttribute("data-slot");
        await SaveController.updateSave();
        SaveController.saveToSlot(SaveController.instance.runningSave, slot);
        Animations.displayMessage("success", i18n.t("save_success") || "存档成功");
        dialog.remove();
      };
    });
    dialog.querySelectorAll(".save-slot-new").forEach(btn => {
      btn.onclick = async () => {
        const slot = btn.getAttribute("data-slot");
        await SaveController.updateSave();
        SaveController.saveToSlot(SaveController.instance.runningSave, slot);
        Animations.displayMessage("success", i18n.t("save_success") || "存档成功");
        dialog.remove();
      };
    });
  }

  // 自动存档机制
  startAutoSaveTimer() {
    if (this._autoSaveTimer) clearTimeout(this._autoSaveTimer);
    const checkAndSave = async () => {
      if (getGameInstance().allowSave) {
        await SaveController.updateSave();
        SaveController.saveToSlot(SaveController.instance.runningSave, 1);
        Animations.displayMessage("info", i18n.t("auto_save_success") || "已自动存档到快速存档栏");
        this._autoSaveTimer = setTimeout(checkAndSave, 30 * 60 * 1000);
      } else {
        this._autoSaveTimer = setTimeout(checkAndSave, 5 * 60 * 1000);
      }
    };
    this._autoSaveTimer = setTimeout(checkAndSave, 30 * 60 * 1000);
  }
}

export default GameStoryTeller;