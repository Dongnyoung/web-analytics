import React, { useState } from 'react';
import './App.css';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';


function App() {
    const [domain, setDomain] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const calculateDaysLeft = (futureDate) => {
        const now = new Date();
        const target = new Date(futureDate);
        const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
        return diff >= 0 ? diff : 0;
    };

    const calculateDaysPassed = (pastDate) => {
        const now = new Date();
        const target = new Date(pastDate);
        const diff = Math.ceil((now - target) / (1000 * 60 * 60 * 24));
        return diff >= 0 ? diff : 0;
    };

    const analyzeDomain = async () => {
        if (!domain) return;
        setLoading(true);
        setData(null);
        try {
            const response = await axios.get(`http://localhost:8080/api/analyze`, {
                params: { domain },
            });
            setData(response.data);
        } catch (err) {
            console.error(err);
            alert('분석 중 오류가 발생했습니다.');
        }
        setLoading(false);
    };

    const getGradeClass = (grade) => {
        if (grade && grade.startsWith('A')) return 'grade grade-a';
        if (grade && grade.startsWith('B')) return 'grade grade-b';
        return 'grade grade-other';
    };

    const getDomainAgeClassAndMessage = (days) => {
        if (days <= 30) {
            return {
                className: 'domain-age recent-danger',
                message: '위험 경고',
            };
        }
        if (days <= 365) {
            return {
                className: 'domain-age recent-warning',
                message: '주의 필요',
            };
        }
        return {
            className: 'domain-age recent-safe',
            message: '안전',
        };
    };

    return (
        <div className="container">
            <h1>도메인 보안 분석기</h1>
            <input
                type="text"
                placeholder="도메인 주소를 입력하세요 (예: example.com)"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
            />
            <button onClick={analyzeDomain} disabled={loading}>
                {loading ? '분석 중...' : '분석하기'}
            </button>

            {data && (
                <div>
                    {/* 안전 등급 카드 */}
                    <div className="result-card">
                        <h3>안전 등급</h3>
                        <div className={getGradeClass(data.securityGrade)}>
                            {data.securityGrade || '정보 없음'}
                        </div>
                    </div>

                    {/* SSL 인증서 정보 */}
                    <div
                        className={`result-card ${
                            data.sslCertificate?.error ? 'ssl-danger' : 'ssl-safe'
                        }`}
                    >
                        <h3>SSL 인증서 정보</h3>
                        {data.sslCertificate?.error ? (
                            <p style={{ color: 'red', fontWeight: 'bold' }}>
                                SSL 인증서 오류: {data.sslCertificate.error}
                            </p>
                        ) : (
                            <>
                                <p>
                                    <strong>발급 대상:</strong> {data.sslCertificate.subject.CN || '정보 없음'}
                                </p>
                                <p>
                                    <strong>발급자:</strong> {data.sslCertificate.issuer.CN || '정보 없음'}
                                </p>
                                <p>
                                    <strong>유효 기간:</strong> {data.sslCertificate.valid_from} ~{' '}
                                    {data.sslCertificate.valid_to}
                                </p>
                                <p>
                                    <strong>만료까지 남은 기간:</strong>{' '}
                                    {calculateDaysLeft(data.sslCertificate.valid_to)}일
                                </p>
                            </>
                        )}
                    </div>


                    {/* 도메인 정보 */}
                    <div className="result-card">
                        <h3>도메인 정보</h3>
                        {data.domainInfo.creationDate && (
                            <div>
                                <p>
                                    <strong>도메인 생성일:</strong> {data.domainInfo.creationDate || '정보 없음'}
                                </p>
                                <p>
                                    <strong>도메인 생성 후 경과:</strong>{' '}
                                    {calculateDaysPassed(data.domainInfo.creationDate)}일
                                </p>
                                <div
                                    className={
                                        getDomainAgeClassAndMessage(
                                            calculateDaysPassed(data.domainInfo.creationDate)
                                        ).className
                                    }
                                >
                                    {getDomainAgeClassAndMessage(
                                        calculateDaysPassed(data.domainInfo.creationDate)
                                    ).message}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 서버 정보 및 위치 */}
                    <div className="result-card">
                        <h3>서버 정보</h3>
                        <p>
                            <strong>IP 주소:</strong> {data.serverInfo.ipAddress || '정보 없음'}
                        </p>
                        <p>
                            <strong>국가:</strong> {data.serverInfo.location?.country || '정보 없음'}
                        </p>
                        <p>
                            <strong>도시:</strong> {data.serverInfo.location?.city || '정보 없음'}
                        </p>
                        {data.serverInfo.location?.ll ? (
                            <MapContainer
                                center={data.serverInfo.location.ll}
                                zoom={13}
                                style={{ height: '300px', width: '100%', marginTop: '10px' }}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                                />
                                <Marker position={data.serverInfo.location.ll}>
                                    <Popup>
                                        {data.serverInfo.location.city || 'Unknown City'}
                                    </Popup>
                                </Marker>
                            </MapContainer>
                        ) : (
                            <p>지도 표시를 위한 위치 정보가 없습니다.</p>
                        )}
                    </div>


                    {/* Lighthouse 결과 */}
                    <div className="result-card">
                        <h3>Lighthouse 성능 분석</h3>
                        {data.lighthouseResult.audits ? (
                            <ul>
                                <li>
                                    <strong>First Contentful Paint:</strong>{' '}
                                    {data.lighthouseResult.audits['first-contentful-paint'].displayValue}
                                </li>
                                <li>
                                    <strong>Largest Contentful Paint:</strong>{' '}
                                    {data.lighthouseResult.audits['largest-contentful-paint'].displayValue}
                                </li>
                                <li>
                                    <strong>Speed Index:</strong>{' '}
                                    {data.lighthouseResult.audits['speed-index'].displayValue}
                                </li>
                                <li>
                                    <strong>Total Blocking Time:</strong>{' '}
                                    {data.lighthouseResult.audits['total-blocking-time'].displayValue}
                                </li>
                                <li>
                                    <strong>Cumulative Layout Shift:</strong>{' '}
                                    {data.lighthouseResult.audits['cumulative-layout-shift'].displayValue}
                                </li>
                            </ul>
                        ) : (
                            <p>분석 결과를 가져올 수 없습니다.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
