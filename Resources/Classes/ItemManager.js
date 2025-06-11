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
          before: async (self) => {
            // 触发使用前事件
            await this.game.triggerEvent("beforeItemUse", { item, target });
          },
          during: async (self) => {
            // 扣除使用次数
            item.costUseTime(1);
            
            // 应用物品效果
            if (item.onUse) {
              await item.onUse(item.item_status, target);
            }
          },
          after: async (self) => {
            // 触发使用后事件
            await this.game.triggerEvent("afterItemUse", { item, target });
          }
        }
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
            // 触发装备前事件
            await this.game.triggerEvent("beforeItemEquip", { item, target, slot });
            
            // 如果槽位已有装备，先卸下
            if (target.equipment[slot]) {
              await this.unequipItem(target.equipment[slot], target);
            }
          },
          during: async (self) => {
            // 扣除使用次数
            item.costUseTime(1);
            
            // 更新装备状态
            target.equipment[slot] = item;
            target.equipmentBonus[slot] = {
              equipped: true,
              ...item.item_status
            };

            // 应用装备效果
            if (item.onEquip) {
              await item.onEquip(target);
            }
          },
          after: async (self) => {
            // 触发装备后事件
            await this.game.triggerEvent("afterItemEquip", { item, target, slot });
          }
        }
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
          before: async (self) => {
            // 触发卸下前事件
            await this.game.triggerEvent("beforeItemUnequip", { item, target, slot });
          },
          during: async (self) => {
            // 恢复使用次数
            item.addUseTime(1);
            
            // 清除装备状态
            target.equipment[slot] = null;
            target.equipmentBonus[slot] = {
              equipped: false
            };

            // 移除装备效果
            if (item.onUnequip) {
              await item.onUnequip(target);
            }
          },
          after: async (self) => {
            // 触发卸下后事件
            await this.game.triggerEvent("afterItemUnequip", { item, target, slot });
          }
        }
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
          before: async (self) => {
            // 触发添加前事件
            await this.game.triggerEvent("beforeItemAdd", { item, target, amount });
          },
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
          after: async (self) => {
            // 触发添加后事件
            await this.game.triggerEvent("afterItemAdd", { item, target, amount });
          }
        }
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
          before: async (self) => {
            // 触发移除前事件
            await this.game.triggerEvent("beforeItemRemove", { item, target, amount });
          },
          during: async (self) => {
            const itemId = item.item_id;
            
            if (target.inventory[itemId]) {
              // 扣除使用次数
              item.costUseTime(amount);
              
              // 如果物品用完，从背包移除
              if (item.use_time <= 0) {
                target.inventory[itemId] = target.inventory[itemId].filter(i => i !== item);
                if (target.inventory[itemId].length === 0) {
                  delete target.inventory[itemId];
                }
              }
            }
          },
          after: async (self) => {
            // 触发移除后事件
            await this.game.triggerEvent("afterItemRemove", { item, target, amount });
          }
        }
      )
    );
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