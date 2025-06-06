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
class BareGround extends SubScene {
  constructor() {
    super("BareGround");
    this.textContent = i18n.t(this.id);
    this.addInteractiveElement(getStoryTellerElement());
  }
  beforeRendered() {
    getStoryTellerElement().innerHTML = i18n.t("subscene_desc_BareGround");
    getStoryTellerElement().appendChild(document.createElement("hr"));
  }
  onRendered() {
    const nextEvent = InGameEvents.randomChoose(InGameEvents.getInstance().getAvailableEvents())
      const next = InGameEvents.getInstance().trigger(nextEvent);
      next.addHook("after", async (self, game) => {
        InGameEvents.getInstance().trigger_move_out_event();
      });
  }
}
export default BareGround;
