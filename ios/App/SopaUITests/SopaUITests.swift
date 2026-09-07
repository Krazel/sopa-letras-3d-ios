import XCTest

final class SopaUITests: XCTestCase {
    func testOfflineGameAndHologramControls() throws {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 30))
        let enter = app.buttons["Entrar"]
        XCTAssertTrue(enter.waitForExistence(timeout: 30), "Bundled game must render in WKWebView")
        if !enter.isHittable { app.swipeUp() }
        enter.tap()
        XCTAssertTrue(app.buttons["Salir"].waitForExistence(timeout: 5))
        app.buttons["Girar a la derecha"].tap()
        app.buttons["Salir"].tap()
        XCTAssertTrue(enter.waitForExistence(timeout: 5))
        app.buttons["Acercar"].tap()
        app.buttons["Alejar"].tap()
        app.buttons["Restaurar vista inicial"].tap()
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Sopa3D-iPhone-original-con-zoom"
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }
}
