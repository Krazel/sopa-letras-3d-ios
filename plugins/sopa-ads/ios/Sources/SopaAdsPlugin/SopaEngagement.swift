import Foundation

enum SopaEngagement {
    #if DEBUG
    static var testDefaults: UserDefaults?
    #endif
    private static var prefs: UserDefaults {
        #if DEBUG
        if let testDefaults { return testDefaults }
        #endif
        return .standard
    }
    private static let prefix = "sopa.engagement."
    static func completion(_ id: String) {
        guard !id.isEmpty, id.utf8.count <= 1000 else { return }
        var ids = prefs.stringArray(forKey: prefix + "completions") ?? []
        // Only the first three distinct soups are needed for eligibility.
        if ids.count < 3 && !ids.contains(id) { ids.append(id); prefs.set(ids, forKey: prefix + "completions") }
    }
    static var eligible: Bool { (prefs.stringArray(forKey: prefix + "completions") ?? []).count >= 3 }
    static var reviewRequested: Bool { prefs.bool(forKey: prefix + "reviewRequested") }
    static func markReview() { prefs.set(true, forKey: prefix + "reviewRequested"); prefs.set(Date().timeIntervalSince1970, forKey: prefix + "reviewAt") }
    static var reminderDue: Bool {
        let now = Date().timeIntervalSince1970
        let key = prefix + "reminderAt"
        if prefs.object(forKey: key) == nil { prefs.set(now, forKey: key); return false }
        return now - prefs.double(forKey: prefix + "reviewAt") >= 86400 && eligible && !prefs.bool(forKey: prefix + "reminderDisabled") && now - prefs.double(forKey: key) >= 14 * 86400
    }
    static func markReminder(disable: Bool) {
        prefs.set(Date().timeIntervalSince1970, forKey: prefix + "reminderAt")
        if disable { prefs.set(true, forKey: prefix + "reminderDisabled") }
    }
}
