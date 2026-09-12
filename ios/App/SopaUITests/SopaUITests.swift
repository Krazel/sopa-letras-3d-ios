import XCTest
import UIKit

final class SopaUITests: XCTestCase {
    func orient(_ app: XCUIApplication, _ orientation: UIDeviceOrientation) {
        XCUIDevice.shared.orientation = orientation
        let landscape = orientation.isLandscape
        let settled = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            let bounds = app.frame
            return landscape ? bounds.width > bounds.height : bounds.height > bounds.width
        }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [settled], timeout: 10), .completed)
        // UIKit rotates before WebKit publishes its new accessibility hit points.
        RunLoop.current.run(until: Date().addingTimeInterval(2))
    }
    func capture(_ name: String) {
        // WebKit accessibility updates before the simulator presents its pixels.
        // Allow its compositor to finish theme/rotation and large-cube redraws.
        RunLoop.current.run(until: Date().addingTimeInterval(5))
        let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        image.name = name
        image.lifetime = .keepAlways
        add(image)
    }

    func chooseSoup(_ app: XCUIApplication, _ value: String) {
        let menu = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Sopa")).firstMatch
        XCTAssertTrue(menu.exists, app.debugDescription)
        menu.tap()
        let wheel = app.pickerWheels.firstMatch
        if wheel.waitForExistence(timeout: 3) {
            wheel.adjust(toPickerWheelValue: value)
            let done = app.buttons.matching(NSPredicate(format: "label IN {'Done', 'OK', 'Listo', 'Aceptar'}")).firstMatch
            if done.exists { done.tap() }
            else { app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Une letras vecinas")).firstMatch.tap() }
        } else {
            let option = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", value)).firstMatch
            XCTAssertTrue(option.waitForExistence(timeout: 5), app.debugDescription)
            option.tap()
        }
    }
    func testOfflineMinimalGameAndGestures() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 30))
        let startLevel = app.buttons["Jugar nivel 1"]
        // A cold hosted simulator can finish its first WebKit load after 70s.
        // This is a CI readiness bound, not a device startup performance target.
        XCTAssertTrue(startLevel.waitForExistence(timeout: 120), app.debugDescription)
        capture("Sopa3D-level-map")
        XCTAssertLessThan(startLevel.frame.maxY, app.frame.height - 30, "Continue fits above the iPhone bottom safe area without scrolling")
        XCTAssertFalse(app.buttons["Bloqueado nivel 2: Agua"].isEnabled)
        startLevel.tap()
        XCTAssertTrue(app.staticTexts["Une letras vecinas y encuentra las 4 palabras."].waitForExistence(timeout: 10))
        capture("Sopa3D-level-one")
        app.buttons["Volver al menú"].tap()
        app.buttons["Crear una sopa"].tap()
        let customName = app.textFields["Nombre de la sopa"]
        XCTAssertTrue(customName.waitForExistence(timeout: 5), app.debugDescription)
        customName.tap()
        customName.typeText("Mi prueba")
        let customWords = app.textViews["Palabras"]
        XCTAssertTrue(customWords.exists, app.debugDescription)
        customWords.tap()
        customWords.typeText("SOL, LUNA, MAR")
        // The book is taller than the old menu. Close the real iOS keyboard
        // before scrolling to the submit button; swiping over its keys does
        // not scroll the creator and is not a game failure.
        let keyboardDone = app.buttons.matching(NSPredicate(format: "label IN {'Done', 'OK', 'Listo', 'Aceptar'}")).firstMatch
        XCTAssertTrue(keyboardDone.waitForExistence(timeout: 5), app.debugDescription)
        keyboardDone.tap()
        let create = app.buttons["Crear y jugar"]
        for _ in 0..<5 { if create.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(create.isHittable, app.debugDescription)
        create.tap()
        XCTAssertTrue(app.staticTexts["Une letras vecinas y encuentra las 3 palabras."].waitForExistence(timeout: 10))
        capture("Sopa3D-custom-created")
        XCTAssertGreaterThan(app.staticTexts["Une letras vecinas y encuentra las 3 palabras."].frame.minY, 30, "Opening from the scrolled creator respects the iPhone top safe area")
        app.buttons["Volver al menú"].tap()
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["Crear una sopa"].waitForExistence(timeout: 30))
        app.buttons["Crear una sopa"].tap()
        let savedCustom = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Mi prueba")).firstMatch
        for _ in 0..<5 { if savedCustom.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(savedCustom.isHittable, app.debugDescription)
        capture("Sopa3D-custom-saved")
        savedCustom.tap()
        XCTAssertTrue(app.staticTexts["Une letras vecinas y encuentra las 3 palabras."].waitForExistence(timeout: 10))
        app.buttons["Volver al menú"].tap()
        for _ in 0..<5 { if app.buttons["Juego libre"].isHittable { break }; app.swipeDown() }
        app.buttons["Juego libre"].tap()
        // WKWebView exposes aria-pressed letter buttons as Switch on iOS.
        let letters = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", ", columna "))
        let rendered = letters.firstMatch.waitForExistence(timeout: 60)
        if !rendered { capture("Sopa3D-startup-failure") }
        XCTAssertTrue(rendered, "Bundled game must render: \(app.debugDescription)")
        let objective = app.staticTexts["Une letras vecinas y encuentra las 6 palabras."]
        XCTAssertTrue(objective.waitForExistence(timeout: 60), "The short objective must appear above the board: \(app.debugDescription)")
        capture("Sopa3D-initial-accessibility")
        XCTAssertLessThan(objective.frame.maxY, letters.firstMatch.frame.minY)
        for word in ["LUNA", "NUBE", "AIRE", "SOL", "MAR", "RIO"] {
            XCTAssertTrue(app.staticTexts[word].exists, "The target word must be visible: \(word)")
        }
        for control in ["Entrar", "Salir", "Acercar", "Alejar", "Restaurar vista inicial", "Girar a la derecha", "Elegir", "Girar"] {
            XCTAssertFalse(app.buttons[control].exists, "Obsolete controls must be removed")
        }
        XCTAssertFalse(app.staticTexts["Resaltar letras vecinas"].exists)
        app.buttons["Cambiar a tema oscuro"].tap()
        let light = app.buttons["Cambiar a tema claro"]
        XCTAssertTrue(light.waitForExistence(timeout: 5))
        let launch = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        launch.name = "Sopa3D-help-launch"
        launch.lifetime = .keepAlways
        add(launch)
        let first = try XCTUnwrap(letters.allElementsBoundByIndex.first(where: { $0.isHittable }))
        let beforeDrag = first.frame
        let from = first.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        from.press(forDuration: 0.1, thenDragTo: from.withOffset(CGVector(dx: 65, dy: 20)))
        XCTAssertTrue(!first.exists || first.frame != beforeDrag, "Dragging must move the cube")
        let selected = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", ", seleccionada"))
        XCTAssertEqual(selected.count, 0, "Dragging must not select a letter")
        let next = try XCTUnwrap(letters.allElementsBoundByIndex.first(where: { $0.isHittable }))
        next.tap()
        XCTAssertTrue(selected.firstMatch.waitForExistence(timeout: 5))
        XCTAssertEqual(selected.count, 1, "Tapping selects one letter")
        let second = next.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        second.press(forDuration: 0.1, thenDragTo: second.withOffset(CGVector(dx: -45, dy: 10)))
        XCTAssertEqual(selected.count, 1, "Rotation preserves the selection")
        let zoomReference = try XCTUnwrap(letters.allElementsBoundByIndex.first(where: { $0.isHittable }))
        let beforeZoom = zoomReference.frame
        app.webViews.firstMatch.pinch(withScale: 1.15, velocity: 0.5)
        XCTAssertTrue(!zoomReference.exists || zoomReference.frame != beforeZoom, "Pinching must move the viewpoint")
        XCTAssertEqual(selected.count, 1, "Pinching must not select another letter")
        let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        screenshot.name = "Sopa3D-translucent-connections"
        screenshot.lifetime = .keepAlways
        add(screenshot)
        light.tap()
        XCTAssertTrue(app.buttons["Cambiar a tema oscuro"].exists)
        XCTAssertEqual(selected.count, 1, "The option must preserve the current path")
        let hints = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        hints.name = "Sopa3D-light-4"
        hints.lifetime = .keepAlways
        add(hints)
        let beforeCollapse = letters.firstMatch.frame
        app.buttons["Ocultar controles"].tap()
        XCTAssertTrue(app.buttons["Mostrar controles"].waitForExistence(timeout: 5))
        XCTAssertFalse(objective.exists)
        XCTAssertEqual(selected.count, 1, "Collapsing controls preserves selection")
        XCTAssertNotEqual(letters.firstMatch.frame, beforeCollapse, "The board uses the freed height")
        capture("Sopa3D-controls-hidden-4")
        app.buttons["Mostrar controles"].tap()
        XCTAssertTrue(objective.waitForExistence(timeout: 5))
        // A fixed cell can overlap other letters after free rotation. Choose
        // a non-neighbor whose center is visibly exposed, then touch that
        // physical point without XCTest's automatic accessibility scrolling.
        func position(_ label: String) -> [Int] {
            let regex = try! NSRegularExpression(pattern: "columna ([0-9]+), fila ([0-9]+), capa ([0-9]+)")
            let text = label as NSString
            guard let match = regex.firstMatch(in: label, range: NSRange(location: 0, length: text.length)) else { return [] }
            return (1...3).map { Int(text.substring(with: match.range(at: $0)))! }
        }
        let selectedPosition = position(selected.firstMatch.label)
        XCTAssertEqual(selectedPosition.count, 3)
        let targets = letters.allElementsBoundByIndex.map { (element: $0, frame: $0.frame, label: $0.label) }
        let exposed = targets.first { target in
            let p = position(target.label)
            guard p.count == 3, zip(p, selectedPosition).contains(where: { pair in abs(pair.0 - pair.1) > 1 }) else { return false }
            let center = CGPoint(x: target.frame.midX, y: target.frame.midY)
            return center.y > objective.frame.maxY + 60 && center.y < app.frame.height - 150 &&
                !targets.contains(where: { $0.label != target.label && $0.frame.contains(center) }) && target.element.isHittable
        }
        let invalid = try XCTUnwrap(exposed?.element, "An exposed non-neighbor must be available")
        let invalidPoint = invalid.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        invalidPoint.tap()
        let cleared = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in selected.count == 0 }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [cleared], timeout: 5), .completed, "Tapping an exposed non-neighbor clears selection")
        capture("Sopa3D-invalid-cleared")
        invalidPoint.tap()
        XCTAssertEqual(selected.count, 1, "A subsequent tap starts a fresh path")
        orient(app, .landscapeLeft)
        defer { XCUIDevice.shared.orientation = .portrait }
        XCTAssertTrue(objective.isHittable, "Instructions remain visible in landscape")
        for word in ["LUNA", "NUBE", "AIRE", "SOL", "MAR", "RIO"] {
            XCTAssertTrue(app.staticTexts[word].isHittable, "Words fit in landscape: \(word)")
        }
        let landscape = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        landscape.name = "Sopa3D-help-landscape"
        landscape.lifetime = .keepAlways
        add(landscape)
        orient(app, .portrait)
        chooseSoup(app, "3×3×3 · Cielo")
        XCTAssertTrue(app.staticTexts["Une letras vecinas y encuentra las 4 palabras."].waitForExistence(timeout: 5))
        XCTAssertEqual(letters.count, 27)
        capture("Sopa3D-light-3")
        chooseSoup(app, "5×5×5 · Bosque")
        XCTAssertTrue(app.staticTexts["ARBOL"].waitForExistence(timeout: 5))
        XCTAssertEqual(letters.count, 125)
        capture("Sopa3D-light-5")
        chooseSoup(app, "6×6×6 · Universo")
        XCTAssertTrue(app.staticTexts["GALAXIA"].waitForExistence(timeout: 5))
        XCTAssertEqual(letters.count, 216)
        capture("Sopa3D-light-6")
        app.buttons["Cambiar a tema oscuro"].tap()
        capture("Sopa3D-dark-6")
        orient(app, .landscapeLeft)
        for word in ["PLANETA", "ESTRELLA", "GALAXIA", "COMETA", "ORBITA", "SATURNO", "METEORO", "COSMOS"] {
            XCTAssertTrue(app.staticTexts[word].isHittable)
        }
        capture("Sopa3D-dark-6-landscape")
        orient(app, .portrait)
        chooseSoup(app, "8×8×8 · Planeta")
        XCTAssertTrue(app.staticTexts["GLACIAR"].waitForExistence(timeout: 5))
        XCTAssertEqual(letters.count, 512)
        capture("Sopa3D-dark-8")
        chooseSoup(app, "10×10×10 · Exploración")
        XCTAssertTrue(app.staticTexts["TELESCOPIO"].waitForExistence(timeout: 5))
        XCTAssertEqual(letters.count, 1000)
        capture("Sopa3D-dark-10")
        let large = try XCTUnwrap(letters.allElementsBoundByIndex.first(where: { $0.isHittable }))
        let largeFrame = large.frame
        let origin = large.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        origin.press(forDuration: 0.1, thenDragTo: origin.withOffset(CGVector(dx: 50, dy: 30)))
        XCTAssertTrue(!large.exists || large.frame != largeFrame)
        XCTAssertEqual(selected.count, 0)
        app.webViews.firstMatch.pinch(withScale: 1.2, velocity: 0.5)
        capture("Sopa3D-dark-10-zoom")
        app.buttons["Cambiar a tema claro"].tap()
        XCTAssertTrue(app.buttons["Cambiar a tema oscuro"].waitForExistence(timeout: 10))
        orient(app, .landscapeLeft)
        for word in ["TELESCOPIO", "ASTRONAUTA", "SATELITE", "LABORATORIO", "MICROSCOPIO", "INVENTO", "ENERGIA", "CIENCIA"] {
            XCTAssertTrue(app.staticTexts[word].isHittable, "Large-cube words remain visible after theme and orientation change")
        }
        capture("Sopa3D-light-10-landscape")
        app.buttons["Ocultar controles"].tap()
        XCTAssertTrue(app.buttons["Mostrar controles"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["TELESCOPIO"].isHittable)
        capture("Sopa3D-controls-hidden-10-landscape")
        app.buttons["Mostrar controles"].tap()
        orient(app, .portrait)
        chooseSoup(app, "Estrella 3D")
        XCTAssertTrue(app.staticTexts["DESTELLO"].waitForExistence(timeout: 5))
        XCTAssertEqual(letters.count, 200)
        capture("Sopa3D-star-light-portrait")
        app.buttons["Cambiar a tema oscuro"].tap()
        let board = app.webViews.firstMatch
        let center = board.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        for offset in [CGVector(dx: 130, dy: 0), CGVector(dx: 0, dy: -150), CGVector(dx: -100, dy: 90), CGVector(dx: 0, dy: -150)] {
            center.press(forDuration: 0.1, thenDragTo: center.withOffset(offset))
        }
        XCTAssertEqual(selected.count, 0, "Free tumbling does not pick letters")
        capture("Sopa3D-star-dark-tumbled")
        orient(app, .landscapeLeft)
        XCTAssertTrue(app.staticTexts["DESTELLO"].isHittable)
        capture("Sopa3D-star-dark-landscape")
        app.buttons["Cambiar a tema claro"].tap()
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["Cambiar a tema oscuro"].waitForExistence(timeout: 30), "Theme persists after relaunch")
        capture("Sopa3D-light-persisted")
        orient(app, .portrait)
        app.buttons["Probar dados"].tap()
        XCTAssertTrue(app.staticTexts["Prueba de dados"].waitForExistence(timeout: 10))
        XCTAssertEqual(letters.count, 64, "Dice occupy the same 4 by 4 by 4 lattice")
        capture("Sopa3D-dice-4")
        let die = try XCTUnwrap(letters.allElementsBoundByIndex.first(where: { $0.isHittable }))
        die.tap()
        XCTAssertTrue(selected.firstMatch.waitForExistence(timeout: 5), app.debugDescription)
        XCTAssertEqual(selected.count, 1)
        let diceCenter = app.webViews.firstMatch.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        diceCenter.press(forDuration: 0.1, thenDragTo: diceCenter.withOffset(CGVector(dx: 90, dy: -80)))
        XCTAssertEqual(selected.count, 1, "Rotating dice preserves the chosen face letter")
        capture("Sopa3D-dice-rotated")
    }
}

