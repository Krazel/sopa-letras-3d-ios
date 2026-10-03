import XCTest
import UIKit
final class SopaUITests: XCTestCase {
    func shot(_ name: String) { RunLoop.current.run(until: Date().addingTimeInterval(2)); let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); a.name = name; a.lifetime = .keepAlways; add(a) }
    func open(_ scene: String) -> XCUIApplication {
        XCUIDevice.shared.orientation = UIDevice.current.userInterfaceIdiom == .pad ? .landscapeLeft : .portrait
        let app = XCUIApplication(); app.launchEnvironment["MARKETING_SCENE"] = scene
        app.launchArguments = ["-AppleLanguages", "(es)", "-AppleLocale", "es_ES"]
        app.launch(); XCTAssertTrue(app.buttons["Pausar partida"].waitForExistence(timeout: 120), app.debugDescription)
        RunLoop.current.run(until: Date().addingTimeInterval(3))
        return app
    }
    func testCleanGameplayScreenshots() throws {
        continueAfterFailure = false
        for size in [3,4,5,6,8,10] {
            let app = open(String(size))
            let found = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", ", encontrada"))
            XCTAssertGreaterThan(found.count, 0, "Actual restored words visible")
            shot("GAMEPLAY-ES-\(size)x\(size)")
            app.terminate()
        }
    }
    func testWordFormationVideo() throws {
        continueAfterFailure = false
        let app = open("video")
        print("MARKETING_VIDEO_START \(Date().timeIntervalSince1970)")
        shot("VIDEO-START")
        RunLoop.current.run(until: Date().addingTimeInterval(12))
        let found = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", ", encontrada"))
        XCTAssertGreaterThan(found.count, 3, "Second word formed through actual letter controls")
        shot("VIDEO-WORD-FORMED")
        let from = app.windows.firstMatch.coordinate(withNormalizedOffset: CGVector(dx: 0.28, dy: 0.5))
        from.press(forDuration: 0.1, thenDragTo: from.withOffset(CGVector(dx: 65, dy: 25)))
        shot("VIDEO-ROTATED")
        RunLoop.current.run(until: Date().addingTimeInterval(1))
        print("MARKETING_VIDEO_END \(Date().timeIntervalSince1970)")
    }
}
