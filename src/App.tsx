import { useEffect, useState } from "react";
import { Application, useApplication } from '@pixi/react';
import * as WebFont from "webfontloader";
import Game from "./root/game.ts";
// import ReactOverlay from "./ReactOverlay";
import { G_Fonts } from "./root/constants.ts";
import styles from './styles.module.scss';


const App = () => {
  const [fontsLoaded, setFontsLoaded] = useState<boolean>(false);

  useEffect(() => {
    WebFont.load({
      custom: {
        families: [G_Fonts.AstroSpace, G_Fonts.Gradzy],
      },
      active: () => {
        setFontsLoaded(true);
      },
      inactive: () => {
        console.error('Font loading failed');
      },
    });
  }, []);

  return (
    <div className={styles.main}>
      {/* Pixi Canvas */}
      <div className={styles.pixiCanvasContainer}>
        {fontsLoaded &&
          <Application background={'#10280C'} resizeTo={undefined} width={1672} height={941}>
            <GameInstance />
          </Application>
        }
      </div>
      {/* Regular React UI on top */}
      {/* <ReactOverlay /> */}
    </div>
  );
};


const GameInstance = () => {
  const { app } = useApplication();

  useEffect(() => {
    if (!app) return;

    const game = new Game(app);
    game.init();
    game.run();

    const onResize = () => { game.handleResize(); };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      game.destroy();
    };
  }, [app]);

  return null;
};


export default App;
