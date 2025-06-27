const Imap = require('node-imap');
require('dotenv').config();

const imapConnections = new Map();

function createImapConnection(user, password) {
  return new Imap({
    user,
    password,
    host: process.env.IMAP_HOST,
    port: parseInt(process.env.IMAP_PORT),
    tls: process.env.IMAP_TLS === 'true',
    tlsOptions: { rejectUnauthorized: false },
    keepalive: true,
    connTimeout: 60000,
    authTimeout: 5000
  });
}

function getImapConnection(email) {
  if (imapConnections.has(email)) {
    const conn = imapConnections.get(email);
    if (conn.state === 'authenticated' || conn.state === 'connected') {
      return conn;
    } else {
      imapConnections.delete(email);
    }
  }
  // For demo, using same user/password from env, ideally per email credentials
  const user = process.env.IMAP_USER;
  const password = process.env.IMAP_PASSWORD;
  const imap = createImapConnection(user, password);
  imapConnections.set(email, imap);
  return imap;
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

function fetchEmailsForAddress(tempMailAddress, limit = 10, offset = 0) {
  return new Promise((resolve, reject) => {
    const imap = getImapConnection(tempMailAddress);
    let isResolved = false;

    const timeout = setTimeout(() => {
      if (!isResolved) {
        console.log('Operation timeout, resolving with empty array');
        isResolved = true;
        imap.end();
        resolve([]);
      }
    }, 30000);

    function cleanup() {
      clearTimeout(timeout);
      if (!isResolved) {
        isResolved = true;
      }
    }

    if (imap.state === 'authenticated' || imap.state === 'connected') {
      openInboxAndFetch();
    } else {
      imap.once('ready', openInboxAndFetch);
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
      imap.connect();
    }

    function openInboxAndFetch() {
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
        
        imap.search([['HEADER', 'TO', tempMailAddress]], (err, results) => {
          if (err) {
            console.error('Search error:', err);
            cleanup();
            imap.end();
            return resolve([]);
          }
          
          // Apply offset and limit for pagination
          const paginatedResults = results.slice(offset, offset + limit);
          console.log(`Processing emails ${offset} to ${offset + limit} (total found: ${results.length})`);

          processSearchResults(paginatedResults || []);
        });

        function processSearchResults(results) {
          console.log(`Search completed. Found ${results.length} potential emails`);
          
          if (results.length === 0) {
            console.log(`No emails found for ${tempMailAddress}`);
            cleanup();
            imap.end();
            return resolve([]);
          }

          const emails = [];
          let processed = 0;

          const fetch = imap.fetch(results, {
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
              
              console.log(`Processed email ${processed}/${results.length}: "${email.subject}" from ${email.from}`);
              
              if (processed === results.length) {
                console.log(`✓ Found ${emails.length} emails for ${tempMailAddress}`);
                
                emails.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                cleanup();
                // Do not end connection here to keep persistent connection
                resolve(emails);
              }
            });
          });

          fetch.once('error', (err) => {
            console.error('Fetch error:', err);
            cleanup();
            // Do not end connection here to keep persistent connection
            resolve(emails);
          });

          fetch.once('end', () => {
            console.log('Fetch operation completed');
          });
        }
      });
    }
  });
}

module.exports = {
  fetchEmailsForAddress
};
