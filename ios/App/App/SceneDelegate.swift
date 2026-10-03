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
            DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) { [weak self] in
                guard let controller = self?.window?.rootViewController as? CAPBridgeViewController,
                      let web = controller.webView else { return }
                web.evaluateJavaScript("localStorage.setItem('sopa-language','\(language)');location.reload()")
            }
        }
        #endif

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
