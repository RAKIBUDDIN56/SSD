
const fs = require("fs");
const express = require("express");
const app = express();
//to make HTTP requests
const axios = require('axios')

const multer = require("multer");
const OAuth2Data = require("./credentials.json");
// save user name and photo 
var name,pic;
//save access token
var access_token ="";
const { google } = require("googleapis");
const { response } = require("express");
//client id for git auth
const clientID = "392178c58573978789f6"
//client secret 
const clientSecret = "984929f91de5c142237dc45e2c4ebefa400449b8"
//credential for google grive


const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL
);
var authed = false;

app.set("view engine", "ejs");

// If modifying these scopes, delete token.json.
const SCOPES =
  "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.file ";
  


var Storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./images");
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
  },
});

var upload = multer({
  storage: Storage,
}).single("file"); //Field name and max count

app.get("/", (req, res) => {
  if (!authed) {
    // Generate an OAuth URL and redirect there
    var url = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
    console.log(url);
    res.render("index", { url: url, client_id:clientID });
  } 
 else {
    var oauth2 = google.oauth2({
      auth: oAuth2Client,
      version: "v2",
    });
    oauth2.userinfo.get(function (err, response) {
      if (err) {
        console.log(err);
      } else {
        console.log(response.data);
        name = response.data.name
        pic = response.data.picture
        res.render("success", {
          name: response.data.name,
          pic: response.data.picture,
          success:false
        });
      }
    });
  }
});

app.post("/upload", (req, res) => {
  upload(req, res, function (err) {
    if (err) {
      console.log(err);
      return res.end("Something went wrong");
    } else {
      console.log(req.file.path);
      const drive = google.drive({ version: "v3",auth:oAuth2Client  });
      const fileMetadata = {
        name: req.file.filename,
      };
      const media = {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(req.file.path),
      };
      drive.files.create(
        {
          resource: fileMetadata,
          media: media,
          fields: "id",
        },
        (err, file) => {
          if (err) {
            // Handle error
            console.error(err);
          } else {
            fs.unlinkSync(req.file.path)
            res.render("success",{name:name,pic:pic,success:true})
          }

        }
      );
    }
  });
});

app.get('/logout',(req,res) => {
    authed = false
    res.redirect('/')
})

app.get("/google/callback", function (req, res) {
  const code = req.query.code;
  if (code) {
    // Get an access token based on our OAuth code
    oAuth2Client.getToken(code, function (err, tokens) {
      if (err) {
        console.log("Error authenticating");
        console.log(err);
      } else {
        console.log("Successfully authenticated");
        console.log(tokens)
        oAuth2Client.setCredentials(tokens);


        authed = true;
        res.redirect("/");
      }
    });
  }
});

app.get('/github/callback',(req, res) =>{

  const requestToken = req.query.code

  axios({
    method: 'post',
    url: `https://github.com/login/oauth/access_token?client_id=${clientID}&client_secret=${clientSecret}&code=${requestToken}`,
    headers:{
      accept:'application/json'
    }
  }).then((response) =>{
    access_token = response.data.access_token
    console.log("Access token:");
    console.log(access_token)
    res.redirect('/gitSuccess')
  })
})





app.listen(5000, () => {
  console.log("App is listening on Port 5000");
});
