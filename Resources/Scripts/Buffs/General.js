import { i18n } from "../../Classes/I18n.js";
import { SeededRandom } from "../../Classes/Random.js";

export const Buff_List = {
  JiAng: {
    name: "battle_buff_JiAng_name",
    effect_desc: "battle_buff_JiAng_Effect",
    effect_timing: ["onDamaged", "during"],
    effect_type: "buff",
    effect_hook_wrapper: function (entity) {
      return async function (self, game) {
        if (self.data.source === entity) {
          self.data.attackEvent.data.attackPower = Math.ceil(
            self.data.attackEvent.data.attackPower * 1.5
          );
          self.data.source.status.buffList.find(
            (el) => el.buff === "JiAng"
          ).remainRound -= 1;
        }
      };
    },
  },
  ZhanLi: {
    name: "battle_buff_ZhanLi_name",
    effect_desc: "battle_buff_ZhanLi_Effect",
    effect_timing: ["onDamaged", "during"],
    no_round_limited_symbol: true,
    effect_type: "debuff",
    effect_hook_wrapper: function (entity) {
      return async function (self, game) {
        if (self.data.source === entity) {
          if (SeededRandom.randomProbability(15)) {
            self.data.attackEvent.data.attackPower = 0;
          }
          const _self = self.data.source.status.buffList.find(
            (el) => el.buff === "ZhanLi"
          );
          self.data.source.addBuff("ZhanLi", _self.reason, 1);
        }
      };
    },
  },
};
