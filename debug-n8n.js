import https from 'https';

const options = {
    hostname: 'n8n.nexosoftwere.cloud',
    port: 443,
    path: '/webhook/d376860c-6632-490a-99f1-bad44ac1f309',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

console.log('Testing connectivity to:', options.hostname);

const req = https.request(options, (res) => {
    console.log('StatusCode:', res.statusCode);
    console.log('Headers:', res.headers);

    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (e) => {
    console.error('Connection Error:', e);
});

req.end();
