/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
    type: 'widget',
    name: 'ChadDeliveryWidget',
    // The `widget` type already links WidgetKit + SwiftUI + ActivityKit by default.
    // The library defaults deploymentTarget to 18.0; Live Activities only need 16.1+
    // (Dynamic Island: iPhone 14 Pro and newer on iOS 16.1+), so lower it.
    deploymentTarget: '16.1',
};
