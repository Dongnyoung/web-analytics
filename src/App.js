import React, { useState } from 'react';
import './App.css';
import axios from "axios";

function App() {
    const [domain, setDomain] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

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

    return (
        <div style={{ padding: '20px' }}>
            <h1>도메인 보안 분석기</h1>
            <input
                type="text"
                placeholder="도메인 주소를 입력하세요 (예: example.com)"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                style={{ width: '300px', padding: '10px' }}
            />
            <button onClick={analyzeDomain} style={{ padding: '10px 20px', marginLeft: '10px' }}>
                {loading ? '분석 중...' : '분석하기'}
            </button>

            {data && (
                <div style={{ marginTop: '20px' }}>
                    <h2>분석 결과</h2>

                    {/* 도메인 정보 */}
                    <h3>도메인 정보</h3>
                    {data.domainInfo ? (
                        <table>
                            <tbody>
                            {Object.entries(data.domainInfo).map(([key, value]) => (
                                <tr key={key}>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{key}:</td>
                                    <td style={{ paddingLeft: '10px' }}>{value}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>도메인 정보를 가져올 수 없습니다.</p>
                    )}

                    {/* SSL 인증서 정보 */}
                    <h3>SSL 인증서 정보</h3>
                    {data.sslCertificate && data.sslCertificate.subject ? (
                        <div>
                            <p>
                                <strong>발급 대상 (Subject):</strong>{' '}
                                {data.sslCertificate.subject.CN || '정보 없음'}
                            </p>
                            <p>
                                <strong>발급자 (Issuer):</strong> {data.sslCertificate.issuer.CN || '정보 없음'}
                            </p>
                            <p>
                                <strong>유효 기간:</strong> {data.sslCertificate.valid_from} ~{' '}
                                {data.sslCertificate.valid_to}
                            </p>

                            {/* 추가 정보 토글 */}
                            <details>
                                <summary>인증서 상세 정보 보기</summary>
                                <pre style={{ backgroundColor: '#f4f4f4', padding: '10px' }}>
                  {JSON.stringify(data.sslCertificate, null, 2)}
                </pre>
                            </details>
                        </div>
                    ) : (
                        <p>SSL 인증서 정보를 가져올 수 없습니다.</p>
                    )}

                    {/* 서버 정보 */}
                    <h3>서버 정보</h3>
                    {data.serverInfo ? (
                        <div>
                            <p>
                                <strong>IP 주소:</strong> {data.serverInfo.ipAddress || '정보 없음'}
                            </p>
                            <p>
                                <strong>위치 정보:</strong>{' '}
                                {data.serverInfo.location && data.serverInfo.location.country
                                    ? `${data.serverInfo.location.country}, ${data.serverInfo.location.city || ''}`
                                    : '정보 없음'}
                            </p>

                            {/* 위치 상세 정보 */}
                            <details>
                                <summary>위치 상세 정보 보기</summary>
                                <pre style={{ backgroundColor: '#f4f4f4', padding: '10px' }}>
                  {JSON.stringify(data.serverInfo.location, null, 2)}
                </pre>
                            </details>
                        </div>
                    ) : (
                        <p>서버 정보를 가져올 수 없습니다.</p>
                    )}

                    {/* 안전 등급 */}
                    <h3>안전 등급</h3>
                    <p>
                        <strong>등급:</strong> {data.securityGrade || '정보 없음'}
                    </p>
                    {/* Lighthouse 성능 분석 결과 */}
                    <h3>Lighthouse 성능 분석</h3>
                    {data.lighthouseResult && !data.lighthouseResult.error ? (
                        <div>
                            <p>
                                <strong>성능 점수:</strong>{' '}
                                {Math.round(data.lighthouseResult.categories.performance.score * 100)}
                            </p>

                            {/* 성능 지표 표시 */}
                            <table>
                                <tbody>
                                {Object.entries(data.lighthouseResult.audits)
                                    .filter(
                                        ([key, audit]) =>
                                            ['first-contentful-paint', 'speed-index', 'interactive', 'total-blocking-time', 'cumulative-layout-shift'].includes(key)
                                    )
                                    .map(([key, audit]) => (
                                        <tr key={key}>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                                {audit.title}:
                                            </td>
                                            <td style={{ paddingLeft: '10px' }}>{audit.displayValue}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* 추가 정보 토글 */}
                            <details>
                                <summary>전체 Lighthouse 결과 보기</summary>
                                <pre style={{ backgroundColor: '#f4f4f4', padding: '10px' }}>
                  {JSON.stringify(data.lighthouseResult, null, 2)}
                </pre>
                            </details>
                        </div>
                    ) : (
                        <p>성능 분석 결과를 가져올 수 없습니다.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;
