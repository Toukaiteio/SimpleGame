import { Scene, SubScene } from "../Classes/UI.js";
import { getUIInstance, getPlayerInstance, getGameInstance } from "../Scripts/Shared.js";
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
  static instance = null
  static getInstance() {
    if (!GameStoryTeller.instance) {
      GameStoryTeller.instance = new GameStoryTeller();
    }
    return GameStoryTeller.instance;
  }
  constructor() {
    super("GameStoryTeller"); // 设置场景ID
    this.subScenes = {}; // 存储子场景的对象，键为子场景ID，值为子场景实例
    this.currentSubScene = null; // 当前显示的子场景ID
    this.hasSubScene = true;
    // 保存按钮
    const funcsContainer = document.createElement("div");
    funcsContainer.setAttribute("id", "funcs_container");
    const saveButton = document.createElement("button");
    saveButton.addEventListener("click", () => {
      // console.log(getPlayerInstance());
      if(getGameInstance().allowSave){
        Animations.displayMessage("info",i18n.f("info_message_successfully_saved",{
          "SaveName":SaveController.getInstance().runningSave.saveName
        }));
        SaveController.updateSave().then(()=>{
          SaveController.getInstance().runningSave.save();
        })
      } else {
        Animations.displayMessage("error",i18n.t("info_error_message_save_not_allowed"));
      }
      
    });
    this.saveButton = saveButton;
    funcsContainer.appendChild(saveButton);
    this.funcsContainer = funcsContainer;
    // 玩家背包
    const playerBag = document.createElement("div");
    playerBag.setAttribute("id", "player_bag");
    this.playerBag = playerBag;
    playerBag.updateSelf = (player) => {
      const playerInventory = player.inventory;
      const game = getGameInstance();
      const allItems = [];
      for(const i in playerInventory){
        const item = player.findItem(i);
        allItems.push(item);
      }
      game.createEvent(game.eventWrapper("updatePlayerBag", {
        player:player,
        allItems:allItems,
        playerBag:playerBag      
      },{during: async (self,game) => {
        while(playerBag.firstChild)
          playerBag.removeChild(playerBag.firstChild)
        const domBuffer = document.createDocumentFragment();
        const bagTitle = document.createElement("div");
        bagTitle.innerHTML = i18n.f("player_bag",{
          PlayerCoins:self.data.player.carrying_coins
        });
        bagTitle.classList.add("boxTitle");
        domBuffer.appendChild(bagTitle);
        for(const i of self.data.allItems){
          const item_id = i.item.item_id;
          const item_count = i.count;
          if(item_count <= 0) continue;
          const item_name = i18n.t(`item_${item_id}_name`);
          const item_dom = document.createElement("div");
          item_dom.classList.add("bag_item");
          item_dom.innerHTML = `${item_name} x ${item_count}`;
          item_dom.updateSelf = ()=>{
            const newCount = i.item.use_time;
            if(newCount > 0){
              item_dom.innerHTML = `${item_name} x ${newCount}`;
            } else {
              item_dom.remove();
            }
          }
          item_dom.onclick = () => {
            let next = null;
            if(i.item.is_usable) {
              next = i.item.use(self.data.player);
            }
            else if(i.item.is_equipable) {
              next = i.item.equip(self.data.player);
            }
          }
          domBuffer.appendChild(item_dom);

        }
        const item_name = i18n.t(`info_status_coin`);
        const item_dom = document.createElement("div");
        const item_count = self.data.player.carrying_coins;
        item_dom.classList.add("bag_item","nohover");
        item_dom.innerHTML = `${item_name} x ${item_count}`;
        self.data.playerBag.appendChild(domBuffer);
      }
    }))
    }
    getGameInstance().addGlobalTrigger("giveItem","after",async (self,game)=>{
      if(playerBag.isConnected && getPlayerInstance()) playerBag.updateSelf(getPlayerInstance());
    });
    getGameInstance().addGlobalTrigger("addUseTime","after",async (self,game)=>{
      if(playerBag.isConnected && getPlayerInstance()) playerBag.updateSelf(getPlayerInstance());
    });
    getGameInstance().addGlobalTrigger("costUseTime","after",async (self,game)=>{
      if(playerBag.isConnected && getPlayerInstance()) playerBag.updateSelf(getPlayerInstance());
    });
    getGameInstance().addGlobalTrigger("addCoins","after",async (self,game)=>{
      if(playerBag.isConnected && getPlayerInstance()) playerBag.updateSelf(getPlayerInstance());
    });
    getGameInstance().addGlobalTrigger("deductCoins","after",async (self,game)=>{
      if(playerBag.isConnected && getPlayerInstance()) playerBag.updateSelf(getPlayerInstance());
    });
    // 玩家状态
    const playerStatus = document.createElement("div");
    playerStatus.updateLock = false;
    playerStatus.setAttribute("id", "player_status");
    this.playerStatus = playerStatus;
    playerStatus.updateSelf = async (player) => {
      if(playerStatus.updateLock) return;
      playerStatus.updateLock = true;
      const domBuffer = document.createDocumentFragment();
      while(playerStatus.firstChild)
        playerStatus.removeChild(playerStatus.firstChild)
      const player_status = {};
      for(const i in player.status) {
        player_status[i] = await player.getNextAttribute(i);
      }
      const Title = document.createElement("div");
        Title.innerHTML = i18n.t("player_status");
        Title.classList.add("boxTitle");
      domBuffer.appendChild(Title);
      for(const i in player_status){
        if(["buffList","skillPoints"].indexOf(i) !== -1) continue;
        const status_item = document.createElement("div");
        status_item.classList.add("status_item");
        status_item.innerHTML = `${i18n.t(`status_${i}`)}: <span class="${i}_value">${player_status[i]}</span>`;
        domBuffer.appendChild(status_item);
      }
      // console.log(player_status);
      playerStatus.appendChild(domBuffer);
      playerStatus.updateLock = false;
    }
    getGameInstance().addGlobalTrigger("statusUpdate","after",async (self,game)=>{
      if(playerStatus.isConnected && getPlayerInstance()) playerStatus.updateSelf(getPlayerInstance());
    });
    // 玩家装备栏
    const playerEquipment = document.createElement("div");
    playerEquipment.setAttribute("id", "player_equipment");
    this.playerEquipment = playerEquipment;
    playerEquipment.updateSelf = (player) => {
      console.log("update player equipment",player.equipment,player);
      const domBuffer = document.createDocumentFragment();
      while(playerEquipment.firstChild)
        playerEquipment.removeChild(playerEquipment.firstChild)
      const Title = document.createElement("div");
        Title.innerHTML = i18n.t("player_equipment");
        Title.classList.add("boxTitle");
      domBuffer.appendChild(Title);

      for(const i in player.equipment){
        const item = player.equipment[i];
        if(!item) continue;
        const item_id = item.item_id;
        const part = item.equip_slot;
        const item_name = i18n.f(`info_arm_at_body`,{
          EquipName:i18n.t(`item_${item_id}_name`),
          PartName:i18n.t(`part_${part}`)
        });
        const item_dom = document.createElement("div");
        item_dom.classList.add("bag_item");
        item_dom.innerHTML = `${item_name}`;
        item_dom.onclick = () => {
          item.unwield(player);
          item_dom.remove();
        }
        domBuffer.appendChild(item_dom);
      }
      
      playerEquipment.appendChild(domBuffer);
      playerStatus.updateSelf(player);
    }
    getGameInstance().addGlobalTrigger("equip","after",async (self,game)=>{
      if(playerEquipment.isConnected && getPlayerInstance()) playerEquipment.updateSelf(getPlayerInstance());
    });
    getGameInstance().addGlobalTrigger("unwield","after",async (self,game)=>{
      if(playerEquipment.isConnected && getPlayerInstance()) playerEquipment.updateSelf(getPlayerInstance());
    });
    this.instance = this;
    // const playerBagItems = getPlayerInstance().inventory;
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
        if(this.subScenes[this.currentSubScene].isAllowSave)
          this.addComponent("general_funcs", this.funcsContainer);
        const TextContainer = document.createElement("div");
        TextContainer.setAttribute("id","location_container");
        TextContainer.innerHTML =
          this.subScenes[this.currentSubScene].textContent;
        this.addComponent(
          `${this.currentSubScene}_text`,
          TextContainer
        );
        for (const i in this.subScenes[this.currentSubScene]
          .interactiveElements) {
          this.addComponent(
            `${this.currentSubScene}_interactive_${i}`,
            this.subScenes[this.currentSubScene].interactiveElements[i]
          );
        }
        this.playerBag.updateSelf(getPlayerInstance());
        this.addComponent("player_bag", this.playerBag);
        this.playerStatus.updateSelf(getPlayerInstance());
        this.addComponent("player_status", this.playerStatus);
        this.playerEquipment.updateSelf(getPlayerInstance());
        this.addComponent("player_equipment", this.playerEquipment);
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
