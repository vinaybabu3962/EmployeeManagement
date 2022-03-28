var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session')
const MongoStore = require('connect-mongodb-session')(session);
const { v4: uuidv4 } = require('uuid');
const popup = require('alert');
var nodemailer = require('nodemailer');
const prompt = require('prompt-sync')();
let secrateKey = "secrateKey";
const crypto = require('crypto');


function encrypt(text) {
    encryptalgo = crypto.createCipher('aes192', secrateKey);
    let encrypted = encryptalgo.update(text, 'utf8', 'hex');
    encrypted += encryptalgo.final('hex');
    return encrypted;
}

function decrypt(encrypted) {
    decryptalgo = crypto.createDecipher('aes192', secrateKey);
    let decrypted = decryptalgo.update(encrypted, 'hex', 'utf8');
    decrypted += decryptalgo.final('utf8');
    return decrypted;
}

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');



var app = express();

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'vinaybabukodipyaka@gmail.com',
    pass: '9573707043'
  }
});



app.set('trust proxy', 1) // trust first proxy


app.use(session({
  genid: function (req) {
    return uuidv4();// use UUIDs for session IDs
  },
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,

  store: new MongoStore({
    url: 'mongodb://localhost:27017/', //YOUR MONGODB URL
    expires: 3 * 60 * 1000,
    autoRemove: 'native'
  })
}))



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
//app.set('view engine', 'pug');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public/stylesheets')));
app.use(express.static(path.join(__dirname, 'public/images')));
//app.use('/', indexRouter);
app.use('/users', usersRouter);


var idArray = Array();
var MongoClient = require('mongodb').MongoClient;
var objectid = require('mongodb').ObjectId;
var url = "mongodb://localhost:27017/EmployeeDatabase";
var dbConnection;

MongoClient.connect(url, function (err, db) {
  if (err) throw err;
  dbConnection = db.db("EmployeeDatabase");
  /*dbConnection.collection("departments").insertMany(departmentdetails, function(err, res) {
    if (err) throw err;
    console.log("Number of documents inserted: " + res.insertedCount);
    db.close();
  });*/
  //Insertion of emploees into database
  /*
  dbConnection.collection("employees").insertMany(tabledetails1, function(err, res) {
    if (err) throw err;
    console.log("Number of documents inserted: " + res.insertedCount);
    db.close();
  });
  */
  /*dbConnection.createCollection("logindetails", function(err, res) {
    if (err) throw err;
    console.log("Collection created!");
    //db.close();
    
  });
  */
});



//LOGIN ROUTE

app.get('/', (req, res) => {
  console.log(req.session.auth);
  if (req.session.auth) {
    console.log("hello");
    res.redirect("/EmployeeTable");
  }
  else {
    res.render("login");
  }
})

app.get('/register', (req, res) => {
  console.log("hello");
  res.render("signup");
})

app.get('/fp', (req, res) => {
  res.render("fpasswords");
})
app.post('/fps', (req, res) => {
  var empemail = req.body.empname;
  async function loginDetailsFunction(){
    const result=await  dbConnection.collection("logindetails").find({}).toArray();
    for (let i = 0; i < result.length; i++) {
      if (result[i].empname == empemail) {
        var sendtxt = "Hey Greetings, Forgot Password? No worries!!!" + "\n" + "Here are your login information" + "\n" + "Username:" + empemail + "\n" + "Password:" + decrypt(result[i].password);
        var mailOptions = {
          from: 'vinaybabukodipyaka@gmail.com',
          to: empemail,
          subject: 'Login Information',
          text: sendtxt
        };
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log('Email sent: ' + info.response);
          }
        });
        popup("Credentials sent to your mail successfully please check that and login now!!");
        res.redirect('/');
        break;
      }
    }

  }
  loginDetailsFunction();
})
  




app.post('/SaveCredentials', (req, res) => {
  var empname = req.body.empname;
  var password = req.body.password;
  async function SaveCredentials(){
    const result=await dbConnection.collection("logindetails").find({}).toArray();
    var f = 0;
    for (let i = 0; i < result.length; i++) {
      if (result[i].empname == empname) {
        f = 1;
        break;
      }
    }
    if (f == 1) {
      popup("User Already exists!! please login!!");
      res.redirect('/');
    }
    else if (f == 0) {
      var resObj = {
        "empname": empname,
        "password": encrypt(req.body.password),
      }
      var awaitForInsert = await dbConnection.collection("logindetails").insertOne(resObj);
      popup("Credentials saved!! please login now..");
        res.redirect('/');

    }
  }
  SaveCredentials()
})
 


app.get('/EmployeeTable', (req, res) => {
  if (req.session.auth) {
    async function DisplayEmployeeTable(){
      const result=await dbConnection.collection("employees").find({}).toArray()
      var tableobj = { "key": result, "user": username };
      res.render("EmployeeTable", tableobj);

    }
    DisplayEmployeeTable()
  }
  else {
    res.redirect('/');
  }
})

var username;
//Route for Validating credentials:
app.post('/ValidateCredentials', (req, res1) => {
  username = req.body.empname;
  const password = req.body.password;
  async function ValidateCredentials(){
    const res=await dbConnection.collection("logindetails").find({}).toArray()
    let i = 0;
    console.log(res);
    for (i = 0; i < res.length; i++) {
      if (res[i].empname == username) {




        
        if (decrypt(res[i].password) == password) {
          req.session.auth = true;
          req.session.save();
          res1.redirect('/EmployeeTable');
        }
        else {
          req.session.auth = false;
          popup("please enter correct password for user:" + username + "\n" );
          res1.redirect('/');

        }
        break;

      }
    }

    if (i == res.length) {
      popup("Seems you dont have account!! please signup");
      res1.redirect('/register');
    }


  }
  ValidateCredentials()
})
  


app.get('/edit/:empidkey', (req, res) => {
  if (req.session.auth) {
    async function EditEmployee(){
      const { empidkey } = req.params;
      const result=await dbConnection.collection("employees").findOne({ "_id": objectid(empidkey) })
      const result1=await dbConnection.collection("departments").find({}).toArray()
      var index;
      for (let i = 0; i < result1.length; i++) {
        if (result1[i].department == result.department) {
          index = i;
        }
      }
      var sendObject = { "key": result, "user": username, "deparray": result1, "index": index }
      res.render("EmployeeForm", sendObject);

    }
    EditEmployee()
  }
  else {
    res.redirect('/');
  }

})

app.post('/savedata', (req, res) => {
  if (req.session.auth) {
    console.log("hello");
    console.log("option value:" + req.body.dep);
    var object1 = {
      "id": req.body.id,
      "name": req.body.name,
      "role": req.body.des,
      "salary": req.body.sal,
      "department": req.body.dep,
      "company": req.body.com,
    }
    if (req.body.primkey) {

      async function UpdateEmployee(){
        const result=await dbConnection.collection("employees").updateOne({ "_id": objectid(req.body.primkey) }, { $set: object1 })
        res.redirect('/EmployeeTable');
        popup("Data updated successfully");
      }
      UpdateEmployee()
    }
    else {

      async function InsertEmployee(){
        const result=await dbConnection.collection("employees").insertOne(object1)
        res.redirect('/EmployeeTable');
        popup("Data inserted sucessfully");
      }
      InsertEmployee()
    }
  }
  else {
    res.redirect('/');
  }
})

app.get('/add', (req, res) => {
  if (req.session.auth == true) {
    async function addEmployee(){
      const result1=await dbConnection.collection("departments").find({}).toArray()
      var sendObject = { "key": {}, "user": username, "deparray": result1, "index": 0 }
      res.render("EmployeeForm", sendObject);
    }
    addEmployee()
  }
  else {
    res.redirect('/');

  }
})

app.get('/delete/:empidkey', (req, res) => {
  if (req.session.auth) {
    async function DeleteEmployee(){
      const { empidkey } = req.params;
      const result=await dbConnection.collection("employees").deleteOne({ "_id": objectid(empidkey) })
      res.redirect('/EmployeeTable')
    }
    DeleteEmployee()

  }
  else {
    res.redirect('/');
  }

})

app.get('/logout', (req, res) => {
  req.session.destroy(function () {
    res.redirect('/')
  });

})




// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
