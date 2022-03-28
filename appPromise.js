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
var { tabledetails1, logindetails, departmentdetails } = require('./data');
const { resolve } = require('path');


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
var ObjectId = require('mongodb').ObjectId;
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

  let loginPromise = new Promise((resolve, reject) => {
    dbConnection.collection("logindetails").find({}).toArray((err, result) => {
      if (err) reject(err);
      var f = 0;
      for (let i = 0; i < result.length; i++) {
        if (result[i].empname == empemail) {
          resolve({
            name: empemail,
            password: decrypt(result[i].password),
          })


        }
      }
    })
  })
  loginPromise.then((details) => {
    console.log(details);
    var sendtxt = "Hey Greetings, Forgot Password? No worries!!!" + "\n" + "Here are your login information" + "\n" + "Username:" + details.name + "\n" + "Password:" + details.password;
    var mailOptions = {
      from: 'vinaybabukodipyaka@gmail.com',
      to: details.name,
      subject: 'Login Information',
      text: sendtxt
    };
    let mailPromise = new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          reject(error)
        } else {
          resolve("email sent success fully")
        }
      });
    })
    mailPromise.then(() => {
      popup("Credentials sent to your mail successfully please check that and login now!!");
      res.redirect('/');
    })

  })
})









app.post('/SaveCredentials', (req, res) => {
  var empname = req.body.empname;
  var password = req.body.password;
  let loginPromise = new Promise((resolve, reject) => {
    dbConnection.collection("logindetails").find({}).toArray((err, result) => {
      if (err) reject(err);
      var f = 0;
      for (let i = 0; i < result.length; i++) {
        if (result[i].empname == empname) {
          f = 1;
          break;
        }
      }
      if (f == 0) resolve({ exists: false, })
      else if (f == 1) resolve({ exists: true })
    })
  })
  loginPromise.then((existsInfo) => {
    if (existsInfo.exists) {
      popup("User Already exists!! please login!!");
      res.redirect('/');
    }
    else {
      var resObj = {
        "empname": empname,
        "password": encrypt(req.body.password),
      }
      let insertPromise = new Promise((resolve, reject) => {
        dbConnection.collection("logindetails").insertOne(resObj, (err, res1) => {
          if (err) reject(err);
          resolve("inserted successfully.")
        })
      })
      insertPromise.then(() => {
        popup("Credentials saved!! please login now..");
        res.redirect('/');
      })

    }
  })
})




app.get('/EmployeeTable', (req, res) => {
  if (req.session.auth) {
    let employeePromise = new Promise((resolve, reject) => {
      dbConnection.collection("employees").find({}).toArray(function (err, result) {
        if (err) reject(err);
        resolve(result)
      })
    })
    employeePromise.then((result) => {
      var tableobj = { "key": result, "user": username };
      res.render("EmployeeTable", tableobj);
    })
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
  let loginPromise = new Promise((resolve, reject) => {
    dbConnection.collection("logindetails").find({}).toArray((err, res) => {
      if (err) reject(err)
      let i = 0;
      for (i = 0; i < res.length; i++) {
        if (res[i].empname == username) {
          if (decrypt(res[i].password) == password)
            resolve({ login: true, })
          else
            resolve({ login: false })
        }
      }
      if (i == res.length) resolve({ login1: true, })
    })
  })
  loginPromise.then((resObj) => {
    if (resObj.login) {
      req.session.auth = true;
      req.session.save();
      res1.redirect('/EmployeeTable');
    }
    else if (resObj.login1) {
      popup("Seems you dont have account!! please signup");
      res1.redirect('/register');

    }
    else {
      req.session.auth = false;
      popup("please enter correct password for user:" + username + "\n");
      res1.redirect('/');
    }
  })

})



app.get('/edit/:empidkey', (req, res) => {
  if (req.session.auth) {
    const { empidkey } = req.params;
    const employeePromise = new Promise((resolve, reject) => {
      dbConnection.collection("employees").findOne({ "_id": ObjectId(empidkey) }, function (err, result) {
        if (err) reject(err);
        resolve(result);

      })

    })
    const departmentPromise = new Promise((resolve, reject) => {
      dbConnection.collection("departments").find({}).toArray((err1, result1) => {
        if (err1) reject(err1);
        resolve(result1);
      })
    })
    employeePromise.then((result) => {
      departmentPromise.then((result1) => {
        var index;
        for(let i=0;i<result1.length;i++){
          if(result.department==result1[i].department){
            index=i;
          }
        }
        var sendObject = { "key": result, "user": username, "deparray": result1, "index": index}
        res.render("EmployeeForm", sendObject);

      })
    })
    // Promise.all([employeePromise,departmentPromise]).then((promiseDetails)=>{
    //   console.log(employeePromise)
    //   console.log("*********")
    //   console.log(departmentPromise)
    //   var index=0;
    //   for(let i=0;i<promiseDetails[1].length;i++){
    //     if(promiseDetails[0].department==promiseDetails[1][i].department){
    //       index=i;
    //     }
    //   }
    //   var sendObject = { "key": promiseDetails[0], "user": username, "deparray": promiseDetails[1], "index": index}
    //     res.render("EmployeeForm", sendObject);

    // })
  }
  else{
    res.redirect('/')
  }
})



// app.get('/edit/:empidkey', (req, res) => {
//   if (req.session.auth) {
//     //console.log(req.params);

//     const { empidkey } = req.params;
//     dbConnection.collection("employees").findOne({ "_id": ObjectId(empidkey) }, function (err, result) {
//       if (err) throw err;
//       console.log(result);
//       var index;

//       dbConnection.collection("departments").find({}).toArray((err1, result1) => {
//         if (err1) throw err1;
//         for (let i = 0; i < result1.length; i++) {
//           if (result1[i].department == result.department) {
//             index = i;
//           }
//         }
//         var sendObject = { "key": result, "user": username, "deparray": result1, "index": index }
//         res.render("EmployeeForm", sendObject);

//       })


//     });
//     //console.log()

//     /*
//     var sendObject = { "key": tabledetails1, "empid": empid - 1, "user": username }
//     res.render("EmployeeForm", sendObject);
//     */

//   }
//   else {
//     res.redirect('/');
//   }

// })

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
    console.log(idArray);
    if (req.body.primkey) {
      let employeePromise = new Promise((resolve, reject) => {
        dbConnection.collection("employees").updateOne({ "_id": ObjectId(req.body.primkey) }, { $set: object1 }, function (err, res1) {
          if (err) throw err;
          resolve(res1)
        })
      })
      employeePromise.then(() => {
        res.redirect('/EmployeeTable');
        popup("Data updated successfully");
      })
    }
    else {
      let employeePromise = new Promise((resolve, reject) => {
        dbConnection.collection("employees").insertOne(object1, function (err, res1) {
          if (err) throw err;
          resolve(res1)
        })
      })
      employeePromise.then(() => {
        res.redirect('/EmployeeTable');
        popup("Data inserted sucessfully");
      })

    }
  }
  else {
    res.redirect('/');
  }
})

app.get('/add', (req, res) => {
  if (req.session.auth == true) {

    let departmentPromise = new Promise((resolve, reject) => {
      dbConnection.collection("departments").find({}).toArray((err1, result1) => {
        if (err1) reject(err1);
        resolve(result1)
      })
    })
    departmentPromise.then((result1) => {
      var sendObject = { "key": {}, "user": username, "deparray": result1, "index": 0 }
      res.render("EmployeeForm", sendObject);
    })
  }


  else {
    res.redirect('/');

  }
})

app.get('/delete/:empidkey', (req, res) => {
  if (req.session.auth) {
    const { empidkey } = req.params;
    let employeePromise = new Promise((resolve, reject) => {
      dbConnection.collection("employees").deleteOne({ "_id": ObjectId(empidkey) }, function (err, obj) {
        if (err) reject(err);
        resolve(obj)
      })
    })
    employeePromise.then(() => {
      res.redirect('/EmployeeTable')
    })

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
