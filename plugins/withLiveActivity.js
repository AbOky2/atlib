/**
 * Expo Config Plugin — Live Activity / Dynamic Island
 *
 * Ajoute une Widget Extension à l'app iOS avec le code Swift AtlibOrderWidget.
 * Activé uniquement lors d'un EAS Build (pas dans Expo Go).
 *
 * Usage dans app.json :
 *   "plugins": ["./plugins/withLiveActivity"]
 */

const {
  withXcodeProject,
  withInfoPlist,
  withEntitlementsPlist,
} = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

const WIDGET_TARGET = 'AtlibWidget'
const BUNDLE_ID = 'com.okimy.atlib.widget'
const SWIFT_SOURCE = path.join(__dirname, '../modules/live-activity/AtlibOrderWidget.swift')

/**
 * Step 1 — Ajouter NSSupportsLiveActivities dans Info.plist de l'app principale
 */
const withLiveActivityPlist = (config) =>
  withInfoPlist(config, (mod) => {
    mod.modResults.NSSupportsLiveActivities = true
    mod.modResults.NSSupportsLiveActivitiesFrequentUpdates = true
    return mod
  })

/**
 * Step 2 — Ajouter l'entitlement com.apple.developer.live-activity
 */
const withLiveActivityEntitlements = (config) =>
  withEntitlementsPlist(config, (mod) => {
    mod.modResults['com.apple.developer.live-activity'] = true
    return mod
  })

/**
 * Step 3 — Créer la Widget Extension target dans le projet Xcode
 */
const withLiveActivityXcode = (config) =>
  withXcodeProject(config, async (mod) => {
    const proj = mod.modResults
    const iosDir = mod.modRequest.platformProjectRoot

    const widgetDir = path.join(iosDir, WIDGET_TARGET)
    if (!fs.existsSync(widgetDir)) {
      fs.mkdirSync(widgetDir, { recursive: true })
    }

    // Copy the Swift source
    const destSwift = path.join(widgetDir, 'AtlibOrderWidget.swift')
    if (!fs.existsSync(destSwift)) {
      fs.copyFileSync(SWIFT_SOURCE, destSwift)
    }

    // Write Info.plist for the widget extension
    const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>AtlibWidget</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>${BUNDLE_ID}</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>XPC!</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>`
    fs.writeFileSync(path.join(widgetDir, 'Info.plist'), infoPlist)

    console.log(`[withLiveActivity] Widget extension files created in ${widgetDir}`)
    return mod
  })

/**
 * Plugin composé final
 */
const withLiveActivity = (config) => {
  config = withLiveActivityPlist(config)
  config = withLiveActivityEntitlements(config)
  config = withLiveActivityXcode(config)
  return config
}

module.exports = withLiveActivity
