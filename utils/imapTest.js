const Imap = require('node-imap');
require('dotenv').config();

function createImapConnection() {
  return new Imap({
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASSWORD,
    host: process.env.IMAP_HOST,
    port: parseInt(process.env.IMAP_PORT),
    tls: process.env.IMAP_TLS === 'true',
    tlsOptions: { rejectUnauthorized: false }
  });
}

function testImapSearch(tempMailAddress) {
  return new Promise((resolve, reject) => {
    const imap = createImapConnection();

    imap.once('ready', () => {
      imap.openBox('INBOX', true, (err, box) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        console.log(`Searching for emails to ${tempMailAddress} using HEADER TO search only`);

        imap.search([['HEADER', 'TO', tempMailAddress]], (err, results) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          if (!results || results.length === 0) {
            imap.end();
            return resolve([]);
          }

          // Limit to last 10 emails to avoid timeout
          const limitedResults = results.slice(-10);

          const fetch = imap.fetch(limitedResults, { bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)' });
          const emails = [];

          fetch.on('message', (msg) => {
            let email = {};
            msg.on('body', (stream) => {
              let buffer = '';
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });
              stream.once('end', () => {
                email.headers = buffer;
              });
            });
            msg.once('end', () => {
              emails.push(email);
            });
          });

          fetch.once('end', () => {
            imap.end();
            resolve(emails);
          });

          fetch.once('error', (err) => {
            imap.end();
            reject(err);
          });
        });
      });
    });

    imap.once('error', (err) => {
      reject(err);
    });

    imap.connect();
  });
}

(async () => {
  try {
    const testEmail = '9vqdlhh9fi@supermail.my.id';
    console.log(`Testing IMAP search for: ${testEmail}`);
    const emails = await testImapSearch(testEmail);
    console.log(`Found ${emails.length} emails`);
    emails.forEach((email, index) => {
      console.log(`Email #${index + 1} headers:\n${email.headers}\n`);
    });
  } catch (error) {
    console.error('IMAP test error:', error);
  }
})();
