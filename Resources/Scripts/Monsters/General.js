import { i18n } from "../../Classes/I18n.js";
import { Monster } from "../../Classes/Monster.js";
import { Slime_slime } from "../Items/Index.js";
import { getUIInstance,getRandom } from "../Shared.js";
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
        const dropItem = new Slime_slime();
        const dropCoin = getRandom().randomInt(4, 25);
        const dropExp = getRandom().randomInt(5, 10);
        player.giveItem(dropItem);
        player.addCoins(dropCoin);
        player.gainExp(dropExp);
        getUIInstance().getCurrentScene().battleLogs.push(
          i18n.f("battle_info_win_info_html", { MonsterName: monster.name }),
          i18n.f("battle_info_general_drop_info", {
            ItemName: dropItem.item_name,
            ItemCount: 1,
          }),
          i18n.f("battle_info_general_drop_info", {
            ItemName: i18n.t("info_status_exp"),
            ItemCount: dropExp,
          }),
          i18n.f("battle_info_general_drop_info", {
            ItemName: i18n.t("info_status_coin"),
            ItemCount: dropCoin,
          })
        );
      };
    }
    super(status, name, monsterDrops);
  }
}
