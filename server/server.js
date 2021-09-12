require('dotenv').config();
const express = require('express');
const app = express();
const routes = require('./routes');
const Web3 = require('web3');
const mongodb = require('mongodb').MongoClient;
const contract = require('truffle-contract');
const artifacts = require('./build/Inbox.json');

app.use(express.json());

// initialize web3 instance if it is not already defined
if (typeof web3 !== 'undefined') {
    var web3 = new Web3(web3.currentProvider);
} else {
    var web3 = new Web3(
        new Web3.providers.HttpProvider('http://localhost:8545')
    );
}

// build contract baased on migrated JSON and truffle-contract package
const LMS = contract(artifacts);
LMS.setProvider(web3.currentProvider);

mongodb.connect(
    process.env.DB,
    { useUnifiedTopology: true },
    async (err, client) => {
        const db = client.db('Crypto1');

        // get accounts
        const accounts = await web3.eth.getAccounts();
        const lms = await LMS.deployed();
        //const lms = LMS.at(contract_address) for remote nodes deployed on ropsten or rinkeby
        routes(app, db, lms, accounts);
        app.listen(process.env.PORT || 8082, () => {
            console.log('listening on port ' + (process.env.PORT || 8082));
        });
    }
);
