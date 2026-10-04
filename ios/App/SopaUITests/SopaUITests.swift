import XCTest
import UIKit
final class SopaUITests: XCTestCase {
 func shot(_ name: String) { RunLoop.current.run(until: Date().addingTimeInterval(2)); let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); a.name = name; a.lifetime = .keepAlways; add(a) }
 func testCleanGameplayScreenshots() throws { try captureScreenshots(landscape: false) }
 func testLandscapeGameplayScreenshots() throws { try captureScreenshots(landscape: true) }
 private func captureScreenshots(landscape: Bool) throws {
  continueAfterFailure = false
  XCUIDevice.shared.orientation = landscape ? .landscapeLeft : .portrait
  for key in ["01-3a", "02-3b", "03-4", "04-6", "05-home"] {
   let app = XCUIApplication(); app.launchEnvironment["MARKETING_SCENE"] = key
   app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
   app.launch()
   XCUIDevice.shared.orientation = landscape ? .landscapeLeft : .portrait
   XCTAssertTrue(app.buttons[key == "05-home" ? "Play" : "Pause game"].waitForExistence(timeout: 120), app.debugDescription)
   RunLoop.current.run(until: Date().addingTimeInterval(4))
   if key != "05-home" {
    let found = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", ", found"))
    XCTAssertGreaterThan(found.count, 0, "Restored words found in English")
   }
   shot("STORE-EN-\(key)")
   app.terminate()
  }
 }
 func testWordFormationVideo() throws {
  continueAfterFailure = false
  XCUIDevice.shared.orientation = .portrait
  let app=XCUIApplication();app.launchEnvironment["MARKETING_SCENE"]="video"
  app.launchArguments=["-AppleLanguages","(en)","-AppleLocale","en_US"]
  app.launch();XCTAssertTrue(app.buttons["Pause game"].waitForExistence(timeout:120))
  RunLoop.current.run(until:Date().addingTimeInterval(34))
  let found=app.descendants(matching:.any).matching(NSPredicate(format:"label CONTAINS %@",", found"))
  XCTAssertGreaterThanOrEqual(found.count,2,"Two words selected in real native game")
  shot("TRAILER-EN-END")
 }
}
