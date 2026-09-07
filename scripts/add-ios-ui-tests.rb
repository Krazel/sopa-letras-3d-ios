require 'xcodeproj'
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
