import { i18n } from "../../Classes/I18n.js";
import { Item } from "../../Classes/Item.js";
import { Animations } from "../../Classes/Animations.js";
import { ItemBuffs } from "../Buffs/Items.js";
import { getGameInstance, getPlayerInstance } from "../Shared.js";
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
export class school_uniform_upper_female extends Item {
  constructor(
    item_id = "school_uniform_upper_female",
  ) {
    const item_name = `item_${item_id}_name`;
    const item_desc = `item_${item_id}_desc`;
    super(
      item_id,
      item_name,
      item_desc,
      false,
      true,
      "upper_outer_body",
      true,
      {},
      false,
      {
        charm: 5,
      },
      [ItemBuffs.GeneralOnEquip,(self,target) => {
        console.log("DEBUG",getGameInstance().getGameSetting("gender"),target.isMonster);
        if(target.isMonster) return;
        if(getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          console.log("DEBUG",target_gender_offset,target);
          if(target_gender_offset != null) {
            target.setFlag("gender_offset",target_gender_offset + 5);
            Animations.displayMessage("warning",i18n.t("info_warning_message_gender_offset_increased"));
          }
        }
      }],
      [ItemBuffs.GeneralOnUnwield,(self,target) => {
        if(target.isMonster) return;
        if(getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if(target_gender_offset != null) {
            target.setFlag("gender_offset",target_gender_offset - 5);
          }
        }
      }],
      [],
    );
  }
}
export class school_uniform_lower_female extends Item {
  constructor(
    item_id = "school_uniform_lower_female",
  ) {
    const item_name = `item_${item_id}_name`;
    const item_desc = `item_${item_id}_desc`;
    super(
      item_id,
      item_name,
      item_desc,
      false,
      true,
      "lower_outer_body",
      true,
      {},
      false,
      {
        charm: 10,
      },
      [ItemBuffs.GeneralOnEquip,(self,target) => {
        if(target.isMonster) return;
        if(getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if(target_gender_offset != null) {
            target.setFlag("gender_offset",target_gender_offset + 35);
            Animations.displayMessage("warning",i18n.t("info_warning_message_gender_offset_increased"));
          }
        }
      }],
      [ItemBuffs.GeneralOnUnwield,(self,target) => {
        if(target.isMonster) return;
        if(getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if(target_gender_offset != null) {
            target.setFlag("gender_offset",target_gender_offset - 35);
          }
        }
      }],
      [],
    );
  }
}
export class underwear_upper_female extends Item {
  constructor(
    item_id = "underwear_upper_female",
  ) {
    const item_name = `item_${item_id}_name`;
    const item_desc = `item_${item_id}_desc`;
    super(
      item_id,
      item_name,
      item_desc,
      false,
      true,
      "upper_inner_body",
      true,
      {},
      false,
      {
        charm: 1,
      },
      [ItemBuffs.GeneralOnEquip,(self,target) => {
        if(target.isMonster) return;
        if(getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if(target_gender_offset != null) {
            target.setFlag("gender_offset",target_gender_offset + 5);
            Animations.displayMessage("warning",i18n.t("info_warning_message_gender_offset_increased"));
          }
        }
      }],
      [ItemBuffs.GeneralOnUnwield,(self,target) => {
        if(target.isMonster) return;
        if(getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if(target_gender_offset != null) {
            target.setFlag("gender_offset",target_gender_offset - 5);
          }
        }
      }],
      [],
    );
  }
}
export class underwear_lower_female extends Item {
  constructor(
    item_id = "underwear_lower_female",
  ) {
    const item_name = `item_${item_id}_name`;
    const item_desc = `item_${item_id}_desc`;
    super(
      item_id,
      item_name,
      item_desc,
      false,
      true,
      "lower_inner_body",
      true,
      {},
      false,
      {
        charm: 1,
      },
      [ItemBuffs.GeneralOnEquip,(self,target) => {
        if(target.isMonster) return;
        if(getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if(target_gender_offset != null) {
            target.setFlag("gender_offset",target_gender_offset + 5);
            Animations.displayMessage("warning",i18n.t("info_warning_message_gender_offset_increased"));
          }
        }
      }],
      [ItemBuffs.GeneralOnUnwield,(self,target) => {
        if(target.isMonster) return;
        if(getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if(target_gender_offset != null) {
            target.setFlag("gender_offset",target_gender_offset - 5);
          }
        }
      }],
      [],
    );
  }
}
export class school_uniform_upper_male extends Item {
  constructor(
    item_id = "school_uniform_upper_male",
  ) {
    const item_name = `item_${item_id}_name`;
    const item_desc = `item_${item_id}_desc`;
    super(
      item_id,
      item_name,
      item_desc,
      false,
      true,
      "upper_outer_body",
      true,
      {},
      false,
      {
        maxEnergy: 3,
        strength: 2,
        charm: 1,
      },
      [ItemBuffs.GeneralOnEquip,(self,target) => {
        if(target.isMonster) return;
        if(getGameInstance().getGameSetting("gender") === 0) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if(target_gender_offset != null) {
            target.setFlag("gender_offset",target_gender_offset + 1);
            Animations.displayMessage("warning",i18n.t("info_warning_message_gender_offset_increased"));
          }
        }
      }],
      [ItemBuffs.GeneralOnUnwield,(self,target) => {
        if(target.isMonster) return;
        if(getGameInstance().getGameSetting("gender") === 0) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if(target_gender_offset != null) {
            target.setFlag("gender_offset",target_gender_offset - 1);
          }
        }
      }],
      [],
    );
  }
}
export class school_uniform_lower_male extends Item {
  constructor(
    item_id = "school_uniform_lower_male",
  ) {
    const item_name = `item_${item_id}_name`;
    const item_desc = `item_${item_id}_desc`;
    super(
      item_id,
      item_name,
      item_desc,
      false,
      true,
      "lower_outer_body",
      true,
      {},
      false,
      {
        maxEnergy:3,
        strength: 3,
        charm: 2,
      },
      [ItemBuffs.GeneralOnEquip,(self,target) => {
        if(target.isMonster) return;
        if(getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if(target_gender_offset != null) {
            target.setFlag("gender_offset",target_gender_offset + 5);
            Animations.displayMessage("warning",i18n.t("info_warning_message_gender_offset_increased"));
          }
        }
      }],
      [ItemBuffs.GeneralOnUnwield,(self,target) => {
        if(target.isMonster) return;
        if(getGameInstance().getGameSetting("gender") === 1) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if(target_gender_offset != null) {
            target.setFlag("gender_offset",target_gender_offset - 5);
          }
        }
      }],
      [],
    );
  }
}
export class underwear_lower_male extends Item {
  constructor(
    item_id = "underwear_lower_male",
  ) {
    const item_name = `item_${item_id}_name`;
    const item_desc = `item_${item_id}_desc`;
    super(
      item_id,
      item_name,
      item_desc,
      false,
      true,
      "lower_inner_body",
      true,
      {},
      false,
      {
        maxEnergy:1,
        charm: 1,
      },
      [ItemBuffs.GeneralOnEquip,(self,target) => {
        if(target.isMonster) return;
        if(getGameInstance().getGameSetting("gender") === 0) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if(target_gender_offset != null) {
            target.setFlag("gender_offset",target_gender_offset + 5);
            Animations.displayMessage("warning",i18n.t("info_warning_message_gender_offset_increased"));
          }
        }
      }],
      [ItemBuffs.GeneralOnUnwield,(self,target) => {
        if(target.isMonster) return;
        if(getGameInstance().getGameSetting("gender") === 0) {
          const target_gender_offset = target.getFlag("gender_offset") || 0;
          if(target_gender_offset != null) {
            target.setFlag("gender_offset",target_gender_offset - 5);
          }
        }
      }],
      [],
    );
  }
}
export const item_list = {
    "berry":berry,
    "broken_hero_sword":broken_hero_sword,
    
    "school_uniform_upper_female":school_uniform_upper_female,
    "school_uniform_lower_female":school_uniform_lower_female,
    "underwear_upper_female":underwear_upper_female,
    "underwear_lower_female":underwear_lower_female,
    "school_uniform_upper_male":school_uniform_upper_male,
    "school_uniform_lower_male":school_uniform_lower_male,
    "underwear_lower_male":underwear_lower_male,

}