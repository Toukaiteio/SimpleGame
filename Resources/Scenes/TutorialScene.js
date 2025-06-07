import { Scene } from '../Classes/Scene.js';
import { i18n } from '../Classes/I18n.js';
import { getPlayerInstance, getUIInstance, getGameInstance } from '../Scripts/Shared.js';
import { Battle } from '../Classes/Battle.js';
import { monster_list } from '../Scripts/Monsters/Index.js';

export class TutorialScene extends Scene {
  constructor() {
    super('TutorialScene');
    this.player = getPlayerInstance();
    this.ui = getUIInstance();
    this.game = getGameInstance();
    this.messageArea = null;
    this.continueButton = null;
    this.swordEquipped = false;
    this.equipCheckInterval = null;
    this.tutorialState = 'initial'; // initial, sword_given, battle_done
  }

  render(gameContainer) {
    super.render(gameContainer); // Creates this.sceneContainer
    if (!this.messageArea) {
      this.messageArea = document.createElement('div');
      this.messageArea.className = 'tutorial-message-area';
      this.sceneContainer.appendChild(this.messageArea);
    }
  }

  displayMessage(htmlContent) {
    if (this.messageArea) {
      this.messageArea.innerHTML = htmlContent;
    }
  }

  createContinueButton(textKey = 'tutorial_continue', titleKey = 'tutorial_continue_title', onClick) {
    if (!this.continueButton) {
      this.continueButton = this.ui.createButton(
        i18n.t(textKey, 'Continue'),
        onClick,
        titleKey ? i18n.t(titleKey, 'Continue') : undefined
      );
      this.addInteractiveElement(this.continueButton); // So it's managed by Scene's interactive element handling
      this.sceneContainer.appendChild(this.continueButton); // Append to scene
      this.continueButton.style.display = 'none'; // Initially hidden
    } else {
        // If button exists, update its text and click handler
        this.continueButton.textContent = i18n.t(textKey, 'Continue');
        this.continueButton.title = titleKey ? i18n.t(titleKey, 'Continue') : '';
        // IMPORTANT: Need to replace the event listener, not just add a new one.
        const newButton = this.continueButton.cloneNode(true);
        this.continueButton.parentNode.replaceChild(newButton, this.continueButton);
        this.continueButton = newButton;
        this.continueButton.addEventListener('click', onClick);
    }
  }

  onEnter() {
    super.onEnter();
    if (this.tutorialState === 'initial') {
      this.part1_ReceiveSword();
    } else if (this.tutorialState === 'sword_given') {
      // Check if player returns after defeating slime (e.g. page reload or save/load)
      if (this.player.getFlag('slime_defeated_in_tutorial')) {
        this.tutorialState = 'battle_done';
        this.onReturnFromBattle({ victory: true }); // Simulate returning from battle
      } else {
        this.displayMessage(i18n.t('tutorial_equip_guidance_full_msg', "King gives sword. Guidance to equip."));
        this.createContinueButton('tutorial_continue', 'tutorial_continue_title', () => this.part2_SlimeBattle());
        this.checkSwordEquippedLoop();
        if (this.continueButton) this.continueButton.style.display = 'block';
      }
    } else if (this.tutorialState === 'battle_done') {
      this.onReturnFromBattle({ victory: true }); // Or whatever the result was
    }
  }

  part1_ReceiveSword() {
    this.displayMessage(i18n.t('tutorial_king_give_sword', "King gives sword message."));
    this.player.giveItem("sword", 1); // Assumes "sword" item exists and giveItem handles stacking or single instance
    this.tutorialState = 'sword_given';
    this.game.setFlag('tutorialState', this.tutorialState); // Persist state via game flags

    setTimeout(() => {
      this.displayMessage(i18n.t('tutorial_equip_guidance_full_msg', "King gives sword. Guidance to equip."));
      this.createContinueButton('tutorial_continue', 'tutorial_continue_title', () => this.part2_SlimeBattle());
      this.checkSwordEquippedLoop();
    }, 1500);
  }

  checkSwordEquippedLoop() {
    if (this.equipCheckInterval) {
      clearInterval(this.equipCheckInterval);
      this.equipCheckInterval = null;
    }
    if (!this.continueButton) return;

    this.continueButton.style.display = 'block';
    this.continueButton.disabled = true; // Disable until sword is equipped

    this.equipCheckInterval = setInterval(() => {
      const swordItemArray = this.player.inventory["sword"];
      const swordItem = swordItemArray && swordItemArray.length > 0 ? swordItemArray[0] : null;
      let isEquipped = false;
      if (swordItem && this.player.equipment["hand"] === swordItem) {
        isEquipped = true;
      }

      if (isEquipped) {
        this.swordEquipped = true;
        this.displayMessage(i18n.t('tutorial_sword_equipped_success_msg', "Sword equipped success message."));
        if (this.continueButton) this.continueButton.disabled = false;
        clearInterval(this.equipCheckInterval);
        this.equipCheckInterval = null;
      } else {
        this.swordEquipped = false;
        // Optionally, revert message if needed, or keep success message once shown
        // this.displayMessage(i18n.t('tutorial_equip_guidance_full_msg', "King gives sword. Guidance to equip."));
        if (this.continueButton) this.continueButton.disabled = true;
      }
    }, 500);
  }

  part2_SlimeBattle() {
    if (!this.swordEquipped) {
      this.ui.showModal(i18n.t('tutorial_equip_first', "Please equip the sword first!"));
      return;
    }
    this.displayMessage(i18n.t('tutorial_slime_appears', "Slime appears message."));
    if (this.equipCheckInterval) {
      clearInterval(this.equipCheckInterval);
      this.equipCheckInterval = null;
    }
    if (this.continueButton) {
      this.continueButton.style.display = 'none'; // Hide continue button before battle
    }

    // The Battle class constructor in this project seems to handle UI and starting the battle.
    // It also seems to take over the game flow and then return to the calling scene via a callback or by reloading.
    // For this project, Battle likely handles its own UI and scene switching or overlay.
    // We expect the game to return to this scene's onEnter or a specific callback after battle.
    // For now, we assume the Battle class will eventually lead to `player.setFlag('slime_defeated_in_tutorial', true)`
    // and then potentially reload the scene or call back.
    // The `onEnter` logic handles the `slime_defeated_in_tutorial` flag.
    const slimeMonster = new monster_list["slime"](); // Get a new Slime instance
    new Battle(this.player, slimeMonster);
  }

  onReturnFromBattle(battleResult) {
    // This method would be called by the game/battle system if it supports callbacks,
    // or onEnter will handle state if the scene is reloaded.
    this.tutorialState = 'battle_done';
    this.game.setFlag('tutorialState', this.tutorialState);


    if (this.equipCheckInterval) { // Clear any running interval
        clearInterval(this.equipCheckInterval);
        this.equipCheckInterval = null;
    }

    if (this.continueButton) { // Remove old continue button if it exists
        this.continueButton.remove();
        this.continueButton = null;
    }

    if (battleResult && battleResult.victory) {
      this.displayMessage(i18n.t('tutorial_slime_defeated', "Slime defeated message."));
      this.player.setFlag('slime_defeated_in_tutorial', true); // Ensure flag is set
    } else {
      // Handle loss or escape if necessary, for now, generic message
      this.displayMessage(i18n.t('tutorial_battle_ended_generic', "Battle ended."));
    }

    // Create "End Demo" button
    this.createContinueButton('tutorial_end_demo', 'tutorial_end_demo', () => {
        this.displayMessage(i18n.t('tutorial_thanks', "Thanks for playing the demo!"));
        if(this.continueButton) this.continueButton.style.display = 'none';
        // Potentially navigate to another scene like main menu
        // this.ui.loadScene('MainMenuScene'); this.ui.displayScene('MainMenuScene');
    });
    if (this.continueButton) this.continueButton.style.display = 'block';
  }

  onExit() {
    super.onExit();
    if (this.equipCheckInterval) {
      clearInterval(this.equipCheckInterval);
      this.equipCheckInterval = null;
    }
    // Any other cleanup
  }
}
