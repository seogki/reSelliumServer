var express = require('express');
var compression = require('compression');
var app = express();
var bodyParser = require('body-parser');
var url = require('url')
var fs = require('fs');
var request = require('request');
var mysql = require('mysql');
var multer = require('multer');
var async = require('async');
const firefox = require('selenium-webdriver/firefox');
const {Builder, By, until} = require('selenium-webdriver');

const screen = {
  width: 640,
  height: 480
};

var driver = new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(new firefox.Options().headless().windowSize(screen))
    .build();

app.use(compression());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(bodyParser.json());

function successPost(){
  var json = {result : "200"};
  return json
}

function errorPost(){
  var json = {
    result : "에러 발생"
  };
  return json
}

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "A1!aarlxmr",
  database: "reSellium",
  multipleStatements: true
});

con.connect(function(err) {
  if (err){
    console.log("connect error");
  } else {
    console.log("Connected! MY SQL");
  }
});

Date.prototype.yyyymmddhhmmss = function() {
  var yyyy = this.getFullYear();
  var mm = this.getMonth() < 9 ? "0" + (this.getMonth() + 1) : (this.getMonth() + 1); // getMonth() is zero-based
  var dd  = this.getDate() < 10 ? "0" + this.getDate() : this.getDate();
  var hh = this.getHours() < 10 ? "0" + this.getHours() : this.getHours();
  var min = this.getMinutes() < 10 ? "0" + this.getMinutes() : this.getMinutes();
  var ss = this.getSeconds() < 10 ? "0" + this.getSeconds() : this.getSeconds();
  return yyyy + "-" + mm + "-" + dd + " " + hh + ":" + min + ":" + ss;
};

var download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){

    saveImagetoDB("/" + filename)
    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);

  });
};

function deleteRows(){
  con.query("DELETE FROM Images",function(err, result){
    if(err)
      console.log("error delete DB")
  });
}


function saveImagetoDB(filePath){

  var ds = new Date().yyyymmddhhmmss()
  var param = ["PS",filePath,ds]
  var query = "INSERT INTO Images(which,path,date) VALUES (?,?,?)"

  con.query(query,param,function(err, result){
    if(err)
      console.log("error insert DB")
  });
}

function getData(data,uniqueId){
  data.forEach(function(result){
    result.findElement(By.tagName("img")).getAttribute("src").then(function(src){
      uniqueId++
      download(src, "img"+uniqueId+".jpg", function(){
        console.log("done")
      });
    })
  })
}

function getRows(rows,uniqueId){
  rows.forEach(function(row){
    row.findElements(By.className("product-image__img product-image__img--main")).then(function(data){
        getData(data,uniqueId)
    })
  })
}

// async function seleniumPs4(){
//   deleteRows()
//   var uniqueId = 0
//   var ps4_xpath = '//div[@class="grid-cell-container"]'
//   var grid_cell_className = "grid-cell-row__container"
//   var image_product_className = "product-image__img product-image__img--main"
//   var driver_url = 'https://store.playstation.com/ko-kr/grid/STORE-MSF86012-TOPSALESGAME/1'
//
//
//
//   driver.findElement(By.xpath(ps4_xpath)).then(function(elements){
//     elements.findElements(By.className(grid_cell_className)).then(function(rows){
//       getRows(rows, uniqueId)
//     })
//   })
//
//
// }


function seleniumPs4(){
  deleteRows()
  var uniqueId = 0
  var ps4_xpath = '//div[@class="grid-cell-container"]'
  driver.get('https://store.playstation.com/ko-kr/grid/STORE-MSF86012-TOPSALESGAME/1');
  driver.findElement(By.xpath(ps4_xpath)).then(function(elems) {
    elems.findElements(By.className("grid-cell-row__container")).then(function(rows){
      for(i=0;i<rows.length;i++){
        rows[i].findElements(By.className("product-image__img product-image__img--main")).then(function(data){
          data.forEach(function(result){
            result.findElement(By.tagName("img")).getAttribute("src").then(function(src){
              uniqueId++;
              download(src, "img"+uniqueId+".jpg", function(){
                console.log("done")
              });
            })
          })
        })
      }
    })

  });

  driver.quit();
}

seleniumPs4();


app.use(function (req, res, next) {
    req.connection.setNoDelay(true)
    res.header('Content-Type', 'application/json');
    next();
});

app.post('/main/getMainData/', function(req,res, next){
  console.log("/main/getMainData")
  var o = {};
  var platform = req.query.Platform
  var key = 'HoriModel';
  var query;
  o[key] = [];
  if (platform == "PS"){
    query = "SELECT * FROM PS ORDER BY id ASC LIMIT 7"
  } else if (platform == "XBOX"){
    query = "SELECT * FROM XBOX ORDER BY id ASC LIMIT 7"
  } else if (platform == "SWITCH"){
    query = "SELECT * FROM SWITCH ORDER BY id ASC LIMIT 7"
  }

  con.query(query,function(err,result,fields){
    if(err) return next(err);
    res.send(result)
  });
});

app.post('/main/getPopularData/', function(req,res, next){
  console.log("/main/getPopularData")
  query = "SELECT * FROM Images ORDER BY id ASC"
  con.query(query,function(err,result,fields){
    if(err) return next(err);
    res.send(result)
  });
});


app.post('/game/getPs4Data/', function(req,res, next){
  console.log("/game/getPs4Data")
  query = "SELECT * FROM PS ORDER BY id DESC LIMIT 10"
  con.query(query,function(err,result,fields){
    if(err) return next(err);
    res.send(result)
  });
});

app.post('/game/getScrollPs4Data/', function(req,res, next){
  console.log("/game/getScrollPs4Data")

  var id = req.query.Id
  query = "SELECT * FROM PS WHERE id < ? ORDER BY id DESC LIMIT 10"

  con.query(query,[id],function(err,result,fields){
    if(err) return next(err);
    res.send(result)

  });
});

app.post('/game/getSpinnerPs4Data/', function(req,res, next){
  console.log("/game/getSpinnerPs4Data")
  var first = req.query.First
  if(first == "전체"){
    first = ""
  }
  var second = req.query.Second
  if(second == "전체"){
    second = ""
  }
  var result = first + second
  query = "SELECT * FROM PS WHERE which LIKE ? ORDER BY id DESC LIMIT 10"

  con.query(query,['%' + [result] + '%'],function(err,result,fields){
    if(err) return next(err);
    res.send(result)
  });
});

app.post('/game/getSpinnerScrollPs4Data/', function(req,res, next){
  console.log("/game/getSpinnerScrollPs4Data")
  var id = req.query.Id
  var first = req.query.First
  if(first == "전체"){
    first = ""
  }
  var second = req.query.Second
  if(second == "전체"){
    second = ""
  }
  var result = first + second
  query = "SELECT * FROM PS WHERE id < ? AND which LIKE ? ORDER BY id DESC LIMIT 10"

  con.query(query,[id,'%' + [result] + '%'],function(err,result,fields){
    if(err) return next(err);
    res.send(result)
  });
});

app.post('/game/getSearchPs4Data/', function(req,res, next){
  console.log("/game/getSearchPs4Data")
  var search = req.query.Search
  query = "SELECT * FROM PS WHERE title LIKE ? or place LIKE ? ORDER BY id DESC LIMIT 15"

  con.query(query,['%' + [search] + '%','%' + [search] + '%'],function(err,result,fields){
    if(err) return next(err);
    res.send(result)
  });
});

app.post('/game/getSearchScrollPs4Data/', function(req,res, next){
  console.log("/game/getSearchScrollPs4Data")
  var id = req.query.Id
  var search = req.query.Search
  query = "SELECT * FROM PS WHERE id < ? AND (title LIKE ? or place LIKE ?) ORDER BY id DESC LIMIT 15"
  params = [id,'%' + search + '%','%' + search + '%']
  con.query(query,params,function(err,result,fields){
    if(err) return next(err);
    res.send(result)
  });
});

app.post('/game/getxboxData/', function(req,res, next){
  console.log("/game/getxboxData")
  query = "SELECT * FROM XBOX ORDER BY id DESC LIMIT 10"
  con.query(query,function(err,result,fields){
    if(err) return next(err);
    res.send(result)
  });
});

app.post('/game/getScrollxboxData/', function(req,res, next){
  console.log("/game/getScrollxboxData")
  var id = req.query.Id
  query = "SELECT * FROM XBOX WHERE id < ? ORDER BY id DESC LIMIT 10"

  con.query(query,[id],function(err,result,fields){
    if(err) return next(err);
    res.send(result)
  });
});

app.post('/game/getSpinnerxboxData/', function(req,res, next){
  console.log("/game/getSpinnerxboxData")
  var first = req.query.First
  if(first == "전체"){
    first = ""
  }
  var second = req.query.Second
  if(second == "전체"){
    second = ""
  }
  var result = first + second
  query = "SELECT * FROM XBOX WHERE which LIKE ? ORDER BY id DESC LIMIT 10"

  con.query(query,['%' + [result] + '%'],function(err,result,fields){
    if(err) return next(err);

    res.send(result)
  });
});

app.post('/game/getSpinnerScrollxboxData/', function(req,res, next){
  console.log("/game/getSpinnerScrollxboxData")
  var id = req.query.Id
  var first = req.query.First
  if(first == "전체"){
    first = ""
  }
  var second = req.query.Second
  if(second == "전체"){
    second = ""
  }
  var result = first + second
  query = "SELECT * FROM XBOX WHERE id < ? AND which LIKE ? ORDER BY id DESC LIMIT 10"

  con.query(query,[id,'%' + [result] + '%'],function(err,result,fields){
    if(err) return next(err);
    res.send(result)
  });
});

app.post('/game/getSearchXboxData/', function(req,res, next){
  console.log("/game/getSearchXboxData")

  var search = req.query.Search
  query = "SELECT * FROM XBOX WHERE title LIKE ? or place LIKE ? ORDER BY id DESC LIMIT 15"

  con.query(query,['%' + [search] + '%','%' + [search] + '%'],function(err,result,fields){
    if(err) return next(err);
    res.send(result)
  });
});

app.post('/game/getSearchScrollXboxData/', function(req,res, next){
  console.log("/game/getSearchScrollXboxData")

  var id = req.query.Id
  var search = req.query.Search
  query = "SELECT * FROM XBOX WHERE id < ? AND (title LIKE ? or place LIKE ?) ORDER BY id DESC LIMIT 15"
  params = [id,'%' + search + '%','%' + search + '%']
  con.query(query,params,function(err,result,fields){
    if(err) return next(err);
    res.send(result)
  });
});

app.post('/game/getswitchData/', function(req,res, next){
  console.log("/game/getswitchData")

  query = "SELECT * FROM SWITCH ORDER BY id DESC LIMIT 10"
  con.query(query,function(err,result,fields){
    if(err) return next(err);
    res.send(result)
  });
});



app.post('/game/getScrollswitchData/', function(req,res, next){
  console.log("/game/getScrollswitchData")

  var id = req.query.Id
  query = "SELECT * FROM SWITCH WHERE id < ? ORDER BY id DESC LIMIT 10"

  con.query(query,[id],function(err,result,fields){
    if(err) return next(err);
    res.send(result)
  });
});

app.post('/game/getSpinnerswitchData/', function(req,res, next){
  console.log("/game/getSpinnerswitchData")

  var first = req.query.First
  if(first == "전체"){
    first = ""
  }
  var second = req.query.Second
  if(second == "전체"){
    second = ""
  }
  var result = first + second
  query = "SELECT * FROM SWITCH WHERE which LIKE ? ORDER BY id DESC LIMIT 10"

  con.query(query,['%' + [result] + '%'],function(err,result,fields){
    if(err) return next(err);
    res.send(result)
  });
});

app.post('/game/getSpinnerScrollswitchData/', function(req,res, next){
  console.log("/game/getSpinnerScrollswitchData")

  var id = req.query.Id
  var first = req.query.First
  if(first == "전체"){
    first = ""
  }
  var second = req.query.Second
  if(second == "전체"){
    second = ""
  }
  var result = first + second
  query = "SELECT * FROM SWITCH WHERE id < ? AND which LIKE ? ORDER BY id DESC LIMIT 10"

  con.query(query,[id,'%' + [result] + '%'],function(err,result,fields){
    if(err) return next(err);
    res.send(result)
  });
});

app.post('/game/getSearchSwitchData/', function(req,res, next){
  console.log("/game/getSearchSwitchData")

  var search = req.query.Search
  query = "SELECT * FROM SWITCH WHERE title LIKE ? or place LIKE ? ORDER BY id DESC LIMIT 15"

  con.query(query,['%' + [search] + '%','%' + [search] + '%'],function(err,result,fields){
    if(err) return next(err);
    res.send(result)
  });
});

app.post('/game/getSearchScrollSwitchData/', function(req,res, next){
  console.log("/game/getSearchScrollSwitchData")

  var id = req.query.Id
  var search = req.query.Search
  query = "SELECT * FROM SWITCH WHERE id < ? AND (title LIKE ? or place LIKE ?) ORDER BY id DESC LIMIT 15"
  params = [id,'%' + search + '%','%' + search + '%']
  con.query(query,params,function(err,result,fields){
    if(err) return next(err);
    res.send(result)
  });
});


app.post('/game/RegisterData/', function(req,res, next){
  console.log("/game/RegisterData")
  var platform = req.query.Platform
  var ds = new Date().yyyymmddhhmmss()
  var param = [req.query.Platform, req.query.Title, req.query.Place, req.query.Money, req.query.Which, ds];
  var query;

  if (platform == "PS"){
    query = "INSERT INTO PS(platform,title,place,money,which,date) VALUES (?,?,?,?,?,?)"
  } else if(platform == "XBOX"){
    query = "INSERT INTO XBOX(platform,title,place,money,which,date) VALUES (?,?,?,?,?,?)"
  } else if(platform == "SWITCH"){
    query = "INSERT INTO SWITCH(platform,title,place,money,which,date) VALUES (?,?,?,?,?,?)"
  } else {

  }
  con.query(query,param,function(err, result){
    if(err) return next(err);
    res.json(successPost());
  });
});

app.get('/:name',function(req,res){
  var filename = req.params.name
  fs.readFile(filename, function(err, content){
    if (err) {
      res.writeHead(400, {'Content-type':'text/html'})
      console.log(err);
      res.end("No such image");
    } else {
      res.writeHead(200,{'Content-type':'image/jpg'});
      res.end(content);
    }
  });
});


app.use(function(err, req, res, next){
  res.send({ message : error.message })
});

app.listen(6327);
