import WidgetKit
import SwiftUI

@main
struct ChadDeliveryWidgetBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.2, *) {
            ChadDeliveryLiveActivity()
        }
    }
}
