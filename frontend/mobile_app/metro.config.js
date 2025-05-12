// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// 1. Make sure Metro can find all required files
config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx'];
config.resolver.assetExts = ['png', 'jpg', 'jpeg', 'gif', 'svg'];

// 2. Set up proper module resolution
config.resolver.disableHierarchicalLookup = true;

// 3. Make sure Metro resolves modules correctly
config.resolver.extraNodeModules = new Proxy({}, {
  get: (target, name) => {
    return path.join(projectRoot, 'node_modules', name);
  }
});

module.exports = config;