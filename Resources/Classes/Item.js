import { getPlayerInstance, getGameInstance } from "../Scripts/Shared.js";
import { itemManager } from "./ItemManager.js";

/**
 * @class Item
 * @classdesc 表示游戏中的一个物品实例，包含物品的基本属性、强化机制、装备和使用效果等。
 */
export class Item {
  /**
   * 创建一个Item实例。
   * @param {Object} params - 初始化物品的参数。
   */
  constructor({
    item_id,
    item_name,
    item_desc,
    is_usable = false,
    is_equipable = false,
    equip_slot = null,
    is_enhanceable = false,
    enhance_storage = {},
    is_tradeable = false,
    item_status = {},
    onEquip = null,
    onUnequip = null,
    onUse = null,
    owner = getPlayerInstance(),
  }) {
    // 基本属性
    this.item_id = item_id;
    this.item_name = item_name;
    this.item_desc = item_desc;
    this.is_usable = is_usable;
    this.is_equipable = is_equipable;
    this.equip_slot = equip_slot;
    this.is_enhanceable = is_enhanceable;
    this.enhance_storage = enhance_storage;
    this.is_tradeable = is_tradeable;
    this.item_status = item_status;
    this.owner = owner;
    this.use_time = 1;

    // 回调函数
    this.onEquip = onEquip;
    this.onUnequip = onUnequip;
    this.onUse = onUse;
  }

  /**
   * 使用物品
   * @param {Player|Monster} [target=getPlayerInstance()] - 使用目标
   * @returns {Promise} 使用结果
   */
  async use(target = getPlayerInstance()) {
    return itemManager.useItem(this, target);
  }

  /**
   * 装备物品
   * @param {Player|Monster} [target=getPlayerInstance()] - 装备目标
   * @returns {Promise} 装备结果
   */
  async equip(target = getPlayerInstance()) {
    return itemManager.equipItem(this, target);
  }

  /**
   * 卸下装备
   * @param {Player|Monster} [target=getPlayerInstance()] - 卸下目标
   * @returns {Promise} 卸下结果
   */
  async unequip(target = getPlayerInstance()) {
    return itemManager.unequipItem(this, target);
  }

  /**
   * 增加物品的使用次数
   * @param {number} num - 增加的次数
   */
  async addUseTime(num) {
    const game = getGameInstance();
    return game.createEvent(
      game.eventWrapper(
        "addUseTime",
        { item: this, num },
        {
          before: async (self) => {
            await game.triggerEvent("beforeAddUseTime", { item: this, num });
          },
          during: async (self) => {
            this.use_time += num;
          },
          after: async (self) => {
            await game.triggerEvent("afterAddUseTime", { item: this, num });
          },
        }
      )
    );
  }

  /**
   * 减少物品的使用次数
   * @param {number} num - 减少的次数
   */
  async costUseTime(num) {
    const game = getGameInstance();
    return game.createEvent(
      game.eventWrapper(
        "costUseTime",
        { item: this, num },
        {
          before: async (self) => {
            await game.triggerEvent("beforeCostUseTime", { item: this, num });
          },
          during: async (self) => {
            if (this.use_time > num) {
              this.use_time -= num;
            } else {
              this.use_time = 0;
            }
          },
          after: async (self) => {
            await game.triggerEvent("afterCostUseTime", { item: this, num });
          },
        }
      )
    );
  }

  /**
   * 强化物品
   * @param {string} targetItemId - 目标强化物品ID
   * @param {Player|Monster} [target=getPlayerInstance()] - 强化目标
   * @returns {Promise} 强化结果
   */
  async enhance(targetItemId, target = getPlayerInstance()) {
    if (!this.is_enhanceable) {
      return false;
    }

    const game = getGameInstance();
    return game.createEvent(
      game.eventWrapper(
        "itemEnhance",
        { item: this, targetItemId, target },
        {
          before: async (self) => {
            await game.triggerEvent("beforeItemEnhance", {
              item: this,
              targetItemId,
              target,
            });
          },
          during: async (self) => {
            // 创建新物品
            const newItem = await Item.create(targetItemId);
            if (!newItem) {
              throw new Error(`Invalid enhancement target: ${targetItemId}`);
            }

            // 移除原物品
            await itemManager.removeItem(this, target);

            // 添加新物品
            await itemManager.addItem(newItem, target);

            return newItem;
          },
          after: async (self) => {
            await game.triggerEvent("afterItemEnhance", {
              item: this,
              targetItemId,
              target,
              result: self.result,
            });
          },
        }
      )
    );
  }

  /**
   * 获取物品名称（支持本地化）
   * @returns {string} 物品名称
   */
  getName() {
    return itemManager.getItemName(this);
  }

  /**
   * 获取物品描述（支持本地化）
   * @returns {string} 物品描述
   */
  getDescription() {
    return itemManager.getItemDescription(this);
  }

  /**
   * 显示物品提示
   * @param {Event} event - 鼠标事件
   * @returns {Object} 提示对象
   */
  showTooltip(event) {
    return itemManager.showItemTooltip(this, event);
  }

  /**
   * 获取物品的关键信息JSON
   * @returns {string} JSON字符串
   */
  toJSON() {
    return {
      item_id: this.item_id,
      item_name: this.item_name,
      item_desc: this.item_desc,
      use_time: this.use_time,
      item_status: this.item_status,
      equip_slot: this.equip_slot,
      is_equipable: this.is_equipable,
      is_usable: this.is_usable,
      is_enhanceable: this.is_enhanceable,
      is_tradeable: this.is_tradeable,
    };
  }

  /**
   * 从数据创建物品实例
   * @param {string|Object} data - 物品ID或物品数据
   * @returns {Promise<Item>} 物品实例
   */
  static async create(data) {
    const game = getGameInstance();
    let itemData;

    if (typeof data === "string") {
      // 如果传入的是物品ID，从游戏数据中获取物品定义
      itemData = await game.getItemData(data);
    } else {
      // 如果传入的是物品数据对象，直接使用
      itemData = data;
    }

    if (!itemData) {
      throw new Error(`Invalid item data: ${data}`);
    }

    return new Item(itemData);
  }
}