// get contract file and deploy it automatically to JSON via truffle
var IPFSInbox = artifacts.require('./Inbox.sol');
module.exports = function(deployer) {
    deployer.deploy(IPFSInbox);
};
