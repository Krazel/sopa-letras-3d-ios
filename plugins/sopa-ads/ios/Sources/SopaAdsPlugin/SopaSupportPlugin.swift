import Capacitor
import StoreKit
import UIKit

@MainActor
final class SopaSupportStore {
    static let shared = SopaSupportStore()
    nonisolated static let changed = Notification.Name("SopaSupportChanged")
    nonisolated static let ids = ["299", "499", "999", "1499", "2999", "50"].map {
        "com.krazel.sopaletras3d.support.monthly." + $0
    }
    private(set) var ready = false
    private(set) var active = false
    private(set) var activeID = ""
    private var updates: Task<Void, Never>?
    private var expiry: Task<Void, Never>?
    private var foreground: NSObjectProtocol?
    private var refreshGeneration = 0

    private init() {
        updates = Task { [weak self] in
            for await result in Transaction.updates {
                guard let self, case .verified(let transaction) = result,
                      Self.ids.contains(transaction.productID) else { continue }
                await self.refresh()
                await transaction.finish()
            }
        }
        foreground = NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main
        ) { [weak self] _ in Task { @MainActor in await self?.refresh() } }
    }
    var snapshot: [String: Any] {
        ["ready": ready, "active": active, "productID": activeID, "available": true]
    }
    func refresh() async {
        refreshGeneration += 1
        let generation = refreshGeneration
        let wasReady = ready
        ready = false
        var id = ""
        var expires: Date?
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result,
                  Self.ids.contains(transaction.productID), !transaction.isUpgraded,
                  transaction.revocationDate == nil,
                  let end = transaction.expirationDate, end > Date() else { continue }
            if expires == nil || end > expires! { id = transaction.productID; expires = end }
        }
        guard generation == refreshGeneration else { return }
        let changed = !wasReady || activeID != id
        activeID = id; active = !id.isEmpty; ready = true
        expiry?.cancel()
        if let expires {
            expiry = Task { [weak self] in
                do { try await Task.sleep(nanoseconds: UInt64(max(0.1, min(86400, expires.timeIntervalSinceNow + 0.1)) * 1_000_000_000)) }
                catch { return }
                await self?.refresh()
            }
        }
        if changed { NotificationCenter.default.post(name: Self.changed, object: nil) }
    }
}

@objc(SopaSupportPlugin)
public class SopaSupportPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SopaSupportPlugin"
    public let jsName = "SopaSupport"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manage", returnType: CAPPluginReturnPromise)
    ]
    private var observer: NSObjectProtocol?
    private var busy = false
    public override func load() {
        observer = NotificationCenter.default.addObserver(forName: SopaSupportStore.changed, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.notifyListeners("statusChanged", data: SopaSupportStore.shared.snapshot) }
        }
        Task { @MainActor in await SopaSupportStore.shared.refresh() }
    }
    deinit { if let observer { NotificationCenter.default.removeObserver(observer) } }
    @objc func status(_ call: CAPPluginCall) {
        Task { @MainActor in await SopaSupportStore.shared.refresh(); call.resolve(SopaSupportStore.shared.snapshot) }
    }
    @MainActor private func catalog() async throws -> [Product] {
        try await Product.products(for: SopaSupportStore.ids).filter {
            $0.type == .autoRenewable && $0.subscription?.subscriptionPeriod.unit == .month &&
            $0.subscription?.subscriptionPeriod.value == 1
        }.sorted { $0.price < $1.price }
    }
    @objc func products(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                let products = try await catalog()
                call.resolve(["products": products.map {
                    ["id": $0.id, "name": $0.displayName, "price": $0.displayPrice]
                }])
            } catch { call.reject("Products unavailable") }
        }
    }
    @objc func purchase(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard !busy, let id = call.getString("id"), SopaSupportStore.ids.contains(id) else { call.reject("Purchase unavailable"); return }
            busy = true
            defer { busy = false }
            do {
                guard let product = try await catalog().first(where: { $0.id == id }) else { call.reject("Product unavailable"); return }
                switch try await product.purchase() {
                case .success(let verification):
                    guard case .verified(let transaction) = verification,
                          SopaSupportStore.ids.contains(transaction.productID) else { call.reject("Unverified purchase"); return }
                    await SopaSupportStore.shared.refresh()
                    await transaction.finish()
                    call.resolve(["result": "purchased", "status": SopaSupportStore.shared.snapshot])
                case .pending: call.resolve(["result": "pending"])
                case .userCancelled: call.resolve(["result": "cancelled"])
                @unknown default: call.reject("Purchase unavailable")
                }
            } catch { call.reject("Purchase unavailable") }
        }
    }
    @objc func restore(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard !busy else { call.reject("Store busy"); return }; busy = true
            defer { busy = false }
            do { try await AppStore.sync(); await SopaSupportStore.shared.refresh(); call.resolve(SopaSupportStore.shared.snapshot) }
            catch { call.reject("Restore unavailable") }
        }
    }
    @objc func manage(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard !busy, let scene = bridge?.viewController?.view.window?.windowScene else { call.reject("Store unavailable"); return }
            busy = true
            defer { busy = false }
            do { try await AppStore.showManageSubscriptions(in: scene); await SopaSupportStore.shared.refresh(); call.resolve(SopaSupportStore.shared.snapshot) }
            catch { call.reject("Subscription management unavailable") }
        }
    }
}
