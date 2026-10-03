import XCTest
import UIKit
final class SopaUITests: XCTestCase {
    func dismissTestConsent(_ app: XCUIApplication, control: XCUIElement) {
        if control.exists && control.isHittable { return }
        if let form=app.webViews.allElementsBoundByIndex.first(where:{$0.buttons["Save and close"].exists && $0.buttons["Save and close"].isHittable}) {
            let reject=form.staticTexts["Don't sell or share my data"]
            if reject.exists { reject.tap(); form.buttons["Save and close"].tap() }
        }
    }
    func shot(_ name: String) { RunLoop.current.run(until:Date().addingTimeInterval(1)); let a=XCTAttachment(screenshot:XCUIScreen.main.screenshot());a.name=name;a.lifetime = .keepAlways;add(a) }
    func testStoreAssets() throws {
        continueAfterFailure=false
        XCUIDevice.shared.orientation = UIDevice.current.userInterfaceIdiom == .pad ? .landscapeLeft : .portrait
        let lang=ProcessInfo.processInfo.environment["SOPA_LANGUAGE"] ?? "es"
        let names:[String:[String]]=["es": ["Jugar", "Niveles", "Continuar · Nivel", "Pausar partida", "Volver al menú", "Juego libre", "Abrir ayuda", "Cerrar ayuda"],
"en": ["Play", "Levels", "Continue · Level", "Pause game", "Back to menu", "Free play", "Open help", "Close help"],
"de": ["Spielen", "Level", "Fortsetzen", "Pause", "Zurück", "Freies Spiel", "Spielanleitung", "Schließen"],
"ca": ["Juga", "Nivells", "Continua", "Pausa", "Torna", "Joc lliure", "Com s’hi juga", "Tanca"],
"fr": ["Jouer", "Niveaux", "Continuer", "Pause", "Retour", "Jeu libre", "Comment jouer", "Fermer"],
"it": ["Gioca", "Livelli", "Continua", "Pausa", "Indietro", "Gioco libero", "Come giocare", "Chiudi"],
"pt": ["Jogar", "Níveis", "Continuar", "Pausa", "Voltar", "Jogo livre", "Como jogar", "Fechar"],
"tr": ["Oyna", "Seviyeler", "Devam", "Duraklat", "Geri", "Serbest oyun", "Nasıl oynanır", "Kapat"],
"ar": ["العب", "المستويات", "متابعة", "إيقاف مؤقت", "رجوع", "لعب حر", "طريقة اللعب", "إغلاق"],
"ko": ["시작", "레벨", "계속", "일시 정지", "뒤로", "자유 플레이", "게임 방법", "닫기"],
"ja": ["遊ぶ", "レベル", "続ける", "一時停止", "戻る", "フリープレイ", "遊び方", "閉じる"]]
        let t=names[lang]!
        let app=XCUIApplication()
        app.launchEnvironment["MARKETING_LANGUAGE"]=lang
        app.launchArguments=["-AppleLanguages","(\(lang))","-AppleLocale",lang]
        app.launch()
        RunLoop.current.run(until:Date().addingTimeInterval(9))
        XCTAssertTrue(app.buttons[t[0]].waitForExistence(timeout:120),app.debugDescription)
        shot("STORE-\(lang)-01-home")
        app.buttons[t[0]].tap()
        let levels=app.buttons.matching(NSPredicate(format:"label BEGINSWITH %@",t[1])).firstMatch
        XCTAssertTrue(levels.waitForExistence(timeout:20),app.debugDescription); levels.tap()
        shot("STORE-\(lang)-02-book")
        let start=app.buttons.matching(NSPredicate(format:"label BEGINSWITH %@",t[2])).firstMatch
        XCTAssertTrue(start.waitForExistence(timeout:20),app.debugDescription);start.tap()
        let pause=app.buttons[t[3]]
        XCTAssertTrue(pause.waitForExistence(timeout:60),app.debugDescription)
        RunLoop.current.run(until:Date().addingTimeInterval(3))
        dismissTestConsent(app,control:pause)
        shot("STORE-\(lang)-03-game")
        let window=app.windows.firstMatch
        let from=window.coordinate(withNormalizedOffset:CGVector(dx:0.48,dy:0.54))
        from.press(forDuration:0.1,thenDragTo:from.withOffset(CGVector(dx:90,dy:35)))
        shot("STORE-\(lang)-04-rotate")
        from.press(forDuration:0.1,thenDragTo:from.withOffset(CGVector(dx:-85,dy:-25)))
        shot("STORE-\(lang)-05-depth")
        let help=app.descendants(matching:.any).matching(identifier:t[6]).firstMatch
        if help.exists && help.isHittable {help.tap();shot("STORE-\(lang)-06-help");app.buttons[t[7]].tap()}
        pause.tap()
        let menu=app.buttons[t[4]];XCTAssertTrue(menu.waitForExistence(timeout:15));menu.tap()
        app.buttons[t[0]].tap()
        let free=app.buttons.matching(NSPredicate(format:"label BEGINSWITH %@",t[5])).firstMatch
        XCTAssertTrue(free.waitForExistence(timeout:15));free.tap()
        shot("STORE-\(lang)-07-free")
    }
}
