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
    @discardableResult
    func dismissTestConsent(_ app: XCUIApplication, unobstructedControl: XCUIElement? = nil) -> Bool {
        // UMP also keeps an offscreen WKWebView in its accessibility tree.
        // Only act on an actual onscreen form; querying all buttons can tap
        // the cube using coordinates from that hidden privacy view.
        // UMP can expose a hidden form with a normal onscreen AX frame too.
        // An actually hittable game help control proves the form is not modal.
        let gameHelp = app.descendants(matching: .any).matching(identifier: "Abrir ayuda").firstMatch
        let gameControl = unobstructedControl ?? gameHelp
        if gameControl.exists && gameControl.isHittable { return false }
        let visibleViews = app.webViews.allElementsBoundByIndex.filter {
            // UMP's visible container can have a -1 pt origin on iPhone.
            // Hittability of its actual close button is still mandatory.
            $0.frame.minX >= -1 && $0.frame.minY >= -1 && $0.frame.width > 100
        }
        guard let form = visibleViews.first(where: { $0.buttons["Save and close"].exists && $0.buttons["Save and close"].isHittable }) else { return false }
        let optOut = form.staticTexts["Don't sell or share my data"]
        XCTAssertTrue(optOut.exists, app.debugDescription)
        capture("Sopa3D-0.16-UMP-test-form")
        optOut.tap()
        form.buttons["Save and close"].tap()
        return true
    }
    func testBundledCampaignHelpAndGestures() throws {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .portrait
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(es)", "-AppleLocale", "es_ES"]
        app.launch()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 30))
        XCTAssertTrue(app.buttons["Jugar"].waitForExistence(timeout: 120), app.debugDescription)
        let playReady = NSPredicate(format: "hittable == true")
        expectation(for: playReady, evaluatedWith: app.buttons["Jugar"])
        waitForExpectations(timeout: 30)
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
        let help = app.descendants(matching: .any).matching(identifier: "Abrir ayuda").firstMatch
        XCTAssertTrue(help.waitForExistence(timeout: 30), app.debugDescription)
        let letters = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", ", columna "))
        XCTAssertTrue(letters.firstMatch.waitForExistence(timeout: 60), app.debugDescription)
        capture("Sopa3D-0.16-game")
        help.tap()
        let shared = app.staticTexts["Las palabras pueden compartir casillas, aunque ya estén marcadas. En una misma palabra cada casilla se usa una sola vez."]
        // UMP can arrive after the first help tap. Retry only after dismissing
        // that actual visible consent modal, never bypass the real help check.
        if !shared.waitForExistence(timeout: 3), dismissTestConsent(app, unobstructedControl: shared) {
            help.tap()
        }
        XCTAssertTrue(shared.waitForExistence(timeout: 10), app.debugDescription)
        XCTAssertTrue(app.buttons["Cerrar ayuda"].exists)
        capture("Sopa3D-0.16-help")
        app.buttons["Cerrar ayuda"].tap()
        let selected = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", ", seleccionada"))
        XCTAssertEqual(selected.count, 0, "Fresh board has no selection before the rotation gesture")
        let first = try XCTUnwrap(letters.allElementsBoundByIndex.first(where: { $0.isHittable }))
        let before = first.frame
        let from = first.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        from.press(forDuration: 0.1, thenDragTo: from.withOffset(CGVector(dx: 65, dy: 20)))
        XCTAssertTrue(!first.exists || first.frame != before, "Dragging rotates the actual bundled cube")
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
        // WKWebView exposes this popup as one aggregate accessibility control,
        // without a separate StaticText child for the visible field caption.
        let difficulty = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Dificultad Todas las dificultades")).firstMatch
        XCTAssertTrue(difficulty.waitForExistence(timeout: 10), app.debugDescription)
        dismissTestConsent(app, unobstructedControl: difficulty)
        XCTAssertTrue(difficulty.isHittable)
        capture("Sopa3D-0.16.1-free-filter")
        difficulty.tap()
        let easy = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", "Fácil 3")).firstMatch
        XCTAssertTrue(easy.waitForExistence(timeout: 10), app.debugDescription)
        capture("Sopa3D-0.16.1-visual-difficulty")
        // The asynchronous test UMP form may arrive while taking the screenshot.
        // Dismiss only that visible form, then exercise the real selector.
        dismissTestConsent(app, unobstructedControl: easy)
        XCTAssertTrue(easy.isHittable, app.debugDescription)
        easy.tap()
        let filtered = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Dificultad Fácil")).firstMatch
        // Recover only if an actual late UMP modal intercepted the first tap.
        if !filtered.waitForExistence(timeout: 3), dismissTestConsent(app, unobstructedControl: easy) {
            XCTAssertTrue(easy.isHittable, app.debugDescription)
            easy.tap()
        }
        XCTAssertTrue(filtered.waitForExistence(timeout: 10), app.debugDescription)
        XCTAssertTrue(app.buttons["Cielo"].exists)
        XCTAssertFalse(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Naturaleza")).firstMatch.exists)
        capture("Sopa3D-0.16.1-easy-filter")
        app.terminate()
        app.launch()
        // The previous CI's WebKit log shows its restart document completing
        // after ~72 s on the hosted simulator. Use the same cold-start budget.
        XCTAssertTrue(app.buttons["Jugar"].waitForExistence(timeout: 120), "Bundled game restarts without a development server: " + app.debugDescription)
    }
    func testResponsiveHomeAndTouchFocus() {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(es)", "-AppleLocale", "es_ES"]
        app.launch()
        XCTAssertTrue(app.buttons["Jugar"].waitForExistence(timeout: 120))
        for orientation in [UIDeviceOrientation.portrait, .landscapeLeft] {
            XCUIDevice.shared.orientation = orientation
            let play = app.buttons["Jugar"]
            XCTAssertTrue(play.waitForExistence(timeout: 15))
            XCTAssertTrue(play.isHittable)
            XCTAssertTrue(app.buttons["Abrir ajustes"].isHittable)
            capture("Sopa3D-0.16-2-responsive-\(orientation.rawValue)")
        }
        XCUIDevice.shared.orientation = .portrait
        let restoredPlay = app.buttons["Jugar"]
        // UIKit can finish rotating before WKWebView has laid out its buttons.
        // Wait for a portrait window and an onscreen button before the single tap.
        let portraitReady = NSPredicate { _, _ in
            let window = app.windows.firstMatch.frame
            return window.height > window.width && restoredPlay.isHittable && window.contains(restoredPlay.frame)
        }
        expectation(for: portraitReady, evaluatedWith: app)
        waitForExpectations(timeout: 20)
        capture("Sopa3D-0.16-2-portrait-restored")
        restoredPlay.tap()
        let levels = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Niveles")).firstMatch
        XCTAssertTrue(levels.waitForExistence(timeout: 20), app.debugDescription)
        levels.tap()
        let start = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Continuar · Nivel")).firstMatch
        XCTAssertTrue(start.waitForExistence(timeout: 20), app.debugDescription)
        start.tap()
        dismissTestConsent(app)
        let help = app.descendants(matching: .any).matching(identifier: "Abrir ayuda").firstMatch
        XCTAssertTrue(help.waitForExistence(timeout: 30))
        help.tap()
        XCTAssertTrue(app.buttons["Cerrar ayuda"].waitForExistence(timeout: 10))
        capture("Sopa3D-0.16-2-help-touch")
        app.buttons["Cerrar ayuda"].tap()
        XCTAssertTrue(app.buttons["Pista"].waitForExistence(timeout: 10))
        capture("Sopa3D-0.16-2-after-help-touch")
        app.buttons["Pista"].tap()
        XCTAssertTrue(app.staticTexts["Un anuncio para revelar la siguiente letra de esta palabra:"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["Ahora no"].exists)
        capture("Sopa3D-0.16-2-hint-explanation")
        app.buttons["Ahora no"].tap()
        XCTAssertTrue(app.buttons["Pausar partida"].exists)
    }

}
