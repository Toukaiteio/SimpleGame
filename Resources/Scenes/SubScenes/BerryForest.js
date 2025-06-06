import { Animations, SubScene } from "../../Classes/UI.js";
import { log } from "../../Classes/Game.js";
import { i18n } from "../../Classes/I18n.js";
import { Battle } from "../../Classes/Battle.js";
import { Monster } from "../../Classes/Player.js";
import {
  getPlayerInstance,
  setMapInstance,
  getUIInstance,
  getStoryTellerElement,
  getGameInstance,
} from "../../Scripts/Shared.js";
import { InGameEvents } from "../../Scripts/InGameEvents.js";
class BerryForest extends SubScene {
  constructor() {
    super("BerryForest");
    this.textContent = i18n.t(this.id);
    this.addInteractiveElement(getStoryTellerElement());
    getGameInstance().addGlobalTrigger(
      "moveTo",
      "before",
      async (self, game) => {
        getPlayerInstance().setFlag("just_picked_up_berry", false);
      }
    );
  }
  beforeRendered() {
    const writeH = Animations.writeWithHTML;
    getStoryTellerElement().innerHTML = i18n.t("subscene_desc_BerryForest");
    const pickUp = document.createElement("button");

    if (getPlayerInstance().getFlag("just_picked_up_berry")) {
      pickUp.disabled = true;
      pickUp.innerHTML = i18n.t("pick_up_disabled");
    } else {
      pickUp.innerHTML = i18n.f("pick_up", {
        ItemName: i18n.t("item_berry_name"),
      });
      pickUp.addEventListener("click", () => {
        const game = getGameInstance();
        game.createEvent(
          game.eventWrapper(
            "pickUp",
            {
              item_id: "berry",
              player: getPlayerInstance(),
              num: 3,
            },
            {
              during: async (self, game) => {
                self.data.player.giveItem(self.data.item_id, self.data.num);
                writeH(
                  getStoryTellerElement(),
                  i18n.f("pick_up_info", {
                    ItemName: i18n.t("item_berry_name"),
                    ItemCount: self.data.num,
                  })
                );
                pickUp.disabled = true;
                pickUp.textContent = i18n.t("pick_up_disabled");
                self.data.player.setFlag("just_picked_up_berry", true);
              },
            }
          )
        );
      });
    }
    getStoryTellerElement().appendChild(pickUp);
    getStoryTellerElement().appendChild(document.createElement("hr"));
  }
  onRendered() {
    getStoryTellerElement().appendChild(document.createElement("br"));
    // console.log("DEBUG",getPlayerInstance().getFlag("has_done_all_begin_dialog"),getPlayerInstance().getFlag("back_palace_at_just_begin"));
    if (!getPlayerInstance().getFlag("has_done_all_begin_dialog")) {
      if (!getPlayerInstance().getFlag("back_palace_at_just_begin"))
        InGameEvents.getInstance().starter_event_trigger(
          "hero_do_first_action"
        );
      else
        InGameEvents.getInstance().starter_event_trigger(
          "hero_do_second_action"
        ).addHook("after", async (self, game) => {
          getPlayerInstance().setFlag("has_done_all_begin_dialog",true);
        });
    } else {
      // Do Normal logic
      const nextEvent = InGameEvents.randomChoose(InGameEvents.getInstance().getAvailableEvents())
      const next = InGameEvents.getInstance().trigger(nextEvent);
      next.addHook("after", async (self, game) => {
        InGameEvents.getInstance().trigger_move_out_event();
      });
    }
  }
}
export default BerryForest;
