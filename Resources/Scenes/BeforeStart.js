import { Scene } from "../Classes/UI.js";
import { getUIInstance } from "../Scripts/Shared.js";
const ui = getUIInstance();
class BeforeStart extends Scene {
    constructor() {
        super("BeforeStart");
        const BeforeStartCover = document.createElement("div");
        BeforeStartCover.classList.add("BeforeStartCover");
        BeforeStartCover.innerHTML = `
            <div class="BeforeStartTitle"> Click to Start </div>
        `
        BeforeStartCover.onclick = () => {
            BeforeStartCover.classList.add("fadeOut");
            setTimeout(()=>{
                ui.displayScene("GameHomePage");
            },1000);
        };
        this.addComponent("Cover", BeforeStartCover);
    }
}
export default BeforeStart;