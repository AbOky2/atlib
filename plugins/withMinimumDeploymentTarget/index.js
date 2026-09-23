const { withDangerousMod, createRunOncePlugin } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const pkg = require('../../package.json');
const MARKER = '# naakul: raise every pod to the app minimum (Xcode 26+ refuses targets below iOS 15)';

/**
 * Some pods still declare iOS 12.4/13.4 in their podspec (resource bundles of
 * async-storage, for example). Since Xcode 26 that is a hard build error, not a
 * warning. This hook lifts every pod target to the Podfile platform version, in
 * both local and EAS builds — the Podfile is generated, so the fix has to live
 * in a plugin, not in ios/.
 */
const withMinimumDeploymentTarget = (config) =>
    withDangerousMod(config, [
        'ios',
        (config) => {
            const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
            let contents = fs.readFileSync(podfile, 'utf8');
            if (!contents.includes(MARKER)) {
                contents = contents.replace(
                    /post_install do \|installer\|\n/,
                    `post_install do |installer|\n    ${MARKER}\n    minimum = Gem::Version.new(podfile_properties['ios.deploymentTarget'] || '16.4')\n    installer.pods_project.targets.each do |target|\n      target.build_configurations.each do |build|\n        current = build.build_settings['IPHONEOS_DEPLOYMENT_TARGET']\n        build.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = minimum.to_s if current.nil? || Gem::Version.new(current) < minimum\n      end\n    end\n`,
                );
                fs.writeFileSync(podfile, contents);
            }
            return config;
        },
    ]);

module.exports = createRunOncePlugin(withMinimumDeploymentTarget, `${pkg.name}-min-deployment-target`, pkg.version);
