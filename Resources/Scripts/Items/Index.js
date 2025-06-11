import { i18n } from "../../Classes/I18n.js";
import { Item } from "../../Classes/Item.js";
import { Animations } from "../../Classes/Animations.js";
import { ItemBuffs } from "../Buffs/Items.js";
import { getGameInstance, getPlayerInstance } from "../Shared.js";

/**
 * 浆果类
 * 可使用的消耗品，恢复少量生命值
 */
export class berry extends Item {
  constructor() {
    super({
      item_id: "berry",
      item_name: i18n.t("item_berry_name"),
      item_desc: i18n.t("item_berry_desc"),
      is_usable: true,
      is_equipable: false,
      is_tradeable: true,
      item_status: {
        heal_hp: 5,
        sell: 5,
        buy: 20,
      },
      onUse: ItemBuffs.HealHP
    });
  }
}

/**
 * 破损的英雄剑
 * 可装备的武器，增加力量属性
 */
export class broken_hero_sword extends Item {
  constructor() {
    super({
      item_id: "broken_hero_sword",
      item_name: i18n.t("item_broken_hero_sword_name"),
      item_desc: i18n.t("item_broken_hero_sword_desc"),
      is_usable: false,
      is_equipable: true,
      equip_slot: "hand",
      is_enhanceable: true,
      item_status: {
        strength: 5,
      }
    });
  }
}

/**
 * 女性校服上衣
 * 可装备的上衣，增加魅力属性和性别偏移
 */
export class school_uniform_upper_female extends Item {
  constructor() {
    super({
      item_id: "school_uniform_upper_female",
      item_name: i18n.t("item_school_uniform_upper_female_name"),
      item_desc: i18n.t("item_school_uniform_upper_female_desc"),
      is_usable: false,
      is_equipable: true,
      equip_slot: "upper_outer_body",
      is_enhanceable: true,
      item_status: {
        charm: 5,
        gender_offset: 5
      },
      onEquip: async (target) => {
        if (target.isMonster) return;
        
        if (getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if (target_gender_offset != null) {
            target.setFlag("gender_offset", target_gender_offset + 5);
            Animations.displayMessage("warning", i18n.t("info_warning_message_gender_offset_increased"));
          }
        }
      },
      onUnequip: async (target) => {
        if (target.isMonster) return;
        
        if (getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if (target_gender_offset != null) {
            target.setFlag("gender_offset", target_gender_offset - 5);
          }
        }
      }
    });
  }
}

/**
 * 女性校服下装
 * 可装备的下装，增加魅力属性和性别偏移
 */
export class school_uniform_lower_female extends Item {
  constructor() {
    super({
      item_id: "school_uniform_lower_female",
      item_name: i18n.t("item_school_uniform_lower_female_name"),
      item_desc: i18n.t("item_school_uniform_lower_female_desc"),
      is_usable: false,
      is_equipable: true,
      equip_slot: "lower_outer_body",
      is_enhanceable: true,
      item_status: {
        charm: 10,
        gender_offset: 35
      },
      onEquip: async (target) => {
        if (target.isMonster) return;
        
        if (getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if (target_gender_offset != null) {
            target.setFlag("gender_offset", target_gender_offset + 35);
            Animations.displayMessage("warning", i18n.t("info_warning_message_gender_offset_increased"));
          }
        }
      },
      onUnequip: async (target) => {
        if (target.isMonster) return;
        
        if (getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if (target_gender_offset != null) {
            target.setFlag("gender_offset", target_gender_offset - 35);
          }
        }
      }
    });
  }
}

/**
 * 女性内衣上装
 * 可装备的内衣，增加魅力属性和性别偏移
 */
export class underwear_upper_female extends Item {
  constructor() {
    super({
      item_id: "underwear_upper_female",
      item_name: i18n.t("item_underwear_upper_female_name"),
      item_desc: i18n.t("item_underwear_upper_female_desc"),
      is_usable: false,
      is_equipable: true,
      equip_slot: "upper_inner_body",
      is_enhanceable: true,
      item_status: {
        charm: 1,
        gender_offset: 5
      },
      onEquip: async (target) => {
        if (target.isMonster) return;
        
        if (getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if (target_gender_offset != null) {
            target.setFlag("gender_offset", target_gender_offset + 5);
            Animations.displayMessage("warning", i18n.t("info_warning_message_gender_offset_increased"));
          }
        }
      },
      onUnequip: async (target) => {
        if (target.isMonster) return;
        
        if (getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if (target_gender_offset != null) {
            target.setFlag("gender_offset", target_gender_offset - 5);
          }
        }
      }
    });
  }
}

/**
 * 女性内衣下装
 * 可装备的内裤，增加魅力属性和性别偏移
 */
export class underwear_lower_female extends Item {
  constructor() {
    super({
      item_id: "underwear_lower_female",
      item_name: i18n.t("item_underwear_lower_female_name"),
      item_desc: i18n.t("item_underwear_lower_female_desc"),
      is_usable: false,
      is_equipable: true,
      equip_slot: "lower_inner_body",
      is_enhanceable: true,
      item_status: {
        charm: 1,
        gender_offset: 5
      },
      onEquip: async (target) => {
        if (target.isMonster) return;
        
        if (getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if (target_gender_offset != null) {
            target.setFlag("gender_offset", target_gender_offset + 5);
            Animations.displayMessage("warning", i18n.t("info_warning_message_gender_offset_increased"));
          }
        }
      },
      onUnequip: async (target) => {
        if (target.isMonster) return;
        
        if (getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if (target_gender_offset != null) {
            target.setFlag("gender_offset", target_gender_offset - 5);
          }
        }
      }
    });
  }
}

/**
 * 男性校服上衣
 * 可装备的上衣，增加能量上限、力量和魅力属性
 */
export class school_uniform_upper_male extends Item {
  constructor() {
    super({
      item_id: "school_uniform_upper_male",
      item_name: i18n.t("item_school_uniform_upper_male_name"),
      item_desc: i18n.t("item_school_uniform_upper_male_desc"),
      is_usable: false,
      is_equipable: true,
      equip_slot: "upper_outer_body",
      is_enhanceable: true,
      item_status: {
        maxEnergy: 3,
        strength: 2,
        charm: 1,
        gender_offset: 1
      },
      onEquip: async (target) => {
        if (target.isMonster) return;
        
        if (getGameInstance().getGameSetting("gender") === 0) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if (target_gender_offset != null) {
            target.setFlag("gender_offset", target_gender_offset + 1);
            Animations.displayMessage("warning", i18n.t("info_warning_message_gender_offset_increased"));
          }
        }
      },
      onUnequip: async (target) => {
        if (target.isMonster) return;
        
        if (getGameInstance().getGameSetting("gender") === 0) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if (target_gender_offset != null) {
            target.setFlag("gender_offset", target_gender_offset - 1);
          }
        }
      }
    });
  }
}

/**
 * 男性校服下装
 * 可装备的下装，增加能量上限、力量和魅力属性
 */
export class school_uniform_lower_male extends Item {
  constructor() {
    super({
      item_id: "school_uniform_lower_male",
      item_name: i18n.t("item_school_uniform_lower_male_name"),
      item_desc: i18n.t("item_school_uniform_lower_male_desc"),
      is_usable: false,
      is_equipable: true,
      equip_slot: "lower_outer_body",
      is_enhanceable: true,
      item_status: {
        maxEnergy: 3,
        strength: 3,
        charm: 2,
        gender_offset: 5
      },
      onEquip: async (target) => {
        if (target.isMonster) return;
        
        if (getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if (target_gender_offset != null) {
            target.setFlag("gender_offset", target_gender_offset + 5);
            Animations.displayMessage("warning", i18n.t("info_warning_message_gender_offset_increased"));
          }
        }
      },
      onUnequip: async (target) => {
        if (target.isMonster) return;
        
        if (getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if (target_gender_offset != null) {
            target.setFlag("gender_offset", target_gender_offset - 5);
          }
        }
      }
    });
  }
}

/**
 * 男性内衣下装
 * 可装备的内裤，增加能量上限和魅力属性
 */
export class underwear_lower_male extends Item {
  constructor() {
    super({
      item_id: "underwear_lower_male",
      item_name: i18n.t("item_underwear_lower_male_name"),
      item_desc: i18n.t("item_underwear_lower_male_desc"),
      is_usable: false,
      is_equipable: true,
      equip_slot: "lower_inner_body",
      is_enhanceable: true,
      item_status: {
        maxEnergy: 1,
        charm: 1,
        gender_offset: 5
      },
      onEquip: async (target) => {
        if (target.isMonster) return;
        
        if (getGameInstance().getGameSetting("gender") === 0) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if (target_gender_offset != null) {
            target.setFlag("gender_offset", target_gender_offset + 5);
            Animations.displayMessage("warning", i18n.t("info_warning_message_gender_offset_increased"));
          }
        }
      },
      onUnequip: async (target) => {
        if (target.isMonster) return;
        
        if (getGameInstance().getGameSetting("gender") === 0) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if (target_gender_offset != null) {
            target.setFlag("gender_offset", target_gender_offset - 5);
          }
        }
      }
    });
  }
}

/**
 * 物品列表
 * 用于通过ID查找物品类
 */
export const item_list = {
  "berry": berry,
  "broken_hero_sword": broken_hero_sword,
  
  "school_uniform_upper_female": school_uniform_upper_female,
  "school_uniform_lower_female": school_uniform_lower_female,
  "underwear_upper_female": underwear_upper_female,
  "underwear_lower_female": underwear_lower_female,
  "school_uniform_upper_male": school_uniform_upper_male,
  "school_uniform_lower_male": school_uniform_lower_male,
  "underwear_lower_male": underwear_lower_male,
};

/**
 * 获取物品数据
 * @param {string} itemId 物品ID
 * @returns {Object|null} 物品数据或null
 */
export async function getItemData(itemId) {
  if (item_list[itemId]) {
    const itemInstance = new item_list[itemId]();
    return {
      item_id: itemInstance.item_id,
      item_name: itemInstance.item_name,
      item_desc: itemInstance.item_desc,
      is_usable: itemInstance.is_usable,
      is_equipable: itemInstance.is_equipable,
      equip_slot: itemInstance.equip_slot,
      is_enhanceable: itemInstance.is_enhanceable,
      enhance_storage: itemInstance.enhance_storage,
      is_tradeable: itemInstance.is_tradeable,
      item_status: itemInstance.item_status,
      onEquip: itemInstance.onEquip,
      onUnequip: itemInstance.onUnequip,
      onUse: itemInstance.onUse
    };
  }
  return null;
}
