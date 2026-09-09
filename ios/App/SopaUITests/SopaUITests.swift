import XCTest

final class SopaUITests: XCTestCase {
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
        let invalid = letters.matching(NSPredicate(format: "label CONTAINS %@", ", columna 4, fila 4, capa 4")).firstMatch
        XCTAssertTrue(invalid.isHittable)
        invalid.tap()
        XCTAssertEqual(selected.count, 0, "Tapping a non-neighbor clears the whole selection")
        invalid.tap()
        XCTAssertEqual(selected.count, 1, "A subsequent tap starts a fresh path")
        XCUIDevice.shared.orientation = .landscapeLeft
        defer { XCUIDevice.shared.orientation = .portrait }
        XCTAssertTrue(objective.isHittable, "Instructions remain visible in landscape")
        for word in ["LUNA", "NUBE", "AIRE", "SOL", "MAR", "RIO"] {
            XCTAssertTrue(app.staticTexts[word].isHittable, "Words fit in landscape: \(word)")
        }
        let landscape = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        landscape.name = "Sopa3D-help-landscape"
        landscape.lifetime = .keepAlways
        add(landscape)
        XCUIDevice.shared.orientation = .portrait
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
        XCUIDevice.shared.orientation = .landscapeLeft
        for word in ["PLANETA", "ESTRELLA", "GALAXIA", "COMETA", "ORBITA", "SATURNO", "METEORO", "COSMOS"] {
            XCTAssertTrue(app.staticTexts[word].isHittable)
        }
        capture("Sopa3D-dark-6-landscape")
        XCUIDevice.shared.orientation = .portrait
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
        XCUIDevice.shared.orientation = .landscapeLeft
        for word in ["TELESCOPIO", "ASTRONAUTA", "SATELITE", "LABORATORIO", "MICROSCOPIO", "INVENTO", "ENERGIA", "CIENCIA"] {
            XCTAssertTrue(app.staticTexts[word].isHittable, "Large-cube words remain visible after theme and orientation change")
        }
        capture("Sopa3D-light-10-landscape")
        app.buttons["Ocultar controles"].tap()
        XCTAssertTrue(app.buttons["Mostrar controles"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["TELESCOPIO"].isHittable)
        capture("Sopa3D-controls-hidden-10-landscape")
        app.buttons["Mostrar controles"].tap()
        XCUIDevice.shared.orientation = .portrait
        chooseSoup(app, "Estrella 3D · 213 letras")
        XCTAssertTrue(app.staticTexts["DESTELLO"].waitForExistence(timeout: 5))
        XCTAssertEqual(letters.count, 213)
        capture("Sopa3D-star-light-portrait")
        app.buttons["Cambiar a tema oscuro"].tap()
        let board = app.webViews.firstMatch
        let center = board.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        for offset in [CGVector(dx: 130, dy: 0), CGVector(dx: 0, dy: -150), CGVector(dx: -100, dy: 90), CGVector(dx: 0, dy: -150)] {
            center.press(forDuration: 0.1, thenDragTo: center.withOffset(offset))
        }
        XCTAssertEqual(selected.count, 0, "Free tumbling does not pick letters")
        capture("Sopa3D-star-dark-tumbled")
        XCUIDevice.shared.orientation = .landscapeLeft
        XCTAssertTrue(app.staticTexts["DESTELLO"].isHittable)
        capture("Sopa3D-star-dark-landscape")
        app.buttons["Cambiar a tema claro"].tap()
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["Cambiar a tema oscuro"].waitForExistence(timeout: 30), "Theme persists after relaunch")
        capture("Sopa3D-light-persisted")
    }
}
