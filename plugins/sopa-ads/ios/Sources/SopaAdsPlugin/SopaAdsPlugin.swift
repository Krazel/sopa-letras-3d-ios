import Capacitor
import GoogleMobileAds
import UserMessagingPlatform
import UIKit

/// App-owned ad units, no mediation and no ATT request. UMP gates all loads.
/// JavaScript cannot replace the configured app or unit identifiers.
@objc(SopaAdsPlugin)
public class SopaAdsPlugin: CAPPlugin, CAPBridgedPlugin, FullScreenContentDelegate {
    public let identifier = "SopaAdsPlugin"
    public let jsName = "SopaAds"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "prepare", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "privacyStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showRewarded", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "claimSupportHint", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showInterstitial", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "rewards", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acknowledge", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "privacy", returnType: CAPPluginReturnPromise)
    ]
    private var rewarded: RewardedAd?
    private var interstitial: InterstitialAd?
    private var rewardedAt = Date.distantPast
    private var interstitialAt = Date.distantPast
    private var started = false
    private var subscriberRequestedReward = false
    private var consentBusy = false
    private var loadingReward = false
    private var loadingInterstitial = false
    private var epoch = 0
    private var showing: CAPPluginCall?
    private var showingAd: AnyObject?
    private var rewardID: String?
    private var rewardContext: String?
    private var earned = false
    private var supportObserver: NSObjectProtocol?
    public override func load() {
        supportObserver = NotificationCenter.default.addObserver(forName: SopaSupportStore.changed, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in
                guard let self, SopaSupportStore.shared.active else { return }
                self.epoch += 1; self.rewarded = nil; self.interstitial = nil
                self.subscriberRequestedReward = false
            }
        }
    }
    deinit { if let supportObserver { NotificationCenter.default.removeObserver(supportObserver) } }
    #if DEBUG
    private let rewardUnit = "ca-app-pub-3940256099942544/1712485313"
    private let interstitialUnit = "ca-app-pub-3940256099942544/4411468910"
    #else
    private let rewardUnit = "ca-app-pub-3425091654264901/9485324880"
    private let interstitialUnit = "ca-app-pub-3425091654264901/8630399054"
    #endif
    private let commercialApp = "ca-app-pub-3425091654264901~5737651561"
    private typealias Receipt = SopaRewardReceipt
    private var memoryReceipt: Receipt?
    private func journal() throws -> [Receipt] { try SopaBenefitLedger.receipts() }
    private func writeJournal(_ receipts: [Receipt]) throws { try SopaBenefitLedger.setReceipts(receipts) }
    @MainActor private var permitted: Bool {
        Bundle.main.object(forInfoDictionaryKey: "GADApplicationIdentifier") as? String == commercialApp &&
        ConsentInformation.shared.canRequestAds && SopaSupportStore.shared.ready
    }
    @MainActor private var status: [String: Any] {
        ["available": permitted && started,
         "privacyRequired": ConsentInformation.shared.privacyOptionsRequirementStatus == .required]
    }
    private func pause(_ active: Bool) {
        NotificationCenter.default.post(name: Notification.Name("SopaAdBreak"), object: nil, userInfo: ["active": active])
    }
    private func controller() -> UIViewController? {
        guard UIApplication.shared.applicationState == .active,
              let vc = bridge?.viewController, vc.viewIfLoaded?.window != nil,
              vc.presentedViewController == nil else { return nil }
        return vc
    }
    @objc func prepare(_ call: CAPPluginCall) {
        Task { @MainActor in
            await SopaSupportStore.shared.refresh()
            guard !SopaSupportStore.shared.active || (call.getBool("rewardedOnly") ?? false) else { call.resolve(self.status); return }
            guard !self.consentBusy, self.showing == nil, let vc = self.controller() else { call.resolve(self.status); return }
            self.subscriberRequestedReward = call.getBool("rewardedOnly") ?? false
            self.consentBusy = true
            self.pause(true)
            Task { @MainActor in
                defer { self.consentBusy = false; self.pause(false) }
                do {
                    // Every session refreshes UMP before any SDK initialization.
                    let parameters = RequestParameters()
                    try await ConsentInformation.shared.requestConsentInfoUpdate(with: parameters)
                    try await ConsentForm.loadAndPresentIfRequired(from: vc)
                    try self.writeJournal(self.journal()) // fail closed if rewards cannot be persisted
                    await self.startIfAllowed()
                } catch { /* Offline/config failure: keep the game playable. */ }
                call.resolve(self.status)
            }
        }
    }
    @MainActor private func startIfAllowed() async {
        guard permitted else { return }
        if !started {
            // Non-personalized requests, no publisher first-party identifier,
            // no ATT prompt/IDFA flow. UMP is independent of ATT.
            MobileAds.shared.requestConfiguration.setPublisherFirstPartyIDEnabled(false)
            MobileAds.shared.requestConfiguration.publisherPrivacyPersonalizationState = .disabled
            MobileAds.shared.requestConfiguration.maxAdContentRating = .general
            await MobileAds.shared.start()
            started = true
        }
        preload()
    }
    private func request() -> Request {
        let request = Request()
        let extras = Extras()
        extras.additionalParameters = ["npa": "1"]
        request.register(extras)
        return request
    }
    @MainActor private func preload() {
        guard permitted, started, !consentBusy || showing == nil else { return }
        let generation = epoch
        if (!SopaSupportStore.shared.active || subscriberRequestedReward) && !loadingReward && rewarded == nil {
            loadingReward = true
            Task { @MainActor in
                defer { self.loadingReward = false }
                do {
                    let ad = try await RewardedAd.load(with: self.rewardUnit, request: self.request())
                    guard self.permitted, generation == self.epoch else { return }
                    ad.fullScreenContentDelegate = self
                    self.rewarded = ad
                    self.rewardedAt = Date()
                } catch { /* Retry at the next explicit opportunity. */ }
            }
        }
        if !SopaSupportStore.shared.active && !loadingInterstitial && interstitial == nil {
            loadingInterstitial = true
            Task { @MainActor in
                defer { self.loadingInterstitial = false }
                do {
                    let ad = try await InterstitialAd.load(with: self.interstitialUnit, request: self.request())
                    guard self.permitted, generation == self.epoch else { return }
                    ad.fullScreenContentDelegate = self
                    self.interstitial = ad
                    self.interstitialAt = Date()
                } catch { }
            }
        }
    }
    @objc func showRewarded(_ call: CAPPluginCall) {
        Task { @MainActor in
            await SopaSupportStore.shared.refresh()
            guard self.permitted, !self.consentBusy, self.showing == nil,
                  let vc = self.controller(), let id = call.getString("id"),
                  let context = call.getString("context"), context.utf8.count < 100_000 else {
                call.resolve(["status": "unavailable"]); return
            }
            do {
                guard try self.journal().isEmpty, self.memoryReceipt == nil else { call.resolve(["status": "unavailable"]); return }
                try self.writeJournal([])
            } catch { call.reject("Reward storage unavailable"); return }
            guard let ad = self.rewarded, Date().timeIntervalSince(self.rewardedAt) < 3500 else {
                self.rewarded = nil
                Task { @MainActor in self.preload() }
                call.resolve(["status": "unavailable"]); return
            }
            self.showing = call; self.showingAd = ad; self.rewardID = id; self.rewardContext = context; self.earned = false
            self.pause(true)
            ad.present(from: vc) { [weak self] in
                guard let self, self.showing === call, !self.earned else { return }
                self.earned = true
                let receipt = Receipt(id: id, context: context)
                self.memoryReceipt = receipt
                // Native journal precedes JS result; death/reload after this callback
                // can recover the exact offered letter and acknowledge it later.
                do { try self.writeJournal([receipt]); self.memoryReceipt = nil }
                catch { /* Keep receipt in memory for an immediate retry. */ }
            }
        }
    }
    @objc func showInterstitial(_ call: CAPPluginCall) {
        Task { @MainActor in
            await SopaSupportStore.shared.refresh()
            guard self.permitted, !SopaSupportStore.shared.active, !self.consentBusy, self.showing == nil,
                  let vc = self.controller(),
                  let ad = self.interstitial, Date().timeIntervalSince(self.interstitialAt) < 3500 else {
                if Date().timeIntervalSince(self.interstitialAt) >= 3500 { self.interstitial = nil }
                Task { @MainActor in self.preload() }
                call.resolve(["status": "unavailable"]); return
            }
            self.showing = call; self.showingAd = ad; self.rewardID = nil; self.earned = false
            self.pause(true)
            ad.present(from: vc)
        }
    }
    public func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) { finish(ad, failed: false) }
    public func ad(_ ad: FullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) { finish(ad, failed: true) }
    private func finish(_ ad: FullScreenPresentingAd, failed: Bool) {
        guard let call = showing, showingAd === (ad as AnyObject) else { return }
        let isReward = rewardID != nil
        if isReward { rewarded = nil } else { interstitial = nil }
        let result = earned ? "rewarded" : failed ? "unavailable" : isReward ? "cancelled" : "closed"
        showing = nil; showingAd = nil; rewardID = nil; rewardContext = nil
        pause(false)
        call.resolve(["status": result])
        Task { @MainActor in self.preload() }
    }
    @objc func rewards(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            do {
                if let receipt = self.memoryReceipt { try self.writeJournal([receipt]); self.memoryReceipt = nil }
                call.resolve(["receipts": try self.journal().map { ["id": $0.id, "context": $0.context] }])
            } catch { call.reject("Reward storage unavailable") }
        }
    }
    @objc func claimSupportHint(_ call: CAPPluginCall) {
        Task { @MainActor in
            await SopaSupportStore.shared.refresh()
            guard SopaSupportStore.shared.ready, SopaSupportStore.shared.active, self.showing == nil,
                  let id = call.getString("id"), let context = call.getString("context"),
                  context.utf8.count < 100_000 else { call.resolve(["status": "unavailable"]); return }
            do {
                guard try self.journal().isEmpty, self.memoryReceipt == nil else { call.resolve(["status": "unavailable"]); return }
                let store = SopaSupportStore.shared
                guard try SopaBenefitLedger.claim(Receipt(id:id, context:context), period:store.hintPeriod, limit:SopaSupportStore.hintLimit(store.activeID)) else { call.resolve(["status":"unavailable"]); return }
                self.notifySupportQuota()
                call.resolve(["status": "rewarded"])
            } catch { call.reject("Reward storage unavailable") }
        }
    }
    @MainActor private func notifySupportQuota() {
        NotificationCenter.default.post(name: SopaSupportStore.changed, object: nil)
    }
    @objc func acknowledge(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            do { try self.writeJournal(self.journal().filter { $0.id != call.getString("id") }); call.resolve() }
            catch { call.reject("Reward acknowledgement unavailable") }
        }
    }
    @objc func privacy(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard !self.consentBusy, self.showing == nil, let vc = self.controller(),
                  ConsentInformation.shared.privacyOptionsRequirementStatus == .required else { call.resolve(self.status); return }
            self.consentBusy = true; self.epoch += 1
            self.rewarded = nil; self.interstitial = nil // never reuse inventory loaded before withdrawal
            self.subscriberRequestedReward = false
            self.pause(true)
            Task { @MainActor in
                defer { self.consentBusy = false; self.pause(false) }
                do { try await ConsentForm.presentPrivacyOptionsForm(from: vc); await self.startIfAllowed() }
                catch { /* Current UMP state still governs every request. */ }
                call.resolve(self.status)
            }
        }
    }
    @objc func privacyStatus(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard !self.consentBusy, self.showing == nil else { call.resolve(self.status); return }
            self.consentBusy = true
            defer { self.consentBusy = false }
            do {
                // Refresh the privacy entry even for subscribers, without a form,
                // SDK startup or an ad request. A subscription cannot revoke access.
                try await ConsentInformation.shared.requestConsentInfoUpdate(with: RequestParameters())
            } catch { /* Preserve the previous privacy entry while offline. */ }
            call.resolve(self.status)
        }
    }
}
