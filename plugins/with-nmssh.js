const { withPodfile } = require('expo/config-plugins');

// Keep the established Objective-C bridge, but link platform-specific XCFramework slices.
module.exports = function withNMSSH(config) {
  return withPodfile(config, (mod) => {
    const anchor = '  use_expo_modules!';
    if (!mod.modResults.contents.includes(anchor)) throw new Error('Unable to locate the Expo modules anchor in Podfile');
    const pods = "  pod 'CSSH', :podspec => '../plugins/CSSH.podspec'\n  pod 'NMSSH', :podspec => '../plugins/NMSSH.podspec.json'";
    mod.modResults.contents = mod.modResults.contents
      .replace(/^\s*pod ['"](?:NMSSH|CSSH)['"].*$/gm, '')
      .replace(anchor, `${anchor}\n${pods}`);
    return mod;
  });
};
