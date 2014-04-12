var redis = require('redis');
var assert = require('chai').assert;
var _ = require('lodash');
var RedisGateway = require('../lib/RedisGateway');

describe('Redis Gateway', function() {

    var client;
    var emitters = [];
    var publisherConfig = { host: 'localhost', port: 6379, channel: 'defcon' };
    var subscriberConfig = { host: 'localhost', port: 6379, patterns: ['defcon/a/*/c'] };

    beforeEach(function() {
        client = redis.createClient(6379, 'localhost');
        emitters = [ client ];
    })

    afterEach(function(done) {
        _.each(emitters, function(emitter) {
            emitter.removeAllListeners();            
        })
        client.unsubscribe(done);
    })

    it('should support zero subscribers', function(done) {
        new RedisGateway({ publishers: [ publisherConfig ] }).init(done);
    })

    it('should support zero publishers', function(done) {
        new RedisGateway({ subscribers: [ subscriberConfig ] }).init(done);
    })    

    it('should publish events to the correct redis topic', function(done) {
        client.on('pmessage', function(pattern, channel, message) {
            var event = JSON.parse(message);
            assert.equal(event.group, 'a');
            assert.equal(event.system, 'b');
            assert.equal(event.type, 'c');
            done();
        });
        client.psubscribe('defcon/a/*/c');

        new RedisGateway({ publishers: [ publisherConfig ] }).init(function(err, gateway) {
            gateway.publish({ group: 'a', system: 'b', type: 'c', host: 'foo' });
        });
    })

    it('should subscribe to events from the correct redis topic', function(done) {
        new RedisGateway({ subscribers: [ subscriberConfig ] }).init(function(err, gateway) {
            gateway.on('event', function(event) {
                assert.equal(event.group, 'a');
                assert.equal(event.system, 'b');
                assert.equal(event.type, 'c');
                done();                
            });
            emitters.push(gateway);
            client.publish('defcon/a/b/c', JSON.stringify({ group: 'a', system: 'b', type: 'c', host: 'foo' }));
        });
    })    

    it('should ignore events from other redis topics', function(done) {
        new RedisGateway({ subscribers: [ subscriberConfig ] }).init(function(err, gateway) {
            gateway.on('event', function() {
                assert.fail();
            });
            emitters.push(gateway);
            client.publish('defcon/a/b/x', JSON.stringify({ group: 'a', system: 'b', type: 'c', host: 'foo' }));
            setTimeout(function() {
                done();
            }, 200);
        });
    })


    it('should subscribe to multiple patterns', function(done) {
        var multiplePatternsConfig = _.chain(subscriberConfig).clone().extend({ patterns: [ 'defcon/a/*/c', 'defcon/*' ]}).value();
        var count = 0;
        new RedisGateway({ subscribers: [ multiplePatternsConfig ] }).init(function(err, gateway) {
            gateway.on('event', function(event) {
                if (++count == 2) done();                
            });
            emitters.push(gateway);           
            client.publish('defcon/a/b/c', JSON.stringify({ group: 'a', system: 'b', type: 'c', host: 'foo' }));
        });
    })    
})