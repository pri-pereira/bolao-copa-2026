/** @type {import('next').NextConfig} */
const withSerwist = require("@serwist/next").default({
  swSrc: "app/sw.js",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: false,
});

const nextConfig = {};
module.exports = withSerwist(nextConfig);
