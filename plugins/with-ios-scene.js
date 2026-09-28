const fs = require('node:fs');
const path = require('node:path');
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

// Backport Expo's scene lifecycle until the stable template supports iOS 27.
module.exports = function withIOSScene(config) {
  config = withInfoPlist(config, (mod) => {
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [{
          UISceneConfigurationName: 'Default Configuration',
          UISceneDelegateClassName: 'ComfyPortalSceneDelegate',
        }],
      },
    };
    return mod;
  });
  return withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift') throw new Error('Scene support requires Swift AppDelegate');
    const marker = '// BEGIN COMFY PORTAL SCENE BACKPORT';
    let source = mod.modResults.contents.split(marker)[0].trimEnd();
    const legacy = /#if os\(iOS\) \|\| os\(tvOS\)\s+window = UIWindow\(frame: UIScreen.main.bounds\)[\s\S]*?#endif/;
    if (legacy.test(source)) {
      source = source.replace(legacy, '// The scene delegate creates the window and starts React Native.');
    } else if (!source.includes('// The scene delegate creates the window and starts React Native.')) {
      throw new Error('Expo AppDelegate template changed; review the scene backport before building');
    }
    const scene = fs.readFileSync(path.join(__dirname, 'ComfyPortalSceneDelegate.swift'), 'utf8');
    mod.modResults.contents = `${source}\n\n${marker}\n${scene}`;
    return mod;
  });
};
