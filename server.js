var express = require('express');
var validUrl = require('valid-url');
var mongo = require('mongodb').MongoClient;
var request = require('request');

var url = 'mongodb://localhost:27017/shorturl';

var app = express();

var getNextSequence = function getNextSequence(name, db, callback) {
  
  var countersDb = db.collection('counters');
  
  countersDb.findOneAndUpdate (
    { _id: name },
    { $inc: { seq: 1 } },
    { returnOriginal: false }
    , function (err, doc) {
      if ( ! err) {
        callback(doc.value.seq);
      }
    });
}

var insertShortUrl = function insertShortUrl (shortUrl, callback) {
    
  mongo.connect(url, function(err, db) {
  
    if (err) {
      console.log(err);
      throw(err);
    }
  
    getNextSequence('shorturl', db, function(seq) {
      var collection = db.collection('urls');
    
      collection.insert(
        {
          _id: seq,
         url: shortUrl
        }
      );
          
      db.close();
      
      callback(seq);
    });
  
  })
};

var getShortUrl = function insertShortUrl (id, callback) {
    
  mongo.connect(url, function(err, db) {
  
    if (err) {
      console.log(err);
      throw(err);
    }
  
    var collection = db.collection('urls');
  
    collection.findOne(
      {
        _id: id,
      }, function(err, document) {
        if (err) {
          console.log(err);
          throw(err);
        }
        
        if ( ! document) {
          callback(document);
        } else {
          callback(document.url);
        }
        
        db.close();
    });

  });
};

var checkUrlExists = function checkUrlExists (urlString, callback) {

  var options = {
    timeout: 500, // milliseconds
    url: urlString
  };
  
  request.head(options, function (error, response) {
    if ( ! error) {
      console.log('req statusCode: ' + response.statusCode);
      callback( response.statusCode == 200);
    } else {
      console.log(error);
      callback(false);
    }
  });
 
};

// Add new url to be shortened.
app.get('/new/*', function (req, res) {
  
  var urlParam = req.params[0];
  var out;

  console.log('Want to create a new url.');
  console.log(urlParam);
  
  if (! validUrl.isUri(urlParam)) {
    out = { 
      error: "Wrong url format, make sure you have a valid protocol and real site."
    }
    res.send(out);
  }

  checkUrlExists(urlParam, function (result) {
  
    console.log('checkUrlExists: ' + result);
    
    if (result) {
      insertShortUrl(urlParam, function (seq) {
        out = {
          original_url: urlParam,
          short_url: 'https://' + req.headers.host + '/' + seq
        };
        res.send(out);
      });
      
    } else {
      out = { 
        error: "Wrong url format, make sure you have a valid protocol and real site."
      }
      res.send(out);
    }
    

  });

});

// Route for shortened url. Numbers only.

app.get(/\/(\d+)$/, function (req, res) {

  getShortUrl(+req.params[0], function (urlFound) {
    
    if (! urlFound) {
      res.send({
        error: "This url is not on the database."
      });
    } else {
      res.redirect(urlFound);
    }
  });

});

app.get('/*', function (req, res) {
  console.log('Found a short url ' + req.params[0]);

  var out;

  // Catch short urls that are non-numeric. They are not valid.
  if (req.params[0].length > 0) {
    out = {
      error: "This url is not on the database."
    };
  } else {
    var outArr = [
      '<h1>freeCodeCamp API Basejump: URL Shortener Microservice</h1>',
      '<h2>Example creation usage:</h2>',
      '<code>https://' + req.headers.host + '/new/http://www.google.com</code></br>', 
      '<code>https://' + req.headers.host + '/new/http://portquiz.net:3631</code>',
      '<h2>Example creation output</h2>',
      '<code>{ "original_url":"http://portquiz.net:3631", "short_url":"http://' + req.headers.host + '/8170" }</code>',
      '<h2>Usage:</h2>',
      '<code>https://' + req.headers.host + '/8170</code>',
      '<h2>Will redirect to:</h2>',
      '<code>http://portquiz.net:3631</code>'
    ];
    out = outArr.join('');
  }

  res.send(out);
  
});

app.listen(8080, function () {
  console.log('shorturl listening on port 8080.');
});