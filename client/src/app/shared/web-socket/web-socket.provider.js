/*global angular */

/**
 * @ngdoc service
 * @name TatUi.WebSocketProvider
 * @module TatUi
 * @description
 *
 * Manage the websocket connection
 *
 */
angular.module('TatUi')
  .provider('WebSocket', function(appConfiguration) {
    'use strict';
    // appConfiguration is generated by grunt, using assets/config.json

    var self = this;

    var options = appConfiguration.socket;

    var socket = {
      ws: null,
      status: {},
      events: {}
    };

    var send = function(data) {
      socket.ws.$$send(data);
    };

    var connect = function(identity) {
      if ((isConnected()) && (!socket.status.identitySent)) {
        console.log('websocket', 'sending id info', identity.username);
        send({
          username: identity.username,
          password: identity.password
        });
        socket.status.identitySent = true;
        addEvent('$message', function(data) {
          console.log('websocket $message event ', data);
        });
        send({
          action: 'subscribeMessages',
          topics: ['all']
        });
      }
    };

    var isConnected = function() {
      return ((socket.ws) && (socket.ws.$status() === 1));
    };


    var addEvent = function(eventName, callback) {

      if (!socket.events[eventName]) {
        socket.events[eventName] = [];
        if (isConnected()) {
          attachEvent(eventName);
        }
      }
      socket.events[eventName].push(callback);
      var id = socket.events[eventName].length - 1;
      return function() {
        if (socket.events.length > id) {
          socket.events[eventName].splice(id, 1);
        }
      };
    };

    var attachEvent = function(eventName) {
      if (socket.ws) {
        socket.ws.$on(eventName, function(data) {
          if (socket.events[eventName]) {
            for (var i = 0; i < socket.events[eventName].length; i++) {
              socket.events[eventName][i](data);
            }
          }
        });
      }
    };

    var attachAllEvents = function() {
      for (var event in socket.events) {
        attachEvent(event);
      }
    };

    return {
      /**
       * @ngdoc function
       * @name addEvent
       * @methodOf TatUi.WebSocketProvider
       * @description
       *
       * Add an event on the websocket
       *
       * @param   {string}   eventName Name of the event to listen
       * @param   {function} callback  Callback function. It needs one data parameter
       * @returns {function} Function to invoke for killing the event
       */
      addEvent: addEvent,
      $get: function($websocket, $q, Identity) {
        /**
         * @ngdoc service
         * @module TatUi
         * @name TatUi.WebSocket
         *
         * @description
         *
         * manage websocket connection
         *
         */
        return {
          /**
           * @ngdoc function
           * @name checkConnection
           * @methodOf TatUi.WebSocket
           * @description
           *
           * Check if the websocket is connected to the server. If not try to connect
           */
          checkConnection: function() {
            if (!socket.ws) {
              this.connect();
            }
          },

          /**
           * @ngdoc function
           * @name isConnected
           * @methodOf TatUi.WebSocket
           * @description
           *
           * Check if the websocket is connected
           *
           * @return {bool} True if connected
           *
           */
          isConnected: function() {
            return isConnected();
          },
          connect: function(user) {
            return $q(function(resolve, reject) {
              if (!socket.ws) {
                socket.ws = $websocket.$new({
                  url: options.scheme + '://' + options.host +
                    ':' + options.port + options.path,
                  protocols: []
                });

                addEvent('$open', function() {
                  var identity = user ? user : Identity.getIdentity();
                  connect(identity);
                  resolve(true);
                });

                attachAllEvents();
              } else {
                if (socket.ws.$status() === 1) {
                  // already connected
                  reject('WEBSOCKET => Disconnect first');
                } else {
                  reject('WEBSOCKET => Status: ' + socket.ws.$status());
                }
              }
            });
          },

          /**
           * @ngdoc function
           * @name disconnect
           * @methodOf TatUi.WebSocket
           * @description
           *
           * Disconnect the websocket
           *
           */
          disconnect: function() {
            socket.ws.$close();
            socket.ws = null;
            socket.status = {};
          },

          /**
           * @ngdoc function
           * @name addEvent
           * @methodOf TatUi.WebSocket
           * @description
           *
           * Add an event on the websocket
           *
           * @param   {string}   eventName Name of the event to listen
           * @param   {function} callback  Callback function. It needs one data parameter
           * @returns {function} Function to invoke for killing the event
           */
          addEvent: addEvent,

          /**
           * @ngdoc function
           * @name emit
           * @methodOf TatUi.WebSocket
           * @description
           *
           * Emit an action to the websocket
           *
           * @param {string} action Action name
           * @param {object} data   Data to send
           */
          emit: function(action, data) {
            socket.ws.$emit(action, data);
          },

          /**
           * @ngdoc function
           * @name send
           * @methodOf TatUi.WebSocket
           * @description
           *
           * Send data to the websocket
           *
           * @param {object} data   Data to send
           */
          send: send
        };
      }
    };
  });
