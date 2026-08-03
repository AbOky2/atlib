package expo.modules.mylocalmodule

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MyLocalModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MyLocalModule")
  }
}
