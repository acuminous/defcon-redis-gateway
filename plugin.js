var path = require('path');
var _ = require('lodash');
var async = require('async');
var packageJson = require('./package.json');
var RedisGateway = require('./lib/RedisGateway');

module.exports.create = create;

function create(context, next) {

    var defcon = context.defcon;
    var config = context.config;
    var logger = context.logger;
    var plugin = {
        version: packageJson.version,        
        description: packageJson.description,
        repositoryUrl: packageJson.repository.url
    }    

    new RedisGateway(config).init(function(err, gateway) {
        if (err) return next(err);

        gateway.on('event', function(event) {
            defcon.notify('event', event);
        });

        gateway.on('error', function(err) {
            logger.error('RedisGateway error: %s', err.message);
        });

        defcon.on('event', function(event) {
            gateway.publish(event);
        });

        next(null, plugin);
    });
}