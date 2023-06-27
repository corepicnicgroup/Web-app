import express from 'express';
import path from "path";
import cors from 'cors';
import bodyParser from 'body-parser';

import {
  default as mongodb
} from 'mongodb';
import dotenv from 'dotenv';
import moment from 'moment';
import axios from 'axios';
import { hash, compare } from 'bcrypt';
dotenv.config();
let MongoClient = mongodb.MongoClient;

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(process.cwd(), './build')));
app.use(express.json());
app.use(cors());

app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});



  //-- Functions for get recurring data
  async function getUserByEmail (email) {
    await MongoClient.connect(process.env.DB_URL, (err, client) => {
      if (err) {
        return console.log(err);
      }
      const db = client.db(process.env.DB_NAME);

      db.collection('User').findOne({email: email}).then(result => {
        if (result) {
          return result;
        } else {
          return false;
        }
      })
    })

  }



app.get('/api/testDB', async function(req,res){

  await MongoClient.connect(process.env.DB_URL, async (err, client) => {
    if (err) {
      return console.log(err);
    }
    const db = client.db(process.env.DB_NAME);
    await db.collection('User').findOne({}).then(function(users){
          if (users) {
          res.status(200).send("DB Connected");
          } else {
            res.status(400).send("DB Not Connected");
          }
        })
})

});



//--Add user
app.post('/api/addUser', async (req, res) => {

  const hashedPassword = await hash(req.body.password, 8);
  await MongoClient.connect(process.env.DB_URL, (err, client) => {
    if (err) {
      return console.log(err);
    }

    const db = client.db(process.env.DB_NAME);


    const DOB = moment(req.body.dob).format('YYYY-MM-DD');
      db.collection('User').insertOne({
                first_name:req.body.firstName,
                last_name:req.body.lastName,
                username:req.body.username,
                email:req.body.email,
                password:hashedPassword,
                dob:DOB,
                bio:"",
                active: 1, is_verified: 0, is_online: 1, last_seen: moment().toISOString(),
    passwords_used: hashedPassword, language: "en", register_platform:'web'
      }, (err, result) => {
          if (err) {
            console.log("Error - ",err);
            res.status(500).send('failed');
          };
          if (result) res.status(200).send('success');
        });
  })
});



//-- get user details
app.post('/api/getUserData', async (req,res) => {

  await MongoClient.connect(process.env.DB_URL, async (err, client) => {
    if (err) {
      return console.log(err);
    }

    const db = client.db(process.env.DB_NAME);

    const { email} = req.body;
    await db.collection('User').findOne({email: email}).then(function(users){
      if (users) {
              let data = {
                  firstName:users.first_name,
                  lastName:users.last_name,
                  email:users.email,
                  userName:users.username,
                  phoneNumber:users.phone_number,
                  image:users.image,
                  DOB:users.dob,
                  address:users.address,
                  bio:users.bio
              };
              res.send(data);
          } else {
            res.send("User not found");

          }
        })
  });
});



//--Update user details
app.post('/api/updateUser', async (req, res) => {
    const DOB = moment(req.body.DOB).format('YYYY-MM-DD');
    const email = req.body.email;

  await MongoClient.connect(process.env.DB_URL, (err, client) => {
    if (err) {
      return console.log(err);
    }

    const db = client.db(process.env.DB_NAME);

    db.collection('User').findOne({email:email}).then(function(isExists){
      if(isExists)
      {
        var query = { email:email };
        var setUserData = {
          $set: {
                  first_name : req.body.firstName,
                  last_name : req.body.lastName,
                  username : req.body.userName,
                  address : req.body.address,
                  bio : req.body.bio,
                  phone_number : req.body.phoneNumber,
                  dob : DOB
                }
            };

        db.collection('User').updateOne(query, setUserData).then(result => {
          if (result) {
            res.send({code:"1"});
          } else {
            res.send({code:"2"}); 
          }
        });
      } else {
         res.send({code:"3"});
      }
    });
  })
});


//-- Login API
app.post('/api/login', async (req, res) => {
    const { email, password} = req.body;
  await MongoClient.connect(process.env.DB_URL, async (err, client) => {
    if (err) {
      return console.log(err);
    }

    const db = client.db(process.env.DB_NAME);
    db.collection('User').findOne({email: email}).then(async function(result) {
      if (result) {
          const dbPassword = result.password;
          const valid = await compare(password, dbPassword);
          if (!valid) {
           res.send('Incorrect password');
          }else{
              res.send({email:email});
          }
        // res.send(result);
      } else {
        res.send('Email not Found');
      }
    })
  })
})

//--Get NFT Method
app.get('/api/getAllNFT/', (req, res) => {

    // res.send("Test")
    // Wallet address
    // const address = 'elanhalpern.eth'
    const address = '0x3B06133120dCD2ED40C216b857a94820A93EB579';

    // Alchemy URL
    const baseURL = "https://eth-mainnet.g.alchemy.com/v2/QM2FpeNbNobs_WbPqfY8zYzx2IRZ4VLF"; //`<-- ALCHEMY APP HTTP URL -->`;
    const url = `${baseURL}/getNFTs/?owner=${address}`;

    const config = {
        method: 'get',
        url: url,
    };

    // Make the request and print the formatted response:
    axios(config)
        .then(response => {console.log(response['data']); res.send(response['data']);})
        .catch(error => console.log('error', error));

})


//-- Get All NFT Images --//
app.post('/api/getAllNFTImage/', (req, res) => {

    // res.send("Test")
    // Wallet address
    // const address = 'elanhalpern.eth'
    // const address = '0xa8642B124018bc1e48984a644059145B11055315';
    // const address = '0xe9B7092940B4631c87e406EB2d292EF9a039e4Ea';
    // const address = '0xaa7AC085192b16D8063E0d12c38cdaA97B640BcD';
    const address = req.body.address;

    // Alchemy URL
    const baseURL = "https://eth-mainnet.g.alchemy.com/v2/QM2FpeNbNobs_WbPqfY8zYzx2IRZ4VLF"; //`<-- ALCHEMY APP HTTP URL -->`;
    const url = `${baseURL}/getNFTs/?owner=${address}`;

    const config = {
        method: 'get',
        url: url,
    };

    // Make the request and print the formatted response:
    axios(config)
        .then(response => {
            const nfts = response['data'];

            // Parse output
            const numNfts = nfts['totalCount'];
            const nftList = nfts['ownedNfts'];

            // console.log(`Total NFTs owned by ${address}: ${numNfts} \n`);
            let i = 1;
            let imageData=[];
            let allData=[];
            for (const nft of nftList) {
                let data = {
                    name: nft['metadata']['name'],
                    image: nft['media'][0]['gateway']
                };
                i++;
                imageData.push(data);
            }
            res.send(imageData);
        })
        .catch(error => console.log('error', error));

})

//-- Update Image Set NFT image --//
app.post("/api/updateImage", async (req, res) => {
    const email = req.body.email;
    const imagePath = req.body.imagePath;
    console.log(imagePath);
    if(!email || !imagePath)
    {
      res.send("Image not found");
    }
    else
    {
      await MongoClient.connect(process.env.DB_URL, async (err, client) => {
        if (err) {
          return console.log(err);
        }
        const db = client.db(process.env.DB_NAME);
        let updateImage = db.collection('User').updateOne({ email:email }, {$set:{image:imagePath}});
            if (updateImage) {
              res.send("success");
            } else {
              res.send("failed");
            }
        })
    }
});


app.get('/*', (req, res) => {
  res.sendFile(path.join(process.cwd(), './build/index.html'));
});


app.listen(process.env.PORT, () => {
  console.log(`Server listening on the port::${process.env.PORT}`);
});