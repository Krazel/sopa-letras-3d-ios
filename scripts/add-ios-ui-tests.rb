require 'xcodeproj'
# Diagnostic instrumentation belongs only to the simulator QA checkout. The
# signed release job does not run this script and gets the original delegate.
delegate_path = 'ios/App/App/SceneDelegate.swift'
delegate = File.read(delegate_path)
unless delegate.include?('SOPA_STARTUP_DIAGNOSTIC')
  probe = <<~'SWIFT'
        // SOPA_STARTUP_DIAGNOSTIC
        #if DEBUG
        for delay in [5.0, 20.0, 60.0] {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                guard let controller = self?.window?.rootViewController as? CAPBridgeViewController,
                      let web = controller.webView else {
                    NSLog("SOPA_STARTUP_DIAGNOSTIC no web view at %.0f", delay)
                    return
                }
                NSLog("SOPA_STARTUP_DIAGNOSTIC at %.0f loading=%d", delay, web.isLoading)
                web.evaluateJavaScript("JSON.stringify({ready:document.readyState,letters:document.querySelectorAll('.letter').length,controls:document.querySelectorAll('.controls-toggle').length,text:document.body?.innerText.slice(0,500),canvas:document.querySelector('canvas')?.width,resources:performance.getEntriesByType('resource').map(r=>({name:r.name,duration:r.duration}))})") { value, error in
                    NSLog("SOPA_STARTUP_DIAGNOSTIC result %@ error %@", String(describing: value), String(describing: error))
                }
            }
        }
        #endif
  SWIFT
  delegate = delegate.sub('assert(window?.rootViewController is CAPBridgeViewController)', 'assert(window?.rootViewController is CAPBridgeViewController)' + "\n" + probe)
  File.write(delegate_path, delegate)
end
project_path = 'ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(project_path)
app = project.targets.find { |t| t.name == 'App' }
test = project.targets.find { |t| t.name == 'SopaUITests' }
unless test
  test = project.new_target(:ui_test_bundle, 'SopaUITests', :ios, '15.0')
  test.add_dependency(app)
  group = project.main_group.new_group('SopaUITests', 'SopaUITests')
  test.add_file_references([group.new_file('SopaUITests.swift')])
  test.build_configurations.each do |config|
    config.build_settings['GENERATE_INFOPLIST_FILE'] = 'YES'
    config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.krazel.sopaletras3d.uitests'
    config.build_settings['PRODUCT_NAME'] = 'SopaUITests'
    config.build_settings['MACH_O_TYPE'] = 'mh_bundle'
    config.build_settings['SWIFT_VERSION'] = '5.0'
    config.build_settings['TEST_TARGET_NAME'] = 'App'
    config.build_settings['TARGETED_DEVICE_FAMILY'] = '1'
  end
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app)
scheme.add_test_target(test)
scheme.set_launch_target(app)
scheme.save_as(project_path, 'SopaQA', true)
