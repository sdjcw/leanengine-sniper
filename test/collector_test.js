'use strict';
var express = require('express');
var request = require('supertest');
var should = require('should');
var async = require('async');
var bodyParser = require('body-parser');
var AV = require('leanengine');
var sniper = require('../');

var appId = 'e8uoEqQ1JYL8qeEoROlwacYq';
var appKey = 'KeQ7TVtpaYWPc6t9XYfi6a8j';
var masterKey = 'Lw4CUVJFFCfj2IWVcEGM4XEE';
AV.initialize(appId, appKey, masterKey);

var app = express();
app.use(bodyParser.json());
app.use(sniper({AV: AV}));

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/users/:id', function (req, res) {
  res.send('user: ' + req.params.id);
});

app.get('/users/:id/err', function (req, res) {
  res.status(400).send('Bad Request');
});

app.post('/users/:id/', function (req, res) {
  res.status(req.body.statusCode).send('test'); // 模拟失败
});

describe('collectorTest', function() {
  it('simple', function(done) {
    async.parallel([
      function(cb) {
        // 10 次 / 的调用
        async.times(10, function(n, next) {
          request(app).get('/').expect(200, function() {
            next();
          });
        }, cb);
      },
      function(cb) {
        // 8 次 /users/:id 调用
        async.times(8, function(n, next) {
          request(app).get('/users/' + n).expect(200, function() {
            next();
          });
        }, cb);
      },
      function(cb) {
        // 7 次 /users/:id/err 调用
        async.times(8, function(n, next) {
          request(app).get('/users/' + n + '/err').expect(400, function() {
            next();
          });
        }, cb);
      },
      function(cb) {
        var statusCodes = [200, 201, 206, 304, 400, 401, 404, 500, 501, 502, 503];
        async.times(statusCodes.length, function(n, next) {
          async.times(n + 1, function(m, next2) {
            request(app).post('/users/' + n)
              .send({statusCode: statusCodes[n]})
              .expect(statusCodes[n], function() {
                next2();
            });
          }, next);
        }, cb);
      }
    ], function() {
      request(app).get('/__lcSniper/recentStatistics')
        .auth(appId, masterKey)
        .expect(200)
        .end(function(err, res){
          console.log(res.body);
          done();
        });
    });
  });
});
