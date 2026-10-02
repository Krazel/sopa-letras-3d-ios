// swift-tools-version: 5.9
import PackageDescription
let package = Package(
    name: "SopaAds",
    platforms: [.iOS(.v16)],
    products: [.library(name: "SopaAds", targets: ["SopaAdsPlugin"])],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.1"),
        .package(url: "https://github.com/googleads/swift-package-manager-google-mobile-ads.git", exact: "13.11.0"),
        .package(url: "https://github.com/googleads/swift-package-manager-google-user-messaging-platform.git", exact: "3.1.0")
    ],
    targets: [.target(name: "SopaAdsPlugin", dependencies: [
        .product(name: "Capacitor", package: "capacitor-swift-pm"),
        .product(name: "GoogleMobileAds", package: "swift-package-manager-google-mobile-ads"),
        .product(name: "GoogleUserMessagingPlatform", package: "swift-package-manager-google-user-messaging-platform")
    ], path: "ios/Sources/SopaAdsPlugin")]
)
