import XCTest
import UIKit

final class SopaUITests: XCTestCase {
    func capture(_ name: String) {
        RunLoop.current.run(until: Date().addingTimeInterval(2))
        let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        image.name = name
        image.lifetime = .keepAlways
        add(image)
    }
    func dismissTestConsent(_ app: XCUIApplication) {
        // Real UMP test-app form on the disposable US-region CI simulator.
        // Choose opt-out, never accept sale/sharing to make automation pass.
        let save = app.buttons["Save and close"]
        if save.waitForExistence(timeout: 20) {
            let optOut = app.staticTexts["Don't sell or share my data"]
            XCTAssertTrue(optOut.exists, app.debugDescription)
            capture("Sopa3D-0.16-UMP-test-form")
            optOut.tap()
            save.tap()
            XCTAssertTrue(app.buttons["Abrir ayuda"].waitForExistence(timeout: 10))
        }
    }
    func testBundledCampaignHelpAndGestures() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(es)", "-AppleLocale", "es_ES"]
        app.launch()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 30))
        XCTAssertTrue(app.buttons["Jugar"].waitForExistence(timeout: 120), app.debugDescription)
        capture("Sopa3D-0.16-home")
        app.buttons["Jugar"].tap()
        let levels = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Niveles")).firstMatch
        XCTAssertTrue(levels.waitForExistence(timeout: 10), app.debugDescription)
        levels.tap()
        XCTAssertTrue(app.staticTexts["Empieza por lo fácil y avanza hacia retos cada vez más difíciles."].waitForExistence(timeout: 10))
        capture("Sopa3D-0.16-levels")
        let start = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Continuar · Nivel")).firstMatch
        XCTAssertTrue(start.waitForExistence(timeout: 10), app.debugDescription)
        start.tap()
        dismissTestConsent(app)
        let help = app.buttons["Abrir ayuda"]
        XCTAssertTrue(help.waitForExistence(timeout: 30), app.debugDescription)
        let letters = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", ", columna "))
        XCTAssertTrue(letters.firstMatch.waitForExistence(timeout: 60), app.debugDescription)
        capture("Sopa3D-0.16-game")
        help.tap()
        let shared = app.staticTexts["Las palabras pueden compartir casillas, aunque ya estén marcadas. En una misma palabra cada casilla se usa una sola vez."]
        XCTAssertTrue(shared.waitForExistence(timeout: 10), app.debugDescription)
        XCTAssertTrue(app.buttons["Cerrar ayuda"].exists)
        capture("Sopa3D-0.16-help")
        app.buttons["Cerrar ayuda"].tap()
        let first = try XCTUnwrap(letters.allElementsBoundByIndex.first(where: { $0.isHittable }))
        let before = first.frame
        let from = first.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        from.press(forDuration: 0.1, thenDragTo: from.withOffset(CGVector(dx: 65, dy: 20)))
        XCTAssertTrue(!first.exists || first.frame != before, "Dragging rotates the actual bundled cube")
        let selected = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", ", seleccionada"))
        XCTAssertEqual(selected.count, 0, "Rotation does not select a letter")
        let next = try XCTUnwrap(letters.allElementsBoundByIndex.first(where: { $0.isHittable }))
        next.tap()
        XCTAssertTrue(selected.firstMatch.waitForExistence(timeout: 5), app.debugDescription)
        app.buttons["Pausar partida"].tap()
        XCTAssertTrue(app.buttons["Volver al menú"].waitForExistence(timeout: 10))
        app.buttons["Volver al menú"].tap()
        app.buttons["Jugar"].tap()
        let free = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Juego libre")).firstMatch
        XCTAssertTrue(free.waitForExistence(timeout: 10))
        free.tap()
        XCTAssertTrue(app.staticTexts["Dificultad"].waitForExistence(timeout: 10))
        capture("Sopa3D-0.16-free-filter")
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["Jugar"].waitForExistence(timeout: 60), "Bundled game restarts without a development server")
    }
}
