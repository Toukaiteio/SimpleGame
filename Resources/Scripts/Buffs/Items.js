import {
  getGameInstance,
  getPlayerInstance,
  getUIInstance,
} from "../Shared.js";
const player = getPlayerInstance();
export const ItemBuffs = {
  GeneralOnEquip(self, target) {
    const equip = self;
    if(equip.use_time <= 0) return;
    if (
      !target.equipmentBonus[equip.equip_slot] ||
      target.equipmentBonus[equip.equip_slot]["equipped"] === false
    ) {
      target.equipmentBonus[equip.equip_slot] = {
        equipped: true,
        ...equip.item_status,
      };
      target.equipment[equip.equip_slot] = equip;
      equip.costUseTime(1);
    }
  },
  GeneralOnUnwield(self, target) {
    const equip = self;
    if (
      target.equipmentBonus[equip.equip_slot] &&
      target.equipmentBonus[equip.equip_slot]["equipped"]
    ) {
      target.equipmentBonus[equip.equip_slot] = {
        equipped: false,
      };
      target.equipment[equip.equip_slot] = null;
      equip.addUseTime(1);
    }
  },
  GeneralOnUse(self, target) {
    const item = self;
    if(item.use_time <= 0) return;
    item.costUseTime(1).addHook("after", async (self, game) => {
      const ui = getUIInstance();
      if (ui.currentScene.playerBag) {
        ui.currentScene.playerBag.updateSelf(target);
      }
      game.createEvent(
        game.eventWrapper(
          "onUse",
          {
            status: item.item_status,
            target: target,
          },
          {
            during: async (self, game) => {
              item.onUse(self.data.status, self.data.target);
            },
          }
        )
      );
    });
  },
};
