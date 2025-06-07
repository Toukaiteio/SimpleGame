import { Item } from "../../../Classes/Item.js";
import { i18n } from "../../../Classes/I18n.js";
import { getPlayerInstance } from "../../Shared.js";

export class Sword extends Item {
  constructor() {
    super(
      "sword", // item_id
      i18n.t("item_sword_name", "Sword"), // item_name
      i18n.t("item_sword_desc", "A trusty blade."), // item_desc
      false, // is_usable
      true, // is_equipable
      "hand", // equip_slot (assuming "hand" is a valid slot, adjust if player.equipment uses different keys like "weapon")
      false, // is_enhanceable
      {}, // enhance_storage
      true, // is_tradeable (optional, can be false)
      { strength: 5 }, // item_status (direct stat impact when equipped)
      // onEquipDo: Modifies player's equipmentBonus.
      [
        (item, target) => {
          if (!target.equipmentBonus) target.equipmentBonus = {};
          if (!target.equipmentBonus[item.equip_slot]) target.equipmentBonus[item.equip_slot] = {};
          target.equipmentBonus[item.equip_slot].strength = (target.equipmentBonus[item.equip_slot].strength || 0) + item.item_status.strength;
          // Potentially trigger a status update or UI refresh if needed, though dialog refresh handles it.
        }
      ],
      // onUnwieldDo: Reverts player's equipmentBonus.
      [
        (item, target) => {
          if (target.equipmentBonus && target.equipmentBonus[item.equip_slot] && target.equipmentBonus[item.equip_slot].strength) {
            target.equipmentBonus[item.equip_slot].strength -= item.item_status.strength;
            if (target.equipmentBonus[item.equip_slot].strength === 0) {
              delete target.equipmentBonus[item.equip_slot].strength;
            }
            if (Object.keys(target.equipmentBonus[item.equip_slot]).length === 0) {
              delete target.equipmentBonus[item.equip_slot];
            }
          }
          // Potentially trigger a status update or UI refresh.
        }
      ],
      [] // onUseDo
    );
  }
}
