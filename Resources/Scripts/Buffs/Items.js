import {
  getGameInstance,
  getPlayerInstance,
  getUIInstance,
} from "../Shared.js";
import { itemManager } from "../../Classes/ItemManager.js";

/**
 * 物品效果系统
 * 提供与新物品管理系统兼容的物品效果处理
 */
export const ItemBuffs = {
  /**
   * 通用装备效果
   * @param {Item} self 物品实例
   * @param {Player} target 目标玩家
   */
  async GeneralOnEquip(self, target) {
    // 使用新的物品管理器装备物品
    await itemManager.equipItem(self, target);
    
    // 更新UI
    const ui = getUIInstance();
    if (ui.currentScene.playerBag) {
      ui.currentScene.playerBag.updateSelf(target);
    }
  },
  
  /**
   * 通用卸下效果
   * @param {Item} self 物品实例
   * @param {Player} target 目标玩家
   */
  async GeneralOnUnwield(self, target) {
    // 使用新的物品管理器卸下装备
    await itemManager.unequipItem(self, target);
    
    // 更新UI
    const ui = getUIInstance();
    if (ui.currentScene.playerBag) {
      ui.currentScene.playerBag.updateSelf(target);
    }
  },
  
  /**
   * 通用使用效果
   * @param {Item} self 物品实例
   * @param {Player} target 目标玩家
   */
  async GeneralOnUse(self, target) {
    // 使用新的物品管理器使用物品
    await itemManager.useItem(self, target);
    
    // 更新UI
    const ui = getUIInstance();
    if (ui.currentScene.playerBag) {
      ui.currentScene.playerBag.updateSelf(target);
    }
  },
  
  /**
   * 恢复生命值效果
   * @param {Object} status 物品状态
   * @param {Player} target 目标玩家
   */
  async HealHP(status, target) {
    if (status.heal_hp) {
      const game = getGameInstance();
      await game.createEvent(
        game.eventWrapper(
          "healHP",
          { amount: status.heal_hp, target },
          {
            during: async (self) => {
              self.data.target.status.hp += self.data.amount;
              if (self.data.target.status.hp > self.data.target.status.maxHp) {
                self.data.target.status.hp = self.data.target.status.maxHp;
              }
            },
            after: async (self) => {
              const ui = getUIInstance();
              ui.showFloatingText(`+${self.data.amount} HP`, self.data.target.x, self.data.target.y - 20, 0x00ff00);
            }
          }
        )
      );
    }
  },
  
  /**
   * 恢复魔法值效果
   * @param {Object} status 物品状态
   * @param {Player} target 目标玩家
   */
  async HealMP(status, target) {
    if (status.heal_mp) {
      const game = getGameInstance();
      await game.createEvent(
        game.eventWrapper(
          "healMP",
          { amount: status.heal_mp, target },
          {
            during: async (self) => {
              self.data.target.status.mp += self.data.amount;
              if (self.data.target.status.mp > self.data.target.status.maxMp) {
                self.data.target.status.mp = self.data.target.status.maxMp;
              }
            },
            after: async (self) => {
              const ui = getUIInstance();
              ui.showFloatingText(`+${self.data.amount} MP`, self.data.target.x, self.data.target.y - 20, 0x0000ff);
            }
          }
        )
      );
    }
  },
  
  /**
   * 临时增加属性效果
   * @param {Object} status 物品状态
   * @param {Player} target 目标玩家
   */
  async TemporaryStatBoost(status, target) {
    if (status.temp_boost) {
      const game = getGameInstance();
      const boostDuration = status.boost_duration || 30; // 默认30秒
      
      for (const [stat, value] of Object.entries(status.temp_boost)) {
        if (target.status[stat] !== undefined) {
          const originalValue = target.status[stat];
          
          // 应用增益
          target.status[stat] += value;
          
          // 显示效果
          const ui = getUIInstance();
          ui.showFloatingText(`${stat} +${value}`, target.x, target.y - 20, 0xffff00);
          
          // 设置定时器恢复原值
          setTimeout(() => {
            target.status[stat] = originalValue;
            ui.showFloatingText(`${stat} 效果结束`, target.x, target.y - 20, 0xffff00);
          }, boostDuration * 1000);
        }
      }
    }
  }
};

// 注册物品事件监听器
const game = getGameInstance();

// 物品使用事件
game.addEventListener("afterItemUse", async (event) => {
  const { item, target } = event;
  
  // 更新UI
  const ui = getUIInstance();
  if (ui.currentScene.playerBag) {
    ui.currentScene.playerBag.updateSelf(target);
  }
  
  // 如果物品用完，从背包移除
  if (item.use_time <= 0) {
    const itemId = item.item_id;
    if (target.inventory[itemId]) {
      target.inventory[itemId] = target.inventory[itemId].filter(i => i !== item);
      if (target.inventory[itemId].length === 0) {
        delete target.inventory[itemId];
      }
    }
  }
});

// 物品装备事件
game.addEventListener("afterItemEquip", async (event) => {
  const { item, target } = event;
  
  // 更新UI
  const ui = getUIInstance();
  if (ui.currentScene.playerBag) {
    ui.currentScene.playerBag.updateSelf(target);
  }
  if (ui.currentScene.playerEquipment) {
    ui.currentScene.playerEquipment.updateSelf(target);
  }
});

// 物品卸下事件
game.addEventListener("afterItemUnequip", async (event) => {
  const { item, target } = event;
  
  // 更新UI
  const ui = getUIInstance();
  if (ui.currentScene.playerBag) {
    ui.currentScene.playerBag.updateSelf(target);
  }
  if (ui.currentScene.playerEquipment) {
    ui.currentScene.playerEquipment.updateSelf(target);
  }
});