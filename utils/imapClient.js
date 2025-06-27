const Imap = require('node-imap');
require('dotenv').config();

function createImapConnection() {
  return new Imap({
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASSWORD,
    host: process.env.IMAP_HOST,
    port: parseInt(process.env.IMAP_PORT),
    tls: process.env.IMAP_TLS === 'true',
    tlsOptions: { rejectUnauthorized: false },
    keepalive: false
  });
}

function extractEmailPreview(body, maxLength = 150) {
  if (!body) return '';
  
  let text = body.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  text = text.replace(/^(From:|To:|Subject:|Date:).*$/gm, '');
  text = text.replace(/^>.*$/gm, '');
  text = text.replace(/^\s*$/gm, '');
  text = text.trim();
  
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function fetchEmailsForAddress(tempMailAddress) {
  return new Promise((resolve, reject) => {
    const imap = createImapConnection();
    let isResolved = false;

    function cleanup() {
      if (!isResolved) {
        isResolved = true;
      }
    }

    imap.once('ready', function() {
      console.log('IMAP ready, opening inbox...');
      
      imap.openBox('INBOX', true, (err, box) => {
        if (err) {
          console.error('Error opening inbox:', err);
          cleanup();
          imap.end();
          return resolve([]);
        }

        console.log(`Inbox opened. Total messages: ${box.messages.total}`);
        
        console.log(`Searching for emails to ${tempMailAddress} using HEADER TO search only`);
        
        // Search using only HEADER TO without SINCE
        imap.search([['HEADER', 'TO', tempMailAddress]], (err, results) => {
          if (err) {
            console.error('Search error:', err);
            cleanup();
            imap.end();
            return resolve([]);
          }
          
          processSearchResults(results || []);
        });

        function processSearchResults(results) {
          console.log(`Search completed. Found ${results.length} potential emails`);
          
          if (results.length === 0) {
            console.log(`No emails found for ${tempMailAddress}`);
            cleanup();
            imap.end();
            return resolve([]);
          }

          // Limit to last 10 emails to avoid timeout
          const limitedResults = results.slice(-10);
          console.log(`Processing last ${limitedResults.length} emails`);

          const emails = [];
          let processed = 0;

          const fetch = imap.fetch(limitedResults, {
            bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
            struct: true
          });

          fetch.on('message', (msg, seqno) => {
            const email = {
              seqno: seqno,
              from: 'Unknown Sender',
              subject: 'No Subject',
              date: new Date().toISOString(),
              preview: 'Email content preview...'
            };

            msg.on('body', (stream, info) => {
              let buffer = '';
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });
              
              stream.once('end', () => {
                // Parse headers
                const lines = buffer.split('\r\n');
                for (let line of lines) {
                  if (line.toLowerCase().startsWith('from:')) {
                    email.from = line.substring(5).trim();
                  } else if (line.toLowerCase().startsWith('subject:')) {
                    email.subject = line.substring(8).trim();
                  } else if (line.toLowerCase().startsWith('date:')) {
                    email.date = line.substring(5).trim();
                  }
                }
              });
            });

            msg.once('attributes', (attrs) => {
              if (attrs.envelope) {
                if (attrs.envelope.from && attrs.envelope.from.length > 0) {
                  const from = attrs.envelope.from[0];
                  email.from = from.name ? 
                    `${from.name} <${from.mailbox}@${from.host}>` : 
                    `${from.mailbox}@${from.host}`;
                }
                if (attrs.envelope.subject) {
                  email.subject = attrs.envelope.subject;
                }
                if (attrs.envelope.date) {
                  email.date = attrs.envelope.date;
                }
              }
            });

            msg.once('end', () => {
              emails.push(email);
              processed++;
              
              console.log(`Processed email ${processed}/${limitedResults.length}: "${email.subject}" from ${email.from}`);
              
              if (processed === limitedResults.length) {
                console.log(`✓ Found ${emails.length} emails for ${tempMailAddress}`);
                
                // Sort by date (newest first)
                emails.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                cleanup();
                imap.end();
                resolve(emails);
              }
            });
          });

          fetch.once('error', (err) => {
            console.error('Fetch error:', err);
            cleanup();
            imap.end();
            resolve(emails); // Return what we have so far
          });

          fetch.once('end', () => {
            console.log('Fetch operation completed');
          });
        }
      });
    });

    imap.once('error', (err) => {
      console.error('IMAP connection error:', err);
      cleanup();
      resolve([]);
    });

    imap.once('end', () => {
      console.log('IMAP connection ended');
      if (!isResolved) {
        cleanup();
        resolve([]);
      }
    });

    console.log(`Connecting to IMAP for ${tempMailAddress}...`);
    imap.connect();
  });
}

module.exports = {
  fetchEmailsForAddress
};
