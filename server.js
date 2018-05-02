'use strict';
const express = require('express');
const exphbs = require('express-handlebars');
let Handlebars = require('handlebars');
const path = require('path');
const moment = require('moment');
const minifyHTML = require('express-minify-html');
const mcache = require('memory-cache');

const request = require('request-promise');

const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const app = express();

const low = require('lowdb')
const lodashId = require('lodash-id')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('db.json')
const db = low(adapter)
const _ = db._

Handlebars.registerHelper('ifCond', function (v1, v2, options) {
  if (v1 === v2) {
    return options.fn(this);
  }
  return options.inverse(this);
});

db._.mixin(lodashId)

db.defaults({
  devices: [],
  questions: [],
  categories: [],
  points: 0
}).write()

// cached for duration in seconds
var cache = (duration) => {
  return (req, res, next) => {
    if (!db.get('settings.cacheenabled').value()) {
      console.log("cache disabled");
      next();
    } else {
      let key = '__express__' + req.originalUrl || req.url;
      let cachedBody = mcache.get(key);
      if (cachedBody) {
        res.send(cachedBody);
        return;
      } else {
        res.sendResponse = res.send
        res.send = (body) => {
          mcache.put(key, body, duration * 1000);
          res.sendResponse(body);
        }
        next();
      }
    }
  }
}

app.use(express.static('dist'))

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(cookieParser())
app.use(minifyHTML({
  override: true,
  exception_url: false,
  htmlMinifier: {
    removeComments: true,
    collapseWhitespace: true,
    collapseBooleanAttributes: true,
    removeAttributeQuotes: true,
    removeEmptyAttributes: true,
    minifyJS: true
  }
}));

app.engine('hbs', exphbs({
  defaultLayout: 'main',
  extname: '.hbs',
  helpers: {
    concat: function (o1, o2) {
      return o1 + o2;
    }
  }
}));

app.set('views', 'views');
app.set('view engine', 'hbs');
app.set('partialsDir', 'views/partials');
app.set('layoutsDir', 'views/layouts');


app.get('/', async (req, res) => {
  let devices = db.get('devices').value();
  let scores = await request.get('http://35.230.22.110/api/competitions/0/leaderboard?contestantId=21fc95fe-38d9-4b24-964f-b5b2b95b4796')
  scores = JSON.parse(scores).topTeams;
  res.render('index', {
    title: 'Index',
    page: 'index-page',
    devices: devices,
    points: db.get('points').value(),
    scores: scores,
  })
});

app.get('/submit_device', function (req, res) {
  res.render('submit_device', {
    title: 'Control Panel',
    page: 'submit-page'
  });
});

app.post('/submit_device', (req, res) => {
  const id = req.body.device_id;
  res.redirect('/watch_progress/' + id);
});
app.get('/watch_progress/:id', async (req, res) => {
  const id = req.params.id;
  let uuid = await request.get('http://35.230.22.110/api/account/byDeviceId/' + id);
  uuid = uuid.substring(1, uuid.length - 1);
  console.log('http://35.230.22.110/api/account/' + uuid);
  let account = await request.get('http://35.230.22.110/api/account/' + uuid);
  let questions = await request.get('http://35.230.22.110/api/categories?contestantId=' + uuid)

  account = JSON.parse(account);
  questions = JSON.parse(questions);

  const db_device = db.get('devices').find({
    device_id: id
  }).value();

  if (db_device == undefined) {
    db.get('devices').push({
      device_id: id,
      contestant_id: uuid,
      account: account,
    }).write();
  } else {
    db.get('devices').assign({
      device_id: id,
      contestant_id: uuid,
      account: account,
    }).value();
  }

  questions = questions.map(q => {
    return {
      id: q.id,
      name: q.name,
      icon: q.icon,
    }
  })

  for (let i = 0; i < questions.length; i++) {
    if (db.get('categories').find({
        name: questions[i].name
      }).value()) {
      db.get('categories').assign(questions[i]).write();
    } else {
      db.get('categories').push(questions[i]).write();
    }
  }

  res.render('watch_progress', {
    title: 'Watch Progress',
    page: 'watch_progress-page',
    device_id: id,
    contestant_id: uuid,
    account: JSON.stringify(account),
    questions: JSON.stringify(questions)
  });
});

app.get('/contestant/:id/answer_questions', async (req, res) => {
  let contestant = db.get('devices').find({
    contestant_id: req.params.id
  }).value();

  if (contestant == undefined) {
    res.send("contestant not found");
  }

  let category = null;
  let question = null;
  for (let i = 0; i < contestant.questions.length; i++) {
    category = contestant.questions[i];
    if (category.hasNewQuestions) {
      question = await request.get('http://35.230.22.110/api/questions?contestantId=' +
        contestant.contestant_id +
        '&categoryId=' +
        encodeURIComponent(category.name) +
        '&limit=1');
      question = JSON.parse(question);
      if(question.length > 0) {
        question = question[0];
        break;
      } 
    }
  }

  if(db.get('questions').find({id: question.id}).value() == undefined) {
    db.get('questions').push(question).write();
  }

  res.render('answer_questions', {
    title: 'Answer Questions',
    page: 'answer_questions-page',
    contestant: contestant,
    category: category,
    question: question,
    question_string: JSON.stringify(question),
  });

});

app.post('/contestant/:id/submit_question', async (req, res) => {
  let orig_question = JSON.parse(req.body.question_string)
  let form = {
    "contestantId": req.body.contestant_id,
    "answer": req.body.answer,
    "category": req.body.category_name,
    "currentLocationLatitude": (47.6761822 + Math.random() * 0.000001),
    "currentLocationLongitude": (-122.2029642 + Math.random() * 0.000001),
    "locationName": "Peter Kirk Park"
  }

  let response = await request.post('http://35.230.22.110/api/questions/' + req.body.question_id + '/submissions', {form: form})
  response = JSON.parse(response);

  console.log(response);

  db.update('points', n => n + int(response.score))
  if(response.isCorrect) {
    db.get('questions').find({id: orig_question.id}).assign({
      solution: req.body.answer,
      solutionText: response.solutionText,
      solutionMediaUrl: response.solutionMediaUrl,
      correct: true,
    }).write()
  } else {
    db.get('questions').find({id: orig_question.id}).assign({
      solution: null,
      solutionText: response.solutionText,
      solutionMediaUrl: response.solutionMediaUrl,
      correct: false,
    }).write()
  };

  res.render('review_answer', {
    title: 'Review Answer',
    page: 'review_answer-page',
    contestant_id: req.body.contestant_id,
    category: req.body.category_name,
    category_id: req.body.category_id,
    orig_question: orig_question,
    response: response
  });
});

app.post('/contestant/:id/revise_answer', async (req, res) => {
  db.get('questions').find({id: orig_question.id}).assign({
    solution: req.body.answer,
    correct: null,
  }).write()

  res.render('review_answer', {
    title: 'Review Answer',
    page: 'review_answer-page',
    contestant_id: req.body.contestant_id,
    category: req.body.category_name,
    category_id: req.body.category_id,
    orig_question: orig_question,
    response: response
  });
});


app.listen(5000, function () {
  console.log("Launch server on port 5000");
});