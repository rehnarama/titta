import { setEngine } from "./app/getEngine";
import { LoadScreen } from "./app/screens/LoadScreen";
import { WhiteboardScreen } from "./app/screens/whiteboard/WhiteboardScreen";
import { theme } from "./app/utils/theme";
import { userSettings } from "./app/utils/userSettings";
import { CreationEngine } from "./engine/engine";

/**
 * Importing these modules will automatically register there plugins with the engine.
 */
import "@pixi/sound";
// import "@esotericsoftware/spine-pixi-v8";

// Create a new creation engine instance
const engine = new CreationEngine();
setEngine(engine);

(async () => {
  // Initialize the creation engine instance
  await engine.init({
    background: theme.background.value,
    resizeOptions: { minWidth: 768, minHeight: 1024, letterbox: false },
    antialias: true,
  });

  // Initialize the user settings
  userSettings.init();

  // Show the load screen
  await engine.navigation.showScreen(LoadScreen);
  // Show the whiteboard screen once the load screen is dismissed
  await engine.navigation.showScreen(WhiteboardScreen);
})();
