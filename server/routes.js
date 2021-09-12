const shortid = require('short-id');
const IPFS = require('ipfs-api');

// initialize IPFS with http client to allow
// usage of IPFS methods to upload and retrieve data
const ipfs = IPFS({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
});

function routes(app, dbe, lms, accounts) {
    const db = dbe.collection('music-users');
    const music = dbe.collection('music-store');

    app.post('/register', (req, res) => {
        const email = req.body.email;
        const idd = shortid.generate();
        if (email) {
            db.findOne({ email }, (err, doc) => {
                if (doc) {
                    res.status(400).json({
                        status: 'Failed',
                        reason: 'Already registered',
                    });
                } else {
                    db.insertOne({ email });
                    res.json({ status: 'success', id: idd });
                }
            });
        } else {
            res.status(400).json({ status: 'Failed', reason: 'wrong input' });
        }
    });

    app.post('/login', (req, res) => {
        const email = req.body.email;
        if (email) {
            db.findOne({ email }, (err, doc) => {
                if (doc) {
                    res.json({ status: 'success', id: doc.id });
                } else {
                    res.status(400).json({
                        status: 'Failed',
                        reason: 'Not recognised',
                    });
                }
            });
        } else {
            res.status(400).json({ status: 'Failed', reason: 'wrong input' });
        }
    });

    // Save audio buffer to IPFS
    app.post('/upload', async (req, res) => {
        const buffer = req.body.buffer;
        const name = req.body.name;
        const title = req.body.title;
        const id = shortid.generate() + shortid.generate();
        if (buffer && title) {
            const ipfsHash = await ipfs.add(buffer);
            const hash = ipfsHash[0].hash;

            // save address of buffer in the blockchain using a generated ID
            lms.sendIPFS(id, hash, { from: accounts[0] })
                .then((_hash, _address) => {
                    music.insertOne({ id, hash, title, name });
                    res.json({ status: 'success', id });
                })
                .catch(err => {
                    res.status(500).json({
                        status: 'Failed',
                        reason: 'Upload error occured',
                    });
                });
        } else {
            res.status(400).json({ status: 'Failed', reason: 'wrong input' });
        }
    });

    app.get('/access/:email', (req, res) => {
        if (req.params.email) {
            db.findOne({ email: req.body.email }, (err, doc) => {
                if (doc) {
                    const data = music.find().toArray();
                    res.json({ status: 'success', data });
                }
            });
        } else {
            res.status(400).json({ status: 'Failed', reason: 'wrong input' });
        }
    });

    app.get('/access/:email/:id', (req, res) => {
        const id = req.params.id;
        if (req.params.id && req.params.email) {
            db.findOne({ email: req.body.email }, (err, doc) => {
                if (doc) {
                    lms.getHash(id, { from: accounts[0] }).then(async hash => {
                        const data = await ipfs.files.get(hash);
                        res.json({ status: 'success', data: data.content });
                    });
                } else {
                    res.status(400).json({
                        status: 'Failed',
                        reason: 'wrong input',
                    });
                }
            });
        } else {
            res.status(400).json({ status: 'Failed', reason: 'wrong input' });
        }
    });
}

module.exports = routes;
