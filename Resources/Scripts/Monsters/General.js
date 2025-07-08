import { i18n } from "../../Classes/I18n.js";
import { Monster } from "../../Classes/Monster.js";
import { log } from "../../Classes/Utils.js";
import { getUIInstance, getRandom } from "../Shared.js";
export class Slime extends Monster {
  constructor(
    status = {
      maxHp: 32,
      strength: 1,
    },
    name = i18n.t("monster_Slime_name"),
    monsterDrops = null // (player,monster) = > {}
  ) {
    if (!monsterDrops) {
      monsterDrops = (player, monster, battle) => {
        const dropItem = "berry";
        const dropCoin = getRandom().randomInt(4, 25);
        const dropExp = getRandom().randomInt(5, 10);
        player.giveItem(dropItem);
        player.addCoins(dropCoin);
        player.gainExp(dropExp);
        const currentScene = getUIInstance().getCurrentScene();
        const logDrop = (ItemName, ItemCount) => {
          currentScene.battleLogContainer.addLog(
            i18n.f("battle_info_general_drop_info", {
              ItemName,
              ItemCount,
            })
          );
        };
        logDrop(i18n.t(`item_${dropItem}_name`), 1);
        logDrop(i18n.t("info_status_exp"), dropExp);
        logDrop(i18n.t("info_status_coin"), dropCoin);
        currentScene.battleLogContainer.addLog(
          i18n.f("battle_info_win_info_html", { MonsterName: monster.name })
        );
      };
    }
    super(status, name, monsterDrops);
  }
}
