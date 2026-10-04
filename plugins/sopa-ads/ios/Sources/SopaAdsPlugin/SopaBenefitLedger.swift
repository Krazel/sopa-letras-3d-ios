import Foundation

struct SopaRewardReceipt: Codable { let id: String; let context: String }
private struct SopaBenefits: Codable {
    var receipts: [SopaRewardReceipt] = []
    var hints: [String: Set<String>] = [:]
}

// Quota debit and recoverable letter receipt share one atomic native write.
enum SopaBenefitLedger {
    #if DEBUG
    static var testURL: URL?
    #endif
    private static var url: URL {
        #if DEBUG
        if let testURL { return testURL }
        #endif
        return FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("sopa-ad-rewards.json")
    }
    private static func read() throws -> SopaBenefits {
        guard FileManager.default.fileExists(atPath: url.path) else { return SopaBenefits() }
        let data = try Data(contentsOf: url)
        if let legacy = try? JSONDecoder().decode([SopaRewardReceipt].self, from: data) {
            return SopaBenefits(receipts: legacy)
        }
        return try JSONDecoder().decode(SopaBenefits.self, from: data)
    }
    private static func write(_ value: SopaBenefits) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try JSONEncoder().encode(value).write(to: url, options: .atomic)
    }
    static func receipts() throws -> [SopaRewardReceipt] { try read().receipts }
    static func setReceipts(_ receipts: [SopaRewardReceipt]) throws {
        var data = try read(); data.receipts = receipts; try write(data)
    }
    static func used(_ period: String) throws -> Int { try read().hints[period]?.count ?? 0 }
    static func claim(_ receipt: SopaRewardReceipt, period: String, limit: Int) throws -> Bool {
        var data = try read()
        guard !period.isEmpty, data.receipts.isEmpty else { return false }
        var ids = data.hints[period] ?? []
        guard !ids.contains(receipt.id), ids.count < limit else { return false }
        ids.insert(receipt.id); data.hints[period] = ids; data.receipts = [receipt]
        try write(data); return true
    }
}
