var schedule = require('node-schedule');
var request = require('request');

var scheduled_score = function (db) {
  schedule.scheduleJob('5 * * * *', function () {
    request.get('http://35.230.22.110/api/competitions/0/leaderboard?contestantId=21fc95fe-38d9-4b24-964f-b5b2b95b4796', function (e, r, b) {
      db.get('score').push({
        
      })
    });
  });
};