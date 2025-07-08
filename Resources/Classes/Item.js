import { getPlayerInstance, getGameInstance } from "../Scripts/Shared.js";
import { itemManager } from "./ItemManager.js";
import { i18n } from "./I18n.js";

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
    enhancement_level = 0,
    enhancement_materials = {},
    is_tradeable = false,
    item_status = {},
    use_time = 1,
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
    this.is_tradeable = is_tradeable;
    this.owner = owner;
    this.use_time = use_time;

    // 强化相关
    this.enhancement_level = enhancement_level;
    this.enhancement_materials = enhancement_materials;
    this.base_item_status = { ...item_status }; // 存储原始属性
    this.item_status = item_status;

    // 回调函数
    this.onEquip = onEquip;
    this.onUnequip = onUnequip;
    this.onUse = onUse;

    // 如果加载时强化等级>0，则应用强化加成
    if (this.enhancement_level > 0) {
      this.applyEnhancementBonus();
    }
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
   * @returns {Promise<{success: boolean, message: string}>} 强化结果
   */
  async enhance() {
    if (!this.is_enhanceable) {
      return { success: false, message: "This item cannot be enhanced." };
    }

    const player = getPlayerInstance();
    const game = getGameInstance();
    const materials = this.getEnhancementCost();
    const allItems = player.getItems();

    // 检查材料
    for (const materialId in materials) {
      const requiredAmount = materials[materialId];
      if (materialId === "gold") {
        if ((player.gold || 0) < requiredAmount) {
          return {
            success: false,
            message: i18n.f("error_not_enough_gold", {
              required: requiredAmount,
              has: player.gold || 0,
            }),
          };
        }
      } else {
        const totalAmount = allItems
          .filter((i) => i.item_id === materialId)
          .reduce((sum, item) => sum + item.use_time, 0);
        if (totalAmount < requiredAmount) {
          return {
            success: false,
            message: i18n.f("error_not_enough_materials", {
              required: requiredAmount,
              name: i18n.t(`item_${materialId}_name`) || materialId,
              has: totalAmount,
            }),
          };
        }
      }
    }

    // 消耗材料
    for (const materialId in materials) {
      const requiredAmount = materials[materialId];
      if (materialId === "gold") {
        player.gold -= requiredAmount;
      } else {
        await itemManager.removeItemById(player, materialId, requiredAmount);
      }
    }

    // 强化物品
    this.enhancement_level++;
    this.applyEnhancementBonus();

    await game.triggerEvent("afterItemEnhance", { item: this });

    return {
      success: true,
      message: i18n.t("enhance_success") || "Enhancement successful!",
    };
  }

  /**
   * 应用强化加成
   */
  applyEnhancementBonus() {
    // 示例加成逻辑：每级为每个数字属性+1。可以根据需要实现更复杂的逻辑。
    for (const stat in this.base_item_status) {
      if (typeof this.base_item_status[stat] === "number") {
        const baseValue = this.base_item_status[stat];
        this.item_status[stat] = baseValue + this.enhancement_level;
      }
    }
  }

  /**
   * 获取下一次强化所需的材料
   * @returns {Object} 材料ID和数量
   */
  getEnhancementCost() {
    const cost = {};
    for (const materialId in this.enhancement_materials) {
      const baseCost = this.enhancement_materials[materialId];
      // 示例成本逻辑：成本随等级增加
      cost[materialId] = baseCost * (this.enhancement_level + 1);
    }
    return cost;
  }

  /**
   * 获取下一个强化等级的属性
   * @returns {Object | null} 属性对象或null
   */
  getNextEnhancementStats() {
    if (!this.is_enhanceable) return null;

    const nextStats = { ...this.item_status };
    const nextLevel = this.enhancement_level + 1;

    for (const stat in this.base_item_status) {
      if (typeof this.base_item_status[stat] === "number") {
        const baseValue = this.base_item_status[stat];
        nextStats[stat] = baseValue + nextLevel;
      }
    }
    return nextStats;
  }

  /**
   * 获取物品名称（支持本地化）
   * @returns {string} 物品名称
   */
  getName() {
    const name = itemManager.getItemName(this);
    if (this.is_enhanceable && this.enhancement_level > 0) {
      return `${name} +${this.enhancement_level}`;
    }
    return name;
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
   * 获取物品的关键信息JSON，用于保存
   * @returns {Object}
   */
  toJSON() {
    return {
      item_id: this.item_id,
      use_time: this.use_time,
      enhancement_level: this.enhancement_level,
    };
  }

  /**
   * 从数据创建物品实例
   * @param {string|Object} data - 物品ID或从存档加载的物品数据
   * @returns {Promise<Item>} 物品实例
   */
  static async create(data) {
    const game = getGameInstance();
    let itemData;
    let savedData = {};

    if (typeof data === "string") {
      // 从ID创建新物品
      itemData = await game.getItemData(data);
    } else {
      // 从存档数据恢复物品
      itemData = await game.getItemData(data.item_id);
      savedData = data;
    }

    if (!itemData) {
      throw new Error(`Invalid item data: ${JSON.stringify(data)}`);
    }

    // 合并基础数据和存档数据
    const finalData = { ...itemData, ...savedData };

    return new Item(finalData);
  }
}