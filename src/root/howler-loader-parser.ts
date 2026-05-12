import { Howl } from 'howler';
import { ExtensionType, LoaderParserPriority, path } from 'pixi.js';
import type { LoaderParser } from 'pixi.js';


const HowlerLoaderParser: LoaderParser = {
  extension: {
    name: 'Howler Loader Parser',
    priority: LoaderParserPriority.Normal,
    type: ExtensionType.LoadParser,
  },
  id: 'HowlerLoaderParser',
  test(url: string): boolean {
    const ext = path.extname(url);
    return ['.mp3', '.wav', '.ogg', '.mpeg', '.aac'].some(e => ext.includes(e));
  },
  async load(url: string): Promise<Howl> {
    return new Promise((resolve, reject) => {
      const howl = new Howl({
        src: [url],
        onload: () => resolve(howl),
        onloaderror: (_id, message) => reject(message),
      });
    });
  },
  unload(asset: Howl): void {
    asset.unload();
  },
};


export default HowlerLoaderParser;
