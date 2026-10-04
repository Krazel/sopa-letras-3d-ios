import Foundation

@main struct BenefitChecks {
    static func check(_ value: Bool, _ message: String = "Benefit policy check") { precondition(value, message) }
    static func main() throws {
        let suite = "sopa-benefits-tests-" + UUID().uuidString
        let prefs = UserDefaults(suiteName: suite)!
        defer { prefs.removePersistentDomain(forName: suite) }
        SopaEngagement.testDefaults = prefs
        for _ in 0..<4 { SopaEngagement.completion("same") }
        check(!SopaEngagement.eligible, "Replays are not three distinct soups")
        SopaEngagement.completion("second"); SopaEngagement.completion("third")
        check(SopaEngagement.eligible && !SopaEngagement.reviewRequested)
        SopaEngagement.markReview()
        check(SopaEngagement.reviewRequested)
        prefs.set(Date().timeIntervalSince1970 - 86400 - 60, forKey: "sopa.engagement.reviewAt")
        check(!SopaEngagement.reminderDue, "No first-use sales prompt")
        prefs.set(Date().timeIntervalSince1970 - 14*86400 + 60, forKey: "sopa.engagement.reminderAt")
        check(!SopaEngagement.reminderDue, "Fourteen full days required")
        prefs.set(Date().timeIntervalSince1970 - 14*86400 - 60, forKey: "sopa.engagement.reminderAt")
        check(SopaEngagement.reminderDue)
        SopaEngagement.markReminder(disable: false)
        check(!SopaEngagement.reminderDue)
        SopaEngagement.markReminder(disable: true)
        prefs.set(0.0, forKey: "sopa.engagement.reminderAt")
        check(!SopaEngagement.reminderDue, "Opt-out survives future occasions")
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(suite)
        defer { try? FileManager.default.removeItem(at: folder) }
        SopaBenefitLedger.testURL = folder.appendingPathComponent("rewards.json")
        let receipt = SopaRewardReceipt(id:"one", context:"exact-letter")
        check(try SopaBenefitLedger.claim(receipt, period:"paid-month-1", limit:2))
        check(try SopaBenefitLedger.used("paid-month-1") == 1)
        check(try SopaBenefitLedger.receipts().first?.context == "exact-letter")
        check(try !SopaBenefitLedger.claim(receipt, period:"paid-month-1", limit:2), "Pending reward must be recovered first")
        try SopaBenefitLedger.setReceipts([])
        check(try SopaBenefitLedger.used("paid-month-1") == 1, "Acknowledgement preserves monthly debit")
        check(try SopaBenefitLedger.claim(.init(id:"two",context:"next-letter"), period:"paid-month-1",limit:2))
        try SopaBenefitLedger.setReceipts([])
        check(try !SopaBenefitLedger.claim(.init(id:"three",context:"extra"),period:"paid-month-1",limit:2))
        check(try SopaBenefitLedger.claim(.init(id:"renewed",context:"letter"),period:"paid-month-2",limit:2))
        try SopaBenefitLedger.setReceipts([])
        check(try SopaBenefitLedger.used("paid-month-1") == 2)
        check(try SopaBenefitLedger.used("paid-month-2") == 1)
        try Data("broken".utf8).write(to:SopaBenefitLedger.testURL!)
        do { _ = try SopaBenefitLedger.used("paid-month-2"); preconditionFailure("Corruption must fail closed") } catch {}
        print("PASS: review once, distinct soups, fortnightly reminder/opt-out, atomic hint/quota receipt, renewal and corruption")
    }
}
