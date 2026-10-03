import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard scene is UIWindowScene else { return }
        // UISceneStoryboardFile already creates and assigns this window and its
        // Capacitor controller. Replacing it starts a second web view at launch.
        assert(window?.rootViewController is CAPBridgeViewController)
        // Marketing QA only: select a supported language, leaving gameplay unchanged.
        #if DEBUG
        if let language = ProcessInfo.processInfo.environment["MARKETING_LANGUAGE"] {
            selectMarketingLanguage(language, attempt: 0)
        }
        #endif

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    #if DEBUG
    private func selectMarketingLanguage(_ language: String, attempt: Int) {
        guard attempt < 30 else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + (attempt == 0 ? 5.0 : 1.0)) { [weak self] in
            guard let self = self else { return }
            guard let controller = self.window?.rootViewController as? CAPBridgeViewController,
                  let web = controller.webView else {
                self.selectMarketingLanguage(language, attempt: attempt + 1)
                return
            }
            web.evaluateJavaScript("if(document.readyState!=='complete'){throw new Error('capture page still loading')};localStorage.setItem('sopa-language','\(language)');location.reload();true") { [weak self] _, error in
                if error != nil { self?.selectMarketingLanguage(language, attempt: attempt + 1) }
            }
        }
    }
    #endif

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
