const expect     = require('chai').expect;
const {describe} = require('mocha');

const tmi           = require('../lib/index');
/**
 * Variables containing private information, used for testing
 * @type {{auth: string, name: string}}
 */
const testVariables = require('../test/_testVariables');

let clientSettings;
let defaultTMIHost;
let defaultTMIPort;

describe('Client', () => {
  before(() => {
    defaultTMIHost = 'irc.chat.twitch.tv';
    defaultTMIPort = 6697;
  });

  beforeEach(() => {
    clientSettings = {
      identity: {
        name: testVariables.name,
        auth: testVariables.auth
      }
    };
  });

  it('sets a default host and port if none is set', () => {
    // Query result
    let client = new tmi.Client(clientSettings);

    // Assert result
    expect(client).to.be.an.instanceof(tmi.Client);
    expect(client.connection.host).to.equal(defaultTMIHost);
    expect(client.connection.port).to.equal(defaultTMIPort);
  });
  it('sets host and port if they are set', () => {
    // Prepare query variables
    let customHost            = 'customHost';
    let customPort            = 1234;
    clientSettings.connection = {
      host: customHost,
      port: customPort
    };

    // Query result
    let client = new tmi.Client(clientSettings);

    // Assert result
    expect(client).to.be.an.instanceof(tmi.Client);
    expect(client.connection.host).to.equal(customHost);
    expect(client.connection.port).to.equal(customPort);
  });
});