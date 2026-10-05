import XCTest
import UIKit
import StoreKitTest

final class SopaUITests: XCTestCase {
    private var storeSession: SKTestSession!

    override func setUpWithError() throws {
        try super.setUpWithError()
        continueAfterFailure = false
        XCUIApplication().terminate()
        let configuration = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Commercial", withExtension: "storekit"))
        storeSession = try SKTestSession(contentsOf: configuration)
        storeSession.resetToDefaultState()
        storeSession.clearTransactions()
        storeSession.disableDialogs = true
        // Storefront and locale come from Commercial.storekit. Reassigning them
        // during a running UI-test session can fail with SKInternalError 10.
    }

    override func tearDownWithError() throws {
        // XCTest still invokes teardown when a fatal assertion aborts a test;
        // a Swift defer in that test does not reliably provide this isolation.
        XCUIApplication().terminate()
        storeSession?.clearTransactions()
        storeSession = nil
        try super.tearDownWithError()
    }

    func testCommercialSubscriptionWithStoreKit() throws {
        let session = try XCTUnwrap(storeSession)
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(es)", "-AppleLocale", "es_ES"]
        app.launch()
        XCTAssertTrue(app.buttons["Abrir ajustes"].waitForExistence(timeout: 120), app.debugDescription)
        app.buttons["Abrir ajustes"].tap()
        let plans = app.descendants(matching: .any).matching(identifier: "Suscribirse para quitar anuncios").firstMatch
        for _ in 0..<5 {
            if plans.exists && plans.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(plans.waitForExistence(timeout: 15), app.debugDescription)
        plans.tap()
        let price = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "2,99")).firstMatch
        XCTAssertTrue(price.waitForExistence(timeout: 45), app.debugDescription)
        if !price.isHittable { app.swipeUp() }
        for amount in ["2,99", "5,00", "10,00", "15,00", "30,00", "49,99"] {
            let plan = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", amount)).firstMatch
            for _ in 0..<6 {
                if plan.exists && plan.isHittable { break }
                app.swipeUp()
            }
            XCTAssertTrue(plan.exists && plan.isHittable, app.debugDescription)
        }
        for _ in 0..<6 {
            if price.isHittable { break }
            app.swipeDown()
        }
        price.tap()
        let active = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "10 de 10")).firstMatch
        // Hosted simulator StoreKit transactions can take longer than catalog
        // queries. Still require the real purchase callback and visible quota.
        XCTAssertTrue(active.waitForExistence(timeout: 120), app.debugDescription)
        XCTAssertEqual(session.allTransactions().count, 1)
        try session.expireSubscription(productIdentifier: "com.krazel.sopaletras3d.support.monthly.299")
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["Jugar"].waitForExistence(timeout: 60))
    }
    func testAppIconInNativeLauncher() {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(es)", "-AppleLocale", "es_ES"]
        app.launch()
        XCTAssertTrue(app.buttons["Jugar"].waitForExistence(timeout: 120), app.debugDescription)
        app.terminate()
        XCUIDevice.shared.orientation = .portrait
        XCUIDevice.shared.press(.home)
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let homeScreen = springboard.otherElements["Home screen icons"]
        XCTAssertTrue(homeScreen.waitForExistence(timeout: 30), springboard.debugDescription)
        let icon = springboard.icons.matching(NSPredicate(format: "label CONTAINS[cd] %@", "Sopa de letras")).firstMatch
        for _ in 0..<5 {
            if icon.exists && icon.isHittable { break }
            // Drag the home-screen surface below widgets; a whole-application
            // swipe traverses widget providers and can time out on hosted iPhone.
            let start = homeScreen.coordinate(withNormalizedOffset: CGVector(dx: 0.85, dy: 0.65))
            let end = homeScreen.coordinate(withNormalizedOffset: CGVector(dx: 0.15, dy: 0.65))
            start.press(forDuration: 0.1, thenDragTo: end)
        }
        XCTAssertTrue(icon.waitForExistence(timeout: 10), springboard.debugDescription)
        XCTAssertTrue(icon.isHittable, "The installed game icon must be visible in the native launcher")
        guard icon.exists && icon.isHittable else { return }
        let screen = XCTAttachment(screenshot: springboard.screenshot())
        screen.name = "Sopa3D-selected-icon-native-launcher"
        screen.lifetime = .keepAlways
        add(screen)
        let image = XCTAttachment(screenshot: icon.screenshot())
        image.name = "Sopa3D-selected-icon-native-detail"
        image.lifetime = .keepAlways
        add(image)
        icon.tap()
        XCTAssertTrue(app.buttons["Jugar"].waitForExistence(timeout: 120), app.debugDescription)
    }

    func capture(_ name: String) {
        RunLoop.current.run(until: Date().addingTimeInterval(2))
        let image = XCTAttachment(screenshot: XCUIApplication().screenshot())
        image.name = name
        image.lifetime = .keepAlways
        add(image)
    }
    func assertPhoneMenuBackgroundReachesBottom(_ app: XCUIApplication) throws {
        guard UIDevice.current.userInterfaceIdiom == .phone else { return }
        let settings = app.buttons["Ajustes"]
        XCTAssertTrue(settings.waitForExistence(timeout: 10))
        XCTAssertTrue(settings.isHittable)
        let window = app.windows.firstMatch.frame
        let cg = try XCTUnwrap(XCUIScreen.main.screenshot().image.cgImage)
        let data = try XCTUnwrap(cg.dataProvider?.data)
        let pixels = try XCTUnwrap(CFDataGetBytePtr(data))
        let bytesPerPixel = cg.bitsPerPixel / 8
        XCTAssertGreaterThanOrEqual(bytesPerPixel, 3)
        let scaleX = CGFloat(cg.width) / window.width
        let scaleY = CGFloat(cg.height) / window.height
        let x = Int(window.width * 0.2 * scaleX)
        let upperY = Int((settings.frame.maxY + 3 - window.minY) * scaleY)
        let lowerY = Int((window.height - 5) * scaleY)
        XCTAssertLessThan(upperY, lowerY, "Navigation controls stay above the gesture area")
        for channel in 0..<3 {
            let upper = Int(pixels[upperY * cg.bytesPerRow + x * bytesPerPixel + channel])
            let lower = Int(pixels[lowerY * cg.bytesPerRow + x * bytesPerPixel + channel])
            XCTAssertLessThanOrEqual(abs(upper - lower), 3, "No different-color strip below navigation")
        }
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
        // Hosted WebKit can expose a ready AX button while its first touch is
        // swallowed during launch. Exercise another real touch only if still home.
        if !levels.waitForExistence(timeout: 3), app.buttons["Jugar"].exists && app.buttons["Jugar"].isHittable {
            app.buttons["Jugar"].coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        }
        XCTAssertTrue(levels.waitForExistence(timeout: 10), app.debugDescription)
        capture("Sopa3D-0.16.4-modes-safe-area")
        try assertPhoneMenuBackgroundReachesBottom(app)
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
        shared.press(forDuration: 1.2)
        for title in ["Copiar", "Seleccionar", "Seleccionar todo", "Copy", "Select", "Select All"] {
            XCTAssertFalse(app.menuItems[title].exists, "Read-only game text has no selection menu")
            XCTAssertFalse(app.buttons[title].exists, "Read-only game text has no text action")
        }
        capture("Sopa3D-0.17.3-help-long-press")
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
    func testCustomCreationBeyondTwentySurvivesRelaunch() {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .portrait
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(es)", "-AppleLocale", "es_ES"]
        app.launch()
        XCTAssertTrue(app.buttons["Partida personalizada"].waitForExistence(timeout: 120))
        let prefix = "QA-" + String(UUID().uuidString.prefix(8)) + "-"
        for index in 1...21 {
            app.buttons["Partida personalizada"].tap()
            let name = app.textFields["Nombre de la sopa"]
            XCTAssertTrue(name.waitForExistence(timeout: 15), app.debugDescription)
            name.tap()
            name.typeText(prefix + String(index))
            let expectedName = prefix + String(index)
            let nameReady = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value == %@", expectedName), object: name)
            let typed = XCTWaiter.wait(for: [nameReady], timeout: 10) == .completed
            if !typed { capture("Sopa3D-0.17.3-name-input-failure-\(index)") }
            XCTAssertTrue(typed, "The first field keeps every typed character: " + String(describing: name.value))
            let words = app.textViews["Palabras"]
            XCTAssertTrue(words.exists, app.debugDescription)
            words.tap()
            words.typeText("SOL")
            // WKWebView's Spanish input accessory has an actual OK button.
            // Dismiss it before scrolling: a full-view swipe can land on the
            // keyboard, which otherwise covers Save on iPhone.
            let keyboardDone = app.toolbars.buttons["OK"].firstMatch
            if keyboardDone.exists && keyboardDone.isHittable {
                keyboardDone.tap()
            }
            let save = app.buttons["Guardar sin jugar"]
            for _ in 0..<8 {
                if save.isHittable { break }
                app.webViews.firstMatch.swipeUp()
            }
            XCTAssertTrue(save.isHittable, app.debugDescription)
            save.tap()
            XCTAssertTrue(app.buttons["Jugar: " + prefix + String(index)].waitForExistence(timeout: 15), app.debugDescription)
            app.buttons["Inicio"].tap()
            XCTAssertTrue(app.buttons["Partida personalizada"].waitForExistence(timeout: 10))
        }
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["Partida personalizada"].waitForExistence(timeout: 120))
        app.buttons["Partida personalizada"].tap()
        let last = app.buttons["Jugar: " + prefix + "21"]
        XCTAssertTrue(last.waitForExistence(timeout: 15), "Creation 21 survives native WKWebView relaunch")
        let saved = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Jugar: " + prefix))
        XCTAssertEqual(saved.count, 21, "Native storage keeps every creation beyond the old limit")
        capture("Sopa3D-0.17-customs-21-reloaded")
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
        // Re-query after the screenshot: WebKit's accessibility frame may lag
        // the landscape->portrait rotation although isHittable is already true.
        app.buttons["Jugar"].coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        let levels = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Niveles")).firstMatch
        if !levels.waitForExistence(timeout: 3), app.buttons["Jugar"].exists && app.buttons["Jugar"].isHittable {
            capture("Sopa3D-portrait-touch-retry")
            app.buttons["Jugar"].coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        }
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
        let hint = app.buttons["Pista"]
        XCTAssertTrue(hint.isHittable)
        hint.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        XCTAssertTrue(app.staticTexts["Un anuncio para revelar la siguiente letra de esta palabra:"].waitForExistence(timeout: 10), app.debugDescription)
        XCTAssertTrue(app.buttons["Ahora no"].exists)
        capture("Sopa3D-0.16-2-hint-explanation")
        app.buttons["Ahora no"].tap()
        XCTAssertTrue(app.buttons["Pausar partida"].exists)
    }

}
