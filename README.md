# DEFCON Redis Gateway Plugin

Receives or forwards events via Redis pubsub

## Prerequisits
1. [DEFCON](http://github.com/acuminous/defcon)
1. [redis](http://redis.io)

## Installation
1. '''cd $DEFCON_INSTALL_DIR'''
2. '''npm install defcon-redis-gateway'''
3. '''Enable and configure 'defcon-redis-gateway' in your DEFCON configuration file, e.g.
'''json
{
    "plugins": {
        "installed": [
            "defcon-redis-gateway"
        ],
        "defcon-redis-gateway": {
            "subscribers": [
                { 
                    "host": "localhost",
                    "port": 6379,
                    "db": 0,
                    "patterns": ["defcon/www/*/error", "defcon/www/*/release"],
                    "options": {
                        "enable_offline_queue": false
                    }
                }
            ],
            "publishers": [
                {
                    "host": "remotehost",
                    "port": 6379,
                    "db": 0,
                    "channel": "defcon",
                    "options": {
                        "enable_offline_queue": false
                    }
                }
            ]
        }        
    }
}
'''
4. Be careful not to create an infinite loop with your publish and subscribe configuration
5. Restart defcon (you can do this via '''kill -s USRSIG2 <pid>''' if you want zero downtime)
