import { Game } from "../Classes/Game.js";
import { log } from "../Classes/Utils.js";
import { Animations } from "../Classes/Animations.js";
import { UI } from "../Classes/UI.js";
import { Player } from "../Classes/Player.js";
import { loadScenes } from "./ScenesLoader.js";
import {
  setGameInstance,
  setUIInstance,
  setPlayerInstance,
} from "./Shared.js";
import { subSceneList } from "../Scenes/GameStoryTeller.js";
import { i18n } from "../Classes/I18n.js";
// 获取游戏容器的DOM元素
const gameContainer = document.getElementById("GameView");

// 创建Game和UI的实例
const game = new Game();
const ui = new UI(gameContainer);

// 初始化i18n
i18n.loadLanguage("cn").then(() => {
  // 设置共享实例
  setGameInstance(game);
  setUIInstance(ui);
  const player = new Player();
  setPlayerInstance(player);
  window.debugFunctions = {
    game,
    ui,
    player,
    i18n,
  };
  log("Class of 'Game' and 'UI' initialized.");

  game.addGlobalTrigger("renderScene", "after", async (self, game) => {
    if (self.data.container) {
      Animations.clearAllTooltips();
      const nodeList = [
        ...self.data.container.querySelectorAll("span[hasDescription]"),
      ];
      if (nodeList.length > 0) {
        for (const node of nodeList) {
          if (!node.hasTooltip) {
            const title = node.textContent;
            const description = node.getAttribute("data-description")
              ? node.getAttribute("data-description")
              : i18n.th(node.getAttribute("data-description-at"));
            Animations.attachHoverDescription(node, title, description);
          }
        }
      }
    }
  });

  // 加载所有场景
  loadScenes().then((scenes) => {
    // 将场景存储在UI中
    for (const [sceneId, sceneClass] of Object.entries(scenes)) {
      const sceneInstance = new sceneClass();
      ui.loadScene(sceneId, sceneInstance);
    }
    for (const i in subSceneList) {
      ui.getScene("GameStoryTeller").subScenes[i] = new subSceneList[i]();
    }
    // 显示游戏主页场景
    // ui.displayScene("GameHomePage");
    ui.displayScene("TutorialScene"); // Set TutorialScene as the starting scene
  });
});
