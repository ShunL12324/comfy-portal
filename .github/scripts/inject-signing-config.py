"""Inject release signing config into expo-generated build.gradle."""
import sys

path = sys.argv[1]
with open(path) as f:
    content = f.read()

release_config = (
    '        release {\n'
    '            storeFile file("comfy-portal-upload.keystore")\n'
    '            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD") ?: ""\n'
    '            keyAlias System.getenv("ANDROID_KEY_ALIAS") ?: ""\n'
    '            keyPassword System.getenv("ANDROID_KEY_PASSWORD") ?: ""\n'
    '        }\n'
)

# Insert release signing config after debug block closes
old_debug_end = "keyPassword 'android'\n        }\n    }"
new_debug_end = "keyPassword 'android'\n        }\n" + release_config + "    }"
content = content.replace(old_debug_end, new_debug_end, 1)

# Replace signingConfig in release buildType only (the one after the comment)
content = content.replace(
    "// see https://reactnative.dev/docs/signed-apk-android.\n"
    "            signingConfig signingConfigs.debug",
    "// see https://reactnative.dev/docs/signed-apk-android.\n"
    "            signingConfig signingConfigs.release",
    1,
)

with open(path, "w") as f:
    f.write(content)

print("Release signing config injected successfully")
