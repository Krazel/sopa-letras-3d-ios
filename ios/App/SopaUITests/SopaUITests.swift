import XCTest

final class SopaUITests: XCTestCase {
    func testOfflineMinimalGameAndGestures() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 30))
        let letters = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", ", columna "))
        XCTAssertTrue(letters.firstMatch.waitForExistence(timeout: 60), "Bundled game must render: \(app.debugDescription)")
        for word in ["LUNA", "NUBE", "AIRE", "SOL", "MAR", "RIO"] {
            XCTAssertTrue(app.staticTexts[word].exists, "The target word must be visible: \(word)")
        }
        for control in ["Entrar", "Salir", "Acercar", "Alejar", "Restaurar vista inicial", "Girar a la derecha", "Elegir", "Girar"] {
            XCTAssertFalse(app.buttons[control].exists, "Obsolete controls must be removed")
        }
        let launch = XCTAttachment(screenshot: app.screenshot())
        launch.name = "Sopa3D-minimal-launch"
        launch.lifetime = .keepAlways
        add(launch)
        let first = try XCTUnwrap(letters.allElementsBoundByIndex.first(where: { $0.isHittable }))
        let beforeDrag = first.frame
        let from = first.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        from.press(forDuration: 0.1, thenDragTo: from.withOffset(CGVector(dx: 65, dy: 20)))
        XCTAssertTrue(!first.exists || first.frame != beforeDrag, "Dragging must move the cube")
        let selected = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", ", seleccionada"))
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
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Sopa3D-minimal-selected-connections"
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }
}
