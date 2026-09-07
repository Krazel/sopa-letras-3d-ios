import XCTest

final class SopaUITests: XCTestCase {
    func testOfflineGameAndHologramControls() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 30))
        let enter = app.buttons["Entrar"]
        let loaded = enter.waitForExistence(timeout: 60)
        XCTAssertTrue(loaded, "Bundled game must render in WKWebView: \(app.debugDescription)")
        let launch = XCTAttachment(screenshot: app.screenshot())
        launch.name = "Sopa3D-launch"
        launch.lifetime = .keepAlways
        add(launch)
        if !enter.isHittable { app.swipeUp() }
        enter.tap()
        XCTAssertTrue(app.buttons["Salir"].waitForExistence(timeout: 5))
        app.buttons["Girar a la derecha"].tap()
        app.buttons["Salir"].tap()
        XCTAssertTrue(enter.waitForExistence(timeout: 5))
        app.buttons["Acercar"].tap()
        app.buttons["Alejar"].tap()
        app.buttons["Restaurar vista inicial"].tap()
        let letters = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", ", columna "))
        let first = try XCTUnwrap(letters.allElementsBoundByIndex.first(where: { $0.isHittable }))
        let beforeDrag = first.frame
        let from = first.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        from.press(forDuration: 0.1, thenDragTo: from.withOffset(CGVector(dx: 65, dy: 20)))
        XCTAssertTrue(!first.exists || first.frame != beforeDrag, "Dragging must move the cube")
        XCTAssertFalse(app.buttons["Cancelar selección"].exists, "Dragging a letter must rotate without picking it")
        let next = try XCTUnwrap(letters.allElementsBoundByIndex.first(where: { $0.isHittable }))
        next.tap()
        XCTAssertTrue(app.buttons["Cancelar selección"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["1 letras"].exists, "A tap selects exactly one letter after rotation")
        let selected = try XCTUnwrap(letters.allElementsBoundByIndex.first(where: { $0.isHittable }))
        let second = selected.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        second.press(forDuration: 0.1, thenDragTo: second.withOffset(CGVector(dx: -45, dy: 10)))
        XCTAssertTrue(app.staticTexts["1 letras"].exists, "Rotation preserves the existing selection")
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Sopa3D-iPhone-original-con-zoom"
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }
}
