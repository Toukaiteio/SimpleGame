// 1、玩家状态与位置
// 2、物品状态
import { getGameInstance, getPlayerInstance } from "../Scripts/Shared.js";
import { i18n } from "./I18n.js";
// import { General_Skills } from "../Scripts/Skills/General.js"; // Not directly used by Save class
// import { SeededRandom } from "./Random.js"; // Not directly used by Save class
// import { log } from "./Utils.js"; // Assuming log might be used for debugging, but not in current Save structure
import { SaveController } from "./SaveController.js";

export class Save {
  static HasSaveRunning = false;
  constructor(player, location, hookList = [], saveName = null, meta = {}) {
    this.player = player; // JSON string of player data
    this.location = location; // string, subscene id
    this.hookList = hookList; // array of hook identifiers
    this.gameSettings = getGameInstance().gameSettings; // object
    this.saveName = saveName || i18n.t("default_save"); // Use provided saveName or default
    // 新增meta信息
    this.meta = Object.assign(
      {
        time: Date.now(),
        characterName: this.gameSettings?.characterName || "",
        mode: this.gameSettings?.mode || "",
        gender: this.gameSettings?.gender,
      },
      meta
    );
  }

  save(slot = 1) {
    const oSaveSlots = SaveController.getSaveSlotsRaw();
    // 存档槽最大6个
    const slotKey = `slot${slot}`;
    oSaveSlots[slotKey] = {
      player: this.player,
      location: this.location,
      hookList: this.hookList,
      saveName: this.saveName,
      gameSettings: this.gameSettings,
      meta: Object.assign({}, this.meta, {
        time: Date.now(),
        characterName: this.gameSettings?.characterName || "",
        mode: this.gameSettings?.mode || "",
        gender: this.gameSettings?.gender,
      }),
    };
    localStorage.setItem("game-local-saves", JSON.stringify(oSaveSlots));
  }

  load() {
    // Ensure that only one save process is running at a time.
    if (!Save.HasSaveRunning) {
      Save.HasSaveRunning = true;
      getPlayerInstance().setPlayerName(this.meta.characterName);
      getPlayerInstance().gender = this.meta.gender;
      getPlayerInstance().gameDiffculty = this.meta.mode;
      // Create a new SaveController instance with this Save object.
      // This will trigger the game loading process within the SaveController constructor.
      SaveController.setInstance(new SaveController(this));
      // log(`Save slot '${this.saveName}' is being loaded.`);
    } else {
      // log(`Attempted to load save '${this.saveName}' while another save operation is already in progress.`);
      // Optionally, queue this load request or notify the user.
    }
  }
}
