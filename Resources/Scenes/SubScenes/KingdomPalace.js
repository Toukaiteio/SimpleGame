import { SubScene } from "../../Classes/UI.js";
import { InGameEvent, log } from "../../Classes/Game.js";
import { i18n } from "../../Classes/I18n.js";
import { Battle } from "../../Classes/Battle.js";
import { Monster, Player } from "../../Classes/Player.js";
import { InGameEvents } from "../../Scripts/InGameEvents.js";
import {
  getPlayerInstance,
  setMapInstance,
  getUIInstance,
  getStoryTellerElement,
} from "../../Scripts/Shared.js";
import { Animations } from "../../Classes/UI.js";
class KingdomPalace extends SubScene {
  constructor() {
    super("KingdomPalace");
    this.textContent = i18n.t(this.id);
    this.addInteractiveElement(getStoryTellerElement());
  }

  beforeRendered() {
    getStoryTellerElement().innerHTML = i18n.t("subscene_desc_KingdomPalace");
    getStoryTellerElement().appendChild(document.createElement("hr"));
  }

  onRendered() {
    const writeH = Animations.writeWithHTML;
    if (
      getPlayerInstance().getFlag("has_leaved_palace") &&
      !getPlayerInstance().getFlag("has_saved_the_princess")
    ) {
      writeH(
        getStoryTellerElement(),
        i18n.t("KingdomPalace_hero_come_back_without_the_princess")
      );
      InGameEvents.getInstance().starter_event_trigger("hero_got_kicked_off");
    }
    if (!getPlayerInstance().getFlag("has_leaved_palace")) {
      getPlayerInstance().setFlag("gender_offset", 0);
      InGameEvents.getInstance()
        .starter_event_trigger("story_begin")
        .addHook("before", (self, game) => {
          const player = getPlayerInstance();
          player
            .giveItem("school_uniform_lower_female")
            .addHook("after", async () => {
              player
                .giveItem("school_uniform_upper_female")
                .addHook("after", async () => {
                  player
                    .giveItem("underwear_lower_female")
                    .addHook("after", async () => {
                      player
                        .giveItem("underwear_upper_female")
                        .addHook("after", async () => {
                          player.addCoins(150).addHook("after", async () => {});
                        });
                    });
                });
            });
        });
    }
  }
}
export default KingdomPalace;
