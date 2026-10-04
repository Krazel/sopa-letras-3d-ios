import AVFoundation
import Capacitor
import UIKit
import WebKit

@MainActor
private final class SopaTextInteractionHandler: NSObject, WKScriptMessageHandler {
    weak var controller: SopaViewController?
    init(controller: SopaViewController) { self.controller = controller }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, let editing = message.body as? Bool,
              let web = controller?.webView else { return }
        web.configuration.preferences.isTextInteractionEnabled = editing
        #if DEBUG
        NSLog("SOPA_TEXT_INTERACTION editing=%d enabled=%d", editing, web.configuration.preferences.isTextInteractionEnabled)
        #endif
    }
}

// Registered on the existing storyboard controller: never create another WKWebView.
@objc(SopaViewController)
class SopaViewController: CAPBridgeViewController {
    private lazy var textInteractionHandler = SopaTextInteractionHandler(controller: self)
    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let configuration = super.webViewConfiguration(for: instanceConfiguration)
        // Disable WebKit selection/loupe gestures before the first document loads.
        // Restore the native caret/editing tools only while an input is focused.
        configuration.preferences.isTextInteractionEnabled = false
        return configuration
    }
    override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
        // Capacitor replaces its content controller after webViewConfiguration.
        // Install the script on the final controller, before creating the web view.
        configuration.userContentController.add(textInteractionHandler, name: "sopaTextEditing")
        let editingScript = """
        (() => {
          const update = () => {
            const field = document.activeElement;
            const editing = !!(field && field.matches('input,textarea,[contenteditable="true"]'));
            window.webkit.messageHandlers.sopaTextEditing.postMessage(editing);
          };
          document.addEventListener('focusin', update, true);
          document.addEventListener('focusout', () => queueMicrotask(update), true);
          document.addEventListener('DOMContentLoaded', update, {once:true});
        })();
        """
        configuration.userContentController.addUserScript(WKUserScript(source: editingScript, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        return super.webView(with: frame, configuration: configuration)
    }
    override func capacitorDidLoad() {
        webView?.allowsLinkPreview = false
        bridge?.registerPluginInstance(SopaAudioPlugin())
    }
}

@objc(SopaAudioPlugin)
public class SopaAudioPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SopaAudioPlugin"
    public let jsName = "SopaAudio"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playEffect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopEffects", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise)
    ]
    private let cues = ["letter", "undo", "word", "win", "ui", "page"]
    private var effects: [String: [AVAudioPlayer]] = [:]
    private var music: AVAudioPlayer?
    private var track = ""
    private var revision = -1
    private var enabled = false // JS supplies persisted preferences before any playback.
    private var effectsEnabled = true
    private var musicEnabled = true
    private var effectsVolume: Float = 0.55
    private var musicVolume: Float = 0.3
    private var suspended = true
    private var inactive = true
    private var interrupted = false
    private var needsGesture = false
    private var sessionActive = false
    private var lastError = ""
    private var observers: [NSObjectProtocol] = []
    private var available: Bool { enabled && !suspended && !inactive && !interrupted && !needsGesture }

    public override func load() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.inactive = UIApplication.shared.applicationState != .active
            self.observe(UIApplication.willResignActiveNotification) { $0.background() }
            self.observe(UIScene.willDeactivateNotification) { $0.background() }
            self.observe(UIApplication.didBecomeActiveNotification) { $0.foreground() }
            self.observe(UIScene.didActivateNotification) { $0.foreground() }
            self.observers.append(NotificationCenter.default.addObserver(
                forName: AVAudioSession.interruptionNotification, object: nil, queue: .main
            ) { [weak self] note in self?.interruption(note) })
            self.observers.append(NotificationCenter.default.addObserver(
                forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main
            ) { [weak self] note in
                guard let self = self,
                      let raw = note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
                      AVAudioSession.RouteChangeReason(rawValue: raw) == .oldDeviceUnavailable else { return }
                self.needsGesture = true
                self.pauseAll()
                self.deactivate()
            })
            self.observe(AVAudioSession.mediaServicesWereResetNotification) { plugin in
                plugin.sessionActive = false
                plugin.effects.removeAll()
                plugin.music = nil
                // Rebuild on next reconciliation, never retry old effects.
                plugin.reconcile()
            }
        }
    }
    deinit { for observer in observers { NotificationCenter.default.removeObserver(observer) } }
    private func observe(_ name: Notification.Name, action: @escaping (SopaAudioPlugin) -> Void) {
        // NotificationCenter owns the token, so the closure must not own this plugin.
        observers.append(NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) {
            [weak self] _ in guard let self = self else { return }; action(self)
        })
    }
    private func background() { inactive = true; pauseAll(); deactivate() }
    private func foreground() { inactive = false; reconcile() }
    private func interruption(_ note: Notification) {
        guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
        if type == .began {
            interrupted = true; sessionActive = false; pauseAll()
        } else {
            interrupted = false
            let options = AVAudioSession.InterruptionOptions(rawValue:
                note.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0)
            needsGesture = !options.contains(.shouldResume)
            reconcile()
        }
    }
    private func activate() throws {
        guard !sessionActive else { return }
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
        try session.setActive(true)
        sessionActive = true
    }
    private func deactivate() {
        guard sessionActive else { return }
        // An SDK or the system can take ownership even when deactivation fails.
        // Always reapply our category on the next allowed playback.
        defer { sessionActive = false }
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        } catch { lastError = error.localizedDescription }
    }
    private func stopEffectPlayers() {
        for pool in effects.values { for player in pool { player.stop(); player.currentTime = 0 } }
    }
    private func pauseAll() { music?.pause(); stopEffectPlayers() }
    private func asset(_ path: String) throws -> URL {
        guard let root = Bundle.main.resourceURL else { throw AudioError.missingAsset }
        let url = root.appendingPathComponent("public").appendingPathComponent(path)
        guard FileManager.default.fileExists(atPath: url.path) else { throw AudioError.missingAsset }
        return url
    }
    private enum AudioError: Error { case missingAsset, invalidTrack, playbackFailed }
    private func prepareEffects() throws {
        for cue in cues where effects[cue] == nil {
            // Four reusable voices for rapid letters; two for other gestures/rewards.
            // Full pools drop a new cue instead of truncating an audible tail.
            let url = try asset("audio/\(cue).wav")
            var pool: [AVAudioPlayer] = []
            for _ in 0..<(cue == "letter" ? 4 : 2) {
                let player = try AVAudioPlayer(contentsOf: url)
                pool.append(player)
            }
            effects[cue] = pool
        }
    }
    private func reconcile() {
        guard available else { pauseAll(); deactivate(); return }
        for pool in effects.values { for player in pool { player.volume = effectsVolume } }
        if !effectsEnabled || effectsVolume == 0 { stopEffectPlayers() }
        if !track.isEmpty && musicEnabled && musicVolume > 0 {
            do {
                if music == nil {
                    music = try AVAudioPlayer(contentsOf: asset(String(track.dropFirst())))
                    music?.numberOfLoops = -1
                }
                try activate()
                music?.volume = musicVolume
                if music?.isPlaying == false {
                    music?.prepareToPlay()
                    if music?.play() != true { throw AudioError.playbackFailed }
                }
            } catch { lastError = error.localizedDescription }
        } else { music?.pause() }
        if (!musicEnabled || musicVolume == 0 || track.isEmpty) && (!effectsEnabled || effectsVolume == 0) {
            deactivate()
        }
    }
    @objc func configure(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let nextRevision = call.getInt("revision") ?? -1
            guard nextRevision >= self.revision else { call.resolve(); return }
            let nextTrack = call.getString("track") ?? ""
            guard nextTrack.isEmpty || nextTrack.range(of: "^/audio/music/[A-Za-z0-9_-]+\\.(mp3|m4a|wav)$", options: .regularExpression) != nil else {
                call.reject("Invalid bundled music path"); return
            }
            self.revision = nextRevision
            self.enabled = call.getBool("enabled") ?? false
            self.effectsEnabled = call.getBool("effectsEnabled") ?? true
            self.musicEnabled = call.getBool("musicEnabled") ?? true
            self.effectsVolume = self.clamp(call.getDouble("effectsVolume") ?? 0.55)
            self.musicVolume = self.clamp(call.getDouble("musicVolume") ?? 0.3)
            self.suspended = call.getBool("suspended") ?? true
            if nextTrack != self.track { self.music?.stop(); self.music = nil; self.track = nextTrack }
            do { try self.prepareEffects() } catch { self.lastError = error.localizedDescription }
            self.reconcile()
            call.resolve()
        }
    }
    private func clamp(_ value: Double) -> Float { value.isFinite ? Float(min(1, max(0, value))) : 0 }
    @objc func playEffect(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard call.getInt("revision") == self.revision,
                  self.available, self.effectsEnabled, self.effectsVolume > 0,
                  let cue = call.getString("cue"), self.cues.contains(cue) else { call.resolve(); return }
            do {
                try self.prepareEffects()
                if cue == "win" { for player in self.effects["word"] ?? [] { player.stop() } }
                guard let player = self.effects[cue]?.first(where: { !$0.isPlaying }),
                      self.effects.values.flatMap({ $0 }).filter({ $0.isPlaying }).count < 8 else { call.resolve(); return }
                try self.activate()
                player.volume = self.effectsVolume
                player.currentTime = 0
                player.prepareToPlay()
                guard player.play() else { throw AudioError.playbackFailed }
                call.resolve()
            } catch { self.lastError = error.localizedDescription; call.reject("Native effect unavailable") }
        }
    }
    @objc func stopEffects(_ call: CAPPluginCall) {
        DispatchQueue.main.async { self.stopEffectPlayers(); call.resolve() }
    }
    @objc func resume(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            // Explicit gesture can release a route/interruption hold, but never an ad/background gate.
            if !self.interrupted { self.needsGesture = false }
            self.reconcile()
            call.resolve()
        }
    }
    @objc func status(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(["engine": "AVAudioPlayer", "category": AVAudioSession.sharedInstance().category.rawValue,
                          "sessionActive": self.sessionActive, "revision": self.revision,
                          "loadedCues": self.effects.keys.sorted(), "musicPlaying": self.music?.isPlaying ?? false,
                          "musicTime": self.music?.currentTime ?? 0, "track": self.track,
                          "activeEffects": self.effects.values.flatMap({ $0 }).filter({ $0.isPlaying }).count,
                          "suspended": self.suspended, "inactive": self.inactive,
                          "interrupted": self.interrupted, "needsGesture": self.needsGesture, "error": self.lastError])
        }
    }
}
