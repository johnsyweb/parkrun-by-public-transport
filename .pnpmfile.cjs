/* global module */

module.exports = {
  hooks: {
    readPackage(pkg) {
      const minimumReleaseAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      const now = Date.now();

      if (pkg.publishTime && now - new Date(pkg.publishTime).getTime() < minimumReleaseAge) {
        throw new Error(
          `Package ${pkg.name}@${pkg.version} was published too recently and does not meet the minimum release age requirement.`
        );
      }

      return pkg;
    },
  },
};