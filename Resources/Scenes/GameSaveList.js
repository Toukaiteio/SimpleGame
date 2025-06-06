import { Scene } from "../Classes/UI.js";
import { Save, SaveController } from "../Classes/Save.js";
import { getUIInstance } from "../Scripts/Shared.js";
import { i18n } from "../Classes/I18n.js";
class GameSaveList extends Scene {
  constructor() {
    super("GameSaveList");
    this.saveSlots = SaveController.getSaveSlots();
    for(const i in this.saveSlots){
        this.createComponent(i, "button", {
            text: i18n.t(i),
            onClick: ()=>{
                this.saveSlots[i].load();
            },
        });
    }
    this.createComponent("backHome", "button", {
        text: i18n.t("backHome"),
        onClick: ()=>{
            const ui = getUIInstance();
            ui.displayScene("GameHomePage");
        },
    });
}

}

export default GameSaveList;