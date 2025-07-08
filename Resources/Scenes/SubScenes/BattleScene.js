import { SubScene } from "../../Classes/SubScene.js";
import { log } from "../../Classes/Utils.js";
import { i18n } from "../../Classes/I18n.js";
import {
  getGameInstance,
  getPlayerInstance,
  getUIInstance,
} from "../../Scripts/Shared.js";
import { Buff_List } from "../../Scripts/Buffs/General.js";
import { FastComponent } from "../../Classes/FastComponent.js";
import { Animations } from "../../Classes/Animations.js";
import { html, render } from "../../ThirdParty/lit-html.js";
class BattleScene extends SubScene {
  constructor() {
    super("BattleScene");
    this.isAllowSave = false;
    this.textContent = i18n.t(this.id);
    this.battleLogContainer = FastComponent.BattleLogContainer();
    const game = getGameInstance();
    game.addGlobalTrigger("onBattleBegin", "after", async (self, game) => {
      const next = self.data.player.moveTo("#BattleScene");
      this.hasRoadTo = [];
      this.isBattleEnd = false;
      this.noSafeText = true;
      this.playerCardShattered = false;
      this.monsterCardShattered = false;
      this.defaultIntereactives = [document.createElement("br")];
      this.defaultIntereactives.push(
        this.createButton("nextround", i18n.t("battle_func_next_round"), () => {
          self.data.battle.goNext();
        })
      );
      next.data["battleData"] = {
        player: self.data.player,
        monsters: self.data.monsters,
        battle: self.data.battle,
      };
      self.data.battle.onEndBattle(() => {
        this.isBattleEnd = true;
        this.interactiveElements = [];
        const leaveBtn = this.createButton("leavebattle", i18n.t("battle_func_leave"), () => {
          self.data.battle.endBattle();
          this.clearBattleLog();
        });
        this.addInteractiveElement(leaveBtn);
        this.parentScene.render(getUIInstance().gameContainer);
      });
      next.addHook("after", async (self, game) => {
        self.data.to.battleData = self.data.battleData;
        this.updateSelf();
        this.parentScene.render(getUIInstance().gameContainer);
      });
    });
  }
  createButton(
    name,
    content,
    callback,
    isForbid = false,
    extraClass = ""
  ) {
    const t = document.createElement("button");
    t.id = name;
    t.innerHTML = content;
    t.onclick = callback;
    if (isForbid) t.disabled = true;
    if (extraClass) t.classList.add(extraClass);
    return t;
  }
  addBattleLog(logEntry) {
    this.battleLogContainer.addLog(logEntry);
  }
  clearBattleLog() {
    this.battleLogContainer.clearLog();
  }
  updateSelf() {
    if (this.battleData && this.battleData.battle) {
      const player = this.battleData.player;
      const battle = this.battleData.battle;
      const enemies = battle.getAliveEnemies();
      const playerCard = FastComponent.CharacterCard(player);
      const monsterCards = enemies.map((m, idx) =>
       html `<div id="monster-card-container-${idx}" style="flex: 1 1 300px;">${FastComponent.CharacterCard(m)}</div>`
      );
      const template = html`
        <div class="battle-layout">
        <div class="combatants-container" style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center;">
            <div id="player-card-container" style="flex: 1 1 300px;">${playerCard}</div>
            ${monsterCards.map(card => card)}
        </div>
        <div class="battle-log-area battle-log-panel">
            ${this.battleLogContainer}
        </div>
        <div class="battle-tips-area">
            ${!getPlayerInstance().getFlag("FirstFight")
            ? i18n.t("battle_tips_skill_hover") ||
              "Tips: Hover over skills to see their effects!"
            : ""}
        </div>
        </div>
      `;
      const container = document.createElement('div');
      render(template, container);
      this.textContent = container.innerHTML;
      setTimeout(() => {
        if (player.status.hp <= 0 && !this.playerCardShattered) {
          const playerCardElement = document.getElementById("player-card-container");
          if(playerCardElement) Animations.breakElement(playerCardElement);
          this.playerCardShattered = true;
        }
        enemies.forEach((m, idx) => {
          if (m.status.hp <= 0 && !this[`monsterCardShattered${idx}`]) {
            const monsterCardElement = document.getElementById(`monster-card-container-${idx}`);
            if(monsterCardElement) Animations.breakElement(monsterCardElement);
            this[`monsterCardShattered${idx}`] = true;
          }
        });
      }, 0);
      if (!battle.isBattleEnd) {
        this.interactiveElements = [];
        const skillButtons = [];
        for (const skill of player.skills) {
          let buttonText = skill.skillName;
          let isCooling = skill.isCoolingDown;
          let extraClass = "";
          if (isCooling) {
            buttonText += ` (${
              i18n.f("info_skill_cooling_remain", {
                CoolingDownRoundsRemain: skill.skillCD - skill.CDCounter,
              }) || skill.skillCD - skill.CDCounter + "r"
            })`;
            extraClass = "cooling-down";
          }
          skillButtons.push(
            this.createButton(
              `${skill.id}_skillbutton`,
              buttonText,
              () => {
                if (!isCooling) {
                  const target = enemies[0];
                  if (target) battle.onUseSkill(player, target, skill.id);
                }
              },
              isCooling,
              extraClass
            )
          );
        }
        this.addInteractiveElement(
          ...skillButtons.concat(this.defaultIntereactives)
        );
      }
    }
  }
}
export default BattleScene;