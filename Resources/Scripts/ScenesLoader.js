import { log } from '../Classes/Utils.js';
import { subSceneList } from '../Scenes/GameStoryTeller.js';
/**
 * 加载 ./Resources/Scenes/ 目录下的所有场景文件。
 * @returns {Promise<Object>} - 返回一个Promise，解析为包含所有场景的对象，键为场景名称，值为场景模块。
 */
export async function loadScenes() {
    const scenes = {};

    // 场景文件的路径
    const sceneFiles = [
        'GameHomePage.js',
        "GameStoryTeller.js",
        "TutorialScene.js", // Added TutorialScene
        // "GameSaveList.js",
        // 可以在这里添加其他场景文件
    ];
    // 子场景文件的路径
    const subSceneFiles = [
        "BattleScene.js",
        // "ExampleScene.js", // Commented out ExampleScene as per instruction to remove/comment it
    ]
    try {
        // 动态导入每个场景文件
        for (const file of sceneFiles) {
            const sceneModule = await import(`../Scenes/${file}`);
            const sceneName = file.replace('.js', '');
            scenes[sceneName] = sceneModule.default || sceneModule;
            if(sceneName === "GameStoryTeller"){
                for(const subScene of subSceneFiles){
                    const subSceneModule = await import(`../Scenes/SubScenes/${subScene}`);
                    const subSceneName = subScene.replace('.js', '');
                    subSceneList[subSceneName] = subSceneModule.default || subSceneModule;
                }
            }
        }
        log('Scenes loaded successfully.');
    } catch (error) {
        log(`Error loading scenes: ${error.message}`);
        throw error;
    }

    return scenes;
}
