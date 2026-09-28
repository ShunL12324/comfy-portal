Pod::Spec.new do |spec|
  spec.name = 'CSSH'
  spec.version = '1.11.0'
  spec.summary = 'libssh2 and OpenSSL with separate device and simulator slices.'
  spec.homepage = 'https://github.com/DimaRU/Libssh2Prebuild'
  spec.license = { :type => 'BSD-3-Clause' }
  spec.author = { 'DimaRU' => 'https://github.com/DimaRU' }
  spec.source = { :http => 'https://github.com/DimaRU/Libssh2Prebuild/releases/download/1.11.0-OpenSSL-1-1-1w/CSSH-1.11.0-OpenSSL-1-1-1w.xcframework.zip', :sha256 => 'f2a14236019b617019f522001c89ad5db2125e8f350cbcde5ed6e96f50842157' }
  spec.ios.deployment_target = '15.1'
  spec.vendored_frameworks = 'CSSH.xcframework'
  spec.libraries = 'z'
end
