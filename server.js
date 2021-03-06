'use strict';

var basicAuth = require('basic-auth');
var express = require('express');
var _ = require('underscore');

var responseTypes = ['success', 'clientError', 'serverError'];

module.exports = function(options) {
  var routerCollector = options.routerCollector;
  var cloudCollector = options.cloudCollector;
  var AV = options.AV;

  var router = new express.Router();

  var authenticate = function(req, res, next) {
    var credentials = basicAuth(req);

    if (credentials && credentials.name == AV.applicationId && credentials.pass == AV.masterKey) {
      next();
    } else {
      res.header('WWW-Authenticate', 'Basic');
      res.status(401).json({
        code: 401, error: "Unauthorized."
      });
    }
  };

  router.use('/__lcSniper', authenticate, express.static(__dirname + '/public'));

  router.get('/__lcSniper/recentStatistics', authenticate, function(req, res) {
    console.log(routerCollector.recentStatistics())
    res.send(routerCollector.recentStatistics());
  });

  router.use('/__lcSniper/initial.json', authenticate, function(req, res) {
    var result = {
      routerSuccessAndError: [],
      routerResponseTime: [],
      cloudResponseTime: [],
      routerPie: [],
      statusPie: [],
      cloudSuccessAndError: [],
      cloudPie: [],
      cloudStatusPie: []
    };

    routerCollector.getLastDayStatistics().then(function(routerData) {
      cloudCollector.getLastDayStatistics().then(function(cloudData) {
        if (req.query.router) {
          routerData = _.compact(routerData.map(function(log) {
            log.set({
              urls: [_.findWhere(log.get('urls'), {urlPattern: req.query.router})]
            });

            if (_.isEmpty(log.get('urls')) || !log.get('urls')[0]) {
              return null;
            } else {
              responseTypes.forEach(function(type) {
                log.set(type, log.get('urls')[0][type]);
              });
              log.set('responseTime', log.get('urls')[0].responseTime);
              return log;
            }
          }));
        }

        if (!req.query.routerStatusCode) {
          result.routerSuccessAndError.push({
            name: 'success',
            data: routerData.map(function(log) {
              return {
                x: log.createdAt.getTime(),
                y: log.get('success')
              };
            })
          }, {
            name: 'clientError',
            data: routerData.map(function(log) {
              return {
                x: log.createdAt.getTime(),
                y: log.get('clientError')
              };
            })
          }, {
            name: 'serverError',
            data: routerData.map(function(log) {
              return {
                x: log.createdAt.getTime(),
                y: log.get('serverError')
              };
            })
          });
        } else {
          result.routerSuccessAndError.push({
            name: req.query.routerStatusCode,
            data: routerData.map(function(log) {
              return {
                x: log.createdAt.getTime(),
                y: log.get('urls').reduce(function(previous, url) {
                  return previous + url[req.query.routerStatusCode];
                }, 0)
              };
            })
          });
        }

        result.routerResponseTime.push({
          name: 'Router',
          data: routerData.map(function(log) {
            return {
              x: log.createdAt.getTime(),
              y: log.get('responseTime')
            };
          })
        });

        result.cloudSuccessAndError.push({
          name: 'success',
          data: cloudData.map(function(log) {
            return {
              x: log.createdAt.getTime(),
              y: log.get('success')
            };
          })
        }, {
          name: 'clientError',
          data: cloudData.map(function(log) {
            return {
              x: log.createdAt.getTime(),
              y: log.get('clientError')
            };
          })
        }, {
          name: 'serverError',
          data: cloudData.map(function(log) {
            return {
              x: log.createdAt.getTime(),
              y: log.get('serverError')
            };
          })
        });

        result.cloudResponseTime.push({
          name: 'Cloud',
          data: cloudData.map(function(log) {
            return {
              x: log.createdAt.getTime(),
              y: log.get('responseTime')
            };
          })
        });

        var routerPie = {
          name: 'Routers',
          data: []
        };

        routerData.forEach(function(log) {
          log.get('urls').forEach(function(url) {
            var y;

            if (req.query.routerStatusCode)
              y = url[req.query.routerStatusCode];
            else
              y = url.success + url.clientError + url.serverError;

            if (_.findWhere(routerPie.data, {name: url.urlPattern})) {
              _.findWhere(routerPie.data, {name: url.urlPattern}).y += y;
            } else if (y > 0) {
              routerPie.data.push({
                name: url.urlPattern,
                y: y
              });
            }
          });
        });

        result.routerPie.push(routerPie);

        var statusPie = {
          name: 'StatusCode',
          data: []
        };

        routerData.forEach(function(log) {
          log.get('urls').forEach(function(url) {
            _.each(url, function(value, key) {
              if (isFinite(parseInt(key))) {
                if (_.findWhere(statusPie.data, {name: key})) {
                  _.findWhere(statusPie.data, {name: key}).y += value;
                } else if (value > 0) {
                  statusPie.data.push({
                    name: key,
                    y: value
                  });
                }
              }
            });
          });
        });

        result.statusPie.push(statusPie);

        var cloudPie = {
          name: 'Cloud',
          data: []
        };

        cloudData.forEach(function(log) {
          log.get('urls').forEach(function(url) {
            if (_.findWhere(cloudPie.data, {name: url.urlPattern})){
              _.findWhere(cloudPie.data, {name: url.urlPattern}).y += url.success + url.clientError + url.serverError;
            } else {
              cloudPie.data.push({
                name: url.urlPattern,
                y: url.success + url.clientError + url.serverError
              });
            }
          });
        });

        result.cloudPie.push(cloudPie);

        var cloudStatusPie = {
          name: 'StatusCode',
          data: []
        };

        cloudData.forEach(function(log) {
          log.get('urls').forEach(function(url) {
            responseTypes.forEach(function(type) {
              if (_.findWhere(cloudStatusPie.data, {name: type})) {
                _.findWhere(cloudStatusPie.data, {name: type}).y += url[type];
              } else {
                cloudStatusPie.data.push({
                  name: type,
                  y: url[type]
                });
              }
            });
          });
        });

        result.cloudStatusPie.push(cloudStatusPie);

        result.routers = _.pluck(result.routerPie[0].data, 'name');

        res.json(result);
      });
    });
  });

  return router;
};
