// server.js
import express from 'express';
import whois from 'whois-json';
import { promises as dns } from 'dns';
import geoip from 'geoip-lite';
import tls from 'tls';
import axios from 'axios';
import cors from 'cors';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher'; // 전체 모듈을 가져옵니다.

const app = express();
app.use(cors());

// Lighthouse 실행 함수 추가
async function runLighthouse(url) {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
    const options = { output: 'json', onlyCategories: ['performance'], port: chrome.port };

    try {
        const runnerResult = await lighthouse('https://' + url, options);
        const reportJson = runnerResult.lhr;
        await chrome.kill();
        return reportJson;
    } catch (err) {
        await chrome.kill();
        throw err;
    }
}

app.get('/api/analyze', async (req, res) => {
    const domain = req.query.domain;

    console.log('Analyzing domain:', domain);

    if (!domain) {
        return res.status(400).json({ error: 'Domain is required' });
    }

    try {
        // 1. 도메인 정보 가져오기
        const domainInfo = await whois(domain);

        // 2. SSL 인증서 정보 가져오기
        const sslCertificate = await new Promise((resolve, reject) => {
            const options = {
                host: domain,
                port: 443,
                rejectUnauthorized: false,
            };

            const socket = tls.connect(options, () => {
                const certificate = socket.getPeerCertificate();
                resolve(certificate);
                socket.end();
            });

            socket.on('error', (err) => {
                resolve({ error: 'SSL Certificate Error' });
            });
        });

        // 3. 서버 IP 및 위치 정보 가져오기
        const ipAddress = await dns.lookup(domain);
        const geo = geoip.lookup(ipAddress.address);

        // 4. 안전 등급 가져오기 (예: SSL Labs API)
        const securityGradeResponse = await axios.get('https://api.ssllabs.com/api/v3/analyze', {
            params: {
                host: domain,
                all: 'done',
            },
        });
        let securityGrade = 'Unknown';
        if (
            securityGradeResponse.data.endpoints &&
            securityGradeResponse.data.endpoints.length > 0
        ) {
            securityGrade = securityGradeResponse.data.endpoints[0].grade || 'Unknown';
        }

        // 5. Lighthouse 성능 분석
        let lighthouseResult;
        try {
            console.log('Starting Lighthouse analysis...');
            lighthouseResult = await runLighthouse(domain);
            console.log('Lighthouse analysis completed');
        } catch (err) {
            console.error('Lighthouse Error:', err);
            lighthouseResult = { error: 'Lighthouse Error', details: err.message };
        }

        res.json({
            domainInfo,
            sslCertificate,
            serverInfo: {
                ipAddress: ipAddress.address,
                location: geo || 'Location not found',
            },
            securityGrade,
            lighthouseResult, // Lighthouse 결과 추가
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});