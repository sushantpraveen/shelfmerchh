require('dotenv').config();
const express = require('express');
const router = require('./routes/auth');

function printRoutes(path, layer) {
  if (layer.route) {
    layer.route.stack.forEach(printRoutes.bind(null, path + layer.route.path));
  } else if (layer.name === 'router' && layer.handle.stack) {
    layer.handle.stack.forEach(printRoutes.bind(null, path + (layer.regexp.source === '^\\/?$' ? '' : layer.regexp.source)));
  } else if (layer.method) {
    console.log(`${layer.method.toUpperCase()} ${path}`);
  }
}

try {
  router.stack.forEach(printRoutes.bind(null, ''));
} catch (e) {
  console.log('Error printing routes, but printer might have partially succeeded');
}
