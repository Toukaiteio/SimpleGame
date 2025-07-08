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
  Confused: {
    name: "混乱",
    effect_desc: "伤害降低10%",
    effect_timing: ["onAttack", "during"],
    effect_type: "debuff",
    effect_hook_wrapper: function (entity) {
      return async function (self, game) {
        if (self.data.source === entity && self.data.attackPower) {
          self.data.attackPower = Math.floor(self.data.attackPower * 0.9);
        }
      };
    },
  },
  VeryConfused: {
    name: "非常混乱",
    effect_desc: "伤害降低20%",
    effect_timing: ["onAttack", "during"],
    effect_type: "debuff",
    effect_hook_wrapper: function (entity) {
      return async function (self, game) {
        if (self.data.source === entity && self.data.attackPower) {
          self.data.attackPower = Math.floor(self.data.attackPower * 0.8);
        }
      };
    },
  },
  Madness: {
    name: "抓狂",
    effect_desc: "伤害降低50%，攻击后有概率自伤",
    effect_timing: ["onAttack", "during"],
    effect_type: "debuff",
    effect_hook_wrapper: function (entity) {
      return async function (self, game) {
        if (self.data.source === entity && self.data.attackPower) {
          self.data.attackPower = Math.floor(self.data.attackPower * 0.5);
        }
      };
    },
    after_hook_wrapper: function (entity) {
      return async function (self, game) {
        if (self.data.source === entity && self.data.attackPower) {
          if (SeededRandom.randomProbability(30)) {
            // 30%概率自伤，伤害为本次攻击力50%
            const selfDamage = Math.floor(self.data.attackPower * 0.5);
            entity.status.hp = Math.max(0, entity.status.hp - selfDamage);
            const ui = getUIInstance();
            const scene = ui.getCurrentScene();
            if (scene && scene.addBattleLog) {
              scene.addBattleLog(`${entity.getPlayerName ? entity.getPlayerName() : entity.getName()} 因抓狂自伤，损失${selfDamage}点生命！`);
            }
          }
        }
      };
    }
  },
};
