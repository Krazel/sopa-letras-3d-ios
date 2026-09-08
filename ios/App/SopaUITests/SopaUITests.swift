import XCTest

final class SopaUITests: XCTestCase {
    func testOfflineMinimalGameAndGestures() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 30))
        // WKWebView exposes aria-pressed letter buttons as Switch on iOS.
        let letters = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", ", columna "))
        XCTAssertTrue(letters.firstMatch.waitForExistence(timeout: 60), "Bundled game must render: \(app.debugDescription)")
        let objective = app.staticTexts["Une letras vecinas y encuentra las 6 palabras."]
        XCTAssertTrue(objective.exists, "The short objective must appear above the board")
        XCTAssertLessThan(objective.frame.maxY, letters.firstMatch.frame.minY)
        for word in ["LUNA", "NUBE", "AIRE", "SOL", "MAR", "RIO"] {
            XCTAssertTrue(app.staticTexts[word].exists, "The target word must be visible: \(word)")
        }
        for control in ["Entrar", "Salir", "Acercar", "Alejar", "Restaurar vista inicial", "Girar a la derecha", "Elegir", "Girar"] {
            XCTAssertFalse(app.buttons[control].exists, "Obsolete controls must be removed")
        }
        let highlight = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@ AND value IN {'0', '1'}", "Resaltar letras vecinas")).firstMatch
        XCTAssertTrue(highlight.exists)
        XCTAssertEqual(highlight.value as? String, "0", "Neighbor highlighting starts off")
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
        let highlighted = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", ", vecina resaltada"))
        XCTAssertEqual(highlighted.count, 0)
        highlight.tap()
        XCTAssertEqual(highlight.value as? String, "1")
        XCTAssertGreaterThan(highlighted.count, 0)
        XCTAssertEqual(selected.count, 1, "The option must preserve the current path")
        let hints = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        hints.name = "Sopa3D-neighbor-highlight-on"
        hints.lifetime = .keepAlways
        add(hints)
        highlight.tap()
        XCTAssertEqual(highlighted.count, 0)
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
    }
}
