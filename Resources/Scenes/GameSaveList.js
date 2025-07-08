import { Scene } from "../Classes/Scene.js";
import { Save } from "../Classes/Save.js";
import { SaveController } from "../Classes/SaveController.js";
import { getUIInstance,getPlayerInstance,BEGIN_SCENE } from "../Scripts/Shared.js";
import { i18n } from "../Classes/I18n.js";
import { Animations } from "../Classes/Animations.js";
class GameSaveList extends Scene {
    constructor() {
        super("GameSaveList");
        this.saveSlots = SaveController.getSaveSlots();
        this.renderSaveSlots();
        this.createComponent("backHome", "button", {
            text: i18n.t("backHome"),
            onClick: () => {
                const ui = getUIInstance();
                ui.displayScene("GameHomePage");
            },
        });
    }

    renderSaveSlots() {
        const container = document.createElement("div");
        container.className = "save-slot-grid";
        for (let i = 1; i <= 6; i++) {
            const slot = this.saveSlots[`slot${i}`];
            const card = document.createElement("div");
            card.className = "save-slot-card";
            if (i === 1) {
                card.classList.add("quick-save");
            }
            let title = i === 1 ? i18n.t("quick_save") || "快速存档" : `${i18n.t("save_slot") || "存档栏"} ${i}`;
            if (slot) {
                const characterName = slot.meta.characterName
                    ? slot.meta.characterName
                    : slot.meta.gender === 1
                        ? i18n.t("default_character_full_name")
                        : i18n.t("default_character_full_name_female");
                card.innerHTML = `
          <div class="save-slot-title">${title}</div>
          <div class="save-slot-meta">
            <div>${i18n.t("save_time") || "时间"}: ${new Date(slot.meta.time).toLocaleString()}</div>
            <div>${i18n.t("character_name") || "主角"}: ${characterName}</div>
            <div>${i18n.t("mode") || "模式"}: ${slot.meta.mode || "-"}</div>
          </div>
          <button class="save-slot-load">${i18n.t("load") || "读取"}</button>
          <button class="save-slot-overwrite">${i18n.t("overwrite") || "覆盖"}</button>
        `;
                card.querySelector(".save-slot-load").onclick = () => slot.load();
                card.querySelector(".save-slot-overwrite").onclick = async () => {
                    await SaveController.updateSave();
                    SaveController.saveToSlot(SaveController.instance.runningSave, i);
                    Animations.displayMessage("success", i18n.t("save_success") || "存档成功");
                    window.location.reload();
                };
            } else {
                card.innerHTML = `
          <div class="save-slot-title">${title}</div>
          <div class="save-slot-meta empty">${i18n.t("empty_slot") || "空"}</div>
          <button class="save-slot-new">${i18n.t("new_save") || "新建存档"}</button>
        `;
                card.querySelector(".save-slot-new").onclick = async () => {
                    getPlayerInstance()
                        .getSelfJson(true)
                        .addHook("after", (self) => {
                            const tempSave = new Save(self.data.result, BEGIN_SCENE);
                            tempSave.load();
                            SaveController.saveToSlot(SaveController.instance.runningSave, i);
                            Animations.displayMessage("success", i18n.t("save_success") || "存档成功");
                            window.location.reload();
                        });

                };
            }
            container.appendChild(card);
        }
        this.addComponent("save_slot_grid", container);
    }
}

export default GameSaveList;