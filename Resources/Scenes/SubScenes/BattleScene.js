import { SubScene } from "../../Classes/UI.js";
import { log } from "../../Classes/Game.js";
import { i18n } from "../../Classes/I18n.js";
import {
  getGameInstance,
  getPlayerInstance,
  getUIInstance,
} from "../../Scripts/Shared.js";
import { Buff_List } from "../../Scripts/Buffs/General.js";
class BattleScene extends SubScene {
  constructor() {
    super("BattleScene");
    this.isAllowSave = false;
    this.textContent = i18n.t(this.id);
    // 勾住 onBattleBegin 的 after时机，将游戏场景跳转至自身;
    const game = getGameInstance();
    // 在Batlle场景被创建时会自动注册，不需要考虑被注册问题。
    game.addGlobalTrigger("onBattleBegin", "after", async (self, game) => {
      const next = self.data.player.moveTo("#BattleScene");
      // add next round button to defaultIntereactives here;
      this.hasRoadTo = [];
      this.battleLogs = [];
      this.isBattleEnd = false;
      this.noSafeText = true;
      this.defaultIntereactives = [document.createElement("br")];
      this.defaultIntereactives.push(
        this.createButton("nextround", i18n.t("battle_func_next_round"), () => {
          self.data.battle.goNext();
        })
      );
      next.data["battleData"] = {
        player: self.data.player,
        monster: self.data.monster,
        battle: self.data.battle,
      };
      next.addHook("after", async (self, game) => {
        self.data.to.battleData = self.data.battleData;
        const skillButtons = [];
        for (const i of self.data.battleData.player.skills) {
          skillButtons.push(
            this.createButton(
              `${i.id}_skillbutton`,
              i.skillName,
              () => {
                const next = self.data.battleData.battle.onUseSkill(
                  self.data.battleData.player,
                  self.data.battleData.monster,
                  i.id
                );
              },
              (i.isAutoTrigger ? i18n.t("skill_AutoTrigger_flag") : "") +
                i.skillDesc
            )
          );
        }
        this.interactiveElements = [];
        this.addInteractiveElement(
          ...skillButtons.concat(this.defaultIntereactives)
        );
        this.parentScene.render(getUIInstance().gameContainer);
      });
    });
  }
  createButton(name, content, callback, title = "", isForbid = false) {
    const t = document.createElement("button");
    t.id = name;
    t.innerHTML = content;
    if (title) t.title = title;
    t.onclick = callback;
    if (isForbid) t.disabled = true;
    return t;
  }
  updateSelf() {
    if (this.battleData && this.battleData.battle) {
      const fmt = {
        MonsterName: this.battleData.monster.name,
        PlayerHealthPoints: this.battleData.player.hp,
        PlayerMaxHealthPoints: this.battleData.player.status.maxHp,
        MonsterHealthPoints: this.battleData.monster.hp,
        MonsterMaxHealthPoints: this.battleData.monster.status.maxHp,
        RoundCount: this.battleData.battle.turn,
      };
      this.textContent = i18n.f(this.id + "_Data", fmt) + "<br/>";
      if (this.battleData.player.status.buffList.length > 0) {
        for (const i of this.battleData.player.status.buffList) {
          const fmt_Buff = {
            MonsterName: this.battleData.player.playerName
              ? this.battleData.player.playerName["lastName"] +
                " " +
                this.battleData.player.playerName["firstName"]
              : i18n.t("battle_player_default"),
            BuffReason: i.reason,
            BuffType:Buff_List[i.buff].effect_type,
            BuffInfo:
              (Buff_List[i.buff].no_round_limited_symbol
                ? i18n.t("battle_buff_Effect_prefix2")
                : i18n.f("battle_buff_Effect_prefix", {
                    RemainRound: i.remainRound,
                  })) + i18n.t(Buff_List[i.buff].effect_desc),
            BuffName: i18n.t(Buff_List[i.buff].name),
          };
          this.textContent += i18n.f("battle_buff_reason", fmt_Buff) + "<br/>";
        }
      }
      if (this.battleData.monster.status.buffList.length > 0) {
        for (const i of this.battleData.monster.status.buffList) {
          const fmt_Buff = {
            MonsterName: this.battleData.monster.name,
            BuffReason: i.reason,
            BuffType:Buff_List[i.buff].effect_type,
            BuffInfo:
              (Buff_List[i.buff].no_round_limited_symbol
                ? i18n.t("battle_buff_Effect_prefix2")
                : i18n.f("battle_buff_Effect_prefix", {
                    RemainRound: i.remainRound,
                  })) + i18n.t(Buff_List[i.buff].effect_desc),
            BuffName: i18n.t(Buff_List[i.buff].name),
          };
          this.textContent += i18n.f("battle_buff_reason", fmt_Buff) + "<br/>";
        }
      }
      this.textContent += this.battleLogs.join("<br/>");
      if (!getPlayerInstance().getFlag("FirstFight"))
        this.textContent += "\nTips:将鼠标悬放在技能上可以查看技能效果！";
      if (!this.battleData.battle.isBattleEnd) {
        const skillButtons = [];
        for (const i of this.battleData.player.skills) {
          if (i.isCoolingDown) {
            skillButtons.push(
              this.createButton(
                `${i.id}_skillbutton`,
                i.skillName +
                  i18n.f("info_skill_cooling_remain", {
                    CoolingDownRoundsRemain: i.skillCD - i.CDCounter,
                  }),
                () => {
                  return;
                },
                (i.isAutoTrigger ? i18n.t("skill_AutoTrigger_flag") : "") +
                  i.skillDesc,
                true
              )
            );
          } else {
            skillButtons.push(
              this.createButton(
                `${i.id}_skillbutton`,
                i.skillName,
                () => {
                  const next = this.battleData.battle.onUseSkill(
                    this.battleData.player,
                    this.battleData.monster,
                    i.id
                  );
                },
                (i.isAutoTrigger ? i18n.t("skill_AutoTrigger_flag") : "") +
                  i.skillDesc
              )
            );
          }
        }
        this.interactiveElements = [];
        this.addInteractiveElement(
          ...skillButtons.concat(this.defaultIntereactives)
        );
      }
    }
  }
}
export default BattleScene;
