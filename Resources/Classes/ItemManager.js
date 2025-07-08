import { getGameInstance } from "../Scripts/Shared.js";
import { i18n } from "./I18n.js";
import { Animations } from "./Animations.js";

/**
 * 物品管理器类
 * 负责处理物品的使用、装备、移除等操作
 */
export class ItemManager {
  constructor() {
    this.game = getGameInstance();
  }

  /**
   * 使用物品
   * @param {Item} item 要使用的物品
   * @param {Player} target 目标玩家
   * @returns {Promise} 使用物品的结果
   */
  async useItem(item, target) {
    if (!item.is_usable || item.use_time <= 0) {
      return false;
    }

    return this.game.createEvent(
      this.game.eventWrapper(
        "itemUse",
        { item, target },
        {
          during: async (self) => {
            // 扣除使用次数
            await item.costUseTime(1);

            // 应用物品效果
            if (item.onUse) {
              await item.onUse(item.item_status, target);
            }
          },
        },
        undefined,
        undefined
      )
    );
  }

  /**
   * 装备物品
   * @param {Item} item 要装备的物品
   * @param {Player} target 目标玩家
   * @returns {Promise} 装备物品的结果
   */
  async equipItem(item, target) {
    if (!item.is_equipable || item.use_time <= 0) {
      return false;
    }

    const slot = item.equip_slot;

    return this.game.createEvent(
      this.game.eventWrapper(
        "itemEquip",
        { item, target, slot },
        {
          before: async (self) => {
            // 如果槽位已有装备，先卸下
            if (target.equipment[slot]) {
              await this.unequipItem(target.equipment[slot], target);
            }
          },
          during: async (self) => {
            // 扣除使用次数
            await item.costUseTime(1);

            // 更新装备状态
            target.equipment[slot] = item;
            target.equipmentBonus[slot] = {
              equipped: true,
              ...item.item_status,
            };

            // 应用装备效果
            if (item.onEquip) {
              await item.onEquip(target);
            }
          },
        },
        undefined,
        undefined
      )
    );
  }

  /**
   * 卸下装备
   * @param {Item} item 要卸下的装备
   * @param {Player} target 目标玩家
   * @returns {Promise} 卸下装备的结果
   */
  async unequipItem(item, target) {
    if (!item.is_equipable) {
      return false;
    }

    const slot = item.equip_slot;

    return this.game.createEvent(
      this.game.eventWrapper(
        "itemUnequip",
        { item, target, slot },
        {
          during: async (self) => {
            // 恢复使用次数
            await item.addUseTime(1);

            // 清除装备状态
            target.equipment[slot] = null;
            target.equipmentBonus[slot] = {
              equipped: false,
            };

            // 移除装备效果
            if (item.onUnequip) {
              await item.onUnequip(target);
            }
          },
        },
        undefined,
        undefined
      )
    );
  }

  /**
   * 添加物品到背包
   * @param {Item} item 要添加的物品
   * @param {Player} target 目标玩家
   * @param {number} amount 数量
   * @returns {Promise} 添加物品的结果
   */
  async addItem(item, target, amount = 1) {
    return this.game.createEvent(
      this.game.eventWrapper(
        "itemAdd",
        { item, target, amount },
        {
          during: async (self) => {
            const itemId = item.item_id;

            // 初始化物品栏位
            if (!target.inventory[itemId]) {
              target.inventory[itemId] = [];
            }

            // 添加物品
            item.addUseTime(amount);
            target.inventory[itemId].push(item);
          },
        },
        undefined,
        undefined
      )
    );
  }

  /**
   * 从背包移除物品
   * @param {Item} item 要移除的物品
   * @param {Player} target 目标玩家
   * @param {number} amount 数量
   * @returns {Promise} 移除物品的结果
   */
  async removeItem(item, target, amount = 1) {
    return this.game.createEvent(
      this.game.eventWrapper(
        "itemRemove",
        { item, target, amount },
        {
          during: async (self) => {
            const itemId = item.item_id;

            if (target.inventory[itemId]) {
              // 扣除使用次数
              await item.costUseTime(amount);

              // 如果物品用完，从背包移除
              if (item.use_time <= 0) {
                target.inventory[itemId] = target.inventory[itemId].filter(
                  (i) => i !== item
                );
                if (target.inventory[itemId].length === 0) {
                  delete target.inventory[itemId];
                }
              }
            }
          },
        },
        undefined,
        undefined
      )
    );
  }

  /**
   * 按ID从背包移除物品
   * @param {Player} target 目标玩家
   * @param {string} itemId 物品ID
   * @param {number} amount 数量
   * @returns {Promise}
   */
  async removeItemById(target, itemId, amount) {
    let amountToRemove = amount;
    const items = target.inventory[itemId] || [];

    for (const item of items) {
      if (amountToRemove <= 0) break;

      const amountFromThisStack = Math.min(item.use_time, amountToRemove);
      await this.removeItem(item, target, amountFromThisStack);
      amountToRemove -= amountFromThisStack;
    }
  }

  /**
   * 获取物品本地化名称
   * @param {Item} item 物品
   * @returns {string} 本地化名称
   */
  getItemName(item) {
    return i18n.t(`item_${item.item_id}_name`) || item.item_name;
  }

  /**
   * 获取物品本地化描述
   * @param {Item} item 物品
   * @returns {string} 本地化描述
   */
  getItemDescription(item) {
    return i18n.t(`item_${item.item_id}_desc`) || item.item_desc;
  }

  /**
   * 显示物品提示
   * @param {Item} item 物品
   * @param {Event} event 鼠标事件
   * @returns {Object} 提示对象
   */
  showItemTooltip(item, event) {
    const content = this.getItemDescription(item);
    return Animations.createTooltip(content, event);
  }
}

// 导出单例实例
export const itemManager = new ItemManager();
