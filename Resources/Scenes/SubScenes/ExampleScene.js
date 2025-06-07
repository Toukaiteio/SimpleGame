import { SubScene } from '../../Classes/SubScene.js';
import { i18n } from '../../Classes/I18n.js';
import { getPlayerInstance, getStoryTellerElement, getGameInstance } from '../../Scripts/Shared.js';
import { InGameEvent } from '../../Classes/InGameEvent.js';

class ExampleScene extends SubScene {
  constructor() {
    super('ExampleScene'); // Unique ID for this sub-scene

    // --- Text Content ---
    // This is the main descriptive text for the scene.
    // You can use i18n.t() for internationalization.
    this.textContent = i18n.t('subscene_desc_ExampleScene');

    // --- Interactive Elements ---
    // Interactive elements are usually added in onRendered or dynamically based on game state.
    // Here, we'll add a static text display area.
    // The getStoryTellerElement() is a common place to display narrative text and choices.
    this.addInteractiveElement(getStoryTellerElement());
  }

  // --- Scene Lifecycle Methods ---

  /**
   * beforeRendered: Called before the scene's content is drawn.
   * Use this to prepare dynamic content that depends on the game state
   * but doesn't involve creating interactive choices yet.
   */
  beforeRendered() {
    // Clear previous content from the story teller element
    getStoryTellerElement().innerHTML = '';

    // Example: Displaying initial scene text.
    // This could also be directly in textContent if it's static.
    const initialText = document.createElement('p');
    initialText.innerHTML = i18n.t('example_scene_initial_text');
    getStoryTellerElement().appendChild(initialText);

    getStoryTellerElement().appendChild(document.createElement('hr'));
  }

  /**
   * onRendered: Called after the scene's main structure is in place.
   * This is a good place to add interactive elements like buttons or choices,
   * as the base elements they attach to will exist.
   */
  onRendered() {
    const game = getGameInstance();
    const player = getPlayerInstance();

    // Example: Creating an InGameEvent for choices
    // InGameEvent is used to present options to the player.
    const choices = {
      'example_scene_choice_1_text': () => {
        // Action for choice 1
        const feedbackText = document.createElement('p');
        feedbackText.innerHTML = i18n.t('example_scene_choice_1_feedback');
        getStoryTellerElement().appendChild(feedbackText);
        // You could trigger another event, move to another scene, etc.
        // player.moveTo('#AnotherScene');
      },
      'example_scene_choice_2_text': () => {
        // Action for choice 2
        const feedbackText = document.createElement('p');
        feedbackText.innerHTML = i18n.t('example_scene_choice_2_feedback');
        getStoryTellerElement().appendChild(feedbackText);
      }
    };

    // The InGameEvent requires a 'Writer' function.
    // This function is responsible for how the event's text and options are presented.
    // For simple cases, it might just return the i18n translated string.
    const writer = (key) => {
      // 'name' and 'content' are special keys used by InGameEvent.
      // Others are the keys from your 'choices' object.
      if (key === 'name') return i18n.t('example_scene_event_name');
      if (key === 'content') return i18n.t('example_scene_event_content');
      return i18n.t(key); // For choice texts
    };

    const event = new InGameEvent(
      'ExampleSceneChoice', // Event type
      choices,             // Options object
      writer               // Writer function
    );

    game.createEvent(event).addHook('after', async () => {
      // After the player makes a choice and the choice's callback is executed,
      // you might want to add a button to proceed or move to another scene.
      const continueButton = document.createElement('button');
      continueButton.innerHTML = i18n.t('example_scene_continue_button');
      continueButton.onclick = () => {
        // Example: Move to another part of the story or a different scene
        // player.moveTo('#SomeOtherScene');
        // For this example, we'll just clear the button.
        continueButton.remove();
        // Potentially clear other feedback text as well or set up a new event.
        this.beforeRendered(); // Reset to initial state for demo
        this.onRendered(); // Present choices again for demo
      };
      getStoryTellerElement().appendChild(continueButton);
    });
  }

  /**
   * updateSelf: Called when the scene needs to refresh its content.
   * This is often triggered by external changes or if the scene itself
   * determines it needs an update.
   */
  updateSelf() {
    // Add any logic needed to update the scene's state or visuals.
    // For this example, it's simple, but complex scenes might re-evaluate
    // conditions or fetch new data here.
    super.updateSelf(); // Calls the base class method
  }
}

// Export the class to make it available for the ScenesLoader
export default ExampleScene;
