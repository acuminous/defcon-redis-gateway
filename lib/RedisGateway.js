var EventEmitter = require('events').EventEmitter
var redis = require("redis");
var async = require("async");
var uuid = require('uuid');
var _ = require('lodash');
var json = require('./json');
var format = require('util').format;

module.exports = RedisGateway;

function RedisGateway() {};

RedisGateway.prototype = Object.create(EventEmitter.prototype);

function RedisGateway(config) {

    if (!(this instanceof RedisGateway)) return new RedisGateway(config);

    var publishers = [];
    var self = this;

    this.init = function(next) {
        async.series([
            initPublishers,
            initSubscribers
        ], function(err) {
            return next(err, self);
        });
    };

    function initPublishers(next) { 
        async.each(config.publishers || [], function(config, callback) {
            toRedisClient(config, function(err, client) {
                if (err) return callback(err);
                publishers.push({ client: client, channel: config.channel });
                callback();
            })            
        }, next);
    };

    function initSubscribers(next) {
        async.each(config.subscribers || [], function(config, callback) {
            toRedisClient(config, function(err, client) {
                if (err) return callback(err);
                client.on('pmessage', onMessage);
                _.each(config.patterns, function(pattern) {
                    client.psubscribe(pattern);
                });
                callback();
            })
        }, next);
    };

    function onMessage(pattern, channel, message) {
        json.parse(message, function(err, json) {
            if (err) return self.emit('error', err);
            if (!json.system) return self.emit('error', new Error('A system is required'));
            if (!json.host) return self.emit('error', new Error('A host is required'));            
            if (!json.type) return self.emit('error', new Error('A type is required'));
            self.emit('event', {
                id: json.id || uuid.v1(),
                severity: /^[1-5]$/.test(json.severity) ? json.severity : 1,
                system: json.system,
                group: json.group,
                environment: json.environment,
                host: json.host,
                type: json.type,
                timestamp: json.timestamp || new Date(),
                message: json.message,
                link: json.link,
                format: json.format || 'defcon/v1'
            });
        });
    }

    this.publish = function(event) {
        _.each(publishers, function(publisher) {
            var channel = format('%s/%s/%s/%s', publisher.channel, event.group, event.system, event.type);
            publisher.client.publish(channel, JSON.stringify(event));            
        });
    };

    function toRedisClient(config, next) {
        var client = redis.createClient(config.port, config.host, config.options);
        initRedisClient(client, config, function(err) {
            next(err, client);
        });
    };    

    function initRedisClient(client, config, next) {
        var retries = 10;   
        setTimeout(function() {
            client.select(config.db || 0, function(err) {
                if (err && retries) return retries-- && self.init(next);
                if (err) return next(err);
                client.info(next);            
            });        
        }, 100);
    }
}

RedisGateway.prototype = Object.create(RedisGateway.prototype);
