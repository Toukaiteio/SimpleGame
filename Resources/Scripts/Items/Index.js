import { i18n } from "../../Classes/I18n.js";
import { Item } from "../../Classes/Item.js";
import { ItemBuffs } from "../Buffs/Items.js";
import { getPlayerInstance } from "../Shared.js";
export class berry extends Item {
    constructor(
      item_id = "berry",
    ) {
      const item_name = `item_${item_id}_name`;
      const item_desc = `item_${item_id}_desc`;
      super(
        item_id,
        item_name,
        item_desc,
        true,
        false,
        null,
        false,
        {},
        true,
        {
          hp: 5,
          sell: 5,
          buy: 20,
        },
        [],
        [],
        [ItemBuffs.GeneralOnUse],
      );
    }
    onUse(status,target){
      target.restoreHp(status.hp);
    }
  }
export class broken_hero_sword extends Item {
    constructor(
      item_id = "broken_hero_sword",
    ) {
      const item_name = `item_${item_id}_name`;
      const item_desc = `item_${item_id}_desc`;
      super(
        item_id,
        item_name,
        item_desc,
        false,
        true,
        "hand",
        true,
        {},
        false,
        {
          strength: 5,
        },
        [ItemBuffs.GeneralOnEquip],
        [ItemBuffs.GeneralOnUnwield],
        [],
      );
    }
  }
export const item_list = {
    "berry":berry,
    "broken_hero_sword":broken_hero_sword
}