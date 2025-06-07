import { Slime as TutorialSlime } from "./TutorialMonsters.js"; // Aliasing to avoid name clash if General.js Slime is ever imported here
// You can import other monsters here, for example:
// import { Wolf } from "./ForestMonsters.js";
// import { GeneralSlime } from "./General.js"; // If you need to distinguish

export const monster_list = {
  "slime": TutorialSlime, // This will be the slime from TutorialMonsters.js
  // "general_slime": GeneralSlime, // Example if you also wanted to register the one from General.js
  // "wolf": Wolf,
};
